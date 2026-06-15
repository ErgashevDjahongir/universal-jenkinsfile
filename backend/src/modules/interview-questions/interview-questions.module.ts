import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { InterviewQuestion } from './entities/interview-question.entity';
import { InterviewQuestionsController } from './interview-questions.controller';
import { InterviewQuestionsService } from './interview-questions.service';

@Module({
  imports: [TypeOrmModule.forFeature([InterviewQuestion]), AuditModule],
  controllers: [InterviewQuestionsController],
  providers: [InterviewQuestionsService],
})
export class InterviewQuestionsModule {}
