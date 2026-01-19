import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';

interface ScheduledCardProps {
  title: string;
}

export function ScheduledCard({ title }: ScheduledCardProps) {
  return (
    <div className="rounded-2xl bg-gray-400 px-5 py-5 text-white">
      <h4 className="text-base font-semibold">{title}</h4>
      <div className="mt-4 flex gap-3">
        <Button className="flex-1 bg-gray-200 text-sm">
          <Icon
            name="pencil"
            size={16}
            decorative
          />
          수정
        </Button>
        <Button className="flex-1 text-sm">
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
