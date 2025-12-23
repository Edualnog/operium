import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type')
    let next = searchParams.get('next') ?? '/dashboard'

    if (type === 'invite') {
        next = '/criar-senha'
    } else if (type === 'recovery') {
        next = '/auth/update-password'
    }

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
                        cookieStore.delete({ name, ...options })
                    },
                },
            }
        )

        try {
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) throw error

            return NextResponse.redirect(`${origin}${next}`)
        } catch (error) {
            console.error('Auth callback error:', error)
            return NextResponse.redirect(`${origin}/login?error=auth-callback-error`)
        }
    }

    return NextResponse.redirect(`${origin}/login`)
}
