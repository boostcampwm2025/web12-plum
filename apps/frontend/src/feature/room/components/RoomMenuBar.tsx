import { cn } from '@/shared/lib/utils';
import { RoomButton } from './RoomButton';
import type { IconName } from '@/shared/components/icon/iconMap';
import { useMediaStore } from '../stores/useMediaStore';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { logger } from '@/shared/lib/logger';
import { useMediaConnectionContext } from '../hooks/useMediaConnectionContext';
import { usePollStore } from '../stores/usePollStore';

interface MenuButton {
  icon: IconName;
  tooltip: string;
  isActive?: boolean;
  hasAlarm?: boolean;
  onClick?: () => void;
}

/**
 * 메인 메뉴 컴포넌트
 * 마이크, 카메라, 화면공유, 투표, Q&A, 랭킹 버튼
 */
function MainMenu() {
  const isMicOn = useMediaStore((state) => state.isMicOn);
  const isCameraOn = useMediaStore((state) => state.isCameraOn);
  const isScreenSharing = useMediaStore((state) => state.isScreenSharing);

  const { activeDialog, setActiveDialog } = useRoomUIStore();
  const hasActivePoll = usePollStore((state) =>
    state.polls.some((poll) => poll.status === 'active'),
  );
  const {
    startCameraProducer,
    startMicProducer,
    stopCameraProducer,
    stopMicProducer,
    startScreenShare,
    stopScreenShare,
  } = useMediaConnectionContext();

  const menuButtons: MenuButton[] = [
    {
      icon: isMicOn ? 'mic' : 'mic-disabled',
      tooltip: isMicOn ? '마이크 끄기' : '마이크 켜기',
      isActive: isMicOn,
      onClick: isMicOn ? stopMicProducer : startMicProducer,
    },
    {
      icon: isCameraOn ? 'cam' : 'cam-disabled',
      tooltip: isCameraOn ? '카메라 끄기' : '카메라 켜기',
      isActive: isCameraOn,
      onClick: isCameraOn ? stopCameraProducer : startCameraProducer,
    },
    {
      icon: 'screen-share',
      tooltip: isScreenSharing ? '화면공유 중지' : '화면공유',
      isActive: isScreenSharing,
      onClick: isScreenSharing ? stopScreenShare : startScreenShare,
    },
    {
      icon: 'vote',
      tooltip: '투표',
      isActive: activeDialog === 'vote',
      hasAlarm: hasActivePoll,
      onClick: () => setActiveDialog('vote'),
    },
    {
      icon: 'qna',
      tooltip: 'Q&A',
      isActive: activeDialog === 'qna',
      onClick: () => setActiveDialog('qna'),
    },
    {
      icon: 'ranking',
      tooltip: '랭킹',
      isActive: activeDialog === 'ranking',
      onClick: () => setActiveDialog('ranking'),
    },
  ];

  return (
    <>
      {menuButtons.map((button, index) => (
        <RoomButton
          key={`${button.icon}-${index}`}
          icon={button.icon}
          tooltip={button.tooltip}
          isActive={button.isActive}
          hasAlarm={button.hasAlarm}
          onClick={button.onClick}
        />
      ))}
    </>
  );
}

/**
 * 사이드 메뉴 컴포넌트
 * 채팅, 정보, 메뉴 버튼
 */
function SideMenu() {
  const { activeSidePanel, setActiveSidePanel } = useRoomUIStore();

  const sideMenuButtons: MenuButton[] = [
    {
      icon: 'chat',
      tooltip: '채팅',
      isActive: activeSidePanel === 'chat',
      onClick: () => setActiveSidePanel('chat'),
    },
    {
      icon: 'info',
      tooltip: '정보',
      isActive: activeSidePanel === 'info',
      onClick: () => setActiveSidePanel('info'),
    },
    {
      icon: 'menu',
      tooltip: '메뉴',
      isActive: activeSidePanel === 'menu',
      onClick: () => setActiveSidePanel('menu'),
    },
  ];

  return (
    <div className="flex items-center gap-1 justify-self-end">
      {sideMenuButtons.map((button, index) => (
        <RoomButton
          key={`${button.icon}-${index}`}
          icon={button.icon}
          variant="ghost"
          tooltip={button.tooltip}
          isActive={button.isActive}
          onClick={button.onClick}
        />
      ))}
    </div>
  );
}

function ExitButton() {
  const handleExit = () => {
    logger.ui.debug('강의실 나가기 요청');
    // TODO: 방 나가기 로직
  };

  return (
    <RoomButton
      icon="exit"
      tooltip="나가기"
      variant="ghost"
      onClick={handleExit}
      className="text-error hover:bg-error/10"
    />
  );
}

interface RoomMenuBarProps {
  className?: string;
  roomTitle?: string;
}

export function RoomMenuBar({ className, roomTitle = '강의실' }: RoomMenuBarProps) {
  return (
    <nav
      className={cn('grid h-20 w-full grid-cols-[1fr_auto_1fr] items-center px-4', className)}
      aria-label="강의실 메뉴바"
    >
      <div className="flex min-w-0 justify-start">
        <h1 className="text-text text-md truncate font-bold">{roomTitle}</h1>
      </div>

      <div className="flex items-center gap-3 justify-self-center">
        <MainMenu />
        <div className="mx-2 h-8 w-px bg-gray-400" />
        <ExitButton />
      </div>

      <SideMenu />
    </nav>
  );
}
