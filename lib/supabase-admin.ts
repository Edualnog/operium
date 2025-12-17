import { createClient } from '@supabase/supabase-js'

// ⚠️ DANGER: This client bypasses RLS. Use ONLY in strict server-side contexts.
// Never expose this client to the browser or client components.

export const createServiceRoleClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    // Support both naming conventions to avoid errors in production
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE!

    if (!supabaseServiceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE) is missing. Check your .env file.")
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    })
}
