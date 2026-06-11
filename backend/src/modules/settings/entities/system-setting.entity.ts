import { Column, Entity, PrimaryColumn } from 'typeorm';

/** `system_settings` — kalit/qiymat (JSONB) umumiy sozlamalar. */
@Entity({ name: 'system_settings' })
export class SystemSetting {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key!: string;

  @Column({ type: 'jsonb' })
  value!: unknown;
}
