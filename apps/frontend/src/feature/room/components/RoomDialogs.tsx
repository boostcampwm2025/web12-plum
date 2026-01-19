import { AnimatePresence } from 'motion/react';
import { Dialog as RoomDialog } from './Dialog';
import { useRoomUIStore } from '../stores/useRoomUIStore';

export function RoomDialogs() {
  const activeDialog = useRoomUIStore((state) => state.activeDialog);
  const setActiveDialog = useRoomUIStore((state) => state.setActiveDialog);

  const handleCloseDialog = () => setActiveDialog(activeDialog!);

  return (
    <AnimatePresence>
      {activeDialog === 'vote' && (
        <RoomDialog
          title="투표"
          onClose={handleCloseDialog}
        >
          <div>투표 내용</div>
        </RoomDialog>
      )}
      {activeDialog === 'qna' && (
        <RoomDialog
          title="Q&A"
          onClose={handleCloseDialog}
        >
          <div>Q&A 내용</div>
        </RoomDialog>
      )}
      {activeDialog === 'ranking' && (
        <RoomDialog
          title="랭킹"
          onClose={handleCloseDialog}
        >
          <div>랭킹 내용</div>
        </RoomDialog>
      )}
    </AnimatePresence>
  );
}
