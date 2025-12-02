import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const getAuthCookieName = () => {
  try {
    const host = new URL(supabaseUrl).hostname
    const projectRef = host.split('.')[0]
    return `sb-${projectRef}-auth-token`
  } catch {
    return 'sb-auth-token'
  }
}

// Client para uso no servidor (Server Components e Server Actions)
export const createServerComponentClient = async () => {
  const cookieStore = cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Cookie já foi definido
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Cookie não existe
          }
        },
      },
    }
  )
}

// Obtém usuário de forma resiliente, evitando chamadas ao Supabase quando não há sessão
export const getSupabaseUser = async () => {
  const cookieStore = cookies()
  const hasSessionCookie = Boolean(cookieStore.get(getAuthCookieName()))
  const supabase = await createServerComponentClient()

  if (!hasSessionCookie) {
    return { supabase, user: null, session: null }
  }

  try {
    // Usar getUser() ao invés de getSession() para autenticação segura
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return { supabase, user: null, session: null }
    }

    return { supabase, user, session: null }
  } catch (error) {
    // Em caso de token inválido, retorne usuário nulo para evitar loops e logs de erro
    return { supabase, user: null, session: null }
  }
}
