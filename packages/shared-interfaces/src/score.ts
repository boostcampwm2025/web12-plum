export type ActivityType =
  | 'gesture' // 제스처 (+5)
  | 'chat' // 채팅 (+3)
  | 'vote' // 투표 (+5)
  | 'vote_gesture' // 제스처로 투표 (+8)
  | 'qna_answer'; // 질문 답변 (+10)

export interface RankItem {
  rank: number;
  participantId: string;
  name: string;
  score: number;
}

/**
 * Redis Hash에 저장되는 통계 정보
 */
export interface ParticipantStats {
  participationScore: number;
  gestureCount: number;
  chatCount: number;
  voteCount: number;
  answerCount: number;
}

export const RANK_LIMIT = 3;
