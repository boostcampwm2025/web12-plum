import { useState } from 'react';
import { Qna } from '@plum/shared-interfaces';
import { Button } from '@/shared/components/Button';
import { TimeLeft } from './TimeLeft';

interface QnaDialogProps {
  qna?: Pick<Qna, 'id' | 'title' | 'isPublic' | 'timeLimit'>;
  startedAt: number;
  onSubmit?: (qnaId: string, text: string) => void;
  isSubmitted?: boolean;
}

export function QnaDialog({ qna, startedAt, onSubmit, isSubmitted = false }: QnaDialogProps) {
  const [text, setText] = useState('');
  const isDisabled = !qna || isSubmitted || text.trim().length === 0;

  return (
    <>
      {qna ? (
        <div className="flex flex-col gap-4">
          <h3 className="text-text w-full text-2xl font-bold">{qna.title}</h3>

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
              if (!qna || isDisabled) return;
              onSubmit?.(qna.id, text.trim());
              setText('');
            }}
            disabled={isDisabled}
          >
            답변 보내기
          </Button>
          <TimeLeft
            timeLimitSeconds={qna.timeLimit}
            startedAt={startedAt}
          />
        </div>
      ) : (
        <div className="text-subtext mb-2 flex justify-center">현재 진행중인 Q&A가 없습니다</div>
      )}
    </>
  );
}
