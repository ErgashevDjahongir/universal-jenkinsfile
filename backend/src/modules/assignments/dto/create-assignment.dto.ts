import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumberString,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AssignmentTargetDto } from './assignment-target.dto';

export class CreateAssignmentDto {
  @ApiProperty({ example: '12', description: 'Test shabloni id (faqat «active» shablon)' })
  @IsNumberString()
  templateId!: string;

  @ApiProperty({ description: 'Tayinlov nomi', example: '2026 II-chorak attestatsiyasi' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ description: 'Faollik oynasi boshlanishi (ISO 8601)' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ description: 'Faollik oynasi tugashi (ISO 8601; startsAt dan keyin)' })
  @IsDateString()
  endsAt!: string;

  @ApiProperty({ type: [AssignmentTargetDto], description: 'Maqsadlar: foydalanuvchi yoki guruh' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssignmentTargetDto)
  targets!: AssignmentTargetDto[];
}
