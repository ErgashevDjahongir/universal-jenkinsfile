import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DifficultyLevel } from '../../../common/enums/difficulty-level.enum';
import { TestTemplate } from './test-template.entity';

/** `template_selection_rules` jadvali — avtomatik tanlash qoidalari. */
@Entity({ name: 'template_selection_rules' })
export class TemplateSelectionRule {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'template_id', type: 'bigint' })
  templateId!: string;

  @Column({ name: 'subject_id', type: 'bigint' })
  subjectId!: string;

  /** NULL = fanning barcha kategoriyalaridan. */
  @Column({ name: 'category_id', type: 'bigint', nullable: true })
  categoryId!: string | null;

  /** NULL = istalgan qiyinlik. */
  @Column({ type: 'enum', enum: DifficultyLevel, enumName: 'difficulty_level', nullable: true })
  difficulty!: DifficultyLevel | null;

  @Column({ name: 'question_count', type: 'smallint' })
  questionCount!: number;

  @ManyToOne(() => TestTemplate, (t) => t.selectionRules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template!: TestTemplate;
}
