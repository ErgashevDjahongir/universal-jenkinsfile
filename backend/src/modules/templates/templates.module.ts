import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../subjects/entities/category.entity';
import { Question } from '../questions/entities/question.entity';
import { SubjectsModule } from '../subjects/subjects.module';
import { TemplateFixedQuestion } from './entities/template-fixed-question.entity';
import { TemplateGradeScale } from './entities/template-grade-scale.entity';
import { TemplateSelectionRule } from './entities/template-selection-rule.entity';
import { TestTemplate } from './entities/test-template.entity';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestTemplate,
      TemplateGradeScale,
      TemplateFixedQuestion,
      TemplateSelectionRule,
      Question,
      Category,
    ]),
    SubjectsModule,
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
