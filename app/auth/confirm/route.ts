import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * AUTH CONFIRM ROUTE
 * ==================
 * Ponto único de entrada para todos os links de email do Supabase:
 * - Invite (type=invite)
 * - Recovery (type=recovery)
 * - Email verification (type=email)
 * - Magic Link (type=magiclink)
 * 
 * Recebe token_hash e type como query params, verifica o token,
 * cria a sessão e redireciona para o destino apropriado.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)

    // Parâmetros possíveis
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') || 'email'
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Log para debug
    console.log('[AUTH_CONFIRM] Request:', { type, hasToken: !!tokenHash, error })

    // Handle errors from Supabase
    if (error) {
        console.error('[AUTH_CONFIRM] Error from Supabase:', error, errorDescription)
        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
        )
    }

    // Token obrigatório
    if (!tokenHash) {
        console.error('[AUTH_CONFIRM] Missing token_hash')
        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent('Link inválido ou expirado')}`
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
                    cookieStore.delete({ name, ...options })
                },
            },
        }
    )

    try {
        // Verificar token e criar sessão
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'invite' | 'recovery' | 'email' | 'magiclink'
        })

        if (verifyError) {
            console.error('[AUTH_CONFIRM] Verify error:', verifyError)
            throw verifyError
        }

        console.log('[AUTH_CONFIRM] Token verified successfully, type:', type)

        // Determinar destino baseado no tipo
        let redirectUrl = '/dashboard'

        if (type === 'invite' || type === 'recovery') {
            // Ambos precisam definir senha
            redirectUrl = `/definir-senha?tipo=${type}`
        } else if (type === 'email') {
            // Verificação de email: checar se precisa definir senha
            if (data.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('password_set')
                    .eq('id', data.user.id)
                    .single()

                if (!profile?.password_set) {
                    redirectUrl = '/definir-senha?tipo=email'
                }
            }
        }

        console.log('[AUTH_CONFIRM] Redirecting to:', redirectUrl)
        return NextResponse.redirect(`${origin}${redirectUrl}`)

    } catch (err: any) {
        console.error('[AUTH_CONFIRM] Exception:', err)

        let errorMessage = 'Link inválido ou expirado'
        if (err.message?.includes('expired')) {
            errorMessage = 'Este link expirou. Solicite um novo.'
        }

        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(errorMessage)}`
        )
    }
}
