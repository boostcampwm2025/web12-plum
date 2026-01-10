import { describe, it, expect } from 'vitest';
import { FormValidator } from './FormValidator';

describe('FormValidator', () => {
  describe('기본 동작', () => {
    it('규칙이 없으면 항상 유효하다', () => {
      const validator = new FormValidator<string>();

      const result = validator.validate('특정 값');

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('규칙을 추가할 수 있다', () => {
      const validator = new FormValidator<string>();

      validator.addRule((value) => value.length > 0, '값이 비어있습니다');

      const result = validator.validate('test');

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('체이닝 방식으로 여러 규칙을 추가할 수 있다', () => {
      const validator = new FormValidator<string>()
        .addRule((value) => value.length > 0, '값이 비어있습니다')
        .addRule((value) => value.length <= 10, '최대 10자까지 입력 가능합니다');

      const result = validator.validate('test');

      expect(result.isValid).toBe(true);
    });
  });

  describe('유효성 검사 실패', () => {
    it('규칙을 위반하면 유효하지 않다', () => {
      const validator = new FormValidator<string>().addRule(
        (value) => value.length > 0,
        '값이 비어있습니다',
      );

      const result = validator.validate('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['값이 비어있습니다']);
    });

    it('여러 규칙을 위반하면 모든 에러 메시지를 반환한다', () => {
      const validator = new FormValidator<string>()
        .addRule((value) => value.length > 0, '값이 비어있습니다')
        .addRule((value) => value.length >= 5, '최소 5자 이상 입력해주세요')
        .addRule((value) => value.length <= 10, '최대 10자까지 입력 가능합니다');

      const result = validator.validate('ab');

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['최소 5자 이상 입력해주세요']);
    });

    it('모든 규칙을 위반하면 모든 에러 메시지를 반환한다', () => {
      const validator = new FormValidator<number>()
        .addRule((value) => value > 0, '0보다 커야 합니다')
        .addRule((value) => value < 100, '100보다 작아야 합니다')
        .addRule((value) => value % 2 === 0, '짝수여야 합니다');

      const result = validator.validate(-5);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['0보다 커야 합니다', '짝수여야 합니다']);
    });
  });

  describe('isValid 메서드', () => {
    it('유효한 값에 대해 true를 반환한다', () => {
      const validator = new FormValidator<string>().addRule(
        (value) => value.length > 0,
        '값이 비어있습니다',
      );

      expect(validator.isValid('test')).toBe(true);
    });

    it('유효하지 않은 값에 대해 false를 반환한다', () => {
      const validator = new FormValidator<string>().addRule(
        (value) => value.length > 0,
        '값이 비어있습니다',
      );

      expect(validator.isValid('')).toBe(false);
    });
  });

  describe('다양한 타입 지원', () => {
    it('문자열 유효성 검사를 수행할 수 있다', () => {
      const validator = new FormValidator<string>()
        .addRule((value) => value.trim() !== '', '공백만 입력할 수 없습니다')
        .addRule((value) => /^[a-zA-Z]+$/.test(value), '영문자만 입력 가능합니다');

      expect(validator.isValid('test')).toBe(true);
      expect(validator.isValid('test123')).toBe(false);
      expect(validator.isValid('   ')).toBe(false);
    });

    it('숫자 유효성 검사를 수행할 수 있다', () => {
      const validator = new FormValidator<number>()
        .addRule((value) => value >= 0, '0 이상이어야 합니다')
        .addRule((value) => value <= 100, '100 이하여야 합니다')
        .addRule((value) => Number.isInteger(value), '정수여야 합니다');

      expect(validator.isValid(50)).toBe(true);
      expect(validator.isValid(-1)).toBe(false);
      expect(validator.isValid(101)).toBe(false);
      expect(validator.isValid(50.5)).toBe(false);
    });

    it('배열 유효성 검사를 수행할 수 있다', () => {
      const validator = new FormValidator<string[]>()
        .addRule((value) => value.length > 0, '최소 1개 이상이어야 합니다')
        .addRule((value) => value.length <= 5, '최대 5개까지 가능합니다')
        .addRule((value) => value.every((item) => item.trim() !== ''), '빈 항목이 있습니다');

      expect(validator.isValid(['a', 'b', 'c'])).toBe(true);
      expect(validator.isValid([])).toBe(false);
      expect(validator.isValid(['a', 'b', 'c', 'd', 'e', 'f'])).toBe(false);
      expect(validator.isValid(['a', '', 'c'])).toBe(false);
    });

    it('객체 유효성 검사를 수행할 수 있다', () => {
      type User = { name: string; age: number };

      const validator = new FormValidator<User>()
        .addRule((value) => value.name.trim() !== '', '이름이 비어있습니다')
        .addRule((value) => value.age >= 0, '나이는 0 이상이어야 합니다')
        .addRule((value) => value.age <= 150, '나이는 150 이하여야 합니다');

      expect(validator.isValid({ name: 'Alice', age: 25 })).toBe(true);
      expect(validator.isValid({ name: '', age: 25 })).toBe(false);
      expect(validator.isValid({ name: 'Alice', age: -1 })).toBe(false);
      expect(validator.isValid({ name: 'Alice', age: 200 })).toBe(false);
    });

    it('복잡한 객체 배열 유효성 검사를 수행할 수 있다', () => {
      type Item = { id: string; value: string };

      const validator = new FormValidator<Item[]>()
        .addRule((items) => items.length >= 2, '최소 2개 이상이어야 합니다')
        .addRule((items) => items.length <= 5, '최대 5개까지 가능합니다')
        .addRule(
          (items) => items.every((item) => item.value.trim() !== ''),
          '모든 항목을 입력해주세요',
        )
        .addRule(
          (items) => items.every((item) => item.value.length <= 50),
          '각 항목은 50자 이하여야 합니다',
        );

      expect(
        validator.isValid([
          { id: '1', value: 'item1' },
          { id: '2', value: 'item2' },
        ]),
      ).toBe(true);

      expect(validator.isValid([{ id: '1', value: 'item1' }])).toBe(false);

      expect(
        validator.isValid([
          { id: '1', value: 'item1' },
          { id: '2', value: '' },
        ]),
      ).toBe(false);

      expect(
        validator.isValid([
          { id: '1', value: 'item1' },
          { id: '2', value: 'a'.repeat(51) },
        ]),
      ).toBe(false);
    });
  });

  describe('재사용성', () => {
    it('같은 validator를 여러 값에 대해 재사용할 수 있다', () => {
      const validator = new FormValidator<string>()
        .addRule((value) => value.length > 0, '값이 비어있습니다')
        .addRule((value) => value.length <= 10, '최대 10자까지 입력 가능합니다');

      expect(validator.isValid('test1')).toBe(true);
      expect(validator.isValid('test2')).toBe(true);
      expect(validator.isValid('')).toBe(false);
      expect(validator.isValid('12345678901')).toBe(false);
    });

    it('규칙을 추가한 후에도 이전 규칙이 유지된다', () => {
      const validator = new FormValidator<number>();

      validator.addRule((value) => value > 0, '0보다 커야 합니다');
      expect(validator.validate(-5).errors).toEqual(['0보다 커야 합니다']);

      validator.addRule((value) => value < 100, '100보다 작아야 합니다');
      expect(validator.validate(150).errors).toEqual(['100보다 작아야 합니다']);
      expect(validator.validate(-5).errors).toEqual(['0보다 커야 합니다']);
    });
  });

  describe('엣지 케이스', () => {
    it('null 값을 검증할 수 있다', () => {
      const validator = new FormValidator<string | null>().addRule(
        (value) => value !== null,
        'null일 수 없습니다',
      );

      expect(validator.isValid('test')).toBe(true);
      expect(validator.isValid(null)).toBe(false);
    });

    it('undefined 값을 검증할 수 있다', () => {
      const validator = new FormValidator<string | undefined>().addRule(
        (value) => value !== undefined,
        'undefined일 수 없습니다',
      );

      expect(validator.isValid('test')).toBe(true);
      expect(validator.isValid(undefined)).toBe(false);
    });

    it('빈 배열을 검증할 수 있다', () => {
      const validator = new FormValidator<string[]>().addRule(
        (value) => value.length > 0,
        '빈 배열일 수 없습니다',
      );

      expect(validator.isValid(['item'])).toBe(true);
      expect(validator.isValid([])).toBe(false);
    });

    it('빈 객체를 검증할 수 있다', () => {
      const validator = new FormValidator<Record<string, unknown>>().addRule(
        (value) => Object.keys(value).length > 0,
        '빈 객체일 수 없습니다',
      );

      expect(validator.isValid({ key: 'value' })).toBe(true);
      expect(validator.isValid({})).toBe(false);
    });
  });
});
