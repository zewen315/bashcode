-- Caches the OAuth provider's photo at signup time, since the app never
-- stores access tokens (see 0001) and so can't re-fetch it later. Lets
-- the avatar toggle (avatar_url null <-> provider photo) actually round
-- trip instead of losing the original photo the first time it's turned off.
ALTER TABLE users ADD COLUMN provider_avatar_url TEXT;
UPDATE users SET provider_avatar_url = avatar_url WHERE provider_avatar_url IS NULL;
