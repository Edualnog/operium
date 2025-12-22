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

interface CreateEditTeamModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    teamToEdit?: Team
}

interface FormData {
    name: string
    description: string
    leader_id: string
    vehicle_id: string
    status: TeamStatus
}

export default function CreateEditTeamModal({ open, onOpenChange, teamToEdit }: CreateEditTeamModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [leaders, setLeaders] = useState<{ id: string, name: string }[]>([])
    const [vehicles, setVehicles] = useState<{ id: string, plate: string, model: string }[]>([])
    const supabase = createClientComponentClient()

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
                // Fetch eligible leaders (colaboradores)
                const { data: colabs } = await supabase
                    .from('colaboradores')
                    .select('id, nome')
                    .eq('status', 'ativo')
                    .order('nome')

                if (colabs) setLeaders(colabs.map(c => ({ id: c.id, name: c.nome })))

                // Fetch available vehicles
                const { data: vehs } = await supabase
                    .from('vehicles')
                    .select('id, plate, model')
                    .eq('status', 'available')
                    .order('plate')

                // Always include current vehicle if editing, even if not 'available' currently
                if (teamToEdit?.vehicle_id) {
                    const { data: currentVeh } = await supabase
                        .from('vehicles')
                        .select('id, plate, model')
                        .eq('id', teamToEdit.vehicle_id)
                        .single()
                    if (currentVeh && vehs) {
                        if (!vehs.find(v => v.id === currentVeh.id)) {
                            vehs.push(currentVeh)
                        }
                    }
                }

                if (vehs) setVehicles(vehs)
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
                toast.success("Equipe atualizada com sucesso!")
            } else {
                await createTeam(data)
                toast.success("Equipe criada com sucesso!")
            }
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || "Ocorreu um erro ao salvar a equipe.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{teamToEdit ? 'Editar Equipe' : 'Nova Equipe'}</DialogTitle>
                    <DialogDescription>
                        {teamToEdit ? 'Atualize os dados da equipe abaixo.' : 'Preencha os dados para criar uma nova equipe operacional.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nome da Equipe *</Label>
                        <Input
                            id="name"
                            placeholder="Ex: Equipe Alpha, Manutenção Elétrica..."
                            {...register("name", { required: true })}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            placeholder="Função ou área de atuação da equipe"
                            className="resize-none"
                            {...register("description")}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="leader">Líder da Equipe</Label>
                            <Controller
                                control={control}
                                name="leader_id"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Nenhum</SelectItem>
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
                            <Label htmlFor="vehicle">Veículo</Label>
                            <Controller
                                control={control}
                                name="vehicle_id"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Nenhum</SelectItem>
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
                        <Label htmlFor="status">Status</Label>
                        <Controller
                            control={control}
                            name="status"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Em Operação</SelectItem>
                                        <SelectItem value="on_break">Pausa</SelectItem>
                                        <SelectItem value="off_duty">Fora de Serviço</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {teamToEdit ? 'Salvar Alterações' : 'Criar Equipe'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
