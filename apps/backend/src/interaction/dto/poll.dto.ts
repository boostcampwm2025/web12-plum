import { createZodDto } from 'nestjs-zod';
import { pollFormSchema } from '@plum/shared-interfaces';

export class CreatePollDto extends createZodDto(pollFormSchema) {}
