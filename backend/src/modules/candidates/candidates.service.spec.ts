import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CandidateStatus } from '../../common/enums/candidate-status.enum';
import { TemplateStatus } from '../../common/enums/template-status.enum';
import { CandidatesService, UploadedDocument } from './candidates.service';

// Disk yozuvini chetlab o'tamiz — test fayl tizimiga tegmaydi.
jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

interface Mocks {
  candidates: { findOne: jest.Mock; find: jest.Mock; create: jest.Mock; save: jest.Mock };
  documents: { findOne: jest.Mock; find: jest.Mock; create: jest.Mock; save: jest.Mock };
  assignments: {
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
    createQueryBuilder: jest.Mock;
    save: jest.Mock;
  };
  codes: { findOneOrFail: jest.Mock };
  sessions: { findOne: jest.Mock; count: jest.Mock };
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
      createQueryBuilder: jest.fn(),
      save: jest.fn().mockImplementation((x: unknown) => Promise.resolve(x)),
    },
    codes: { findOneOrFail: jest.fn().mockResolvedValue({ id: '99', code: 'CAND0001' }) },
    sessions: { findOne: jest.fn(), count: jest.fn().mockResolvedValue(0) },
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
    await service.updateAssignment('1', { title: 'Yangi nom' }, CTX);
    expect(mocks.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'candidate.assignment_update' }),
    );
  });
});

function iso(offsetSeconds: number): string {
  return new Date(Date.now() + offsetSeconds * 1000).toISOString();
}
