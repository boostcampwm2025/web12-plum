import type { RankItem } from '@plum/shared-interfaces';
import { Icon } from '@/shared/components/icon/Icon';
import { useRankStore } from '../stores/useRankStore';
import { useRoomStore } from '../stores/useRoomStore';

const RANK_COLORS = ['text-gold', 'text-silver', 'text-bronze'] as const;

interface RankCardProps {
  item: RankItem;
  isLowest?: boolean;
}

function RankCard({ item, isLowest = false }: RankCardProps) {
  const colorClass = isLowest ? 'text-error' : (RANK_COLORS[item.rank - 1] ?? 'text-text');
  const iconName = isLowest ? 'siren' : 'ranking';

  return (
    <div className="flex w-20 flex-col items-center gap-1">
      <Icon
        name={iconName}
        size={28}
        className={colorClass}
      />
      <span className="text-text max-w-full truncate text-center text-sm font-semibold">
        {item.name}
      </span>
      <span className={`rounded-full bg-gray-400 px-3 py-1 text-xs font-bold ${colorClass}`}>
        {item.score} 점
      </span>
    </div>
  );
}

function Dots() {
  return (
    <div className="flex items-center gap-1 self-center pb-6">
      {[...Array(3)].map((_, i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-gray-200"
        />
      ))}
    </div>
  );
}

export function RankingDialog() {
  const top = useRankStore((state) => state.top);
  const lowest = useRankStore((state) => state.lowest);
  const myScore = useRankStore((state) => state.myScore);
  const myInfo = useRoomStore((state) => state.myInfo);

  const isPresenter = myInfo?.role === 'presenter';
  const showLowest = isPresenter && lowest !== null;

  const hasRanking = top.length > 0;

  if (!hasRanking) {
    return <div className="text-subtext mb-2 flex justify-center">아직 랭킹 정보가 없습니다.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 상위 랭킹 + 꼴등 */}
      <div className="flex items-start justify-center gap-6">
        {top.map((item) => (
          <RankCard
            key={item.participantId}
            item={item}
          />
        ))}
        {showLowest && (
          <>
            <Dots />
            <RankCard
              item={lowest}
              isLowest
            />
          </>
        )}
      </div>

      {/* 내 점수 (청중만 표시) */}
      {!isPresenter && (
        <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-400 px-4 py-3">
          <span className="text-text truncate font-semibold">나 ({myInfo?.name})</span>
          <span className="text-text shrink-0 font-bold">{myScore}점</span>
        </div>
      )}
    </div>
  );
}
