import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, Max, Min } from 'class-validator';
import { GradeValue } from '../../../common/enums/grade-value.enum';

/** Baholash shkalasining bitta bandi: «daraja → eng kam foiz». */
export class GradeScaleItemDto {
  @ApiProperty({ enum: GradeValue })
  @IsEnum(GradeValue)
  grade!: GradeValue;

  @ApiProperty({ description: 'Shu bahoga erishish uchun eng kam foiz (0–100)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  minPercent!: number;
}
