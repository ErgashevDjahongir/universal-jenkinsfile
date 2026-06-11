import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional } from 'class-validator';
import { SessionStatus } from '../../../common/enums/session-status.enum';

/** Admin monitoring filtri (standart: faol sessiyalar). */
export class SessionFilterDto {
  @ApiPropertyOptional({ description: 'Tayinlov bo‘yicha filtr' })
  @IsOptional()
  @IsNumberString()
  assignmentId?: string;

  @ApiPropertyOptional({ enum: SessionStatus, description: 'Standart: in_progress' })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;
}
