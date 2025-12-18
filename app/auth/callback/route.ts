import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
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
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Ignore errors in server components
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Ignore errors in server components
            }
          },
        },
      }
    )

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Erro ao trocar código por sessão:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
      }

      // Buscar ou criar perfil do usuário
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Verificar se o perfil já existe
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, name, company_email, trial_start_date')
          .eq('id', user.id)
          .single()

        const userName = user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Usuário'

        // Se não existir, criar perfil com trial
        if (!existingProfile) {
          await supabase.from('profiles').insert({
            id: user.id,
            name: userName,
            company_name: 'Minha Empresa',
            company_email: user.email,
            trial_start_date: new Date().toISOString(),
            subscription_status: 'trialing',
          })

          // Novo usuário - redirecionar para setup
          return NextResponse.redirect(`${origin}/dashboard/setup`)
        } else {
          // Usuário existente - atualizar nome se necessário
          if (!existingProfile.name || existingProfile.name === 'Usuário') {
            await supabase.from('profiles').update({
              name: userName,
            }).eq('id', user.id)
          }
        }
      }

      // Usuário existente - redirecionar para dashboard
      return NextResponse.redirect(`${origin}/dashboard`)

    } catch (err) {
      console.error('Erro no callback:', err)
      return NextResponse.redirect(`${origin}/login?error=callback_error`)
    }
  }

  // Sem código - redirecionar para login
  return NextResponse.redirect(`${origin}/login`)
}
