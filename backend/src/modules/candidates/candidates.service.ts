import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { DataSource, EntityManager, ILike, In, QueryFailedError, Repository } from 'typeorm';
import { CandidateStatus } from '../../common/enums/candidate-status.enum';
import { DocumentType } from '../../common/enums/document-type.enum';
import { SessionStatus } from '../../common/enums/session-status.enum';
import { TemplateStatus } from '../../common/enums/template-status.enum';
import { messages } from '../../i18n/uz';
import { generateAccessCode } from '../assignments/access-code.util';
import { AccessCode } from '../assignments/entities/access-code.entity';
import { TestAssignment } from '../assignments/entities/test-assignment.entity';
import { AuditService } from '../audit/audit.service';
import { TestSession } from '../sessions/entities/test-session.entity';
import { TemplatesService } from '../templates/templates.service';
import { AssignCandidateDto } from './dto/assign-candidate.dto';
import { CandidateFilterDto, CandidateView } from './dto/candidate-filter.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateAssignmentDto } from './dto/update-candidate-assignment.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { CandidateDocument } from './entities/candidate-document.entity';
import { Candidate } from './entities/candidate.entity';

const PG_UNIQUE_VIOLATION = '23505';
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB
const UPLOAD_DIR = resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads', 'candidate-docs');

/** Yuklangan fayl (FileInterceptor memoryStorage natijasi). */
export interface UploadedDocument {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** PDF kontenti haqiqiyligini sehrli baytlar (%PDF) orqali tekshiradi. */
function hasPdfMagic(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46 //    F
  );
}

/** Tayinlov xulosasi (ro'yxat va kartochka uchun). */
export interface CandidateAssignmentView {
  id: string;
  templateId: string;
  templateName: string | null;
  title: string;
  startsAt: Date;
  endsAt: Date;
  accessCode: string | null;
}

/** Ro'yxat qatori — topshiruvchi + biriktirilgan tayinlov va holat. */
export interface CandidateListRow {
  id: string;
  fullName: string;
  phone: string;
  status: CandidateStatus;
  createdAt: Date;
  assignment: CandidateAssignmentView | null;
}

/** Hujjat metama'lumoti (fayl yo'li javobga chiqmaydi). */
export interface CandidateDocumentView {
  id: string;
  docType: DocumentType;
  originalName: string;
  fileSize: number;
  uploadedAt: Date;
}

/** Yakunlangan sessiya natijasi (kartochka uchun). */
export interface CandidateResultView {
  sessionId: string;
  status: SessionStatus;
  finishedAt: Date | null;
  score: string | null;
  maxScore: string | null;
  percent: string | null;
  passed: boolean | null;
  grade: string | null;
  correctCount: number | null;
  totalCount: number | null;
}

/** Topshiruvchi kartochkasi: ma'lumot + hujjatlar + tayinlov + natija. */
export interface CandidateDetail {
  id: string;
  fullName: string;
  phone: string;
  status: CandidateStatus;
  createdAt: Date;
  updatedAt: Date;
  documents: CandidateDocumentView[];
  assignment: CandidateAssignmentView | null;
  result: CandidateResultView | null;
}

/** Tayinlash natijasi: tayinlov + bir martalik kod. */
export interface CandidateAssignmentResult {
  assignment: CandidateAssignmentView;
  code: AccessCode;
}

/** So'rov konteksti (audit uchun). */
export interface RequestContext {
  userId: string;
  ip?: string | null;
}

/**
 * Test topshiruvchilar (candidates) moduli biznes-logikasi.
 * Yozish amallari faqat administratorga (controller guard); ekspert read-only.
 * Barcha o'zgartiruvchi amallar AuditService orqali jurnal qilinadi.
 */
@Injectable()
export class CandidatesService {
  constructor(
    @InjectRepository(Candidate) private readonly candidates: Repository<Candidate>,
    @InjectRepository(CandidateDocument)
    private readonly documents: Repository<CandidateDocument>,
    @InjectRepository(TestAssignment) private readonly assignments: Repository<TestAssignment>,
    @InjectRepository(AccessCode) private readonly codes: Repository<AccessCode>,
    @InjectRepository(TestSession) private readonly sessions: Repository<TestSession>,
    private readonly templates: TemplatesService,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  // ---- CRUD ----

  async create(dto: CreateCandidateDto, ctx: RequestContext): Promise<Candidate> {
    const candidate = await this.candidates.save(
      this.candidates.create({
        fullName: dto.fullName,
        phone: dto.phone,
        status: CandidateStatus.PENDING,
        createdBy: ctx.userId,
      }),
    );
    await this.audit.log({
      userId: ctx.userId,
      action: 'candidate.create',
      entity: 'candidate',
      entityId: candidate.id,
      ip: ctx.ip,
    });
    return candidate;
  }

  async findAll(filter: CandidateFilterDto): Promise<CandidateListRow[]> {
    const statusFilter = this.resolveStatusFilter(filter);
    const rows = await this.candidates.find({
      where: {
        ...statusFilter,
        ...(filter.search
          ? {
              fullName: ILike(`%${filter.search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`),
            }
          : {}),
      },
      order: { id: 'DESC' },
    });
    if (rows.length === 0) {
      return [];
    }
    const assignmentByCandidate = await this.loadAssignmentsByCandidate(rows.map((c) => c.id));
    const result = rows.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      status: c.status,
      createdAt: c.createdAt,
      assignment: assignmentByCandidate.get(c.id) ?? null,
    }));
    return filter.hasAssignment ? result.filter((r) => r.assignment !== null) : result;
  }

  async findOne(id: string): Promise<CandidateDetail> {
    const candidate = await this.getOrFail(id);
    const documents = await this.documents.find({
      where: { candidateId: id },
      order: { docType: 'ASC' },
    });
    const assignment = (await this.loadAssignmentsByCandidate([id])).get(id) ?? null;
    const result = await this.loadResult(id);

    return {
      id: candidate.id,
      fullName: candidate.fullName,
      phone: candidate.phone,
      status: candidate.status,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      documents: documents.map((d) => ({
        id: d.id,
        docType: d.docType,
        originalName: d.originalName,
        fileSize: d.fileSize,
        uploadedAt: d.uploadedAt,
      })),
      assignment,
      result,
    };
  }

  async update(id: string, dto: UpdateCandidateDto, ctx: RequestContext): Promise<Candidate> {
    const candidate = await this.getOrFail(id);
    if (dto.fullName !== undefined) candidate.fullName = dto.fullName;
    if (dto.phone !== undefined) candidate.phone = dto.phone;
    await this.candidates.save(candidate);
    await this.audit.log({
      userId: ctx.userId,
      action: 'candidate.update',
      entity: 'candidate',
      entityId: id,
      details: { fullName: dto.fullName, phone: dto.phone },
      ip: ctx.ip,
    });
    return candidate;
  }

  /** Topshiruvchini o'chiradi: avval hujjat fayllari va yozuvlari, so'ng candidate. */
  async remove(id: string, ctx: RequestContext): Promise<void> {
    const candidate = await this.getOrFail(id);
    const docs = await this.documents.find({ where: { candidateId: id } });

    await this.dataSource.transaction(async (manager) => {
      if (docs.length > 0) {
        await manager.delete(CandidateDocument, { candidateId: id });
      }
      await manager.remove(candidate);
    });

    // Fayllarni DB tranzaksiyasi muvaffaqiyatidan keyin o'chiramiz.
    await Promise.all(docs.map((d) => this.deleteFileQuietly(d.filePath)));
    await this.audit.log({
      userId: ctx.userId,
      action: 'candidate.delete',
      entity: 'candidate',
      entityId: id,
      ip: ctx.ip,
    });
  }

  // ---- Hujjatlar ----

  /** Hujjat yuklaydi yoki mavjudini almashtiradi (har turdan bitta — UNIQUE). */
  async uploadDocument(
    candidateId: string,
    docTypeRaw: string,
    file: UploadedDocument | undefined,
    ctx: RequestContext,
  ): Promise<CandidateDocumentView> {
    await this.getOrFail(candidateId);
    const docType = this.parseDocType(docTypeRaw);
    if (!file) {
      throw new BadRequestException(messages.candidate.fileRequired);
    }
    // MIME (client) + kengaytma + sehrli baytlar — spoofing himoyasi.
    const isPdf =
      file.mimetype === 'application/pdf' &&
      file.originalname.toLowerCase().endsWith('.pdf') &&
      hasPdfMagic(file.buffer);
    if (!isPdf) {
      throw new BadRequestException(messages.candidate.documentType);
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new BadRequestException(
        messages.candidate.documentSize.replace(
          '{{max}}',
          String(MAX_DOCUMENT_BYTES / 1024 / 1024),
        ),
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${randomUUID()}.pdf`;
    await writeFile(join(UPLOAD_DIR, filename), file.buffer);
    const filePath = join('uploads', 'candidate-docs', filename);

    // Mavjud bo'lsa almashtiramiz; eski faylni keyin o'chiramiz.
    const existing = await this.documents.findOne({ where: { candidateId, docType } });
    const oldPath = existing?.filePath;

    const document = existing ?? this.documents.create({ candidateId, docType });
    document.filePath = filePath;
    document.originalName = file.originalname;
    document.fileSize = file.size;
    document.uploadedBy = ctx.userId;
    document.uploadedAt = new Date();
    const saved = await this.documents.save(document);

    if (oldPath && oldPath !== filePath) {
      await this.deleteFileQuietly(oldPath);
    }
    await this.audit.log({
      userId: ctx.userId,
      action: existing ? 'candidate_document.replace' : 'candidate_document.upload',
      entity: 'candidate_document',
      entityId: saved.id,
      details: { candidateId, docType },
      ip: ctx.ip,
    });
    return {
      id: saved.id,
      docType: saved.docType,
      originalName: saved.originalName,
      fileSize: saved.fileSize,
      uploadedAt: saved.uploadedAt,
    };
  }

  async removeDocument(
    candidateId: string,
    docTypeRaw: string,
    ctx: RequestContext,
  ): Promise<void> {
    await this.getOrFail(candidateId);
    const docType = this.parseDocType(docTypeRaw);
    const document = await this.documents.findOne({ where: { candidateId, docType } });
    if (!document) {
      throw new NotFoundException(messages.candidate.documentNotFound);
    }
    await this.documents.remove(document);
    await this.deleteFileQuietly(document.filePath);
    await this.audit.log({
      userId: ctx.userId,
      action: 'candidate_document.delete',
      entity: 'candidate_document',
      entityId: document.id,
      details: { candidateId, docType },
      ip: ctx.ip,
    });
  }

  /** Yuklab olish uchun hujjat metasi + absolyut fayl yo'li (himoyalangan endpoint). */
  async getDocumentForDownload(
    candidateId: string,
    docTypeRaw: string,
    ctx: RequestContext,
  ): Promise<{ document: CandidateDocument; absolutePath: string }> {
    await this.getOrFail(candidateId);
    const docType = this.parseDocType(docTypeRaw);
    const document = await this.documents.findOne({ where: { candidateId, docType } });
    if (!document) {
      throw new NotFoundException(messages.candidate.documentNotFound);
    }
    // Maxfiy shaxsiy hujjatga kirish jurnalga yoziladi (admin va ekspert).
    await this.audit.log({
      userId: ctx.userId,
      action: 'candidate_document.download',
      entity: 'candidate_document',
      entityId: document.id,
      details: { candidateId, docType },
      ip: ctx.ip,
    });
    return { document, absolutePath: resolve(process.cwd(), document.filePath) };
  }

  // ---- Tayinlov ----

  /** Topshiruvchiga tayinlov biriktiradi + bir martalik kod (candidate_id ga bog'lanadi). */
  async assign(
    candidateId: string,
    dto: AssignCandidateDto,
    ctx: RequestContext,
  ): Promise<CandidateAssignmentResult> {
    await this.getOrFail(candidateId);

    // Bitta topshiruvchi = bitta tayinlov (qaror §4).
    const existing = await this.assignments.findOne({ where: { candidateId } });
    if (existing) {
      throw new BadRequestException(messages.candidate.alreadyAssigned);
    }

    await this.assertActiveTemplate(dto.templateId);
    const window = this.parseWindow(dto.startsAt, dto.endsAt);

    let assignmentId: string;
    try {
      assignmentId = await this.dataSource.transaction(async (manager) => {
        const assignment = await manager.save(
          manager.create(TestAssignment, {
            templateId: dto.templateId,
            title: dto.title,
            startsAt: window.startsAt,
            endsAt: window.endsAt,
            createdBy: ctx.userId,
            candidateId,
          }),
        );
        await this.insertCandidateCode(manager, assignment.id, candidateId);
        return assignment.id;
      });
    } catch (error) {
      // Partial unique indeks (uq_assignments_candidate) — parallel tayinlash poygasi.
      if (this.pgCode(error) === PG_UNIQUE_VIOLATION) {
        throw new BadRequestException(messages.candidate.alreadyAssigned);
      }
      throw error;
    }

    const assignment = await this.buildAssignmentView(assignmentId);
    const code = await this.codes.findOneOrFail({
      where: { assignmentId, candidateId },
    });
    await this.audit.log({
      userId: ctx.userId,
      action: 'candidate.assign',
      entity: 'test_assignment',
      entityId: assignmentId,
      details: { candidateId, templateId: dto.templateId },
      ip: ctx.ip,
    });
    return { assignment, code };
  }

  /** Tayinlovni tahrirlaydi — faqat hali sessiya ochilmagan bo'lsa (qaror §11). */
  async updateAssignment(
    candidateId: string,
    dto: UpdateCandidateAssignmentDto,
    ctx: RequestContext,
  ): Promise<CandidateAssignmentView> {
    await this.getOrFail(candidateId);
    const assignment = await this.assignments.findOne({ where: { candidateId } });
    if (!assignment) {
      throw new NotFoundException(messages.candidate.assignmentNotFound);
    }

    // Sessiya ochilgan bo'lsa (boshlangan/yakunlangan) — tahrir taqiqlanadi.
    const sessionCount = await this.sessions.count({ where: { candidateId } });
    if (sessionCount > 0) {
      throw new BadRequestException(messages.candidate.assignmentStarted);
    }

    if (dto.templateId !== undefined) {
      await this.assertActiveTemplate(dto.templateId);
      assignment.templateId = dto.templateId;
    }
    if (dto.title !== undefined) assignment.title = dto.title;

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : assignment.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : assignment.endsAt;
    if (endsAt <= startsAt) {
      throw new BadRequestException(messages.assignment.invalidWindow);
    }
    assignment.startsAt = startsAt;
    assignment.endsAt = endsAt;

    await this.assignments.save(assignment);
    await this.audit.log({
      userId: ctx.userId,
      action: 'candidate.assignment_update',
      entity: 'test_assignment',
      entityId: assignment.id,
      details: { candidateId },
      ip: ctx.ip,
    });
    return this.buildAssignmentView(assignment.id);
  }

  // ---- yordamchilar ----

  /**
   * `view` yoki `status` filtrini TypeORM WHERE shartiga aylantiradi.
   * `view` berilsa `status` e'tiborga olinmaydi.
   */
  private resolveStatusFilter(filter: CandidateFilterDto): {
    status?: CandidateStatus | ReturnType<typeof In>;
  } {
    if (filter.view === CandidateView.CURRENT) {
      return { status: In([CandidateStatus.PENDING, CandidateStatus.IN_PROGRESS]) };
    }
    if (filter.view === CandidateView.ARCHIVED) {
      return { status: In([CandidateStatus.COMPLETED, CandidateStatus.NO_SHOW]) };
    }
    return filter.status ? { status: filter.status } : {};
  }

  private async getOrFail(id: string): Promise<Candidate> {
    const candidate = await this.candidates.findOne({ where: { id } });
    if (!candidate) {
      throw new NotFoundException(messages.candidate.notFound);
    }
    return candidate;
  }

  private parseDocType(raw: string): DocumentType {
    const values = Object.values(DocumentType) as string[];
    if (!values.includes(raw)) {
      throw new BadRequestException(messages.candidate.invalidDocumentType);
    }
    return raw as DocumentType;
  }

  private async assertActiveTemplate(templateId: string): Promise<void> {
    const template = await this.templates.findOne(templateId);
    if (template.status !== TemplateStatus.ACTIVE) {
      throw new BadRequestException(messages.assignment.templateNotActive);
    }
  }

  private parseWindow(startsAt: string, endsAt: string): { startsAt: Date; endsAt: Date } {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (end <= start) {
      throw new BadRequestException(messages.assignment.invalidWindow);
    }
    return { startsAt: start, endsAt: end };
  }

  /** Candidate uchun bitta bir martalik kod yozadi (to'qnashuvda qayta urinadi). */
  private async insertCandidateCode(
    manager: EntityManager,
    assignmentId: string,
    candidateId: string,
  ): Promise<AccessCode> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const code = manager.create(AccessCode, {
          assignmentId,
          candidateId,
          code: generateAccessCode(),
          userId: null,
        });
        return await manager.save(code);
      } catch (error) {
        if (this.pgCode(error) === PG_UNIQUE_VIOLATION) {
          continue;
        }
        throw error;
      }
    }
    throw new BadRequestException(messages.assignment.codeGenerationFailed);
  }

  private async loadAssignmentsByCandidate(
    candidateIds: string[],
  ): Promise<Map<string, CandidateAssignmentView>> {
    const map = new Map<string, CandidateAssignmentView>();
    if (candidateIds.length === 0) {
      return map;
    }
    const rows = await this.assignments
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.template', 't')
      .leftJoinAndSelect('a.codes', 'c', 'c.candidate_id = a.candidate_id')
      .where('a.candidate_id IN (:...ids)', { ids: candidateIds })
      .getMany();
    for (const a of rows) {
      if (a.candidateId) {
        map.set(a.candidateId, {
          id: a.id,
          templateId: a.templateId,
          templateName: a.template?.title ?? null,
          title: a.title,
          startsAt: a.startsAt,
          endsAt: a.endsAt,
          accessCode: a.codes?.[0]?.code ?? null,
        });
      }
    }
    return map;
  }

  /**
   * Bitta tayinlov uchun to'liq kartochka ko'rinishi (template nomi va kirish kodi bilan).
   * assign/updateAssignment javoblari shu orqali quriladi — UI reload'siz darhol yangilanadi.
   */
  private async buildAssignmentView(assignmentId: string): Promise<CandidateAssignmentView> {
    const a = await this.assignments
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.template', 't')
      .leftJoinAndSelect('a.codes', 'c', 'c.candidate_id = a.candidate_id')
      .where('a.id = :id', { id: assignmentId })
      .getOneOrFail();
    return {
      id: a.id,
      templateId: a.templateId,
      templateName: a.template?.title ?? null,
      title: a.title,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      accessCode: a.codes?.[0]?.code ?? null,
    };
  }

  private async loadResult(candidateId: string): Promise<CandidateResultView | null> {
    const session = await this.sessions.findOne({
      where: { candidateId, isPreview: false },
      order: { id: 'DESC' },
    });
    if (!session || session.status === SessionStatus.IN_PROGRESS) {
      return null;
    }
    const sqIds = await this.dataSource
      .query<
        { id: string }[]
      >('SELECT id FROM session_questions WHERE session_id = $1', [session.id])
      .then((rows) => rows.map((r) => r.id));
    const totalCount = sqIds.length;
    const correctCount =
      sqIds.length > 0
        ? await this.dataSource
            .query<
              { cnt: string }[]
            >('SELECT COUNT(*)::int AS cnt FROM session_answers WHERE session_question_id = ANY($1) AND is_correct = true', [sqIds])
            .then((rows) => Number(rows[0]?.cnt ?? 0))
        : 0;

    return {
      sessionId: session.id,
      status: session.status,
      finishedAt: session.finishedAt,
      score: session.score,
      maxScore: session.maxScore,
      percent: session.percent,
      passed: session.passed,
      grade: session.grade,
      correctCount,
      totalCount,
    };
  }

  private async deleteFileQuietly(filePath: string): Promise<void> {
    try {
      await unlink(resolve(process.cwd(), filePath));
    } catch {
      // Fayl yo'q bo'lsa ham amal davom etadi (DB yozuvi yetakchi).
    }
  }

  private pgCode(error: unknown): string | undefined {
    if (error instanceof QueryFailedError) {
      return (error.driverError as { code?: string }).code;
    }
    return undefined;
  }
}
