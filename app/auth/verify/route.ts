import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  
  // Capturar todos os parâmetros possíveis que o Supabase pode enviar
  const token = requestUrl.searchParams.get('token')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') || 'email'
  const error = requestUrl.searchParams.get('error')
  const errorCode = requestUrl.searchParams.get('error_code')
  const errorDescription = requestUrl.searchParams.get('error_description')

  const cookieStore = cookies()
  
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

  // Se houver erro nos parâmetros, redireciona para login com mensagem de erro
  if (error || errorCode) {
    let errorMessage = 'Link de verificação inválido ou expirado.'
    
    if (errorCode === 'otp_expired') {
      errorMessage = 'O link de verificação expirou. Por favor, solicite um novo link de confirmação.'
    } else if (errorDescription) {
      errorMessage = decodeURIComponent(errorDescription)
    } else if (error) {
      errorMessage = decodeURIComponent(error)
    }
    
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=verification_failed&message=${encodeURIComponent(errorMessage)}`
    )
  }

  try {
    // PRIMEIRO: Sempre verificar se já há uma sessão ativa
    // (Supabase pode ter processado o token e criado a sessão antes de redirecionar)
    const { data: { session: existingSession } } = await supabase.auth.getSession()
    
    if (existingSession && existingSession.user) {
      // Verificar se o perfil existe, se não, criar
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', existingSession.user.id)
        .single()

      if (!existingProfile) {
        await supabase.from('profiles').upsert({
          id: existingSession.user.id,
          name: existingSession.user.email?.split('@')[0] || 'Usuário',
          company_email: existingSession.user.email,
        }, {
          onConflict: 'id'
        })
      }

      // Redirecionar para dashboard
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
    }

    // SEGUNDO: Se não há sessão, verificar se há usuário autenticado
    // (pode ter sido autenticado mas a sessão ainda não está nos cookies)
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
    
    if (currentUser && !userError) {
      // Verificar/criar perfil
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUser.id)
        .single()

      if (!existingProfile) {
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          name: currentUser.email?.split('@')[0] || 'Usuário',
          company_email: currentUser.email,
        }, {
          onConflict: 'id'
        })
      }

      // Tentar obter sessão novamente após um breve delay
      await new Promise(resolve => setTimeout(resolve, 300))
      const { data: { session: retrySession } } = await supabase.auth.getSession()
      
      if (retrySession) {
        return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
      }
      
      // Se ainda não há sessão, redirecionar para login com mensagem de sucesso
      return NextResponse.redirect(
        `${requestUrl.origin}/login?success=email_verified&message=${encodeURIComponent('Email verificado com sucesso! Faça login para continuar.')}`
      )
    }

    // TERCEIRO: Se há token na URL, tentar verificar o token
    if (token || tokenHash) {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash || token || '',
        type: type as any,
      })

      if (verifyError) {
        let errorMessage = 'Falha ao verificar o email. Por favor, tente novamente.'
        
        if (verifyError.message.includes('expired') || verifyError.message.includes('invalid')) {
          errorMessage = 'O link de verificação expirou ou é inválido. Por favor, solicite um novo link de confirmação.'
        }
        
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=verification_failed&message=${encodeURIComponent(errorMessage)}`
        )
      }

      // Se a verificação foi bem-sucedida
      if (data?.user) {
        // Verificar/criar perfil
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (!existingProfile) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name: data.user.email?.split('@')[0] || 'Usuário',
            company_email: data.user.email,
          }, {
            onConflict: 'id'
          })
        }

        // Se há sessão, redireciona direto para dashboard
        if (data.session) {
          return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
        }

        // Se não houver sessão, redireciona para login com mensagem de sucesso
        return NextResponse.redirect(
          `${requestUrl.origin}/login?success=email_verified&message=${encodeURIComponent('Email verificado com sucesso! Faça login para continuar.')}`
        )
      }
    }

    // FALLBACK: Se chegou aqui, não há token, sessão nem usuário autenticado
    // Isso pode acontecer se o Supabase processou o token mas não criou sessão/cookies
    // Nesse caso, redirecionar para login com mensagem amigável
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=verification_processing&message=${encodeURIComponent('Verificação de email em processamento. Se o problema persistir, tente fazer login normalmente.')}`
    )

  } catch (err: any) {
    console.error('Erro na verificação:', err)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=verification_error&message=${encodeURIComponent('Erro ao processar verificação de email. Por favor, tente novamente ou faça login normalmente.')}`
    )
  }
}
