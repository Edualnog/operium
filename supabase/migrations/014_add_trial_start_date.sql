-- Adicionar campo trial_start_date para rastrear início do período de trial grátis
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN profiles.trial_start_date IS 'Data de início do período de trial grátis de 7 dias';

CREATE INDEX IF NOT EXISTS idx_profiles_trial_start_date ON profiles(trial_start_date);
