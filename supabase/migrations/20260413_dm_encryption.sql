-- Add E2E encryption support to direct messages.
-- public_key stores each user's ECDH P-256 public key (JWK format) for key agreement.
-- encrypted + iv on direct_messages mark ciphertexts and carry the AES-GCM IV.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_key TEXT;

ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS iv        TEXT;
