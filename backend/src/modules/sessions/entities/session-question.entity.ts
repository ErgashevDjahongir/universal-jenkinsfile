import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Question } from '../../questions/entities/question.entity';
import { SessionAnswer } from './session-answer.entity';
import { TestSession } from './test-session.entity';

/**
 * `session_questions` jadvali — sessiyaga MUHRLANGAN savollar.
 * Tartib (`order_index`), variantlar tartibi (`options_order`) va ball (`points`)
 * sessiya ochilishida snapshot qilinadi; refresh'da o'zgarmaydi.
 */
@Entity({ name: 'session_questions' })
export class SessionQuestion {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'session_id', type: 'bigint' })
  sessionId!: string;

  @Column({ name: 'question_id', type: 'bigint' })
  questionId!: string;

  @Column({ name: 'order_index', type: 'smallint' })
  orderIndex!: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  points!: string;

  /** Aralashtirilgan variantlar tartibi — [option_id, ...] (string id'lar). */
  @Column({ name: 'options_order', type: 'jsonb', default: () => "'[]'" })
  optionsOrder!: string[];

  @ManyToOne(() => TestSession, (s) => s.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session?: TestSession;

  @ManyToOne(() => Question, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'question_id' })
  question?: Question;

  @OneToOne(() => SessionAnswer, (a) => a.sessionQuestion)
  answer?: SessionAnswer | null;
}
