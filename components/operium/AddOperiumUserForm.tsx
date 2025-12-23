"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useOperiumProfile } from "@/lib/hooks/useOperiumProfile"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Truck, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { useToast } from "@/components/ui/toast-context"

interface AddOperiumUserFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

interface FormData {
    email: string
    password: string
    name: string
}

/**
 * NOVO FLUXO SIMPLIFICADO
 * =======================
 * Admin cria o usuário com email, nome e SENHA já definida.
 * Colaborador só precisa fazer login com as credenciais fornecidas.
 * 
 * - Não envia email de convite
 * - Não precisa de fluxo de recovery
 * - Admin passa a senha para o colaborador (verbalmente, whatsapp, etc)
 */
export function AddOperiumUserForm({ open, onOpenChange, onSuccess }: AddOperiumUserFormProps) {
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [success, setSuccess] = useState(false)
    const [createdEmail, setCreatedEmail] = useState('')
    const [createdPassword, setCreatedPassword] = useState('')

    const { toast } = useToast()
    const supabase = createClientComponentClient()

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            email: '',
            password: '',
            name: '',
        }
    })

    const handleCreateUser = async (data: FormData) => {
        try {
            setLoading(true)

            // Obter org_id do admin atual
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Você precisa estar logado")

            const { data: profile } = await supabase
                .from('operium_profiles')
                .select('org_id')
                .eq('user_id', user.id)
                .single()

            if (!profile?.org_id) throw new Error("Erro ao identificar organização")

            // Chamar API para criar usuário com senha
            const response = await fetch('/api/operium/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                    name: data.name,
                    role: 'FIELD', // Sempre FIELD por enquanto
                    org_id: profile.org_id,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || "Erro ao criar usuário")
            }

            // Sucesso - mostrar credenciais para o admin compartilhar
            setCreatedEmail(data.email)
            setCreatedPassword(data.password)
            setSuccess(true)
            toast.success("Usuário criado com sucesso!")

        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Erro ao criar usuário")
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        reset()
        setSuccess(false)
        setCreatedEmail('')
        setCreatedPassword('')
        setShowPassword(false)
        onOpenChange(false)
        if (success) {
            onSuccess?.()
        }
    }

    const generatePassword = () => {
        // Gerar senha simples e memorável
        const adjectives = ['Azul', 'Verde', 'Forte', 'Rapido', 'Novo', 'Legal', 'Ativo']
        const nouns = ['Campo', 'Equipe', 'Carro', 'Obra', 'Dia', 'Sol', 'Mar']
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
        const noun = nouns[Math.floor(Math.random() * nouns.length)]
        const num = Math.floor(Math.random() * 900) + 100
        return `${adj}${noun}${num}`
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-zinc-900 dark:text-zinc-100">
                        {success ? 'Usuário Criado!' : 'Adicionar Colaborador'}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        {success
                            ? 'Compartilhe as credenciais com o colaborador'
                            : 'Crie uma conta para o colaborador de campo'
                        }
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="space-y-4 py-4">
                        <div className="flex flex-col items-center pb-4">
                            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>

                        <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                            <div>
                                <Label className="text-xs text-zinc-500">Email</Label>
                                <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100 mt-0.5">
                                    {createdEmail}
                                </p>
                            </div>
                            <div>
                                <Label className="text-xs text-zinc-500">Senha</Label>
                                <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100 mt-0.5 font-semibold">
                                    {createdPassword}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-500 text-center">
                            Envie estas credenciais para o colaborador.<br />
                            Ele pode acessar pelo app em <strong>operium.com.br/login</strong>
                        </p>

                        <DialogFooter>
                            <Button
                                onClick={handleClose}
                                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                            >
                                Fechar
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-4">
                        {/* Nome */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-zinc-700 dark:text-zinc-300">
                                Nome do colaborador *
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Ex: João da Silva"
                                className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                                {...register('name', {
                                    required: 'Nome é obrigatório',
                                    minLength: { value: 2, message: 'Nome muito curto' }
                                })}
                            />
                            {errors.name && (
                                <span className="text-xs text-red-500">{errors.name.message}</span>
                            )}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-zinc-700 dark:text-zinc-300">
                                Email *
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="colaborador@email.com"
                                className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                                {...register('email', {
                                    required: 'Email é obrigatório',
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: 'Email inválido'
                                    }
                                })}
                            />
                            {errors.email && (
                                <span className="text-xs text-red-500">{errors.email.message}</span>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-zinc-700 dark:text-zinc-300">
                                    Senha *
                                </Label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const pwd = generatePassword()
                                        const input = document.getElementById('password') as HTMLInputElement
                                        if (input) {
                                            input.value = pwd
                                            // Trigger react-hook-form update
                                            const event = new Event('input', { bubbles: true })
                                            input.dispatchEvent(event)
                                        }
                                    }}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                >
                                    Gerar senha
                                </button>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Mínimo 6 caracteres"
                                    className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 pr-10"
                                    {...register('password', {
                                        required: 'Senha é obrigatória',
                                        minLength: { value: 6, message: 'Mínimo 6 caracteres' }
                                    })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <span className="text-xs text-red-500">{errors.password.message}</span>
                            )}
                        </div>

                        {/* Role Info */}
                        <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                            <div className="flex items-center gap-2">
                                <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <div>
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                                        Colaborador de Campo
                                    </span>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        Acesso ao app móvel para registrar despesas
                                    </p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="ghost" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Criar Usuário
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
