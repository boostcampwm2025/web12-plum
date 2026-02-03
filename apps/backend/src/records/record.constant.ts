import { join } from 'path';

export const RECORD_DIR = join(process.cwd(), 'record');
export const SEGMENT_TIME = 30;
export const BATCH_SIZE = 10; // BATCH_SIZE * SEGMENT_TIME 마다 자동 STT 진행
