import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CandidateStatus } from '../../common/enums/candidate-status.enum';
import { SessionStatus } from '../../common/enums/session-status.enum';
import { TestAssignment } from '../assignments/entities/test-assignment.entity';
import { AuditService } from '../audit/audit.service';
import { TestSession } from '../sessions/entities/test-session.entity';
import { Candidate } from './entities/candidate.entity';

/** Sessiya holatlari yakunlangan hisoblanadi. */
const FINISHED_STATUSES = [
  SessionStatus.COMPLETED,
  SessionStatus.TERMINATED,
  SessionStatus.EXPIRED,
];

/**
 * Tayinlov muddati o'tganda candidate holatini avtomatik yangilaydi.
 * Har 5 daqiqada ishlaydi; status o'zgarishi audit logga yoziladi.
 *
 * Qoida (TZ §G):
 *  - test topshirgan (yakunlangan sessiya mavjud) → COMPLETED
 *  - umuman kirmagan (sessiya yo'q)               → NO_SHOW
 */
@Injectable()
export class CandidateStatusScheduler {
  private readonly logger = new Logger(CandidateStatusScheduler.name);

  constructor(
    @InjectRepository(Candidate) private readonly candidates: Repository<Candidate>,
    @InjectRepository(TestAssignment) private readonly assignments: Repository<TestAssignment>,
    @InjectRepository(TestSession) private readonly sessions: Repository<TestSession>,
    private readonly audit: AuditService,
  ) {}

  @Cron('*/5 * * * *', { name: 'candidate-status-expire' })
  async expireCandidates(): Promise<void> {
    // Muddati o'tgan tayinlovlarga biriktirilgan, hali aktiv holattagi candidatelar.
    const expired = await this.candidates
      .createQueryBuilder('c')
      .innerJoin(TestAssignment, 'a', 'a.candidate_id = c.id')
      .where('a.ends_at < NOW()')
      .andWhere('c.status IN (:...statuses)', {
        statuses: [CandidateStatus.PENDING, CandidateStatus.IN_PROGRESS],
      })
      .getMany();

    if (expired.length === 0) {
      return;
    }

    const candidateIds = expired.map((c) => c.id);

    // Yakunlangan sessiyasi bor candidatelar — COMPLETED bo'lishi kerak.
    const finishedSessions = await this.sessions.find({
      where: {
        candidateId: In(candidateIds),
        status: In(FINISHED_STATUSES),
        isPreview: false,
      },
      select: { candidateId: true },
    });
    const completedSet = new Set(
      finishedSessions.map((s) => s.candidateId).filter((id): id is string => id !== null),
    );

    for (const candidate of expired) {
      const newStatus = completedSet.has(candidate.id)
        ? CandidateStatus.COMPLETED
        : CandidateStatus.NO_SHOW;

      if (candidate.status === newStatus) {
        continue;
      }

      await this.candidates.update({ id: candidate.id }, { status: newStatus });
      await this.audit.log({
        userId: null,
        action: `candidate.auto_${newStatus}`,
        entity: 'candidate',
        entityId: candidate.id,
        details: { previousStatus: candidate.status, reason: 'assignment_ended' },
      });
      this.logger.log(`Candidate ${candidate.id}: ${candidate.status} → ${newStatus}`);
    }
  }
}
