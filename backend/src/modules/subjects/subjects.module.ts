import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { ExpertSubject } from './entities/expert-subject.entity';
import { Subject } from './entities/subject.entity';
import { ExpertsController } from './experts.controller';
import { ExpertSubjectsService } from './expert-subjects.service';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

@Module({
  imports: [TypeOrmModule.forFeature([Subject, Category, ExpertSubject])],
  controllers: [SubjectsController, CategoriesController, ExpertsController],
  providers: [SubjectsService, CategoriesService, ExpertSubjectsService],
  // QuestionsModule ekspert ownership tekshiruvi uchun ExpertSubjectsService va
  // fan/kategoriya tekshiruvi uchun SubjectsService/CategoriesService dan foydalanadi.
  exports: [SubjectsService, CategoriesService, ExpertSubjectsService],
})
export class SubjectsModule {}
