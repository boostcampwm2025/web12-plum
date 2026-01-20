import { Button } from '@/shared/components/Button';
import { logger } from '@/shared/lib/logger';
import { useMediaStore } from '../stores/useMediaStore';
import { useMediaConnectionContext } from '../hooks/useMediaConnectionContext';

interface ScreenShareBannerProps {
  userName: string;
}

export function ScreenShareBanner({ userName }: ScreenShareBannerProps) {
  const isScreenSharing = useMediaStore((state) => state.isScreenSharing);
  const { stopScreenShare } = useMediaConnectionContext();

  const handleStopScreenShare = () => {
    logger.ui.debug('화면 공유 중지 요청');
    stopScreenShare();
  };

  if (!isScreenSharing) return null;

  return (
    <div className="flex w-full items-center justify-between rounded-lg bg-gray-400 py-1 pr-1 pl-5">
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
