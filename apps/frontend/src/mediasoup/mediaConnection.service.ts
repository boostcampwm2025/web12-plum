import type { RtpCapabilities, Transport } from 'mediasoup-client/types';
import type { MediaType } from '@plum/shared-interfaces';

import { logger } from '@/shared/lib/logger';

import { MediasoupService, type MediaEventHandlers } from './mediasoup.service';
import { MediasoupClient } from './client';

type TransportDirection = 'send' | 'recv';

/**
 * WebRTC 기반 실시간 미디어 통신의 전체 흐름을 관리하는 서비스
 *
 * - MediasoupService: 시그널링 서버와 Socket.IO 통신
 * - MediasoupClient: 브라우저 내 mediasoup 객체(Device, Transport 등) 상태 관리
 *
 * 일반적인 사용 흐름:
 * 1. initialize(): Device와 Transport 준비
 * 2. startProducing(): 내 미디어 송출 시작
 * 3. startConsuming(): 다른 참여자 미디어 수신
 * 4. cleanup(): 방 퇴장 시 리소스 정리
 */
export class MediaConnectionService {
  /**
   * 전체 연결 초기화 (Device + Transports)
   *
   * 방에 입장할 때 가장 먼저 호출해야 함
   * 서버에서 받은 RTP 설정으로 브라우저의 미디어 기능을 초기화하고,
   * 미디어를 주고받을 수 있는 통로(Transport)를 양방향으로 준비
   *
   * @param rtpCapabilities 서버에서 제공받은 미디어 코덱/포맷 설정
   */
  static async initialize(rtpCapabilities: RtpCapabilities) {
    try {
      await MediasoupClient.initDevice(rtpCapabilities);
      await Promise.all([this.createTransport('send'), this.createTransport('recv')]);
    } catch (error) {
      logger.media.error('[MediaConnection] 미디어 연결 초기화 실패', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Transport 생성 및 내부 이벤트 바인딩
   *
   * Transport는 브라우저와 미디어 서버 간의 WebRTC 연결 통로임
   * 'send'는 내 미디어를 보내는 통로, 'recv'는 받는 통로로 분리되어 있음
   * 서버에서 연결 정보를 받아 로컬 Transport를 생성하고,
   * 연결/송출 시 자동으로 서버와 동기화되도록 이벤트를 연결
   */
  private static async createTransport(direction: TransportDirection): Promise<Transport> {
    const device = MediasoupClient.getRequiredDevice();

    // 서버에서 Transport 파라미터 요청
    const { success: _, ...data } = await MediasoupService.createTransport({ direction });

    // Transport 인스턴스 생성
    const transport =
      direction === 'send' ? device.createSendTransport(data) : device.createRecvTransport(data);
    this.bindTransportEvents(transport, direction);

    if (direction === 'send') MediasoupClient.setSendTransport(transport);
    else MediasoupClient.setRecvTransport(transport);

    logger.media.debug(`[MediaConnection] ${direction} Transport 구축 완료`, { id: transport.id });
    return transport;
  }

  /**
   * Transport 이벤트를 서버 통신과 연결
   *
   * mediasoup-client는 내부적으로 특정 시점에 이벤트를 발생시킴
   * - connect: DTLS 핸드셰이크 시작 시 (서버에 연결 정보 전달 필요)
   * - produce: producer 생성 시 (서버에 송출 등록 필요)
   * 이 이벤트들을 서버 API와 연결해 자동으로 동기화되게 함
   */
  private static bindTransportEvents(transport: Transport, direction: TransportDirection): void {
    // DTLS 연결 이벤트
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await MediasoupService.connectTransport({ transportId: transport.id, dtlsParameters });
        callback();
      } catch (error) {
        errback(error as Error);
      }
    });

    // 미디어 송출 이벤트 (Send전용)
    if (direction !== 'send') return;
    transport.on('produce', async ({ rtpParameters, appData }, callback, errback) => {
      try {
        const { producerId } = await MediasoupService.produce({
          transportId: transport.id,
          rtpParameters,
          type: appData.type as MediaType,
        });
        callback({ id: producerId });
      } catch (error) {
        errback(error as Error);
      }
    });
  }

  /**
   * 다른 참여자의 미디어 수신 시작
   *
   * 다른 사람이 송출 중인 미디어(producerId)를 받아옴
   * 서버에 수신 요청 -> 로컬 Consumer 생성 -> MediaStream으로 변환하여 반환
   * 반환된 stream을 <video> 또는 <audio> 요소에 연결하면 재생됨
   * resume 요청을 서버에 보내 수신을 시작함
   *
   * @param producerId 수신할 상대방의 Producer ID (서버 이벤트로 전달받음)
   * @returns Consumer 객체와 재생 가능한 MediaStream
   */
  static async startConsuming(producerId: string) {
    const device = MediasoupClient.getRequiredDevice();
    let recvTransport = MediasoupClient.getRecvTransport();

    // 수신용 Transport가 없으면 생성
    if (!recvTransport || recvTransport.closed) {
      recvTransport = await this.createTransport('recv');
    }

    // 서버에 수신 요청
    const { consumerId, kind, rtpParameters } = await MediasoupService.consume({
      transportId: recvTransport.id,
      producerId,
      rtpCapabilities: device.rtpCapabilities,
    });

    // 로컬 Consumer 생성
    const payload = { id: consumerId, producerId, kind, rtpParameters };
    const consumer = await recvTransport.consume(payload);

    // 수신 트랙으로 Stream 생성 및 저장
    const stream = new MediaStream([consumer.track]);
    MediasoupClient.setConsumer(consumer, stream);

    // 서버에 Resume 요청
    await MediasoupService.consumeResume({ consumerId });

    return { consumer, stream };
  }

  /**
   * 특정 Consumer 정리
   *
   * 상대방이 송출을 중단하거나 퇴장했을 때 호출
   * 해당 미디어 수신을 중단하고 관련 리소스를 해제
   */
  static removeConsumer(consumerId: string) {
    return MediasoupClient.removeConsumerLocally(consumerId);
  }

  /**
   * 미디어 이벤트 핸들러 등록
   *
   * 서버에서 발생하는 미디어 관련 이벤트(새 Producer 등장, Consumer 종료 등)를 처리할 콜백 함수들을 등록
   * 방 입장 시 설정해야 함
   */
  static setupMediaEventHandlers(handlers: MediaEventHandlers) {
    return MediasoupService.setupEventHandlers(handlers);
  }

  /**
   * 미디어 이벤트 핸들러 해제
   *
   * 방 퇴장 시 등록했던 이벤트 핸들러를 제거
   * 메모리 누수 방지를 위해 cleanup() 전에 호출해야 함
   */
  static removeMediaEventHandlers() {
    MediasoupService.removeEventHandlers();
  }

  /**
   * 내 미디어를 다른 참여자들에게 송출 시작
   *
   * 카메라/마이크에서 얻은 MediaStreamTrack을 서버로 보냄
   * 송출이 시작되면 같은 방의 다른 참여자들이 이 미디어를 수신할 수 있음
   *
   * @param track getUserMedia()로 얻은 비디오/오디오 트랙
   * @param type 미디어 종류 ('video' | 'audio' | 'screen')
   * @returns 생성된 Producer 객체 (일시정지/재개 제어용)
   */
  static async startProducing(track: MediaStreamTrack, type: MediaType) {
    const sendTransport = MediasoupClient.getRequiredSendTransport();
    const producer = await sendTransport.produce({ track, appData: { type } });

    MediasoupClient.setProducer(type, producer);
    logger.media.debug(`[MediaConnectionService] Producer 생성 완료: ${type}`, { id: producer.id });

    return producer;
  }

  /**
   * 특정 타입의 미디어 송출 완전 중단
   *
   * 카메라나 마이크 송출을 완전히 종료함
   * producer가 서버에서 제거되고 로컬 리소스도 해제됨
   * 다시 송출하려면 startProducing()을 새로 호출해야 함
   * 일시정지만 원하면 toggleProducer()를 사용
   *
   * @param type 중단할 미디어 종류 ('video' | 'audio' | 'screen')
   */
  static async stopProducing(type: MediaType) {
    const producer = MediasoupClient.getProducer(type);
    if (!producer) return;

    await MediasoupService.closeProducer({ producerId: producer.id });
    MediasoupClient.removeProducerLocally(type);
    logger.media.debug(`[MediaConnectionService] Producer 종료 완료: ${type}`);
  }

  /**
   * 특정 미디어 일시정지/재개 토글
   *
   * 마이크 뮤트나 카메라 끄기 같은 일시적인 중단에 사용함
   * Producer 자체는 유지되므로 빠르게 다시 켤 수 있음
   * 서버 통신 실패 시 로컬 상태를 자동으로 롤백함
   *
   * @param type 대상 미디어 종류
   * @param pause true면 일시정지, false면 재개
   */
  static async toggleProducer(type: MediaType, pause: boolean) {
    // 로컬 객체 상태 변경
    const producerId = MediasoupClient.toggleProducerLocally(type, pause);
    if (!producerId) return;

    // 서버에 상태 변경 알림
    try {
      const action = pause ? 'pause' : 'resume';
      await MediasoupService.toggleMedia({ producerId, type, action });
      logger.media.debug(`[MediaConnectionService] ${type} 송출 ${pause ? '일시정지' : '재개'}`);
    } catch (error) {
      logger.media.error(`[MediaConnectionService] ${type} 서버 통신 실패로 인한 롤백`, error);
      MediasoupClient.toggleProducerLocally(type, !pause);
      throw error;
    }
  }

  /**
   * 모든 미디어 송출 일괄 종료
   *
   * 방 퇴장 시 내가 송출 중인 모든 미디어(카메라, 마이크, 화면공유)를 한 번에 정리하고, 서버에 종료를 알림
   *
   * @returns 종료된 Producer ID 목록
   */
  static async stopAllProducers() {
    const producerIds = MediasoupClient.closeAllProducersLocally();

    await Promise.allSettled(
      producerIds.map((id) => MediasoupService.closeProducer({ producerId: id })),
    );

    return producerIds;
  }

  /**
   * 모든 미디어 수신 일괄 종료
   *
   * 방 퇴장 시 다른 참여자들로부터 받고 있던 모든 미디어 수신을 한 번에 정리하고, 서버에 종료를 알림
   *
   * @returns 종료된 Consumer ID 목록
   */
  static async stopAllConsumers() {
    const consumerIds = MediasoupClient.closeAllConsumersLocally();

    await Promise.allSettled(
      consumerIds.map((id) => MediasoupService.closeConsumer({ consumerId: id })),
    );

    return consumerIds;
  }

  /**
   * 모든 미디어 리소스 정리
   *
   * 방 퇴장 시 반드시 호출해야 함
   * 이벤트 핸들러 해제, Transport 닫기, Producer/Consumer 정리 등
   * 모든 미디어 관련 리소스를 해제하여 메모리 누수를 방지함
   */
  static cleanup() {
    MediasoupService.removeEventHandlers();
    MediasoupClient.cleanup();
    logger.media.info('[MediaConnectionService] 미디어 연결 리소스 정리 완료');
  }
}
