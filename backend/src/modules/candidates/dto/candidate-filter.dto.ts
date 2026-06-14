import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CandidateStatus } from '../../../common/enums/candidate-status.enum';

/**
 * view=current  -> pending + in_progress (aktiv topshiruvchilar)
 * view=archived -> completed + no_show   (natijalar bolimi)
 * Ikkala filtr bir vaqtda berilsa, view ustunlik qiladi.
 */
export enum CandidateView {
  CURRENT = 'current',
  ARCHIVED = 'archived',
}

export class CandidateFilterDto {
  @ApiPropertyOptional({ enum: CandidateStatus, description: "Holat bo'yicha filtr" })
  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;

  @ApiPropertyOptional({
    enum: CandidateView,
    description:
      'current — aktiv (pending+in_progress); archived — yakunlangan (completed+no_show)',
  })
  @IsOptional()
  @IsEnum(CandidateView)
  view?: CandidateView;

  @ApiPropertyOptional({ description: "F.I.Sh. bo'yicha qidiruv (qisman moslik)" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
