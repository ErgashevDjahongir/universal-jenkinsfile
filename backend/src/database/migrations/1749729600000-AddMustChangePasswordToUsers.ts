import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMustChangePasswordToUsers1749729600000 implements MigrationInterface {
  name = 'AddMustChangePasswordToUsers1749729600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN must_change_password
    `);
  }
}
