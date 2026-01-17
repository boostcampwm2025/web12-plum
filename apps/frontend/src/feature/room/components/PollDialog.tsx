import { Poll } from '@plum/shared-interfaces';
import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { TimeLeft } from './TimeLeft';

interface PollDialogProps {
  poll?: Pick<Poll, 'id' | 'title' | 'options' | 'timeLimit'>;
  startedAt: number;
}

export function PollDialog({ poll, startedAt }: PollDialogProps) {
  const totalVotes = poll?.options.reduce((sum, option) => sum + option.count, 0) ?? 0;
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  return (
    <>
      {poll ? (
        <div className="flex flex-col gap-4">
          <h3 className="text-text text-2xl font-bold">{poll.title}</h3>
          <ul className="space-y-3">
            {poll.options.map((option, index) => {
              const percentage = totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0;
              const isSelected = selectedOptionId === option.id;
              const isDisabled = selectedOptionId !== null && !isSelected;

              return (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedOptionId === null) setSelectedOptionId(option.id);
                    }}
                    disabled={selectedOptionId !== null}
                    aria-pressed={isSelected}
                    className={cn(
                      'text-text relative flex w-full overflow-hidden rounded-lg bg-gray-400',
                      isSelected && 'ring-primary/90 ring-2',
                      isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                    )}
                  >
                    <div
                      className={cn(
                        'pointer-events-none absolute inset-0 rounded-r-lg',
                        isSelected ? 'bg-primary/90' : 'bg-gray-200/80',
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative z-5 flex w-full items-center justify-between p-4">
                      <span className="truncate">{option.value}</span>
                      <span
                        className={cn(
                          'shrink-0 font-bold',
                          isSelected ? 'text-text/80' : 'text-text/60',
                        )}
                      >
                        {option.count} ({percentage}%)
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="text-error flex w-full justify-center text-xs">
            선택 후에는 변경할 수 없습니다.
          </div>

          <TimeLeft
            timeLimitSeconds={poll.timeLimit}
            startedAt={startedAt}
          />
        </div>
      ) : (
        <div className="text-subtext mb-2 flex justify-center">현재 진행중인 투표가 없습니다</div>
      )}
    </>
  );
}
