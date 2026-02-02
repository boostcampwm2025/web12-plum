import { Icon } from '@/shared/components/icon/Icon';
import { calculatePercentage } from '../utils';

/**
 * 참여자별 상세 분석 컴포넌트에서 사용하는 참여자 통계 컴포넌트
 */
const rankColors = ['text-gold', 'text-silver', 'text-bronze', 'text-error'];

interface RankingItemProps {
  name: string;
  rank: number;
  totalScore: number;
  participationScore: number;
}

/**
 * 참여자별 통계 컴포넌트
 * @param name 참여자 이름
 * @param rank 참여자 순위
 * @param totalScore 전체 참여도 점수
 * @param participationScore 참여자 참여도 점수
 */
function RankingItem({ name, rank, totalScore, participationScore }: RankingItemProps) {
  const percentage = calculatePercentage(participationScore, totalScore);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center">
        <div className="flex grow items-center gap-2">
          {rank <= 3 ? (
            <Icon
              name="ranking"
              size={20}
              className={rankColors[rank - 1]}
            />
          ) : (
            <Icon
              name="siren"
              size={20}
              className={rankColors[rank - 1]}
            />
          )}
          <p className="text-text grow font-bold">{name}</p>
        </div>

        <p className="text-text font-bold">
          참여도: <span className="text-primary font-extrabold">{participationScore}점</span>
        </p>
      </div>

      <div className="relative h-3 w-full">
        <div
          className="bg-primary absolute z-10 h-full rounded-full"
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute h-full w-full rounded-full bg-gray-300" />
      </div>
    </div>
  );
}

interface ParticipationRankingBoardProps {
  totalScore: number;
  participants: Array<{
    name: string;
    participationScore: number;
  }>;
}

/**
 * 참여자별 상세 분석 컴포넌트
 * @param totalScore 전체 참여도 점수
 * @param participants 참여자 데이터 배열
 */
export function ParticipationRankingBoard({
  totalScore,
  participants,
}: ParticipationRankingBoardProps) {
  const topParticipants = participants.slice(0, 3);
  const showLastParticipant = participants.length > 3;
  const lastParticipant = participants[participants.length - 1];

  return (
    <article className="flex flex-col gap-5">
      <h5 className="text-text text-xl font-bold">참여자별 상세 분석</h5>
      <div className="flex flex-col gap-6">
        {topParticipants.map((participant, index) => (
          <RankingItem
            key={index}
            rank={index + 1}
            name={participant.name}
            totalScore={totalScore}
            participationScore={participant.participationScore}
          />
        ))}
        {showLastParticipant ? (
          <>
            <ul className="mx-auto flex flex-col gap-1 py-3">
              {[...Array(3)].map((_, index) => (
                <li
                  key={index}
                  className="size-2 rounded-full bg-gray-200"
                />
              ))}
            </ul>
            <RankingItem
              rank={participants.length}
              name={lastParticipant.name}
              totalScore={totalScore}
              participationScore={lastParticipant.participationScore}
            />
          </>
        ) : null}
      </div>
    </article>
  );
}
