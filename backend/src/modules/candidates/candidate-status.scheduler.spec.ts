import { CandidateStatus } from '../../common/enums/candidate-status.enum';
import { SessionStatus } from '../../common/enums/session-status.enum';
import { CandidateStatusScheduler } from './candidate-status.scheduler';

interface Mocks {
  candidates: { createQueryBuilder: jest.Mock; update: jest.Mock };
  assignments: Record<string, never>;
  sessions: { find: jest.Mock };
  audit: { log: jest.Mock };
  qb: { innerJoin: jest.Mock; where: jest.Mock; andWhere: jest.Mock; getMany: jest.Mock };
}

function build(): { scheduler: CandidateStatusScheduler; mocks: Mocks } {
  const qb = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  const mocks: Mocks = {
    candidates: {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    },
    assignments: {},
    sessions: { find: jest.fn().mockResolvedValue([]) },
    audit: { log: jest.fn().mockResolvedValue(undefined) },
    qb,
  };

  const scheduler = new CandidateStatusScheduler(
    mocks.candidates as never,
    mocks.assignments as never,
    mocks.sessions as never,
    mocks.audit as never,
  );
  return { scheduler, mocks };
}

describe('CandidateStatusScheduler.expireCandidates', () => {
  it('muddati otmagan yoki aktiv kandidat yoq bolsa hech narsa qilmaydi', async () => {
    const { scheduler, mocks } = build();
    mocks.qb.getMany.mockResolvedValue([]);
    await scheduler.expireCandidates();
    expect(mocks.candidates.update).not.toHaveBeenCalled();
    expect(mocks.audit.log).not.toHaveBeenCalled();
  });

  it('yakunlangan sessiyasi bor candidate -> COMPLETED', async () => {
    const { scheduler, mocks } = build();
    mocks.qb.getMany.mockResolvedValue([{ id: '1', status: CandidateStatus.IN_PROGRESS }]);
    mocks.sessions.find.mockResolvedValue([{ candidateId: '1', status: SessionStatus.COMPLETED }]);

    await scheduler.expireCandidates();

    expect(mocks.candidates.update).toHaveBeenCalledWith(
      { id: '1' },
      { status: CandidateStatus.COMPLETED },
    );
    expect(mocks.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'candidate.auto_completed',
        entityId: '1',
        userId: null,
      }),
    );
  });

  it('sessiyasi yoq candidate -> NO_SHOW', async () => {
    const { scheduler, mocks } = build();
    mocks.qb.getMany.mockResolvedValue([{ id: '2', status: CandidateStatus.PENDING }]);
    mocks.sessions.find.mockResolvedValue([]);

    await scheduler.expireCandidates();

    expect(mocks.candidates.update).toHaveBeenCalledWith(
      { id: '2' },
      { status: CandidateStatus.NO_SHOW },
    );
    expect(mocks.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'candidate.auto_no_show', entityId: '2' }),
    );
  });

  it('bir necha candidate bir vaqtda togri holatlarga otadi', async () => {
    const { scheduler, mocks } = build();
    mocks.qb.getMany.mockResolvedValue([
      { id: '10', status: CandidateStatus.IN_PROGRESS },
      { id: '11', status: CandidateStatus.PENDING },
    ]);
    // Faqat 10-chi candidate sessiyasini tugatgan
    mocks.sessions.find.mockResolvedValue([{ candidateId: '10' }]);

    await scheduler.expireCandidates();

    expect(mocks.candidates.update).toHaveBeenCalledWith(
      { id: '10' },
      { status: CandidateStatus.COMPLETED },
    );
    expect(mocks.candidates.update).toHaveBeenCalledWith(
      { id: '11' },
      { status: CandidateStatus.NO_SHOW },
    );
    expect(mocks.audit.log).toHaveBeenCalledTimes(2);
  });

  it('holati allaqachon mos bolsa update chaqirilmaydi (idempotent)', async () => {
    const { scheduler, mocks } = build();
    // getMany faqat pending/in_progress qaytaradi — agar kelsa ham
    // holat teng bolganida update chaqirilmaydi.
    mocks.qb.getMany.mockResolvedValue([{ id: '5', status: CandidateStatus.NO_SHOW }]);
    mocks.sessions.find.mockResolvedValue([]);

    await scheduler.expireCandidates();

    expect(mocks.candidates.update).not.toHaveBeenCalled();
  });
});
