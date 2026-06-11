import { PartialType } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto';

/** Tahrirlash — barcha maydonlar ixtiyoriy. type/options o‘zgarsa qayta validatsiya qilinadi. */
export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}
