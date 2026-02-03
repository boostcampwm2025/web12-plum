import {
  useState,
  useRef,
  useId,
  useCallback,
  type KeyboardEvent,
  type CSSProperties,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/components/icon/Icon';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { useOutsideClick } from '@/shared/hooks/useOutsideClick';
import { useDropdownPosition } from '@/shared/hooks/useDropdownPosition';

/**
 * Select 옵션 타입
 */
export interface SelectOption<T = string> {
  label: string;
  value: T;
}

/**
 * Select 트리거 버튼 스타일 변형
 */
const selectTriggerVariants = cva(
  'text-text flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-4 py-2 text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none',
  {
    variants: {
      variant: {
        default: 'bg-gray-300 hover:bg-gray-200',
        ghost: 'bg-transparent hover:bg-gray-200/20',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

/**
 * Select 옵션 아이템 스타일 변형
 */
const selectOptionVariants = cva(
  'text-text mx-2 flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition-all duration-150',
  {
    variants: {
      isFocused: {
        true: 'bg-gray-200',
        false: '',
      },
    },
    defaultVariants: {
      isFocused: false,
    },
  },
);

interface SelectListProps<T> {
  options: SelectOption<T>[];
  selectedValue: T;
  focusedIndex: number;
  onSelect: (value: T) => void;
  onFocusChange: (index: number) => void;
  listRef: RefObject<HTMLUListElement>;
  positionStyles: CSSProperties;
  listboxId: string;
}

/**
 * Select 옵션 리스트 컴포넌트
 * @param options 옵션 목록
 * @param selectedValue 현재 선택된 값
 * @param focusedIndex 현재 포커스된 옵션 인덱스
 * @param onSelect 옵션 선택 핸들러
 * @param onFocusChange 포커스 변경 핸들러
 * @param listRef 리스트 ref
 * @param positionStyles 드롭다운 위치 스타일
 * @param listboxId listbox aria id
 * @returns Select 옵션 리스트 JSX 요소
 */
function SelectList<T>({
  options,
  selectedValue,
  focusedIndex,
  onSelect,
  onFocusChange,
  listRef,
  positionStyles,
  listboxId,
}: SelectListProps<T>) {
  return (
    <ul
      ref={listRef}
      id={listboxId}
      role="listbox"
      className="z-50 max-h-60 overflow-y-auto rounded-lg bg-gray-400 py-2 shadow-lg"
      style={positionStyles}
    >
      {options.map((option, index) => {
        const isSelected = option.value === selectedValue;
        const isFocused = index === focusedIndex;
        return (
          <li
            key={index}
            id={`${listboxId}-option-${index}`}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(option.value)}
            onMouseEnter={() => onFocusChange(index)}
            className={selectOptionVariants({ isFocused })}
          >
            <span>{option.label}</span>
            {isSelected && (
              <Icon
                name="check"
                size={20}
                decorative
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface SelectProps<T> extends VariantProps<typeof selectTriggerVariants> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * Select 컴포넌트
 * @param value 현재 선택된 값
 * @param onChange 값 변경 핸들러
 * @param options 옵션 목록
 * @param placeholder 미선택 시 표시 텍스트
 * @param className 추가 클래스 이름
 * @param disabled 비활성화 여부
 * @param variant 트리거 스타일 변형
 * @param size 트리거 사이즈
 * @param aria-label 접근성 레이블
 * @returns Select JSX 요소
 */
export function Select<T>({
  value,
  onChange,
  options,
  placeholder = '선택하세요',
  className,
  disabled = false,
  variant,
  size,
  'aria-label': ariaLabel,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const { positionStyles } = useDropdownPosition({
    triggerRef,
    listRef,
    isOpen,
  });

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  useOutsideClick([containerRef, listRef], isOpen, closeDropdown);
  useEscapeKey(isOpen, closeDropdown);

  const selectedOption = options.find((option) => option.value === value);
  const displayLabel = selectedOption?.label ?? placeholder;

  const handleToggle = () => {
    if (!disabled) {
      if (!isOpen) {
        const selectedIndex = options.findIndex((option) => option.value === value);
        setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
      }
      setIsOpen((prev) => !prev);
    }
  };

  const handleSelect = (optionValue: T) => {
    onChange(optionValue);
    closeDropdown();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          const selectedIndex = options.findIndex((option) => option.value === value);
          setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
          setIsOpen(true);
        } else {
          setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          const selectedIndex = options.findIndex((option) => option.value === value);
          setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
          setIsOpen(true);
        } else {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          handleSelect(options[focusedIndex].value);
        } else if (!isOpen) {
          const selectedIndex = options.findIndex((option) => option.value === value);
          setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
          setIsOpen(true);
        }
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          selectTriggerVariants({ variant, size }),
          disabled && 'cursor-not-allowed opacity-50',
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-activedescendant={
          isOpen && focusedIndex >= 0 ? `${listboxId}-option-${focusedIndex}` : undefined
        }
      >
        <span className="truncate font-bold">{displayLabel}</span>
        <Icon
          name="chevron"
          size={size === 'sm' ? 16 : 24}
          decorative
          className={cn('shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen &&
        createPortal(
          <SelectList
            options={options}
            selectedValue={value}
            focusedIndex={focusedIndex}
            onSelect={handleSelect}
            onFocusChange={setFocusedIndex}
            listRef={listRef}
            positionStyles={positionStyles}
            listboxId={listboxId}
          />,
          document.body,
        )}
    </div>
  );
}
