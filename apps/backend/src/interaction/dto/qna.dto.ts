import { z } from 'zod';
import { qnaFormSchema } from '@plum/shared-interfaces';

export type CreateQnaDto = z.infer<typeof qnaFormSchema>;
