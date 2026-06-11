import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DifficultyLevel } from '../../../common/enums/difficulty-level.enum';
import { QuestionStatus } from '../../../common/enums/question-status.enum';
import { QuestionType } from '../../../common/enums/question-type.enum';
import { Category } from '../../subjects/entities/category.entity';
import { QuestionOption } from './question-option.entity';

/** `questions` jadvali — savollar banki. */
@Entity({ name: 'questions' })
export class Question {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'subject_id', type: 'bigint' })
  subjectId!: string;

  @Column({ type: 'enum', enum: QuestionType, enumName: 'question_type' })
  type!: QuestionType;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    enumName: 'difficulty_level',
    default: DifficultyLevel.MEDIUM,
  })
  difficulty!: DifficultyLevel;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 1 })
  points!: string;

  @Column({
    type: 'enum',
    enum: QuestionStatus,
    enumName: 'question_status',
    default: QuestionStatus.DRAFT,
  })
  status!: QuestionStatus;

  @Column({ type: 'text', nullable: true })
  explanation!: string | null;

  @Column({ name: 'answer_key', type: 'text', nullable: true })
  answerKey!: string | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'approved_by', type: 'bigint', nullable: true })
  approvedBy!: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'times_used', type: 'int', default: 0 })
  timesUsed!: number;

  @Column({ name: 'times_correct', type: 'int', default: 0 })
  timesCorrect!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => QuestionOption, (option) => option.question, {
    cascade: true,
  })
  options!: QuestionOption[];

  @ManyToMany(() => Category)
  @JoinTable({
    name: 'question_categories',
    joinColumn: { name: 'question_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories!: Category[];
}
