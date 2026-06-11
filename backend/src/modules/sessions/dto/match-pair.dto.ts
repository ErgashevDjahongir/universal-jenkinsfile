import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsString } from 'class-validator';

/** Moslashtirish javobi: chap variant id → tanlangan o'ng qiymat. */
export class MatchPairDto {
  @ApiProperty({ description: 'Chap variant (option) id' })
  @IsNumberString()
  optionId!: string;

  @ApiProperty({ description: 'Tanlangan o‘ng qiymat (match_pair matni)' })
  @IsString()
  value!: string;
}
