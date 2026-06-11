import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TestAssignment } from './test-assignment.entity';

/**
 * `access_codes` jadvali — bir martalik kirish kodlari.
 * `used_at` to'lganidan keyin kod qayta ishlatilmaydi (sessiya ochilganda muhrlanadi).
 * `user_id` NULL — o'zini ro'yxatga olish rejimi (kirishda examinee yaratiladi).
 */
@Entity({ name: 'access_codes' })
export class AccessCode {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'assignment_id', type: 'bigint' })
  assignmentId!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code!: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId!: string | null;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => TestAssignment, (a) => a.codes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment?: TestAssignment;
}
