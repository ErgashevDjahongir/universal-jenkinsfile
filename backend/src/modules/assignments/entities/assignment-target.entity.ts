import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TestAssignment } from './test-assignment.entity';

/**
 * `assignment_targets` jadvali — tayinlov kimga: alohida foydalanuvchi YOKI guruh.
 * DB CHECK kafolatlaydi: aynan bittasi (user_id yoki group_id) to'ldiriladi.
 */
@Entity({ name: 'assignment_targets' })
export class AssignmentTarget {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'assignment_id', type: 'bigint' })
  assignmentId!: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId!: string | null;

  @Column({ name: 'group_id', type: 'bigint', nullable: true })
  groupId!: string | null;

  @ManyToOne(() => TestAssignment, (a) => a.targets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment!: TestAssignment;
}
