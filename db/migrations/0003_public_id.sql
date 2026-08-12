-- A short, non-secret identifier safe to show in the UI (dropdown,
-- profile page) — unlike the sequential internal id (reveals user
-- count) or display_name (not unique, can collide).
ALTER TABLE users ADD COLUMN public_id TEXT;
UPDATE users SET public_id = substr(md5(random()::text || id::text), 1, 8) WHERE public_id IS NULL;
ALTER TABLE users ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_public_id_key UNIQUE (public_id);
