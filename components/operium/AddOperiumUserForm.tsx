"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useOperiumProfile } from "@/lib/hooks/useOperiumProfile"
import { OperiumRole } from "@/lib/types/operium"
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
import { Loader2, Truck, Package, AlertCircle, CheckCircle2 } from "lucide-react"
import { useToast } from "@/components/ui/toast-context"

interface AddOperiumUserFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

interface FormData {
    email: string
    role: 'FIELD' | 'WAREHOUSE'
    name?: string
}

export function AddOperiumUserForm({ open, onOpenChange, onSuccess }: AddOperiumUserFormProps) {
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'form' | 'searching' | 'found' | 'not_found'>('form')
    const [foundUserId, setFoundUserId] = useState<string | null>(null)

    const { addTeamMember } = useOperiumProfile()
    const { toast } = useToast()
    const supabase = createClientComponentClient()

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            email: '',
            role: 'FIELD',
            name: '',
        }
    })

    const selectedRole = watch('role')

    const handleSearchUser = async (data: FormData) => {
        try {
            setLoading(true)
            setStep('searching')

            // Buscar usuário pelo email na tabela profiles (via RPC ou admin)
            // Como não temos acesso direto ao auth.users, buscamos via profiles
            // que tem o mesmo ID que auth.users

            // Primeiro, verificar se existe um profile com esse email
            // Nota: precisamos de uma função serverless ou verificar de outra forma
            // Por agora, vamos usar a API

            const response = await fetch('/api/operium/users/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: data.email }),
            })

            const result = await response.json()

            if (result.found && result.userId) {
                setFoundUserId(result.userId)
                setStep('found')
            } else {
                setStep('not_found')
            }
        } catch (err: any) {
            console.error(err)
            toast.error("Erro ao buscar usuário")
            setStep('form')
        } finally {
            setLoading(false)
        }
    }

    const handleAddMember = async () => {
        if (!foundUserId) return

        try {
            setLoading(true)
            await addTeamMember(foundUserId, watch('role'))
            toast.success("Colaborador adicionado com sucesso!")
            reset()
            setStep('form')
            setFoundUserId(null)
            onOpenChange(false)
            onSuccess?.()
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Erro ao adicionar colaborador")
        } finally {
            setLoading(false)
        }
    }

    const handleSendInvite = async () => {
        try {
            setLoading(true)

            // Obter dados do perfil atual para pegar o org_id
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Você precisa estar logado")

            // Buscar org_id do usuário atual (admin)
            const { data: profile } = await supabase
                .from('operium_profiles')
                .select('org_id')
                .eq('user_id', user.id)
                .single()

            if (!profile?.org_id) throw new Error("Erro ao identificar organização")

            const email = watch('email')
            const role = watch('role')
            const name = watch('name')

            const response = await fetch('/api/operium/invites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    role,
                    org_id: profile.org_id,
                    name,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || "Erro ao enviar convite")
            }

            toast.success("Convite enviado com sucesso!")
            onOpenChange(false)
            reset()
            setStep('form')
            onSuccess?.()

        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Erro ao enviar convite")
        } finally {
            setLoading(false)
        }
    }


    const handleClose = () => {
        reset()
        setStep('form')
        setFoundUserId(null)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-zinc-900 dark:text-zinc-100">
                        Adicionar Colaborador
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        Adicione um colaborador que já possui conta na plataforma.
                    </DialogDescription>
                </DialogHeader>

                {step === 'form' && (
                    <form onSubmit={handleSubmit(handleSearchUser)} className="space-y-4">
                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-zinc-700 dark:text-zinc-300">
                                Email do colaborador *
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

                        {/* Role */}
                        <div className="space-y-2">
                            <Label className="text-zinc-700 dark:text-zinc-300">Papel *</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setValue('role', 'FIELD')}
                                    className={`
                    flex flex-col items-center justify-center p-4 rounded-lg border transition-all
                    ${selectedRole === 'FIELD'
                                            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                                            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'}
                  `}
                                >
                                    <Truck className={`h-6 w-6 ${selectedRole === 'FIELD' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500'}`} />
                                    <span className={`text-sm mt-2 font-medium ${selectedRole === 'FIELD' ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                        Campo
                                    </span>
                                    <span className="text-xs text-zinc-500 mt-1">Despesas de veículos</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setValue('role', 'WAREHOUSE')}
                                    className={`
                    flex flex-col items-center justify-center p-4 rounded-lg border transition-all
                    ${selectedRole === 'WAREHOUSE'
                                            ? 'border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-900/20'
                                            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'}
                  `}
                                >
                                    <Package className={`h-6 w-6 ${selectedRole === 'WAREHOUSE' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500'}`} />
                                    <span className={`text-sm mt-2 font-medium ${selectedRole === 'WAREHOUSE' ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                        Almoxarifado
                                    </span>
                                    <span className="text-xs text-zinc-500 mt-1">Movimentação de itens</span>
                                </button>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Buscar Usuário
                            </Button>
                        </DialogFooter>
                    </form>
                )}

                {step === 'searching' && (
                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                        <p className="text-zinc-500 mt-4">Buscando usuário...</p>
                    </div>
                )}

                {step === 'found' && (
                    <div className="space-y-4">
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <p className="text-zinc-900 dark:text-zinc-100 font-medium mt-4">
                                Usuário encontrado!
                            </p>
                            <p className="text-zinc-500 text-sm mt-1">
                                Deseja adicionar como <strong>{selectedRole === 'FIELD' ? 'Campo' : 'Almoxarifado'}</strong>?
                            </p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setStep('form')}>
                                Voltar
                            </Button>
                            <Button
                                onClick={handleAddMember}
                                disabled={loading}
                                className="bg-green-600 text-white hover:bg-green-700"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Adicionar Colaborador
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {step === 'not_found' && (
                    <div className="space-y-4">
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <p className="text-zinc-900 dark:text-zinc-100 font-medium mt-4">
                                Usuário não encontrado
                            </p>
                            <p className="text-zinc-500 text-sm mt-1 text-center max-w-[280px]">
                                Este email não possui conta na plataforma. Deseja enviar um convite?
                            </p>
                        </div>

                        <div className="px-1">
                            <Label htmlFor="invite-name" className="text-zinc-700 dark:text-zinc-300">
                                Nome do Colaborador (opcional)
                            </Label>
                            <Input
                                id="invite-name"
                                placeholder="Ex: João da Silva"
                                className="mt-1.5"
                                {...register('name')}
                            />
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button type="button" variant="ghost" onClick={() => setStep('form')}>
                                Voltar
                            </Button>
                            <Button
                                onClick={handleSendInvite}
                                disabled={loading}
                                className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enviar Convite por Email
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
