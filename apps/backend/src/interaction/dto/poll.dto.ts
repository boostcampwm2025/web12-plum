import { z } from 'zod';
import { pollFormSchema } from '@plum/shared-interfaces';

export type CreatePollDto = z.infer<typeof pollFormSchema>;
