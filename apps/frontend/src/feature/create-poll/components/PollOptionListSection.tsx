import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { Input } from '@/shared/components/Input';
import type { PollOption } from '../types';

interface PollOptionItemProps {
  option: PollOption;
  index: number;
  canDelete: boolean;
  onUpdate: (value: string) => void;
  onDelete: () => void;
}

/**
 * 투표 선택지 아이템 컴포넌트
 * @param option 선택지 데이터
 * @param index 선택지 순서 (placeholder용)
 * @param canDelete 삭제 가능 여부
 * @param onUpdate 선택지 값 변경 핸들러
 * @param onDelete 선택지 삭제 핸들러
 */
function PollOptionItem({ option, index, canDelete, onUpdate, onDelete }: PollOptionItemProps) {
  return (
    <li className="flex items-center gap-2">
      <Input
        size="md"
        className="grow"
        placeholder={`선택지 ${index + 1}`}
        value={option.value}
        onChange={(e) => onUpdate(e.target.value)}
      />
      <Button
        variant="icon"
        className="cursor-pointer"
        onClick={onDelete}
        disabled={!canDelete}
        aria-label={`선택지 ${index + 1} 삭제`}
      >
        <Icon
          name="minus"
          size={24}
          strokeWidth={2}
          className="text-subtext"
          decorative
        />
      </Button>
    </li>
  );
}

interface PollOptionListSectionProps {
  options: PollOption[];
  onAddOption: () => void;
  onDeleteOption: (id: string) => void;
  onUpdateOption: (id: string, value: string) => void;
  canAddMore: boolean;
  canDelete: boolean;
}

/**
 * 투표 선택지 목록 섹션 컴포넌트
 * @param options 선택지 배열
 * @param onAddOption 선택지 추가 핸들러
 * @param onDeleteOption 선택지 삭제 핸들러
 * @param onUpdateOption 선택지 업데이트 핸들러
 * @param canAddMore 추가 가능 여부
 * @param canDelete 삭제 가능 여부
 */
export function PollOptionListSection({
  options,
  onAddOption,
  onDeleteOption,
  onUpdateOption,
  canAddMore,
  canDelete,
}: PollOptionListSectionProps) {
  return (
    <section>
      <h4 className="text-text text-sm font-extrabold">투표 선택지</h4>
      <ul className="mt-2 flex flex-col gap-3">
        {options.map((option, index) => (
          <PollOptionItem
            key={option.id}
            option={option}
            index={index}
            onUpdate={(value) => onUpdateOption(option.id, value)}
            onDelete={() => onDeleteOption(option.id)}
            canDelete={canDelete}
          />
        ))}
      </ul>
      <Button
        variant="ghost"
        className="text-primary mx-auto mt-3 flex items-center gap-2"
        onClick={onAddOption}
        disabled={!canAddMore}
      >
        <Icon
          name="plus"
          size={14}
          decorative
        />
        <span>선택지 추가</span>
      </Button>
    </section>
  );
}
