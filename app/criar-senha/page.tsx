'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function CreatePasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClientComponentClient()

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
            // 1. Atualizar senha no Auth
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) throw updateError

            // 2. Atualizar flag no profile
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ password_set: true })
                    .eq('id', user.id)

                if (profileError) {
                    console.error('Erro ao atualizar profile', profileError)
                    // Não bloquear o fluxo se falhar o profile, mas idealmente deveria
                }
            }

            // 3. Redirecionar
            router.replace('/dashboard')

        } catch (error: any) {
            setError(error.message || 'Erro ao criar senha')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Bem-vindo ao Operion
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Para continuar, defina sua senha de acesso.
                    </p>
                </div>

                <div className="bg-white dark:bg-zinc-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-zinc-200 dark:border-zinc-700">
                    <form className="space-y-6" onSubmit={handleUpdatePassword}>
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Erro</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div>
                            <Label htmlFor="password">Nova Senha</Label>
                            <div className="mt-1">
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-zinc-50 dark:bg-zinc-900"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="confirm-password">Confirmar Senha</Label>
                            <div className="mt-1">
                                <Input
                                    id="confirm-password"
                                    name="confirm-password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="bg-zinc-50 dark:bg-zinc-900"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : 'Definir Senha e Entrar'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
