import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NavigationMode } from '../../../common/enums/navigation-mode.enum';
import { ResultVisibility } from '../../../common/enums/result-visibility.enum';
import { TemplateStatus } from '../../../common/enums/template-status.enum';
import { TemplateFixedQuestion } from './template-fixed-question.entity';
import { TemplateGradeScale } from './template-grade-scale.entity';
import { TemplateSelectionRule } from './template-selection-rule.entity';

/** `test_templates` jadvali — test shabloni (konfiguratsiya). */
@Entity({ name: 'test_templates' })
export class TestTemplate {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: TemplateStatus,
    enumName: 'template_status',
    default: TemplateStatus.DRAFT,
  })
  status!: TemplateStatus;

  @Column({ name: 'time_limit_minutes', type: 'smallint', default: 60 })
  timeLimitMinutes!: number;

  @Column({ name: 'passing_score_percent', type: 'numeric', precision: 5, scale: 2, default: 60 })
  passingScorePercent!: string;

  @Column({ name: 'max_attempts', type: 'smallint', default: 1 })
  maxAttempts!: number;

  @Column({ name: 'attempt_interval_minutes', type: 'int', default: 0 })
  attemptIntervalMinutes!: number;

  @Column({
    type: 'enum',
    enum: NavigationMode,
    enumName: 'navigation_mode',
    default: NavigationMode.FREE,
  })
  navigation!: NavigationMode;

  @Column({
    name: 'result_visibility',
    type: 'enum',
    enum: ResultVisibility,
    enumName: 'result_visibility',
    default: ResultVisibility.IMMEDIATELY_SCORE,
  })
  resultVisibility!: ResultVisibility;

  @Column({ name: 'shuffle_questions', default: true })
  shuffleQuestions!: boolean;

  @Column({ name: 'shuffle_options', default: true })
  shuffleOptions!: boolean;

  @Column({ name: 'partial_scoring', default: false })
  partialScoring!: boolean;

  @Column({ name: 'negative_marking', default: false })
  negativeMarking!: boolean;

  @Column({ name: 'negative_points', type: 'numeric', precision: 5, scale: 2, default: 0 })
  negativePoints!: string;

  @Column({ name: 'avoid_repeat_questions', default: true })
  avoidRepeatQuestions!: boolean;

  @Column({ name: 'max_tab_switches', type: 'smallint', default: 3 })
  maxTabSwitches!: number;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => TemplateGradeScale, (g) => g.template, { cascade: true })
  gradeScale!: TemplateGradeScale[];

  @OneToMany(() => TemplateFixedQuestion, (f) => f.template, { cascade: true })
  fixedQuestions!: TemplateFixedQuestion[];

  @OneToMany(() => TemplateSelectionRule, (r) => r.template, { cascade: true })
  selectionRules!: TemplateSelectionRule[];
}
