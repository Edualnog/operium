"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getOAuthClient } from '@/lib/supabase-client'

export default function AuthCallbackPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code')
            const error = searchParams.get('error')
            const errorDescription = searchParams.get('error_description')

            console.log('[OAuth Callback Client] Starting...', { code: !!code, error })

            if (error) {
                console.error('[OAuth Callback Client] Error from OAuth:', error, errorDescription)
                setStatus('error')
                setErrorMessage(errorDescription || error || 'Erro no login com Google')
                setTimeout(() => router.push(`/login?error=${encodeURIComponent(errorDescription || error)}`), 2000)
                return
            }

            if (!code) {
                console.error('[OAuth Callback Client] No code received')
                setStatus('error')
                setErrorMessage('Código de autenticação não recebido')
                setTimeout(() => router.push('/login?error=no_code'), 2000)
                return
            }

            try {
                console.log('[OAuth Callback Client] Exchanging code for session...')

                // Usar o mesmo cliente OAuth que foi usado para iniciar o login
                // Ele tem acesso ao code_verifier armazenado no localStorage
                const oauthClient = getOAuthClient()
                const { data, error: exchangeError } = await oauthClient.auth.exchangeCodeForSession(code)

                if (exchangeError) {
                    console.error('[OAuth Callback Client] Exchange error:', exchangeError.message)
                    setStatus('error')
                    setErrorMessage(exchangeError.message)
                    setTimeout(() => router.push(`/login?error=${encodeURIComponent(exchangeError.message)}`), 2000)
                    return
                }

                if (!data.session) {
                    console.error('[OAuth Callback Client] No session after exchange')
                    setStatus('error')
                    setErrorMessage('Sessão não criada')
                    setTimeout(() => router.push('/login?error=no_session'), 2000)
                    return
                }

                console.log('[OAuth Callback Client] Session created successfully for user:', data.user?.email)

                // Verificar se o perfil existe
                const user = data.user
                if (user) {
                    const { data: existingProfile, error: profileError } = await oauthClient
                        .from('profiles')
                        .select('id')
                        .eq('id', user.id)
                        .single()

                    console.log('[OAuth Callback Client] Profile check:', { exists: !!existingProfile, error: profileError?.message })

                    if (!existingProfile && profileError?.code === 'PGRST116') {
                        // Criar perfil para novo usuário
                        const userName = user.user_metadata?.full_name ||
                            user.user_metadata?.name ||
                            user.email?.split('@')[0] ||
                            'Usuário'

                        const { error: insertError } = await oauthClient.from('profiles').insert({
                            id: user.id,
                            name: userName,
                            company_name: 'Minha Empresa',
                            company_email: user.email,
                        })

                        if (insertError) {
                            console.error('[OAuth Callback Client] Profile insert error:', insertError.message)
                        } else {
                            console.log('[OAuth Callback Client] New profile created, redirecting to setup')
                            setStatus('success')
                            router.push('/dashboard/setup')
                            return
                        }
                    }
                }

                setStatus('success')
                console.log('[OAuth Callback Client] Success, redirecting to dashboard')
                router.push('/dashboard')

            } catch (err: any) {
                console.error('[OAuth Callback Client] Catch error:', err)
                setStatus('error')
                setErrorMessage(err.message || 'Erro ao processar callback')
                setTimeout(() => router.push(`/login?error=${encodeURIComponent(err.message || 'callback_error')}`), 2000)
            }
        }

        handleCallback()
    }, [searchParams, router])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900">
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
                {status === 'processing' && (
                    <>
                        <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white rounded-full animate-spin mx-auto mb-4" />
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                            Processando login...
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                            Aguarde enquanto verificamos suas credenciais
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                            Login realizado com sucesso!
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                            Redirecionando...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                            Erro no login
                        </h2>
                        <p className="text-sm text-red-500 dark:text-red-400 mt-2">
                            {errorMessage}
                        </p>
                        <p className="text-xs text-zinc-400 mt-3">
                            Redirecionando para o login...
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
