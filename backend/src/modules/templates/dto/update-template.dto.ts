import { PartialType } from '@nestjs/swagger';
import { CreateTemplateDto } from './create-template.dto';

/**
 * Shablonni tahrirlash — barcha maydonlar ixtiyoriy. Berilgan nested massivlar
 * (gradeScale/fixedQuestions/selectionRules) butunlay almashtiriladi (replace).
 */
export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
