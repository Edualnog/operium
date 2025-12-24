"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, CheckCircle2, Wrench, XCircle, Car, Lock } from "lucide-react"
import { useOperiumEvents, useOperiumVehicles } from "@/lib/hooks/useOperiumEvents"
import { useOperiumProfile } from "@/lib/hooks/useOperiumProfile"
import { CreateVehicleStatusInput, OperiumVehicleStatus } from "@/lib/types/operium"
import { useToast } from "@/components/ui/toast-context"
import { createClientComponentClient } from "@/lib/supabase-client"

interface VehicleStatusFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

interface TeamVehicle {
    id: string
    plate: string
    model?: string | null
}

const STATUS_OPTIONS: { value: OperiumVehicleStatus; label: string; icon: React.ReactNode; color: string }[] = [
    {
        value: 'ACTIVE',
        label: 'Ativo',
        icon: <CheckCircle2 className="h-5 w-5" />,
        color: 'text-green-600 dark:text-green-400'
    },
    {
        value: 'MAINTENANCE',
        label: 'Em Manutenção',
        icon: <Wrench className="h-5 w-5" />,
        color: 'text-amber-600 dark:text-amber-400'
    },
    {
        value: 'INACTIVE',
        label: 'Inativo',
        icon: <XCircle className="h-5 w-5" />,
        color: 'text-red-600 dark:text-red-400'
    },
]

export function VehicleStatusForm({ open, onOpenChange, onSuccess }: VehicleStatusFormProps) {
    const [loading, setLoading] = useState(false)
    const { createVehicleStatus } = useOperiumEvents()
    const { vehicles, loading: loadingVehicles } = useOperiumVehicles()
    const { profile, isAdmin } = useOperiumProfile()
    const { toast } = useToast()
    const supabase = createClientComponentClient()

    const [teamVehicle, setTeamVehicle] = useState<TeamVehicle | null>(null)
    const [loadingTeamVehicle, setLoadingTeamVehicle] = useState(false)

    const { register, handleSubmit, reset, setValue, watch } = useForm<CreateVehicleStatusInput>({
        defaultValues: {
            vehicle_id: '',
            status: 'ACTIVE',
            observacoes: '',
        }
    })

    const selectedStatus = watch('status')

    // Fetch team vehicle when modal opens
    useEffect(() => {
        const fetchTeamVehicle = async () => {
            if (!open || !profile?.team_id) {
                setTeamVehicle(null)
                return
            }

            setLoadingTeamVehicle(true)
            try {
                const { data, error } = await supabase
                    .from("teams")
                    .select("vehicle_id, veiculos:vehicle_id (id, plate, model)")
                    .eq("id", profile.team_id)
                    .single()

                if (!error && data?.veiculos) {
                    const v = data.veiculos as any
                    setTeamVehicle({ id: v.id, plate: v.plate, model: v.model })
                    setValue('vehicle_id', v.id) // Pre-select team vehicle
                } else {
                    setTeamVehicle(null)
                }
            } catch (err) {
                console.error("Error fetching team vehicle:", err)
                setTeamVehicle(null)
            } finally {
                setLoadingTeamVehicle(false)
            }
        }

        fetchTeamVehicle()
    }, [open, profile?.team_id, supabase, setValue])

    const onSubmit = async (data: CreateVehicleStatusInput) => {
        try {
            setLoading(true)
            await createVehicleStatus(data)
            toast.success("Status atualizado com sucesso")
            reset()
            onOpenChange(false)
            onSuccess?.()
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Não foi possível registrar o status")
        } finally {
            setLoading(false)
        }
    }

    // Check if vehicle is fixed (user has team vehicle assigned)
    const hasFixedVehicle = teamVehicle !== null && !isAdmin

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-zinc-900 dark:text-zinc-100">
                        Informar Status do Veículo
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        Atualize o status operacional do veículo.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Veículo */}
                    <div className="space-y-2">
                        <Label htmlFor="vehicle_id" className="text-zinc-700 dark:text-zinc-300">
                            Veículo *
                        </Label>

                        {/* Fixed vehicle display for team members */}
                        {hasFixedVehicle ? (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                <Car className="h-4 w-4 text-zinc-500" />
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {teamVehicle!.plate}
                                </span>
                                {teamVehicle!.model && (
                                    <span className="text-zinc-500 text-sm">
                                        - {teamVehicle!.model}
                                    </span>
                                )}
                                <Lock className="h-3 w-3 text-zinc-400 ml-auto" />
                            </div>
                        ) : (
                            /* Dropdown for admins or users without team vehicle */
                            <Select
                                disabled={loadingVehicles || loadingTeamVehicle}
                                onValueChange={(value) => setValue('vehicle_id', value)}
                                defaultValue={teamVehicle?.id}
                            >
                                <SelectTrigger className="w-full bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                                    <SelectValue placeholder={loadingVehicles ? "Carregando..." : "Selecione o veículo"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicles.map((vehicle) => (
                                        <SelectItem key={vehicle.id} value={vehicle.id}>
                                            {vehicle.plate} {vehicle.model && `- ${vehicle.model}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                        <Label className="text-zinc-700 dark:text-zinc-300">Novo Status *</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {STATUS_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setValue('status', option.value)}
                                    className={`
                    flex flex-col items-center justify-center p-4 rounded-lg border transition-all
                    ${selectedStatus === option.value
                                            ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800'
                                            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'}
                  `}
                                >
                                    <span className={option.color}>
                                        {option.icon}
                                    </span>
                                    <span className="text-xs mt-2 text-zinc-600 dark:text-zinc-400 font-medium">
                                        {option.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Observações */}
                    <div className="space-y-2">
                        <Label htmlFor="observacoes" className="text-zinc-700 dark:text-zinc-300">
                            Observações
                        </Label>
                        <Textarea
                            id="observacoes"
                            placeholder="Motivo da mudança de status..."
                            className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 min-h-[80px]"
                            {...register('observacoes')}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar Status
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
