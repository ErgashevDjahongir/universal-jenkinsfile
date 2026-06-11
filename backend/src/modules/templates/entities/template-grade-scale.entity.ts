import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { GradeValue } from '../../../common/enums/grade-value.enum';
import { TestTemplate } from './test-template.entity';

/** `template_grade_scale` jadvali — darajali baholash shkalasi. */
@Entity({ name: 'template_grade_scale' })
export class TemplateGradeScale {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'template_id', type: 'bigint' })
  templateId!: string;

  @Column({ type: 'enum', enum: GradeValue, enumName: 'grade_value' })
  grade!: GradeValue;

  @Column({ name: 'min_percent', type: 'numeric', precision: 5, scale: 2 })
  minPercent!: string;

  @ManyToOne(() => TestTemplate, (t) => t.gradeScale, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template!: TestTemplate;
}
