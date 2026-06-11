import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TestTemplate } from '../../templates/entities/test-template.entity';
import { AccessCode } from './access-code.entity';
import { AssignmentTarget } from './assignment-target.entity';

/** `test_assignments` jadvali — tayinlov (faollik oynasi bilan rejalashtirilgan test). */
@Entity({ name: 'test_assignments' })
export class TestAssignment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'template_id', type: 'bigint' })
  templateId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => TestTemplate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_id' })
  template?: TestTemplate;

  @OneToMany(() => AssignmentTarget, (t) => t.assignment, { cascade: true })
  targets!: AssignmentTarget[];

  @OneToMany(() => AccessCode, (c) => c.assignment)
  codes!: AccessCode[];
}
