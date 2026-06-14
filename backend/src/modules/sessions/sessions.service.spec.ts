import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CandidateStatus } from '../../common/enums/candidate-status.enum';
import { QuestionType } from '../../common/enums/question-type.enum';
import { SessionStatus } from '../../common/enums/session-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { StartSessionDto } from './dto/start-session.dto';
import { SessionsService } from './sessions.service';

/** 23505 (unique_violation) — parallel sessiya indeksini buzgan insert. */
function uniqueViolation(): QueryFailedError {
  return new QueryFailedError('insert', undefined, { code: '23505' } as unknown as Error);
}

interface Mocks {
  sessions: {
    find: jest.Mock;
    count: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  sessionQuestions: { find: jest.Mock; findOne: jest.Mock; count: jest.Mock };
  answers: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  codes: { findOne: jest.Mock };
  assignments: { findOne: jest.Mock };
  questions: { find: jest.Mock };
  candidates: { findOne: jest.Mock };
  templates: { findOne: jest.Mock; selectForSession: jest.Mock };
  auth: { issueForUser: jest.Mock };
  dataSource: { transaction: jest.Mock; getRepository: jest.Mock };
  managerSave: jest.Mock;
  managerUpdate: jest.Mock;
}

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: '5',
    maxAttempts: 1,
    attemptIntervalMinutes: 0,
    avoidRepeatQuestions: false,
    shuffleQuestions: false,
    shuffleOptions: false,
    timeLimitMinutes: 60,
    fixedQuestions: [],
    gradeScale: [],
    passingScorePercent: '60',
    negativePoints: '0',
    partialScoring: false,
    negativeMarking: false,
    ...overrides,
  };
}

function build(overrides: Partial<Mocks> = {}): { service: SessionsService; mocks: Mocks } {
  const managerSave =
    overrides.managerSave ??
    jest.fn().mockImplementation((entity: unknown) => {
      if (Array.isArray(entity)) return Promise.resolve(entity);
      return Promise.resolve({ id: '500', ...(entity as Record<string, unknown>) });
    });
  const managerUpdate = overrides.managerUpdate ?? jest.fn().mockResolvedValue({ affected: 1 });

  const manager = {
    create: (_entity: unknown, obj: unknown) => obj,
    save: managerSave,
    update: managerUpdate,
    getRepository: () => ({ count: jest.fn().mockResolvedValue(0) }),
    createQueryBuilder: () => ({
      update: () => manager.createQueryBuilder(),
      set: () => manager.createQueryBuilder(),
      where: () => manager.createQueryBuilder(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    }),
  };

  const mocks: Mocks = {
    sessions: {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => {
        const qb = {
          update: () => qb,
          set: () => qb,
          where: () => qb,
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        return qb;
      }),
    },
    sessionQuestions: {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    answers: { findOne: jest.fn(), save: jest.fn(), create: jest.fn() },
    codes: { findOne: jest.fn() },
    assignments: { findOne: jest.fn() },
    questions: { find: jest.fn().mockResolvedValue([]) },
    candidates: { findOne: jest.fn() },
    templates: { findOne: jest.fn(), selectForSession: jest.fn().mockResolvedValue([]) },
    auth: {
      issueForUser: jest
        .fn()
        .mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: { id: '9' } }),
    },
    dataSource: {
      transaction: jest
        .fn()
        .mockImplementation((cb: (m: typeof manager) => unknown) => cb(manager)),
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          id: '9',
          status: UserStatus.ACTIVE,
          role: UserRole.EXAMINEE,
        }),
      }),
    },
    managerSave,
    managerUpdate,
    ...overrides,
  };

  const service = new SessionsService(
    mocks.sessions as never,
    mocks.sessionQuestions as never,
    mocks.answers as never,
    mocks.codes as never,
    mocks.assignments as never,
    mocks.questions as never,
    mocks.candidates as never,
    mocks.templates as never,
    mocks.auth as never,
    mocks.dataSource as never,
    { findById: jest.fn(), findByIds: jest.fn().mockResolvedValue([]) } as never,
  );
  return { service, mocks };
}

const CTX = { ip: '127.0.0.1', userAgent: 'jest' };

function assignment(overrides: Record<string, unknown> = {}) {
  return {
    id: '3',
    templateId: '5',
    title: 'Attestatsiya',
    startsAt: new Date(Date.now() - 60_000),
    endsAt: new Date(Date.now() + 3_600_000),
    ...overrides,
  };
}

const baseDto: StartSessionDto = { code: 'ABCDEFGH' };

describe('SessionsService.startByCode', () => {
  it('noma’lum kod → 400', async () => {
    const { service, mocks } = build();
    mocks.codes.findOne.mockResolvedValue(null);
    await expect(service.startByCode(baseDto, CTX)).rejects.toBeInstanceOf(BadRequestException);
    expect(mocks.templates.findOne).not.toHaveBeenCalled();
  });

  it('ishlatilgan kod (used_at to‘lgan) → 400 va sessiya ochilmaydi', async () => {
    const { service, mocks } = build();
    mocks.codes.findOne.mockResolvedValue({
      id: '7',
      assignmentId: '3',
      userId: '9',
      usedAt: new Date(),
    });
    await expect(service.startByCode(baseDto, CTX)).rejects.toBeInstanceOf(BadRequestException);
    expect(mocks.assignments.findOne).not.toHaveBeenCalled();
    expect(mocks.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('parallel sessiya (unique buzilishi) → 409 Conflict', async () => {
    const managerSave = jest.fn().mockRejectedValue(uniqueViolation());
    const { service, mocks } = build({ managerSave });
    mocks.codes.findOne.mockResolvedValue({
      id: '7',
      assignmentId: '3',
      userId: '9',
      usedAt: null,
    });
    mocks.assignments.findOne.mockResolvedValue(assignment());
    mocks.templates.findOne.mockResolvedValue(makeTemplate());
    mocks.templates.selectForSession.mockResolvedValue(['100']);
    mocks.questions.find.mockResolvedValue([{ id: '100', points: '2.00', options: [] }]);

    await expect(service.startByCode(baseDto, CTX)).rejects.toBeInstanceOf(ConflictException);
  });

  it('urinishlar hisobida preview sessiyalar chiqarib tashlanadi', async () => {
    const { service, mocks } = build();
    mocks.codes.findOne.mockResolvedValue({
      id: '7',
      assignmentId: '3',
      userId: '9',
      usedAt: null,
    });
    mocks.assignments.findOne.mockResolvedValue(assignment());
    mocks.templates.findOne.mockResolvedValue(makeTemplate({ maxAttempts: 1 }));
    // Faqat «tugagan, preview emas» urinishlar hisoblanadi; bittasi limitga yetadi.
    mocks.sessions.find.mockResolvedValue([{ finishedAt: new Date() }]);

    await expect(service.startByCode(baseDto, CTX)).rejects.toBeInstanceOf(BadRequestException);
    // Urinish hisobi so‘rovi preview'larni ajratadi.
    const whereArg = mocks.sessions.find.mock.calls[0][0].where;
    expect(whereArg.isPreview).toBe(false);
  });

  it('muvaffaqiyatli kirish: token va sessiya xulosasi, kod iste’mol qilinadi', async () => {
    const { service, mocks } = build();
    mocks.codes.findOne.mockResolvedValue({
      id: '7',
      assignmentId: '3',
      userId: '9',
      usedAt: null,
    });
    mocks.assignments.findOne.mockResolvedValue(assignment());
    mocks.templates.findOne.mockResolvedValue(makeTemplate());
    mocks.templates.selectForSession.mockResolvedValue(['100', '101']);
    mocks.questions.find.mockResolvedValue([
      { id: '100', points: '2.00', options: [] },
      { id: '101', points: '1.00', options: [] },
    ]);

    const result = await service.startByCode(baseDto, CTX);
    expect(result.accessToken).toBe('a');
    expect(result.session.questionCount).toBe(2);
    // Taymer "Testni boshlash"da boshlanadi — kod bilan kirishda sessiya `ready`.
    expect(result.session.status).toBe(SessionStatus.READY);
    expect(result.session.startedAt).toBeNull();
    expect(result.session.deadlineAt).toBeNull();
    expect(result.session.isPreview).toBe(false);
    expect(mocks.auth.issueForUser).toHaveBeenCalled();
  });

  it('candidate kodi: topshiruvchi avtomatik aniqlanadi (F.I.Sh. so‘ralmaydi), sessiya → ready, candidate → in_progress', async () => {
    const { service, mocks } = build();
    mocks.codes.findOne.mockResolvedValue({
      id: '7',
      assignmentId: '3',
      userId: null,
      candidateId: '42',
      usedAt: null,
    });
    mocks.candidates.findOne.mockResolvedValue({
      id: '42',
      fullName: 'Karimov Aziz Akmalovich',
      phone: '+998900000000',
      status: CandidateStatus.PENDING,
    });
    // Candidate'ning oldingi sessiyasi yo'q → yangi examinee yaratiladi.
    mocks.sessions.findOne.mockResolvedValue(null);
    mocks.assignments.findOne.mockResolvedValue(assignment());
    mocks.templates.findOne.mockResolvedValue(makeTemplate());
    mocks.templates.selectForSession.mockResolvedValue(['100']);
    mocks.questions.find.mockResolvedValue([{ id: '100', points: '2.00', options: [] }]);

    // F.I.Sh. yuborilmaydi — kod orqali avtomatik aniqlanadi.
    const result = await service.startByCode({ code: 'CAND0001' }, CTX);
    expect(result.session.status).toBe(SessionStatus.READY);
    expect(mocks.auth.issueForUser).toHaveBeenCalled();

    // candidate.status pending → in_progress ga o'tkaziladi.
    const candidateUpdate = mocks.managerUpdate.mock.calls.find(
      (c) => (c[2] as { status?: string })?.status === CandidateStatus.IN_PROGRESS,
    );
    expect(candidateUpdate).toBeDefined();
  });
});

describe('SessionsService.finishByExaminee (candidate)', () => {
  it('candidate sessiyasi yakunlanganda candidate.status → completed', async () => {
    const sessionRow = inProgressSession({ candidateId: '42' });
    const finalRow = { ...sessionRow, status: SessionStatus.COMPLETED, finishedAt: new Date() };
    const managerUpdate = jest.fn().mockResolvedValue({ affected: 1 });
    const qb = {
      setLock: () => qb,
      where: () => qb,
      getOne: () => Promise.resolve(sessionRow),
    };
    const fakeManager = {
      createQueryBuilder: () => qb,
      findOne: jest
        .fn()
        .mockResolvedValueOnce(assignment()) // finalize ichidagi TestAssignment
        .mockResolvedValueOnce(finalRow), // yakuniy sessiya qayta o'qiladi
      find: jest.fn().mockResolvedValue([]), // session_questions yo'q
      update: managerUpdate,
    };
    const { service, mocks } = build({
      dataSource: {
        transaction: jest.fn((cb: (m: unknown) => unknown) => cb(fakeManager)),
        getRepository: jest.fn(),
      },
    });
    mocks.sessions.findOne.mockResolvedValue(sessionRow);
    mocks.assignments.findOne.mockResolvedValue(assignment());
    mocks.templates.findOne.mockResolvedValue(makeTemplate());

    await service.finishByExaminee('1', '9');

    const candidateUpdate = managerUpdate.mock.calls.find(
      (c) => (c[2] as { status?: string })?.status === CandidateStatus.COMPLETED,
    );
    expect(candidateUpdate).toBeDefined();
  });
});

describe('SessionsService.startPreview', () => {
  it('examinee preview ocholmaydi → 400', async () => {
    const { service } = build();
    await expect(
      service.startPreview({ assignmentId: '3' }, { id: '1', role: UserRole.EXAMINEE }, CTX),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('admin preview: is_preview=true sessiya, urinish limiti tekshirilmaydi', async () => {
    const { service, mocks } = build();
    mocks.assignments.findOne.mockResolvedValue(assignment());
    mocks.templates.findOne.mockResolvedValue(makeTemplate({ maxAttempts: 1 }));
    mocks.templates.selectForSession.mockResolvedValue(['100']);
    mocks.questions.find.mockResolvedValue([{ id: '100', points: '2.00', options: [] }]);

    const view = await service.startPreview(
      { assignmentId: '3' },
      { id: '1', role: UserRole.ADMIN },
      CTX,
    );
    expect(view.isPreview).toBe(true);
    // Urinish limiti tekshiruvi (sessions.find) preview yo‘lida umuman chaqirilmaydi.
    expect(mocks.sessions.find).not.toHaveBeenCalled();
  });
});

function inProgressSession(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    userId: '9',
    assignmentId: '3',
    status: SessionStatus.IN_PROGRESS,
    startedAt: new Date(Date.now() - 60_000),
    deadlineAt: new Date(Date.now() + 600_000),
    tabSwitches: 0,
    isPreview: false,
    ...overrides,
  };
}

/** `ready` — kod bilan kirilgan, lekin "Testni boshlash" hali bosilmagan (taymer yo'q). */
function readySession(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    userId: '9',
    assignmentId: '3',
    status: SessionStatus.READY,
    startedAt: null,
    deadlineAt: null,
    tabSwitches: 0,
    isPreview: false,
    ...overrides,
  };
}

describe('SessionsService.getExamineeSession', () => {
  const sessionQuestion = {
    id: '77',
    orderIndex: 0,
    points: '2.00',
    optionsOrder: ['1', '2'],
    answer: null,
    question: {
      id: '100',
      type: QuestionType.SINGLE_CHOICE,
      text: 'Poytaxt?',
      answerKey: 'MAXFIY_KALIT',
      explanation: 'MAXFIY_IZOH',
      options: [
        { id: '1', text: 'Toshkent', isCorrect: true, orderIndex: 0, matchPair: null },
        { id: '2', text: 'Buxoro', isCorrect: false, orderIndex: 1, matchPair: null },
      ],
    },
  };

  it('begona sessiyaga kirish → 403', async () => {
    const { service, mocks } = build();
    mocks.sessions.findOne.mockResolvedValue(inProgressSession({ userId: 'BOSHQA' }));
    await expect(service.getExamineeSession('1', '9')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('javoblar to‘g‘ri javoblarsiz qaytadi (is_correct/answer_key/explanation YO‘Q)', async () => {
    const { service, mocks } = build();
    mocks.sessions.findOne.mockResolvedValue(inProgressSession());
    mocks.assignments.findOne.mockResolvedValue(assignment());
    mocks.templates.findOne.mockResolvedValue(makeTemplate({ maxTabSwitches: 3 }));
    mocks.sessionQuestions.find.mockResolvedValue([sessionQuestion]);

    const view = await service.getExamineeSession('1', '9');
    const serialized = JSON.stringify(view);

    // Variantlar faqat {id, text}; to‘g‘rilik belgisi yo‘q.
    expect(view.questions[0].options).toEqual([
      { id: '1', text: 'Toshkent' },
      { id: '2', text: 'Buxoro' },
    ]);
    expect(serialized).not.toContain('isCorrect');
    expect(serialized).not.toContain('MAXFIY_KALIT');
    expect(serialized).not.toContain('MAXFIY_IZOH');
  });

  it('ready holatda savol matnlari YUBORILMAYDI (faqat soni), taymer to‘liq limit', async () => {
    const { service, mocks } = build();
    mocks.sessions.findOne.mockResolvedValue(readySession());
    mocks.assignments.findOne.mockResolvedValue(assignment());
    mocks.templates.findOne.mockResolvedValue(makeTemplate({ maxTabSwitches: 3 }));
    mocks.sessionQuestions.count.mockResolvedValue(2);

    const view = await service.getExamineeSession('1', '9');

    // Savol matnlari boshlanmaguncha berilmaydi — faqat soni ko‘rsatiladi.
    expect(view.questions).toEqual([]);
    expect(view.questionCount).toBe(2);
    expect(view.startedAt).toBeNull();
    expect(view.deadlineAt).toBeNull();
    // ready: taymer hali yo‘q — to‘liq limit (60 daqiqa = 3600s) ko‘rsatiladi.
    expect(view.remainingSeconds).toBe(3600);
    // Savollarni o‘qib olishga urinish bo‘lmaydi.
    expect(mocks.sessionQuestions.find).not.toHaveBeenCalled();
  });
});

describe('SessionsService.beginSession', () => {
  it('ready → in_progress: started_at va deadline server tomonda yoziladi', async () => {
    const { service, mocks } = build();
    const setSpy = jest.fn().mockReturnThis();
    const execSpy = jest.fn().mockResolvedValue({ affected: 1 });
    mocks.sessions.createQueryBuilder.mockImplementation(() => {
      const qb = {
        update: () => qb,
        set: setSpy,
        where: () => qb,
        execute: execSpy,
      };
      return qb;
    });
    mocks.sessions.findOne
      .mockResolvedValueOnce(readySession()) // beginSession ichidagi loadOwnedSession
      .mockResolvedValue(inProgressSession()); // begin'dan keyin getExamineeSession
    mocks.assignments.findOne.mockResolvedValue(assignment());
    mocks.templates.findOne.mockResolvedValue(makeTemplate({ maxTabSwitches: 3 }));
    mocks.sessionQuestions.find.mockResolvedValue([]);

    const view = await service.beginSession('1', '9');

    expect(view.status).toBe(SessionStatus.IN_PROGRESS);
    expect(execSpy).toHaveBeenCalled();
    // Server started_at/deadline yozadi (mijoz vaqtiga ishonilmaydi).
    const setArg = setSpy.mock.calls[0][0] as {
      status: SessionStatus;
      startedAt: Date;
      deadlineAt: Date;
    };
    expect(setArg.status).toBe(SessionStatus.IN_PROGRESS);
    expect(setArg.startedAt).toBeInstanceOf(Date);
    // deadline = started_at + 60 daqiqa.
    expect(setArg.deadlineAt.getTime() - setArg.startedAt.getTime()).toBe(60 * 60_000);
  });

  it('allaqachon boshlangan (in_progress) sessiya idempotent — yangi UPDATE bo‘lmaydi', async () => {
    const { service, mocks } = build();
    mocks.sessions.findOne.mockResolvedValue(inProgressSession());
    mocks.assignments.findOne.mockResolvedValue(assignment());
    mocks.templates.findOne.mockResolvedValue(makeTemplate({ maxTabSwitches: 3 }));
    mocks.sessionQuestions.find.mockResolvedValue([]);

    const view = await service.beginSession('1', '9');
    expect(view.status).toBe(SessionStatus.IN_PROGRESS);
    // Boshlash UPDATE'i qayta chaqirilmaydi.
    expect(mocks.sessions.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('foydalanuvchida boshqa faol sessiya bor (unique buzilishi) → 409 Conflict', async () => {
    const { service, mocks } = build();
    mocks.sessions.createQueryBuilder.mockImplementation(() => {
      const qb = {
        update: () => qb,
        set: () => qb,
        where: () => qb,
        execute: jest.fn().mockRejectedValue(uniqueViolation()),
      };
      return qb;
    });
    mocks.sessions.findOne.mockResolvedValue(readySession());
    mocks.assignments.findOne.mockResolvedValue(assignment());
    mocks.templates.findOne.mockResolvedValue(makeTemplate());

    await expect(service.beginSession('1', '9')).rejects.toBeInstanceOf(ConflictException);
  });

  it('terminal (masalan completed) sessiyani boshlab bo‘lmaydi → 400', async () => {
    const { service, mocks } = build();
    mocks.sessions.findOne.mockResolvedValue(readySession({ status: SessionStatus.COMPLETED }));
    await expect(service.beginSession('1', '9')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('begona sessiyani boshlab bo‘lmaydi → 403', async () => {
    const { service, mocks } = build();
    mocks.sessions.findOne.mockResolvedValue(readySession({ userId: 'BOSHQA' }));
    await expect(service.beginSession('1', '9')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('SessionsService.submitAnswer', () => {
  it('begona sessiya → 403', async () => {
    const { service, mocks } = build();
    mocks.sessions.findOne.mockResolvedValue(inProgressSession({ userId: 'BOSHQA' }));
    await expect(
      service.submitAnswer('1', '77', { selectedOptionIds: ['1'] }, '9'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('muddat o‘tgan → javob rad etiladi va sessiya yakunlanadi', async () => {
    const { service, mocks } = build();
    mocks.sessions.findOne.mockResolvedValue(
      inProgressSession({ deadlineAt: new Date(Date.now() - 1000) }),
    );
    // finalize() ichidagi tranzaksiyani soddalashtiramiz (yakunlash chaqirilganini tekshiramiz).
    mocks.dataSource.transaction.mockResolvedValue(undefined);

    await expect(
      service.submitAnswer('1', '77', { selectedOptionIds: ['1'] }, '9'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mocks.dataSource.transaction).toHaveBeenCalled();
    expect(mocks.answers.save).not.toHaveBeenCalled();
  });

  it('faol sessiyada javob saqlanadi', async () => {
    const { service, mocks } = build();
    mocks.sessions.findOne.mockResolvedValue(inProgressSession());
    mocks.sessionQuestions.findOne.mockResolvedValue({ id: '77', sessionId: '1' });
    mocks.answers.findOne.mockResolvedValue(null);
    mocks.answers.create.mockImplementation((x: unknown) => x);

    const res = await service.submitAnswer('1', '77', { selectedOptionIds: ['1'] }, '9');
    expect(res).toEqual({ saved: true });
    expect(mocks.answers.save).toHaveBeenCalled();
  });
});
