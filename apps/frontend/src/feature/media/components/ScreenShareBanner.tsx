import { Button } from '@/shared/components/Button';

import { useMediaStore } from '../stores/useMediaStore';

interface ScreenShareBannerProps {
  userName: string;
  onDisableScreenShare: () => void;
}

export function ScreenShareBanner({ userName, onDisableScreenShare }: ScreenShareBannerProps) {
  const isScreenSharing = useMediaStore((state) => state.isScreenSharing);
  if (!isScreenSharing) return null;

  return (
    <div className="mb-2 flex w-full items-center justify-between rounded-lg bg-gray-500 py-1 pr-1 pl-5">
      <span className="text-text min-w-0 truncate">{userName}의 화면</span>

      <Button
        variant="ghost"
        className="py-1"
        onClick={onDisableScreenShare}
      >
        화면 공유 중지
      </Button>
    </div>
  );
}
