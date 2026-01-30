import { Icon } from '@/shared/components/icon/Icon';

import { ParticipationRankingBoard } from './ParticipationRankingBoard';

interface OverallStatisticsProps {
  averageParticipationScore: number;
  totalInteractions: number;
}

/**
 * 전체 통계 컴포넌트
 * @param averageParticipationScore 평균 참여도 점수
 * @param totalInteractions 총 인터렉션 수
 * @returns
 */
function OverallStatistics({
  averageParticipationScore,
  totalInteractions,
}: OverallStatisticsProps) {
  return (
    <article className="grid grid-cols-2 gap-6">
      <div className="border-primary flex items-center gap-4 rounded-xl border-4 px-8 py-6">
        <div className="text-text flex grow flex-col gap-3">
          <h5 className="font-bold">평균 참여도 점수</h5>
          <p className="text-[40px] font-extrabold">{averageParticipationScore} 점</p>
        </div>
        <Icon
          name="trend"
          size={48}
          className="text-text"
        />
      </div>

      <div className="border-primary flex items-center gap-4 rounded-xl border-4 px-8 py-6">
        <div className="text-text flex grow flex-col gap-3">
          <h5 className="font-bold">총 반응 수</h5>
          <p className="text-[40px] font-extrabold">{totalInteractions} 회</p>
        </div>
        <Icon
          name="interaction"
          size={48}
          className="text-text"
        />
      </div>
    </article>
  );
}

interface InteractionAnalysisProps {
  interactions: typeof mockInteractions;
}

/**
 * 인터렉션 유형별 분석 컴포넌트
 * @param interactions 인터렉션 데이터 배열
 */
function InteractionAnalysis({ interactions }: InteractionAnalysisProps) {
  return (
    <article className="flex flex-col gap-5">
      <h5 className="text-text text-xl font-bold">인터렉션 유형별 분석</h5>
      <ul className="grid grid-cols-4 gap-6">
        {interactions.map(({ type, count }, index) => (
          <li
            key={index}
            className="text-text flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-300 p-8"
          >
            <p className="text-[40px] font-extrabold">{count}</p>
            <p className="font-bold">{type}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}

const mockTotalParticipationScore = 255;
const mockParticipants = [
  { name: '로키', reactions: 30, participationScore: 90 },
  { name: '맥스', reactions: 20, participationScore: 75 },
  { name: '도기', reactions: 25, participationScore: 60 },
  { name: '다니', reactions: 5, participationScore: 32 },
];
const mockInteractions = [
  { type: '투표 참여', count: 40 },
  { type: 'QnA 참여', count: 30 },
  { type: '제스처 반응', count: 20 },
  { type: '채팅 메시지', count: 10 },
];

/**
 * 참여도 통계 탭 컴포넌트
 */
export function StatisticsTab() {
  return (
    <section className="mt-10 flex flex-col gap-15 rounded-2xl bg-gray-600 p-8">
      <OverallStatistics
        averageParticipationScore={85}
        totalInteractions={120}
      />
      <ParticipationRankingBoard
        totalScore={mockTotalParticipationScore}
        participants={mockParticipants}
      />
      <InteractionAnalysis interactions={mockInteractions} />
    </section>
  );
}
