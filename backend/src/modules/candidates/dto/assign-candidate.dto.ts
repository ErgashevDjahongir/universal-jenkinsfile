import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumberString, IsString, MaxLength, MinLength } from 'class-validator';

export class AssignCandidateDto {
  @ApiProperty({ example: '12', description: 'Test shabloni id (faqat «active» shablon)' })
  @IsNumberString()
  templateId!: string;

  @ApiProperty({ description: 'Tayinlov nomi', example: 'Nomzod attestatsiyasi' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ description: 'Faollik oynasi boshlanishi (ISO 8601)' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ description: 'Faollik oynasi tugashi (ISO 8601; startsAt dan keyin)' })
  @IsDateString()
  endsAt!: string;
}
