import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GradeValue } from '../../../common/enums/grade-value.enum';
import { SessionStatus } from '../../../common/enums/session-status.enum';
import { TestAssignment } from '../../assignments/entities/test-assignment.entity';
import { Candidate } from '../../candidates/entities/candidate.entity';
import { SessionQuestion } from './session-question.entity';

/**
 * `test_sessions` jadvali — test topshirish sessiyasi.
 * Vaqt nazorati faqat serverda: `deadline_at = started_at + time_limit`.
 * Yakunlangach javoblar o'zgarmas (DB triggeri kafolatlaydi).
 */
@Entity({ name: 'test_sessions' })
export class TestSession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'assignment_id', type: 'bigint' })
  assignmentId!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'attempt_number', type: 'smallint', default: 1 })
  attemptNumber!: number;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    enumName: 'session_status',
    default: SessionStatus.IN_PROGRESS,
  })
  status!: SessionStatus;

  // NULL = sessiya hali `ready` holatda (taymer boshlanmagan). `begin`'da yoziladi.
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'deadline_at', type: 'timestamptz', nullable: true })
  deadlineAt!: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @Column({ type: 'numeric', precision: 7, scale: 2, nullable: true })
  score!: string | null;

  @Column({ name: 'max_score', type: 'numeric', precision: 7, scale: 2, nullable: true })
  maxScore!: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  percent!: string | null;

  @Column({ type: 'boolean', nullable: true })
  passed!: boolean | null;

  @Column({ type: 'enum', enum: GradeValue, enumName: 'grade_value', nullable: true })
  grade!: GradeValue | null;

  @Column({ name: 'tab_switches', type: 'smallint', default: 0 })
  tabSwitches!: number;

  @Column({ name: 'is_preview', type: 'boolean', default: false })
  isPreview!: boolean;

  @Column({ name: 'certificate_uid', type: 'uuid', nullable: true })
  certificateUid!: string | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'candidate_id', type: 'bigint', nullable: true })
  candidateId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => TestAssignment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assignment_id' })
  assignment?: TestAssignment;

  @ManyToOne(() => Candidate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'candidate_id' })
  candidate?: Candidate | null;

  @OneToMany(() => SessionQuestion, (q) => q.session, { cascade: true })
  questions!: SessionQuestion[];
}
