import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Modal } from '@/shared/components/Modal';
import { useRoomUIStore } from '../stores/useRoomUIStore';

export function PollResultModal() {
  const pollResult = useRoomUIStore((state) => state.pollResult);
  const setPollResult = useRoomUIStore((state) => state.setPollResult);

  const isOpen = pollResult !== null;

  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isOpen]);

  const handleClose = () => setPollResult(null);

  if (!pollResult) return null;

  const totalVotes = pollResult.options.reduce((sum, opt) => sum + opt.count, 0);
  const maxCount = Math.max(...pollResult.options.map((opt) => opt.count));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <Modal.Title>투표 결과</Modal.Title>
        <Modal.CloseButton onClose={handleClose} />
      </div>

      <div>
        <h3 className="text-text mb-4 text-lg font-bold">{pollResult.title}</h3>

        <div className="space-y-6">
          {pollResult.options.map((option) => {
            const percentage = totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0;
            const isWinner = option.count === maxCount && maxCount > 0;

            return (
              <div
                key={option.id}
                className="space-y-2"
              >
                <div className="flex justify-between text-base">
                  <span className={isWinner ? 'text-primary font-bold' : 'text-text'}>
                    {option.value}
                  </span>
                  <span className={isWinner ? 'text-primary font-bold' : 'text-text/80'}>
                    {percentage}% ({option.count}표)
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-300">
                  <div
                    className={`h-full transition-all ${isWinner ? 'bg-primary' : 'bg-gray-400'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-subtext mt-6 mb-1 text-center text-base font-bold">총 {totalVotes}표</p>
      </div>
    </Modal>
  );
}
