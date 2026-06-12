import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ReportFilterDto } from './dto/report-filter.dto';
import {
  CertificateData,
  DashboardStats,
  QuestionAnalysisRow,
  RankingRow,
  ReportsService,
} from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EXPERT)
export class ReportsController {
  private readonly appBaseUrl: string;

  constructor(
    private readonly reports: ReportsService,
    config: ConfigService,
  ) {
    this.appBaseUrl = config.get<string>('APP_BASE_URL') ?? 'http://localhost:5173';
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Bosh sahifa statistikasi' })
  @ApiResponse({ status: 200 })
  getDashboard(): Promise<DashboardStats> {
    return this.reports.getDashboard();
  }

  @Get('rankings')
  @ApiOperation({ summary: 'Reyting jadvali (filtrlanadi)' })
  @ApiResponse({ status: 200 })
  getRankings(@Query() filter: ReportFilterDto): Promise<RankingRow[]> {
    return this.reports.getRankings(filter);
  }

  @Get('questions/analysis')
  @ApiOperation({ summary: "Eng ko'p xato qilinadigan savollar tahlili" })
  @ApiResponse({ status: 200 })
  getQuestionAnalysis(): Promise<QuestionAnalysisRow[]> {
    return this.reports.getQuestionAnalysis();
  }

  @Get('certificate/:sessionId')
  @ApiOperation({ summary: 'Sessiya bayonnomasi (JSON)' })
  @ApiResponse({ status: 200 })
  getCertificate(@Param('sessionId') sessionId: string): Promise<CertificateData> {
    return this.reports.getCertificateData(sessionId, this.appBaseUrl);
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Reyting jadvalini Excel formatda yuklab olish' })
  @ApiResponse({ status: 200, description: '.xlsx fayl' })
  async exportExcel(@Query() filter: ReportFilterDto, @Res() res: Response): Promise<void> {
    const buffer = await this.reports.buildExcel(filter);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="etest-natijalar.xlsx"');
    res.send(buffer);
  }

  @Get('export/pdf/:sessionId')
  @ApiOperation({ summary: 'Sessiya sertifikati PDF formatda' })
  @ApiResponse({ status: 200, description: 'PDF fayl' })
  async exportPdf(@Param('sessionId') sessionId: string, @Res() res: Response): Promise<void> {
    const buffer = await this.reports.buildCertificatePdf(sessionId, this.appBaseUrl);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sertifikat-${sessionId}.pdf"`);
    res.send(buffer);
  }
}
