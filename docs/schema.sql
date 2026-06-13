-- =====================================================================
--  E-TEST tizimi — Ma'lumotlar bazasi sxemasi
--  PostgreSQL 18
--  Versiya: 1.0
--
--  Tuzilma bo'limlari:
--    1. ENUM turlari
--    2. Tashkiliy tuzilma (bo'limlar, lavozimlar)
--    3. Foydalanuvchilar va guruhlar
--    4. Savollar banki
--    5. Test shablonlari
--    6. Test sessiyalari va tayinlovlar
--    7. Audit va tizim sozlamalari
--    8. Indekslar
--    9. Triggerlar (updated_at)
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. ENUM TURLARI
-- =====================================================================

CREATE TYPE user_role AS ENUM (
    'super_admin',   -- Super-administrator
    'admin',         -- Administrator (HR)
    'expert',        -- Ekspert (fan mas'uli)
    'examinee'       -- Test topshiruvchi
);

CREATE TYPE user_status AS ENUM ('active', 'blocked', 'archived');

CREATE TYPE question_type AS ENUM (
    'single_choice',   -- Bitta to'g'ri javob
    'multiple_choice', -- Bir nechta to'g'ri javob
    'true_false',      -- To'g'ri / Noto'g'ri
    'matching',        -- Moslashtirish
    'ordering',        -- Ketma-ketlik
    'short_answer'     -- Ochiq qisqa javob
);

CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

CREATE TYPE question_status AS ENUM ('draft', 'approved', 'active', 'archived');

CREATE TYPE template_status AS ENUM ('draft', 'active', 'archived');

CREATE TYPE navigation_mode AS ENUM ('free', 'forward_only');

CREATE TYPE result_visibility AS ENUM (
    'immediately_full',   -- Darhol, batafsil tahlil bilan
    'immediately_score',  -- Darhol, faqat ball
    'hidden'              -- Ko'rsatilmaydi (faqat admin ko'radi)
);

CREATE TYPE session_status AS ENUM (
    'in_progress',  -- Davom etmoqda
    'completed',    -- Yakunlangan
    'expired',      -- Vaqt tugagan (avtoyakun)
    'terminated',   -- Qoidabuzarlik tufayli to'xtatilgan
    'cancelled'     -- Admin tomonidan bekor qilingan
);

CREATE TYPE grade_value AS ENUM ('excellent', 'good', 'satisfactory', 'unsatisfactory');

CREATE TYPE candidate_status AS ENUM (
    'pending',      -- Hali test topshirmagan
    'in_progress',  -- Test jarayonida
    'completed',    -- Test yakunlangan
    'no_show'       -- Kelmagan
);

CREATE TYPE document_type AS ENUM (
    'recommendation', -- Tavsifnoma
    'reference',      -- Yo'llanma
    'application'     -- Ariza
);

-- =====================================================================
-- 2. TASHKILIY TUZILMA
-- =====================================================================

CREATE TABLE departments (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    parent_id   BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (name, parent_id)
);
COMMENT ON TABLE departments IS 'Tashkilot bo''limlari (ierarxik)';

CREATE TABLE positions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR(255) NOT NULL UNIQUE,
    department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE positions IS 'Lavozimlar spravochnigi';

-- =====================================================================
-- 3. FOYDALANUVCHILAR VA GURUHLAR
-- =====================================================================

CREATE TABLE users (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    last_name       VARCHAR(100) NOT NULL,           -- Familiya
    first_name      VARCHAR(100) NOT NULL,           -- Ism
    middle_name     VARCHAR(100),                    -- Otasining ismi
    login           VARCHAR(100) UNIQUE,             -- Topshiruvchilarda bo'lmasligi mumkin
    password_hash   VARCHAR(255),                    -- bcrypt/argon2; ochiq matn TAQIQLANADI
    phone           VARCHAR(20),
    email           VARCHAR(255),
    role            user_role NOT NULL DEFAULT 'examinee',
    status          user_status NOT NULL DEFAULT 'active',
    department_id   BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    position_id     BIGINT REFERENCES positions(id) ON DELETE SET NULL,
    is_candidate    BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = ishga qabul qilinayotgan nomzod
    failed_attempts SMALLINT NOT NULL DEFAULT 0,     -- Noto'g'ri parol urinishlari
    locked_until    TIMESTAMPTZ,                     -- Vaqtincha bloklash muddati
    last_login_at   TIMESTAMPTZ,
    created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_staff_has_login CHECK (
        role = 'examinee' OR (login IS NOT NULL AND password_hash IS NOT NULL)
    )
);
COMMENT ON TABLE users IS 'Barcha foydalanuvchilar: adminlar, ekspertlar, topshiruvchilar';

CREATE TABLE expert_subjects (
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id BIGINT NOT NULL,  -- FK pastda (subjects yaratilgach) qo'shiladi
    PRIMARY KEY (user_id, subject_id)
);
COMMENT ON TABLE expert_subjects IS 'Ekspert qaysi fanlar bo''yicha savol kirita olishi';

CREATE TABLE user_groups (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE user_groups IS 'Topshiruvchilar guruhlari (masalan: «Buxgalteriya», «Iyun nomzodlari»)';

CREATE TABLE group_members (
    group_id BIGINT NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
    user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
);

-- =====================================================================
-- 3a. NOMZODLAR (CANDIDATES)
--     users jadvalidan alohida; login/parol yo'q — faqat bir martalik kod orqali kiradi
-- =====================================================================

CREATE TABLE candidates (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name  VARCHAR(255) NOT NULL,                                 -- To'liq ismi
    phone      VARCHAR(20)  NOT NULL,
    status     candidate_status NOT NULL DEFAULT 'pending',
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,       -- Yaratgan admin
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE candidates IS 'Ishga qabul qilinayotgan nomzodlar; users jadvalidan alohida, parolsiz';

CREATE TABLE candidate_documents (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    candidate_id  BIGINT NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,  -- Hujjat tarixi saqlanadi
    doc_type      document_type NOT NULL,
    file_path     VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size     INTEGER NOT NULL,
    uploaded_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (candidate_id, doc_type)                                  -- Har turdан bittadan
);
COMMENT ON TABLE candidate_documents IS 'Nomzod hujjatlari (tavsifnoma, yo''llanma, ariza); har turdан bittadan';

-- =====================================================================
-- 4. SAVOLLAR BANKI
-- =====================================================================

CREATE TABLE subjects (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE subjects IS 'Fanlar / yo''nalishlar';

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
COMMENT ON TABLE categories IS 'Fan ichidagi kategoriyalar (mavzular), ierarxik';

CREATE TABLE questions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subject_id    BIGINT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    type          question_type NOT NULL,
    difficulty    difficulty_level NOT NULL DEFAULT 'medium',
    text          TEXT NOT NULL,                      -- Savol matni (formatlangan HTML/Markdown)
    points        NUMERIC(5,2) NOT NULL DEFAULT 1.00, -- Savolning individual bali
    status        question_status NOT NULL DEFAULT 'draft',
    explanation   TEXT,                               -- To'g'ri javob izohi (ixtiyoriy)
    answer_key    TEXT,                               -- short_answer uchun kalit so'zlar (vergul bilan)
    created_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    approved_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    approved_at   TIMESTAMPTZ,
    times_used    INTEGER NOT NULL DEFAULT 0,         -- Statistika: necha marta tushgan
    times_correct INTEGER NOT NULL DEFAULT 0,         -- Statistika: necha marta to'g'ri yechilgan
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_points_positive CHECK (points > 0)
);
COMMENT ON TABLE questions IS 'Savollar banki';
COMMENT ON COLUMN questions.points IS 'Bankdagi standart ball; shablonda override qilinishi mumkin';

CREATE TABLE question_categories (
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, category_id)
);
COMMENT ON TABLE question_categories IS 'Savol ↔ kategoriya (ko''p-ko''pga, teglar)';

CREATE TABLE question_options (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    is_correct  BOOLEAN NOT NULL DEFAULT FALSE,  -- DIQQAT: frontendga uzatilmaydi!
    order_index SMALLINT NOT NULL DEFAULT 0,     -- ordering turida to'g'ri tartib
    match_pair  TEXT                             -- matching turida juftlik (o'ng ustun)
);
COMMENT ON TABLE question_options IS 'Javob variantlari; is_correct faqat server tomonida ishlatiladi';

CREATE TABLE question_attachments (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    file_path   VARCHAR(500) NOT NULL,
    mime_type   VARCHAR(100) NOT NULL,
    file_size   INTEGER NOT NULL,                -- baytlarda, maks. 2 MB tekshiruvi app darajasida
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE question_attachments IS 'Savolga biriktirilgan rasm/fayllar';

CREATE TABLE question_versions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    snapshot    JSONB NOT NULL,                  -- Savolning to'liq holati (matn, variantlar, ball)
    changed_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE question_versions IS 'Savol o''zgarishlari tarixi (versiyalash)';

-- =====================================================================
-- 5. TEST SHABLONLARI
-- =====================================================================

CREATE TABLE test_templates (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title                    VARCHAR(255) NOT NULL,
    description              TEXT,
    status                   template_status NOT NULL DEFAULT 'draft',
    time_limit_minutes       SMALLINT NOT NULL DEFAULT 60,
    passing_score_percent    NUMERIC(5,2) NOT NULL DEFAULT 60.00,
    max_attempts             SMALLINT NOT NULL DEFAULT 1,
    attempt_interval_minutes INTEGER NOT NULL DEFAULT 0,      -- Urinishlar orasidagi minimal vaqt
    navigation               navigation_mode NOT NULL DEFAULT 'free',
    result_visibility        result_visibility NOT NULL DEFAULT 'immediately_score',
    shuffle_questions        BOOLEAN NOT NULL DEFAULT TRUE,
    shuffle_options          BOOLEAN NOT NULL DEFAULT TRUE,
    partial_scoring          BOOLEAN NOT NULL DEFAULT FALSE,  -- Ko'p javobli savolda qisman ball
    negative_marking         BOOLEAN NOT NULL DEFAULT FALSE,  -- Jarima ball rejimi
    negative_points          NUMERIC(5,2) NOT NULL DEFAULT 0, -- Noto'g'ri javob uchun ayriladigan ball
    avoid_repeat_questions   BOOLEAN NOT NULL DEFAULT TRUE,   -- Qayta topshirishda takrorlanmaslik
    max_tab_switches         SMALLINT NOT NULL DEFAULT 3,     -- Ruxsat etilgan tab almashtirishlar; oshsa avtoyakun
    created_by               BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_time_limit  CHECK (time_limit_minutes BETWEEN 1 AND 600),
    CONSTRAINT chk_passing     CHECK (passing_score_percent BETWEEN 0 AND 100),
    CONSTRAINT chk_attempts    CHECK (max_attempts >= 1),
    CONSTRAINT chk_neg_points  CHECK (negative_points >= 0)
);
COMMENT ON TABLE test_templates IS 'Test shablonlari (konfiguratsiyalar)';

CREATE TABLE template_grade_scale (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    template_id BIGINT NOT NULL REFERENCES test_templates(id) ON DELETE CASCADE,
    grade       grade_value NOT NULL,
    min_percent NUMERIC(5,2) NOT NULL,            -- Shu bahoga eng kam foiz
    UNIQUE (template_id, grade)
);
COMMENT ON TABLE template_grade_scale IS 'Darajali baholash shkalasi (a''lo/yaxshi/qoniqarli/qoniqarsiz)';

CREATE TABLE template_fixed_questions (
    template_id     BIGINT NOT NULL REFERENCES test_templates(id) ON DELETE CASCADE,
    question_id     BIGINT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    points_override NUMERIC(5,2),                 -- NULL = savolning bankdagi bali ishlatiladi
    order_index     SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (template_id, question_id),
    CONSTRAINT chk_override_positive CHECK (points_override IS NULL OR points_override > 0)
);
COMMENT ON TABLE template_fixed_questions IS 'Qo''lda tanlangan (majburiy) savollar';

CREATE TABLE template_selection_rules (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    template_id    BIGINT NOT NULL REFERENCES test_templates(id) ON DELETE CASCADE,
    subject_id     BIGINT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    category_id    BIGINT REFERENCES categories(id) ON DELETE RESTRICT, -- NULL = fanning hammasidan
    difficulty     difficulty_level,                                    -- NULL = istalgan daraja
    question_count SMALLINT NOT NULL,
    CONSTRAINT chk_rule_count CHECK (question_count > 0)
);
COMMENT ON TABLE template_selection_rules IS 'Avtomatik tanlash qoidalari: «X kategoriyadan, Y darajada, N ta savol»';

-- =====================================================================
-- 6. TAYINLOVLAR VA TEST SESSIYALARI
-- =====================================================================

CREATE TABLE test_assignments (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    template_id BIGINT NOT NULL REFERENCES test_templates(id) ON DELETE RESTRICT,
    title       VARCHAR(255) NOT NULL,             -- Masalan: «2026 II-chorak attestatsiyasi»
    starts_at   TIMESTAMPTZ NOT NULL,              -- Faollik oynasi boshlanishi
    ends_at     TIMESTAMPTZ NOT NULL,              -- Faollik oynasi tugashi
    created_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL, -- NULL = oddiy foydalanuvchi tayinlovi
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_window CHECK (ends_at > starts_at)
);
COMMENT ON TABLE test_assignments IS 'Test sessiyalarini rejalashtirish (faollik oynasi bilan)';

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
COMMENT ON TABLE assignment_targets IS 'Tayinlov kimga: alohida foydalanuvchi YOKI guruh';

CREATE TABLE access_codes (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assignment_id BIGINT NOT NULL REFERENCES test_assignments(id) ON DELETE CASCADE,
    code          VARCHAR(20) NOT NULL UNIQUE,     -- Bir martalik kirish kodi
    user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,       -- NULL = o'zini ro'yxatga olish rejimi
    candidate_id  BIGINT REFERENCES candidates(id) ON DELETE SET NULL,  -- NULL = oddiy foydalanuvchi
    used_at       TIMESTAMPTZ,                     -- NULL = hali ishlatilmagan
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE access_codes IS 'Bir martalik kirish kodlari; ishlatilgach qayta foydalanish bloklanadi';

CREATE TABLE test_sessions (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assignment_id   BIGINT NOT NULL REFERENCES test_assignments(id) ON DELETE RESTRICT,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    attempt_number  SMALLINT NOT NULL DEFAULT 1,
    status          session_status NOT NULL DEFAULT 'in_progress',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deadline_at     TIMESTAMPTZ NOT NULL,           -- started_at + time_limit (SERVERDA hisoblanadi)
    finished_at     TIMESTAMPTZ,
    score           NUMERIC(7,2),                   -- To'plangan ball (yakunda hisoblanadi)
    max_score       NUMERIC(7,2),                   -- Mumkin bo'lgan maksimal ball
    percent         NUMERIC(5,2),
    passed          BOOLEAN,
    grade           grade_value,
    tab_switches    SMALLINT NOT NULL DEFAULT 0,    -- Qoidabuzarliklar hisobi
    is_preview      BOOLEAN NOT NULL DEFAULT FALSE, -- Sinov rejimi: statistika/hisobot/urinishlar limitiga kirmaydi
    certificate_uid UUID UNIQUE,                    -- QR verifikatsiya UID; muvaffaqiyatli yakunda generatsiya qilinadi
    ip_address      INET,
    user_agent      TEXT,
    candidate_id    BIGINT REFERENCES candidates(id) ON DELETE SET NULL, -- NULL = oddiy foydalanuvchi sessiyasi
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assignment_id, user_id, attempt_number)
);
COMMENT ON TABLE test_sessions IS 'Test topshirish sessiyalari; yakunlangach javoblar o''zgarmas (immutable)';
COMMENT ON COLUMN test_sessions.deadline_at IS 'Vaqt nazorati faqat server tomonida; mijoz taymeri ko''rsatish uchun';
COMMENT ON COLUMN test_sessions.is_preview IS 'TRUE = sinov rejimi; faqat admin/super_admin ocha oladi, statistikaga kirmaydi';
COMMENT ON COLUMN test_sessions.certificate_uid IS 'Ommaviy /verify/:uid endpoint orqali bayonnoma haqiqiyligini tekshirish uchun';

CREATE TABLE session_questions (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id     BIGINT NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    question_id    BIGINT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    order_index    SMALLINT NOT NULL,               -- Aralashtirilgan savollar tartibi
    points         NUMERIC(5,2) NOT NULL,           -- Sessiya paytidagi ball (snapshot)
    options_order  JSONB NOT NULL DEFAULT '[]',     -- Aralashtirilgan variantlar tartibi [option_id,...]
    UNIQUE (session_id, question_id),
    UNIQUE (session_id, order_index)
);
COMMENT ON TABLE session_questions IS 'Sessiyaga tushgan savollar; tartib saqlanadi (refresh''da o''zgarmaydi)';

CREATE TABLE session_answers (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_question_id BIGINT NOT NULL UNIQUE REFERENCES session_questions(id) ON DELETE CASCADE,
    selected_options    JSONB,                      -- [option_id,...] yoki matching/ordering uchun struktura
    answer_text         TEXT,                       -- short_answer uchun
    is_correct          BOOLEAN,                    -- Yakunda serverda hisoblanadi
    awarded_points      NUMERIC(5,2),               -- Berilgan ball (qisman/jarima hisobga olinib)
    answered_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE session_answers IS 'Javoblar; har bir javob darhol saqlanadi (uzilishga chidamlilik)';

-- =====================================================================
-- 7. AUDIT VA TIZIM SOZLAMALARI
-- =====================================================================

CREATE TABLE audit_log (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action     VARCHAR(100) NOT NULL,     -- login, question.update, result.export, ...
    entity     VARCHAR(100),              -- jadval/obyekt nomi
    entity_id  BIGINT,
    details    JSONB,                     -- Qo'shimcha ma'lumot (eski/yangi qiymatlar)
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit_log IS 'Tizim jurnali: kim, qachon, nima qilgani';

CREATE TABLE system_settings (
    key        VARCHAR(100) PRIMARY KEY,
    value      JSONB NOT NULL,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE system_settings IS 'Umumiy sozlamalar: tashkilot nomi, standart o''tish bali, logotip va h.k.';

-- Standart sozlamalar
INSERT INTO system_settings (key, value) VALUES
    ('organization_name',     '"Tashkilot nomi"'),
    ('default_passing_score', '60'),
    ('default_question_points', '{"easy": 1, "medium": 2, "hard": 3}'),
    ('session_timeout_minutes', '30');

-- =====================================================================
-- 8. INDEKSLAR
-- =====================================================================

-- Foydalanuvchilar
CREATE INDEX idx_users_role_status   ON users (role, status);
CREATE INDEX idx_users_department    ON users (department_id);
CREATE INDEX idx_users_fio           ON users (last_name, first_name);

-- Savollar banki (avtomatik tanlash so'rovlari uchun muhim)
CREATE INDEX idx_questions_selection ON questions (subject_id, difficulty, status);
CREATE INDEX idx_qcat_category       ON question_categories (category_id);
CREATE INDEX idx_options_question    ON question_options (question_id);
CREATE INDEX idx_categories_subject  ON categories (subject_id);

-- Shablonlar va tayinlovlar
CREATE INDEX idx_rules_template      ON template_selection_rules (template_id);
CREATE INDEX idx_assignments_window  ON test_assignments (starts_at, ends_at);
CREATE INDEX idx_targets_user        ON assignment_targets (user_id);
CREATE INDEX idx_targets_group       ON assignment_targets (group_id);

-- Nomzodlar
CREATE INDEX idx_candidates_status     ON candidates (status);
CREATE INDEX idx_candidates_created_by ON candidates (created_by);
CREATE INDEX idx_candidate_docs_cand   ON candidate_documents (candidate_id);
CREATE INDEX idx_assignments_candidate ON test_assignments (candidate_id);
CREATE INDEX idx_access_codes_cand     ON access_codes (candidate_id);
CREATE INDEX idx_sessions_candidate    ON test_sessions (candidate_id);
-- Bitta topshiruvchi = bitta tayinlov (NULL'lar — oddiy user tayinlovlari — cheklanmaydi)
CREATE UNIQUE INDEX uq_assignments_candidate ON test_assignments (candidate_id) WHERE candidate_id IS NOT NULL;

-- Sessiyalar va natijalar (hisobotlar uchun)
CREATE INDEX idx_sessions_user       ON test_sessions (user_id, status);
CREATE INDEX idx_sessions_assignment ON test_sessions (assignment_id, status);
CREATE INDEX idx_sessions_finished   ON test_sessions (finished_at);
CREATE INDEX idx_sq_session          ON session_questions (session_id, order_index);

-- Bitta foydalanuvchida bir vaqtning o'zida faqat bitta faol (in_progress) sessiya bo'lishi mumkin.
-- Insert paytidagi unique buzilishi ilovada 409 Conflict + tushunarli xabarga aylantiriladi.
CREATE UNIQUE INDEX uq_sessions_one_in_progress
    ON test_sessions (user_id) WHERE status = 'in_progress';

-- Audit
CREATE INDEX idx_audit_user_time     ON audit_log (user_id, created_at DESC);
CREATE INDEX idx_audit_entity        ON audit_log (entity, entity_id);

-- =====================================================================
-- 9. TRIGGERLAR — updated_at avtomatik yangilanishi
-- =====================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_candidates_updated      BEFORE UPDATE ON candidates      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_departments_updated    BEFORE UPDATE ON departments     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated          BEFORE UPDATE ON users           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_questions_updated      BEFORE UPDATE ON questions       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_templates_updated      BEFORE UPDATE ON test_templates  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_answers_updated        BEFORE UPDATE ON session_answers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Yakunlangan sessiya javoblarini o'zgartirishni taqiqlash (immutability)
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

COMMIT;
