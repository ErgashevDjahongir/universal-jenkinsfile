import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, QueryFailedError, Repository } from 'typeorm';
import { SessionStatus } from '../../common/enums/session-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { messages } from '../../i18n/uz';
import { AuthResult, AuthService } from '../auth/auth.service';
import { TestAssignment } from '../assignments/entities/test-assignment.entity';
import { AccessCode } from '../assignments/entities/access-code.entity';
import { Question } from '../questions/entities/question.entity';
import { TestTemplate } from '../templates/entities/test-template.entity';
import { TemplatesService } from '../templates/templates.service';
import { User } from '../users/entities/user.entity';
import { PreviewSessionDto } from './dto/preview-session.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { SessionQuestion } from './entities/session-question.entity';
import { TestSession } from './entities/test-session.entity';
import { SealedQuestion, sealSession } from './session-sealing';

const PG_UNIQUE_VIOLATION = '23505';

/** So'rov konteksti (audit/halollik uchun). */
export interface SessionContext {
  ip?: string | null;
  userAgent?: string | null;
}

/** Topshiruvchiga/adminga qaytariladigan sessiya xulosasi (savol matnlarisiz). */
export interface SessionView {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  status: SessionStatus;
  attemptNumber: number;
  isPreview: boolean;
  startedAt: Date;
  deadlineAt: Date;
  questionCount: number;
  timeLimitMinutes: number;
}

/** Kod orqali kirish natijasi: token juftligi + sessiya xulosasi. */
export interface StartSessionResult extends AuthResult {
  session: SessionView;
}

/** Terminal (yakunlangan) holatlar — urinish sifatida hisoblanadi. */
const FINISHED_STATUSES = [
  SessionStatus.COMPLETED,
  SessionStatus.EXPIRED,
  SessionStatus.TERMINATED,
];

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(TestSession) private readonly sessions: Repository<TestSession>,
    @InjectRepository(SessionQuestion)
    private readonly sessionQuestions: Repository<SessionQuestion>,
    @InjectRepository(AccessCode) private readonly codes: Repository<AccessCode>,
    @InjectRepository(TestAssignment) private readonly assignments: Repository<TestAssignment>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    private readonly templates: TemplatesService,
    private readonly auth: AuthService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Kod orqali kirish va sessiya ochish (qaror §6).
   * Kod haqiqiyligini tekshiradi, kerak bo'lsa examinee yaratadi, savollarni
   * muhrlaydi va token juftligi qaytaradi. Kod ATOMIK iste'mol qilinadi.
   */
  async startByCode(dto: StartSessionDto, ctx: SessionContext): Promise<StartSessionResult> {
    const code = await this.codes.findOne({ where: { code: dto.code } });
    if (!code) {
      throw new BadRequestException(messages.accessCode.invalid);
    }
    if (code.usedAt !== null) {
      throw new BadRequestException(messages.accessCode.alreadyUsed);
    }

    const assignment = await this.getAssignment(code.assignmentId);
    this.assertWindowOpen(assignment);

    const template = await this.templates.findOne(assignment.templateId);

    // Kodga oldindan biriktirilgan foydalanuvchi bo'lsa — uni ishlatamiz, F.I.Sh.
    // so'ralmaydi; aks holda anonim kod uchun yangi examinee yaratiladi.
    const assignedUser = code.userId ? await this.loadActiveUser(code.userId) : null;
    if (!assignedUser) {
      this.assertRegistrationFields(dto);
    }

    if (assignedUser) {
      await this.assertAttemptsAllowed(assignment.id, assignedUser.id, template);
    }

    const excludeIds = await this.previousQuestionIds(assignment.id, assignedUser?.id, template);
    const sealed = await this.selectAndSeal(template, excludeIds);

    const { session, user } = await this.dataSource.transaction(async (manager) => {
      const examinee = assignedUser ?? (await this.createExaminee(manager, dto));

      // Kodni atomik iste'mol qilamiz: faqat hali ishlatilmagan bo'lsa.
      const consumed = await manager
        .createQueryBuilder()
        .update(AccessCode)
        .set({ usedAt: () => 'now()', userId: examinee.id })
        .where('id = :id AND used_at IS NULL', { id: code.id })
        .execute();
      if (consumed.affected !== 1) {
        throw new BadRequestException(messages.accessCode.alreadyUsed);
      }

      const attemptNumber = await this.nextAttemptNumber(manager, assignment.id, examinee.id);
      const created = await this.persistSession(manager, {
        assignmentId: assignment.id,
        userId: examinee.id,
        attemptNumber,
        isPreview: false,
        template,
        sealed,
        ctx,
      });
      return { session: created, user: examinee };
    });

    const tokens = await this.auth.issueForUser(user);
    return { ...tokens, session: this.toView(session, assignment, sealed.length) };
  }

  /**
   * Sinov (preview) sessiyasi — faqat admin (qaror §3).
   * Faollik oynasi va urinishlar limiti tekshirilmaydi; statistikaga kirmaydi.
   */
  async startPreview(
    dto: PreviewSessionDto,
    user: { id: string; role: UserRole },
    ctx: SessionContext,
  ): Promise<SessionView> {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new BadRequestException(messages.session.previewOnlyAdmin);
    }
    const assignment = await this.getAssignment(dto.assignmentId);
    const template = await this.templates.findOne(assignment.templateId);
    const sealed = await this.selectAndSeal(template, []);

    const session = await this.dataSource.transaction(async (manager) => {
      const attemptNumber = await this.nextAttemptNumber(manager, assignment.id, user.id);
      return this.persistSession(manager, {
        assignmentId: assignment.id,
        userId: user.id,
        attemptNumber,
        isPreview: true,
        template,
        sealed,
        ctx,
      });
    });

    return this.toView(session, assignment, sealed.length);
  }

  // ---- yordamchilar ----

  private async getAssignment(id: string): Promise<TestAssignment> {
    const assignment = await this.assignments.findOne({ where: { id } });
    if (!assignment) {
      throw new NotFoundException(messages.assignment.notFound);
    }
    return assignment;
  }

  private assertWindowOpen(assignment: TestAssignment): void {
    const now = Date.now();
    if (now < assignment.startsAt.getTime()) {
      throw new BadRequestException(messages.accessCode.windowNotOpen);
    }
    if (now > assignment.endsAt.getTime()) {
      throw new BadRequestException(messages.accessCode.windowClosed);
    }
  }

  private assertRegistrationFields(dto: StartSessionDto): void {
    if (!dto.lastName || !dto.firstName || !dto.phone) {
      throw new BadRequestException(messages.session.registrationRequired);
    }
  }

  private async loadActiveUser(id: string): Promise<User> {
    const user = await this.dataSource.getRepository(User).findOne({ where: { id } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(messages.accessCode.invalid);
    }
    return user;
  }

  /** Urinishlar limiti va interval (qaror: preview hisoblanmaydi). */
  private async assertAttemptsAllowed(
    assignmentId: string,
    userId: string,
    template: TestTemplate,
  ): Promise<void> {
    const finished = await this.sessions.find({
      where: {
        assignmentId,
        userId,
        isPreview: false,
        status: In(FINISHED_STATUSES),
      },
      select: { finishedAt: true },
    });
    if (finished.length >= template.maxAttempts) {
      throw new BadRequestException(messages.accessCode.maxAttempts);
    }
    if (template.attemptIntervalMinutes > 0 && finished.length > 0) {
      const lastFinished = finished
        .map((s) => s.finishedAt?.getTime() ?? 0)
        .reduce((a, b) => Math.max(a, b), 0);
      const nextAllowed = lastFinished + template.attemptIntervalMinutes * 60_000;
      if (Date.now() < nextAllowed) {
        throw new BadRequestException(messages.accessCode.intervalNotPassed);
      }
    }
  }

  /** Avvalgi urinish savollari (yumshoq istisno; qaror §8). */
  private async previousQuestionIds(
    assignmentId: string,
    userId: string | undefined,
    template: TestTemplate,
  ): Promise<string[]> {
    if (!template.avoidRepeatQuestions || !userId) {
      return [];
    }
    const prior = await this.sessions.find({
      where: { assignmentId, userId },
      select: { id: true },
    });
    if (prior.length === 0) {
      return [];
    }
    const rows = await this.sessionQuestions.find({
      where: { sessionId: In(prior.map((s) => s.id)) },
      select: { questionId: true },
    });
    return [...new Set(rows.map((r) => r.questionId))];
  }

  /**
   * Shablon bo'yicha savollarni tanlaydi va muhrlaydi (tartib + variantlar + ball).
   * Bank yetmasa TemplatesService xato qaytaradi (qaror §8 qattiq holat).
   */
  private async selectAndSeal(
    template: TestTemplate,
    excludeIds: string[],
  ): Promise<SealedQuestion[]> {
    const questionIds = await this.templates.selectForSession(template.id, {
      excludeQuestionIds: excludeIds,
    });

    const questions = await this.questions.find({
      where: { id: In(questionIds) },
      relations: { options: true },
    });
    const byId = new Map(questions.map((q) => [q.id, q]));
    const overrides = new Map(template.fixedQuestions.map((f) => [f.questionId, f.pointsOverride]));

    const inputs = questionIds.map((id) => {
      const question = byId.get(id);
      if (!question) {
        // selectForSession faqat mavjud/faol savol qaytaradi — bu yetib bo'lmas holat.
        throw new NotFoundException(messages.question.notFound);
      }
      const override = overrides.get(id);
      const points = override ?? question.points;
      const optionIds = [...question.options]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((o) => o.id);
      return { questionId: id, points, optionIds };
    });

    return sealSession({
      questions: inputs,
      shuffleQuestions: template.shuffleQuestions,
      shuffleOptions: template.shuffleOptions,
    });
  }

  /** (assignment, user) bo'yicha keyingi attempt_number (preview ham hisobga olinadi). */
  private async nextAttemptNumber(
    manager: EntityManager,
    assignmentId: string,
    userId: string,
  ): Promise<number> {
    const count = await manager.getRepository(TestSession).count({
      where: { assignmentId, userId },
    });
    return count + 1;
  }

  private async createExaminee(manager: EntityManager, dto: StartSessionDto): Promise<User> {
    const user = manager.create(User, {
      lastName: dto.lastName as string,
      firstName: dto.firstName as string,
      middleName: dto.middleName ?? null,
      phone: dto.phone ?? null,
      role: UserRole.EXAMINEE,
      status: UserStatus.ACTIVE,
    });
    return manager.save(user);
  }

  /** Sessiyani va muhrlangan savollarni yozadi; parallel sessiyada 409 (qaror §9). */
  private async persistSession(
    manager: EntityManager,
    params: {
      assignmentId: string;
      userId: string;
      attemptNumber: number;
      isPreview: boolean;
      template: TestTemplate;
      sealed: SealedQuestion[];
      ctx: SessionContext;
    },
  ): Promise<TestSession> {
    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + params.template.timeLimitMinutes * 60_000);

    const session = manager.create(TestSession, {
      assignmentId: params.assignmentId,
      userId: params.userId,
      attemptNumber: params.attemptNumber,
      status: SessionStatus.IN_PROGRESS,
      startedAt,
      deadlineAt,
      isPreview: params.isPreview,
      tabSwitches: 0,
      ipAddress: params.ctx.ip ?? null,
      userAgent: params.ctx.userAgent ?? null,
    });

    let saved: TestSession;
    try {
      saved = await manager.save(session);
    } catch (error) {
      if (this.pgCode(error) === PG_UNIQUE_VIOLATION) {
        throw new ConflictException(messages.session.alreadyInProgress);
      }
      throw error;
    }

    const rows = params.sealed.map((s) =>
      manager.create(SessionQuestion, {
        sessionId: saved.id,
        questionId: s.questionId,
        orderIndex: s.orderIndex,
        points: s.points,
        optionsOrder: s.optionsOrder,
      }),
    );
    await manager.save(rows);
    return saved;
  }

  private toView(
    session: TestSession,
    assignment: TestAssignment,
    questionCount: number,
  ): SessionView {
    return {
      id: session.id,
      assignmentId: session.assignmentId,
      assignmentTitle: assignment.title,
      status: session.status,
      attemptNumber: session.attemptNumber,
      isPreview: session.isPreview,
      startedAt: session.startedAt,
      deadlineAt: session.deadlineAt,
      questionCount,
      timeLimitMinutes: Math.round(
        (session.deadlineAt.getTime() - session.startedAt.getTime()) / 60_000,
      ),
    };
  }

  private pgCode(error: unknown): string | undefined {
    if (error instanceof QueryFailedError) {
      return (error.driverError as { code?: string }).code;
    }
    return undefined;
  }
}
