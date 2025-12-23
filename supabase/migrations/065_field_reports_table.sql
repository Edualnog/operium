-- Migration: Field Reports table for daily summaries
-- Tabela para armazenar relatórios diários de campo

-- Criar tabela de relatórios de campo
CREATE TABLE IF NOT EXISTS field_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    summary TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint: one report per user per day
    UNIQUE (user_id, report_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_field_reports_org_date ON field_reports(org_id, report_date);
CREATE INDEX IF NOT EXISTS idx_field_reports_user_date ON field_reports(user_id, report_date);

-- Enable RLS
ALTER TABLE field_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their org reports" ON field_reports;
DROP POLICY IF EXISTS "Users can insert their own reports" ON field_reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON field_reports;

-- Policy: Users can view reports from their org
CREATE POLICY "Users can view their org reports"
ON field_reports
FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM operium_profiles 
        WHERE user_id = auth.uid() AND active = true
    )
    OR
    org_id = auth.uid() -- Org owner
);

-- Policy: Users can insert their own reports
CREATE POLICY "Users can insert their own reports"
ON field_reports
FOR INSERT
WITH CHECK (
    user_id = auth.uid() AND
    org_id IN (
        SELECT org_id FROM operium_profiles 
        WHERE user_id = auth.uid() AND active = true
    )
);

-- Policy: Users can update their own reports
CREATE POLICY "Users can update their own reports"
ON field_reports
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
