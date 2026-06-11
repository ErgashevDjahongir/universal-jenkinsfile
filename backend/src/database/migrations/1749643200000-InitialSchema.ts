import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Boshlang'ich sxema — docs/schema.sql ning to'liq nusxasi (PostgreSQL 18).
 * Manba hujjat o'zgarsa, yangi migratsiya yarating; bu faylni tahrirlamang.
 *
 * TypeORM migratsiyani tranzaksiya ichida ishga tushiradi, shuning uchun
 * bu yerda BEGIN/COMMIT yo'q.
 */
export class InitialSchema1749643200000 implements MigrationInterface {
  name = 'InitialSchema1749643200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------------------------------------------------
    // 1. ENUM TURLARI
    // -------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'expert', 'examinee');
      CREATE TYPE user_status AS ENUM ('active', 'blocked', 'archived');
      CREATE TYPE question_type AS ENUM (
        'single_choice', 'multiple_choice', 'true_false', 'matching', 'ordering', 'short_answer'
      );
      CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
      CREATE TYPE question_status AS ENUM ('draft', 'approved', 'active', 'archived');
      CREATE TYPE template_status AS ENUM ('draft', 'active', 'archived');
      CREATE TYPE navigation_mode AS ENUM ('free', 'forward_only');
      CREATE TYPE result_visibility AS ENUM ('immediately_full', 'immediately_score', 'hidden');
      CREATE TYPE session_status AS ENUM (
        'in_progress', 'completed', 'expired', 'terminated', 'cancelled'
      );
      CREATE TYPE grade_value AS ENUM ('excellent', 'good', 'satisfactory', 'unsatisfactory');
    `);

    // -------------------------------------------------------------------
    // 2. TASHKILIY TUZILMA
    // -------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE departments (
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        parent_id   BIGINT REFERENCES departments(id) ON DELETE SET NULL,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (name, parent_id)
      );

      CREATE TABLE positions (
        id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name          VARCHAR(255) NOT NULL UNIQUE,
        department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
        is_active     BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // -------------------------------------------------------------------
    // 3. FOYDALANUVCHILAR VA GURUHLAR
    // -------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE users (
        id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        last_name       VARCHAR(100) NOT NULL,
        first_name      VARCHAR(100) NOT NULL,
        middle_name     VARCHAR(100),
        login           VARCHAR(100) UNIQUE,
        password_hash   VARCHAR(255),
        phone           VARCHAR(20),
        email           VARCHAR(255),
        role            user_role NOT NULL DEFAULT 'examinee',
        status          user_status NOT NULL DEFAULT 'active',
        department_id   BIGINT REFERENCES departments(id) ON DELETE SET NULL,
        position_id     BIGINT REFERENCES positions(id) ON DELETE SET NULL,
        is_candidate    BOOLEAN NOT NULL DEFAULT FALSE,
        failed_attempts SMALLINT NOT NULL DEFAULT 0,
        locked_until    TIMESTAMPTZ,
        last_login_at   TIMESTAMPTZ,
        created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_staff_has_login CHECK (
          role = 'examinee' OR (login IS NOT NULL AND password_hash IS NOT NULL)
        )
      );

      CREATE TABLE expert_subjects (
        user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id BIGINT NOT NULL,
        PRIMARY KEY (user_id, subject_id)
      );

      CREATE TABLE user_groups (
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name        VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE group_members (
        group_id BIGINT NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
        user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (group_id, user_id)
      );
    `);

    // -------------------------------------------------------------------
    // 4. SAVOLLAR BANKI
    // -------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE subjects (
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name        VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      ALTER TABLE expert_subjects
        ADD CONSTRAINT fk_expert_subjects_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

      CREATE TABLE categories (
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        name       VARCHAR(255) NOT NULL,
        parent_id  BIGINT REFERENCES categories(id) ON DELETE SET NULL,
        is_active  BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (subject_id, name)
      );

      CREATE TABLE questions (
        id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        subject_id    BIGINT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
        type          question_type NOT NULL,
        difficulty    difficulty_level NOT NULL DEFAULT 'medium',
        text          TEXT NOT NULL,
        points        NUMERIC(5,2) NOT NULL DEFAULT 1.00,
        status        question_status NOT NULL DEFAULT 'draft',
        explanation   TEXT,
        answer_key    TEXT,
        created_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
        approved_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
        approved_at   TIMESTAMPTZ,
        times_used    INTEGER NOT NULL DEFAULT 0,
        times_correct INTEGER NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_points_positive CHECK (points > 0)
      );

      CREATE TABLE question_categories (
        question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (question_id, category_id)
      );

      CREATE TABLE question_options (
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        text        TEXT NOT NULL,
        is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
        order_index SMALLINT NOT NULL DEFAULT 0,
        match_pair  TEXT
      );

      CREATE TABLE question_attachments (
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        file_path   VARCHAR(500) NOT NULL,
        mime_type   VARCHAR(100) NOT NULL,
        file_size   INTEGER NOT NULL,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE question_versions (
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        snapshot    JSONB NOT NULL,
        changed_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
        changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // -------------------------------------------------------------------
    // 5. TEST SHABLONLARI
    // -------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE test_templates (
        id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        title                    VARCHAR(255) NOT NULL,
        description              TEXT,
        status                   template_status NOT NULL DEFAULT 'draft',
        time_limit_minutes       SMALLINT NOT NULL DEFAULT 60,
        passing_score_percent    NUMERIC(5,2) NOT NULL DEFAULT 60.00,
        max_attempts             SMALLINT NOT NULL DEFAULT 1,
        attempt_interval_minutes INTEGER NOT NULL DEFAULT 0,
        navigation               navigation_mode NOT NULL DEFAULT 'free',
        result_visibility        result_visibility NOT NULL DEFAULT 'immediately_score',
        shuffle_questions        BOOLEAN NOT NULL DEFAULT TRUE,
        shuffle_options          BOOLEAN NOT NULL DEFAULT TRUE,
        partial_scoring          BOOLEAN NOT NULL DEFAULT FALSE,
        negative_marking         BOOLEAN NOT NULL DEFAULT FALSE,
        negative_points          NUMERIC(5,2) NOT NULL DEFAULT 0,
        avoid_repeat_questions   BOOLEAN NOT NULL DEFAULT TRUE,
        max_tab_switches         SMALLINT NOT NULL DEFAULT 3,
        created_by               BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_time_limit  CHECK (time_limit_minutes BETWEEN 1 AND 600),
        CONSTRAINT chk_passing     CHECK (passing_score_percent BETWEEN 0 AND 100),
        CONSTRAINT chk_attempts    CHECK (max_attempts >= 1),
        CONSTRAINT chk_neg_points  CHECK (negative_points >= 0)
      );

      CREATE TABLE template_grade_scale (
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        template_id BIGINT NOT NULL REFERENCES test_templates(id) ON DELETE CASCADE,
        grade       grade_value NOT NULL,
        min_percent NUMERIC(5,2) NOT NULL,
        UNIQUE (template_id, grade)
      );

      CREATE TABLE template_fixed_questions (
        template_id     BIGINT NOT NULL REFERENCES test_templates(id) ON DELETE CASCADE,
        question_id     BIGINT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
        points_override NUMERIC(5,2),
        order_index     SMALLINT NOT NULL DEFAULT 0,
        PRIMARY KEY (template_id, question_id),
        CONSTRAINT chk_override_positive CHECK (points_override IS NULL OR points_override > 0)
      );

      CREATE TABLE template_selection_rules (
        id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        template_id    BIGINT NOT NULL REFERENCES test_templates(id) ON DELETE CASCADE,
        subject_id     BIGINT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
        category_id    BIGINT REFERENCES categories(id) ON DELETE RESTRICT,
        difficulty     difficulty_level,
        question_count SMALLINT NOT NULL,
        CONSTRAINT chk_rule_count CHECK (question_count > 0)
      );
    `);

    // -------------------------------------------------------------------
    // 6. TAYINLOVLAR VA TEST SESSIYALARI
    //    (is_preview va certificate_uid — aniqlashtirilgan qarorlar §11)
    // -------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE test_assignments (
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        template_id BIGINT NOT NULL REFERENCES test_templates(id) ON DELETE RESTRICT,
        title       VARCHAR(255) NOT NULL,
        starts_at   TIMESTAMPTZ NOT NULL,
        ends_at     TIMESTAMPTZ NOT NULL,
        created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_window CHECK (ends_at > starts_at)
      );

      CREATE TABLE assignment_targets (
        id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        assignment_id BIGINT NOT NULL REFERENCES test_assignments(id) ON DELETE CASCADE,
        user_id       BIGINT REFERENCES users(id) ON DELETE CASCADE,
        group_id      BIGINT REFERENCES user_groups(id) ON DELETE CASCADE,
        CONSTRAINT chk_one_target CHECK (
          (user_id IS NOT NULL AND group_id IS NULL) OR
          (user_id IS NULL AND group_id IS NOT NULL)
        ),
        UNIQUE (assignment_id, user_id),
        UNIQUE (assignment_id, group_id)
      );

      CREATE TABLE access_codes (
        id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        assignment_id BIGINT NOT NULL REFERENCES test_assignments(id) ON DELETE CASCADE,
        code          VARCHAR(20) NOT NULL UNIQUE,
        user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
        used_at       TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE test_sessions (
        id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        assignment_id   BIGINT NOT NULL REFERENCES test_assignments(id) ON DELETE RESTRICT,
        user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        attempt_number  SMALLINT NOT NULL DEFAULT 1,
        status          session_status NOT NULL DEFAULT 'in_progress',
        started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        deadline_at     TIMESTAMPTZ NOT NULL,
        finished_at     TIMESTAMPTZ,
        score           NUMERIC(7,2),
        max_score       NUMERIC(7,2),
        percent         NUMERIC(5,2),
        passed          BOOLEAN,
        grade           grade_value,
        tab_switches    SMALLINT NOT NULL DEFAULT 0,
        is_preview      BOOLEAN NOT NULL DEFAULT FALSE,
        certificate_uid UUID UNIQUE,
        ip_address      INET,
        user_agent      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (assignment_id, user_id, attempt_number)
      );

      CREATE TABLE session_questions (
        id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        session_id     BIGINT NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
        question_id    BIGINT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
        order_index    SMALLINT NOT NULL,
        points         NUMERIC(5,2) NOT NULL,
        options_order  JSONB NOT NULL DEFAULT '[]',
        UNIQUE (session_id, question_id),
        UNIQUE (session_id, order_index)
      );

      CREATE TABLE session_answers (
        id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        session_question_id BIGINT NOT NULL UNIQUE REFERENCES session_questions(id) ON DELETE CASCADE,
        selected_options    JSONB,
        answer_text         TEXT,
        is_correct          BOOLEAN,
        awarded_points      NUMERIC(5,2),
        answered_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // -------------------------------------------------------------------
    // 7. AUDIT VA TIZIM SOZLAMALARI
    // -------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE audit_log (
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
        action     VARCHAR(100) NOT NULL,
        entity     VARCHAR(100),
        entity_id  BIGINT,
        details    JSONB,
        ip_address INET,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE system_settings (
        key        VARCHAR(100) PRIMARY KEY,
        value      JSONB NOT NULL,
        updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      INSERT INTO system_settings (key, value) VALUES
        ('organization_name',      '"Tashkilot nomi"'),
        ('default_passing_score',  '60'),
        ('default_question_points','{"easy": 1, "medium": 2, "hard": 3}'),
        ('session_timeout_minutes','30');
    `);

    // -------------------------------------------------------------------
    // 8. INDEKSLAR
    // -------------------------------------------------------------------
    await queryRunner.query(`
      CREATE INDEX idx_users_role_status   ON users (role, status);
      CREATE INDEX idx_users_department    ON users (department_id);
      CREATE INDEX idx_users_fio           ON users (last_name, first_name);

      CREATE INDEX idx_questions_selection ON questions (subject_id, difficulty, status);
      CREATE INDEX idx_qcat_category       ON question_categories (category_id);
      CREATE INDEX idx_options_question    ON question_options (question_id);
      CREATE INDEX idx_categories_subject  ON categories (subject_id);

      CREATE INDEX idx_rules_template      ON template_selection_rules (template_id);
      CREATE INDEX idx_assignments_window  ON test_assignments (starts_at, ends_at);
      CREATE INDEX idx_targets_user        ON assignment_targets (user_id);
      CREATE INDEX idx_targets_group       ON assignment_targets (group_id);

      CREATE INDEX idx_sessions_user       ON test_sessions (user_id, status);
      CREATE INDEX idx_sessions_assignment ON test_sessions (assignment_id, status);
      CREATE INDEX idx_sessions_finished   ON test_sessions (finished_at);
      CREATE INDEX idx_sq_session          ON session_questions (session_id, order_index);

      CREATE UNIQUE INDEX uq_sessions_one_in_progress
        ON test_sessions (user_id) WHERE status = 'in_progress';

      CREATE INDEX idx_audit_user_time     ON audit_log (user_id, created_at DESC);
      CREATE INDEX idx_audit_entity        ON audit_log (entity, entity_id);
    `);

    // -------------------------------------------------------------------
    // 9. TRIGGERLAR
    // -------------------------------------------------------------------
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at := now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON departments     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      CREATE TRIGGER trg_users_updated       BEFORE UPDATE ON users           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      CREATE TRIGGER trg_questions_updated   BEFORE UPDATE ON questions       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      CREATE TRIGGER trg_templates_updated   BEFORE UPDATE ON test_templates  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      CREATE TRIGGER trg_answers_updated     BEFORE UPDATE ON session_answers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      CREATE OR REPLACE FUNCTION prevent_answer_change_after_finish()
      RETURNS TRIGGER AS $$
      DECLARE
        sess_status session_status;
      BEGIN
        SELECT ts.status INTO sess_status
        FROM session_questions sq
        JOIN test_sessions ts ON ts.id = sq.session_id
        WHERE sq.id = COALESCE(NEW.session_question_id, OLD.session_question_id);

        IF sess_status <> 'in_progress' THEN
          RAISE EXCEPTION 'Yakunlangan sessiya javoblarini o''zgartirish taqiqlanadi';
        END IF;
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_answers_immutable
        BEFORE INSERT OR UPDATE OR DELETE ON session_answers
        FOR EACH ROW EXECUTE FUNCTION prevent_answer_change_after_finish();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Triggerlar va funksiyalar
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_answers_immutable ON session_answers;
      DROP FUNCTION IF EXISTS prevent_answer_change_after_finish();
      DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
    `);

    // Jadvallar (bog'liqlik tartibida teskari)
    await queryRunner.query(`
      DROP TABLE IF EXISTS session_answers;
      DROP TABLE IF EXISTS session_questions;
      DROP TABLE IF EXISTS test_sessions;
      DROP TABLE IF EXISTS access_codes;
      DROP TABLE IF EXISTS assignment_targets;
      DROP TABLE IF EXISTS test_assignments;
      DROP TABLE IF EXISTS template_selection_rules;
      DROP TABLE IF EXISTS template_fixed_questions;
      DROP TABLE IF EXISTS template_grade_scale;
      DROP TABLE IF EXISTS test_templates;
      DROP TABLE IF EXISTS question_versions;
      DROP TABLE IF EXISTS question_attachments;
      DROP TABLE IF EXISTS question_options;
      DROP TABLE IF EXISTS question_categories;
      DROP TABLE IF EXISTS questions;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS subjects;
      DROP TABLE IF EXISTS group_members;
      DROP TABLE IF EXISTS user_groups;
      DROP TABLE IF EXISTS expert_subjects;
      DROP TABLE IF EXISTS audit_log;
      DROP TABLE IF EXISTS system_settings;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS positions;
      DROP TABLE IF EXISTS departments;
    `);

    // ENUM turlari
    await queryRunner.query(`
      DROP TYPE IF EXISTS grade_value;
      DROP TYPE IF EXISTS session_status;
      DROP TYPE IF EXISTS result_visibility;
      DROP TYPE IF EXISTS navigation_mode;
      DROP TYPE IF EXISTS template_status;
      DROP TYPE IF EXISTS question_status;
      DROP TYPE IF EXISTS difficulty_level;
      DROP TYPE IF EXISTS question_type;
      DROP TYPE IF EXISTS user_status;
      DROP TYPE IF EXISTS user_role;
    `);
  }
}
