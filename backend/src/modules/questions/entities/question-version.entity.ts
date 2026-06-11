import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** `question_versions` — savol o'zgarishlari tarixi (to'liq snapshot, JSONB). */
@Entity({ name: 'question_versions' })
export class QuestionVersion {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'question_id', type: 'bigint' })
  questionId!: string;

  @Column({ type: 'jsonb' })
  snapshot!: Record<string, unknown>;

  @Column({ name: 'changed_by', type: 'bigint', nullable: true })
  changedBy!: string | null;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt!: Date;
}
