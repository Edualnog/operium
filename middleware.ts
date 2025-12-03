import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const getAuthCookieName = () => {
  if (!supabaseUrl) return 'sb-auth-token'
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    return `sb-${projectRef}-auth-token`
  } catch {
    return 'sb-auth-token'
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Bypass explícito para manifest.webmanifest para evitar 401
  if (request.nextUrl.pathname.includes('manifest.webmanifest')) {
    return response
  }

  // Se Supabase não está configurado, seguir fluxo padrão sem tentativa de autenticação
  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const hasSessionCookie = Boolean(request.cookies.get(getAuthCookieName()))
  let user = null

  if (hasSessionCookie) {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()
      if (!error && authUser) {
        user = authUser

        // Verificar status do trial/assinatura para bloqueio
        // Apenas se estiver tentando acessar dashboard
        if (request.nextUrl.pathname.startsWith('/dashboard')) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status, trial_start_date, stripe_customer_id')
            .eq('id', authUser.id)
            .single()

          if (profile) {
            const activeStatuses = ['active', 'trialing']
            const hasActiveSubscription = profile.subscription_status && activeStatuses.includes(profile.subscription_status)

            // Verificar trial
            let isTrialValid = false
            if (profile.trial_start_date) {
              const startDate = new Date(profile.trial_start_date)
              const now = new Date()
              const endDate = new Date(startDate)
              endDate.setDate(endDate.getDate() + 7)
              isTrialValid = now < endDate
            }

            // Se não tem assinatura ativa E o trial acabou (ou nunca existiu), redirecionar para subscribe
            // Mas permitir acesso às páginas de conta/configuração para poder assinar
            const isSubPage = request.nextUrl.pathname.startsWith('/dashboard/conta')

            if (!hasActiveSubscription && !isTrialValid && !isSubPage) {
              return NextResponse.redirect(new URL('/subscribe', request.url))
            }
          }
        }
      }
    } catch (error) {
      // Ignorar erros de autenticação no middleware
      user = null
    }
  }

  const pathname = request.nextUrl.pathname

  // Proteger rotas do dashboard - requer autenticação
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redirecionar usuários logados que tentam acessar login ou signup para dashboard
  if ((pathname === '/login' || pathname === '/signup') && user) {
    // Se tem parâmetro redirect=checkout, não redirecionar (deixar a página lidar)
    const redirectParam = request.nextUrl.searchParams.get('redirect')
    if (redirectParam === 'checkout') {
      return response
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - manifest.webmanifest (PWA manifest)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
