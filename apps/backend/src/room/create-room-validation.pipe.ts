import { ZodObject } from 'zod';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { createLectureSchema } from '@plum/shared-interfaces';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

export class CreateRoomValidationPipe extends ZodValidationPipe {
  constructor(schema: ZodObject) {
    super(schema);
  }

  transform(value: any, _metadata: ArgumentMetadata) {
    try {
      const transformedBody = {
        ...value,
        isAgreed: value.isAgreed === 'true' || value.isAgreed === true,
        polls: typeof value.polls === 'string' ? JSON.parse(value.polls) : (value.polls ?? []),
        qnas: typeof value.qnas === 'string' ? JSON.parse(value.qnas) : (value.qnas ?? []),
      };
      return createLectureSchema.parse(transformedBody);
    } catch (error) {
      throw new BadRequestException('Validation failed', error);
    }
  }
}
