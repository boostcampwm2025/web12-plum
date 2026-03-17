import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import type { IconName } from '@/shared/components/icon/iconMap';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { useRoomStore } from '../stores/useRoomStore';
import { ExitButton } from './ExitButton';
import { RoomButton } from './RoomButton';
import { usePollStore } from '@/feature/poll/stores/usePollStore';
import { GestureButton } from '@/feature/gesture/components/GestureButton';
import { useQnaStore } from '@/feature/qna/stores/useQnaStore';
import { useRankStore } from '@/feature/rank/stores/useRankStore';
import { useMediaStore } from '@/feature/media/stores/useMediaStore';
import { useChatStore } from '@/feature/chat/stores/useChatStore';

interface MenuButton {
  icon: IconName;
  tooltip: string;
  isActive?: boolean;
  hasAlarm?: boolean;
  onClick?: () => void;
  guideTarget?: string;
}

/**
 * 점수 변화 애니메이션 컴포넌트
 */
function ScoreDeltaAnimation() {
  const myScore = useRankStore((state) => state.myScore);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [scoreDeltaId, setScoreDeltaId] = useState(0);
  const [showScoreDelta, setShowScoreDelta] = useState(false);
  const prevScoreRef = useRef(myScore);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevScoreRef.current = myScore;
      return;
    }

    const delta = myScore - prevScoreRef.current;
    prevScoreRef.current = myScore;

    if (!Number.isFinite(delta) || delta === 0) return;
    setScoreDelta(delta);
    setScoreDeltaId((prev) => prev + 1);
    setShowScoreDelta(true);
  }, [myScore]);

  if (scoreDelta === null || scoreDelta === 0 || !showScoreDelta) return null;

  const scoreDeltaText = `${scoreDelta > 0 ? '+' : ''}${scoreDelta}`;
  const scoreDeltaClass = scoreDelta < 0 ? 'text-error' : 'text-primary';

  return (
    <motion.span
      key={scoreDeltaId}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: [0, 1, 0], y: -20 }}
      transition={{ duration: 1.5, ease: 'linear' }}
      onAnimationComplete={() => setShowScoreDelta(false)}
      className={cn(
        'pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-base font-bold',
        scoreDeltaClass,
      )}
    >
      {scoreDeltaText}
    </motion.span>
  );
}

interface MainMenuProps {
  onToggleCamera?: () => void;
  onToggleMic?: () => void;
  onToggleScreenShare?: () => void;
}

/**
 * 메인 메뉴 컴포넌트
 * 마이크, 카메라, 화면공유, 투표, Q&A, 랭킹 버튼
 */
function MainMenu({ onToggleCamera, onToggleMic, onToggleScreenShare }: MainMenuProps) {
  const isMicOn = useMediaStore((state) => state.isMicOn);
  const isCameraOn = useMediaStore((state) => state.isCameraOn);
  const isScreenSharing = useMediaStore((state) => state.isScreenSharing);

  const { activeDialog, setActiveDialog } = useRoomUIStore();
  const hasActivePoll = usePollStore((state) =>
    state.polls.some((poll) => poll.status === 'active'),
  );
  const hasActiveQna = useQnaStore((state) => state.qnas.some((qna) => qna.status === 'active'));
  const myRole = useRoomStore((state) => state.myInfo?.role);

  const menuButtons: MenuButton[] = [
    {
      icon: isMicOn ? 'mic' : 'mic-disabled',
      tooltip: isMicOn ? '마이크 끄기' : '마이크 켜기',
      isActive: isMicOn,
      onClick: onToggleMic,
      guideTarget: 'mic',
    },
    {
      icon: isCameraOn ? 'cam' : 'cam-disabled',
      tooltip: isCameraOn ? '카메라 끄기' : '카메라 켜기',
      isActive: isCameraOn,
      onClick: onToggleCamera,
      guideTarget: 'cam',
    },
    {
      icon: 'screen-share',
      tooltip: isScreenSharing ? '화면공유 중지' : '화면공유',
      isActive: isScreenSharing,
      onClick: onToggleScreenShare,
      guideTarget: 'screen-share',
    },
    {
      icon: 'vote',
      tooltip: '투표',
      isActive: activeDialog === 'vote',
      hasAlarm: hasActivePoll,
      onClick: () => setActiveDialog('vote'),
      guideTarget: 'vote',
    },
    {
      icon: 'qna',
      tooltip: 'Q&A',
      isActive: activeDialog === 'qna',
      hasAlarm: hasActiveQna,
      onClick: () => setActiveDialog('qna'),
      guideTarget: 'qna',
    },
    {
      icon: 'ranking',
      tooltip: '랭킹',
      isActive: activeDialog === 'ranking',
      onClick: () => setActiveDialog('ranking'),
      guideTarget: 'ranking',
    },
  ];
  const visibleButtons =
    myRole === 'presenter'
      ? menuButtons.filter((button) => button.icon !== 'vote' && button.icon !== 'qna')
      : myRole === 'audience'
        ? menuButtons.filter((button) => button.icon !== 'screen-share')
        : menuButtons;

  return (
    <>
      {visibleButtons.map((button, index) => (
        <div
          key={`${button.icon}-${index}`}
          className={cn(button.icon === 'ranking' && 'relative inline-block')}
          data-guide={button.guideTarget}
        >
          <RoomButton
            icon={button.icon}
            tooltip={button.tooltip}
            isActive={button.isActive}
            hasAlarm={button.hasAlarm}
            onClick={button.onClick}
          />
          {button.icon === 'ranking' && <ScoreDeltaAnimation />}
        </div>
      ))}
      <div data-guide="gesture">
        <GestureButton />
      </div>
    </>
  );
}

/**
 * 사이드 메뉴 컴포넌트
 * 채팅, 정보, 메뉴 버튼
 */
function SideMenu() {
  const { activeSidePanel, setActiveSidePanel } = useRoomUIStore();
  const myRole = useRoomStore((state) => state.myInfo?.role);

  const lastMessageId = useChatStore((state) => state.lastMessageId);
  const lastReadMessageId = useChatStore((state) => state.lastReadMessageId);
  const markRead = useChatStore((state) => state.actions.markRead);

  useEffect(() => {
    if (activeSidePanel !== 'chat' || !lastMessageId) return;
    if (lastMessageId === lastReadMessageId) return;
    markRead(lastMessageId);
  }, [activeSidePanel, lastMessageId, lastReadMessageId, markRead]);

  const hasUnreadChat =
    activeSidePanel !== 'chat' && !!lastMessageId && lastMessageId !== lastReadMessageId;

  const sideMenuButtons: MenuButton[] = [
    {
      icon: 'chat',
      tooltip: '채팅',
      isActive: activeSidePanel === 'chat',
      hasAlarm: hasUnreadChat,
      onClick: () => setActiveSidePanel('chat'),
      guideTarget: 'chat',
    },
    {
      icon: 'info',
      tooltip: '정보',
      isActive: activeSidePanel === 'info',
      onClick: () => setActiveSidePanel('info'),
      guideTarget: 'info',
    },
    {
      icon: 'menu',
      tooltip: '메뉴',
      isActive: activeSidePanel === 'menu',
      onClick: () => setActiveSidePanel('menu'),
      guideTarget: 'menu',
    },
  ];
  const visibleSideButtons =
    myRole === 'presenter'
      ? sideMenuButtons
      : sideMenuButtons.filter((button) => button.icon !== 'menu');

  return (
    <div className="flex items-center gap-1 justify-self-end">
      {visibleSideButtons.map((button, index) => (
        <div
          key={`${button.icon}-${index}`}
          data-guide={button.guideTarget}
        >
          <RoomButton
            icon={button.icon}
            variant="ghost"
            tooltip={button.tooltip}
            isActive={button.isActive}
            hasAlarm={button.hasAlarm}
            onClick={button.onClick}
          />
        </div>
      ))}
    </div>
  );
}

interface RoomMenuBarProps {
  className?: string;
  onToggleCamera?: () => void;
  onToggleMic?: () => void;
  onToggleScreenShare?: () => void;
  onDisableScreenShare?: () => void;
}

export function RoomMenuBar({
  className,
  onToggleCamera,
  onToggleMic,
  onToggleScreenShare,
}: RoomMenuBarProps) {
  const roomTitle = useRoomStore((state) => state.roomTitle) || '강의실';
  const myRole = useRoomStore((state) => state.myInfo?.role);
  const participantCount = useRoomStore((state) => state.participants.size) + 1; // 본인 포함

  return (
    <nav
      className={cn('grid h-20 w-full grid-cols-[1fr_auto_1fr] items-center px-4', className)}
      aria-label="강의실 메뉴바"
      aria-busy={!myRole}
    >
      <div className="flex min-w-0 items-center justify-start gap-2">
        <h1 className="text-text text-md truncate font-bold">{roomTitle}</h1>
        <span className="text-subtext-light flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-xs font-bold">
          {participantCount} 명
        </span>
      </div>

      <div className="flex items-center gap-3 justify-self-center">
        <>
          <MainMenu
            onToggleCamera={onToggleCamera}
            onToggleMic={onToggleMic}
            onToggleScreenShare={onToggleScreenShare}
          />
          <div className="mx-2 h-8 w-px bg-gray-400" />
          <ExitButton />
        </>
      </div>

      <SideMenu />
    </nav>
  );
}
