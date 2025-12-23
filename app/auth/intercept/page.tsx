'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import { Loader2 } from 'lucide-react'

/**
 * AUTH INTERCEPT PAGE
 * ====================
 * This page handles auth redirects with hash fragments (#access_token=...&type=recovery)
 * 
 * Supabase recovery/invite emails use URL hash fragments which cannot be read server-side.
 * This page acts as an interceptor to:
 * 1. Detect the type of auth flow (recovery, invite, etc.)
 * 2. Redirect to the appropriate page before onboarding/dashboard
 * 
 * Configure this as the redirect URL in Supabase Email Templates
 */
export default function AuthInterceptPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [status, setStatus] = useState('Processando...')

    useEffect(() => {
        const handleAuth = async () => {
            const hash = window.location.hash
            const searchParams = new URLSearchParams(hash.replace('#', ''))
            const type = searchParams.get('type')
            const accessToken = searchParams.get('access_token')
            const refreshToken = searchParams.get('refresh_token')

            console.log('[AuthIntercept] Hash type:', type)
            console.log('[AuthIntercept] Has access token:', !!accessToken)

            // If we have tokens in hash, set the session first
            if (accessToken) {
                setStatus('Autenticando...')

                // Set session from hash tokens
                if (refreshToken) {
                    await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    })
                }
            }

            // Wait for session to be ready
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                setStatus('Sessão não encontrada. Redirecionando para login...')
                setTimeout(() => router.push('/login'), 2000)
                return
            }

            // Determine redirect based on type
            if (type === 'recovery') {
                setStatus('Redirecionando para criar nova senha...')
                // Clear the hash from URL
                window.history.replaceState(null, '', window.location.pathname)
                router.push('/auth/update-password')
                return
            }

            if (type === 'invite') {
                setStatus('Redirecionando para criar senha...')
                window.history.replaceState(null, '', window.location.pathname)
                router.push('/criar-senha')
                return
            }

            // Default: check if user is FIELD and needs onboarding
            const { data: operiumProfile } = await supabase
                .from('operium_profiles')
                .select('role, onboarding_complete')
                .eq('user_id', session.user.id)
                .eq('active', true)
                .single()

            if (operiumProfile?.role === 'FIELD') {
                setStatus('Redirecionando para o app...')
                router.push('/app')
            } else if (operiumProfile?.role === 'WAREHOUSE') {
                setStatus('Redirecionando para o painel...')
                router.push('/dashboard/operium')
            } else {
                setStatus('Redirecionando para o dashboard...')
                router.push('/dashboard')
            }
        }

        handleAuth()
    }, [router, supabase])

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-900 mx-auto mb-4" />
                <p className="text-zinc-600">{status}</p>
            </div>
        </div>
    )
}
