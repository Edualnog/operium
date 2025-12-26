"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { createClientComponentClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { Car, Loader2, User, Users2, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

interface VehicleReturnModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    vehicleId: string
    vehiclePlate: string
    vehicleModel: string | null
    colaboradorId: string
    colaboradorNome: string
    assignmentType: 'team' | 'direct'
    teamName?: string | null
}

export function VehicleReturnModal({
    open,
    onOpenChange,
    vehicleId,
    vehiclePlate,
    vehicleModel,
    colaboradorId,
    colaboradorNome,
    assignmentType,
    teamName,
}: VehicleReturnModalProps) {
    const [loading, setLoading] = useState(false)
    const supabase = createClientComponentClient()
    const router = useRouter()

    const handleReturn = async () => {
        setLoading(true)
        try {
            // 1. Clear current_driver_id from vehicle
            const { error: updateError } = await supabase
                .from('vehicles')
                .update({ current_driver_id: null })
                .eq('id', vehicleId)

            if (updateError) throw updateError

            // 2. Log return event
            await supabase.from('vehicle_usage_events').insert([{
                vehicle_id: vehicleId,
                collaborator_id: colaboradorId,
                usage_type: 'RETURN',
                usage_date: new Date().toISOString(),
                notes: `Veículo devolvido por ${colaboradorNome}`,
            }])

            toast.success(`Veículo ${vehiclePlate} devolvido com sucesso`)
            onOpenChange(false)
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao devolver veículo: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    // If it's a team vehicle, show info message instead of return option
    if (assignmentType === 'team') {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Car className="h-5 w-5" />
                            Veículo da Equipe
                        </DialogTitle>
                        <DialogDescription>
                            Este veículo está atribuído a uma equipe.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                                <div>
                                    <p className="font-medium text-amber-800 dark:text-amber-200">
                                        Gerenciado via Equipe
                                    </p>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                        Este veículo está atribuído à equipe <strong>{teamName}</strong>.
                                        Para desvinculá-lo, acesse o módulo de <strong>Gestão de Equipes</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-4 mt-4 space-y-3">
                            {/* Vehicle Info */}
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                                    <Car className="h-5 w-5 text-zinc-500" />
                                </div>
                                <div>
                                    <p className="font-semibold">{vehiclePlate}</p>
                                    {vehicleModel && (
                                        <p className="text-sm text-zinc-500">{vehicleModel}</p>
                                    )}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-zinc-200 dark:border-zinc-700" />

                            {/* Team Info */}
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                                    <Users2 className="h-5 w-5 text-zinc-500" />
                                </div>
                                <div>
                                    <p className="font-medium">{teamName}</p>
                                    <p className="text-sm text-zinc-500">Equipe responsável</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="w-full"
                        >
                            Entendi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Car className="h-5 w-5" />
                        Devolver Veículo
                    </DialogTitle>
                    <DialogDescription>
                        Confirme a devolução do veículo atribuído a este colaborador.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-4 space-y-3">
                        {/* Vehicle Info */}
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                                <Car className="h-5 w-5 text-zinc-500" />
                            </div>
                            <div>
                                <p className="font-semibold">{vehiclePlate}</p>
                                {vehicleModel && (
                                    <p className="text-sm text-zinc-500">{vehicleModel}</p>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-zinc-200 dark:border-zinc-700" />

                        {/* Collaborator Info */}
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                                <User className="h-5 w-5 text-zinc-500" />
                            </div>
                            <div>
                                <p className="font-medium">{colaboradorNome}</p>
                                <p className="text-sm text-zinc-500">Responsável atual</p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleReturn}
                        disabled={loading}
                        variant="destructive"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Devolução
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
