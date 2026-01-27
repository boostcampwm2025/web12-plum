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
  FileInfo,
  MediasoupProducer,
  Participant,
  ParticipantPayload,
  ParticipantRole,
  Room,
  RoomInfo,
  RoomValidationResponse,
} from '@plum/shared-interfaces';
import { InteractionService } from '../interaction/interaction.service.js';
import {
  ActivityScoreManagerService,
  RoomManagerService,
} from '../redis/repository-manager/index.js';
import { MediasoupService } from '../mediasoup/mediasoup.service.js';
import { RoomType } from '../mediasoup/mediasoup.type.js';

@Injectable()
export class RoomService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly interactionService: InteractionService,
    private readonly roomManagerService: RoomManagerService,
    private readonly activityScoreManagerService: ActivityScoreManagerService,
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

  private async uploadFile(file: Express.Multer.File): Promise<FileInfo> {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const fileName = `${ulid()}_${originalName}`;

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
      return {
        url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`,
        size: file.size,
      };
    } catch (error) {
      throw new InternalServerErrorException('파일 업로드 중 오류가 발생했습니다.', error);
    }
  }

  private async multipleFileUpload(files: Express.Multer.File[]): Promise<FileInfo[]> {
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
    await Promise.all([
      this.roomManagerService.addParticipant(roomId, host),
      this.activityScoreManagerService.initializeParticipantScore(roomId, hostId),
    ]);
    return host;
  }

  async getRoomInfo(roomId: string, participant: Participant): Promise<RoomInfo> {
    const rtpCapabilities = this.mediasoupService.getRouterRtpCapabilities(roomId);
    const allParticipants = await this.roomManagerService.getParticipantsInRoom(roomId);

    const existingProducers: MediasoupProducer[] = [];
    const otherParticipants: ParticipantPayload[] = [];
    let presenterInfo: ParticipantPayload | undefined = undefined;

    for (const p of allParticipants) {
      if (p.id === participant.id) continue;

      if (p.producers) {
        if (p.producers.audio)
          existingProducers.push({
            producerId: p.producers.audio,
            participantId: p.id,
            kind: 'audio',
            type: 'audio',
          });
        if (p.producers.video)
          existingProducers.push({
            producerId: p.producers.video,
            participantId: p.id,
            kind: 'video',
            type: 'video',
          });
        if (p.producers.screen)
          existingProducers.push({
            producerId: p.producers.screen,
            participantId: p.id,
            kind: 'video',
            type: 'screen',
          });
      }

      const info = {
        id: p.id,
        name: p.name,
        role: p.role,
        joinedAt: new Date(p.joinedAt),
      };

      if (p.role === 'presenter') presenterInfo = info;
      else otherParticipants.push(info);
    }

    return {
      mediasoup: {
        routerRtpCapabilities: rtpCapabilities,
        existingProducers,
      },
      participants: presenterInfo ? [presenterInfo, ...otherParticipants] : otherParticipants,
    };
  }

  async createRoom(
    body: CreateRoomRequest,
    files: Express.Multer.File[],
  ): Promise<CreateRoomResponse> {
    const roomId = ulid();
    const hostId = ulid();

    const [uploadFilesUrl] = await Promise.all([
      this.multipleFileUpload(files),
      this.interactionService.createMultiplePoll(roomId, body.polls),
      this.interactionService.createMultipleQna(roomId, body.qnas),
      this.mediasoupService.createRoutersWithStrategy(roomId, RoomType.LECTURE),
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
      aiSummery: '',
    };

    await this.roomManagerService.saveOne(roomId, room);
    const host = await this.createHost(roomId, hostId, body.hostName);
    const roomInfo = await this.getRoomInfo(roomId, host);

    return {
      roomId: roomId,
      host: {
        id: host.id,
        name: host.name,
        role: host.role,
      },
      ...roomInfo,
    };
  }

  async joinRoom(roomId: string, body: EnterLectureRequestBody): Promise<EnterRoomResponse> {
    const room = await this.validateRoom(roomId);
    if (room.name !== body.name) throw new BadRequestException('Room name does not match');

    const participant = await this.createParticipant(roomId, body.nickname);
    const roomInfo = await this.getRoomInfo(room.id, participant);

    return {
      participantId: participant.id,
      name: participant.name,
      role: participant.role,
      ...roomInfo,
    };
  }

  async getRoomValidation(roomId: string): Promise<RoomValidationResponse> {
    const room = await this.validateRoom(roomId);
    return { name: room.name };
  }

  async createParticipant(roomId: string, name: string): Promise<Participant> {
    const participant = this.generateParticipantObject(ulid(), roomId, name, 'audience');

    await Promise.all([
      this.roomManagerService.addParticipant(roomId, participant),
      this.activityScoreManagerService.initializeParticipantScore(roomId, participant.id),
    ]);
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

  async getFiles(roomId: string): Promise<FileInfo[]> {
    const room = await this.roomManagerService.findOne(roomId);

    if (!room) throw new NotFoundException(`Room with ID ${roomId} not found`);

    return room.files;
  }
}
