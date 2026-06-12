import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumberString, IsOptional } from 'class-validator';

export class ReportFilterDto {
  @ApiPropertyOptional({ description: "Bo'lim ID" })
  @IsOptional()
  @IsNumberString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Test shabloni ID' })
  @IsOptional()
  @IsNumberString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Tayinlov ID' })
  @IsOptional()
  @IsNumberString()
  assignmentId?: string;

  @ApiPropertyOptional({ description: 'Boshlanish sanasi (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Tugash sanasi (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
