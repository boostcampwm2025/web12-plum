import { z } from 'zod';
import { createLectureSchema } from '@plum/shared-interfaces';

export type CreateRoomDto = z.infer<typeof createLectureSchema>;
