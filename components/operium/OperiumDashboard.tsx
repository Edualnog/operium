"use client"

import { useState, useEffect } from "react"
import { useOperiumProfile } from "@/lib/hooks/useOperiumProfile"
import { OperiumRoleBadge } from "./OperiumRoleBadge"
import { VehicleExpenseForm } from "./VehicleExpenseForm"
import { VehicleStatusForm } from "./VehicleStatusForm"
import { InventoryMovementForm } from "./InventoryMovementForm"
import { EventsList } from "./EventsList"
import { OperiumTeamManager } from "./OperiumTeamManager"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Fuel,
    Activity,
    ArrowDownToLine,
    ArrowUpFromLine,
    History,
    Loader2,
    AlertCircle,
    Briefcase,
    Sparkles,
    Users
} from "lucide-react"
import { useToast } from "@/components/ui/toast-context"

export function OperiumDashboard() {
    const {
        profile,
        loading,
        error,
        role,
        hasProfile,
        isAdmin,
        canCreateVehicleExpense,
        canCreateVehicleStatus,
        canCreateItemIn,
        canCreateItemOut,
        createAdminProfile
    } = useOperiumProfile()
    const { toast } = useToast()

    const [expenseFormOpen, setExpenseFormOpen] = useState(false)
    const [statusFormOpen, setStatusFormOpen] = useState(false)
    const [movementFormOpen, setMovementFormOpen] = useState(false)
    const [movementType, setMovementType] = useState<'ITEM_IN' | 'ITEM_OUT'>('ITEM_IN')
    const [refreshKey, setRefreshKey] = useState(0)
    const [creatingAdmin, setCreatingAdmin] = useState(false)
    const [showTeamManager, setShowTeamManager] = useState(false)

    const handleSuccess = () => {
        setRefreshKey(prev => prev + 1)
    }

    const handleActivateAdmin = async () => {
        try {
            setCreatingAdmin(true)
            await createAdminProfile()
            toast.success("Perfil ADMIN ativado com sucesso!")
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Erro ao ativar perfil")
        } finally {
            setCreatingAdmin(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-4">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Erro ao carregar</h2>
                <p className="text-zinc-500 mt-2">{error}</p>
            </div>
        )
    }

    // Se não tem perfil, oferecer ativação como ADMIN (para dono da conta)
    if (!hasProfile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center mb-6">
                    <Sparkles className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
                </div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    Ativar Sistema Operacional
                </h2>
                <p className="text-zinc-500 mt-2 max-w-md">
                    Configure o controle de acesso para sua equipe. Você será o administrador e poderá adicionar colaboradores.
                </p>
                <Button
                    onClick={handleActivateAdmin}
                    disabled={creatingAdmin}
                    className="mt-6 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    {creatingAdmin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Briefcase className="mr-2 h-4 w-4" />
                    Ativar como Administrador
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Painel Operacional
                    </h1>
                    <p className="text-zinc-500 mt-1">
                        Registre atividades operacionais da sua organização
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <Button
                            variant="outline"
                            onClick={() => setShowTeamManager(!showTeamManager)}
                            className="border-zinc-200 dark:border-zinc-700"
                        >
                            <Users className="mr-2 h-4 w-4" />
                            Equipe
                        </Button>
                    )}
                    {role && <OperiumRoleBadge role={role} size="lg" />}
                </div>
            </div>

            {/* Team Manager (ADMIN only) */}
            {isAdmin && showTeamManager && (
                <OperiumTeamManager />
            )}

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Vehicle Expense */}
                {canCreateVehicleExpense && (
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                        onClick={() => setExpenseFormOpen(true)}
                    >
                        <CardHeader className="pb-2">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Fuel className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-base text-zinc-900 dark:text-zinc-100">
                                Registrar Despesa
                            </CardTitle>
                            <CardDescription className="text-zinc-500">
                                Combustível, pedágio, manutenção
                            </CardDescription>
                        </CardContent>
                    </Card>
                )}

                {/* Vehicle Status */}
                {canCreateVehicleStatus && (
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                        onClick={() => setStatusFormOpen(true)}
                    >
                        <CardHeader className="pb-2">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-base text-zinc-900 dark:text-zinc-100">
                                Status do Veículo
                            </CardTitle>
                            <CardDescription className="text-zinc-500">
                                Ativo, manutenção, inativo
                            </CardDescription>
                        </CardContent>
                    </Card>
                )}

                {/* Item In */}
                {canCreateItemIn && (
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                        onClick={() => { setMovementType('ITEM_IN'); setMovementFormOpen(true) }}
                    >
                        <CardHeader className="pb-2">
                            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <ArrowDownToLine className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-base text-zinc-900 dark:text-zinc-100">
                                Entrada de Item
                            </CardTitle>
                            <CardDescription className="text-zinc-500">
                                Registrar recebimento
                            </CardDescription>
                        </CardContent>
                    </Card>
                )}

                {/* Item Out */}
                {canCreateItemOut && (
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                        onClick={() => { setMovementType('ITEM_OUT'); setMovementFormOpen(true) }}
                    >
                        <CardHeader className="pb-2">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <ArrowUpFromLine className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-base text-zinc-900 dark:text-zinc-100">
                                Saída de Item
                            </CardTitle>
                            <CardDescription className="text-zinc-500">
                                Registrar retirada
                            </CardDescription>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Events History */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <History className="h-5 w-5 text-zinc-500" />
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        Histórico de Eventos
                    </h2>
                </div>
                <EventsList key={refreshKey} limit={20} />
            </div>

            {/* Forms */}
            <VehicleExpenseForm
                open={expenseFormOpen}
                onOpenChange={setExpenseFormOpen}
                onSuccess={handleSuccess}
            />
            <VehicleStatusForm
                open={statusFormOpen}
                onOpenChange={setStatusFormOpen}
                onSuccess={handleSuccess}
            />
            <InventoryMovementForm
                open={movementFormOpen}
                onOpenChange={setMovementFormOpen}
                defaultType={movementType}
                onSuccess={handleSuccess}
            />
        </div>
    )
}
