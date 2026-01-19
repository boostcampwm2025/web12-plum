import { UseFilters, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
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
  ProduceRequest,
  ProduceResponse,
  ToggleMediaRequest,
  ToggleMediaResponse,
  UserJoinedPayload,
  UserLeftPayload,
} from '@plum/shared-interfaces';

import { SOCKET_CONFIG } from '../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../common/filters/index.js';
import { MediasoupService } from '../mediasoup/mediasoup.service.js';
import {
  RoomManagerService,
  ParticipantManagerService,
} from '../redis/repository-manager/index.js';
import { SocketMetadataService } from '../common/services/index.js';

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
export class RoomGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(RoomGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly mediasoupService: MediasoupService,
    private readonly roomManagerService: RoomManagerService,
    private readonly participantManagerService: ParticipantManagerService,
    private readonly socketMetadataService: SocketMetadataService,
  ) {}

  // join_room: 강의실 입장
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: JoinRoomRequest,
  ): Promise<JoinRoomResponse> {
    const { roomId, participantId } = data;

    try {
      // 1. 참가자 정보 조회
      const participant = await this.participantManagerService.findOne(participantId);
      if (!participant) {
        return { success: false, error: '참가자를 찾을 수 없습니다.' };
      }

      // 2. Socket.IO room에 join
      socket.join(roomId);

      // 3. 메타데이터 저장
      this.socketMetadataService.set(socket.id, {
        roomId,
        participantId,
        transportIds: [],
      });

      // 4. 다른 참가자들에게 user_joined 브로드캐스트
      const payload: UserJoinedPayload = {
        id: participant.id,
        name: participant.name,
        role: participant.role,
        joinedAt: new Date(),
      };

      socket.to(roomId).emit('user_joined', payload);

      this.logger.log(`✅ [join_room] ${participant.name}님이 ${roomId} 강의실에 입장했습니다.`);

      return { success: true };
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
    await this.cleanupSocket(socket, 'leave_room');
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
      await this.mediasoupService.closeRouter(room.id);
      this.server.to(room.id).emit('room_end');

      // TODO: 강의록 생성 기능 추가

      // 강의실 내부에 있는 모든 참가자 퇴장 처리
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
    await this.cleanupSocket(socket, 'disconnect');
  }

  // 공통 정리 로직
  private async cleanupSocket(socket: Socket, reason: string) {
    const metadata = this.socketMetadataService.get(socket.id);
    if (!metadata) return;

    const { roomId, participantId, transportIds } = metadata;

    try {
      // 1. 참가자 정보 조회
      const participant = await this.participantManagerService.findOne(participantId);
      if (!participant) return { success: false, error: '참가자를 찾을 수 없습니다.' };

      // 2. user_left 브로드캐스트
      const payload: UserLeftPayload = {
        id: participant.id,
        name: participant.name,
        leavedAt: new Date(),
      };
      socket.to(roomId).emit('user_left', payload);

      // 3. Transport 정리
      for (const transportId of transportIds) {
        this.mediasoupService.closeTransport(transportId);
      }
      this.mediasoupService.cleanupParticipantFromMaps(
        Object.values(participant.producers),
        participant.consumers,
      );

      // 4. Redis에서 참가자 제거
      await this.roomManagerService.removeParticipant(roomId, participantId);

      // 5. 메타데이터 삭제
      this.socketMetadataService.delete(socket.id);

      this.logger.log(`[${reason}] ${participant?.name || participantId} left room ${roomId}`);
    } catch (error) {
      this.logger.error(`❌ [${reason}] cleanup 실패:`, error);
    }
  }
}
