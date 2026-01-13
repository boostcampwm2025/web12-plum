import { createZodDto } from 'nestjs-zod'
import { createLectureSchema } from '@plum/shared-interfaces'

export class CreateRoomDto extends createZodDto(createLectureSchema) {}
