"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast-context"
import { KeyRound, CheckCircle2, Loader2 } from "lucide-react"

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { toast } = useToast()
    const supabase = createClientComponentClient()

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error("As senhas não coincidem")
            return
        }

        if (password.length < 6) {
            toast.error("A senha deve ter pelo menos 6 caracteres")
            return
        }

        try {
            setLoading(true)
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            // Update password_set flag
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase
                    .from('profiles')
                    .update({ password_set: true })
                    .eq('id', user.id)

                // Check operium_profiles to determine redirect destination
                const { data: operiumProfile } = await supabase
                    .from('operium_profiles')
                    .select('role, onboarding_complete')
                    .eq('user_id', user.id)
                    .eq('active', true)
                    .single()

                toast.success("Senha definida com sucesso!")

                // Redirect based on role
                setTimeout(() => {
                    if (operiumProfile && operiumProfile.role === 'FIELD') {
                        // FIELD users go to mobile app
                        router.push('/app')
                    } else if (operiumProfile && operiumProfile.role === 'WAREHOUSE') {
                        // WAREHOUSE users go to operium dashboard
                        router.push('/dashboard/operium')
                    } else {
                        // ADMIN or org owners go to main dashboard
                        router.push('/dashboard')
                    }
                }, 1500)
            } else {
                toast.success("Senha definida com sucesso!")
                setTimeout(() => {
                    router.push("/dashboard")
                }, 1500)
            }

        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Erro ao atualizar senha")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
            <div className="w-full max-w-sm space-y-8 bg-white dark:bg-zinc-950 p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                        <KeyRound className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        Definir Senha
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Para sua segurança, defina uma senha para acessar sua conta.
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleUpdatePassword}>
                    <div className="space-y-2">
                        <Label htmlFor="password">Nova Senha</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="bg-white dark:bg-zinc-900"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="bg-white dark:bg-zinc-900"
                            placeholder="••••••••"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Definindo...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Definir e Entrar
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    )
}
