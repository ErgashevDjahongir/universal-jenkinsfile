import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from '../questions/entities/question.entity';
import { TestSession } from '../sessions/entities/test-session.entity';
import { TestTemplate } from '../templates/entities/test-template.entity';
import { User } from '../users/entities/user.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([TestSession, Question, TestTemplate, User])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
