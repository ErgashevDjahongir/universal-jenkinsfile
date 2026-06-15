import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInterviewQuestionsTable1749900000000 implements MigrationInterface {
  name = 'CreateInterviewQuestionsTable1749900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE interview_questions (
        id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        subject_id      BIGINT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
        question_text   TEXT NOT NULL,
        expected_answer TEXT NOT NULL,
        rationale       TEXT,
        created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(
      `CREATE INDEX idx_interview_questions_subject ON interview_questions (subject_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_interview_questions_created_by ON interview_questions (created_by)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_interview_questions_created_by`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_interview_questions_subject`);
    await queryRunner.query(`DROP TABLE IF EXISTS interview_questions;`);
  }
}
