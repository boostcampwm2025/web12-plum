import { AnimatePresence } from 'motion/react';
import { Dialog as RoomDialog } from './Dialog';
import { Dialog as DialogType } from '../stores/useRoomUIStore';

interface RoomDialogsProps {
  activeDialog: DialogType | null;
  onClose: () => void;
}

export function RoomDialogs({ activeDialog, onClose }: RoomDialogsProps) {
  return (
    <AnimatePresence>
      {activeDialog === 'vote' && (
        <RoomDialog
          title="투표"
          onClose={onClose}
        >
          <div>투표 내용</div>
        </RoomDialog>
      )}
      {activeDialog === 'qna' && (
        <RoomDialog
          title="Q&A"
          onClose={onClose}
        >
          <div>Q&A 내용</div>
        </RoomDialog>
      )}
      {activeDialog === 'ranking' && (
        <RoomDialog
          title="랭킹"
          onClose={onClose}
        >
          <div>랭킹 내용</div>
        </RoomDialog>
      )}
    </AnimatePresence>
  );
}
