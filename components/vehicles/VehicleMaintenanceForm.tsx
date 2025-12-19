"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VehicleMaintenance } from "@/lib/types/vehicles"

interface VehicleMaintenanceFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: Omit<VehicleMaintenance, "id" | "created_at">) => Promise<void>
    vehicleId: string
    loading?: boolean
}

export function VehicleMaintenanceForm({
    open,
    onOpenChange,
    onSubmit,
    vehicleId,
    loading,
}: VehicleMaintenanceFormProps) {
    const { t } = useTranslation('common')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        const data = {
            vehicle_id: vehicleId,
            maintenance_type: formData.get("maintenance_type") as string,
            description: formData.get("description") as string,
            cost: parseFloat(formData.get("cost") as string),
            maintenance_date: formData.get("maintenance_date") as string,
            next_maintenance_date: formData.get("next_maintenance_date") ? formData.get("next_maintenance_date") as string : undefined,
        }

        await onSubmit(data)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('vehicles.maintenance.new')}</DialogTitle>
                    <DialogDescription>
                        {t('vehicles.maintenance.title')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="maintenance_type">{t('vehicles.maintenance.type')} *</Label>
                        <Select name="maintenance_type" required>
                            <SelectTrigger>
                                <SelectValue placeholder={t('common.actions.select', { defaultValue: 'Select' })} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PREVENTIVE">{t('vehicles.maintenance.types.PREVENTIVE')}</SelectItem>
                                <SelectItem value="CORRECTIVE">{t('vehicles.maintenance.types.CORRECTIVE')}</SelectItem>
                                <SelectItem value="PREDICTIVE">{t('vehicles.maintenance.types.PREDICTIVE')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">{t('vehicles.maintenance.description')}</Label>
                        <Input
                            id="description"
                            name="description"
                            placeholder="Ex: Troca de óleo"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="cost">{t('vehicles.maintenance.cost')} *</Label>
                            <Input
                                id="cost"
                                name="cost"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="maintenance_date">{t('vehicles.maintenance.date')} *</Label>
                            <Input
                                id="maintenance_date"
                                name="maintenance_date"
                                type="date"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="next_maintenance_date">{t('vehicles.maintenance.next_date')}</Label>
                        <Input
                            id="next_maintenance_date"
                            name="next_maintenance_date"
                            type="date"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
                            {loading ? t('vehicles.form.save_creating') : t('vehicles.maintenance.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
