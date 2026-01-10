type ValidationRule<T> = {
  validate: (value: T) => boolean;
  errorMessage: string;
};

/**
 * 폼 유효성 검사 클래스
 * 체이닝 방식으로 검증 규칙을 추가하고 실행
 * @template T 검증 대상 값의 타입
 */
export class FormValidator<T> {
  private rules: ValidationRule<T>[] = [];

  /**
   * 유효성 검사 규칙 추가
   * @param validate 유효성 검사 함수
   * @param errorMessage 실패 시 에러 메시지
   * @returns 체이닝을 위한 this
   */
  addRule(validate: (value: T) => boolean, errorMessage: string): this {
    this.rules.push({ validate, errorMessage });
    return this;
  }

  /**
   * 모든 규칙에 대해 유효성 검사 수행
   * @param value 검증할 값
   * @returns 유효성 여부와 에러 메시지 배열
   */
  validate(value: T): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of this.rules) {
      if (!rule.validate(value)) errors.push(rule.errorMessage);
    }

    const result = {
      isValid: errors.length === 0,
      errors,
    };

    return result;
  }

  /**
   * 값이 유효한지 여부만 반환
   * @param value 검증할 값
   * @returns 유효 여부
   */
  isValid(value: T): boolean {
    const isValid = this.validate(value).isValid;
    return isValid;
  }
}
