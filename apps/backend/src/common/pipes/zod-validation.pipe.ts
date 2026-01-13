import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodObject } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(protected schema: ZodObject) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      throw new BadRequestException('Validation failed', error);
    }
  }
}
