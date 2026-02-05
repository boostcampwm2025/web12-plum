import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { access, mkdir } from 'fs/promises';
import { ChildProcess, spawn } from 'child_process';
import { join } from 'path';
import * as net from 'node:net';
import { MediasoupService } from '../mediasoup/mediasoup.service.js';
import { FileWatcherService } from './file-watcher.service.js';
import { RECORD_DIR, SEGMENT_TIME } from './record.constant.js';

interface RecorderContext {
  process: ChildProcess;
  transportId: string;
  timestamp: number;
}

interface FFmpegOption {
  port: number;
  payloadType: number;
  timestamp: number;
}

/**
 * TODO: Scalability Optimization
 * 현재 방식은 각 스트림(Producer)마다 개별 PlainTransport와 Port를 생성함.
 * 동시 접속자가 급증할 경우 포트 고갈 및 CPU 부하가 발생할 수 있음.
 * * 차후 개선 방안:
 * 1. 단일 PlainTransport에서 SSRC를 구분하여 수신하도록 FFmpeg 파라미터 최적화
 * 2. 별도의 미디어 서버(Recording Worker)로 녹음 로직 분리
 */
@Injectable()
export class RecordService implements OnModuleInit {
  private readonly logger = new Logger(RecordService.name);

  // 강사 전용 리코더: Map<roomId, RecorderContext>
  private teacherRecorders: Map<string, RecorderContext> = new Map();
  // 학생용 리코더: Map<roomId, Map<participantId, RecorderContext>>
  private studentRecorders: Map<string, Map<string, RecorderContext>> = new Map();

  constructor(
    private readonly mediasoupService: MediasoupService,
    private readonly fileWatcherService: FileWatcherService,
  ) {}

  onModuleInit() {
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists() {
    try {
      // 접근 시도 (폴더가 있는지 확인)
      await access(RECORD_DIR);
    } catch {
      // 에러가 났다면 폴더가 없다는 뜻이므로 생성
      await mkdir(RECORD_DIR, { recursive: true });
      this.logger.log(`📁 녹음 폴더 생성 완료: ${RECORD_DIR}`);
    }
  }

  /**
   * FFmpeg 프로세스 실행
   */
  private runFFmpeg(roomId: string, rolePrefix: string, options: FFmpegOption): ChildProcess {
    const { port, timestamp, payloadType } = options;
    const key = `${roomId}_${rolePrefix}_${timestamp}`;
    const outputPath = join(RECORD_DIR, `${key}_%03d.wav`);

    const sdpString = `v=0
o=- 0 0 IN IP4 127.0.0.1
s=Mediasoup
c=IN IP4 127.0.0.1
t=0 0
m=audio ${port} RTP/AVP ${payloadType}
a=rtpmap:${payloadType} opus/48000/2
a=fmtp:${payloadType} sprop-stereo=1`;

    const ffmpeg = spawn('ffmpeg', [
      // 글로벌/입력 설정
      '-loglevel',
      'warning',
      '-protocol_whitelist',
      'rtp,file,udp,pipe',
      '-reorder_queue_size',
      '100',
      '-f',
      'sdp', // 포맷을 rtp가 아닌 sdp로 설정
      '-i',
      'pipe:0', // 표준 입력으로 SDP 전달

      // 분석 시간 최적화 (너무 길면 파일 생성이 늦어짐)
      '-analyzeduration',
      '0', // 분석 시간 0
      '-probesize',
      '32', // 최소 분석 데이터

      // 필터 및 맵핑 (출력 전 가공
      '-af',
      'agate=threshold=-45dB:range=0.01:release=1000',
      '-map',
      '0:a',

      // 출력 포맷 및 인코딩 설정
      '-acodec',
      'pcm_s16le',
      '-ac',
      '1', // AI는 단일 채널을 선호함
      '-ar',
      '16000', // AI STT 표준 샘플링 레이트 (16kHz)
      '-flush_packets',
      '1',

      // 세그먼트/파일 저장 설정
      '-f',
      'segment',
      '-segment_time',
      `${SEGMENT_TIME}`,
      '-segment_format',
      'wav',
      '-write_empty_segments',
      '1', // 데이터가 적어도 파일 생성
      '-reset_timestamps',
      '1',
      '-flush_packets',
      '1',
      outputPath,
    ]);

    ffmpeg.stdin.write(sdpString);
    ffmpeg.stdin.end();

    ffmpeg.on('error', (err) => {
      this.logger.error(`❌ FFmpeg 실행 실패: ${err.message}`);
      this.logger.error(`시스템에 FFmpeg가 설치되어 있고 PATH에 등록되어 있는지 확인하세요.`);
    });

    ffmpeg.on('close', (code) => {
      this.logger.log(`FFmpeg 종료 [${rolePrefix}] (Code: ${code})`);
    });

    ffmpeg.stderr.on('data', (data) => {
      this.logger.debug(`[FFmpeg Log] ${data.toString()}`);
    });

    return ffmpeg;
  }

  private async getFreePort(): Promise<number> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(0, () => {
        const port = (server.address() as net.AddressInfo).port;
        server.close(() => resolve(port));
      });
    });
  }

  /**
   * 녹음 시작 (역할에 따라 분기)
   */
  async startRecording(
    roomId: string,
    participantId: string,
    producerId: string,
    isPresenter: boolean,
  ) {
    if (isPresenter) {
      const existing = this.teacherRecorders.get(roomId);
      if (existing) await this.terminateRecorder(roomId, 'presenter', existing);
    } else {
      const existing = this.studentRecorders.get(roomId)?.get(participantId);
      if (existing) await this.terminateRecorder(roomId, `participant_${participantId}`, existing);
    }

    const transport = await this.mediasoupService.createPlainTransport(roomId);
    const remoteRtpPort = await this.getFreePort();
    const rtpCapabilities = this.mediasoupService.getRouterRtpCapabilities(roomId);
    const consume = await this.mediasoupService.consumeAudioToPlain(
      transport,
      producerId,
      remoteRtpPort,
      rtpCapabilities,
    );

    const rolePrefix = isPresenter ? 'presenter' : `participant_${participantId}`;
    const timestamp = Date.now();
    const options: FFmpegOption = {
      port: remoteRtpPort,
      timestamp,
      payloadType: consume.rtpParameters.codecs[0].payloadType,
    };
    const ffmpegProcess = this.runFFmpeg(roomId, rolePrefix, options);

    const context: RecorderContext = {
      process: ffmpegProcess,
      transportId: transport.id,
      timestamp,
    };

    if (isPresenter) {
      this.teacherRecorders.set(roomId, context);
      this.logger.log(`🔴 [${roomId}] 강사 녹음 시작 - Producer: ${participantId}`);
    } else {
      if (!this.studentRecorders.has(roomId)) {
        this.studentRecorders.set(roomId, new Map());
      }
      this.studentRecorders.get(roomId)!.set(participantId, context);
      this.logger.log(`🎤 [${roomId}] 학생 질문 녹음 시작 - Producer: ${participantId}`);
    }
    setTimeout(async () => await consume.resume(), 1000);
  }

  /**
   * 녹음 종료 처리 공통 로직
   */
  private async terminateRecorder(roomId: string, rolePrefix: string, context: RecorderContext) {
    const { process, transportId, timestamp } = context;
    this.mediasoupService.closePlainTransport(transportId);
    if (process.stdin && !process.stdin.destroyed) {
      process.stdin.end();
    }

    process.on('close', async () => {
      this.logger.log(`FFmpeg 프로세스 종료됨 - 남은 데이터 병합 시도: ${rolePrefix}`);
      await this.fileWatcherService.flushRemaining(roomId, rolePrefix, timestamp);
    });

    setTimeout(() => {
      if (!process.killed) {
        this.logger.warn(`⚠️ FFmpeg가 스스로 종료되지 않아 강제 종료합니다.`);
        process.kill('SIGTERM');
      }
    }, 2000);
  }

  /**
   * 특정 유저 녹음만 중단
   */
  async stopParticipantRecording(roomId: string, role: string, participantId: string) {
    const roomStudents = this.studentRecorders.get(roomId);
    if (roomStudents && roomStudents.has(participantId)) {
      const context = roomStudents.get(participantId)!;
      const rolePrefix = role === 'presenter' ? role : `participant_${participantId}`;
      await this.terminateRecorder(roomId, rolePrefix, context);
      roomStudents.delete(participantId);
      this.logger.log(`⏹️ [${roomId}] 청중 ${participantId} 녹음 중단`);
    }
  }

  /**
   * 강의 종료 시 전체 녹음 중단 (강사 포함 모든 학생)
   */
  async stopAllRecording(roomId: string) {
    // 강사 중단
    const context = this.teacherRecorders.get(roomId);
    if (context) {
      this.teacherRecorders.delete(roomId);
      await this.terminateRecorder(roomId, `presenter`, context);
    }

    // 해당 방의 모든 학생 중단
    const roomStudents = this.studentRecorders.get(roomId);
    if (roomStudents) {
      for (const [participantId, context] of roomStudents) {
        await this.terminateRecorder(roomId, `participant_${participantId}`, context);
      }
      this.studentRecorders.delete(roomId);
    }

    this.logger.log(`🏁 [${roomId}] 모든 녹음 프로세스 종료`);
  }
}
