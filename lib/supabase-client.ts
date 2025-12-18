import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL ou anon key não configurados. Verifique seu arquivo .env.local')
}

// Client para uso no cliente (Client Components)
// O createBrowserClient gerencia cookies automaticamente no navegador
// IMPORTANTE: Para OAuth com PKCE funcionar corretamente, este mesmo cliente deve ser usado
// tanto no inicio do fluxo (login) quanto no callback.
export const createClientComponentClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }
  } as any)
}

// Alias para manter compatibilidade com componentes que já importam getOAuthClient
// Agora todos usam a implementação padrão robusta baseada em cookies
export const getOAuthClient = createClientComponentClient

// Alias para manter compatibilidade com componentes que já importam getSupabaseClient
export const getSupabaseClient = createClientComponentClient
