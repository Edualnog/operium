"use client"

import { OperiumTeamManager } from "@/components/operium/OperiumTeamManager"
import { useOperiumProfile } from "@/lib/hooks/useOperiumProfile"
import { OperiumRoleBadge } from "@/components/operium/OperiumRoleBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Loader2,
    AlertCircle,
    UserPlus,
    Sparkles,
    Shield,
    ArrowRight,
    Terminal
} from "lucide-react"
import { useToast } from "@/components/ui/toast-context"
import { useState } from "react"

// Tipos de acesso clarificados:
// - Sistema: ADMIN, WAREHOUSE (dashboard/desktop)
// - Mobile: FIELD (app de campo)

export default function AcessosPage() {
    const {
        loading,
        error,
        hasProfile,
        isAdmin,
        role,
        createAdminProfile
    } = useOperiumProfile()
    const { toast } = useToast()
    const [creatingAdmin, setCreatingAdmin] = useState(false)

    const handleActivateAdmin = async () => {
        try {
            setCreatingAdmin(true)
            await createAdminProfile()
            toast.success("Sistema de acessos ativado!")
            window.location.reload()
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Erro ao ativar")
        } finally {
            setCreatingAdmin(false)
        }
    }

    if (loading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Erro ao carregar</h2>
                <p className="text-zinc-500 mt-2">{error}</p>
            </div>
        )
    }

    // Se não tem perfil, oferecer ativação
    if (!hasProfile) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-2xl mx-auto">
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center mb-4">
                                <Sparkles className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <CardTitle className="text-2xl text-zinc-900 dark:text-zinc-100">
                                Controle de Acessos
                            </CardTitle>
                            <CardDescription className="text-zinc-500 mt-2 text-base">
                                Gerencie quem tem acesso ao sistema e defina permissões por papel
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-4">
                            {/* Benefícios */}
                            <div className="grid gap-3">
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                                    <Shield className="h-5 w-5 text-zinc-500 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">Controle por Papel</p>
                                        <p className="text-zinc-500 text-xs mt-0.5">Campo ou Administrador</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                                    <UserPlus className="h-5 w-5 text-zinc-500 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">Adicione Colaboradores</p>
                                        <p className="text-zinc-500 text-xs mt-0.5">Convide por email com permissões específicas</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleActivateAdmin}
                                disabled={creatingAdmin}
                                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                size="lg"
                            >
                                {creatingAdmin ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                )}
                                Ativar Controle de Acessos
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // Se não é admin, mostrar mensagem
    if (!isAdmin) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-2xl mx-auto text-center">
                    <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                        Acesso Restrito
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Apenas administradores podem gerenciar acessos.
                    </p>
                    {role && (
                        <div className="mt-4 flex justify-center">
                            <OperiumRoleBadge role={role} size="lg" />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Admin vê a página de gerenciamento
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Indicador de Admin Ativo */}
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg w-fit">
                <Terminal className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Você está operando como <span className="font-medium text-zinc-900 dark:text-zinc-100">Administrador</span>
                </span>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Governança de Acessos
                </h1>
                <p className="text-zinc-500 mt-1">
                    Controle centralizado de permissões para operações de sistema e campo
                </p>
            </div>

            {/* Team Manager */}
            <OperiumTeamManager />
        </div>
    )
}
