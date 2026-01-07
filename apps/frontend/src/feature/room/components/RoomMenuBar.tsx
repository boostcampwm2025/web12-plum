import { cn } from '@/shared/lib/utils';
import RoomButton from './RoomButton';
import type { IconName } from '@/shared/components/icon/iconMap';

interface MenuButton {
  icon: IconName;
  tooltip: string;
  isActive?: boolean;
  onClick?: () => void;
}

type Overlay = 'vote' | 'qna' | 'ranking';
type SidePanel = 'chat' | 'info' | 'menu';

interface RoomMenuBarProps {
  className?: string;
  roomTitle?: string;
  isMicOn?: boolean;
  isCameraOn?: boolean;
  isScreenSharing?: boolean;
  activeOverlay?: Overlay | null;
  activeSidePanel?: SidePanel | null;
  onMicToggle?: () => void;
  onCameraToggle?: () => void;
  onScreenShareToggle?: () => void;
  onOverlayChange?: (overlay: Overlay | null) => void;
  onSidePanelChange?: (panel: SidePanel | null) => void;
  onExit?: () => void;
}

export default function RoomMenuBar({
  className,
  roomTitle = '강의실',
  isMicOn = false,
  isCameraOn = false,
  isScreenSharing = false,
  activeOverlay = null,
  activeSidePanel = null,
  onMicToggle,
  onCameraToggle,
  onScreenShareToggle,
  onOverlayChange,
  onSidePanelChange,
  onExit,
}: RoomMenuBarProps) {
  const handleOverlayClick = (overlay: Overlay) => () => {
    if (!onOverlayChange) return;
    onOverlayChange(activeOverlay === overlay ? null : overlay);
  };

  const handleSidePanelClick = (panel: SidePanel) => () => {
    if (!onSidePanelChange) return;
    onSidePanelChange(activeSidePanel === panel ? null : panel);
  };

  const menuButtons: MenuButton[] = [
    {
      icon: isMicOn ? 'mic' : 'mic-disabled',
      tooltip: isMicOn ? '마이크 끄기' : '마이크 켜기',
      isActive: isMicOn,
      onClick: onMicToggle,
    },
    {
      icon: isCameraOn ? 'cam' : 'cam-disabled',
      tooltip: isCameraOn ? '카메라 끄기' : '카메라 켜기',
      isActive: isCameraOn,
      onClick: onCameraToggle,
    },
    {
      icon: 'screen-share',
      tooltip: isScreenSharing ? '화면공유 중지' : '화면공유',
      isActive: isScreenSharing,
      onClick: onScreenShareToggle,
    },
    {
      icon: 'vote',
      tooltip: '투표',
      isActive: activeOverlay === 'vote',
      onClick: handleOverlayClick('vote'),
    },
    {
      icon: 'qna',
      tooltip: 'Q&A',
      isActive: activeOverlay === 'qna',
      onClick: handleOverlayClick('qna'),
    },
    {
      icon: 'ranking',
      tooltip: '랭킹',
      isActive: activeOverlay === 'ranking',
      onClick: handleOverlayClick('ranking'),
    },
  ];

  const sideMenuButtons: MenuButton[] = [
    {
      icon: 'chat',
      tooltip: '채팅',
      isActive: activeSidePanel === 'chat',
      onClick: handleSidePanelClick('chat'),
    },
    {
      icon: 'info',
      tooltip: '정보',
      isActive: activeSidePanel === 'info',
      onClick: handleSidePanelClick('info'),
    },
    {
      icon: 'menu',
      tooltip: '메뉴',
      isActive: activeSidePanel === 'menu',
      onClick: handleSidePanelClick('menu'),
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
