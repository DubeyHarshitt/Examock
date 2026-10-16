-- Ticket 24 (public SEO pages): URL slugs for subjects and topics.
--
-- Exam types already had a slug; subjects and topics had only `name`, so no
-- keyword-bearing public URL could exist for them. Uniqueness is COMPOUND and
-- per-parent: the parent path (/exams/:examSlug/:subjectSlug/...) is what
-- disambiguates identical names across exams/subjects.

-- 1. Add nullable columns first so existing rows can be backfilled before
--    the NOT NULL constraint lands.
ALTER TABLE "subjects" ADD COLUMN "slug" TEXT;
ALTER TABLE "topics" ADD COLUMN "slug" TEXT;

-- 2. Backfill from `name` with the same rules as src/utils/slug.js
--    (lowercase -> non-alnum runs to '-' -> trim -> empty falls back to
--    'item'), suffixing -2/-3 within the parent scope on collision.
--    Deterministic order: created_at, id.
DO $$
DECLARE
  r RECORD;
  stem TEXT;
  candidate TEXT;
  suffix INTEGER;
BEGIN
  FOR r IN SELECT id, exam_type_id, name FROM subjects ORDER BY created_at, id LOOP
    stem := trim(both '-' from regexp_replace(lower(r.name), '[^a-z0-9]+', '-', 'g'));
    IF stem = '' THEN stem := 'item'; END IF;
    candidate := stem;
    suffix := 1;
    WHILE EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.exam_type_id = r.exam_type_id
        AND s.slug = candidate
        AND s.id <> r.id
    ) LOOP
      suffix := suffix + 1;
      candidate := stem || '-' || suffix;
    END LOOP;
    UPDATE subjects SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

DO $$
DECLARE
  r RECORD;
  stem TEXT;
  candidate TEXT;
  suffix INTEGER;
BEGIN
  FOR r IN SELECT id, subject_id, name FROM topics ORDER BY created_at, id LOOP
    stem := trim(both '-' from regexp_replace(lower(r.name), '[^a-z0-9]+', '-', 'g'));
    IF stem = '' THEN stem := 'item'; END IF;
    candidate := stem;
    suffix := 1;
    WHILE EXISTS (
      SELECT 1 FROM topics t
      WHERE t.subject_id = r.subject_id
        AND t.slug = candidate
        AND t.id <> r.id
    ) LOOP
      suffix := suffix + 1;
      candidate := stem || '-' || suffix;
    END LOOP;
    UPDATE topics SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

-- 3. Lock the columns down now that every row is populated.
ALTER TABLE "subjects" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "topics" ALTER COLUMN "slug" SET NOT NULL;

-- 4. Compound uniques (names match Prisma's generated DDL exactly —
--    verified via `prisma migrate diff --from-empty --to-schema-datamodel`).
CREATE UNIQUE INDEX "subjects_exam_type_id_slug_key" ON "subjects"("exam_type_id", "slug");
CREATE UNIQUE INDEX "topics_subject_id_slug_key" ON "topics"("subject_id", "slug");
