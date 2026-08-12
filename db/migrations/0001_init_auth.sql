-- schema_migrations itself is created by db.py's run_migrations()
-- before this file (or any migration) ever runs, since it needs to
-- exist to check which migrations are already applied.

CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT,                 -- nullable, not unique — same-email
                                       -- auto-linking across providers is
                                       -- a login-task decision, not this one
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE oauth_identities (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,          -- 'github' | 'google'
  provider_user_id  TEXT NOT NULL,          -- stable id from the provider
  email             TEXT,                    -- provider-reported email at link time (audit trail, separate from users.email)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);
CREATE INDEX idx_oauth_identities_user_id ON oauth_identities(user_id);

CREATE TABLE sessions (
  token       TEXT PRIMARY KEY,        -- secrets.token_urlsafe(32), app-generated
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
