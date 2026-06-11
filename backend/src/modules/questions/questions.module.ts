import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectsModule } from '../subjects/subjects.module';
import { Category } from '../subjects/entities/category.entity';
import { Question } from './entities/question.entity';
import { QuestionAttachment } from './entities/question-attachment.entity';
import { QuestionOption } from './entities/question-option.entity';
import { QuestionVersion } from './entities/question-version.entity';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Question,
      QuestionOption,
      QuestionAttachment,
      QuestionVersion,
      Category,
    ]),
    SubjectsModule,
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
