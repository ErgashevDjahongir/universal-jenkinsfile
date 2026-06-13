import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { QuestionStatus } from '../../common/enums/question-status.enum';
import { SessionStatus } from '../../common/enums/session-status.enum';
import { TemplateStatus } from '../../common/enums/template-status.enum';
import { messages } from '../../i18n/uz';
import { Question } from '../questions/entities/question.entity';
import { TestSession } from '../sessions/entities/test-session.entity';
import { TestTemplate } from '../templates/entities/test-template.entity';
import { User } from '../users/entities/user.entity';
import { ReportFilterDto } from './dto/report-filter.dto';

export interface DashboardStats {
  totalQuestions: number;
  activeTemplates: number;
  todaySessions: number;
  pendingAssignments: number;
  recentResults: RecentResult[];
  activeSessions: ActiveSessionRow[];
}

export interface RecentResult {
  sessionId: string;
  userId: string;
  fullName: string;
  assignmentTitle: string;
  score: string | null;
  maxScore: string | null;
  percent: string | null;
  passed: boolean | null;
  finishedAt: string | null;
}

export interface ActiveSessionRow {
  sessionId: string;
  userId: string;
  fullName: string;
  assignmentTitle: string;
  startedAt: string;
  deadlineAt: string;
  tabSwitches: number;
}

export interface RankingRow {
  rank: number;
  sessionId: string;
  userId: string;
  fullName: string;
  departmentName: string | null;
  assignmentTitle: string;
  templateTitle: string;
  score: string | null;
  maxScore: string | null;
  percent: string | null;
  passed: boolean | null;
  grade: string | null;
  finishedAt: string | null;
}

export interface QuestionAnalysisRow {
  questionId: string;
  text: string;
  subjectId: string;
  timesUsed: number;
  timesCorrect: number;
  errorCount: number;
  errorRate: number;
}

export interface CertificateData {
  fullName: string;
  testTitle: string;
  finishedAt: string | null;
  score: string | null;
  maxScore: string | null;
  percent: string | null;
  passed: boolean;
  grade: string | null;
  certificateUid: string;
  verifyUrl: string;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(TestSession) private readonly sessions: Repository<TestSession>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(TestTemplate) private readonly templates: Repository<TestTemplate>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async getDashboard(): Promise<DashboardStats> {
    const [totalQuestions, activeTemplates, todaySessions, pendingAssignments] = await Promise.all([
      this.questions.count({ where: { status: QuestionStatus.ACTIVE } }),
      this.templates.count({ where: { status: TemplateStatus.ACTIVE } }),
      this.countTodaySessions(),
      this.countPendingAssignments(),
    ]);

    const [recentResults, activeSessions] = await Promise.all([
      this.getRecentResults(),
      this.getActiveSessions(),
    ]);

    return {
      totalQuestions,
      activeTemplates,
      todaySessions,
      pendingAssignments,
      recentResults,
      activeSessions,
    };
  }

  private async countTodaySessions(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::int AS count FROM test_sessions WHERE started_at >= $1`,
      [today],
    );
    return Number(result[0]?.count ?? 0);
  }

  private async countPendingAssignments(): Promise<number> {
    const result = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::int AS count FROM test_assignments WHERE ends_at > now()`,
    );
    return Number(result[0]?.count ?? 0);
  }

  private async getRecentResults(): Promise<RecentResult[]> {
    const rows = await this.dataSource.query<
      {
        session_id: string;
        user_id: string;
        last_name: string;
        first_name: string;
        middle_name: string | null;
        assignment_title: string;
        score: string | null;
        max_score: string | null;
        percent: string | null;
        passed: boolean | null;
        finished_at: string | null;
      }[]
    >(
      `SELECT s.id AS session_id, s.user_id, u.last_name, u.first_name, u.middle_name,
              a.title AS assignment_title, s.score, s.max_score, s.percent, s.passed, s.finished_at
       FROM test_sessions s
       JOIN users u ON u.id = s.user_id
       JOIN test_assignments a ON a.id = s.assignment_id
       WHERE s.status = $1 AND s.is_preview = false
       ORDER BY s.finished_at DESC
       LIMIT 10`,
      [SessionStatus.COMPLETED],
    );
    return rows.map((r) => ({
      sessionId: r.session_id,
      userId: r.user_id,
      fullName: [r.last_name, r.first_name, r.middle_name].filter(Boolean).join(' '),
      assignmentTitle: r.assignment_title,
      score: r.score,
      maxScore: r.max_score,
      percent: r.percent,
      passed: r.passed,
      finishedAt: r.finished_at,
    }));
  }

  private async getActiveSessions(): Promise<ActiveSessionRow[]> {
    const rows = await this.dataSource.query<
      {
        session_id: string;
        user_id: string;
        last_name: string;
        first_name: string;
        middle_name: string | null;
        assignment_title: string;
        started_at: string;
        deadline_at: string;
        tab_switches: number;
      }[]
    >(
      `SELECT s.id AS session_id, s.user_id, u.last_name, u.first_name, u.middle_name,
              a.title AS assignment_title, s.started_at, s.deadline_at, s.tab_switches
       FROM test_sessions s
       JOIN users u ON u.id = s.user_id
       JOIN test_assignments a ON a.id = s.assignment_id
       WHERE s.status = $1
       ORDER BY s.started_at DESC
       LIMIT 10`,
      [SessionStatus.IN_PROGRESS],
    );
    return rows.map((r) => ({
      sessionId: r.session_id,
      userId: r.user_id,
      fullName: [r.last_name, r.first_name, r.middle_name].filter(Boolean).join(' '),
      assignmentTitle: r.assignment_title,
      startedAt: r.started_at,
      deadlineAt: r.deadline_at,
      tabSwitches: r.tab_switches,
    }));
  }

  async getRankings(filter: ReportFilterDto): Promise<RankingRow[]> {
    const conditions: string[] = ['s.is_preview = false', `s.status = $1`];
    const params: unknown[] = [SessionStatus.COMPLETED];
    let idx = 2;

    if (filter.departmentId) {
      conditions.push(`u.department_id = $${idx++}`);
      params.push(filter.departmentId);
    }
    if (filter.templateId) {
      conditions.push(`a.template_id = $${idx++}`);
      params.push(filter.templateId);
    }
    if (filter.assignmentId) {
      conditions.push(`s.assignment_id = $${idx++}`);
      params.push(filter.assignmentId);
    }
    if (filter.dateFrom) {
      conditions.push(`s.finished_at >= $${idx++}`);
      params.push(filter.dateFrom);
    }
    if (filter.dateTo) {
      conditions.push(`s.finished_at <= $${idx++}`);
      params.push(filter.dateTo);
    }

    const where = conditions.join(' AND ');
    const rows = await this.dataSource.query<
      {
        session_id: string;
        user_id: string;
        last_name: string;
        first_name: string;
        middle_name: string | null;
        department_name: string | null;
        assignment_title: string;
        template_title: string;
        score: string | null;
        max_score: string | null;
        percent: string | null;
        passed: boolean | null;
        grade: string | null;
        finished_at: string | null;
      }[]
    >(
      `SELECT s.id AS session_id, s.user_id,
              u.last_name, u.first_name, u.middle_name,
              d.name AS department_name,
              a.title AS assignment_title,
              t.title AS template_title,
              s.score, s.max_score, s.percent, s.passed, s.grade, s.finished_at
       FROM test_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       JOIN test_assignments a ON a.id = s.assignment_id
       JOIN test_templates t ON t.id = a.template_id
       WHERE ${where}
       ORDER BY s.percent DESC NULLS LAST, s.score DESC NULLS LAST`,
      params,
    );

    return rows.map((r, i) => ({
      rank: i + 1,
      sessionId: r.session_id,
      userId: r.user_id,
      fullName: [r.last_name, r.first_name, r.middle_name].filter(Boolean).join(' '),
      departmentName: r.department_name,
      assignmentTitle: r.assignment_title,
      templateTitle: r.template_title,
      score: r.score,
      maxScore: r.max_score,
      percent: r.percent,
      passed: r.passed,
      grade: r.grade,
      finishedAt: r.finished_at,
    }));
  }

  async getQuestionAnalysis(): Promise<QuestionAnalysisRow[]> {
    const rows = await this.dataSource.query<
      {
        id: string;
        text: string;
        subject_id: string;
        times_used: number;
        times_correct: number;
      }[]
    >(
      `SELECT id, text, subject_id, times_used, times_correct
       FROM questions
       WHERE times_used > 0
       ORDER BY (times_used - times_correct)::float / times_used DESC, times_used DESC
       LIMIT 50`,
    );
    return rows.map((r) => ({
      questionId: r.id,
      text: r.text,
      subjectId: r.subject_id,
      timesUsed: Number(r.times_used),
      timesCorrect: Number(r.times_correct),
      errorCount: Number(r.times_used) - Number(r.times_correct),
      errorRate:
        Number(r.times_used) > 0
          ? Math.round(
              ((Number(r.times_used) - Number(r.times_correct)) / Number(r.times_used)) * 100,
            )
          : 0,
    }));
  }

  async getCertificateData(sessionId: string, appBaseUrl: string): Promise<CertificateData> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session || !session.certificateUid || !session.passed) {
      throw new NotFoundException(messages.common.notFound);
    }
    const user = await this.users.findOne({ where: { id: session.userId } });
    if (!user) {
      throw new NotFoundException(messages.common.notFound);
    }
    const assignmentRow = await this.dataSource.query<{ title: string; template_title: string }[]>(
      `SELECT a.title, t.title AS template_title
       FROM test_assignments a JOIN test_templates t ON t.id = a.template_id
       WHERE a.id = $1`,
      [session.assignmentId],
    );
    const fullName = [user.lastName, user.firstName, user.middleName].filter(Boolean).join(' ');
    const testTitle = assignmentRow[0]?.title ?? '';
    return {
      fullName,
      testTitle,
      finishedAt: session.finishedAt?.toISOString() ?? null,
      score: session.score,
      maxScore: session.maxScore,
      percent: session.percent,
      passed: true,
      grade: session.grade,
      certificateUid: session.certificateUid,
      verifyUrl: `${appBaseUrl}/verify/${session.certificateUid}`,
    };
  }

  async buildExcel(filter: ReportFilterDto): Promise<Buffer> {
    const { default: ExcelJS } = await import('exceljs');
    const rows = await this.getRankings(filter);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Natijalar');

    ws.columns = [
      { header: '№', key: 'rank', width: 6 },
      { header: 'F.I.Sh.', key: 'fullName', width: 30 },
      { header: "Bo'lim", key: 'departmentName', width: 20 },
      { header: 'Tayinlov', key: 'assignmentTitle', width: 30 },
      { header: 'Ball', key: 'score', width: 10 },
      { header: 'Maks. ball', key: 'maxScore', width: 12 },
      { header: 'Foiz', key: 'percent', width: 10 },
      { header: 'Natija', key: 'passed', width: 10 },
      { header: 'Daraja', key: 'grade', width: 12 },
      { header: 'Yakunlangan', key: 'finishedAt', width: 22 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

    rows.forEach((r) => {
      ws.addRow({
        rank: r.rank,
        fullName: r.fullName,
        departmentName: r.departmentName ?? '—',
        assignmentTitle: r.assignmentTitle,
        score: r.score ?? '—',
        maxScore: r.maxScore ?? '—',
        percent: r.percent ? `${r.percent}%` : '—',
        passed: r.passed === true ? "O'tdi" : r.passed === false ? "O'tmadi" : '—',
        grade: r.grade ?? '—',
        finishedAt: r.finishedAt ? new Date(r.finishedAt).toLocaleString('uz-UZ') : '—',
      });
    });

    ws.eachRow((row, rowNum) => {
      if (rowNum > 1 && rowNum % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
    });

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async buildCertificatePdf(sessionId: string, appBaseUrl: string): Promise<Buffer> {
    const data = await this.getCertificateData(sessionId, appBaseUrl);
    const PDFDocument = (await import('pdfkit')).default;
    const QRCode = await import('qrcode');

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(22).font('Helvetica-Bold').text('BAYONNOMA / SERTIFIKAT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Raqam: ${data.certificateUid}`, { align: 'center' });
      doc.moveDown(1.5);

      // Body
      const lineGap = 6;
      doc.fontSize(13).font('Helvetica-Bold').text('F.I.Sh.: ', { continued: true });
      doc.font('Helvetica').text(data.fullName, { lineGap });

      doc.font('Helvetica-Bold').text('Test nomi: ', { continued: true });
      doc.font('Helvetica').text(data.testTitle, { lineGap });

      if (data.finishedAt) {
        const d = new Date(data.finishedAt);
        const dateStr = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        doc.font('Helvetica-Bold').text('Sana: ', { continued: true });
        doc.font('Helvetica').text(dateStr, { lineGap });
      }

      if (data.score !== null && data.maxScore !== null) {
        doc.font('Helvetica-Bold').text('Ball: ', { continued: true });
        doc.font('Helvetica').text(`${data.score} / ${data.maxScore}`, { lineGap });
      }

      if (data.percent !== null) {
        doc.font('Helvetica-Bold').text('Foiz: ', { continued: true });
        doc.font('Helvetica').text(`${data.percent}%`, { lineGap });
      }

      if (data.grade) {
        doc.font('Helvetica-Bold').text('Daraja: ', { continued: true });
        doc.font('Helvetica').text(data.grade, { lineGap });
      }

      doc.moveDown(0.5);
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(data.passed ? '#16a34a' : '#dc2626')
        .text(data.passed ? "TESTDAN O'TDI" : "TESTDAN O'TMADI", { align: 'center' });
      doc.fillColor('#000000');

      // QR code — async generate, then add to PDF
      QRCode.toDataURL(data.verifyUrl, { width: 120 })
        .then((qrDataUrl: string) => {
          const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
          const imgBuf = Buffer.from(base64, 'base64');
          doc.moveDown(1.5);
          doc.image(imgBuf, { width: 110, align: 'center' });
          doc.moveDown(0.3);
          doc
            .fontSize(9)
            .font('Helvetica')
            .text('Tekshirish: ' + data.verifyUrl, { align: 'center' });
          doc.end();
        })
        .catch((err: unknown) => {
          reject(err instanceof Error ? err : new Error('QR generation failed'));
        });
    });
  }
}
