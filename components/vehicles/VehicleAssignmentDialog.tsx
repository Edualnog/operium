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

interface Collaborator {
    id: string
    name: string
    status: string
}

interface VehicleAssignmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    vehicleId: string
    currentDriverId?: string | null
    onSuccess: () => void
}

export function VehicleAssignmentDialog({
    open,
    onOpenChange,
    vehicleId,
    currentDriverId,
    onSuccess,
}: VehicleAssignmentDialogProps) {
    const { t } = useTranslation('common')
    const [loading, setLoading] = useState(false)
    const [collaborators, setCollaborators] = useState<Collaborator[]>([])
    const supabase = createClientComponentClient()

    useEffect(() => {
        if (open) {
            fetchCollaborators()
        }
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    const fetchCollaborators = async () => {
        const { data } = await supabase
            .from('colaboradores')
            .select('id, name, status')
            .eq('status', 'ATIVO')
            .order('name')

        if (data) setCollaborators(data)
    }

    const handleAssign = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        try {
            const formData = new FormData(e.currentTarget)
            const driverId = formData.get("driver_id") as string

            if (!driverId && !currentDriverId) return

            // 1. Update Vehicle
            const { error: updateError } = await supabase
                .from('vehicles')
                .update({ current_driver_id: driverId || null })
                .eq('id', vehicleId)

            if (updateError) throw updateError

            // 2. Log Event
            const { error: eventError } = await supabase
                .from('vehicle_usage_events')
                .insert([{
                    vehicle_id: vehicleId,
                    collaborator_id: driverId || currentDriverId,
                    usage_type: driverId ? 'ASSIGNMENT' : 'RETURN',
                    usage_date: new Date().toISOString(),
                    notes: driverId ? 'Veículo atribuído ao colaborador' : 'Veículo devolvido pelo colaborador',
                }])

            if (eventError) throw eventError

            toast.success(driverId ? t('vehicles.assignment.success_assign') : t('vehicles.assignment.success_return'))
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error(error)
            toast.error(t('common.error_generic'))
        } finally {
            setLoading(false)
        }
    }

    const isReturn = !!currentDriverId

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isReturn ? t('vehicles.assignment.return_title') : t('vehicles.assignment.assign_title')}</DialogTitle>
                    <DialogDescription>
                        {isReturn
                            ? t('vehicles.assignment.return_description')
                            : t('vehicles.assignment.assign_description')
                        }
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAssign} className="grid gap-4 py-4">
                    {!isReturn ? (
                        <div className="grid gap-2">
                            <Label htmlFor="driver_id">{t('vehicles.assignment.collaborator')}</Label>
                            <Select name="driver_id" required>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('common.actions.select')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {collaborators.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="text-sm text-zinc-500">
                            {t('vehicles.assignment.confirm_return_text')}
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
                            {loading ? t('common.saving') : (isReturn ? t('vehicles.assignment.confirm_return') : t('vehicles.assignment.confirm_assign'))}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
