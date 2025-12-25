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
    // - signup/email: User confirming email after creating account → dashboard DIRECTLY
    // - invite: Admin creating user without password → criar-senha
    // - recovery: User resetting forgotten password → update-password

    if (type === 'signup' || type === 'email' || type === 'magiclink') {
        // Email confirmation or magic link → go STRAIGHT to dashboard
        // User already created password during signup, no need to set it again
        next = '/dashboard'
    } else if (type === 'invite') {
        // Admin invited user → needs to create password
        next = '/criar-senha'
    } else if (type === 'recovery') {
        // Password reset → update password page
        next = '/auth/update-password'
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
            // Supabase accepts: email, signup, invite, recovery, magiclink
            const { error } = await supabase.auth.verifyOtp({
                token_hash,
                type: type as any // Accept any type Supabase sends
            })
            if (error) {
                console.error('verifyOtp error:', error)
                throw error
            }
            console.log('Email verified successfully, redirecting to:', next)
            return NextResponse.redirect(`${origin}${next}`)
        } catch (error) {
            console.error('Auth callback error (token_hash):', error)
            console.error('Params:', { token_hash: token_hash.substring(0, 10) + '...', type, next })
            return NextResponse.redirect(`${origin}/login?error=auth-callback-error`)
        }
    }

    // No valid auth params found
    return NextResponse.redirect(`${origin}/login`)
}
