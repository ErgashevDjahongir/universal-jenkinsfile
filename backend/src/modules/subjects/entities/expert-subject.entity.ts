import { Entity, PrimaryColumn } from 'typeorm';

/** `expert_subjects` — ekspert qaysi fanlar bo'yicha savol kirita olishi (kompozit PK). */
@Entity({ name: 'expert_subjects' })
export class ExpertSubject {
  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @PrimaryColumn({ name: 'subject_id', type: 'bigint' })
  subjectId!: string;
}
