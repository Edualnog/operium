"use client"

import { useState } from "react"
import { useOperiumProfile, useOperiumTeam } from "@/lib/hooks/useOperiumProfile"
import { OperiumProfile, OperiumRole } from "@/lib/types/operium"
import { OperiumRoleBadge, AccessTypeTag, ROLE_RESPONSIBILITIES } from "./OperiumRoleBadge"
import { AddOperiumUserForm } from "./AddOperiumUserForm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    Plus,
    MoreHorizontal,
    Shield,
    Truck,
    Package,
    UserMinus,
    RefreshCw,
    Loader2,
    Monitor,
    Smartphone
} from "lucide-react"
import { useToast } from "@/components/ui/toast-context"

export function OperiumTeamManager() {
    const { isAdmin, userId, updateMemberRole, deactivateMember } = useOperiumProfile()
    const { members, loading, refreshMembers } = useOperiumTeam()
    const { toast } = useToast()

    const [addFormOpen, setAddFormOpen] = useState(false)
    const [confirmDeactivate, setConfirmDeactivate] = useState<OperiumProfile | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

    const handleRoleChange = async (member: OperiumProfile, newRole: OperiumRole) => {
        if (member.user_id === userId) {
            toast.error("Você não pode alterar seu próprio papel")
            return
        }

        try {
            setActionLoading(true)
            await updateMemberRole(member.user_id, newRole)
            toast.success(`Papel alterado para ${newRole}`)
            refreshMembers()
        } catch (err: any) {
            toast.error(err.message || "Erro ao alterar papel")
        } finally {
            setActionLoading(false)
        }
    }

    const handleDeactivate = async () => {
        if (!confirmDeactivate) return

        try {
            setActionLoading(true)
            await deactivateMember(confirmDeactivate.user_id)
            toast.success("Colaborador desativado")
            setConfirmDeactivate(null)
            refreshMembers()
        } catch (err: any) {
            toast.error(err.message || "Erro ao desativar")
        } finally {
            setActionLoading(false)
        }
    }

    if (!isAdmin) return null

    const activeMembers = members.filter(m => m.active)

    // Separar membros por tipo de acesso
    const systemMembers = activeMembers.filter(m => m.role === 'ADMIN' || m.role === 'WAREHOUSE')
    const fieldMembers = activeMembers.filter(m => m.role === 'FIELD')

    return (
        <>
            {/* Header com ações globais */}
            <div className="flex items-center justify-end gap-2 mb-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={refreshMembers}
                    disabled={loading}
                    className="h-8 w-8"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                    onClick={() => setAddFormOpen(true)}
                    className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Colaborador
                </Button>
            </div>

            {/* BLOCO 1 — Núcleo Operacional (Sistema) */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                            <Monitor className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-zinc-900 dark:text-zinc-100">
                                Núcleo Operacional (Sistema)
                            </CardTitle>
                            <CardDescription className="text-zinc-500 text-sm">
                                Colaboradores com acesso ao sistema central, dashboards e gestão operacional
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                        </div>
                    ) : systemMembers.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                            Nenhum operador de sistema cadastrado
                        </div>
                    ) : (
                        <TeamTable
                            members={systemMembers}
                            userId={userId}
                            handleRoleChange={handleRoleChange}
                            onDeactivate={setConfirmDeactivate}
                        />
                    )}
                </CardContent>
            </Card>

            {/* BLOCO 2 — Equipes de Campo (App Mobile) */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                            <Smartphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-zinc-900 dark:text-zinc-100">
                                Equipes de Campo (App Mobile)
                            </CardTitle>
                            <CardDescription className="text-zinc-500 text-sm">
                                Colaboradores que registram atividades, despesas e relatórios diretamente em campo
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                        </div>
                    ) : fieldMembers.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                            Nenhum operador de campo cadastrado
                        </div>
                    ) : (
                        <TeamTable
                            members={fieldMembers}
                            userId={userId}
                            handleRoleChange={handleRoleChange}
                            onDeactivate={setConfirmDeactivate}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Add User Form */}
            <AddOperiumUserForm
                open={addFormOpen}
                onOpenChange={setAddFormOpen}
                onSuccess={refreshMembers}
            />

            {/* Confirm Delete Dialog */}
            <AlertDialog open={!!confirmDeactivate} onOpenChange={() => setConfirmDeactivate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir colaborador?</AlertDialogTitle>
                        <AlertDialogDescription>
                            O colaborador será <strong>permanentemente removido</strong> do sistema e perderá todo o acesso.
                            O histórico de atividades será preservado. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeactivate}
                            disabled={actionLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

// Componente de tabela reutilizável para cada bloco
function TeamTable({
    members,
    userId,
    handleRoleChange,
    onDeactivate
}: {
    members: OperiumProfile[]
    userId: string | undefined
    handleRoleChange: (member: OperiumProfile, newRole: OperiumRole) => void
    onDeactivate: (member: OperiumProfile) => void
}) {
    return (
        <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block">
                <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
                        <TableRow className="border-zinc-200 dark:border-zinc-800">
                            <TableHead className="font-medium text-zinc-500">Colaborador</TableHead>
                            <TableHead className="font-medium text-zinc-500">Papel</TableHead>
                            <TableHead className="font-medium text-zinc-500">Tipo de Acesso</TableHead>
                            <TableHead className="font-medium text-zinc-500">Responsabilidade de Dados</TableHead>
                            <TableHead className="font-medium text-zinc-500">Desde</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members.map((member) => (
                            <TableRow
                                key={member.user_id}
                                className="border-zinc-100 dark:border-zinc-800/50"
                            >
                                <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {member.user_id === userId ? (
                                        <span className="flex items-center gap-2">
                                            Você
                                            <span className="text-xs text-zinc-400">(responsável)</span>
                                        </span>
                                    ) : (
                                        <span className="text-zinc-900 dark:text-zinc-100">
                                            {member.name || member.user_id.slice(0, 8) + '...'}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <OperiumRoleBadge role={member.role} size="sm" />
                                </TableCell>
                                <TableCell>
                                    <AccessTypeTag role={member.role} size="sm" />
                                </TableCell>
                                <TableCell className="text-sm text-zinc-500">
                                    {ROLE_RESPONSIBILITIES[member.role]}
                                </TableCell>
                                <TableCell className="text-sm text-zinc-500">
                                    {format(new Date(member.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell>
                                    {member.user_id !== userId && (
                                        <ActionsDropdown
                                            member={member}
                                            handleRoleChange={handleRoleChange}
                                            onDeactivate={() => onDeactivate(member)}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                {members.map((member) => (
                    <div key={member.user_id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                {member.user_id === userId ? (
                                    <span>Você <span className="text-zinc-400 text-xs font-normal">(responsável)</span></span>
                                ) : (
                                    <span>{member.name || member.user_id.slice(0, 8) + '...'}</span>
                                )}
                            </div>
                            {member.user_id !== userId && (
                                <ActionsDropdown
                                    member={member}
                                    handleRoleChange={handleRoleChange}
                                    onDeactivate={() => onDeactivate(member)}
                                />
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <OperiumRoleBadge role={member.role} size="sm" />
                            <AccessTypeTag role={member.role} size="sm" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500">{ROLE_RESPONSIBILITIES[member.role]}</span>
                            <span className="text-zinc-400 text-xs">
                                {format(new Date(member.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function ActionsDropdown({
    member,
    handleRoleChange,
    onDeactivate
}: {
    member: OperiumProfile
    handleRoleChange: (member: OperiumProfile, newRole: OperiumRole) => void
    onDeactivate: () => void
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs text-zinc-500">
                    Alterar papel para
                </DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => handleRoleChange(member, 'ADMIN')}
                    disabled={member.role === 'ADMIN'}
                >
                    <Shield className="mr-2 h-4 w-4" />
                    Administrador
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleRoleChange(member, 'WAREHOUSE')}
                    disabled={member.role === 'WAREHOUSE'}
                >
                    <Package className="mr-2 h-4 w-4" />
                    Almoxarifado
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleRoleChange(member, 'FIELD')}
                    disabled={member.role === 'FIELD'}
                >
                    <Truck className="mr-2 h-4 w-4" />
                    Campo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={onDeactivate}
                    className="text-red-600 focus:text-red-600"
                >
                    <UserMinus className="mr-2 h-4 w-4" />
                    Remover acesso
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
