import { MediaType } from '@plum/shared-interfaces';
import { Router, Producer } from 'mediasoup/node/lib/types';

export type ProducerAppData = {
  ownerId: string;
  source: MediaType;
};

export type ConsumerAppData = {
  ownerId: string;
  receiverId: string;
};

/**
 * Room 타입 - Multi-Router 전략 결정 기준
 */
export enum RoomType {
  SMALL_MEETING = 'SMALL_MEETING', // 소회의실 (≤10명): Single Router
  LECTURE = 'LECTURE', // 대강의실 (>10명): Multi-Router
}

/**
 * Router 전략 타입
 */
export enum RouterStrategy {
  SINGLE = 'SINGLE', // Single Router 전략
  MULTI = 'MULTI', // Multi-Router 전략
}

/**
 * PipeProducer 정보 (추적용)
 */
export interface PipeProducerInfo {
  targetRouter: Router; // 파이프 대상 Router
  pipeProducer: Producer<ProducerAppData>; // PipeProducer 객체
  createdAt: Date; // 생성 시각
}

/**
 * Multi-Router Room 정보
 */
export interface MultiRouterRoomInfo {
  roomId: string;
  strategy: RouterStrategy;
  routers: Router[]; // 여러 Router 배열
  participantCount: number; // 현재 참가자 수
  pipeProducers: Map<string, PipeProducerInfo[]>; // ProducerId -> PipeProducerInfo[]
}
