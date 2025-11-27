import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
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
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Erro ao trocar código por sessão:', error)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_error`)
      }

      // Buscar ou criar perfil do usuário
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Verificar se o perfil já existe
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, name, company_email')
          .eq('id', user.id)
          .single()

        const userName = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.user_metadata?.email?.split('@')[0] || 
                        user.email?.split('@')[0] || 
                        'Usuário'

        // Se não existir, criar perfil básico
        if (!existingProfile) {
          await supabase.from('profiles').upsert({
            id: user.id,
            name: userName,
            company_email: user.email,
          }, {
            onConflict: 'id'
          })
        } else {
          // Atualizar perfil existente com informações do Google se necessário
          const updatedName = user.user_metadata?.full_name || 
                             user.user_metadata?.name || 
                             existingProfile.name || 
                             userName
          const updatedEmail = user.email || existingProfile.company_email || user.email
          
          await supabase.from('profiles').update({
            name: updatedName,
            company_email: updatedEmail,
          }).eq('id', user.id)
        }
      }
    } catch (err) {
      console.error('Erro no callback:', err)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=callback_error`)
    }
  }

  // Redirecionar para dashboard
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}

