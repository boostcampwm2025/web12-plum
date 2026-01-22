import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';

interface ScheduledCardProps {
  title: string;
  onEdit: () => void;
  onStart: () => void;
  isStartDisabled?: boolean;
}

export function ScheduledCard({
  title,
  onEdit,
  onStart,
  isStartDisabled = false,
}: ScheduledCardProps) {
  return (
    <div className="rounded-xl bg-gray-400 p-4 text-white">
      <h4 className="text-base font-semibold">{title}</h4>
      <div className="mt-4 flex gap-3">
        <Button
          className="flex-1 bg-gray-200 text-sm"
          onClick={onEdit}
        >
          <Icon
            name="pencil"
            size={16}
            decorative
          />
          수정
        </Button>
        <Button
          className="flex-1 text-sm"
          onClick={onStart}
          disabled={isStartDisabled}
        >
          <Icon
            name="start"
            size={16}
            decorative
          />
          시작
        </Button>
      </div>
    </div>
  );
}
