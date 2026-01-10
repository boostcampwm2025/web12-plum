import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { usePollOptions } from './usePollOptions';
import { MIN_POLL_OPTIONS, MAX_POLL_OPTIONS } from '../constants';

describe('usePollOptions', () => {
  it('초기 상태는 최소 개수의 빈 선택지를 가져야 한다', () => {
    const { result } = renderHook(() => usePollOptions());

    expect(result.current.options).toHaveLength(MIN_POLL_OPTIONS);
    result.current.options.forEach((option) => {
      expect(option.id).toBeTruthy();
      expect(option.value).toBe('');
    });
  });

  describe('addOption', () => {
    it('선택지를 추가할 수 있어야 한다', () => {
      const { result } = renderHook(() => usePollOptions());
      const initialLength = result.current.options.length;

      act(() => {
        result.current.addOption();
      });

      expect(result.current.options).toHaveLength(initialLength + 1);
    });

    it('최대 개수에 도달하면 더 이상 추가할 수 없어야 한다', () => {
      const { result } = renderHook(() => usePollOptions());

      // 최대 개수까지 추가
      act(() => {
        const toAdd = MAX_POLL_OPTIONS - result.current.options.length;
        for (let i = 0; i < toAdd; i++) {
          result.current.addOption();
        }
      });

      expect(result.current.options).toHaveLength(MAX_POLL_OPTIONS);
      expect(result.current.canAddMore).toBe(false);

      // 추가 시도
      act(() => {
        result.current.addOption();
      });

      expect(result.current.options).toHaveLength(MAX_POLL_OPTIONS);
    });

    it('canAddMore가 올바르게 계산되어야 한다', () => {
      const { result } = renderHook(() => usePollOptions());

      expect(result.current.canAddMore).toBe(true);

      // 최대 개수까지 추가
      act(() => {
        const toAdd = MAX_POLL_OPTIONS - result.current.options.length;
        for (let i = 0; i < toAdd; i++) {
          result.current.addOption();
        }
      });

      expect(result.current.canAddMore).toBe(false);
    });
  });

  describe('deleteOption', () => {
    it('선택지를 삭제할 수 있어야 한다', () => {
      const { result } = renderHook(() => usePollOptions());

      // 선택지 추가
      act(() => {
        result.current.addOption();
      });

      const initialLength = result.current.options.length;
      const firstOptionId = result.current.options[0].id;

      act(() => {
        result.current.deleteOption(firstOptionId);
      });

      expect(result.current.options).toHaveLength(initialLength - 1);
      expect(result.current.options.find((opt) => opt.id === firstOptionId)).toBeUndefined();
    });

    it('최소 개수 미만으로는 삭제할 수 없어야 한다', () => {
      const { result } = renderHook(() => usePollOptions());

      expect(result.current.options).toHaveLength(MIN_POLL_OPTIONS);
      expect(result.current.canDelete).toBe(false);

      const firstOptionId = result.current.options[0].id;

      act(() => {
        result.current.deleteOption(firstOptionId);
      });

      expect(result.current.options).toHaveLength(MIN_POLL_OPTIONS);
    });

    it('canDelete가 올바르게 계산되어야 한다', () => {
      const { result } = renderHook(() => usePollOptions());

      expect(result.current.canDelete).toBe(false);

      // 선택지 추가
      act(() => {
        result.current.addOption();
      });

      expect(result.current.canDelete).toBe(true);
    });
  });

  describe('updateOption', () => {
    it('선택지의 값을 업데이트할 수 있어야 한다', () => {
      const { result } = renderHook(() => usePollOptions());
      const targetId = result.current.options[0].id;
      const newValue = '새로운 값';

      act(() => {
        result.current.updateOption(targetId, newValue);
      });

      const updatedOption = result.current.options.find((opt) => opt.id === targetId);
      expect(updatedOption?.value).toBe(newValue);
    });

    it('다른 선택지는 영향을 받지 않아야 한다', () => {
      const { result } = renderHook(() => usePollOptions());
      const targetId = result.current.options[0].id;
      const otherOption = result.current.options[1];
      const newValue = '업데이트된 값';

      act(() => {
        result.current.updateOption(targetId, newValue);
      });

      const unchangedOption = result.current.options.find((opt) => opt.id === otherOption.id);
      expect(unchangedOption).toEqual(otherOption);
    });
  });

  describe('resetOptions', () => {
    it('선택지를 초기 상태로 리셋할 수 있어야 한다', () => {
      const { result } = renderHook(() => usePollOptions());

      // 선택지 추가 및 수정
      act(() => {
        result.current.addOption();
        result.current.updateOption(result.current.options[0].id, '테스트 값');
      });

      expect(result.current.options.length).toBeGreaterThan(MIN_POLL_OPTIONS);

      // 리셋
      act(() => {
        result.current.resetOptions();
      });

      expect(result.current.options).toHaveLength(MIN_POLL_OPTIONS);
      result.current.options.forEach((option) => {
        expect(option.value).toBe('');
      });
    });
  });
});
