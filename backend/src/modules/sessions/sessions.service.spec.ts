import { BadRequestException, ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
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
  sessions: { find: jest.Mock; count: jest.Mock };
  sessionQuestions: { find: jest.Mock };
  codes: { findOne: jest.Mock };
  assignments: { findOne: jest.Mock };
  questions: { find: jest.Mock };
  templates: { findOne: jest.Mock; selectForSession: jest.Mock };
  auth: { issueForUser: jest.Mock };
  dataSource: { transaction: jest.Mock; getRepository: jest.Mock };
  managerSave: jest.Mock;
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

  const manager = {
    create: (_entity: unknown, obj: unknown) => obj,
    save: managerSave,
    getRepository: () => ({ count: jest.fn().mockResolvedValue(0) }),
    createQueryBuilder: () => ({
      update: () => manager.createQueryBuilder(),
      set: () => manager.createQueryBuilder(),
      where: () => manager.createQueryBuilder(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    }),
  };

  const mocks: Mocks = {
    sessions: { find: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    sessionQuestions: { find: jest.fn().mockResolvedValue([]) },
    codes: { findOne: jest.fn() },
    assignments: { findOne: jest.fn() },
    questions: { find: jest.fn().mockResolvedValue([]) },
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
    ...overrides,
  };

  const service = new SessionsService(
    mocks.sessions as never,
    mocks.sessionQuestions as never,
    mocks.codes as never,
    mocks.assignments as never,
    mocks.questions as never,
    mocks.templates as never,
    mocks.auth as never,
    mocks.dataSource as never,
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
    expect(result.session.status).toBe(SessionStatus.IN_PROGRESS);
    expect(result.session.isPreview).toBe(false);
    expect(mocks.auth.issueForUser).toHaveBeenCalled();
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
