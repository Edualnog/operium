import { createBrowserClient } from '@supabase/ssr'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL ou anon key não configurados. Verifique seu arquivo .env.local')
}

// Cliente para uso no servidor (usa createBrowserClient do @supabase/ssr com cookies)
export const createClientComponentClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Cliente singleton para OAuth - DEVE ser o mesmo em todo o fluxo OAuth
// para que o code_verifier seja preservado entre o início e o callback
let supabaseOAuthSingleton: SupabaseClient | null = null

export const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseClient can only be used in the browser')
  }

  if (!supabaseOAuthSingleton) {
    supabaseOAuthSingleton = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // Usar localStorage explicitamente para garantir persistência
        // NÃO usar storageKey customizado para usar a chave padrão do Supabase
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  }

  return supabaseOAuthSingleton
}

// Alias para compatibilidade
export const getOAuthClient = getSupabaseClient
