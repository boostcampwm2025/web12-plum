import { createZodDto } from 'nestjs-zod';
import { qnaFormSchema } from '@plum/shared-interfaces';

export class CreateQnaDto extends createZodDto(qnaFormSchema) {}
