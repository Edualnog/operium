import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  
  const token = requestUrl.searchParams.get('token')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type') || 'recovery'
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
    let errorMessage = 'Link de recuperação inválido ou expirado.'
    
    if (errorCode === 'otp_expired') {
      errorMessage = 'O link de recuperação expirou. Por favor, solicite um novo link de recuperação de senha.'
    } else if (errorDescription) {
      errorMessage = decodeURIComponent(errorDescription)
    } else if (error) {
      errorMessage = decodeURIComponent(error)
    }
    
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=reset_failed&message=${encodeURIComponent(errorMessage)}`
    )
  }

  try {
    // PRIMEIRO: Verificar se já há uma sessão ativa
    // (Supabase pode ter processado o code/token e criado a sessão antes de redirecionar)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session && session.user) {
      // Se há sessão, redirecionar para a página de reset (usuário pode alterar senha)
      return NextResponse.redirect(`${requestUrl.origin}/auth/reset-password`)
    }

    // SEGUNDO: Se há code na URL, tentar trocar por sessão
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        let errorMessage = 'Link de recuperação inválido ou expirado.'
        
        if (exchangeError.message.includes('expired') || exchangeError.message.includes('invalid')) {
          errorMessage = 'O link de recuperação expirou. Por favor, solicite um novo link de recuperação de senha.'
        }
        
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=reset_failed&message=${encodeURIComponent(errorMessage)}`
        )
      }

      // Verificar sessão após exchange
      const { data: { session: newSession } } = await supabase.auth.getSession()
      
      if (newSession && newSession.user) {
        return NextResponse.redirect(`${requestUrl.origin}/auth/reset-password`)
      }
      
      // Se não criou sessão após exchange, redirecionar com erro
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=reset_failed&message=${encodeURIComponent('Link de recuperação inválido ou já foi usado. Por favor, solicite um novo link.')}`
      )
    }

    // TERCEIRO: Se há token na URL, tentar verificar o token
    if (token || tokenHash) {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash || token || '',
        type: type as any,
      })

      if (verifyError) {
        let errorMessage = 'Link de recuperação inválido ou expirado.'
        
        if (verifyError.message.includes('expired') || verifyError.message.includes('invalid')) {
          errorMessage = 'O link de recuperação expirou. Por favor, solicite um novo link de recuperação de senha.'
        }
        
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=reset_failed&message=${encodeURIComponent(errorMessage)}`
        )
      }

      // Se a verificação foi bem-sucedida, redirecionar para a página de reset
      if (data?.session) {
        return NextResponse.redirect(`${requestUrl.origin}/auth/reset-password`)
      }
    }

    // FALLBACK: Se não há code, token nem sessão, redirecionar para login com erro
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=reset_failed&message=${encodeURIComponent('Link de recuperação inválido. Por favor, solicite um novo link.')}`
    )

  } catch (err: any) {
    console.error('Erro no reset de senha:', err)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=reset_error&message=${encodeURIComponent('Erro ao processar recuperação de senha. Por favor, tente novamente.')}`
    )
  }
}
