import { useState, useRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/components/icon/Icon';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { useOutsideClick } from '@/shared/hooks/useOutsideClick';

/**
 * 시간 제한 옵션 배열
 */
const TIME_LIMIT_OPTIONS = [
  { label: '제한 없음', value: 0 },
  { label: '30초', value: 30 },
  { label: '1분', value: 60 },
  { label: '3분', value: 180 },
  { label: '5분', value: 300 },
  { label: '10분', value: 600 },
] as const;

/**
 * 기본 시간 제한 값 (초 단위)
 */
const DEFAULT_TIME_LIMIT = 0;

/**
 * 드롭다운 버튼 스타일 변형
 */
const dropdownButtonVariants = cva(
  'text-text flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg bg-gray-300 px-4 py-2 text-sm transition-all duration-200 hover:bg-gray-200 focus-visible:ring-2',
  {
    variants: {
      isOpen: {
        true: 'bg-gray-300',
        false: '',
      },
    },
    defaultVariants: {
      isOpen: false,
    },
  },
);

/**
 * 드롭다운 아이템 스타일 변형
 */
const dropdownItemVariants = cva(
  'text-text w-full cursor-pointer px-4 py-2 text-left text-sm transition-all duration-150 hover:bg-gray-300 active:bg-gray-200',
  {
    variants: {
      isSelected: {
        true: 'text-primary bg-gray-300 font-bold',
        false: '',
      },
    },
    defaultVariants: {
      isSelected: false,
    },
  },
);

interface TimeLimitDropdownListProps {
  selectedTime: number;
  handleSelectTime: (time: number) => void;
}

/**
 * 시간 제한 드롭다운 리스트 컴포넌트
 * @param selectedTime 현재 선택된 시간 제한 값
 * @param handleSelectTime 시간 제한 선택 핸들러
 * @returns 시간 제한 드롭다운 리스트 JSX 요소
 */

const TimeLimitDropdownList = ({ selectedTime, handleSelectTime }: TimeLimitDropdownListProps) => {
  return (
    <ul
      role="listbox"
      className="absolute top-full right-0 left-0 z-10 mt-1 overflow-y-auto rounded-lg bg-gray-400 shadow-lg"
    >
      {TIME_LIMIT_OPTIONS.map((option) => {
        const isSelected = option.value === selectedTime;
        return (
          <li
            key={option.value}
            role="option"
            aria-selected={isSelected}
            onClick={() => handleSelectTime(option.value)}
            className={dropdownItemVariants({ isSelected })}
          >
            {option.label}
          </li>
        );
      })}
    </ul>
  );
};

interface TimeLimitDropdownProps extends VariantProps<typeof dropdownButtonVariants> {
  onChange: (time: number) => void;
  selectedTime?: number;
  className?: string;
}

/**
 * 시간 제한 드롭다운 컴포넌트
 * @param className 추가 클래스 이름
 * @param onChange 시간 제한 변경 핸들러
 * @param selectedTime 현재 선택된 시간 제한 값
 * @returns 시간 제한 드롭다운 JSX 요소
 */
export function TimeLimitDropdown({
  onChange,
  className,
  selectedTime = DEFAULT_TIME_LIMIT,
}: TimeLimitDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = TIME_LIMIT_OPTIONS.find((option) => option.value === selectedTime);
  const displayLabel = selectedOption?.label ?? '시간 선택';

  useOutsideClick(dropdownRef, isOpen, () => setIsOpen(false));
  useEscapeKey(isOpen, () => setIsOpen(false));

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (optionValue: number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={cn('relative', className)}
    >
      <button
        type="button"
        onClick={handleToggle}
        className={cn(dropdownButtonVariants({ isOpen }))}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-bold">{displayLabel}</span>
        <Icon
          name="chevron"
          size={24}
          decorative
          className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <TimeLimitDropdownList
          selectedTime={selectedTime}
          handleSelectTime={handleSelect}
        />
      )}
    </div>
  );
}
