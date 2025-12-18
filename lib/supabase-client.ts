import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL ou anon key não configurados. Verifique seu arquivo .env.local')
}

// Client para uso no cliente (Client Components)
// O createBrowserClient gerencia cookies automaticamente no navegador
export const createClientComponentClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Cliente Supabase para OAuth - usa localStorage para armazenar o code_verifier do PKCE
// Isso resolve o problema de cookies não sendo preservados entre requisições OAuth
let oauthClient: ReturnType<typeof createClient> | null = null

export const getOAuthClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('OAuth client can only be used in the browser')
  }

  if (!oauthClient) {
    oauthClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: {
          getItem: (key) => {
            if (typeof window !== 'undefined') {
              return window.localStorage.getItem(key)
            }
            return null
          },
          setItem: (key, value) => {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(key, value)
            }
          },
          removeItem: (key) => {
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(key)
            }
          },
        },
      },
    })
  }

  return oauthClient
}
