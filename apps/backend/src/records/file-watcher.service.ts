import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { FSWatcher, watch } from 'chokidar';
import { join, parse } from 'path';
import { writeFile, unlink } from 'fs/promises';
import { spawn } from 'child_process';

import { BATCH_SIZE, RECORD_DIR, SEGMENT_TIME } from './record.constant.js';

interface STTData {
  fileName: string;
  roomId: string;
  role: string;
  index: number;
  timestamp: number;
}

@Injectable()
export class FileWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FileWatcherService.name);
  private watcher: FSWatcher;

  private fileBatches = new Map<string, string[]>();
  private isMerging = new Map<string, boolean>();
  private lastedChanged = new Map<string, number>();

  onModuleInit() {
    // 1. record 폴더 감시 시작
    this.watcher = watch(RECORD_DIR, {
      ignored: /(^|[/\\])\../, // 숨김 파일 무시
      persistent: true,
      ignoreInitial: true, // 서버 켜질 때 기존 파일들은 무시
      awaitWriteFinish: false,
    });

    // 새로운 파일이 생성될 때 이벤트 발생
    this.watcher.on('add', (filePath) => this.handleFileCreated(filePath));
    this.watcher.on('change', (filePath) => this.handleFileChanged(filePath));
  }

  async flushRemaining(roomId: string, role: string, timestamp: number) {
    const batchKey = `${roomId}_${role}_${timestamp}`;
    const remaining = this.fileBatches.get(batchKey);
    const index = this.lastedChanged.get(batchKey) ?? 0;
    if (!remaining || remaining.length === 0) return;

    this.logger.log(`🔔 종료 신호 감지: 남은 ${remaining.length}개 조각 강제 병합 시작`);

    const filesToMerge = [...remaining];
    this.fileBatches.delete(batchKey);

    try {
      await this.mergeAndRunSTT(filesToMerge, { roomId, role, timestamp, index });
    } catch (error) {
      this.logger.error(`❌ 종료 중 강제 병합 실패: ${error.message}`);
    }
  }

  private getParseFileName(filePath: string): STTData | undefined {
    const { name, base } = parse(filePath);
    const match = name.match(/^(.+?)_(.+?)_(\d+)_(\d+)$/);
    if (!match) return undefined;
    const [_, roomId, role, offsetStr, indexStr] = match;
    const timestamp = parseInt(offsetStr, 10);
    const index = parseInt(indexStr, 10);

    return {
      fileName: base,
      roomId,
      role,
      timestamp,
      index,
    };
  }

  private async handleFileCreated(filePath: string) {
    const parseResult = this.getParseFileName(filePath);
    if (!parseResult) return;

    const { roomId, role, timestamp } = parseResult;
    const batchKey = `${roomId}_${role}_${timestamp}`;

    if (!this.fileBatches.has(batchKey)) {
      this.fileBatches.set(batchKey, []);
    }

    const currentBatch = this.fileBatches.get(batchKey)!;
    currentBatch.push(filePath);

    this.logger.log(`📥 [${role}] 배치 수집 중... (${currentBatch.length}/${BATCH_SIZE})`);
  }

  private async handleFileChanged(filePath: string) {
    const parseResult = this.getParseFileName(filePath);
    if (!parseResult) return;

    const { roomId, role, timestamp, index } = parseResult;
    const batchKey = `${roomId}_${role}_${timestamp}`;

    this.lastedChanged.set(batchKey, index);
    if (this.isMerging.get(batchKey)) return;

    const currentBatch = this.fileBatches.get(batchKey);
    if (!currentBatch || currentBatch.length <= BATCH_SIZE) return;

    this.isMerging.set(batchKey, true);
    try {
      const last = currentBatch.pop();
      const filesToMerge = [...currentBatch];
      const batchLast = this.getParseFileName(filesToMerge[filesToMerge.length - 1]);

      this.fileBatches.set(batchKey, [last!]);

      this.logger.log(`🛡️ 배치 수집 완료 (${filesToMerge.length}개), 병합 프로세스 진입`);
      await this.mergeAndRunSTT(filesToMerge, batchLast!);
    } catch (error) {
      this.logger.error(`❌ 배치 처리 중 오류: ${error.message}`);
    } finally {
      this.isMerging.set(batchKey, false);
    }
  }

  private async mergeAndRunSTT(filePaths: string[], metadata: Omit<STTData, 'fileName'>) {
    const { roomId, role, timestamp, index } = metadata;
    filePaths.sort((a, b) => {
      const getIdx = (p: string) => {
        const match = parse(p).name.match(/_(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return getIdx(a) - getIdx(b);
    });

    const mergedIndex = Math.floor(index / BATCH_SIZE)
      .toString()
      .padStart(3, '0');
    const mergedFileName = `${roomId}_${role}_${timestamp}_merged${mergedIndex}.mp3`;
    const mergedPath = join(RECORD_DIR, mergedFileName);
    const listFilePath = join(RECORD_DIR, `list_${timestamp}.txt`);

    try {
      // 리스트 파일 생성
      const fileListContent = filePaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
      await writeFile(listFilePath, fileListContent);

      // FFmpeg 병합 (재인코딩 없이 Copy)
      this.logger.log(`🔄 병합 시작: ${filePaths.length}개 -> ${mergedFileName}`);
      await new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          listFilePath,
          '-c:a',
          'libmp3lame', // MP3로 인코딩
          '-b:a',
          '128k', // 비트레이트 설정 (음성 위주면 128k로 충분)
          '-ar',
          '16000', // 샘플링 레이트 유지 (기존 설정과 맞춤)
          '-ac',
          '1', // 채널 설정 (모노)
          '-y',
          mergedPath,
        ]);
        ffmpeg.on('close', (code) =>
          code === 0 ? resolve(true) : reject(new Error(`Exit code ${code}`)),
        );
      });

      // 병합 파일의 시작 시점 계산
      const firstMeta = this.getParseFileName(filePaths[0]);
      const startTime = firstMeta ? firstMeta.timestamp / 1000 + firstMeta.index * SEGMENT_TIME : 0;

      await this.runSTT({
        fileName: mergedFileName,
        roomId,
        role,
        startTime,
        index: firstMeta?.index ?? 0,
      });

      // 사용 완료한 임시 리스트 파일 및 원본 조각들 삭제
      await unlink(listFilePath);
      for (const path of filePaths) {
        await unlink(path).catch(() => {}); // 조각 파일 삭제
      }
    } catch (error) {
      this.logger.error(`❌ 병합 실패: ${error.message}`);
    }
  }

  // TODO: implement
  private async runSTT(data: Omit<STTData, 'timestamp'> & { startTime: number }) {
    const { fileName, roomId, role, index, startTime } = data;
    const filePath = join(RECORD_DIR, fileName);

    try {
      this.logger.log(`[File watcher] AI 분석 시작: ${fileName} (Timeline: ${startTime}s)`);

      // TODO: change to real text msg;
      const mockResult = { text: '실제 AI 인식 결과가 여기에 들어옵니다.', duration: 10 };

      // 텍스트와 함께 '절대 시간'을 저장하는 것이 핵심입니다.
      const chatLog = {
        roomId,
        speaker: role,
        text: mockResult.text,
        startTime,
        endTime: startTime + mockResult.duration,
        segmentIndex: index,
        fileUrl: filePath,
      };

      // 예: await this.db.transcript.create({ data: chatLog });
      this.logger.log(
        `[File watcher] 분석 완료 및 DB 저장: [${startTime}s] ${role}: ${mockResult.text}`,
      );

      return chatLog;
    } catch (error) {
      this.logger.error(`❌ STT 분석 실패 (${fileName}): ${error.message}`);
    }
  }

  onModuleDestroy() {
    this.watcher.close();
  }
}
