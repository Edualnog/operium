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
  
  // Log para debug (remover em produção se necessário)
  console.log('Verificação de email - Parâmetros recebidos:', {
    hasToken: !!token,
    hasTokenHash: !!tokenHash,
    hasError: !!error,
    errorCode,
    url: requestUrl.toString()
  })

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

  try {
    // Primeiro, verificar se já há uma sessão ativa (Supabase pode ter criado automaticamente)
    const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession()
    
    if (existingSession && existingSession.user) {
      // Se já há sessão, verificar se o perfil existe
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

      // Redirecionar para dashboard se já está autenticado
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
    }

    // Se não há token, tentar verificar usuário atual (pode ter sido autenticado em background)
    if (!token && !tokenHash) {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      
      if (currentUser) {
        // Usuário foi autenticado, verificar/criar perfil e redirecionar
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

        return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
      }

      // Se realmente não há token nem sessão, redirecionar com erro
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=no_token&message=${encodeURIComponent('Link de verificação inválido. Por favor, solicite um novo link de confirmação.')}`
      )
    }

    // Verificar o token de email
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash || token || '',
      type: type as any,
    })

    if (error) {
      let errorMessage = 'Falha ao verificar o email. Por favor, tente novamente.'
      
      if (error.message.includes('expired') || error.message.includes('invalid') || error.message.includes('expired')) {
        errorMessage = 'O link de verificação expirou ou é inválido. Por favor, solicite um novo link de confirmação.'
      }
      
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=verification_failed&message=${encodeURIComponent(errorMessage)}`
      )
    }

    // Se a verificação foi bem-sucedida
    if (data?.user) {
      // Verificar se o perfil existe, se não, criar
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existingProfile) {
          await supabase.from('profiles').upsert({
            id: user.id,
            name: user.email?.split('@')[0] || 'Usuário',
            company_email: user.email,
          }, {
            onConflict: 'id'
          })
        }
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

    // Fallback
    return NextResponse.redirect(
      `${requestUrl.origin}/login?success=email_verified&message=${encodeURIComponent('Email verificado com sucesso! Faça login para continuar.')}`
    )
  } catch (err: any) {
    console.error('Erro na verificação:', err)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=verification_error&message=${encodeURIComponent('Erro ao processar verificação de email. Por favor, tente novamente.')}`
    )
  }
}

