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
    let user = null
    let session = null

    // 1. Tentar obter sessão existente
    const { data: sessionData } = await supabase.auth.getSession()
    session = sessionData.session
    user = session?.user

    // 2. Se não tem sessão, tentar getUser (pode estar autenticado sem sessão persistida ainda)
    if (!user) {
      const { data: userData } = await supabase.auth.getUser()
      user = userData.user
    }

    // 3. Se ainda não tem user, tentar verificar o token OTP
    if (!user && (token || tokenHash)) {
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash || token || '',
        type: type as any,
      })

      if (verifyError) {
        throw verifyError
      }

      user = verifyData.user
      session = verifyData.session
    }

    // Se após tudo isso não tivermos um usuário, falha
    if (!user) {
      return NextResponse.redirect(
        `${requestUrl.origin}/login?success=email_verified&message=${encodeURIComponent('Email verificado! Faça login para continuar.')}`
      )
    }

    // --- LÓGICA CENTRALIZADA DE PERFIL E TRIAL ---

    // Verificar/criar perfil
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('subscription_status, trial_start_date, stripe_customer_id')
      .eq('id', user.id)
      .single()

    let profile = existingProfile

    // Se não existe perfil, criar com trial
    if (!profile) {
      const { data: newProfile } = await supabase.from('profiles').upsert({
        id: user.id,
        name: user.email?.split('@')[0] || 'Usuário',
        company_email: user.email,
        trial_start_date: new Date().toISOString(),
      }, {
        onConflict: 'id'
      }).select().single()

      profile = newProfile
    } else if (!profile.trial_start_date && !profile.subscription_status) {
      // Se existe mas não tem trial nem assinatura, iniciar trial agora
      // Isso corrige contas antigas ou criadas durante o bug
      await supabase.from('profiles').update({
        trial_start_date: new Date().toISOString()
      }).eq('id', user.id)

      profile.trial_start_date = new Date().toISOString()
    }

    // Verificar acesso
    const activeStatuses = ['active', 'trialing']
    const hasActiveSubscription = profile?.subscription_status && activeStatuses.includes(profile.subscription_status)

    // Verificar trial
    let isInTrial = false
    if (profile?.trial_start_date) {
      const startDate = new Date(profile.trial_start_date)
      const now = new Date()
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 7)
      isInTrial = now < endDate
    }

    // Redirecionamento
    if (hasActiveSubscription || isInTrial) {
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
    }

    // Se acabou o trial e não tem assinatura, vai para subscribe
    return NextResponse.redirect(`${requestUrl.origin}/subscribe`)

  } catch (err: any) {
    console.error('Erro na verificação:', err)
    let errorMessage = 'Erro ao processar verificação.'

    if (err.message?.includes('expired') || err.message?.includes('invalid')) {
      errorMessage = 'Link expirado ou inválido.'
    }

    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=verification_error&message=${encodeURIComponent(errorMessage)}`
    )
  }
}
