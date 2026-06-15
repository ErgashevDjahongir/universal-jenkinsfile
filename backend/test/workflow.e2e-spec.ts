import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/common/enums/user-role.enum';
import { UserStatus } from '../src/common/enums/user-status.enum';
import { QuestionType } from '../src/common/enums/question-type.enum';
import { User } from '../src/modules/users/entities/user.entity';
import { Subject } from '../src/modules/subjects/entities/subject.entity';
import { Question } from '../src/modules/questions/entities/question.entity';
import { ExpertSubject } from '../src/modules/subjects/entities/expert-subject.entity';
import { InterviewQuestion } from '../src/modules/interview-questions/entities/interview-question.entity';
import { TestTemplate } from '../src/modules/templates/entities/test-template.entity';
import { TestSession } from '../src/modules/sessions/entities/test-session.entity';
import { TestAssignment } from '../src/modules/assignments/entities/test-assignment.entity';
import { Candidate } from '../src/modules/candidates/entities/candidate.entity';
import { Department } from '../src/modules/users/entities/department.entity';
import { Position } from '../src/modules/users/entities/position.entity';

/**
 * To'liq ish oqimi (E2E) — haqiqiy Postgres (5433) + Redis.
 * Barcha ma'lumotlar `e2e_wf_` prefiksi bilan yaratiladi, afterAll'da tozalanadi.
 */
describe('Full workflow (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication;
  let ds: DataSource;

  // ---- shared state ----
  let adminToken: string;
  let adminLogin: string;

  let deptId: string;
  let posId: string;
  let subjectId: string;

  let expertId: string;
  let expertToken: string;
  let expertLogin: string;

  // 6 savol (0=SC, 1=MC, 2=TF, 3=MAT, 4=ORD, 5=SA)
  let questionIds: string[] = [];
  let iqId: string;

  let insufficientTemplateId: string;
  let templateId: string;

  let candidateId: string;
  let accessCode: string;
  let sessionId: string;
  let examineeToken: string;
  let examineeUserId: string;
  let certificateUid: string;

  let candidateId2: string;
  let accessCode2: string;
  let sessionId2: string;
  let examineeToken2: string;
  let examineeUserId2: string;

  // -----------------------------------------------------------------------

  async function apiLogin(login: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login, password })
      .expect(200);
    return res.body.accessToken as string;
  }

  // -----------------------------------------------------------------------

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    ds = app.get(DataSource);

    // Admin foydalanuvchini to'g'ridan-to'g'ri DB'ga qo'shamiz (bcrypt cost=4 tezlik uchun).
    adminLogin = `e2e_wf_admin_${Date.now()}`;
    const repo = ds.getRepository(User);
    await repo.save(
      repo.create({
        lastName: 'E2E_WF',
        firstName: 'Admin',
        login: adminLogin,
        passwordHash: await bcrypt.hash('WfAdminPass1', 4),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );

    adminToken = await apiLogin(adminLogin, 'WfAdminPass1');
  }, 30000);

  afterAll(async () => {
    if (ds?.isInitialized) {
      // 1. Sessiyalarni o'chiramiz (session_questions va session_answers CASCADE).
      const sessionIds = [sessionId, sessionId2].filter(Boolean);
      if (sessionIds.length > 0) {
        await ds.getRepository(TestSession).delete({ id: In(sessionIds) });
      }

      // 2. Tayinlovlarni o'chiramiz (access_codes CASCADE).
      const cIds = [candidateId, candidateId2].filter(Boolean);
      if (cIds.length > 0) {
        await ds.getRepository(TestAssignment).delete({ candidateId: In(cIds) });
      }

      // 3. Shablonlarni o'chiramiz (fixed_questions, selection_rules CASCADE).
      const tplIds = [templateId, insufficientTemplateId].filter(Boolean);
      if (tplIds.length > 0) {
        await ds.getRepository(TestTemplate).delete({ id: In(tplIds) });
      }

      // 4. Examinee foydalanuvchilarini o'chiramiz.
      const examIds = [examineeUserId, examineeUserId2].filter(Boolean);
      if (examIds.length > 0) {
        await ds.getRepository(User).delete({ id: In(examIds) });
      }

      // 5. Nomzodlarni o'chiramiz.
      if (cIds.length > 0) {
        await ds.getRepository(Candidate).delete({ id: In(cIds) });
      }

      // 6. Savollarni o'chiramiz.
      if (subjectId) {
        await ds.getRepository(Question).delete({ subjectId });
        await ds.getRepository(InterviewQuestion).delete({ subjectId });
      }

      // 7. Ekspert fanlarini uzib, fanni o'chiramiz.
      if (expertId) {
        await ds.getRepository(ExpertSubject).delete({ userId: expertId });
      }
      if (subjectId) {
        await ds.getRepository(Subject).delete({ id: subjectId });
      }

      // 8. Foydalanuvchilarni o'chiramiz.
      if (expertLogin) await ds.getRepository(User).delete({ login: expertLogin });
      if (adminLogin) await ds.getRepository(User).delete({ login: adminLogin });

      // 9. Lavozim va bo'limni o'chiramiz.
      if (posId) await ds.getRepository(Position).delete({ id: posId });
      if (deptId) await ds.getRepository(Department).delete({ id: deptId });
    }
    await app?.close();
  });

  // ======================================================================
  // PART 1 — To'liq ish oqimi (happy path)
  // ======================================================================

  // Step 1: Admin kirishi
  it('1. admin login → adminToken', async () => {
    // Already done in beforeAll; re-verify token works.
    const res = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // Step 2: Bo'lim yaratish
  it("2. POST /api/departments → bo'lim yaratildi", async () => {
    const res = await request(app.getHttpServer())
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `e2e_wf_dept_${Date.now()}` })
      .expect(201);
    expect(res.body.id).toBeDefined();
    deptId = res.body.id as string;
  });

  // Step 3: Lavozim yaratish
  it('3. POST /api/positions → lavozim yaratildi', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/positions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `e2e_wf_pos_${Date.now()}`, departmentId: deptId })
      .expect(201);
    expect(res.body.id).toBeDefined();
    posId = res.body.id as string;
  });

  // Step 4: Fan yaratish
  it('4. POST /api/subjects → fan yaratildi', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `e2e_wf_subject_${Date.now()}` })
      .expect(201);
    expect(res.body.id).toBeDefined();
    subjectId = res.body.id as string;
  });

  // Step 5: Ekspert foydalanuvchini yaratish
  it('5. POST /api/users (expert) → expertId, expertToken', async () => {
    expertLogin = `e2e_wf_expert_${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        lastName: 'E2E_WF',
        firstName: 'Expert',
        login: expertLogin,
        password: 'ExpertPass1',
        role: UserRole.EXPERT,
        departmentId: deptId,
        positionId: posId,
      })
      .expect(201);
    expect(res.body.id).toBeDefined();
    expertId = res.body.id as string;
    expertToken = await apiLogin(expertLogin, 'ExpertPass1');
  });

  // Step 6: Ekspertni fanga biriktirish
  it('6. PUT /api/experts/:id/subjects → ekspert fanga biriktirildi', async () => {
    await request(app.getHttpServer())
      .put(`/api/experts/${expertId}/subjects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subjectIds: [subjectId] })
      .expect(200);
  });

  // Step 7: 6 xil turdagi savollarni yaratish
  it('7. POST /api/questions × 6 → draft savollar', async () => {
    const server = app.getHttpServer();
    const ts = () => Date.now(); // noyob matn uchun

    // 0 — single_choice
    const sc = await request(server)
      .post('/api/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subjectId,
        type: QuestionType.SINGLE_CHOICE,
        text: `SC_${ts()}`,
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
      })
      .expect(201);
    expect(sc.body.status).toBe('draft');
    questionIds.push(sc.body.id as string);

    // 1 — multiple_choice
    const mc = await request(server)
      .post('/api/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subjectId,
        type: QuestionType.MULTIPLE_CHOICE,
        text: `MC_${ts()}`,
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: true },
          { text: 'C', isCorrect: false },
        ],
      })
      .expect(201);
    questionIds.push(mc.body.id as string);

    // 2 — true_false
    const tf = await request(server)
      .post('/api/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subjectId,
        type: QuestionType.TRUE_FALSE,
        text: `TF_${ts()}`,
        options: [
          { text: "To'g'ri", isCorrect: true },
          { text: 'Xato', isCorrect: false },
        ],
      })
      .expect(201);
    questionIds.push(tf.body.id as string);

    // 3 — matching
    const mat = await request(server)
      .post('/api/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subjectId,
        type: QuestionType.MATCHING,
        text: `MAT_${ts()}`,
        options: [
          { text: 'Q1', isCorrect: false, matchPair: 'A1' },
          { text: 'Q2', isCorrect: false, matchPair: 'A2' },
        ],
      })
      .expect(201);
    questionIds.push(mat.body.id as string);

    // 4 — ordering
    const ord = await request(server)
      .post('/api/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subjectId,
        type: QuestionType.ORDERING,
        text: `ORD_${ts()}`,
        options: [
          { text: 'Step1', orderIndex: 0 },
          { text: 'Step2', orderIndex: 1 },
        ],
      })
      .expect(201);
    questionIds.push(ord.body.id as string);

    // 5 — short_answer (answerKey='javob' bilan)
    const sa = await request(server)
      .post('/api/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subjectId,
        type: QuestionType.SHORT_ANSWER,
        text: `SA_${ts()}`,
        answerKey: 'javob',
      })
      .expect(201);
    questionIds.push(sa.body.id as string);

    expect(questionIds).toHaveLength(6);
  });

  // Step 8: Barcha savollarni tasdiqlash
  it('8. POST /api/questions/:id/approve × 6 → approved', async () => {
    const server = app.getHttpServer();
    for (const id of questionIds) {
      const res = await request(server)
        .post(`/api/questions/${id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(res.body.status).toBe('approved');
    }
  });

  // Step 9: Barcha savollarni faollashtirish
  it('9. POST /api/questions/:id/activate × 6 → active', async () => {
    const server = app.getHttpServer();
    for (const id of questionIds) {
      const res = await request(server)
        .post(`/api/questions/${id}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(res.body.status).toBe('active');
    }
  });

  // Step 10: Suhbat savolini yaratish
  it('10. POST /api/interview-questions → iqId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/interview-questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subjectId,
        questionText: 'Suhbat savoli',
        expectedAnswer: 'Javob',
      })
      .expect(201);
    expect(res.body.id).toBeDefined();
    iqId = res.body.id as string;
  });

  // Step 11: Yetarli savol bo'lmagan shablonni faollashtirish → 400
  it("11. yetarli savol bo'lmagan shablon activate qilinmaydi → 400", async () => {
    const server = app.getHttpServer();

    // 10 ta savol talab qilamiz, bankda faqat 6 ta bor.
    const tplRes = await request(server)
      .post('/api/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `e2e_wf_insufficient_${Date.now()}`,
        timeLimitMinutes: 30,
        passingScorePercent: 50,
        resultVisibility: 'immediately_full',
        selectionRules: [{ subjectId, questionCount: 10 }],
      })
      .expect(201);
    insufficientTemplateId = tplRes.body.id as string;

    await request(server)
      .post(`/api/templates/${insufficientTemplateId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  // Step 12: Ishlaydigan shablonni yaratish
  it('12. POST /api/templates → ishlaydigan shablon yaratildi', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `e2e_wf_template_${Date.now()}`,
        timeLimitMinutes: 60,
        passingScorePercent: 50,
        resultVisibility: 'immediately_full',
        shuffleQuestions: false,
        shuffleOptions: false,
        // 1 ta majburiy savol + 3 ta avtomatik (bankda 6 ta, 1 tasi fixed = 5 qoladi, 3 tanlaydi)
        fixedQuestions: [{ questionId: questionIds[0] }],
        selectionRules: [{ subjectId, questionCount: 3 }],
      })
      .expect(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('draft');
    templateId = res.body.id as string;
  });

  // Step 13: Ishlaydigan shablonni faollashtirish
  it('13. POST /api/templates/:id/activate → active', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/templates/${templateId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    expect(res.body.status).toBe('active');
  });

  // Step 14: Nomzod yaratish
  it('14. POST /api/candidates → candidateId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'E2E Topshiruvchi', phone: '+998900000001' })
      .expect(201);
    expect(res.body.id).toBeDefined();
    candidateId = res.body.id as string;
  });

  // Step 15: Nomzodni tayinlash → accessCode
  it('15. POST /api/candidates/:id/assignment → accessCode', async () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 soat oldin
    const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 soat keyin

    const res = await request(app.getHttpServer())
      .post(`/api/candidates/${candidateId}/assignment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        templateId,
        title: 'E2E Tayinlov',
        startsAt,
        endsAt,
      })
      .expect(201);

    expect(res.body.assignment).toBeDefined();
    expect(res.body.code).toBeDefined();
    expect(res.body.code.code).toBeDefined();
    accessCode = res.body.code.code as string;
  });

  // Step 16: Topshiruvchi kod bilan kirishi → examineeToken, sessionId
  it('16. POST /api/sessions/start (kod bilan) → examineeToken, sessionId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/sessions/start')
      .send({ code: accessCode })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe(UserRole.EXAMINEE);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.id).toBeDefined();

    examineeToken = res.body.accessToken as string;
    sessionId = res.body.session.id as string;
    examineeUserId = res.body.user.id as string;
  });

  // Step 18: Sessiya holati → ready
  it("18. GET /api/sessions/:id → status 'ready'", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${examineeToken}`)
      .expect(200);

    expect(res.body.status).toBe('ready');
    expect(res.body.startedAt).toBeNull();
    expect(res.body.deadlineAt).toBeNull();
    // ready holatda savol matnlari yuborilmaydi
    expect(res.body.questions).toHaveLength(0);
    expect(res.body.questionCount).toBeGreaterThan(0);
  });

  // Step 19: Testni boshlash → in_progress, startedAt yozildi
  it("19. POST /api/sessions/:id/begin → status 'in_progress', startedAt set", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/sessions/${sessionId}/begin`)
      .set('Authorization', `Bearer ${examineeToken}`)
      .expect(200);

    expect(res.body.status).toBe('in_progress');
    expect(res.body.startedAt).not.toBeNull();
    expect(res.body.deadlineAt).not.toBeNull();
    expect(res.body.questions.length).toBe(4); // 1 fixed + 3 from rules
  });

  // Step 20: Har bir savol uchun javob yuborish
  it('20. POST /api/sessions/:id/answers/:sqId × 4 → {saved: true}', async () => {
    const server = app.getHttpServer();

    // Sessiya savollarini olamiz
    const sessionRes = await request(server)
      .get(`/api/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${examineeToken}`)
      .expect(200);

    const sqs = sessionRes.body.questions as Array<{
      sessionQuestionId: string;
      type: string;
      options: Array<{ id: string; text: string }>;
      matchOptions?: string[];
    }>;

    expect(sqs.length).toBe(4);

    for (const sq of sqs) {
      let body: Record<string, unknown> = {};

      if (sq.type === QuestionType.SINGLE_CHOICE) {
        // To'g'ri variant text='A'
        const opt = sq.options.find((o) => o.text === 'A');
        expect(opt).toBeDefined();
        body = { selectedOptionIds: [opt!.id] };
      } else if (sq.type === QuestionType.MULTIPLE_CHOICE) {
        // To'g'ri variantlar text='A' va text='B'
        const opts = sq.options.filter((o) => o.text === 'A' || o.text === 'B');
        expect(opts.length).toBe(2);
        body = { selectedOptionIds: opts.map((o) => o.id) };
      } else if (sq.type === QuestionType.TRUE_FALSE) {
        // To'g'ri variant text="To'g'ri"
        const opt = sq.options.find((o) => o.text === "To'g'ri");
        expect(opt).toBeDefined();
        body = { selectedOptionIds: [opt!.id] };
      } else if (sq.type === QuestionType.MATCHING) {
        // Q1→A1, Q2→A2 juftliklari
        const q1 = sq.options.find((o) => o.text === 'Q1');
        const q2 = sq.options.find((o) => o.text === 'Q2');
        expect(q1).toBeDefined();
        expect(q2).toBeDefined();
        body = {
          matchPairs: [
            { optionId: q1!.id, value: 'A1' },
            { optionId: q2!.id, value: 'A2' },
          ],
        };
      } else if (sq.type === QuestionType.ORDERING) {
        // To'g'ri tartib: Step1 → Step2 (orderIndex 0 → 1)
        const step1 = sq.options.find((o) => o.text === 'Step1');
        const step2 = sq.options.find((o) => o.text === 'Step2');
        expect(step1).toBeDefined();
        expect(step2).toBeDefined();
        body = { selectedOptionIds: [step1!.id, step2!.id] };
      } else if (sq.type === QuestionType.SHORT_ANSWER) {
        // answerKey='javob' bilan mos keluvchi javob
        body = { answerText: 'javob' };
      }

      const answerRes = await request(server)
        .post(`/api/sessions/${sessionId}/answers/${sq.sessionQuestionId}`)
        .set('Authorization', `Bearer ${examineeToken}`)
        .send(body)
        .expect(200);

      expect(answerRes.body.saved).toBe(true);
    }
  });

  // Step 21: Topshiruvchi javobida isCorrect/answerKey bo'lmasligini tekshirish
  it("21. savollar javobida isCorrect maydoni yo'q (xavfsizlik)", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${examineeToken}`)
      .expect(200);

    const sqs = res.body.questions as Array<{
      options: Array<Record<string, unknown>>;
    }>;

    for (const sq of sqs) {
      for (const opt of sq.options) {
        expect(opt).not.toHaveProperty('isCorrect');
        expect(opt).not.toHaveProperty('answerKey');
      }
    }
  });

  // Step 22: Sessiyani yakunlash → completed, score > 0, passed
  it('22. POST /api/sessions/:id/finish → completed, score > 0, passed', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/sessions/${sessionId}/finish`)
      .set('Authorization', `Bearer ${examineeToken}`)
      .expect(200);

    expect(res.body.status).toBe('completed');
    expect(parseFloat(res.body.score)).toBeGreaterThan(0);
    expect(parseFloat(res.body.percent)).toBeGreaterThan(0);
    expect(res.body.passed).toBe(true);
    expect(res.body.certificateUid).toBeDefined();
    certificateUid = res.body.certificateUid as string;
  });

  // Step 23: Sertifikatni verifikatsiya qilish (autentikaciasiz)
  it('23. GET /api/verify/:uid → 200, fullName va passed:true', async () => {
    const res = await request(app.getHttpServer()).get(`/api/verify/${certificateUid}`).expect(200);

    expect(res.body.fullName).toBeDefined();
    expect(res.body.passed).toBe(true);
    expect(res.body.percent).toBeDefined();
  });

  // ======================================================================
  // PART 2 — Muddati o'tgan sessiya stsenariysi
  // ======================================================================

  // Step 24: Ikkinchi nomzod yaratish
  it('24. POST /api/candidates → candidateId2', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'E2E Topshiruvchi2', phone: '+998900000002' })
      .expect(201);
    candidateId2 = res.body.id as string;
  });

  // Step 25: Ikkinchi nomzodni tayinlash
  it('25. POST /api/candidates/:id/assignment → accessCode2', async () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app.getHttpServer())
      .post(`/api/candidates/${candidateId2}/assignment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        templateId,
        title: 'E2E Tayinlov 2',
        startsAt,
        endsAt,
      })
      .expect(201);

    accessCode2 = res.body.code.code as string;
  });

  // Step 26: Ikkinchi sessiyani boshlash
  it('26. start + begin ikkinchi sessiya → in_progress', async () => {
    const server = app.getHttpServer();

    const startRes = await request(server)
      .post('/api/sessions/start')
      .send({ code: accessCode2 })
      .expect(200);

    examineeToken2 = startRes.body.accessToken as string;
    sessionId2 = startRes.body.session.id as string;
    examineeUserId2 = startRes.body.user.id as string;

    const beginRes = await request(server)
      .post(`/api/sessions/${sessionId2}/begin`)
      .set('Authorization', `Bearer ${examineeToken2}`)
      .expect(200);

    expect(beginRes.body.status).toBe('in_progress');
  });

  // Step 27: deadline_at ni o'tib ketgan vaqtga o'zgartirish (to'g'ridan-to'g'ri DB)
  it("27. deadline_at ni o'tgan vaqtga o'rnatish (DB to'g'ridan-to'g'ri)", async () => {
    await ds.query(
      `UPDATE test_sessions SET deadline_at = NOW() - INTERVAL '1 hour' WHERE id = $1`,
      [sessionId2],
    );
    // Tasdiqlash
    const rows = await ds.query<{ deadline_at: Date }[]>(
      'SELECT deadline_at FROM test_sessions WHERE id = $1',
      [sessionId2],
    );
    expect(rows[0].deadline_at.getTime()).toBeLessThan(Date.now());
  });

  // Step 28: Muddati o'tgan sessiyani yakunlash → expired
  it("28. POST /api/sessions/:id/finish → status 'expired', score=0, passed=false", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/sessions/${sessionId2}/finish`)
      .set('Authorization', `Bearer ${examineeToken2}`)
      .expect(200);

    expect(res.body.status).toBe('expired');
    // expired sessiyada ball 0 (javoblar baholanmadi)
    expect(parseFloat(res.body.score ?? '0')).toBe(0);
    expect(res.body.passed).toBe(false);
  });

  // ======================================================================
  // PART 3 — Xavfsizlik E2E testlari
  // ======================================================================

  // Step 29: Topshiruvchi suhbat savollarini ko'ra olmaydi → 403
  it('29. GET /api/interview-questions (examineeToken) → 403', async () => {
    await request(app.getHttpServer())
      .get('/api/interview-questions')
      .set('Authorization', `Bearer ${examineeToken}`)
      .expect(403);
  });

  // Step 30: Topshiruvchi nomzodlar ro'yxatini ko'ra olmaydi → 403
  it('30. GET /api/candidates (examineeToken) → 403', async () => {
    await request(app.getHttpServer())
      .get('/api/candidates')
      .set('Authorization', `Bearer ${examineeToken}`)
      .expect(403);
  });

  // Step 31: Topshiruvchi boshqa sessiyaga kira olmaydi → 403
  it('31. GET /api/sessions/:sessionId (examineeToken2 → session1) → 403', async () => {
    await request(app.getHttpServer())
      .get(`/api/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${examineeToken2}`)
      .expect(403);
  });

  // Step 32: Ekspert nomzod yarata olmaydi → 403
  it('32. POST /api/candidates (expertToken) → 403', async () => {
    await request(app.getHttpServer())
      .post('/api/candidates')
      .set('Authorization', `Bearer ${expertToken}`)
      .send({ fullName: 'Bloklangan', phone: '+998900000003' })
      .expect(403);
  });

  // Step 33: Ekspert suhbat savoli yarata olmaydi → 403
  it('33. POST /api/interview-questions (expertToken) → 403', async () => {
    await request(app.getHttpServer())
      .post('/api/interview-questions')
      .set('Authorization', `Bearer ${expertToken}`)
      .send({ subjectId, questionText: 'Test', expectedAnswer: 'Javob' })
      .expect(403);
  });

  // Step 34: Ekspert hujjat yuklay olmaydi → 403
  it('34. POST /api/candidates/:id/documents/recommendation (expertToken) → 403', async () => {
    await request(app.getHttpServer())
      .post(`/api/candidates/${candidateId}/documents/recommendation`)
      .set('Authorization', `Bearer ${expertToken}`)
      .expect(403);
  });

  // Step 35: Ekspert nomzodlar ro'yxatini ko'ra oladi → 200
  it('35. GET /api/candidates (expertToken) → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/candidates')
      .set('Authorization', `Bearer ${expertToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // Step 36: Hujjatni yuklab olish autentifikatsiyasiz → 401
  it("36. GET /api/candidates/:id/documents/recommendation/download (token yo'q) → 401", async () => {
    await request(app.getHttpServer())
      .get(`/api/candidates/${candidateId}/documents/recommendation/download`)
      .expect(401);
  });

  // Step 37: Bir marta ishlatilgan kodni qayta ishlatish → 400
  it('37. POST /api/sessions/start (ishlatilgan kod) → 400', async () => {
    // accessCode allaqachon ishlatilgan (step 16'da)
    await request(app.getHttpServer())
      .post('/api/sessions/start')
      .send({ code: accessCode })
      .expect(400);
  });

  // Step 38: Mavjud bo'lmagan sertifikatni tekshirish → 404
  it('38. GET /api/verify/nonexistent-uid-12345 → 404', async () => {
    await request(app.getHttpServer()).get('/api/verify/nonexistent-uid-12345').expect(404);
  });
});
