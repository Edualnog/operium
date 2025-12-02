-- Campos do Stripe para gerenciamento de assinaturas
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'active', 'past_due', 'canceled', 'trialing'));

COMMENT ON COLUMN profiles.stripe_customer_id IS 'ID do cliente no Stripe';
COMMENT ON COLUMN profiles.subscription_status IS 'Status da assinatura: inactive, active, past_due, canceled, trialing';

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

