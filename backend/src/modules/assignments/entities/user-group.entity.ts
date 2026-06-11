import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * `user_groups` jadvali — minimal o'qish uchun ko'rinish (tayinlov maqsadlarini
 * tekshirish va a'zolarga kod tarqatish uchun). To'liq guruh boshqaruvi (CRUD)
 * keyingi bosqichda alohida modulda quriladi.
 */
@Entity({ name: 'user_groups' })
export class UserGroup {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;
}
