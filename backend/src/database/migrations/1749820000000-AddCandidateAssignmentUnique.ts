import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Bitta topshiruvchi = bitta tayinlov" (qaror §4) — DB darajasida kafolat.
 * Partial unique: candidate_id NULL bo'lganlar (oddiy user/guruh tayinlovlari) cheklanmaydi.
 */
export class AddCandidateAssignmentUnique1749820000000 implements MigrationInterface {
  name = 'AddCandidateAssignmentUnique1749820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_assignments_candidate
        ON test_assignments (candidate_id) WHERE candidate_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_assignments_candidate;`);
  }
}
