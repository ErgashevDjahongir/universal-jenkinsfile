import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TestTemplate } from './test-template.entity';

/** `template_fixed_questions` jadvali — qo'lda tanlangan (majburiy) savollar. */
@Entity({ name: 'template_fixed_questions' })
export class TemplateFixedQuestion {
  @PrimaryColumn({ name: 'template_id', type: 'bigint' })
  templateId!: string;

  @PrimaryColumn({ name: 'question_id', type: 'bigint' })
  questionId!: string;

  /** NULL = savolning bankdagi bali ishlatiladi. */
  @Column({ name: 'points_override', type: 'numeric', precision: 5, scale: 2, nullable: true })
  pointsOverride!: string | null;

  @Column({ name: 'order_index', type: 'smallint', default: 0 })
  orderIndex!: number;

  @ManyToOne(() => TestTemplate, (t) => t.fixedQuestions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template!: TestTemplate;
}
