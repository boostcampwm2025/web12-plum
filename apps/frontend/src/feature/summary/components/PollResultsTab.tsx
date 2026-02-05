import type { Poll, PollOption } from '@plum/shared-interfaces';

import { useSummaryStore } from '../store/useSummaryStore';

import { calculatePercentage } from '../utils';

interface PollOptionItemProps {
  index: number;
  option: PollOption;
  totalVotes: number;
}

/**
 * 단일 투표 선택지 항목 컴포넌트
 * @param index 선택지 인덱스
 * @param option 선택지 데이터
 * @param totalVotes 전체 투표 수
 */
function PollOptionItem({ index, option, totalVotes }: PollOptionItemProps) {
  const percentage = calculatePercentage(option.count, totalVotes);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3">
        <p className="text-subtext-light grow font-bold">
          {index + 1}. {option.value}
        </p>

        <p className="text-text font-bold">
          {percentage}% <span className="text-primary">({option.count}명)</span>
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

/**
 * 단일 투표 결과를 보여주는 카드 컴포넌트
 * @param poll 투표 데이터
 */
function PollResultCard({ poll }: { poll: Poll }) {
  const totalPollVotes = poll.options.reduce((acc, option) => acc + option.count, 0);

  return (
    <article className="flex flex-col gap-10 rounded-2xl bg-gray-600 p-6">
      <div className="flex gap-3">
        <h4 className="text-text grow text-xl font-bold">{poll.title}</h4>
        <span className="text-subtext-light">{totalPollVotes}명 참여</span>
      </div>

      <div className="flex flex-col gap-8">
        {poll.options.map((option, index) => (
          <PollOptionItem
            key={option.id}
            index={index}
            option={option}
            totalVotes={totalPollVotes}
          />
        ))}
      </div>
    </article>
  );
}

/**
 * 투표 결과 탭 컴포넌트
 */
export function PollResultsTab() {
  const polls = useSummaryStore((state) => state.summaryData?.polls ?? []);

  if (polls.length === 0) {
    return (
      <section className="mt-10 flex flex-col gap-10 rounded-2xl bg-gray-600 p-6">
        <p className="text-subtext-light py-4 text-center">등록된 투표가 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="mt-10 flex flex-col gap-10">
      {polls.map((poll) => (
        <PollResultCard
          key={poll.id}
          poll={poll}
        />
      ))}
    </section>
  );
}
