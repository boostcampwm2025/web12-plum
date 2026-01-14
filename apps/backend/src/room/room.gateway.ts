import { UseFilters, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { DtlsParameters } from 'mediasoup/node/lib/types';
import { SOCKET_CONFIG } from '../common/constants/socket.constants.js';
import { WsExceptionFilter } from '../common/filters/index.js';
import { MediasoupService } from '../mediasoup/mediasoup.service.js';
import {
  RoomManagerService,
  ParticipantManagerService,
} from '../redis/repository-manager/index.js';

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

  // socket.id -> { roomId, participantId, transportIds } 매핑
  private socketMetadata: Map<
    string,
    { roomId: string; participantId: string; transportIds: string[] }
  > = new Map();

  constructor(
    private readonly mediasoupService: MediasoupService,
    private readonly roomManagerService: RoomManagerService,
    private readonly participantManagerService: ParticipantManagerService,
  ) {}

  // join_room: 강의실 입장
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; participantId: string },
  ) {
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
      this.socketMetadata.set(socket.id, {
        roomId,
        participantId,
        transportIds: [],
      });

      // 4. 다른 참가자들에게 user_joined 브로드캐스트
      socket.to(roomId).emit('user_joined', {
        id: participant.id,
        name: participant.name,
        role: participant.role,
        joinedAt: new Date(),
      });

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
    @MessageBody() data: { direction: 'send' | 'recv' },
  ) {
    const metadata = this.socketMetadata.get(socket.id);
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
    @MessageBody() data: { transportId: string; dtlsParameters: DtlsParameters },
  ) {
    const metadata = this.socketMetadata.get(socket.id);
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

  // leave_room: 강의실 퇴장
  @SubscribeMessage('leave_room')
  async handleLeaveRoom(@ConnectedSocket() socket: Socket) {
    await this.cleanupSocket(socket, 'leave_room');
    return { success: true };
  }

  // handleDisconnect: 비정상 퇴장 (브라우저 닫기 등)
  async handleDisconnect(socket: Socket) {
    await this.cleanupSocket(socket, 'disconnect');
  }

  // 공통 정리 로직
  private async cleanupSocket(socket: Socket, reason: string) {
    const metadata = this.socketMetadata.get(socket.id);
    if (!metadata) return;

    const { roomId, participantId, transportIds } = metadata;

    try {
      // 1. 참가자 정보 조회
      const participant = await this.participantManagerService.findOne(participantId);

      // 2. Transport 정리
      for (const transportId of transportIds) {
        this.mediasoupService.closeTransport(transportId);
      }

      // 3. user_left 브로드캐스트
      if (participant) {
        socket.to(roomId).emit('user_left', {
          id: participant.id,
          name: participant.name,
          leavedAt: new Date(),
        });
      }

      // 4. Redis에서 참가자 제거
      await this.roomManagerService.removeParticipant(roomId, participantId);

      // 5. 메타데이터 삭제
      this.socketMetadata.delete(socket.id);

      this.logger.log(`[${reason}] ${participant?.name || participantId} left room ${roomId}`);
    } catch (error) {
      this.logger.error(`❌ [${reason}] cleanup 실패:`, error);
    }
  }
}
