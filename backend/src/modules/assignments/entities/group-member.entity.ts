import { Entity, PrimaryColumn } from 'typeorm';

/**
 * `group_members` jadvali — guruh ↔ foydalanuvchi (minimal o'qish ko'rinishi).
 * Kod tarqatishda guruhni a'zolariga yoyish uchun ishlatiladi.
 */
@Entity({ name: 'group_members' })
export class GroupMember {
  @PrimaryColumn({ name: 'group_id', type: 'bigint' })
  groupId!: string;

  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId!: string;
}
