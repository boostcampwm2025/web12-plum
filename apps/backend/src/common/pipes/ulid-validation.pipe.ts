import { isValid } from 'ulid';
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class UlidValidationPipe implements PipeTransform {
  transform(value: string): string {
    if (!isValid(value)) {
      throw new BadRequestException(`Invalid ULID: ${value}`);
    }
    return value;
  }
}
