import { PollOption, Voter } from '@plum/shared-interfaces';
import { calculatePercentage } from '../utils';

const mockPollData: Poll[] = [
  {
    id: 'poll1',
    title: '오늘 강의 내용이 유익했나요?',
    options: [
      {
        id: 1,
        value: '네, 매우 유익했어요!',
        count: 8,
        voters: [
          { id: 'u1', name: 'Alice' },
          { id: 'u2', name: 'Bob' },
        ],
      },
      {
        id: 2,
        value: '보통이에요.',
        count: 3,
        voters: [{ id: 'u3', name: 'Charlie' }],
      },
      {
        id: 3,
        value: '아니요, 별로였어요.',
        count: 1,
        voters: [{ id: 'u4', name: 'David' }],
      },
    ],
  },
  {
    id: 'poll2',
    title: '다음 강의 주제로 어떤 것이 좋을까요?',
    options: [
      {
        id: 1,
        value: '프론트엔드 개발',
        count: 5,
        voters: [
          { id: 'u5', name: 'Eve' },
          { id: 'u6', name: 'Frank' },
        ],
      },
      {
        id: 2,
        value: '백엔드 개발',
        count: 4,
        voters: [{ id: 'u7', name: 'Grace' }],
      },
      {
        id: 3,
        value: '데브옵스',
        count: 2,
        voters: [{ id: 'u8', name: 'Heidi' }],
      },
    ],
  },
];

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

interface Poll {
  id: string;
  title: string;
  options: {
    id: number;
    value: string;
    count: number;
    voters: Voter[];
  }[];
}

interface PollResultCardProps {
  poll: Poll;
}

/**
 * 단일 투표 결과를 보여주는 카드 컴포넌트
 * @param poll 투표 데이터
 */
function PollResultCard({ poll }: PollResultCardProps) {
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
  return (
    <section className="mt-10 flex flex-col gap-10">
      {mockPollData.map((poll) => (
        <PollResultCard
          key={poll.id}
          poll={poll}
        />
      ))}
    </section>
  );
}
