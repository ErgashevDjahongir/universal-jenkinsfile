import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessCode } from '../assignments/entities/access-code.entity';
import { TestAssignment } from '../assignments/entities/test-assignment.entity';
import { AuditModule } from '../audit/audit.module';
import { TestSession } from '../sessions/entities/test-session.entity';
import { TemplatesModule } from '../templates/templates.module';
import { CandidateStatusScheduler } from './candidate-status.scheduler';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { CandidateDocument } from './entities/candidate-document.entity';
import { Candidate } from './entities/candidate.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Candidate,
      CandidateDocument,
      TestAssignment,
      AccessCode,
      TestSession,
    ]),
    TemplatesModule,
    AuditModule,
  ],
  controllers: [CandidatesController],
  providers: [CandidatesService, CandidateStatusScheduler],
  exports: [CandidatesService],
})
export class CandidatesModule {}
