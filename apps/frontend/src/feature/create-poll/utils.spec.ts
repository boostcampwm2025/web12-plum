import { describe, it, expect } from 'vitest';
import { generateOptionId, createEmptyOptions } from './utils';
import { MIN_POLL_OPTIONS } from './constants';

describe('generateOptionId', () => {
  it('고유한 ID를 생성해야 한다', () => {
    const id1 = generateOptionId();
    const id2 = generateOptionId();

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('option- 접두사로 시작해야 한다', () => {
    const id = generateOptionId();
    expect(id).toMatch(/^option-/);
  });
});

describe('createEmptyOptions', () => {
  it('지정된 개수만큼 빈 선택지를 생성해야 한다', () => {
    const count = 3;
    const options = createEmptyOptions(count);

    expect(options).toHaveLength(count);
  });

  it('각 선택지는 고유한 id와 빈 value를 가져야 한다', () => {
    const options = createEmptyOptions(MIN_POLL_OPTIONS);

    options.forEach((option) => {
      expect(option).toHaveProperty('id');
      expect(option).toHaveProperty('value');
      expect(option.id).toBeTruthy();
      expect(option.value).toBe('');
    });
  });

  it('각 선택지는 서로 다른 ID를 가져야 한다', () => {
    const options = createEmptyOptions(5);
    const ids = options.map((option) => option.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(options.length);
  });

  it('0개의 선택지도 생성할 수 있어야 한다', () => {
    const options = createEmptyOptions(0);
    expect(options).toHaveLength(0);
  });
});
