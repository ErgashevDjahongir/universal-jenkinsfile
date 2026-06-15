import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** `interview_questions` jadvali — og'zaki suhbat uchun ma'lumotnoma savollar. */
@Entity({ name: 'interview_questions' })
export class InterviewQuestion {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'subject_id', type: 'bigint' })
  subjectId!: string;

  @Column({ name: 'question_text', type: 'text' })
  questionText!: string;

  @Column({ name: 'expected_answer', type: 'text' })
  expectedAnswer!: string;

  @Column({ type: 'text', nullable: true })
  rationale!: string | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
