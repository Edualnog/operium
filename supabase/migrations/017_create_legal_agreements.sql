-- Migration: 017_create_legal_agreements.sql
-- Description: Create table for tracking user acceptance of legal documents
-- Author: Antigravity Agent

CREATE TABLE IF NOT EXISTS public.legal_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agreement_type TEXT NOT NULL, -- 'terms_of_use', 'privacy_policy', 'data_policy'
    version TEXT NOT NULL,        -- 'v1.0'
    ip_address TEXT,              -- Audit trail
    user_agent TEXT,              -- Audit trail
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure user only accepts specific version once
    UNIQUE(profile_id, agreement_type, version)
);

-- Enable RLS
ALTER TABLE public.legal_agreements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own agreements" 
    ON public.legal_agreements 
    FOR SELECT 
    USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own agreements" 
    ON public.legal_agreements 
    FOR INSERT 
    WITH CHECK (profile_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_legal_agreements_profile_id ON public.legal_agreements(profile_id);
CREATE INDEX IF NOT EXISTS idx_legal_agreements_lookup ON public.legal_agreements(profile_id, agreement_type, version);
