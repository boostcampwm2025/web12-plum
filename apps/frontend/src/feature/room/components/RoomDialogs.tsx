import { AnimatePresence, motion } from 'motion/react';
import { PollDialog } from '@/feature/poll/components/PollDialog';
import { QnaDialog } from '@/feature/qna/components/QnaDialog';
import { Icon } from '@/shared/components/icon/Icon';
import { Button } from '@/shared/components/Button';

import { useRoomUIStore } from '../stores/useRoomUIStore';
import { RankingDialog } from '@/feature/rank/components/RankingDialog';

type DialogType = 'vote' | 'qna' | 'ranking';

interface DialogConfig {
  title: string;
  component: React.FC;
}

const DIALOG_CONFIGS: Record<DialogType, DialogConfig> = {
  vote: { title: '투표', component: PollDialog },
  qna: { title: 'Q&A', component: QnaDialog },
  ranking: { title: '참여도 순위', component: RankingDialog },
} as const;

interface DialogProps {
  config: DialogConfig;
  onClose: () => void;
}

/**
 * 강의실 내에서 투표, Q&A, 참여도 순위 등의 대화상자를 관리
 */
export function Dialog({ config, onClose }: DialogProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-x-0 bottom-22 z-50 mx-auto flex w-lg flex-col gap-4 rounded-2xl bg-gray-500 py-4 pr-4 pl-6 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{config.title}</h2>
        <Button
          variant="icon"
          onClick={onClose}
          aria-label="닫기"
        >
          <Icon
            name="x"
            size={24}
          />
        </Button>
      </div>
      <config.component />
    </motion.div>
  );
}

/**
 * 강의실 내에서 투표, Q&A, 참여도 순위 등의 대화상자를 중앙에서 관리하는 컴포넌트
 */
export function RoomDialogs() {
  const activeDialog = useRoomUIStore((state) => state.activeDialog) as DialogType | null;
  const setActiveDialog = useRoomUIStore((state) => state.setActiveDialog);
  if (!activeDialog) return null;

  const config = DIALOG_CONFIGS[activeDialog];
  if (!config) return null;

  return (
    <AnimatePresence>
      <Dialog
        key={activeDialog}
        config={config}
        onClose={() => setActiveDialog(null)}
      />
    </AnimatePresence>
  );
}
