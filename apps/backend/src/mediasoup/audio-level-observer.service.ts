import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Router, AudioLevelObserver, Producer } from 'mediasoup/node/lib/types';
import { mediasoupConfig } from './mediasoup.config.js';
import { ProducerAppData } from './mediasoup.type.js';

interface SpeakerState {
  participantId: string;
  startTime: number;
  lastActiveTime: number;
  isConfirmed: boolean; // minDuration을 충족했는지 여부
}

/**
 * AudioLevelObserver 관리 서비스
 *
 * 발화자 감지를 위해 각 Room의 Router에 AudioLevelObserver를 생성하고 관리
 * - volumes 이벤트로 오디오 레벨 감지
 * - minDuration 이상 연속 발화 시 speaker.detected 이벤트 발송
 * - cooldown으로 동일 참가자 연속 이벤트 방지
 */
@Injectable()
export class AudioLevelObserverService {
  private readonly logger = new Logger(AudioLevelObserverService.name);

  // Room별/Router별 AudioLevelObserver 저장 (roomId -> routerIndex -> observer)
  private observers: Map<string, Map<number, AudioLevelObserver>> = new Map();

  // Room별 발화 상태 추적
  private speakerStates: Map<string, Map<string, SpeakerState>> = new Map();

  // Room별 마지막 이벤트 발송 시간 (쿨다운 체크)
  private lastEmitTimes: Map<string, Map<string, number>> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Room에 AudioLevelObserver 생성
   */
  async createObserver(
    roomId: string,
    routerIndex: number,
    router: Router,
  ): Promise<AudioLevelObserver> {
    const observer = await router.createAudioLevelObserver({
      maxEntries: mediasoupConfig.audioLevelObserver.maxEntries,
      threshold: mediasoupConfig.audioLevelObserver.threshold,
      interval: mediasoupConfig.audioLevelObserver.interval,
    });

    // 상태 Map 초기화 (이미 있으면 유지)
    if (!this.speakerStates.has(roomId)) {
      this.speakerStates.set(roomId, new Map());
    }
    if (!this.lastEmitTimes.has(roomId)) {
      this.lastEmitTimes.set(roomId, new Map());
    }

    // volumes 이벤트 핸들링
    observer.on('volumes', (volumes) => {
      this.handleVolumes(roomId, volumes);
    });

    if (!this.observers.has(roomId)) {
      this.observers.set(roomId, new Map());
    }
    this.observers.get(roomId)!.set(routerIndex, observer);
    this.logger.log(`✅ AudioLevelObserver 생성: Room ${roomId}, Router #${routerIndex}`);

    return observer;
  }

  /**
   * Producer를 Observer에 추가 (audio producer만)
   */
  async addProducer(
    roomId: string,
    routerIndex: number,
    producer: Producer<ProducerAppData>,
  ): Promise<void> {
    const observer = this.observers.get(roomId)?.get(routerIndex);
    if (!observer || producer.kind !== 'audio') return;

    try {
      await observer.addProducer({ producerId: producer.id });
      this.logger.log(
        `🎤 Producer ${producer.id} -> Observer 추가 (Room: ${roomId}, Router #${routerIndex})`,
      );
    } catch (error) {
      this.logger.error(`❌ Observer에 Producer 추가 실패: ${error}`);
    }
  }

  /**
   * Producer를 Observer에서 제거
   */
  async removeProducer(roomId: string, routerIndex: number, producerId: string): Promise<void> {
    const observer = this.observers.get(roomId)?.get(routerIndex);
    if (!observer) return;

    try {
      await observer.removeProducer({ producerId });
      this.logger.log(`🔇 Producer ${producerId} <- Observer 제거 (Room: ${roomId})`);
    } catch (error) {
      // 이미 제거됐거나 존재하지 않는 경우 무시
      this.logger.warn(`Observer에서 Producer 제거 중 오류: ${error}`);
    }
  }

  /**
   * volumes 이벤트 처리
   */
  private handleVolumes(
    roomId: string,
    volumes: Array<{ producer: Producer; volume: number }>,
  ): void {
    const stateMap = this.speakerStates.get(roomId);
    const emitMap = this.lastEmitTimes.get(roomId);
    if (!stateMap || !emitMap) return;

    const now = Date.now();
    const { minDuration, cooldownTime } = mediasoupConfig.speakerDetection;

    for (const { producer } of volumes) {
      const appData = producer.appData as ProducerAppData;
      const participantId = appData.ownerId;

      let state = stateMap.get(participantId);

      if (!state) {
        // 새로운 발화 시작
        state = {
          participantId,
          startTime: now,
          lastActiveTime: now,
          isConfirmed: false,
        };
        stateMap.set(participantId, state);
      } else {
        // 기존 발화 지속
        state.lastActiveTime = now;
      }

      // 발화 판정: minDuration 충족 시 confirmed 상태로 변경
      const duration = now - state.startTime;
      if (!state.isConfirmed && duration >= minDuration) {
        state.isConfirmed = true;
      }

      // confirmed된 발화자만 이벤트 발송 (cooldown 간격으로)
      if (state.isConfirmed) {
        const lastEmit = emitMap.get(participantId) || 0;
        if (now - lastEmit >= cooldownTime) {
          this.eventEmitter.emit('speaker.detected', {
            roomId,
            participantId,
            detectedAt: now,
          });
          emitMap.set(participantId, now);
          this.logger.log(`🗣️ 발화 감지: ${participantId} (Room: ${roomId})`);
        }
      }
    }
  }

  /**
   * 특정 참가자 발화 상태 정리 (퇴장 시)
   */
  removeParticipantState(roomId: string, participantId: string): void {
    const stateMap = this.speakerStates.get(roomId);
    if (stateMap) {
      stateMap.delete(participantId);
    }
    const emitMap = this.lastEmitTimes.get(roomId);
    if (emitMap) {
      emitMap.delete(participantId);
    }
  }

  /**
   * Room 정리 시 Observer 제거
   */
  async cleanupRoom(roomId: string): Promise<void> {
    const observers = this.observers.get(roomId);
    if (observers) {
      for (const observer of observers.values()) {
        observer.close();
      }
      this.observers.delete(roomId);
    }
    this.speakerStates.delete(roomId);
    this.lastEmitTimes.delete(roomId);
    this.logger.log(`🗑️ AudioLevelObserver 정리: Room ${roomId}`);
  }
}
