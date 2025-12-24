"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClientComponentClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { Users2, User, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Collaborator {
    id: string
    name: string
    status: string
}

interface Team {
    id: string
    name: string
    status: string
    vehicle_id: string | null
}

interface VehicleAssignmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    vehicleId: string
    currentDriverId?: string | null
    currentTeamId?: string | null
    onSuccess: () => void
}

export function VehicleAssignmentDialog({
    open,
    onOpenChange,
    vehicleId,
    currentDriverId,
    currentTeamId,
    onSuccess,
}: VehicleAssignmentDialogProps) {
    const { t } = useTranslation('common')
    const [loading, setLoading] = useState(false)
    const [collaborators, setCollaborators] = useState<Collaborator[]>([])
    const [teams, setTeams] = useState<Team[]>([])
    const [assignmentType, setAssignmentType] = useState<'collaborator' | 'team'>('team')
    const [selectedTeamId, setSelectedTeamId] = useState<string>('')
    const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>('')
    const supabase = createClientComponentClient()

    useEffect(() => {
        if (open) {
            fetchData()
        }
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    const fetchData = async () => {
        // Get current user for security filtering
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [colabRes, teamsRes] = await Promise.all([
            supabase
                .from('colaboradores')
                .select('id, name:nome, status')
                .eq('profile_id', user.id)  // Security: Filter by user
                .eq('status', 'ATIVO')
                .order('nome'),
            supabase
                .from('teams')
                .select('id, name, status, vehicle_id')
                .eq('profile_id', user.id)  // Security: Filter by user
                .eq('status', 'active')
                .order('name')
        ])

        if (colabRes.data) setCollaborators(colabRes.data)
        if (teamsRes.data) setTeams(teamsRes.data)
    }

    const handleAssign = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (assignmentType === 'team') {
                if (!selectedTeamId) {
                    toast.error('Selecione uma equipe')
                    setLoading(false)
                    return
                }

                const team = teams.find(t => t.id === selectedTeamId)
                if (team?.vehicle_id && team.vehicle_id !== vehicleId) {
                    toast.error('Esta equipe já possui um veículo atribuído')
                    setLoading(false)
                    return
                }

                // 1. Clear current_driver_id from vehicle
                await supabase
                    .from('vehicles')
                    .update({ current_driver_id: null })
                    .eq('id', vehicleId)

                // 2. Remove vehicle from any other team
                await supabase
                    .from('teams')
                    .update({ vehicle_id: null })
                    .eq('vehicle_id', vehicleId)

                // 3. Assign vehicle to selected team
                const { error: teamError } = await supabase
                    .from('teams')
                    .update({ vehicle_id: vehicleId })
                    .eq('id', selectedTeamId)

                if (teamError) throw teamError

                // 4. Log event
                await supabase.from('vehicle_usage_events').insert([{
                    vehicle_id: vehicleId,
                    usage_type: 'TEAM_ASSIGNMENT',
                    usage_date: new Date().toISOString(),
                    notes: `Veículo atribuído à equipe: ${team?.name}`,
                }])

                toast.success(`Veículo atribuído à equipe ${team?.name}`)
            } else {
                if (!selectedCollaboratorId) {
                    toast.error('Selecione um colaborador')
                    setLoading(false)
                    return
                }

                // 1. Remove vehicle from any team
                await supabase
                    .from('teams')
                    .update({ vehicle_id: null })
                    .eq('vehicle_id', vehicleId)

                // 2. Update vehicle with collaborator
                const { error: updateError } = await supabase
                    .from('vehicles')
                    .update({ current_driver_id: selectedCollaboratorId })
                    .eq('id', vehicleId)

                if (updateError) throw updateError

                const collaborator = collaborators.find(c => c.id === selectedCollaboratorId)
                await supabase.from('vehicle_usage_events').insert([{
                    vehicle_id: vehicleId,
                    collaborator_id: selectedCollaboratorId,
                    usage_type: 'ASSIGNMENT',
                    usage_date: new Date().toISOString(),
                    notes: `Veículo atribuído ao colaborador: ${collaborator?.name}`,
                }])

                toast.success(`Veículo atribuído a ${collaborator?.name}`)
            }

            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao atribuir veículo: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleReturn = async () => {
        setLoading(true)
        try {
            await supabase
                .from('teams')
                .update({ vehicle_id: null })
                .eq('vehicle_id', vehicleId)

            await supabase
                .from('vehicles')
                .update({ current_driver_id: null })
                .eq('id', vehicleId)

            await supabase.from('vehicle_usage_events').insert([{
                vehicle_id: vehicleId,
                collaborator_id: currentDriverId,
                usage_type: 'RETURN',
                usage_date: new Date().toISOString(),
                notes: 'Veículo devolvido/liberado',
            }])

            toast.success('Veículo liberado com sucesso')
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao liberar veículo: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const currentTeam = teams.find(t => t.vehicle_id === vehicleId)
    const isAssigned = !!currentDriverId || !!currentTeam

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {isAssigned ? 'Liberar Veículo' : 'Atribuir Veículo'}
                    </DialogTitle>
                    <DialogDescription>
                        {isAssigned
                            ? 'Este veículo está atribuído. Deseja liberá-lo?'
                            : 'Escolha para quem atribuir este veículo:'
                        }
                    </DialogDescription>
                </DialogHeader>

                {isAssigned ? (
                    <div className="py-4">
                        <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-4 mb-4">
                            {currentTeam ? (
                                <div className="flex items-center gap-3">
                                    <Users2 className="h-5 w-5 text-zinc-500" />
                                    <div>
                                        <p className="font-medium">Equipe: {currentTeam.name}</p>
                                        <p className="text-sm text-zinc-500">Atribuído à equipe</p>
                                    </div>
                                </div>
                            ) : currentDriverId ? (
                                <div className="flex items-center gap-3">
                                    <User className="h-5 w-5 text-zinc-500" />
                                    <div>
                                        <p className="font-medium">Colaborador individual</p>
                                        <p className="text-sm text-zinc-500">Atribuído diretamente</p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <Button
                            onClick={handleReturn}
                            disabled={loading}
                            variant="destructive"
                            className="w-full"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Liberar Veículo
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleAssign} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setAssignmentType('team')}
                                className={cn(
                                    "flex flex-col items-center justify-center rounded-md border-2 p-4 transition-colors cursor-pointer",
                                    assignmentType === 'team'
                                        ? "border-zinc-900 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-800"
                                        : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                                )}
                            >
                                <Users2 className="mb-2 h-6 w-6" />
                                <span className="text-sm font-medium">Equipe</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setAssignmentType('collaborator')}
                                className={cn(
                                    "flex flex-col items-center justify-center rounded-md border-2 p-4 transition-colors cursor-pointer",
                                    assignmentType === 'collaborator'
                                        ? "border-zinc-900 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-800"
                                        : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                                )}
                            >
                                <User className="mb-2 h-6 w-6" />
                                <span className="text-sm font-medium">Colaborador</span>
                            </button>
                        </div>

                        {assignmentType === 'team' ? (
                            <div className="grid gap-2">
                                <Label>Selecione a Equipe</Label>
                                <Select
                                    value={selectedTeamId}
                                    onValueChange={setSelectedTeamId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Escolha uma equipe" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.filter(t => !t.vehicle_id || t.vehicle_id === vehicleId).length === 0 ? (
                                            <div className="p-2 text-sm text-zinc-500 text-center">
                                                Nenhuma equipe disponível
                                            </div>
                                        ) : (
                                            teams.filter(t => !t.vehicle_id || t.vehicle_id === vehicleId).map(team => (
                                                <SelectItem key={team.id} value={team.id}>
                                                    {team.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-zinc-500">
                                    O veículo ficará disponível para todos os membros da equipe.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label>Selecione o Colaborador</Label>
                                <Select
                                    value={selectedCollaboratorId}
                                    onValueChange={setSelectedCollaboratorId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Escolha um colaborador" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {collaborators.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-zinc-500">
                                    O veículo será de uso exclusivo deste colaborador.
                                </p>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Atribuir Veículo
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
