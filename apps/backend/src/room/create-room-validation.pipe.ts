import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { createLectureSchema } from '@plum/shared-interfaces';

export class CreateRoomValidationPipe implements PipeTransform {
  constructor() {}

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
