import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Taymer faqat "Testni boshlash" bosilganda boshlanishi uchun yangi `ready` holati.
 * Kod bilan kirilganda sessiya `ready` bo'ladi; `started_at`/`deadline_at` hali NULL
 * (taymer yo'q). "Testni boshlash"da server `started_at`/`deadline_at` ni yozadi va
 * holat `in_progress` ga o'tadi. Shu sabab ikkala ustun NULL bo'lishiga ruxsat beriladi.
 */
export class AddReadySessionStatus1749830000000 implements MigrationInterface {
  name = 'AddReadySessionStatus1749830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'ready';`);
    await queryRunner.query(`ALTER TABLE test_sessions ALTER COLUMN started_at DROP NOT NULL;`);
    await queryRunner.query(`ALTER TABLE test_sessions ALTER COLUMN started_at DROP DEFAULT;`);
    await queryRunner.query(`ALTER TABLE test_sessions ALTER COLUMN deadline_at DROP NOT NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL enum qiymatini olib tashlashni qo'llab-quvvatlamaydi; 'ready' qiymati qoladi.
    // Boshlanmagan (ready) sessiyalar bo'lsa, NOT NULL tiklashdan oldin ularni tozalash kerak.
    await queryRunner.query(`ALTER TABLE test_sessions ALTER COLUMN deadline_at SET NOT NULL;`);
    await queryRunner.query(`ALTER TABLE test_sessions ALTER COLUMN started_at SET DEFAULT now();`);
    await queryRunner.query(`ALTER TABLE test_sessions ALTER COLUMN started_at SET NOT NULL;`);
  }
}
