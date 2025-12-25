"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Team, TeamStatus } from "@/app/dashboard/equipes/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { createTeam, updateTeam } from "@/app/dashboard/equipes/actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { useTranslation } from "react-i18next"

interface CreateEditTeamModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    teamToEdit?: Team
    onTeamCreated?: (team: Team) => void
}

interface FormData {
    name: string
    description: string
    leader_id: string
    vehicle_id: string
    status: TeamStatus
}

export default function CreateEditTeamModal({ open, onOpenChange, teamToEdit, onTeamCreated }: CreateEditTeamModalProps) {
    const { t, ready } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const [leaders, setLeaders] = useState<{ id: string, name: string }[]>([])
    const [vehicles, setVehicles] = useState<{ id: string, plate: string, model: string }[]>([])
    const supabase = createClientComponentClient()

    // Safe translation helper with fallbacks
    const safeT = (key: string, fallback: string = key) => {
        if (!ready) return fallback
        const translated = t(key)
        return translated === key ? fallback : translated
    }

    const { register, handleSubmit, control, reset, setValue } = useForm<FormData>({
        defaultValues: {
            name: "",
            description: "",
            leader_id: "",
            vehicle_id: "",
            status: "active"
        }
    })

    // Fetch options (leaders and vehicles) when modal opens
    useEffect(() => {
        if (open) {
            const fetchOptions = async () => {
                console.log("Fetching options for modal...")

                // Get current user for security filtering
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                // Fetch eligible leaders (colaboradores) - filtered by profile_id
                const { data: colabs, error: colabsError } = await supabase
                    .from('colaboradores')
                    .select('id, nome, status')
                    .eq('profile_id', user.id)  // Security: Filter by user
                    .order('nome')

                if (colabsError) {
                    console.error("Error fetching colabs:", colabsError)
                } else {
                    console.log("All colabs fetched:", colabs)
                    // Robust filtering for status
                    const activeColabs = colabs?.filter(c =>
                        c.status?.toUpperCase() === 'ATIVO' ||
                        c.status?.toLowerCase() === 'active'
                    ) || []
                    console.log("Active colabs filtered:", activeColabs)
                    setLeaders(activeColabs.map(c => ({ id: c.id, name: c.nome })))
                }

                // Fetch available vehicles - filtered by profile_id
                const { data: vehs, error: vehsError } = await supabase
                    .from('vehicles')
                    .select('id, plate, model, status')
                    .eq('profile_id', user.id)  // Security: Filter by user
                    .order('plate')

                if (vehsError) {
                    console.error("Error fetching vehicles:", vehsError)
                } else {
                    console.log("All vehicles fetched:", vehs)

                    // Filter: active vehicles only (not in maintenance or out of service)
                    const availableVehs = vehs?.filter(v => v.status === 'active') || []

                    // Always include current vehicle if editing, even if not 'available' currently
                    if (teamToEdit?.vehicle_id) {
                        const { data: currentVeh } = await supabase
                            .from('vehicles')
                            .select('id, plate, model')
                            .eq('id', teamToEdit.vehicle_id)
                            .eq('profile_id', user.id)  // Security: Filter by user
                            .single()

                        if (currentVeh) {
                            // Check if it's already in the list
                            const exists = availableVehs.find(v => v.id === currentVeh.id)
                            if (!exists) {
                                // Add to list so it matches the current selection
                                availableVehs.push({
                                    ...currentVeh,
                                    status: 'assigned' // Dummy status
                                })
                            }
                        }
                    }
                    console.log("Final vehicle list:", availableVehs)
                    setVehicles(availableVehs)
                }
            }

            fetchOptions()

            if (teamToEdit) {
                reset({
                    name: teamToEdit.name,
                    description: teamToEdit.description || "",
                    leader_id: teamToEdit.leader_id || "",
                    vehicle_id: teamToEdit.vehicle_id || "",
                    status: teamToEdit.status
                })
            } else {
                reset({
                    name: "",
                    description: "",
                    leader_id: "",
                    vehicle_id: "",
                    status: "active"
                })
            }
        }
    }, [open, teamToEdit, reset, supabase])

    const onSubmit = async (data: FormData) => {
        setIsLoading(true)
        try {
            if (teamToEdit) {
                await updateTeam(teamToEdit.id, data)
                toast.success(safeT('teams.toast.updated', 'Equipe atualizada com sucesso!'))
            } else {
                const newTeam = await createTeam(data)
                toast.success(safeT('teams.toast.created', 'Equipe criada com sucesso!'))
                onTeamCreated?.(newTeam)
            }
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || safeT('teams.toast.error', 'Erro ao salvar equipe'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-[500px] md:max-w-[600px] max-h-[90vh] overflow-y-auto border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4 sm:p-6 md:p-8 block">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-xl font-serif font-bold text-[#37352f] dark:text-zinc-100 mb-2">
                        {teamToEdit ? safeT('teams.form.title_edit', 'Editar Equipe') : safeT('teams.form.title_new', 'Nova Equipe')}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 dark:text-zinc-400">
                        {teamToEdit ? safeT('teams.form.desc_edit', 'Atualize os dados da equipe') : safeT('teams.form.desc_new', 'Adicione um novo produto ao estoque')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">{safeT('teams.form.name', 'Nome da Equipe')}</Label>
                        <Input
                            id="name"
                            placeholder={safeT('teams.form.name_placeholder', 'Ex: Equipe Alpha')}
                            className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 focus-visible:ring-offset-0 placeholder:text-zinc-400"
                            {...register("name", { required: true })}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description" className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">{safeT('teams.form.description', 'Descrição')}</Label>
                        <Textarea
                            id="description"
                            placeholder={safeT('teams.form.description_placeholder', 'Função ou área de atuação')}
                            className="resize-none bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 focus-visible:ring-offset-0 placeholder:text-zinc-400 min-h-[80px]"
                            {...register("description")}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="leader" className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">{safeT('teams.form.leader', 'Líder da Equipe')}</Label>
                            <Controller
                                control={control}
                                name="leader_id"
                                render={({ field }) => (
                                    <Select
                                        onValueChange={(value) => field.onChange(value === "unassigned" ? "" : value)}
                                        value={field.value || "unassigned"}
                                    >
                                        <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-zinc-400 focus:ring-offset-0">
                                            <SelectValue placeholder={safeT('teams.form.select_placeholder', 'Selecione...')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">{safeT('teams.form.none', 'Nenhum')}</SelectItem>
                                            {leaders.map((leader) => (
                                                <SelectItem key={leader.id} value={leader.id}>
                                                    {leader.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="vehicle" className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">{safeT('teams.form.vehicle', 'Veículo')}</Label>
                            <Controller
                                control={control}
                                name="vehicle_id"
                                render={({ field }) => (
                                    <Select
                                        onValueChange={(value) => field.onChange(value === "unassigned" ? "" : value)}
                                        value={field.value || "unassigned"}
                                    >
                                        <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-zinc-400 focus:ring-offset-0">
                                            <SelectValue placeholder={safeT('teams.form.select_placeholder', 'Selecione...')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">{safeT('teams.form.none', 'Nenhum')}</SelectItem>
                                            {vehicles.map((vehicle) => (
                                                <SelectItem key={vehicle.id} value={vehicle.id}>
                                                    {vehicle.model} ({vehicle.plate})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="status" className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">{safeT('teams.form.status', 'Status')}</Label>
                        <Controller
                            control={control}
                            name="status"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-zinc-400 dark:focus:ring-offset-0">
                                        <SelectValue placeholder={safeT('teams.form.select_placeholder', 'Selecione...')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{safeT('teams.status.active', 'Em Operação')}</SelectItem>
                                        <SelectItem value="on_break">{safeT('teams.status.on_break', 'Pausa')}</SelectItem>
                                        <SelectItem value="off_duty">{safeT('teams.status.off_duty', 'Fora de Serviço')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                            {safeT('teams.form.cancel', 'Cancelar')}
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-[#37352f] hover:bg-zinc-800 text-white min-w-[140px]">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {teamToEdit ? safeT('teams.form.save', 'Salvar Alterações') : safeT('teams.form.create', 'Criar Equipe')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

