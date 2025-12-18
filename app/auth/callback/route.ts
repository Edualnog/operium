import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  // Se houver erro do OAuth, redirecionar com mensagem
  if (error) {
    console.error('OAuth error:', error, error_description)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`)
  }

  // Se não houver código, redirecionar para login
  if (!code) {
    console.error('No code in callback')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Exchange error:', exchangeError.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
    }

    if (!data.session) {
      console.error('No session after exchange')
      return NextResponse.redirect(`${origin}/login?error=no_session`)
    }

    // Sessão criada com sucesso - agora criar/atualizar perfil
    const user = data.user

    if (user) {
      const userName = user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Usuário'

      // Verificar se o perfil já existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        // Criar perfil para novo usuário
        await supabase.from('profiles').insert({
          id: user.id,
          name: userName,
          company_name: 'Minha Empresa',
          company_email: user.email,
        })

        // Novo usuário - redirecionar para setup
        return NextResponse.redirect(`${origin}/dashboard/setup`)
      }
    }

    // Usuário existente - redirecionar para dashboard
    return NextResponse.redirect(`${origin}/dashboard`)

  } catch (err: any) {
    console.error('Callback catch error:', err)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || 'callback_error')}`)
  }
}
