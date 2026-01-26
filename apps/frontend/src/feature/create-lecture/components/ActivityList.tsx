import { Tooltip } from '@/shared/components/Tooltip';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';

import { useActivityActionContext } from '../hooks/useActivityActionContext';
import { useActivityModalContext } from '../hooks/useActivityModalContext';

interface ActivityItemProps {
  type: 'poll' | 'qna';
  title: string;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * 활동 아이템 컴포넌트
 * @param type 활동 타입 ('poll' | 'qna')
 * @param title 활동 제목
 * @param onEdit 활동 수정 핸들러
 * @param onDelete 활동 삭제 핸들러
 */
function ActivityItem({ type, title, onEdit, onDelete }: ActivityItemProps) {
  const typeLabel = type === 'poll' ? '투표' : 'Q&A';

  return (
    <li className="flex items-center gap-4 rounded-xl bg-gray-400 px-4 py-2">
      <span className="text-text h-fit content-center rounded-full bg-gray-200 px-3 py-1 text-xs font-extrabold">
        {typeLabel}
      </span>
      <span className="text-text grow font-extrabold">{title}</span>

      <div className="flex gap-2">
        <Tooltip content="수정">
          <Button
            type="button"
            variant="icon"
            onClick={onEdit}
          >
            <Icon
              name="pencil"
              size={24}
              strokeWidth={2}
              decorative
              className="text-subtext-light"
            />
          </Button>
        </Tooltip>
        <Tooltip content="삭제">
          <Button
            type="button"
            variant="icon"
            onClick={onDelete}
          >
            <Icon
              name="trash"
              size={24}
              strokeWidth={2}
              decorative
              className="text-subtext-light"
            />
          </Button>
        </Tooltip>
      </div>
    </li>
  );
}

/**
 * 활동 리스트 컴포넌트
 * 투표 및 Q&A 활동들을 나열
 */
export function ActivityList() {
  const { polls, qnas, actions } = useActivityActionContext();
  const { openEditPollModal, openEditQnaModal } = useActivityModalContext();

  const hasNoActivities = polls.length === 0 && qnas.length === 0;

  if (hasNoActivities) {
    return (
      <div className="rounded-lg border-2 border-gray-300 py-8 text-center">
        <p className="text-text mb-1 text-base font-bold">추가된 투표 / Q&A가 없습니다.</p>
        <p className="text-subtext-light text-xs font-normal">
          아래 버튼을 눌러 새로운 활동을 추가해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-gray-300 p-4">
      <ul className="flex flex-col gap-2">
        {polls.map((item, index) => (
          <ActivityItem
            key={item.id}
            type="poll"
            title={item.title}
            onEdit={() => openEditPollModal(index)}
            onDelete={() => actions.deletePoll(index)}
          />
        ))}
        {qnas.map((item, index) => (
          <ActivityItem
            key={item.id}
            type="qna"
            title={item.title}
            onEdit={() => openEditQnaModal(index)}
            onDelete={() => actions.deleteQna(index)}
          />
        ))}
      </ul>
    </div>
  );
}
