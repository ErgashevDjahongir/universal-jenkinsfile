import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CandidateStatus } from '../../common/enums/candidate-status.enum';
import { SessionStatus } from '../../common/enums/session-status.enum';
import { TemplateStatus } from '../../common/enums/template-status.enum';
import { CandidatesService, UploadedDocument } from './candidates.service';
import { CandidateView } from './dto/candidate-filter.dto';

// Disk yozuvini chetlab o'tamiz — test fayl tizimiga tegmaydi.
jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

/** andWhere/where shartlarini yozib boruvchi soxta QueryBuilder. */
interface RecordingQb {
  innerJoin: jest.Mock;
  leftJoin: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  getMany: jest.Mock;
  calls: { method: string; args: unknown[] }[];
}

function makeRecordingQb(result: unknown[]): RecordingQb {
  const calls: { method: string; args: unknown[] }[] = [];
  const qb = {
    calls,
    getMany: jest.fn().mockResolvedValue(result),
  } as unknown as RecordingQb;
  for (const m of ['innerJoin', 'leftJoin', 'where', 'andWhere', 'orderBy'] as const) {
    qb[m] = jest.fn((...args: unknown[]) => {
      calls.push({ method: m, args });
      return qb;
    });
  }
  return qb;
}

interface Mocks {
  candidates: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  /** candidates.createQueryBuilder har chaqirilganda yaratilgan qb'lar (tartib bo'yicha). */
  candidateQbs: RecordingQb[];
  /** Keyingi candidates QB.getMany qaytaradigan natija (reconcile/findAll uchun). */
  setCandidateRows: (rows: unknown[]) => void;
  documents: { findOne: jest.Mock; find: jest.Mock; create: jest.Mock; save: jest.Mock };
  assignments: {
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
    createQueryBuilder: jest.Mock;
    save: jest.Mock;
  };
  codes: { findOneOrFail: jest.Mock };
  sessions: { findOne: jest.Mock; count: jest.Mock; find: jest.Mock };
  templates: { findOne: jest.Mock };
  audit: { log: jest.Mock };
  dataSource: { transaction: jest.Mock };
  managerSave: jest.Mock;
}

function build(): { service: CandidatesService; mocks: Mocks } {
  const managerSave = jest
    .fn()
    .mockImplementation((obj: unknown) =>
      Promise.resolve({ id: '10', ...(obj as Record<string, unknown>) }),
    );
  const manager = {
    create: (_e: unknown, obj: unknown) => obj,
    save: managerSave,
  };
  const candidateQbs: RecordingQb[] = [];
  let candidateRows: unknown[] = [];
  const mocks: Mocks = {
    candidates: {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((x: unknown) => x),
      save: jest
        .fn()
        .mockImplementation((x: unknown) =>
          Promise.resolve({ id: '1', ...(x as Record<string, unknown>) }),
        ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => {
        const qb = makeRecordingQb(candidateRows);
        candidateQbs.push(qb);
        return qb;
      }),
    },
    candidateQbs,
    setCandidateRows: (rows: unknown[]) => {
      candidateRows = rows;
    },
    documents: {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((x: unknown) => x),
      save: jest
        .fn()
        .mockImplementation((x: unknown) =>
          Promise.resolve({ id: '2', ...(x as Record<string, unknown>) }),
        ),
    },
    assignments: {
      findOne: jest.fn(),
      findOneOrFail: jest.fn().mockResolvedValue({ id: '10', title: 'T' }),
      createQueryBuilder: jest.fn(() => {
        const qb = {
          leftJoinAndSelect: () => qb,
          where: () => qb,
          getMany: jest.fn().mockResolvedValue([]),
          getOneOrFail: jest.fn().mockResolvedValue({
            id: '10',
            templateId: '5',
            title: 'T',
            startsAt: new Date(),
            endsAt: new Date(),
            template: { title: 'Shablon nomi' },
            codes: [{ code: 'CAND0001' }],
          }),
        };
        return qb;
      }),
      save: jest.fn().mockImplementation((x: unknown) => Promise.resolve(x)),
    },
    codes: { findOneOrFail: jest.fn().mockResolvedValue({ id: '99', code: 'CAND0001' }) },
    sessions: { findOne: jest.fn(), count: jest.fn().mockResolvedValue(0), find: jest.fn() },
    templates: { findOne: jest.fn() },
    audit: { log: jest.fn().mockResolvedValue(undefined) },
    dataSource: {
      transaction: jest
        .fn()
        .mockImplementation((cb: (m: typeof manager) => unknown) => cb(manager)),
    },
    managerSave,
  };

  const service = new CandidatesService(
    mocks.candidates as never,
    mocks.documents as never,
    mocks.assignments as never,
    mocks.codes as never,
    mocks.sessions as never,
    mocks.templates as never,
    mocks.audit as never,
    mocks.dataSource as never,
  );
  return { service, mocks };
}

const CTX = { userId: '1', ip: '127.0.0.1' };

function pdfFile(overrides: Partial<UploadedDocument> = {}): UploadedDocument {
  return {
    originalname: 'tavsiyanoma.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]), // %PDF-1.4
    ...overrides,
  };
}

describe('CandidatesService.create', () => {
  it('pending holatda yaratadi va auditga yozadi', async () => {
    const { service, mocks } = build();
    await service.create({ fullName: 'Karimov Aziz', phone: '+998900000000' }, CTX);
    const saved = mocks.candidates.save.mock.calls[0][0];
    expect(saved.status).toBe(CandidateStatus.PENDING);
    expect(saved.createdBy).toBe('1');
    expect(mocks.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'candidate.create' }),
    );
  });
});

describe('CandidatesService.uploadDocument', () => {
  it('fayl yuborilmasa → 400', async () => {
    const { service, mocks } = build();
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    await expect(
      service.uploadDocument('1', 'recommendation', undefined, CTX),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PDF bo‘lmagan fayl → 400 (saqlanmaydi)', async () => {
    const { service, mocks } = build();
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    const file = pdfFile({ mimetype: 'image/png', originalname: 'x.png' });
    await expect(service.uploadDocument('1', 'recommendation', file, CTX)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mocks.documents.save).not.toHaveBeenCalled();
  });

  it('PDF kengaytmasi bo‘lsa-yu, sehrli baytlar noto‘g‘ri → 400', async () => {
    const { service, mocks } = build();
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    const file = pdfFile({ buffer: Buffer.from([0x00, 0x01, 0x02, 0x03]) });
    await expect(service.uploadDocument('1', 'recommendation', file, CTX)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('noto‘g‘ri hujjat turi → 400', async () => {
    const { service, mocks } = build();
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    await expect(
      service.uploadDocument('1', 'invalid_type', pdfFile(), CTX),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('to‘g‘ri PDF saqlanadi va auditga yoziladi', async () => {
    const { service, mocks } = build();
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    mocks.documents.findOne.mockResolvedValue(null);
    const view = await service.uploadDocument('1', 'recommendation', pdfFile(), CTX);
    expect(view.originalName).toBe('tavsiyanoma.pdf');
    expect(mocks.documents.save).toHaveBeenCalled();
    expect(mocks.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'candidate_document.upload' }),
    );
  });
});

describe('CandidatesService.assign', () => {
  it('allaqachon tayinlangan bo‘lsa → 400', async () => {
    const { service, mocks } = build();
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    mocks.assignments.findOne.mockResolvedValue({ id: '10' });
    await expect(
      service.assign(
        '1',
        { templateId: '5', title: 'T', startsAt: iso(0), endsAt: iso(3600) },
        CTX,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('faol bo‘lmagan shablon → 400', async () => {
    const { service, mocks } = build();
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    mocks.assignments.findOne.mockResolvedValue(null);
    mocks.templates.findOne.mockResolvedValue({ id: '5', status: TemplateStatus.DRAFT });
    await expect(
      service.assign(
        '1',
        { templateId: '5', title: 'T', startsAt: iso(0), endsAt: iso(3600) },
        CTX,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('tayinlov + kod yaratadi, candidate_id ga bog‘lanadi', async () => {
    const { service, mocks } = build();
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    mocks.assignments.findOne.mockResolvedValue(null);
    mocks.templates.findOne.mockResolvedValue({ id: '5', status: TemplateStatus.ACTIVE });
    const result = await service.assign(
      '1',
      { templateId: '5', title: 'Attestatsiya', startsAt: iso(0), endsAt: iso(3600) },
      CTX,
    );
    expect(result.code.code).toBe('CAND0001');
    // Javob to'liq kartochka ko'rinishini qaytaradi (UI reload'siz darhol chiqishi uchun).
    expect(result.assignment.templateName).toBe('Shablon nomi');
    expect(result.assignment.accessCode).toBe('CAND0001');
    expect(mocks.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'candidate.assign' }),
    );
  });

  it('parallel tayinlash poygasi (DB unique buzilishi) → 400 alreadyAssigned', async () => {
    const { service, mocks } = build();
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    mocks.assignments.findOne.mockResolvedValue(null); // pre-check o'tadi
    mocks.templates.findOne.mockResolvedValue({ id: '5', status: TemplateStatus.ACTIVE });
    // Tranzaksiya ichida partial unique indeks buziladi.
    mocks.managerSave.mockRejectedValueOnce(
      new QueryFailedError('insert', undefined, { code: '23505' } as unknown as Error),
    );
    await expect(
      service.assign(
        '1',
        { templateId: '5', title: 'T', startsAt: iso(0), endsAt: iso(3600) },
        CTX,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CandidatesService.getDocumentForDownload', () => {
  it('hujjat topilmasa → 404', async () => {
    const { service, mocks } = build();
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    mocks.documents.findOne.mockResolvedValue(null);
    await expect(service.getDocumentForDownload('1', 'recommendation', CTX)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('maxfiy hujjatga kirish auditga yoziladi', async () => {
    const { service, mocks } = build();
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    mocks.documents.findOne.mockResolvedValue({
      id: '2',
      filePath: 'uploads/candidate-docs/x.pdf',
      originalName: 'a.pdf',
    });
    await service.getDocumentForDownload('1', 'recommendation', CTX);
    expect(mocks.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'candidate_document.download' }),
    );
  });
});

describe('CandidatesService.updateAssignment', () => {
  it('sessiya ochilgan bo‘lsa (boshlangan) → 400 rad etadi', async () => {
    const { service, mocks } = build();
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    mocks.assignments.findOne.mockResolvedValue({
      id: '10',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 1000),
    });
    mocks.sessions.count.mockResolvedValue(1);
    await expect(service.updateAssignment('1', { title: 'Yangi' }, CTX)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('tayinlov topilmasa → 404', async () => {
    const { service, mocks } = build();
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    mocks.assignments.findOne.mockResolvedValue(null);
    await expect(service.updateAssignment('1', { title: 'Yangi' }, CTX)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('boshlanmagan tayinlov tahrirlanadi va auditga yoziladi', async () => {
    const { service, mocks } = build();
    const start = new Date(Date.now() + 1000);
    mocks.candidates.findOne.mockResolvedValue({ id: '1' });
    mocks.assignments.findOne.mockResolvedValue({
      id: '10',
      startsAt: start,
      endsAt: new Date(start.getTime() + 3600_000),
    });
    mocks.sessions.count.mockResolvedValue(0);
    const updated = await service.updateAssignment('1', { title: 'Yangi nom' }, CTX);
    // Tahrirdan keyin ham to'liq ko'rinish (template nomi va kod) qaytadi.
    expect(updated.templateName).toBe('Shablon nomi');
    expect(updated.accessCode).toBe('CAND0001');
    expect(mocks.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'candidate.assignment_update' }),
    );
  });
});

describe('CandidatesService.findAll — view filtri', () => {
  /** findAll asosiy so'rovi — reconcile qb #0 dan keyin yaratiladi (qb #1). */
  function listQb(mocks: Mocks): RecordingQb {
    return mocks.candidateQbs[mocks.candidateQbs.length - 1];
  }

  function andWhereParams(qb: RecordingQb): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const c of qb.calls) {
      if (c.method === 'andWhere' && c.args[1] && typeof c.args[1] === 'object') {
        Object.assign(merged, c.args[1] as Record<string, unknown>);
      }
    }
    return merged;
  }

  function andWhereSql(qb: RecordingQb): string[] {
    return qb.calls.filter((c) => c.method === 'andWhere').map((c) => c.args[0] as string);
  }

  it('view=current: pending+in_progress VA tugash sanasi o‘tmaganlar (sana sharti bilan)', async () => {
    const { service, mocks } = build();

    await service.findAll({ view: CandidateView.CURRENT });

    const qb = listQb(mocks);
    const values = andWhereParams(qb).current as CandidateStatus[];
    expect(values).toEqual([CandidateStatus.PENDING, CandidateStatus.IN_PROGRESS]);
    // Tugash sanasi o'tmagan yoki tayinlovsiz — server vaqti (NOW()) bilan.
    expect(andWhereSql(qb).some((s) => s.includes('ends_at >= NOW()'))).toBe(true);
  });

  it('view=archived: faqat completed+no_show (sana sharti qo‘ymaydi)', async () => {
    const { service, mocks } = build();

    await service.findAll({ view: CandidateView.ARCHIVED });

    const qb = listQb(mocks);
    const values = andWhereParams(qb).archived as CandidateStatus[];
    expect(values).toEqual([CandidateStatus.COMPLETED, CandidateStatus.NO_SHOW]);
    expect(andWhereSql(qb).some((s) => s.includes('ends_at'))).toBe(false);
  });

  it('hasAssignment: tayinlovsizlarni chiqarib tashlaydi (a.id IS NOT NULL)', async () => {
    const { service, mocks } = build();

    await service.findAll({ hasAssignment: true });

    expect(andWhereSql(listQb(mocks)).some((s) => s.includes('a.id IS NOT NULL'))).toBe(true);
  });

  it('ro‘yxat so‘ralganda holatlar avval yangilanadi (reconcile chaqiriladi)', async () => {
    const { service } = build();
    const spy = jest.spyOn(service, 'reconcileExpiredCandidates');

    await service.findAll({ view: CandidateView.CURRENT });

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('CandidatesService.reconcileExpiredCandidates', () => {
  it('muddati o‘tgan kandidat yo‘q bo‘lsa 0 qaytaradi', async () => {
    const { service, mocks } = build();
    mocks.setCandidateRows([]);

    await expect(service.reconcileExpiredCandidates()).resolves.toBe(0);
    expect(mocks.candidates.update).not.toHaveBeenCalled();
  });

  it('o‘zi yakunlagan (COMPLETED) sessiya bor → completed', async () => {
    const { service, mocks } = build();
    mocks.setCandidateRows([{ id: '1', status: CandidateStatus.IN_PROGRESS }]);
    mocks.sessions.find.mockResolvedValue([{ candidateId: '1' }]);

    await service.reconcileExpiredCandidates();

    expect(mocks.candidates.update).toHaveBeenCalledWith(
      { id: '1' },
      { status: CandidateStatus.COMPLETED },
    );
    expect(mocks.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'candidate.auto_completed', entityId: '1', userId: null }),
    );
  });

  it('sessiya yo‘q → no_show (topshirmagan)', async () => {
    const { service, mocks } = build();
    mocks.setCandidateRows([{ id: '2', status: CandidateStatus.PENDING }]);
    mocks.sessions.find.mockResolvedValue([]);

    await service.reconcileExpiredCandidates();

    expect(mocks.candidates.update).toHaveBeenCalledWith(
      { id: '2' },
      { status: CandidateStatus.NO_SHOW },
    );
  });

  it('faqat vaqt tugagan (expired/terminated) sessiya → no_show, completed EMAS', async () => {
    const { service, mocks } = build();
    mocks.setCandidateRows([{ id: '3', status: CandidateStatus.IN_PROGRESS }]);
    // COMPLETED bo'yicha so'rov hech narsa topmaydi (expired/terminated hisobga olinmaydi).
    mocks.sessions.find.mockResolvedValue([]);

    await service.reconcileExpiredCandidates();

    expect(mocks.candidates.update).toHaveBeenCalledWith(
      { id: '3' },
      { status: CandidateStatus.NO_SHOW },
    );
    // sessions.find faqat COMPLETED holatini so'raydi.
    expect(mocks.sessions.find.mock.calls[0][0].where.status).toBe(SessionStatus.COMPLETED);
  });

  it('holat allaqachon mos bo‘lsa update chaqirmaydi (idempotent)', async () => {
    const { service, mocks } = build();
    mocks.setCandidateRows([{ id: '5', status: CandidateStatus.NO_SHOW }]);
    mocks.sessions.find.mockResolvedValue([]);

    await service.reconcileExpiredCandidates();

    expect(mocks.candidates.update).not.toHaveBeenCalled();
  });
});

function iso(offsetSeconds: number): string {
  return new Date(Date.now() + offsetSeconds * 1000).toISOString();
}
