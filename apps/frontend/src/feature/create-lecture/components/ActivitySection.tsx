import { FormField } from '@/shared/components/FormField';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';

import { useActivityModalStore } from '../store/useActivityModalStore';
import { useActivityDataStore } from '../store/useActivityDataStore';

interface ActivityItemProps {
  type: 'poll' | 'qna';
  title: string;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * 활동 아이템 컴포넌트
 *
 * 목록에 표시되는 개별 투표 또는 Q&A 항목
 * 활동 유형에 따른 배지와 제목을 노출하며, 수정 및 삭제 액션을 제공
 *
 * 1. 부모(`ActivityList`)로부터 활동 타입과 제목, 액션 핸들러를 전달받음.
 * 2. 타입(`poll` | `qna`)에 따라 적절한 레이블('투표' | 'Q&A')을 화면에 출력.
 * 3. 수정/삭제 버튼 클릭 시 상위에서 주입된 모달 오픈 또는 필드 삭제 함수를 실행.
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
        <Button
          type="button"
          tooltip="수정"
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
        <Button
          type="button"
          tooltip="삭제"
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
      </div>
    </li>
  );
}

/**
 * 활동 리스트 컴포넌트
 *
 * 현재 폼 상태에 저장된 모든 투표 및 Q&A 활동들을 리스트 형태로 나열
 * 활동이 없을 경우 사용자에게 안내 문구를 표시
 *
 * 1. `useActivityDataStore`를 통해 전역 스토어에 저장된 `polls`, `qnas` 데이터 배열을 가져옴.
 * 2. 활동 데이터가 하나도 없을 경우 빈 상태 UI를 조건부 렌더링.
 * 3. 데이터가 존재할 경우 각 배열을 순회하며 `ActivityItem`을 렌더링하고, ID 기반의 수정/삭제 로직을 연결.
 */
function ActivityList() {
  const polls = useActivityDataStore((state) => state.polls);
  const qnas = useActivityDataStore((state) => state.qnas);

  const { open: openModal } = useActivityModalStore((state) => state.actions);
  const { removePoll, removeQna } = useActivityDataStore((state) => state.actions);

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
        {polls.map((poll) => (
          <ActivityItem
            key={poll.id}
            type="poll"
            title={poll.title}
            onEdit={() => openModal({ type: 'edit-poll', id: poll.id })}
            onDelete={() => removePoll(poll.id)}
          />
        ))}
        {qnas.map((qna) => (
          <ActivityItem
            key={qna.id}
            type="qna"
            title={qna.title}
            onEdit={() => openModal({ type: 'edit-qna', id: qna.id })}
            onDelete={() => removeQna(qna.id)}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * 강의 활동 섹션 컴포넌트
 *
 * 강의 생성 과정에서 투표 및 Q&A 활동을 구성하는 상위 레이아웃 섹션
 *
 * 1. `ActivityList`를 호출하여 현재까지 구성된 활동 목록을 렌더링.
 * 2. '투표 추가' 또는 'Q&A 추가' 버튼 클릭 시 스토어의 `open` 액션을 호출하여 해당 모달을 띄움.
 * 3. 모달을 통해 입력된 데이터는 다시 `ActivityList`가 참조하는 폼 상태에 반영되어 목록에 나타남.
 */
export function ActivitySection() {
  const { open: openModal } = useActivityModalStore((state) => state.actions);

  return (
    <FormField className="gap-3">
      <FormField.Legend className="mb-3 text-xl font-bold">강의 활동 구성</FormField.Legend>
      <ActivityList />

      <div className="ml-auto flex gap-3">
        <Button
          type="button"
          className="text-text"
          onClick={() => openModal({ type: 'create-poll' })}
        >
          <Icon
            name="plus"
            size={20}
            decorative
          />
          <span>투표 추가</span>
        </Button>

        <Button
          type="button"
          onClick={() => openModal({ type: 'create-qna' })}
        >
          <Icon
            name="plus"
            size={20}
            decorative
          />
          <span>Q&A 추가</span>
        </Button>
      </div>
    </FormField>
  );
}
