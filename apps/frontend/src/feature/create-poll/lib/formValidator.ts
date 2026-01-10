import { FormValidator } from '@/shared/lib/FormValidator';
import { PollOption } from '../types';

/**
 * 투표 폼 유효성 검사 제약 조건
 */
const VALIDATION_CONSTRAINTS = {
  TITLE: {
    MAX_LENGTH: 50, // 투표 제목 최대 길이
  },
  OPTIONS: {
    MIN_COUNT: 2, // 최소 선택지 개수
    MAX_COUNT: 5, // 최대 선택지 개수
    MAX_OPTION_LENGTH: 50, // 각 선택지 최대 길이
  },
  TIME_LIMIT: {
    MIN_VALUE: 0, // 제한 시간 최소값 (초)
    MAX_VALUE: 600, // 제한 시간 최대값 (초, 10분)
  },
} as const;

/**
 * 투표 폼 유효성 검사 에러 메시지
 */
const VALIDATION_MESSAGES = {
  TITLE: {
    REQUIRED: '투표 제목을 입력해주세요',
    MAX_LENGTH: `투표 제목은 ${VALIDATION_CONSTRAINTS.TITLE.MAX_LENGTH}자 이하여야 합니다`,
  },
  OPTIONS: {
    ALL_REQUIRED: '모든 선택지를 입력해주세요',
    MIN_COUNT: `최소 ${VALIDATION_CONSTRAINTS.OPTIONS.MIN_COUNT}개 이상의 선택지가 필요합니다`,
    MAX_COUNT: `최대 ${VALIDATION_CONSTRAINTS.OPTIONS.MAX_COUNT}개 까지 선택지를 추가할 수 있습니다`,
    MAX_LENGTH: `각 선택지는 ${VALIDATION_CONSTRAINTS.OPTIONS.MAX_OPTION_LENGTH}자 이하여야 합니다`,
  },
  TIME_LIMIT: {
    MIN_VALUE: `제한 시간은 ${VALIDATION_CONSTRAINTS.TIME_LIMIT.MIN_VALUE} 이상이어야 합니다`,
    MAX_VALUE: `제한 시간은 ${VALIDATION_CONSTRAINTS.TIME_LIMIT.MAX_VALUE}초 이하여야 합니다`,
  },
} as const;

/**
 * 투표 폼 전용 유효성 검사 클래스
 */
export class CreatePollFormValidator {
  private titleValidator: FormValidator<string>;
  private optionsValidator: FormValidator<Array<PollOption>>;
  private timeLimitValidator: FormValidator<number>;

  constructor() {
    this.titleValidator = new FormValidator<string>();
    this.optionsValidator = new FormValidator<Array<PollOption>>();
    this.timeLimitValidator = new FormValidator<number>();
  }

  /**
   * 투표 제목 검증 규칙 추가
   * - 필수 입력
   * - 최대 길이 제한
   * @returns 체이닝을 위한 this
   */
  withTitleRules(): this {
    this.titleValidator
      .addRule((value) => value.trim() !== '', VALIDATION_MESSAGES.TITLE.REQUIRED)
      .addRule(
        (value) => value.trim().length <= VALIDATION_CONSTRAINTS.TITLE.MAX_LENGTH,
        VALIDATION_MESSAGES.TITLE.MAX_LENGTH,
      );
    return this;
  }

  /**
   * 투표 선택지 검증 규칙 추가
   * - 모든 선택지 필수 입력
   * - 최소/최대 개수 제한
   * - 각 선택지 최대 길이 제한
   * @returns 체이닝을 위한 this
   */
  withOptionsRules(): this {
    this.optionsValidator
      .addRule(
        (options) => !options.some((option) => option.value.trim() === ''),
        VALIDATION_MESSAGES.OPTIONS.ALL_REQUIRED,
      )
      .addRule(
        (options) => options.length >= VALIDATION_CONSTRAINTS.OPTIONS.MIN_COUNT,
        VALIDATION_MESSAGES.OPTIONS.MIN_COUNT,
      )
      .addRule(
        (options) => options.length <= VALIDATION_CONSTRAINTS.OPTIONS.MAX_COUNT,
        VALIDATION_MESSAGES.OPTIONS.MAX_COUNT,
      )
      .addRule(
        (options) =>
          options.every(
            (option) =>
              option.value.trim().length <= VALIDATION_CONSTRAINTS.OPTIONS.MAX_OPTION_LENGTH,
          ),
        VALIDATION_MESSAGES.OPTIONS.MAX_LENGTH,
      );
    return this;
  }

  /**
   * 제한 시간 검증 규칙 추가
   * - 최소값 제한
   * - 최대값 제한
   * @returns 체이닝을 위한 this
   */
  withTimeLimitRules(): this {
    this.timeLimitValidator
      .addRule(
        (value) => value >= VALIDATION_CONSTRAINTS.TIME_LIMIT.MIN_VALUE,
        VALIDATION_MESSAGES.TIME_LIMIT.MIN_VALUE,
      )
      .addRule(
        (value) => value <= VALIDATION_CONSTRAINTS.TIME_LIMIT.MAX_VALUE,
        VALIDATION_MESSAGES.TIME_LIMIT.MAX_VALUE,
      );
    return this;
  }

  /**
   * 전체 투표 폼 데이터 유효성 검사
   * @param data 검증할 투표 폼 데이터
   * @returns 유효성 여부와 필드별 에러 메시지
   */
  validate(data: { title: string; options: Array<PollOption>; timeLimit: number }): {
    isValid: boolean;
    errors: {
      title: string[];
      options: string[];
      timeLimit: string[];
    };
  } {
    const titleResult = this.titleValidator.validate(data.title);
    const optionsResult = this.optionsValidator.validate(data.options);
    const timeLimitResult = this.timeLimitValidator.validate(data.timeLimit);

    const isValid = titleResult.isValid && optionsResult.isValid && timeLimitResult.isValid;
    const errors = {
      title: titleResult.errors,
      options: optionsResult.errors,
      timeLimit: timeLimitResult.errors,
    };

    return { isValid, errors };
  }

  /**
   * 전체 투표 폼 데이터가 유효한지 여부만 반환
   * @param data 검증할 투표 폼 데이터
   * @returns 유효 여부
   */
  isValid(data: { title: string; options: Array<PollOption>; timeLimit: number }): boolean {
    const isValid = this.validate(data).isValid;
    return isValid;
  }

  /**
   * 설정이 완료된 validator 인스턴스 반환
   * @returns 설정이 완료된 CreatePollFormValidator 인스턴스
   */
  build(): CreatePollFormValidator {
    return this;
  }
}
