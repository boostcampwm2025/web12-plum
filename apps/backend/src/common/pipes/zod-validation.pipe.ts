import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodObject } from 'zod';
import { WsException } from '@nestjs/websockets';

abstract class BaseZodPipe implements PipeTransform {
  constructor(protected schema: ZodObject) {}

  abstract handleException(error: any): void;

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      this.handleException(result.error);
    }
    return result;
  }
}

export class ZodValidationPipe extends BaseZodPipe {
  handleException(error: any) {
    throw new BadRequestException({
      message: 'Validation failed',
      errors: error.format() || '입력 형식이 잘못되었습니다.',
    });
  }
}

export class ZodValidationPipeSocket extends BaseZodPipe {
  handleException(_error: any) {
    throw new WsException({ success: false, error: '입력 형식이 잘못되었습니다.' });
  }
}
