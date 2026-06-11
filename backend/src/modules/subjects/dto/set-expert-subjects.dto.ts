import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsNumberString } from 'class-validator';

export class SetExpertSubjectsDto {
  @ApiProperty({ type: [String], example: ['1', '2'], description: 'Fan id-lar ro‘yxati' })
  @IsArray()
  @ArrayUnique()
  @IsNumberString({}, { each: true })
  subjectIds!: string[];
}
