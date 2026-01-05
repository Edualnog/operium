-- Add Kiwify license tracking fields to profiles
-- For lifetime license monetization via Kiwify webhooks

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS kiwify_order_id TEXT,
  ADD COLUMN IF NOT EXISTS license_activated_at TIMESTAMPTZ;

-- Index for idempotency checks (prevent duplicate order processing)
CREATE INDEX IF NOT EXISTS idx_profiles_kiwify_order_id
  ON profiles(kiwify_order_id);

COMMENT ON COLUMN profiles.kiwify_order_id IS 'Kiwify order ID for lifetime license purchase tracking';
COMMENT ON COLUMN profiles.license_activated_at IS 'Timestamp when lifetime license was activated via Kiwify webhook';
