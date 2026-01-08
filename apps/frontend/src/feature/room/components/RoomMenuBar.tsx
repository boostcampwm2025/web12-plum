import { cn } from '@/shared/lib/utils';
import { RoomButton } from './RoomButton';
import type { IconName } from '@/shared/components/icon/iconMap';
import { useMediaStore } from '../stores/useMediaStore';
import { useRoomUIStore } from '../stores/useRoomUIStore';

interface MenuButton {
  icon: IconName;
  tooltip: string;
  isActive?: boolean;
  onClick?: () => void;
}

interface RoomMenuBarProps {
  className?: string;
  roomTitle?: string;
  onExit?: () => void;
}

export function RoomMenuBar({ className, roomTitle = '강의실', onExit }: RoomMenuBarProps) {
  const { isMicOn, isCameraOn, isScreenSharing, toggleMic, toggleCamera, toggleScreenShare } =
    useMediaStore();
  const { activeDialog, activeSidePanel, setActiveDialog, setActiveSidePanel } = useRoomUIStore();

  const menuButtons: MenuButton[] = [
    {
      icon: isMicOn ? 'mic' : 'mic-disabled',
      tooltip: isMicOn ? '마이크 끄기' : '마이크 켜기',
      isActive: isMicOn,
      onClick: toggleMic,
    },
    {
      icon: isCameraOn ? 'cam' : 'cam-disabled',
      tooltip: isCameraOn ? '카메라 끄기' : '카메라 켜기',
      isActive: isCameraOn,
      onClick: toggleCamera,
    },
    {
      icon: 'screen-share',
      tooltip: isScreenSharing ? '화면공유 중지' : '화면공유',
      isActive: isScreenSharing,
      onClick: toggleScreenShare,
    },
    {
      icon: 'vote',
      tooltip: '투표',
      isActive: activeDialog === 'vote',
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
    <nav
      className={cn('grid h-20 w-full grid-cols-[1fr_auto_1fr] items-center px-4', className)}
      aria-label="강의실 메뉴바"
    >
      <h1 className="text-text text-md min-w-0 justify-self-start truncate font-bold">
        {roomTitle}
      </h1>

      <div className="flex items-center gap-3 justify-self-center">
        {menuButtons.map((button, index) => (
          <RoomButton
            key={`${button.icon}-${index}`}
            icon={button.icon}
            tooltip={button.tooltip}
            isActive={button.isActive}
            onClick={button.onClick}
          />
        ))}
        <div className="mx-2 h-8 w-px bg-gray-400" />
        <RoomButton
          icon="exit"
          tooltip="나가기"
          variant="ghost"
          onClick={onExit}
          className="text-error hover:bg-error/10"
        />
      </div>

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
    </nav>
  );
}
