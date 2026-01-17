import { Qna } from '@plum/shared-interfaces';
import { Button } from '@/shared/components/Button';
import { TimeLeft } from './TimeLeft';

interface QnaDialogProps {
  qna?: Pick<Qna, 'id' | 'title' | 'isPublic' | 'timeLimit'>;
  startedAt: number;
}

export function QnaDialog({ qna, startedAt }: QnaDialogProps) {
  return (
    <>
      {qna ? (
        <div className="flex flex-col gap-4">
          <h3 className="text-text w-full text-2xl font-bold">{qna.title}</h3>

          <textarea
            className="text-text placeholder:text-subtext-light focus:ring-primary text-md min-h-24 w-full resize-none rounded-lg bg-gray-300 p-3 outline-none"
            placeholder="답변을 입력해 주세요"
          />

          <Button className="text-sm">답변 보내기</Button>
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
