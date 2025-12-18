import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  // Debug: listar todos os cookies disponíveis
  const allCookies = request.cookies.getAll()
  console.log('[OAuth Callback] All cookies:', allCookies.map(c => c.name))

  // Procurar pelo cookie de code_verifier
  const codeVerifierCookie = allCookies.find(c => c.name.includes('code-verifier'))
  console.log('[OAuth Callback] Code verifier cookie found:', !!codeVerifierCookie)

  console.log('[OAuth Callback] Starting...', { code: !!code, error, origin })

  // Se houver erro do OAuth
  if (error) {
    console.error('[OAuth Callback] Error from OAuth:', error, error_description)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`)
  }

  // Se não houver código
  if (!code) {
    console.error('[OAuth Callback] No code received')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  // Variável para armazenar a URL de destino final
  let redirectUrl = `${origin}/dashboard`

  // Criar response para poder manipular cookies (será atualizado no final)
  let response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
            sameSite: 'lax',
            httpOnly: true,
          })
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          })
        },
      },
    }
  )

  try {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[OAuth Callback] Exchange error:', exchangeError.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
    }

    if (!data.session) {
      console.error('[OAuth Callback] No session after exchange')
      return NextResponse.redirect(`${origin}/login?error=no_session`)
    }

    console.log('[OAuth Callback] Session created successfully for user:', data.user?.email)

    // Criar perfil se não existir
    const user = data.user
    if (user) {
      const userName = user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Usuário'

      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      console.log('[OAuth Callback] Profile check:', { exists: !!existingProfile, error: profileError?.message })

      if (!existingProfile && profileError?.code === 'PGRST116') {
        // Criar perfil para novo usuário
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          name: userName,
          company_name: 'Minha Empresa',
          company_email: user.email,
        })

        if (insertError) {
          console.error('[OAuth Callback] Profile insert error:', insertError.message)
        } else {
          console.log('[OAuth Callback] New profile created, redirecting to setup')
          // Recriar o response com a nova URL de redirect mantendo os cookies
          const setupResponse = NextResponse.redirect(`${origin}/dashboard/setup`)
          // Copiar todos os cookies do response original para o novo
          response.cookies.getAll().forEach(cookie => {
            setupResponse.cookies.set(cookie.name, cookie.value, {
              path: cookie.path,
              domain: cookie.domain,
              sameSite: 'lax' as const,
              httpOnly: true,
              secure: cookie.secure,
            })
          })
          return setupResponse
        }
      }
    }

    console.log('[OAuth Callback] Success, redirecting to dashboard')
    return response

  } catch (err: any) {
    console.error('[OAuth Callback] Catch error:', err)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || 'callback_error')}`)
  }
}
