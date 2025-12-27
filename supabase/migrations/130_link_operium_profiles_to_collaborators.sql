-- Migration: Add collaborator_id to operium_profiles
-- Purpose: Link field app users to their collaborator records in the main system

-- Add collaborator_id column to operium_profiles
ALTER TABLE public.operium_profiles
ADD COLUMN IF NOT EXISTS collaborator_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_operium_profiles_collaborator_id
ON public.operium_profiles(collaborator_id)
WHERE collaborator_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN public.operium_profiles.collaborator_id IS
'Links field app user to their corresponding collaborator record in the main system';
