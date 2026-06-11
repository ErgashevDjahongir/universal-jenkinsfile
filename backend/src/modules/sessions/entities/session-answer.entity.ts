import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SessionQuestion } from './session-question.entity';

/**
 * `session_answers` jadvali — javoblar (har javob darhol saqlanadi).
 * `is_correct` / `awarded_points` faqat yakunda serverda hisoblanadi.
 */
@Entity({ name: 'session_answers' })
export class SessionAnswer {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'session_question_id', type: 'bigint', unique: true })
  sessionQuestionId!: string;

  /** [option_id, ...] yoki matching/ordering uchun struktura (null = javob berilmagan). */
  @Column({ name: 'selected_options', type: 'jsonb', nullable: true })
  selectedOptions!: unknown;

  @Column({ name: 'answer_text', type: 'text', nullable: true })
  answerText!: string | null;

  @Column({ name: 'is_correct', type: 'boolean', nullable: true })
  isCorrect!: boolean | null;

  @Column({ name: 'awarded_points', type: 'numeric', precision: 5, scale: 2, nullable: true })
  awardedPoints!: string | null;

  @CreateDateColumn({ name: 'answered_at', type: 'timestamptz' })
  answeredAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => SessionQuestion, (q) => q.answer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_question_id' })
  sessionQuestion?: SessionQuestion;
}
