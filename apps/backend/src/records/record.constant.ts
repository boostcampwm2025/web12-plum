import { join } from 'path';

export const RECORD_DIR = join(process.cwd(), 'record');
export const SEGMENT_TIME = 60;
export const BATCH_SIZE = 20; // BATCH_SIZE * SEGMENT_TIME 마다 자동 STT 진행
