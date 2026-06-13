import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CandidateStatus } from '../../../common/enums/candidate-status.enum';
import { User } from '../../users/entities/user.entity';
import { CandidateDocument } from './candidate-document.entity';

@Entity({ name: 'candidates' })
export class Candidate {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({
    type: 'enum',
    enum: CandidateStatus,
    enumName: 'candidate_status',
    default: CandidateStatus.PENDING,
  })
  status!: CandidateStatus;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: User | null;

  @OneToMany(() => CandidateDocument, (d) => d.candidate)
  documents!: CandidateDocument[];
}
