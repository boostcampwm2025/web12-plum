import { describe, it, expect } from 'vitest';
import { CreatePollFormValidator } from './formValidator';
import { PollOption } from '../types';

describe('CreatePollFormValidator', () => {
  const createValidData = (): { title: string; options: PollOption[]; timeLimit: number } => ({
    title: '테스트 투표',
    options: [
      { id: '1', value: '선택지 1' },
      { id: '2', value: '선택지 2' },
    ],
    timeLimit: 60,
  });

  describe('전체 폼 유효성 검사', () => {
    it('모든 필드가 유효하면 isValid가 true를 반환한다', () => {
      const validator = new CreatePollFormValidator()
        .withTitleRules()
        .withOptionsRules()
        .withTimeLimitRules()
        .build();

      const data = createValidData();
      const result = validator.validate(data);

      expect(result.isValid).toBe(true);
      expect(result.errors.title).toEqual([]);
      expect(result.errors.options).toEqual([]);
      expect(result.errors.timeLimit).toEqual([]);
    });

    it('여러 필드가 유효하지 않으면 각 필드의 에러를 반환한다', () => {
      const validator = new CreatePollFormValidator()
        .withTitleRules()
        .withOptionsRules()
        .withTimeLimitRules()
        .build();

      const data = {
        title: '',
        options: [{ id: '1', value: '선택지 1' }],
        timeLimit: 1000,
      };

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.title.length).toBeGreaterThan(0);
      expect(result.errors.options.length).toBeGreaterThan(0);
      expect(result.errors.timeLimit.length).toBeGreaterThan(0);
    });

    it('isValid 메서드는 유효성 여부만 반환한다', () => {
      const validator = new CreatePollFormValidator()
        .withTitleRules()
        .withOptionsRules()
        .withTimeLimitRules()
        .build();

      expect(validator.isValid(createValidData())).toBe(true);

      const invalidData = { ...createValidData(), title: '' };
      expect(validator.isValid(invalidData)).toBe(false);
    });
  });

  describe('투표 제목 검증', () => {
    it('제목이 비어있으면 에러를 반환한다', () => {
      const validator = new CreatePollFormValidator().withTitleRules().build();

      const data = createValidData();
      data.title = '';

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.title).toContain('투표 제목을 입력해주세요');
    });

    it('제목이 공백만 있으면 에러를 반환한다', () => {
      const validator = new CreatePollFormValidator().withTitleRules().build();

      const data = createValidData();
      data.title = '   ';

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.title).toContain('투표 제목을 입력해주세요');
    });

    it('제목이 최대 길이를 초과하면 에러를 반환한다', () => {
      const validator = new CreatePollFormValidator().withTitleRules().build();

      const data = createValidData();
      data.title = 'a'.repeat(51);

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.title).toContain('투표 제목은 50자 이하여야 합니다');
    });

    it('제목이 최대 길이 이하면 유효하다', () => {
      const validator = new CreatePollFormValidator().withTitleRules().build();

      const data = createValidData();
      data.title = 'a'.repeat(50);

      const result = validator.validate(data);

      expect(result.errors.title).toEqual([]);
    });

    it('제목 앞뒤 공백은 trim되어 검증된다', () => {
      const validator = new CreatePollFormValidator().withTitleRules().build();

      const data = createValidData();
      data.title = '  유효한 제목  ';

      const result = validator.validate(data);

      expect(result.errors.title).toEqual([]);
    });
  });

  describe('투표 선택지 검증', () => {
    it('선택지가 최소 개수 미만이면 에러를 반환한다', () => {
      const validator = new CreatePollFormValidator().withOptionsRules().build();

      const data = createValidData();
      data.options = [{ id: '1', value: '선택지 1' }];

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.options).toContain('최소 2개 이상의 선택지가 필요합니다');
    });

    it('선택지가 최대 개수를 초과하면 에러를 반환한다', () => {
      const validator = new CreatePollFormValidator().withOptionsRules().build();

      const data = createValidData();
      data.options = [
        { id: '1', value: '선택지 1' },
        { id: '2', value: '선택지 2' },
        { id: '3', value: '선택지 3' },
        { id: '4', value: '선택지 4' },
        { id: '5', value: '선택지 5' },
        { id: '6', value: '선택지 6' },
      ];

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.options).toContain('최대 5개 까지 선택지를 추가할 수 있습니다');
    });

    it('선택지 중 빈 값이 있으면 에러를 반환한다', () => {
      const validator = new CreatePollFormValidator().withOptionsRules().build();

      const data = createValidData();
      data.options = [
        { id: '1', value: '선택지 1' },
        { id: '2', value: '' },
      ];

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.options).toContain('모든 선택지를 입력해주세요');
    });

    it('선택지 중 공백만 있는 값이 있으면 에러를 반환한다', () => {
      const validator = new CreatePollFormValidator().withOptionsRules().build();

      const data = createValidData();
      data.options = [
        { id: '1', value: '선택지 1' },
        { id: '2', value: '   ' },
      ];

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.options).toContain('모든 선택지를 입력해주세요');
    });

    it('선택지의 길이가 최대 길이를 초과하면 에러를 반환한다', () => {
      const validator = new CreatePollFormValidator().withOptionsRules().build();

      const data = createValidData();
      data.options = [
        { id: '1', value: 'a'.repeat(51) },
        { id: '2', value: '선택지 2' },
      ];

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.options).toContain('각 선택지는 50자 이하여야 합니다');
    });

    it('모든 선택지가 유효하면 에러가 없다', () => {
      const validator = new CreatePollFormValidator().withOptionsRules().build();

      const data = createValidData();
      data.options = [
        { id: '1', value: '선택지 1' },
        { id: '2', value: '선택지 2' },
        { id: '3', value: '선택지 3' },
      ];

      const result = validator.validate(data);

      expect(result.errors.options).toEqual([]);
    });

    it('최대 개수(5개)의 선택지가 있어도 유효하다', () => {
      const validator = new CreatePollFormValidator().withOptionsRules().build();

      const data = createValidData();
      data.options = [
        { id: '1', value: '선택지 1' },
        { id: '2', value: '선택지 2' },
        { id: '3', value: '선택지 3' },
        { id: '4', value: '선택지 4' },
        { id: '5', value: '선택지 5' },
      ];

      const result = validator.validate(data);

      expect(result.errors.options).toEqual([]);
    });

    it('선택지 값의 앞뒤 공백은 trim되어 검증된다', () => {
      const validator = new CreatePollFormValidator().withOptionsRules().build();

      const data = createValidData();
      data.options = [
        { id: '1', value: '  선택지 1  ' },
        { id: '2', value: '  선택지 2  ' },
      ];

      const result = validator.validate(data);

      expect(result.errors.options).toEqual([]);
    });
  });

  describe('제한 시간 검증', () => {
    it('제한 시간이 최소값 미만이면 에러를 반환한다', () => {
      const validator = new CreatePollFormValidator().withTimeLimitRules().build();

      const data = createValidData();
      data.timeLimit = -1;

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.timeLimit).toContain('제한 시간은 0 이상이어야 합니다');
    });

    it('제한 시간이 최대값을 초과하면 에러를 반환한다', () => {
      const validator = new CreatePollFormValidator().withTimeLimitRules().build();

      const data = createValidData();
      data.timeLimit = 601;

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.timeLimit).toContain('제한 시간은 600초 이하여야 합니다');
    });

    it('제한 시간이 0이면 유효하다', () => {
      const validator = new CreatePollFormValidator().withTimeLimitRules().build();

      const data = createValidData();
      data.timeLimit = 0;

      const result = validator.validate(data);

      expect(result.errors.timeLimit).toEqual([]);
    });

    it('제한 시간이 최대값(600초)이면 유효하다', () => {
      const validator = new CreatePollFormValidator().withTimeLimitRules().build();

      const data = createValidData();
      data.timeLimit = 600;

      const result = validator.validate(data);

      expect(result.errors.timeLimit).toEqual([]);
    });

    it('제한 시간이 유효 범위 내이면 에러가 없다', () => {
      const validator = new CreatePollFormValidator().withTimeLimitRules().build();

      const data = createValidData();
      data.timeLimit = 300;

      const result = validator.validate(data);

      expect(result.errors.timeLimit).toEqual([]);
    });
  });

  describe('빌더 패턴', () => {
    it('체이닝 방식으로 규칙을 추가할 수 있다', () => {
      const validator = new CreatePollFormValidator()
        .withTitleRules()
        .withOptionsRules()
        .withTimeLimitRules();

      expect(validator).toBeInstanceOf(CreatePollFormValidator);
    });

    it('build 메서드는 자기 자신을 반환한다', () => {
      const validator = new CreatePollFormValidator()
        .withTitleRules()
        .withOptionsRules()
        .withTimeLimitRules();

      const built = validator.build();

      expect(built).toBe(validator);
    });

    it('일부 규칙만 추가해도 동작한다', () => {
      const validator = new CreatePollFormValidator().withTitleRules().build();

      const data = createValidData();
      data.title = '';

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.title.length).toBeGreaterThan(0);
      expect(result.errors.options).toEqual([]);
      expect(result.errors.timeLimit).toEqual([]);
    });
  });

  describe('복합 유효성 검사', () => {
    it('여러 필드에서 동시에 에러가 발생할 수 있다', () => {
      const validator = new CreatePollFormValidator()
        .withTitleRules()
        .withOptionsRules()
        .withTimeLimitRules()
        .build();

      const data = {
        title: '',
        options: [{ id: '1', value: '' }],
        timeLimit: -1,
      };

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.title.length).toBeGreaterThan(0);
      expect(result.errors.options.length).toBeGreaterThan(0);
      expect(result.errors.timeLimit.length).toBeGreaterThan(0);
    });

    it('한 필드에서 여러 규칙 위반이 발생할 수 있다', () => {
      const validator = new CreatePollFormValidator().withTitleRules().withOptionsRules().build();

      const data = createValidData();
      data.options = [{ id: '1', value: 'a'.repeat(51) }];

      const result = validator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.options.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.options).toContain('최소 2개 이상의 선택지가 필요합니다');
      expect(result.errors.options).toContain('각 선택지는 50자 이하여야 합니다');
    });
  });
});
