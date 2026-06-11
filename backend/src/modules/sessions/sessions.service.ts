import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, In, QueryFailedError, Repository } from 'typeorm';
import { QuestionType } from '../../common/enums/question-type.enum';
import { SessionStatus } from '../../common/enums/session-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { ResultVisibility } from '../../common/enums/result-visibility.enum';
import { messages } from '../../i18n/uz';
import { AuthResult, AuthService } from '../auth/auth.service';
import { TestAssignment } from '../assignments/entities/test-assignment.entity';
import { AccessCode } from '../assignments/entities/access-code.entity';
import { Question } from '../questions/entities/question.entity';
import { TestTemplate } from '../templates/entities/test-template.entity';
import { TemplatesService } from '../templates/templates.service';
import { User } from '../users/entities/user.entity';
import { PreviewSessionDto } from './dto/preview-session.dto';
import { SessionFilterDto } from './dto/session-filter.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { SessionAnswer } from './entities/session-answer.entity';
import { SessionQuestion } from './entities/session-question.entity';
import { TestSession } from './entities/test-session.entity';
import { SealedQuestion, sealSession } from './session-sealing';
import {
  computeSessionScore,
  ExamineeAnswer,
  GradeBand,
  GradeOption,
  gradeQuestion,
} from './scoring';
import { generateAccessCode } from '../assignments/access-code.util';

const PG_UNIQUE_VIOLATION = '23505';

/** So'rov konteksti (audit/halollik uchun). */
export interface SessionContext {
  ip?: string | null;
  userAgent?: string | null;
}

/** session_answers.selected_options (jsonb) saqlangan tuzilma. */
interface StoredSelection {
  selectedOptionIds?: string[];
  matchPairs?: { optionId: string; value: string }[];
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

/** Topshiruvchiga ko'rsatiladigan bitta savol (to'g'ri javoblarsiz!). */
export interface ExamineeQuestionView {
  sessionQuestionId: string;
  orderIndex: number;
  type: QuestionType;
  text: string;
  points: string;
  /** Variantlar muhrlangan tartibda — faqat id va matn. */
  options: { id: string; text: string }[];
  /** matching uchun o'ng ustun qiymatlari (saralangan; juftlik oshkor etilmaydi). */
  matchOptions?: string[];
  /** Mavjud javob (refresh'da tiklash uchun). */
  answer: ExamineeAnswer | null;
}

/** Topshiruvchiga sessiya holati + savollar (to'g'ri javoblarsiz). */
export interface ExamineeSessionView {
  id: string;
  status: SessionStatus;
  startedAt: Date;
  deadlineAt: Date;
  serverNow: Date;
  remainingSeconds: number;
  tabSwitches: number;
  maxTabSwitches: number;
  questions: ExamineeQuestionView[];
}

/** Yakuniy natija (result_visibility'ga muvofiq). */
export interface SessionResultView {
  id: string;
  status: SessionStatus;
  finishedAt: Date | null;
  score: string | null;
  maxScore: string | null;
  percent: string | null;
  passed: boolean | null;
  grade: string | null;
  certificateUid: string | null;
}

/** Admin monitoring qatori. */
export interface MonitorRow {
  id: string;
  assignmentId: string;
  userId: string;
  status: SessionStatus;
  attemptNumber: number;
  isPreview: boolean;
  startedAt: Date;
  deadlineAt: Date;
  tabSwitches: number;
}

/** Ommaviy /verify natijasi (minimal ma'lumot). */
export interface CertificateView {
  fullName: string;
  testTitle: string;
  date: Date | null;
  percent: string | null;
  passed: boolean;
}

/** Terminal (yakunlangan) holatlar — urinish sifatida hisoblanadi. */
const FINISHED_STATUSES = [
  SessionStatus.COMPLETED,
  SessionStatus.EXPIRED,
  SessionStatus.TERMINATED,
];

/** Sertifikat (verify) chiqadigan holatlar. */
const CERTIFIED_STATUSES = [
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
    @InjectRepository(SessionAnswer) private readonly answers: Repository<SessionAnswer>,
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

  // ---- B qism: topshirish jarayoni ----

  /**
   * Topshiruvchiga sessiya holatini va savollarni qaytaradi (refresh'da tiklash).
   * To'g'ri javoblar (is_correct/answer_key/explanation) HECH QACHON yuborilmaydi.
   * Vaqt o'tgan bo'lsa sessiya avtomatik yakunlanadi (expired).
   */
  async getExamineeSession(sessionId: string, userId: string): Promise<ExamineeSessionView> {
    let session = await this.loadOwnedSession(sessionId, userId);
    session = await this.autoExpireIfNeeded(session);

    const assignment = await this.getAssignment(session.assignmentId);
    const template = await this.templates.findOne(assignment.templateId);
    const sqs = await this.sessionQuestions.find({
      where: { sessionId },
      relations: { question: { options: true }, answer: true },
      order: { orderIndex: 'ASC' },
    });

    const now = new Date();
    return {
      id: session.id,
      status: session.status,
      startedAt: session.startedAt,
      deadlineAt: session.deadlineAt,
      serverNow: now,
      remainingSeconds: Math.max(
        0,
        Math.floor((session.deadlineAt.getTime() - now.getTime()) / 1000),
      ),
      tabSwitches: session.tabSwitches,
      maxTabSwitches: template.maxTabSwitches,
      questions: sqs.map((sq) => this.toExamineeQuestion(sq)),
    };
  }

  /**
   * Bitta savolga javobni darhol saqlaydi (uzilishga chidamlilik).
   * Vaqt o'tgan yoki sessiya faol bo'lmasa — rad etiladi. Tekshiruv yakunda.
   */
  async submitAnswer(
    sessionId: string,
    sessionQuestionId: string,
    dto: SubmitAnswerDto,
    userId: string,
  ): Promise<{ saved: true }> {
    const session = await this.loadOwnedSession(sessionId, userId);
    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException(messages.session.notInProgress);
    }
    if (Date.now() > session.deadlineAt.getTime()) {
      // Muddat o'tgan — sessiyani yakunlaymiz va javobni rad etamiz.
      await this.finalize(session.id, SessionStatus.EXPIRED);
      throw new BadRequestException(messages.session.deadlinePassed);
    }

    const sq = await this.sessionQuestions.findOne({
      where: { id: sessionQuestionId, sessionId },
    });
    if (!sq) {
      throw new BadRequestException(messages.session.questionNotInSession);
    }

    const selectedOptions = this.buildStoredSelection(dto);
    const existing = await this.answers.findOne({ where: { sessionQuestionId } });
    if (existing) {
      existing.selectedOptions = selectedOptions;
      existing.answerText = dto.answerText ?? null;
      await this.answers.save(existing);
    } else {
      await this.answers.save(
        this.answers.create({
          sessionQuestionId,
          selectedOptions,
          answerText: dto.answerText ?? null,
        }),
      );
    }
    return { saved: true };
  }

  /**
   * Tab/oyna almashtirishni qayd etadi (atomik). Limitdan oshsa — avtoyakun
   * (terminated). Vaqt o'tgan bo'lsa — expired.
   */
  async recordTabSwitch(
    sessionId: string,
    userId: string,
  ): Promise<{ tabSwitches: number; terminated: boolean }> {
    const session = await this.loadOwnedSession(sessionId, userId);
    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException(messages.session.notInProgress);
    }
    if (Date.now() > session.deadlineAt.getTime()) {
      await this.finalize(session.id, SessionStatus.EXPIRED);
      throw new BadRequestException(messages.session.deadlinePassed);
    }

    const result = await this.sessions
      .createQueryBuilder()
      .update(TestSession)
      .set({ tabSwitches: () => 'tab_switches + 1' })
      .where('id = :id AND status = :st', { id: sessionId, st: SessionStatus.IN_PROGRESS })
      .returning('tab_switches')
      .execute();
    const raw = result.raw as { tab_switches: number }[];
    const tabSwitches = Number(raw[0]?.tab_switches ?? session.tabSwitches + 1);

    const assignment = await this.getAssignment(session.assignmentId);
    const template = await this.templates.findOne(assignment.templateId);
    if (tabSwitches > template.maxTabSwitches) {
      await this.finalize(session.id, SessionStatus.TERMINATED);
      return { tabSwitches, terminated: true };
    }
    return { tabSwitches, terminated: false };
  }

  /** Topshiruvchi sessiyani qo'lda yakunlaydi (yoki muddat o'tgan bo'lsa expired). */
  async finishByExaminee(sessionId: string, userId: string): Promise<SessionResultView> {
    const session = await this.loadOwnedSession(sessionId, userId);
    const assignment = await this.getAssignment(session.assignmentId);
    const template = await this.templates.findOne(assignment.templateId);

    if (session.status !== SessionStatus.IN_PROGRESS) {
      return this.toResultView(session, template.resultVisibility);
    }
    const finalStatus =
      Date.now() > session.deadlineAt.getTime() ? SessionStatus.EXPIRED : SessionStatus.COMPLETED;
    const finished = await this.finalize(session.id, finalStatus);
    return this.toResultView(finished, template.resultVisibility);
  }

  // ---- B qism: admin monitoring ----

  /** Jonli monitoring (standart: faol sessiyalar). */
  async monitor(filter: SessionFilterDto): Promise<MonitorRow[]> {
    const status = filter.status ?? SessionStatus.IN_PROGRESS;
    const rows = await this.sessions.find({
      where: {
        status,
        ...(filter.assignmentId ? { assignmentId: filter.assignmentId } : {}),
      },
      order: { startedAt: 'ASC' },
    });
    return rows.map((s) => ({
      id: s.id,
      assignmentId: s.assignmentId,
      userId: s.userId,
      status: s.status,
      attemptNumber: s.attemptNumber,
      isPreview: s.isPreview,
      startedAt: s.startedAt,
      deadlineAt: s.deadlineAt,
      tabSwitches: s.tabSwitches,
    }));
  }

  /** Admin uchun to'liq tahlil: har savol, berilgan va to'g'ri javob. */
  async adminGetSession(sessionId: string): Promise<unknown> {
    const session = await this.getSessionOrFail(sessionId);
    const sqs = await this.sessionQuestions.find({
      where: { sessionId },
      relations: { question: { options: true }, answer: true },
      order: { orderIndex: 'ASC' },
    });
    return {
      session,
      questions: sqs.map((sq) => {
        const q = sq.question!;
        return {
          sessionQuestionId: sq.id,
          orderIndex: sq.orderIndex,
          type: q.type,
          text: q.text,
          points: sq.points,
          isCorrect: sq.answer?.isCorrect ?? null,
          awardedPoints: sq.answer?.awardedPoints ?? null,
          givenAnswer: this.parseStoredAnswer(sq.answer),
          options: q.options.map((o) => ({
            id: o.id,
            text: o.text,
            isCorrect: o.isCorrect,
            matchPair: o.matchPair,
            orderIndex: o.orderIndex,
          })),
        };
      }),
    };
  }

  /** Admin: faol sessiyani bekor qiladi (void; urinish sifatida hisoblanmaydi). */
  async cancelSession(sessionId: string): Promise<SessionResultView> {
    const session = await this.getSessionOrFail(sessionId);
    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException(messages.session.cannotForceFinish);
    }
    await this.sessions.update(
      { id: sessionId },
      { status: SessionStatus.CANCELLED, finishedAt: new Date() },
    );
    const updated = await this.getSessionOrFail(sessionId);
    return this.toResultView(updated, ResultVisibility.IMMEDIATELY_SCORE);
  }

  /** Admin: faol sessiyani majburan to'xtatadi (mavjud javoblar bo'yicha baholanadi). */
  async terminateSession(sessionId: string): Promise<SessionResultView> {
    const finished = await this.finalize(sessionId, SessionStatus.TERMINATED);
    return this.toResultView(finished, ResultVisibility.IMMEDIATELY_SCORE);
  }

  /** Admin: qayta topshirishga ruxsat — foydalanuvchiga yangi kirish kodi beradi. */
  async allowRetry(sessionId: string): Promise<AccessCode> {
    const session = await this.getSessionOrFail(sessionId);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.codes.save(
          this.codes.create({
            assignmentId: session.assignmentId,
            userId: session.userId,
            code: generateAccessCode(),
          }),
        );
      } catch (error) {
        if (this.pgCode(error) === PG_UNIQUE_VIOLATION) {
          continue;
        }
        throw error;
      }
    }
    throw new BadRequestException(messages.assignment.codeGenerationFailed);
  }

  // ---- B qism: ommaviy verifikatsiya ----

  /** Ommaviy bayonnoma tekshiruvi (auth'siz). Topilmasa 404; minimal ma'lumot. */
  async verifyCertificate(uid: string): Promise<CertificateView> {
    // Noto'g'ri formatdagi uid uchun DB'ga bormaymiz (uuid sintaksis xatosi yo'q).
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) {
      throw new NotFoundException(messages.common.notFound);
    }
    const session = await this.sessions.findOne({
      where: {
        certificateUid: uid,
        status: In(CERTIFIED_STATUSES),
        passed: true,
        isPreview: false,
      },
    });
    if (!session) {
      throw new NotFoundException(messages.common.notFound);
    }
    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: session.userId } });
    const assignment = await this.getAssignment(session.assignmentId);
    const fullName = [user?.lastName, user?.firstName, user?.middleName]
      .filter((p) => !!p)
      .join(' ');
    return {
      fullName,
      testTitle: assignment.title,
      date: session.finishedAt,
      percent: session.percent,
      passed: true,
    };
  }

  // ---- B qism: yadro (baholash/yakunlash) ----

  /**
   * Sessiyani yakunlaydi: javoblarni baholaydi, jami ball/foiz/baho hisoblaydi,
   * statistika va (muvaffaqiyatda) certificate_uid yozadi. Idempotent —
   * faol bo'lmasa, mavjud holatni qaytaradi. Qator FOR UPDATE bilan serializatsiya.
   */
  private async finalize(sessionId: string, finalStatus: SessionStatus): Promise<TestSession> {
    return this.dataSource.transaction(async (manager) => {
      const session = await manager
        .createQueryBuilder(TestSession, 's')
        .setLock('pessimistic_write')
        .where('s.id = :id', { id: sessionId })
        .getOne();
      if (!session) {
        throw new NotFoundException(messages.session.notFound);
      }
      if (session.status !== SessionStatus.IN_PROGRESS) {
        return session; // allaqachon yakunlangan (parallel/avto-yakun)
      }

      const assignment = await manager.findOne(TestAssignment, {
        where: { id: session.assignmentId },
      });
      const template = await this.templates.findOne(assignment!.templateId);

      const sqs = await manager.find(SessionQuestion, {
        where: { sessionId },
        relations: { question: { options: true }, answer: true },
      });

      const negativePoints = Number(template.negativePoints);
      const scored: { points: number; awardedPoints: number }[] = [];
      const usedIds: string[] = [];
      const correctIds: string[] = [];

      for (const sq of sqs) {
        const question = sq.question!;
        const options: GradeOption[] = question.options.map((o) => ({
          id: o.id,
          isCorrect: o.isCorrect,
          orderIndex: o.orderIndex,
          matchPair: o.matchPair,
        }));
        const examineeAnswer = this.parseStoredAnswer(sq.answer) ?? {};
        const result = gradeQuestion(
          {
            type: question.type,
            points: Number(sq.points),
            options,
            answerKey: question.answerKey,
            partialScoring: template.partialScoring,
            negativeMarking: template.negativeMarking,
            negativePoints,
          },
          examineeAnswer,
        );

        // Javob qatorini status hali in_progress ekanida yangilaymiz (immutability
        // triggeri faqat yakunlangach bloklaydi).
        if (sq.answer) {
          await manager.update(
            SessionAnswer,
            { id: sq.answer.id },
            { isCorrect: result.isCorrect, awardedPoints: result.awardedPoints.toFixed(2) },
          );
        }
        scored.push({ points: Number(sq.points), awardedPoints: result.awardedPoints });
        usedIds.push(sq.questionId);
        if (result.isCorrect) {
          correctIds.push(sq.questionId);
        }
      }

      const gradeScale: GradeBand[] = template.gradeScale.map((g) => ({
        grade: g.grade,
        minPercent: Number(g.minPercent),
      }));
      const totals = computeSessionScore(scored, Number(template.passingScorePercent), gradeScale);
      const certificateUid = !session.isPreview && totals.passed ? randomUUID() : null;

      await manager.update(
        TestSession,
        { id: session.id },
        {
          status: finalStatus,
          finishedAt: new Date(),
          score: totals.score.toFixed(2),
          maxScore: totals.maxScore.toFixed(2),
          percent: totals.percent.toFixed(2),
          passed: totals.passed,
          grade: totals.grade,
          certificateUid,
        },
      );

      // Savol statistikasi — is_preview=true sessiyalar KIRMAYDI (qaror §3).
      if (!session.isPreview) {
        await this.bumpQuestionStats(manager, usedIds, correctIds);
      }

      return (await manager.findOne(TestSession, { where: { id: session.id } }))!;
    });
  }

  private async bumpQuestionStats(
    manager: EntityManager,
    usedIds: string[],
    correctIds: string[],
  ): Promise<void> {
    const used = [...new Set(usedIds)];
    if (used.length > 0) {
      await manager
        .createQueryBuilder()
        .update(Question)
        .set({ timesUsed: () => 'times_used + 1' })
        .whereInIds(used)
        .execute();
    }
    const correct = [...new Set(correctIds)];
    if (correct.length > 0) {
      await manager
        .createQueryBuilder()
        .update(Question)
        .set({ timesCorrect: () => 'times_correct + 1' })
        .whereInIds(correct)
        .execute();
    }
  }

  // ---- yordamchilar ----

  private async loadOwnedSession(id: string, userId: string): Promise<TestSession> {
    const session = await this.sessions.findOne({ where: { id } });
    if (!session) {
      throw new NotFoundException(messages.session.notFound);
    }
    if (session.userId !== userId) {
      throw new ForbiddenException(messages.session.notOwner);
    }
    return session;
  }

  private async getSessionOrFail(id: string): Promise<TestSession> {
    const session = await this.sessions.findOne({ where: { id } });
    if (!session) {
      throw new NotFoundException(messages.session.notFound);
    }
    return session;
  }

  private async autoExpireIfNeeded(session: TestSession): Promise<TestSession> {
    if (session.status === SessionStatus.IN_PROGRESS && Date.now() > session.deadlineAt.getTime()) {
      return this.finalize(session.id, SessionStatus.EXPIRED);
    }
    return session;
  }

  /** Saqlanadigan tanlov (jsonb) — faqat tanlov maydonlari; answerText alohida ustun. */
  private buildStoredSelection(dto: SubmitAnswerDto): StoredSelection | null {
    const stored: StoredSelection = {};
    if (dto.selectedOptionIds !== undefined) stored.selectedOptionIds = dto.selectedOptionIds;
    if (dto.matchPairs !== undefined) stored.matchPairs = dto.matchPairs;
    return Object.keys(stored).length > 0 ? stored : null;
  }

  private parseStoredAnswer(answer: SessionAnswer | null | undefined): ExamineeAnswer | null {
    if (!answer) {
      return null;
    }
    // selected_options jsonb — saqlangan tanlov; tipi serverda ma'lum (buildStoredSelection).
    const stored = answer.selectedOptions as StoredSelection | null;
    return {
      selectedOptionIds: stored?.selectedOptionIds ?? null,
      matchPairs: stored?.matchPairs ?? null,
      answerText: answer.answerText ?? null,
    };
  }

  /** session_question → topshiruvchi ko'rinishi (to'g'ri javoblarsiz). */
  private toExamineeQuestion(sq: SessionQuestion): ExamineeQuestionView {
    const question = sq.question!;
    const byId = new Map(question.options.map((o) => [o.id, o]));
    const ordered = sq.optionsOrder
      .map((id) => byId.get(id))
      .filter((o): o is NonNullable<typeof o> => !!o);

    const view: ExamineeQuestionView = {
      sessionQuestionId: sq.id,
      orderIndex: sq.orderIndex,
      type: question.type,
      text: question.text,
      points: sq.points,
      options: ordered.map((o) => ({ id: o.id, text: o.text })),
      answer: this.parseStoredAnswer(sq.answer),
    };

    if (question.type === QuestionType.MATCHING) {
      // O'ng ustun — saralangan qiymatlar (juftlik oshkor etilmaydi).
      view.matchOptions = [
        ...new Set(question.options.map((o) => o.matchPair).filter((m): m is string => !!m)),
      ].sort((a, b) => a.localeCompare(b));
    }
    return view;
  }

  private toResultView(session: TestSession, visibility: ResultVisibility): SessionResultView {
    const hide = visibility === ResultVisibility.HIDDEN;
    return {
      id: session.id,
      status: session.status,
      finishedAt: session.finishedAt,
      score: hide ? null : session.score,
      maxScore: hide ? null : session.maxScore,
      percent: hide ? null : session.percent,
      passed: hide ? null : session.passed,
      grade: hide ? null : session.grade,
      certificateUid: hide ? null : session.certificateUid,
    };
  }

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
