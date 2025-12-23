-- ============================================================================
-- FIX: Allow deleting auth.users by updating foreign key constraint
-- ============================================================================
-- The operium_events.actor_user_id constraint prevents deleting users
-- Change it to ON DELETE SET NULL to allow user deletion

-- Drop existing constraint and recreate with SET NULL
ALTER TABLE operium_events 
DROP CONSTRAINT IF EXISTS operium_events_actor_user_id_fkey;

ALTER TABLE operium_events
ADD CONSTRAINT operium_events_actor_user_id_fkey 
FOREIGN KEY (actor_user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Make actor_user_id nullable to support SET NULL
ALTER TABLE operium_events 
ALTER COLUMN actor_user_id DROP NOT NULL;

-- Add index to quickly find events by actor (for auditing before delete)
CREATE INDEX IF NOT EXISTS idx_operium_events_actor_null 
ON operium_events(actor_user_id) 
WHERE actor_user_id IS NULL;

COMMENT ON COLUMN operium_events.actor_user_id IS 
'User who performed the action. NULL if user was deleted but event is preserved for history.';
