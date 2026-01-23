import { UseFilters, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import {
  DtlsParameters,
  IceCandidate,
  IceParameters,
  RtpCapabilities,
  RtpParameters,
} from 'mediasoup/node/lib/types';
import {
  BreakRoomResponse,
  ConnectTransportRequest,
  ConnectTransportResponse,
  ConsumeRequest,
  ConsumeResponse,
  ConsumeResumeRequest,
  ConsumeResumeResponse,
  CreateTransportRequest,
  CreateTransportResponse,
  GetProducerRequest,
  GetProducerResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  LeaveRoomResponse,
  MediaStateChangedPayload,
  NewProducerPayload,
  Participant,
  ProduceRequest,
  ProduceResponse,
  ToggleMediaRequest,
  ToggleMediaResponse,
  UserJoinedPayload,
  UserLeftPayload,
} from '@plum/shared-interfaces';

import { SOCKET_CONFIG } from '../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../common/filters/index.js';
import { SocketMetadataService } from '../common/services/index.js';
import { MediasoupService } from '../mediasoup/mediasoup.service.js';
import {
  RoomManagerService,
  ParticipantManagerService,
} from '../redis/repository-manager/index.js';
import { RoomService } from './room.service.js';
import { PrometheusService } from '../prometheus/prometheus.service.js';

/**
 * 강의실 WebSocket Gateway
 *
 * 담당 이벤트:
 * join_room: 강의실 입장 (socket.join + user_joined 브로드캐스트)
 * create_transport: Mediasoup Transport 생성
 * connect_transport: Mediasoup Transport DTLS 연결
 * leave_room: 강의실 퇴장
 * disconnect: 비정상 퇴장 처리
 */
@UseFilters(WsExceptionFilter)
@WebSocketGateway(SOCKET_CONFIG)
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RoomGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly mediasoupService: MediasoupService,
    private readonly roomManagerService: RoomManagerService,
    private readonly participantManagerService: ParticipantManagerService,
    private readonly socketMetadataService: SocketMetadataService,
    private readonly roomService: RoomService,
    private readonly prometheusService: PrometheusService,
  ) {}

  /**
   * Socket.IO 연결 시 메트릭 증가
   */
  handleConnection(socket: Socket) {
    this.prometheusService.incrementSocketIOConnections();
    this.logger.log(`Socket 연결됨: ${socket.id}`);
  }

  // join_room: 강의실 입장
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: JoinRoomRequest,
  ): Promise<JoinRoomResponse> {
    const { roomId, participantId } = data;
    const room = await this.roomManagerService.findOne(roomId);
    if (!room) return { success: false, error: '강의실을 찾을 수 없습니다.' };
    if (room.status === 'pending')
      await this.roomManagerService.updatePartial(roomId, { status: 'active' });

    // 재입장 여부 판단
    const pending = await this.participantManagerService.popReconnectMetadata(participantId);
    if (pending) {
      this.logger.log(`[reconnect] ${participantId} 유저 재접속. 이전 리소스 정리.`);
      const participant = await this.participantManagerService.findOne(participantId);

      // 미디어 상태 초기화
      await this.participantManagerService.updatePartial(participantId, {
        producers: { video: '', audio: '', screen: '' },
        consumers: [],
      });

      this.cleanupMediasoup(pending.transportIds, participant!);
    }

    try {
      // 1. 참가자 정보 조회
      const participant = await this.participantManagerService.findOne(participantId);
      if (!participant) {
        return { success: false, error: '참가자를 찾을 수 없습니다.' };
      }

      // 2. Socket.IO room에 join
      socket.join(roomId);
      socket.join(`${roomId}:${participant.role}`);

      // 3. 메타데이터 저장
      this.socketMetadataService.set(socket.id, {
        roomId,
        participantId,
        transportIds: [],
      });

      // 4. 다른 참가자들에게 user_joined 브로드캐스트
      if (!pending) {
        const payload: UserJoinedPayload = {
          id: participant.id,
          name: participant.name,
          role: participant.role,
          joinedAt: new Date(),
        };

        socket.to(roomId).emit('user_joined', payload);
      }

      this.logger.log(`✅ [join_room] ${participant.name}님이 ${roomId} 강의실에 입장했습니다.`);
      const roomInfo = await this.roomService.getRoomInfo(roomId, participant);

      return {
        success: true,
        participantId: participant.id,
        participantName: participant.name,
        role: participant.role,
        ...roomInfo,
      };
    } catch (error) {
      this.logger.error(`❌ [join_room] 실패:`, error);
      return { success: false, error: '강의실 입장에 실패했습니다.' };
    }
  }

  // create_transport: Transport 생성
  @SubscribeMessage('create_transport')
  async handleCreateTransport(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: CreateTransportRequest,
  ): Promise<CreateTransportResponse<IceParameters, IceCandidate[], DtlsParameters>> {
    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) {
      return { success: false, error: '먼저 join_room을 호출하세요.' };
    }

    try {
      // 1. Transport 생성
      const transportParams = await this.mediasoupService.createWebRtcTransport(metadata.roomId);

      // 2. transportId 저장
      metadata.transportIds.push(transportParams.id);

      // 3. Redis에 participant.transports 업데이트
      const participant = await this.participantManagerService.findOne(metadata.participantId);
      if (participant) {
        participant.transports.push(transportParams.id);
        await this.participantManagerService.updatePartial(metadata.participantId, {
          transports: participant.transports,
        });
      }

      this.logger.log(
        `✅ [create_transport] Transport 생성 (direction: ${data.direction}, id: ${transportParams.id})`,
      );

      return {
        success: true,
        ...transportParams,
      };
    } catch (error) {
      this.logger.error(`❌ [create_transport] 실패:`, error);
      return { success: false, error: 'Transport 생성에 실패했습니다.' };
    }
  }

  // connect_transport: Transport DTLS 연결
  @SubscribeMessage('connect_transport')
  async handleConnectTransport(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ConnectTransportRequest<DtlsParameters>,
  ): Promise<ConnectTransportResponse> {
    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) {
      return { success: false, error: '먼저 join_room을 호출하세요.' };
    }

    try {
      await this.mediasoupService.connectTransport(data.transportId, data.dtlsParameters);

      this.logger.log(`✅ [connect_transport] Transport 연결 완료 (id: ${data.transportId})`);

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ [connect_transport] 실패:`, error);
      return { success: false, error: 'Transport 연결에 실패했습니다.' };
    }
  }

  // produce: Producer 생성 요청
  @SubscribeMessage('produce')
  async handleProduce(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ProduceRequest<RtpParameters>,
  ): Promise<ProduceResponse> {
    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) return { success: false, error: '먼저 join_room을 호출하세요.' };

    try {
      const participant = await this.participantManagerService.findOne(metadata.participantId);
      if (!participant) return { success: false, error: '참가자를 찾을 수 없습니다.' };

      if (data.type === 'screen' && participant.role !== 'presenter') {
        return { success: false, error: '화면 공유 권한이 없습니다.' };
      }

      const kind = data.type === 'audio' ? 'audio' : 'video';
      const producer = await this.mediasoupService.createProducer(
        data.transportId,
        kind,
        metadata.participantId,
        data.type,
        data.rtpParameters,
      );
      await this.participantManagerService.updatePartial(metadata.participantId, {
        producers: {
          ...participant.producers,
          [data.type]: producer.id,
        },
      });

      const payload: NewProducerPayload = {
        producerId: producer.id,
        participantId: participant.id,
        participantRole: participant.role,
        kind: kind,
        type: data.type,
      };

      socket.to(metadata.roomId).emit('new_producer', payload);

      this.logger.log(
        `✅ [produce] ${participant.name} - ${data.type} 송출 시작 (ID: ${producer.id})`,
      );

      return { success: true, kind: kind, producerId: producer.id, type: data.type };
    } catch (error) {
      this.logger.error(`❌ [produce] 실패:`, error);
      return { success: false, error: 'Produce 생성에 실패하였습니다.' };
    }
  }

  // get_producer: 특정 참가자의 Producer id 요청
  @SubscribeMessage('get_producer')
  async handleGetProducer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: GetProducerRequest,
  ): Promise<GetProducerResponse> {
    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) return { success: false, error: '먼저 join_room을 호출하세요.' };

    try {
      const targetParticipant = await this.participantManagerService.findOne(
        data.targetParticipantId,
      );
      if (!targetParticipant)
        return { success: false, error: '해당하는 참가자가 존재하지 않습니다.' };

      const producerId = targetParticipant.producers[data.type];
      return { success: true, producerId };
    } catch (error) {
      this.logger.error(`❌ [get_producer] 실패:`, error);
      return { success: false, error: 'Producer 조회에 실패하였습니다.' };
    }
  }

  // consume: 특정 Producer에 대해 consume 요청
  @SubscribeMessage('consume')
  async handleConsume(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ConsumeRequest<RtpCapabilities>,
  ): Promise<ConsumeResponse<RtpParameters>> {
    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) return { success: false, error: '먼저 join_room을 호출하세요.' };

    try {
      const participant = await this.participantManagerService.findOne(metadata.participantId);
      if (!participant) return { success: false, error: '참가자를 찾을 수 없습니다.' };

      const consumer = await this.mediasoupService.createConsumer(
        data.transportId,
        data.producerId,
        metadata.participantId,
        data.rtpCapabilities,
      );
      await this.participantManagerService.updatePartial(metadata.participantId, {
        consumers: [...participant.consumers, consumer.id],
      });
      const producer = this.mediasoupService.getProducer(data.producerId)!;

      this.logger.log(
        `✅ [consume] ${participant.name} - Consumer 생성 (ID: ${consumer.id}, 구독 대상 Producer: ${data.producerId})`,
      );

      return {
        success: true,
        producerId: producer.id,
        consumerId: consumer.id,
        kind: consumer.kind,
        type: producer.appData.source,
        rtpParameters: consumer.rtpParameters,
      };
    } catch (error) {
      this.logger.error(`❌ [consume] 실패:`, error);
      return { success: false, error: 'Consumer 생성에 실패하였습니다.' };
    }
  }

  // consume_resume: 특정 Consumer에 대해 resume 요청
  @SubscribeMessage('consume_resume')
  async handleResumeConsumer(
    @MessageBody() data: ConsumeResumeRequest,
  ): Promise<ConsumeResumeResponse> {
    try {
      await this.mediasoupService.resumeConsumer(data.consumerId);
      return { success: true };
    } catch (error) {
      this.logger.error(`❌ [consume_resume] 실패:`, error);
      return { success: false, error: 'Consumer 데이터 수신 알림에 실패하였습니다.' };
    }
  }

  // toggle_media
  @SubscribeMessage('toggle_media')
  async handleToggleMedia(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ToggleMediaRequest,
  ): Promise<ToggleMediaResponse> {
    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) return { success: false, error: '먼저 join_room을 호출하세요.' };

    try {
      const participant = await this.participantManagerService.findOne(metadata.participantId);
      if (!participant) return { success: false, error: '참가자를 찾을 수 없습니다.' };

      if (data.producerId in Object.values(participant.producers))
        return { success: false, error: '참가자의 producerId가 아닙니다.' };

      if (data.action === 'pause') await this.mediasoupService.pauseProducer(data.producerId);
      else await this.mediasoupService.resumeProducer(data.producerId);

      this.logger.log(`✅ [toggle_media] ${participant.name} - ${data.type} ${data.action} 완료`);

      const payload: MediaStateChangedPayload = {
        producerId: data.producerId,
        participantId: participant.id,
        participantRole: participant.role,
        kind: data.type === 'audio' ? 'audio' : 'video',
        type: data.type,
        action: data.action,
      };
      socket.to(metadata.roomId).emit('media_state_changed', payload);
      return { success: true };
    } catch (error) {
      this.logger.error(`❌ [toggle_media] 실패:`, error);
      return { success: false, error: `특정 미디어를 ${data.action} 하는데 실패하였습니다.` };
    }
  }

  // leave_room: 강의실 퇴장
  @SubscribeMessage('leave_room')
  async handleLeaveRoom(@ConnectedSocket() socket: Socket): Promise<LeaveRoomResponse> {
    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) return { success: true };

    socket.leave(metadata.roomId);
    await this.cleanup(
      'leave_room',
      metadata.roomId,
      metadata.participantId,
      metadata.transportIds,
    );
    this.socketMetadataService.delete(socket.id);
    return { success: true };
  }

  @SubscribeMessage('break_room')
  async handleBreakRoom(@ConnectedSocket() socket: Socket): Promise<BreakRoomResponse> {
    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) {
      return { success: false, error: '세션이 만료되었거나 유효하지 않은 접근입니다.' };
    }

    const participant = await this.participantManagerService.findOne(metadata.participantId);
    const room = await this.roomManagerService.findOne(metadata.roomId);

    if (!participant || !room) {
      return { success: false, error: '방 정보를 찾을 수 없습니다.' };
    }

    if (participant.role !== 'presenter' || room.presenter !== participant.id) {
      return { success: false, error: '강의를 종료할 권한이 없습니다.' };
    }

    if (room.status !== 'active') {
      return { success: false, error: '이미 종료되었거나 진행 중인 강의가 아닙니다.' };
    }

    try {
      await this.roomManagerService.updatePartial(room.id, { status: 'ended' });
      this.server.to(room.id).emit('room_end');
      await this.mediasoupService.closeRouter(room.id);
      // TODO: 강의록 생성 기능 추가

      // 강의실 내부에 있는 모든 참가자 퇴장 처리
      this.logger.log(`🚨 [break_room] 발표자 ${participant.name}에 의해 강의실 ${room.id} 종료`);

      this.server.in(room.id).socketsLeave(room.id);
      this.server.in(room.id).disconnectSockets(true);
      return { success: true };
    } catch (error) {
      this.logger.error(`[break_room] 실패:`, error);
      return { success: false, error: `종료 처리 중 서버 내부 오류가 발생하였습니다.` };
    }
  }

  // handleDisconnect: 비정상 퇴장 (브라우저 닫기 등)
  async handleDisconnect(socket: Socket) {
    // Prometheus 메트릭 감소
    this.prometheusService.decrementSocketIOConnections();

    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) return;

    this.logger.log(
      `[disconnect] ${metadata.participantId} 유저 접속 끊김. Redis 15초 타이머 시작.`,
    );
    await this.participantManagerService.setReconnectPending(metadata.participantId, metadata);
    this.socketMetadataService.delete(socket.id);
  }

  @OnEvent('redis.expired.reconnect')
  async handleReconnectExpired(key: string) {
    const participantId = key.split(':').pop();
    const metadata = await this.participantManagerService.popReconnectMetadata(participantId!);

    if (metadata)
      await this.cleanup(
        'reconnect expired',
        metadata.roomId,
        participantId!,
        metadata.transportIds,
      );
  }

  private cleanupMediasoup(transportIds: string[], participant: Participant): void {
    for (const transportId of transportIds) {
      this.mediasoupService.closeTransport(transportId);
    }
    this.mediasoupService.cleanupParticipantFromMaps(
      Object.values(participant.producers),
      participant.consumers,
    );
  }

  /**
   * 공통 퇴장 로직
   */
  private async cleanup(
    reason: string,
    roomId: string,
    participantId: string,
    transportIds: string[],
  ) {
    try {
      const participant = await this.participantManagerService.findOne(participantId);
      if (!participant) return;

      const payload: UserLeftPayload = {
        id: participant.id,
        name: participant.name,
        leavedAt: new Date(),
      };
      this.server.to(roomId).emit('user_left', payload);

      this.cleanupMediasoup(transportIds, participant);

      await this.roomManagerService.removeParticipant(roomId, participantId);
      this.logger.log(`[${reason}] ${participant?.name || participantId} left room ${roomId}`);
    } catch (error) {
      this.logger.error(`❌ [${reason}] cleanup 실패:`, error);
    }
  }
}
