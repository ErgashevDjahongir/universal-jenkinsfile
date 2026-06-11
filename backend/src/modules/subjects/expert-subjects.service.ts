import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubjectsService } from './subjects.service';
import { ExpertSubject } from './entities/expert-subject.entity';

@Injectable()
export class ExpertSubjectsService {
  constructor(
    @InjectRepository(ExpertSubject)
    private readonly expertSubjects: Repository<ExpertSubject>,
    private readonly subjects: SubjectsService,
  ) {}

  /** Ekspertning fanlar to'plamini to'liq almashtiradi (admin tomonidan). */
  async setForExpert(userId: string, subjectIds: string[]): Promise<ExpertSubject[]> {
    for (const subjectId of subjectIds) {
      await this.subjects.assertExists(subjectId);
    }
    await this.expertSubjects.delete({ userId });
    if (subjectIds.length === 0) {
      return [];
    }
    const rows = subjectIds.map((subjectId) => this.expertSubjects.create({ userId, subjectId }));
    return this.expertSubjects.save(rows);
  }

  listForExpert(userId: string): Promise<ExpertSubject[]> {
    return this.expertSubjects.find({ where: { userId } });
  }

  /** Ekspert shu fanga savol kirita oladimi. */
  isAssigned(userId: string, subjectId: string): Promise<boolean> {
    return this.expertSubjects.exists({ where: { userId, subjectId } });
  }
}
