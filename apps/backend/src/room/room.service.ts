import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ulid } from 'ulid';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
  CreateRoomRequest,
  CreateRoomResponse,
  EnterLectureRequestBody,
  EnterRoomResponse,
  Participant,
  ParticipantRole,
  Room,
  RoomValidationResponse,
} from '@plum/shared-interfaces';
import { InteractionService } from '../interaction/interaction.service.js';
import { RoomManagerService } from '../redis/repository-manager/index.js';
import { MediasoupService } from '../mediasoup/mediasoup.service.js';

const AUDIENCE_VIDEO_LIMIT = 5;

@Injectable()
export class RoomService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly interactionService: InteractionService,
    private readonly roomManagerService: RoomManagerService,
    private readonly mediasoupService: MediasoupService,
  ) {
    this.region = configService.get<string>('AWS_S3_REGION') || '';
    this.bucketName = configService.get<string>('AWS_S3_BUCKET_NAME') || '';
    const accessKey = this.configService.get<string>('AWS_S3_ACCESS_KEY') || '';
    const secretAccessKey = this.configService.get<string>('AWS_S3_SECRET_KEY') || '';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretAccessKey,
      },
    });
  }

  private async uploadFile(file: Express.Multer.File): Promise<string> {
    const fileName = `${ulid()}_${file.originalname}`;

    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
      });

      await upload.done();

      // 환경 변수로 관리되는 region과 bucketName을 사용하여 URL 반환
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
    } catch (error) {
      throw new InternalServerErrorException('파일 업로드 중 오류가 발생했습니다.', error);
    }
  }

  private async multipleFileUpload(files: Express.Multer.File[]): Promise<string[]> {
    if (!files || files.length === 0) return [];

    return await Promise.all(files.map((file) => this.uploadFile(file)));
  }

  private generateParticipantObject(
    id: string,
    roomId: string,
    name: string,
    role: ParticipantRole,
  ): Participant {
    return {
      id,
      roomId,
      currentRoomId: roomId,
      name,
      role,
      participationScore: 0,
      gestureCount: 0,
      chatCount: 0,
      pollParticipation: 0,
      cameraEnable: false,
      micEnable: false,
      screenEnable: false,
      transports: [],
      producers: {
        audio: '',
        video: '',
        screen: '',
      },
      consumers: [],
      joinedAt: new Date().toISOString(),
    };
  }

  private async createHost(roomId: string, hostId: string, name: string) {
    const host = this.generateParticipantObject(hostId, roomId, name, 'presenter');
    await this.roomManagerService.addParticipant(roomId, host);
    return host;
  }

  async createRoom(
    body: CreateRoomRequest,
    files: Express.Multer.File[],
  ): Promise<CreateRoomResponse> {
    const roomId = ulid();
    const hostId = ulid();

    const [uploadFilesUrl, polls, qnas, router] = await Promise.all([
      this.multipleFileUpload(files),
      this.interactionService.createMultiplePoll(roomId, body.polls),
      this.interactionService.createMultipleQna(roomId, body.qnas),
      this.mediasoupService.createRouter(roomId),
    ]);

    const room: Room = {
      id: roomId,
      name: body.name,
      presenter: hostId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      endedAt: '',
      files: uploadFilesUrl,
      polls: polls.map((poll) => poll.id),
      qnas: qnas.map((qna) => qna.id),
      aiSummery: '',
    };

    await this.roomManagerService.saveOne(roomId, room);
    const host = await this.createHost(roomId, hostId, body.hostName);

    return {
      roomId: roomId,
      host: {
        id: host.id,
        name: host.name,
        role: host.role,
      },
      mediasoup: {
        routerRtpCapabilities: router.rtpCapabilities,
        existingProducers: [],
      },
    };
  }

  async joinRoom(roomId: string, body: EnterLectureRequestBody): Promise<EnterRoomResponse> {
    const room = await this.validateRoom(roomId);
    if (room.name !== body.name) throw new BadRequestException('Room name does not match');

    const participant = await this.createParticipant(roomId, body.nickname);
    const rtpCapabilities = this.mediasoupService.getRouterRtpCapabilities(roomId);

    const allParticipants = await this.roomManagerService.getParticipantsInRoom(roomId);
    const others = allParticipants.filter((p) => p.id !== participant.id);
    const audienceVideoCandidates = others
      .filter((p) => p.role === 'audience' && p.producers.video && p.id !== participant.id)
      .sort((a, b) => {
        const dateA = new Date(a.joinedAt).getTime();
        const dateB = new Date(b.joinedAt).getTime();
        return dateA - dateB;
      })
      .slice(0, AUDIENCE_VIDEO_LIMIT - 1);

    const videoTargetIds = new Set(audienceVideoCandidates.map((p) => p.id));

    const existingProducers: any[] = [];
    for (const p of allParticipants) {
      if (p.id === participant.id) continue; // 본인 제외

      // 오디오는 무조건 추가
      if (p.producers.audio) {
        existingProducers.push({
          producerId: p.producers.audio,
          participantId: p.id,
          kind: 'audio',
        });
      }

      // 발표자 특수 로직
      if (p.role === 'presenter') {
        if (p.producers.video) {
          existingProducers.push({
            producerId: p.producers.video,
            participantId: p.id,
            kind: 'video',
          });
        }
        if (p.producers.screen) {
          existingProducers.push({
            producerId: p.producers.screen,
            participantId: p.id,
            kind: 'screen',
          });
        }
      }
      // 선별된 청중 비디오 추가
      else if (videoTargetIds.has(p.id) && p.producers.video) {
        existingProducers.push({
          producerId: p.producers.video,
          participantId: p.id,
          kind: 'video',
        });
      }
    }

    return {
      participantId: participant.id,
      name: participant.name,
      role: participant.role,
      mediasoup: {
        existingProducers,
        routerRtpCapabilities: rtpCapabilities,
      },
    };
  }

  async getRoomValidation(roomId: string): Promise<RoomValidationResponse> {
    const room = await this.validateRoom(roomId);
    return { name: room.name };
  }

  async createParticipant(roomId: string, name: string): Promise<Participant> {
    const participant = this.generateParticipantObject(ulid(), roomId, name, 'audience');

    await this.roomManagerService.addParticipant(roomId, participant);
    return participant;
  }

  async validateRoom(roomId: string): Promise<Room> {
    const room = await this.roomManagerService.findOne(roomId);

    if (!room) throw new NotFoundException(`Room with ID ${roomId} not found`);
    if (room.status === 'ended') throw new BadRequestException(`The room has already ended.`);
    return room;
  }

  async validateNickname(roomId: string, nickname: string): Promise<boolean> {
    return await this.roomManagerService.isNameAvailable(roomId, nickname);
  }
}
