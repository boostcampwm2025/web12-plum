import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { RoomButton } from './RoomButton';
import { GestureButton } from './GestureButton';
import type { IconName } from '@/shared/components/icon/iconMap';
import { useMediaStore } from '../stores/useMediaStore';
import { useRoomUIStore } from '../stores/useRoomUIStore';
import { useMediaControlContext } from '../hooks/useMediaControlContext';
import { usePollStore } from '../stores/usePollStore';
import { useQnaStore } from '../stores/useQnaStore';
import { useRoomStore } from '../stores/useRoomStore';
import { useRankStore } from '../stores/useRankStore';
import { ExitButton } from './ExitButton';

interface MenuButton {
  icon: IconName;
  tooltip: string;
  isActive?: boolean;
  hasAlarm?: boolean;
  onClick?: () => void;
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
  const hasActiveQna = useQnaStore((state) => state.qnas.some((qna) => qna.status === 'active'));
  const myRole = useRoomStore((state) => state.myInfo?.role);
  const {
    enableMic,
    disableMic,
    enableCamera,
    disableCamera,
    enableScreenShare,
    disableScreenShare,
  } = useMediaControlContext();

  const menuButtons: MenuButton[] = [
    {
      icon: isMicOn ? 'mic' : 'mic-disabled',
      tooltip: isMicOn ? '마이크 끄기' : '마이크 켜기',
      isActive: isMicOn,
      onClick: isMicOn ? disableMic : enableMic,
    },
    {
      icon: isCameraOn ? 'cam' : 'cam-disabled',
      tooltip: isCameraOn ? '카메라 끄기' : '카메라 켜기',
      isActive: isCameraOn,
      onClick: isCameraOn ? disableCamera : enableCamera,
    },
    {
      icon: 'screen-share',
      tooltip: isScreenSharing ? '화면공유 중지' : '화면공유',
      isActive: isScreenSharing,
      onClick: isScreenSharing ? disableScreenShare : enableScreenShare,
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
      hasAlarm: hasActiveQna,
      onClick: () => setActiveDialog('qna'),
    },
    {
      icon: 'ranking',
      tooltip: '랭킹',
      isActive: activeDialog === 'ranking',
      onClick: () => setActiveDialog('ranking'),
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
      <GestureButton />
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
  const visibleSideButtons =
    myRole === 'presenter'
      ? sideMenuButtons
      : sideMenuButtons.filter((button) => button.icon !== 'menu');

  return (
    <div className="flex items-center gap-1 justify-self-end">
      {visibleSideButtons.map((button, index) => (
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

interface RoomMenuBarProps {
  className?: string;
  roomTitle?: string;
}

export function RoomMenuBar({ className, roomTitle = '강의실' }: RoomMenuBarProps) {
  const myRole = useRoomStore((state) => state.myInfo?.role);
  const participantCount = useRoomStore((state) => state.participants.size);

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
          <MainMenu />
          <div className="mx-2 h-8 w-px bg-gray-400" />
          <ExitButton />
        </>
      </div>

      <SideMenu />
    </nav>
  );
}
