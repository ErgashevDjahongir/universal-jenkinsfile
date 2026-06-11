import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

/**
 * Tayinlov maqsadi: foydalanuvchi YOKI guruh (aynan bittasi).
 * «Aynan bitta» qoidasi servisda tekshiriladi (DB CHECK'ni takrorlamaslik uchun).
 */
export class AssignmentTargetDto {
  @ApiPropertyOptional({ example: '5', description: 'Foydalanuvchi id (guruh berilmasa)' })
  @IsOptional()
  @IsNumberString()
  userId?: string;

  @ApiPropertyOptional({ example: '3', description: 'Guruh id (foydalanuvchi berilmasa)' })
  @IsOptional()
  @IsNumberString()
  groupId?: string;
}
