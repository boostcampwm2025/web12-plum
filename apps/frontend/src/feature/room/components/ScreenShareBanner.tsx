import { Button } from '@/shared/components/Button';

interface ScreenShareBannerProps {
  userName: string;
  onStop: () => void;
}

export function ScreenShareBanner({ userName, onStop }: ScreenShareBannerProps) {
  return (
    <div className="flex w-full items-center justify-between rounded-lg bg-gray-400 py-1 pr-1 pl-5">
      <span className="text-text min-w-0 truncate">{userName}의 화면</span>

      <Button
        variant="ghost"
        className="py-1"
        onClick={onStop}
      >
        화면 공유 중지
      </Button>
    </div>
  );
}
