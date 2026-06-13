import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { AccessCode } from '../assignments/entities/access-code.entity';
import { TestAssignment } from '../assignments/entities/test-assignment.entity';
import { AuthModule } from '../auth/auth.module';
import { Candidate } from '../candidates/entities/candidate.entity';
import { Question } from '../questions/entities/question.entity';
import { TemplatesModule } from '../templates/templates.module';
import { UsersModule } from '../users/users.module';
import { SessionAnswer } from './entities/session-answer.entity';
import { SessionQuestion } from './entities/session-question.entity';
import { TestSession } from './entities/test-session.entity';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { VerifyController } from './verify.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestSession,
      SessionQuestion,
      SessionAnswer,
      AccessCode,
      TestAssignment,
      Question,
      Candidate,
    ]),
    TemplatesModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [SessionsController, VerifyController],
  providers: [SessionsService, RateLimitGuard],
  exports: [SessionsService],
})
export class SessionsModule {}
