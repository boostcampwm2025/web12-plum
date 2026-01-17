import { Qna } from '@plum/shared-interfaces';
import { Icon } from '@/shared/components/icon/Icon';
import { Button } from '@/shared/components/Button';

interface QnaDialogProps {
  qna?: Pick<Qna, 'id' | 'title' | 'isPublic' | 'timeLimit'>;
}

export function QnaDialog({ qna }: QnaDialogProps) {
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
          <div className="text-text/60 flex w-full items-center justify-center gap-2 text-sm">
            <Icon
              name="timer"
              size={16}
            />
            {/* TODO: 남은 시간 동기화 */}
            02:25
          </div>
        </div>
      ) : (
        <div className="text-subtext mb-2 flex justify-center">현재 진행중인 Q&A가 없습니다</div>
      )}
    </>
  );
}
