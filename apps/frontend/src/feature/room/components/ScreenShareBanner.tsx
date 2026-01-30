import { Button } from '@/shared/components/Button';
import { logger } from '@/shared/lib/logger';
import { useMediaStore } from '../stores/useMediaStore';
import { useMediaControlContext } from '../hooks/useMediaControlContext';

interface ScreenShareBannerProps {
  userName: string;
}

export function ScreenShareBanner({ userName }: ScreenShareBannerProps) {
  const isScreenSharing = useMediaStore((state) => state.isScreenSharing);
  const { disableScreenShare } = useMediaControlContext();

  const handleStopScreenShare = () => {
    logger.ui.debug('화면 공유 중지 요청');
    disableScreenShare();
  };

  if (!isScreenSharing) return null;

  return (
    <div className="mb-2 flex w-full items-center justify-between rounded-lg bg-gray-500 py-1 pr-1 pl-5">
      <span className="text-text min-w-0 truncate">{userName}의 화면</span>

      <Button
        variant="ghost"
        className="py-1"
        onClick={handleStopScreenShare}
      >
        화면 공유 중지
      </Button>
    </div>
  );
}
