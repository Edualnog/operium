import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    let next = searchParams.get('next') ?? '/dashboard'

    // CRITICAL: Distinguish between different auth flows
    // - signup/email: User confirming email → dashboard
    // - invite: Admin inviting user → criar-senha  
    // - recovery: User resetting password → update-password

    if (type === 'invite') {
        // Only redirect to criar-senha if it's a real invite (admin creating user)
        // Check if user already has password_set
        next = '/criar-senha'
    } else if (type === 'recovery') {
        next = '/auth/update-password'
    } else if (type === 'signup' || type === 'email') {
        // Email confirmation after signup → go straight to dashboard
        next = '/dashboard'
    }
    // Default: use 'next' param or '/dashboard'

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

    // Handle token_hash flow (from invite/recovery email links)
    if (token_hash && type) {
        try {
            const { error } = await supabase.auth.verifyOtp({
                token_hash,
                type: type as 'invite' | 'recovery' | 'email'
            })
            if (error) throw error
            return NextResponse.redirect(`${origin}${next}`)
        } catch (error) {
            console.error('Auth callback error (token_hash):', error)
            return NextResponse.redirect(`${origin}/login?error=auth-callback-error`)
        }
    }

    // No valid auth params found
    return NextResponse.redirect(`${origin}/login`)
}
