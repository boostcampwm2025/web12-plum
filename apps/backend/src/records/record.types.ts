export interface STTSegment {
  start: number;
  end: number;
  text: string;
}

export interface STTWorkerResponse {
  text: string;
  segments: STTSegment[];
  language: string;
  duration: number;
}

export type ChatLog = {
  id: string;
  roomId: string;
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  segmentIndex: number;
  fileUrl: string;
  segments: STTSegment[];
};
