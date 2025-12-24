-- Migration: 094_add_movimentacoes_to_domain_events.sql
-- Description: Allow 'movimentacoes' as a valid entity_type in domain_events
-- This fixes the constraint violation when automatic triggers try to log movimentacoes events

-- Drop the existing constraint
ALTER TABLE public.domain_events 
DROP CONSTRAINT IF EXISTS domain_events_entity_type_check;

-- Recreate it with 'movimentacoes' added
ALTER TABLE public.domain_events 
ADD CONSTRAINT domain_events_entity_type_check 
CHECK (entity_type = ANY (ARRAY[
    'tool', 'asset', 'vehicle', 'collaborator', 'inventory', 
    'product', 'movement', 'repair', 'maintenance', 'cost', 
    'generic', 'team', 'team_equipment', 'team_member', 'team_assignment',
    'movimentacoes'  -- Added to support automatic domain event tracking
]));
