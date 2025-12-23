'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import { Eye, EyeOff, Lock } from 'lucide-react'

export default function CreatePasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const router = useRouter()
    const supabase = createClientComponentClient()

    // Verificação de segurança: se já tem senha, vai pro dashboard
    useEffect(() => {
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('password_set')
                    .eq('id', user.id)
                    .single()

                if (profile?.password_set) {
                    router.replace('/dashboard')
                }
            }
        }
        checkStatus()
    }, [router, supabase])

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError('As senhas não coincidem')
            return
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres')
            return
        }

        setLoading(true)

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) throw updateError

            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // Try to update profiles.password_set (may not exist for collaborators)
                await supabase
                    .from('profiles')
                    .update({ password_set: true })
                    .eq('id', user.id)

                // Check operium_profiles to determine redirect destination
                const { data: operiumProfile } = await supabase
                    .from('operium_profiles')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('active', true)
                    .single()

                // Redirect based on role - only FIELD goes to mobile app
                if (operiumProfile && operiumProfile.role === 'FIELD') {
                    // FIELD users go to mobile app
                    router.replace('/app')
                } else {
                    // ADMIN, WAREHOUSE, or org owners go to main dashboard
                    router.replace('/dashboard')
                }
            } else {
                router.replace('/dashboard')
            }

        } catch (error: any) {
            setError(error.message || 'Erro ao criar senha')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
            <div className="w-full max-w-[340px] px-4">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center">
                        <Lock className="h-5 w-5 text-neutral-500" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-xl font-medium text-neutral-800 text-center mb-1">
                    Defina sua senha
                </h1>
                <p className="text-sm text-neutral-500 text-center mb-8">
                    Para continuar, crie uma senha de acesso.
                </p>

                {/* Error */}
                {error && (
                    <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                            Nova senha
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full h-9 px-3 pr-10 text-sm bg-white border border-neutral-200 rounded-md 
                                           placeholder:text-neutral-400 text-neutral-800
                                           focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:border-neutral-300
                                           transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                            Confirmar senha
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full h-9 px-3 pr-10 text-sm bg-white border border-neutral-200 rounded-md 
                                           placeholder:text-neutral-400 text-neutral-800
                                           focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:border-neutral-300
                                           transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-9 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium 
                                   rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Salvando...' : 'Continuar'}
                    </button>
                </form>
            </div>
        </div>
    )
}
