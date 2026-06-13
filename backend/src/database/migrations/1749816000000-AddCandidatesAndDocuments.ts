import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCandidatesAndDocuments1749816000000 implements MigrationInterface {
  name = 'AddCandidatesAndDocuments1749816000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Yangi ENUM turlari
    await queryRunner.query(`
      CREATE TYPE candidate_status AS ENUM ('pending', 'in_progress', 'completed', 'no_show');
      CREATE TYPE document_type    AS ENUM ('recommendation', 'reference', 'application');
    `);

    // 2. candidates jadvali
    await queryRunner.query(`
      CREATE TABLE candidates (
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        full_name  VARCHAR(255) NOT NULL,
        phone      VARCHAR(20)  NOT NULL,
        status     candidate_status NOT NULL DEFAULT 'pending',
        created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 3. candidate_documents jadvali
    //    ON DELETE RESTRICT — candidate o'chsa hujjat tarixini saqlash uchun
    await queryRunner.query(`
      CREATE TABLE candidate_documents (
        id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        candidate_id  BIGINT NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
        doc_type      document_type NOT NULL,
        file_path     VARCHAR(500) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_size     INTEGER NOT NULL,
        uploaded_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
        uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (candidate_id, doc_type)
      );
    `);

    // 4. Mavjud jadvallarga candidate_id ustuni qo'shish
    await queryRunner.query(`
      ALTER TABLE test_assignments ADD COLUMN candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL;
      ALTER TABLE access_codes     ADD COLUMN candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL;
      ALTER TABLE test_sessions    ADD COLUMN candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL;
    `);

    // 5. Indekslar
    await queryRunner.query(`
      CREATE INDEX idx_candidates_status     ON candidates (status);
      CREATE INDEX idx_candidates_created_by ON candidates (created_by);
      CREATE INDEX idx_candidate_docs_cand   ON candidate_documents (candidate_id);
      CREATE INDEX idx_assignments_candidate ON test_assignments (candidate_id);
      CREATE INDEX idx_access_codes_cand     ON access_codes (candidate_id);
      CREATE INDEX idx_sessions_candidate    ON test_sessions (candidate_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Indekslarni olib tashlash
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_sessions_candidate;
      DROP INDEX IF EXISTS idx_access_codes_cand;
      DROP INDEX IF EXISTS idx_assignments_candidate;
      DROP INDEX IF EXISTS idx_candidate_docs_cand;
      DROP INDEX IF EXISTS idx_candidates_created_by;
      DROP INDEX IF EXISTS idx_candidates_status;
    `);

    // candidate_id ustunlarini olib tashlash
    await queryRunner.query(`
      ALTER TABLE test_sessions    DROP COLUMN IF EXISTS candidate_id;
      ALTER TABLE access_codes     DROP COLUMN IF EXISTS candidate_id;
      ALTER TABLE test_assignments DROP COLUMN IF EXISTS candidate_id;
    `);

    // Yangi jadvallarni olib tashlash
    await queryRunner.query(`DROP TABLE IF EXISTS candidate_documents;`);
    await queryRunner.query(`DROP TABLE IF EXISTS candidates;`);

    // ENUM turlarini olib tashlash
    await queryRunner.query(`
      DROP TYPE IF EXISTS document_type;
      DROP TYPE IF EXISTS candidate_status;
    `);
  }
}
