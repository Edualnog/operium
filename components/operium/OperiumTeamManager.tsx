"use client"

import { useState } from "react"
import { useOperiumProfile, useOperiumTeam } from "@/lib/hooks/useOperiumProfile"
import { OperiumProfile, OperiumRole } from "@/lib/types/operium"
import { OperiumRoleBadge } from "./OperiumRoleBadge"
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
    Users,
    Plus,
    MoreHorizontal,
    Shield,
    Truck,
    Package,
    UserMinus,
    RefreshCw,
    Loader2
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
    const inactiveMembers = members.filter(m => !m.active)

    return (
        <>
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-zinc-500" />
                            <CardTitle className="text-lg text-zinc-900 dark:text-zinc-100">
                                Equipe Operacional
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
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
                                Adicionar
                            </Button>
                        </div>
                    </div>
                    <CardDescription className="text-zinc-500">
                        Gerencie os colaboradores com acesso ao sistema operacional
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                        </div>
                    ) : activeMembers.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                            Nenhum colaborador cadastrado
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Desktop Table */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
                                        <TableRow className="border-zinc-200 dark:border-zinc-800">
                                            <TableHead className="font-medium text-zinc-500">Usuário</TableHead>
                                            <TableHead className="font-medium text-zinc-500">Papel</TableHead>
                                            <TableHead className="font-medium text-zinc-500">Desde</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activeMembers.map((member) => (
                                            <TableRow
                                                key={member.user_id}
                                                className="border-zinc-100 dark:border-zinc-800/50"
                                            >
                                                <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                                                    {member.user_id === userId ? (
                                                        <span className="flex items-center gap-2">
                                                            Você
                                                            <span className="text-xs text-zinc-400">(dono)</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-600 dark:text-zinc-400 text-sm">
                                                            {member.user_id.slice(0, 8)}...
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <OperiumRoleBadge role={member.role} size="sm" />
                                                </TableCell>
                                                <TableCell className="text-sm text-zinc-500">
                                                    {format(new Date(member.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                                </TableCell>
                                                <TableCell>
                                                    {member.user_id !== userId && (
                                                        <ActionsDropdown
                                                            member={member}
                                                            handleRoleChange={handleRoleChange}
                                                            onDeactivate={() => setConfirmDeactivate(member)}
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
                                {activeMembers.map((member) => (
                                    <div key={member.user_id} className="p-4 flex items-center justify-between">
                                        <div className="space-y-1.5">
                                            <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                                {member.user_id === userId ? (
                                                    <span>Você <span className="text-zinc-400 text-xs font-normal">(dono)</span></span>
                                                ) : (
                                                    <span>{member.user_id.slice(0, 8)}...</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm">
                                                <OperiumRoleBadge role={member.role} size="sm" />
                                                <span className="text-zinc-500 text-xs">
                                                    {format(new Date(member.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            {member.user_id !== userId && (
                                                <ActionsDropdown
                                                    member={member}
                                                    handleRoleChange={handleRoleChange}
                                                    onDeactivate={() => setConfirmDeactivate(member)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add User Form */}
            <AddOperiumUserForm
                open={addFormOpen}
                onOpenChange={setAddFormOpen}
                onSuccess={refreshMembers}
            />

            {/* Confirm Deactivate Dialog */}
            <AlertDialog open={!!confirmDeactivate} onOpenChange={() => setConfirmDeactivate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Desativar colaborador?</AlertDialogTitle>
                        <AlertDialogDescription>
                            O colaborador perderá acesso ao sistema operacional. Esta ação pode ser revertida.
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
                            Desativar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
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
                    Alterar para
                </DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => handleRoleChange(member, 'ADMIN')}
                    disabled={member.role === 'ADMIN'}
                >
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
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
                    Desativar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
