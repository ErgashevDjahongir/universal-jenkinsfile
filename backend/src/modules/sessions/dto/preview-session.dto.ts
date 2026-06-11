import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

/** Sinov (preview) sessiyasini ochish — faqat admin (qaror §3). */
export class PreviewSessionDto {
  @ApiProperty({ description: 'Tayinlov id' })
  @IsNumberString()
  assignmentId!: string;
}
