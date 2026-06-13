import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CandidateStatus } from '../../../common/enums/candidate-status.enum';

export class CandidateFilterDto {
  @ApiPropertyOptional({ enum: CandidateStatus, description: 'Holat bo‘yicha filtr' })
  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;

  @ApiPropertyOptional({ description: 'F.I.Sh. bo‘yicha qidiruv (qisman moslik)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
