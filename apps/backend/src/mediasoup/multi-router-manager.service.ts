import { Injectable, Logger } from '@nestjs/common';
import { Router, Worker, Producer } from 'mediasoup/node/lib/types';
import {
  RoomType,
  RouterStrategy,
  PipeProducerInfo,
  MultiRouterRoomInfo,
  ProducerAppData,
} from './mediasoup.type.js';
import { mediasoupConfig } from './mediasoup.config.js';

/**
 * Multi-Router 매니저 서비스
 *
 * 1. Room Type별 전략: SMALL_MEETING(≤10명) = Single Router, LECTURE(>10명) = Multi-Router
 * 2. Router 수 = Worker 수 = CPU 수 (사전 생성)
 * 3. 점진적 Router 활성화: 5명까지 R0만 → 6~10명 R0,R1 → ...
 * 4. 발표자 스트림은 모든 Router로 즉시 파이프 (Eager Loading)
 * 5. 청중 스트림은 필요시 파이프 (Lazy Loading)
 *
 * PipeProducer 정리: Map 추적 + Promise.allSettled 병렬 정리
 */
@Injectable()
export class MultiRouterManagerService {
  private readonly logger = new Logger(MultiRouterManagerService.name);

  // Room별 Multi-Router 정보
  private rooms: Map<string, MultiRouterRoomInfo> = new Map();

  // 참가자별 Router 매핑 (participantId -> routerIndex)
  private participantRouterMap: Map<string, Map<string, number>> = new Map();

  // 점진적 활성화 임계값 (5명씩)
  private readonly PARTICIPANTS_PER_ROUTER = 5;

  /**
   * Room 생성 시 Multi-Router 설정
   * @param roomId Room ID
   * @param roomType Room 타입 (SMALL_MEETING or LECTURE)
   * @param workers Worker 배열
   * @returns Router 배열
   */
  async createRoutersForRoom(
    roomId: string,
    roomType: RoomType,
    workers: Worker[],
  ): Promise<Router[]> {
    const strategy = this.determineStrategy(roomType);
    const routerCount = strategy === RouterStrategy.SINGLE ? 1 : workers.length;

    this.logger.log(`🏗️  Room ${roomId} 생성: ${strategy} 전략, Router ${routerCount}개 사전 생성`);

    const routers: Router[] = [];

    // Router 사전 생성 (vCPU 수만큼)
    for (let i = 0; i < routerCount; i++) {
      const worker = workers[i % workers.length];
      const router = await worker.createRouter({
        mediaCodecs: mediasoupConfig.router.mediaCodecs,
      });
      routers.push(router);
      this.logger.log(`  ✅ Router #${i} 생성 (Worker PID: ${worker.pid})`);
    }

    // Room 정보 저장
    const roomInfo: MultiRouterRoomInfo = {
      roomId,
      strategy,
      routers,
      activeRouterCount: 1, // 초기에는 R0만 활성화
      participantCount: 0,
      pipeProducers: new Map(),
    };

    this.rooms.set(roomId, roomInfo);
    this.participantRouterMap.set(roomId, new Map());

    return routers;
  }

  /**
   * Room Type에 따른 전략 결정
   */
  private determineStrategy(roomType: RoomType): RouterStrategy {
    return roomType === RoomType.SMALL_MEETING ? RouterStrategy.SINGLE : RouterStrategy.MULTI;
  }

  /**
   * 참가자 입장 시 Router 할당
   * 점진적 활성화 전략 적용
   *
   * @param roomId Room ID
   * @param participantId 참가자 ID
   * @returns 할당된 Router
   */
  assignRouterForParticipant(roomId: string, participantId: string): Router {
    const roomInfo = this.rooms.get(roomId);
    if (!roomInfo) {
      throw new Error(`Room ${roomId}을 찾을 수 없습니다.`);
    }

    // Single Router 전략이면 첫 번째 Router 반환
    if (roomInfo.strategy === RouterStrategy.SINGLE) {
      return roomInfo.routers[0];
    }

    // 참가자 수 증가
    roomInfo.participantCount++;

    // 활성화할 Router 수 계산 (점진적 활성화)
    const neededRouters = Math.min(
      Math.ceil(roomInfo.participantCount / this.PARTICIPANTS_PER_ROUTER),
      roomInfo.routers.length,
    );

    // 필요시 활성 Router 수 증가
    if (neededRouters > roomInfo.activeRouterCount) {
      const prevCount = roomInfo.activeRouterCount;
      roomInfo.activeRouterCount = neededRouters;
      this.logger.log(
        `📈 Room ${roomId}: 활성 Router ${prevCount} → ${neededRouters} (참가자: ${roomInfo.participantCount}명)`,
      );
    }

    // 활성화된 Router 중 가장 적은 참가자가 있는 Router 선택
    const routerIndex = this.selectLeastLoadedRouter(roomId, roomInfo);

    // 참가자-Router 매핑 저장
    const participantMap = this.participantRouterMap.get(roomId)!;
    participantMap.set(participantId, routerIndex);

    this.logger.log(`👤 참가자 ${participantId} → Router #${routerIndex} 할당 (Room: ${roomId})`);

    return roomInfo.routers[routerIndex];
  }

  /**
   * 가장 부하가 적은 Router 선택 (활성화된 Router 중)
   */
  private selectLeastLoadedRouter(roomId: string, roomInfo: MultiRouterRoomInfo): number {
    const participantMap = this.participantRouterMap.get(roomId)!;
    const routerCounts = new Array(roomInfo.activeRouterCount).fill(0);

    // 각 Router별 참가자 수 계산
    for (const routerIdx of participantMap.values()) {
      if (routerIdx < roomInfo.activeRouterCount) {
        routerCounts[routerIdx]++;
      }
    }

    // 가장 적은 참가자가 있는 Router 인덱스 반환
    let minIdx = 0;
    let minCount = routerCounts[0];
    for (let i = 1; i < routerCounts.length; i++) {
      if (routerCounts[i] < minCount) {
        minCount = routerCounts[i];
        minIdx = i;
      }
    }

    return minIdx;
  }

  /**
   * 참가자의 Router 인덱스 조회
   */
  getParticipantRouterIndex(roomId: string, participantId: string): number {
    const participantMap = this.participantRouterMap.get(roomId);
    if (!participantMap) {
      throw new Error(`Room ${roomId}을 찾을 수 없습니다.`);
    }
    const idx = participantMap.get(participantId);
    if (idx === undefined) {
      throw new Error(`참가자 ${participantId}의 Router를 찾을 수 없습니다.`);
    }
    return idx;
  }

  /**
   * 참가자의 Router 조회
   */
  getParticipantRouter(roomId: string, participantId: string): Router {
    const roomInfo = this.rooms.get(roomId);
    if (!roomInfo) {
      throw new Error(`Room ${roomId}을 찾을 수 없습니다.`);
    }
    const idx = this.getParticipantRouterIndex(roomId, participantId);
    return roomInfo.routers[idx];
  }

  /**
   * Room의 모든 Router 조회
   */
  getRoomRouters(roomId: string): Router[] | undefined {
    const roomInfo = this.rooms.get(roomId);
    return roomInfo?.routers;
  }

  /**
   * Producer를 모든 Router로 즉시 파이프 (Eager Loading)
   *
   * 사용 대상:
   * - 발표자의 모든 스트림 (video, audio, screen)
   * - 청중의 마이크 (audio) - 마이크 켜면 전원 청취
   *
   * @param roomId Room ID
   * @param producer Producer
   * @param sourceRouterIndex Producer가 생성된 Router 인덱스
   */
  async pipeProducerToAllRouters(
    roomId: string,
    producer: Producer<ProducerAppData>,
    sourceRouterIndex: number,
  ): Promise<void> {
    const roomInfo = this.rooms.get(roomId);
    if (!roomInfo || roomInfo.strategy === RouterStrategy.SINGLE) {
      return; // Single Router면 파이프 불필요
    }

    const sourceRouter = roomInfo.routers[sourceRouterIndex];
    const pipeInfos: PipeProducerInfo[] = [];

    this.logger.log(
      `🎤 발표자 Producer ${producer.id} 즉시 파이프 시작 (${roomInfo.routers.length - 1}개 Router)`,
    );

    // 모든 Router로 파이프 (소스 Router 제외)
    const pipePromises = roomInfo.routers
      .filter((_, idx) => idx !== sourceRouterIndex)
      .map(async (targetRouter, idx) => {
        try {
          const { pipeProducer } = await sourceRouter.pipeToRouter({
            producerId: producer.id,
            router: targetRouter,
          });

          if (!pipeProducer) {
            this.logger.warn(
              `  ⚠️ PipeProducer가 undefined: Router #${sourceRouterIndex} → Router #${idx}`,
            );
            return;
          }

          const pipeInfo: PipeProducerInfo = {
            targetRouter,
            pipeProducer: pipeProducer as Producer<ProducerAppData>,
            createdAt: new Date(),
          };
          pipeInfos.push(pipeInfo);

          this.logger.log(
            `  ✅ PipeProducer 생성: Router #${sourceRouterIndex} → Router #${idx === sourceRouterIndex ? idx + 1 : idx} (id: ${pipeProducer.id})`,
          );
        } catch (error) {
          this.logger.error(
            `  ❌ 파이프 실패: Router #${sourceRouterIndex} → Router #${idx}`,
            error,
          );
        }
      });

    await Promise.allSettled(pipePromises);

    // PipeProducer 추적 Map에 저장
    roomInfo.pipeProducers.set(producer.id, pipeInfos);

    this.logger.log(
      `🎤 발표자 Producer ${producer.id} 파이프 완료: ${pipeInfos.length}개 PipeProducer 생성`,
    );
  }

  /**
   * Producer를 특정 Router로 On-Demand 파이프 (Lazy Loading)
   * consume 요청이 들어온 시점에만 파이프 생성
   *
   * 사용 대상:
   * - 청중의 카메라 (video) - 최대 5명만 선택적 시청
   *
   * @param roomId Room ID
   * @param producer Producer
   * @param sourceRouterIndex Producer가 생성된 Router 인덱스
   * @param targetRouterIndex consume 요청이 들어온 Router 인덱스
   * @returns PipeProducer 또는 기존 Producer (같은 Router면)
   */
  async pipeProducerOnDemand(
    roomId: string,
    producer: Producer<ProducerAppData>,
    sourceRouterIndex: number,
    targetRouterIndex: number,
  ): Promise<Producer<ProducerAppData>> {
    // 같은 Router면 파이프 불필요
    if (sourceRouterIndex === targetRouterIndex) {
      return producer;
    }

    const roomInfo = this.rooms.get(roomId);
    if (!roomInfo) {
      throw new Error(`Room ${roomId}을 찾을 수 없습니다.`);
    }

    // 이미 파이프된 경우 기존 PipeProducer 반환
    const existingPipes = roomInfo.pipeProducers.get(producer.id) || [];
    const existingPipe = existingPipes.find(
      (p) => p.targetRouter === roomInfo.routers[targetRouterIndex],
    );
    if (existingPipe) {
      this.logger.log(`기존 PipeProducer 재사용: ${producer.id} → Router #${targetRouterIndex}`);
      return existingPipe.pipeProducer;
    }

    // 새로 파이프 생성
    const sourceRouter = roomInfo.routers[sourceRouterIndex];
    const targetRouter = roomInfo.routers[targetRouterIndex];

    try {
      const { pipeProducer } = await sourceRouter.pipeToRouter({
        producerId: producer.id,
        router: targetRouter,
      });

      if (!pipeProducer) {
        throw new Error('PipeProducer 생성 실패: pipeProducer가 undefined입니다.');
      }

      const pipeInfo: PipeProducerInfo = {
        targetRouter,
        pipeProducer: pipeProducer as Producer<ProducerAppData>,
        createdAt: new Date(),
      };

      // Map에 추가
      if (!roomInfo.pipeProducers.has(producer.id)) {
        roomInfo.pipeProducers.set(producer.id, []);
      }
      roomInfo.pipeProducers.get(producer.id)!.push(pipeInfo);

      this.logger.log(
        `🔗 On-Demand 파이프: Producer ${producer.id} → Router #${targetRouterIndex} (PipeProducer: ${pipeProducer.id})`,
      );

      return pipeProducer as Producer<ProducerAppData>;
    } catch (error) {
      this.logger.error(
        `❌ On-Demand 파이프 실패: Producer ${producer.id} → Router #${targetRouterIndex}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Producer 종료 시 PipeProducer 능동적 정리
   * Promise.allSettled로 병렬 정리 + 로깅
   *
   * @param roomId Room ID
   * @param producerId Producer ID
   */
  async cleanupPipeProducers(roomId: string, producerId: string): Promise<void> {
    const roomInfo = this.rooms.get(roomId);
    if (!roomInfo) {
      return;
    }

    const pipeInfos = roomInfo.pipeProducers.get(producerId);
    if (!pipeInfos || pipeInfos.length === 0) {
      return;
    }

    this.logger.log(`🧹 Producer ${producerId} 종료: ${pipeInfos.length}개 PipeProducer 정리 시작`);

    // 병렬로 모든 PipeProducer 정리
    const results = await Promise.allSettled(
      pipeInfos.map(async (info, idx) => {
        try {
          if (!info.pipeProducer.closed) {
            info.pipeProducer.close();
          }
          return { idx, success: true };
        } catch (error) {
          return { idx, success: false, error };
        }
      }),
    );

    // 결과 로깅
    let successCount = 0;
    let failCount = 0;

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
        this.logger.log(`  ✅ PipeProducer #${idx} (${pipeInfos[idx].pipeProducer.id}) 정리 성공`);
      } else {
        failCount++;
        const reason =
          result.status === 'rejected' ? result.reason : (result.value as { error: unknown }).error;
        this.logger.error(
          `  ❌ PipeProducer #${idx} (${pipeInfos[idx].pipeProducer.id}) 정리 실패:`,
          reason,
        );
      }
    });

    // Map에서 제거
    roomInfo.pipeProducers.delete(producerId);

    this.logger.log(
      `🧹 Producer ${producerId} PipeProducer 정리 완료: 성공 ${successCount}, 실패 ${failCount}`,
    );
  }

  /**
   * 참가자 퇴장 처리
   */
  removeParticipant(roomId: string, participantId: string): void {
    const roomInfo = this.rooms.get(roomId);
    if (!roomInfo) {
      return;
    }

    const participantMap = this.participantRouterMap.get(roomId);
    if (participantMap) {
      participantMap.delete(participantId);
    }

    roomInfo.participantCount = Math.max(0, roomInfo.participantCount - 1);

    this.logger.log(
      `👋 참가자 ${participantId} 퇴장 (Room: ${roomId}, 남은 참가자: ${roomInfo.participantCount}명)`,
    );
  }

  /**
   * Room 정리 (강의 종료 시)
   */
  async cleanupRoom(roomId: string): Promise<void> {
    const roomInfo = this.rooms.get(roomId);
    if (!roomInfo) {
      return;
    }

    this.logger.log(`🗑️  Room ${roomId} 정리 시작`);

    // 모든 PipeProducer 정리
    for (const producerId of roomInfo.pipeProducers.keys()) {
      await this.cleanupPipeProducers(roomId, producerId);
    }

    // 모든 Router 닫기
    for (let i = 0; i < roomInfo.routers.length; i++) {
      const router = roomInfo.routers[i];
      if (!router.closed) {
        router.close();
        this.logger.log(`  🗑️  Router #${i} 닫힘`);
      }
    }

    // Map에서 제거
    this.rooms.delete(roomId);
    this.participantRouterMap.delete(roomId);

    this.logger.log(`🗑️  Room ${roomId} 정리 완료`);
  }

  /**
   * Room 정보 조회
   */
  getRoomInfo(roomId: string): MultiRouterRoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Room의 첫 번째 Router 반환 (RTP Capabilities 조회용)
   */
  getPrimaryRouter(roomId: string): Router | undefined {
    const roomInfo = this.rooms.get(roomId);
    return roomInfo?.routers[0];
  }

  /**
   * Room의 모든 Router 반환
   */
  getRouters(roomId: string): Router[] {
    const roomInfo = this.rooms.get(roomId);
    return roomInfo?.routers || [];
  }

  /**
   * 디버깅용: PipeProducer 상태 조회
   */
  getPipeProducerStatus(roomId: string): {
    producerId: string;
    pipeCount: number;
    pipeIds: string[];
  }[] {
    const roomInfo = this.rooms.get(roomId);
    if (!roomInfo) {
      return [];
    }

    const result: { producerId: string; pipeCount: number; pipeIds: string[] }[] = [];

    for (const [producerId, pipeInfos] of roomInfo.pipeProducers) {
      result.push({
        producerId,
        pipeCount: pipeInfos.length,
        pipeIds: pipeInfos.map((p) => p.pipeProducer.id),
      });
    }

    return result;
  }
}
