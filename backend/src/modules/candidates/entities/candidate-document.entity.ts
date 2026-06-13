import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DocumentType } from '../../../common/enums/document-type.enum';
import { User } from '../../users/entities/user.entity';
import { Candidate } from './candidate.entity';

@Entity({ name: 'candidate_documents' })
export class CandidateDocument {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'candidate_id', type: 'bigint' })
  candidateId!: string;

  @Column({
    name: 'doc_type',
    type: 'enum',
    enum: DocumentType,
    enumName: 'document_type',
  })
  docType!: DocumentType;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath!: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName!: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize!: number;

  @Column({ name: 'uploaded_by', type: 'bigint', nullable: true })
  uploadedBy!: string | null;

  @Column({ name: 'uploaded_at', type: 'timestamptz', default: () => 'now()' })
  uploadedAt!: Date;

  @ManyToOne(() => Candidate, (c) => c.documents, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'candidate_id' })
  candidate?: Candidate;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploader?: User | null;
}
