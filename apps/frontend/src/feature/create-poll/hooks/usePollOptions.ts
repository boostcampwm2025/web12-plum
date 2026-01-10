import { useState, useCallback } from 'react';
import type { PollOption } from '../types';
import { MIN_POLL_OPTIONS, MAX_POLL_OPTIONS } from '../constants';
import { createEmptyOptions, generateOptionId } from '../utils';

interface UsePollOptionsReturn {
  options: PollOption[];
  addOption: () => void;
  deleteOption: (id: string) => void;
  updateOption: (id: string, value: string) => void;
  resetOptions: () => void;
  canAddMore: boolean;
  canDelete: boolean;
}

/**
 * 투표 선택지 상태 관리 커스텀 훅
 * @returns 선택지 관리 함수들과 상태
 */
export function usePollOptions(): UsePollOptionsReturn {
  const [options, setOptions] = useState<PollOption[]>(() => createEmptyOptions(MIN_POLL_OPTIONS));

  // 선택지 추가
  const addOption = useCallback(() => {
    if (options.length >= MAX_POLL_OPTIONS) return;

    const newOption: PollOption = {
      id: generateOptionId(),
      value: '',
    };

    setOptions((prev) => [...prev, newOption]);
  }, [options.length]);

  // 선택지 삭제
  const deleteOption = useCallback((id: string) => {
    setOptions((prev) => {
      if (prev.length <= MIN_POLL_OPTIONS) return prev;
      return prev.filter((option) => option.id !== id);
    });
  }, []);

  // 선택지 내용 업데이트
  const updateOption = useCallback((id: string, value: string) => {
    setOptions((prev) => prev.map((option) => (option.id === id ? { ...option, value } : option)));
  }, []);

  // 선택지 초기화
  const resetOptions = useCallback(() => {
    setOptions(createEmptyOptions(MIN_POLL_OPTIONS));
  }, []);

  return {
    options,
    addOption,
    deleteOption,
    updateOption,
    resetOptions,
    canAddMore: options.length < MAX_POLL_OPTIONS,
    canDelete: options.length > MIN_POLL_OPTIONS,
  };
}
