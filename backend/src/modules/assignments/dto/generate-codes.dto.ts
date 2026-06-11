import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Kirish kodlari generatsiyasi rejimi (servisda aynan bittasi tanlanadi):
 * - `perUser = true` — har bir maqsad foydalanuvchisiga (guruhlar a'zolarigacha
 *   yoyilib) bittadan kod; kodga user_id biriktiriladi.
 * - `count` — `count` ta anonim kod (user_id NULL, o'zini ro'yxatga olish rejimi).
 */
export class GenerateCodesDto {
  @ApiPropertyOptional({ description: 'Har maqsad foydalanuvchisiga bitta kod' })
  @IsOptional()
  @IsBoolean()
  perUser?: boolean;

  @ApiPropertyOptional({ description: 'Anonim kodlar soni (1–1000)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  count?: number;
}
