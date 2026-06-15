import { NotFoundException } from '@nestjs/common';
import { InterviewQuestionsService } from './interview-questions.service';
import { InterviewQuestion } from './entities/interview-question.entity';

interface Mocks {
  repo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };
  audit: { log: jest.Mock };
}

function build(): { service: InterviewQuestionsService; mocks: Mocks } {
  const mocks: Mocks = {
    repo: {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    },
    audit: { log: jest.fn().mockResolvedValue(undefined) },
  };
  const service = new InterviewQuestionsService(mocks.repo as never, mocks.audit as never);
  return { service, mocks };
}

const CTX = { userId: '1', ip: '127.0.0.1' };

function makeQ(overrides: Partial<InterviewQuestion> = {}): InterviewQuestion {
  return {
    id: '10',
    subjectId: '2',
    questionText: 'Nima bu?',
    expectedAnswer: 'Bu shunday.',
    rationale: null,
    createdBy: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('InterviewQuestionsService', () => {
  describe('create', () => {
    it('saqlaydi va audit yozadi', async () => {
      const { service, mocks } = build();
      const q = makeQ();
      mocks.repo.create.mockReturnValue(q);
      mocks.repo.save.mockResolvedValue(q);

      const result = await service.create(
        {
          subjectId: '2',
          questionText: 'Nima bu?',
          expectedAnswer: 'Bu shunday.',
        },
        CTX,
      );

      expect(mocks.repo.save).toHaveBeenCalledWith(q);
      expect(mocks.audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'interview_question.create', entityId: q.id }),
      );
      expect(result).toBe(q);
    });

    it("rationale ixtiyoriy — undefined bo'lsa null saqlanadi", async () => {
      const { service, mocks } = build();
      const q = makeQ({ rationale: null });
      mocks.repo.create.mockReturnValue(q);
      mocks.repo.save.mockResolvedValue(q);

      await service.create({ subjectId: '2', questionText: 'S', expectedAnswer: 'J' }, CTX);

      expect(mocks.repo.create).toHaveBeenCalledWith(expect.objectContaining({ rationale: null }));
    });
  });

  describe('findAll', () => {
    it('filtrsiz barcha savollarni qaytaradi', async () => {
      const { service, mocks } = build();
      const list = [makeQ()];
      mocks.repo.find.mockResolvedValue(list);

      const result = await service.findAll({});
      expect(result).toBe(list);
      expect(mocks.repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
    });

    it('subjectId filtri where ga uzatiladi', async () => {
      const { service, mocks } = build();
      mocks.repo.find.mockResolvedValue([]);

      await service.findAll({ subjectId: '3' });

      expect(mocks.repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ subjectId: '3' }) }),
      );
    });
  });

  describe('findOne', () => {
    it('topilmasa NotFoundException tashlaydi', async () => {
      const { service, mocks } = build();
      mocks.repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('99')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('topilsa qaytaradi', async () => {
      const { service, mocks } = build();
      const q = makeQ();
      mocks.repo.findOne.mockResolvedValue(q);

      const result = await service.findOne('10');
      expect(result).toBe(q);
    });
  });

  describe('update', () => {
    it('maydonlarni yangilaydi va audit yozadi', async () => {
      const { service, mocks } = build();
      const q = makeQ();
      mocks.repo.findOne.mockResolvedValue(q);
      mocks.repo.save.mockResolvedValue({ ...q, questionText: 'Yangi savol' });

      const result = await service.update('10', { questionText: 'Yangi savol' }, CTX);

      expect(mocks.repo.save).toHaveBeenCalled();
      expect(mocks.audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'interview_question.update' }),
      );
      expect(result.questionText).toBe('Yangi savol');
    });

    it('topilmasa NotFoundException tashlaydi', async () => {
      const { service, mocks } = build();
      mocks.repo.findOne.mockResolvedValue(null);

      await expect(service.update('99', {}, CTX)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it("o'chiradi va audit yozadi", async () => {
      const { service, mocks } = build();
      const q = makeQ();
      mocks.repo.findOne.mockResolvedValue(q);
      mocks.repo.remove.mockResolvedValue(q);

      await service.remove('10', CTX);

      expect(mocks.repo.remove).toHaveBeenCalledWith(q);
      expect(mocks.audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'interview_question.delete', entityId: '10' }),
      );
    });

    it('topilmasa NotFoundException tashlaydi', async () => {
      const { service, mocks } = build();
      mocks.repo.findOne.mockResolvedValue(null);

      await expect(service.remove('99', CTX)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
