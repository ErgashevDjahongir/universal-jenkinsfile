import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Question } from './question.entity';

/**
 * `question_options` — javob variantlari.
 * DIQQAT: is_correct faqat server tomonida; examinee response'iga HECH QACHON kirmaydi.
 */
@Entity({ name: 'question_options' })
export class QuestionOption {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'question_id', type: 'bigint' })
  questionId!: string;

  @Column({ type: 'text' })
  text!: string;

  @Column({ name: 'is_correct', default: false })
  isCorrect!: boolean;

  @Column({ name: 'order_index', type: 'smallint', default: 0 })
  orderIndex!: number;

  @Column({ name: 'match_pair', type: 'text', nullable: true })
  matchPair!: string | null;

  @ManyToOne(() => Question, (question) => question.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question?: Question;
}
