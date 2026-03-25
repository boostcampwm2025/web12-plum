import { useMemo, useState } from 'react';

import { Button } from '@/shared/components/Button';
import { TimeLeft } from '@/shared/components/TimeLeft';
import { logger } from '@/shared/lib/logger';
import { useToastStore } from '@/shared/stores/useToastStore';

import { QnaService } from '../services/qna';
import { useQnaStore } from '../stores/useQnaStore';

const getStartedAt = (startedAt?: string) => {
  const parsed = startedAt ? Date.parse(startedAt) : NaN;
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

export function QnaDialog() {
  const qnas = useQnaStore((state) => state.qnas);
  const activeQna = useMemo(() => qnas.find((qna) => qna.status === 'active'), [qnas]);
  const qnaStartedAt = getStartedAt(activeQna?.startedAt);
  const answeredByQnaId = useQnaStore((state) => state.answeredByQnaId);
  const qnaActions = useQnaStore((state) => state.actions);

  const addToast = useToastStore((state) => state.actions.addToast);

  const isSubmitted = activeQna ? (answeredByQnaId[activeQna.id] ?? false) : false;

  const [text, setText] = useState('');
  const isDisabled = !activeQna || isSubmitted || text.trim().length === 0;

  const handleAnswer = async (qnaId: string, text: string) => {
    try {
      await QnaService.answer({ qnaId, text });
      qnaActions.setAnswered(qnaId, true);
    } catch (error) {
      logger.custom.error('[RoomDialogs] Q&A 답변 실패', error);
      addToast({ type: 'error', title: 'Q&A 답변에 실패했습니다.' });
    }
  };

  if (!activeQna) {
    return (
      <div className="text-subtext mb-2 flex justify-center">현재 진행중인 Q&A가 없습니다</div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-text w-full text-2xl font-bold">{activeQna.title}</h3>

      {isSubmitted ? (
        <div className="text-subtext-light flex min-h-24 w-full items-center justify-center rounded-lg bg-gray-300 text-sm">
          답변 제출이 완료되었습니다.
        </div>
      ) : (
        <textarea
          className="text-text placeholder:text-subtext-light focus:ring-primary text-md min-h-24 w-full resize-none rounded-lg bg-gray-300 p-3 outline-none"
          placeholder="답변을 입력해 주세요"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      )}

      <Button
        className="text-sm"
        onClick={() => {
          if (!activeQna || isDisabled) return;
          handleAnswer(activeQna.id, text.trim());
          setText('');
        }}
        disabled={isDisabled}
      >
        답변 보내기
      </Button>
      <TimeLeft
        timeLimitSeconds={activeQna.timeLimit}
        startedAt={qnaStartedAt}
      />
    </div>
  );
}
