import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/icon/Icon';
import { Input } from '@/shared/components/Input';
import { FieldArrayWithId, UseFormRegister } from 'react-hook-form';

import { MIN_POLL_OPTIONS } from '../constants';
import { PollFormValues } from '../schema';

interface PollOptionItemProps {
  index: number;
  canDelete: boolean;
  register: UseFormRegister<PollFormValues>;
  onDelete: () => void;
}

/**
 * PollOptionItem 컴포넌트
 * @param index - 선택지의 인덱스
 * @param canDelete - 선택지를 삭제할 수 있는지 여부
 * @param register - react-hook-form의 register 함수
 * @param onDelete - 선택지 삭제 핸들러
 * @returns 투표 선택지 아이템 JSX 요소
 */
export function PollOptionItem({ index, canDelete, register, onDelete }: PollOptionItemProps) {
  return (
    <li className="flex items-center gap-2">
      <Input
        size="md"
        className="grow"
        placeholder={`선택지 ${index + 1}`}
        {...register(`options.${index}.value` as const, { required: true })}
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

interface PollOptionListProps {
  fields: FieldArrayWithId<PollFormValues, 'options', 'id'>[];
  register: UseFormRegister<PollFormValues>;
  onDelete: (index: number) => void;
}

/**
 * PollOptionList 컴포넌트
 * @param fields - 선택지 필드 배열
 * @param register - react-hook-form의 register 함수
 * @param onDelete - 선택지 삭제 핸들러
 * @returns 투표 선택지 리스트 JSX 요소
 */
export function PollOptionList({ fields, register, onDelete }: PollOptionListProps) {
  const canDelete = fields.length > MIN_POLL_OPTIONS;

  return (
    <ul className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <PollOptionItem
          key={field.id}
          index={index}
          register={register}
          onDelete={() => onDelete(index)}
          canDelete={canDelete}
        />
      ))}
    </ul>
  );
}
