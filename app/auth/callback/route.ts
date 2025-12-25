import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    // DEBUG: Log to see what Supabase is sending
    console.log('🔍 Auth callback - type:', type, 'code:', code ? 'present' : 'none', 'token_hash:', token_hash ? 'present' : 'none')

    // SMART DETECTION: Recovery can come as type=recovery OR type=magiclink with token_hash
    // Also, password recovery emails might not send type at all, just token_hash
    const isRecovery = type === 'recovery' ||
        type === 'magiclink' ||
        (token_hash && !type) ||
        (token_hash && type !== 'signup' && type !== 'email')

    const next = isRecovery ? '/auth/reset-password' : '/dashboard'
    console.log('➡️ Redirecting to:', next, '(isRecovery:', isRecovery, ')')

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

    // Handle PKCE flow (code parameter)
    if (code) {
        try {
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) throw error
            return NextResponse.redirect(`${origin}${next}`)
        } catch (error) {
            console.error('Auth callback error (code):', error)
            return NextResponse.redirect(`${origin}/login?error=auth-callback-error`)
        }
    }

    // Handle token_hash flow (email confirmation, recovery, etc)
    if (token_hash && type) {
        try {
            const { error } = await supabase.auth.verifyOtp({
                token_hash,
                type: type as any
            })
            if (error) throw error

            console.log(`✅ Auth successful - type: ${type}, redirecting to: ${next}`)
            return NextResponse.redirect(`${origin}${next}`)
        } catch (error) {
            console.error('❌ Auth callback error:', error)
            return NextResponse.redirect(`${origin}/login?error=auth-callback-error`)
        }
    }

    // No valid auth params found
    console.log('⚠️ No auth params, redirecting to login')
    return NextResponse.redirect(`${origin}/login`)
}
