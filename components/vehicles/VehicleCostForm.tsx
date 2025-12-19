"use client"

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
import { Textarea } from "@/components/ui/textarea"
import { VehicleCost } from "@/lib/types/vehicles"

interface VehicleCostFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: Omit<VehicleCost, "id" | "created_at">) => Promise<void>
    vehicleId: string
    loading?: boolean
}

export function VehicleCostForm({
    open,
    onOpenChange,
    onSubmit,
    vehicleId,
    loading,
}: VehicleCostFormProps) {
    const { t } = useTranslation('common')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        const data = {
            vehicle_id: vehicleId,
            cost_type: formData.get("cost_type") as string,
            amount: parseFloat(formData.get("amount") as string),
            reference_month: formData.get("reference_month") as string,
            notes: formData.get("notes") as string,
        }

        await onSubmit(data)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('vehicles.costs.new')}</DialogTitle>
                    <DialogDescription>
                        {t('vehicles.costs.title')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="cost_type">{t('vehicles.costs.type')} *</Label>
                        <Select name="cost_type" required>
                            <SelectTrigger>
                                <SelectValue placeholder={t('common.select')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FUEL">{t('vehicles.costs.types.FUEL')}</SelectItem>
                                <SelectItem value="INSURANCE">{t('vehicles.costs.types.INSURANCE')}</SelectItem>
                                <SelectItem value="TAX">{t('vehicles.costs.types.TAX')}</SelectItem>
                                <SelectItem value="FINE">{t('vehicles.costs.types.FINE')}</SelectItem>
                                <SelectItem value="OTHER">{t('vehicles.costs.types.OTHER')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="amount">{t('vehicles.costs.amount')} *</Label>
                            <Input
                                id="amount"
                                name="amount"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="reference_month">{t('vehicles.costs.month')} *</Label>
                            <Input
                                id="reference_month"
                                name="reference_month"
                                type="date"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">{t('vehicles.costs.notes')}</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            placeholder="Ex: Abastecimento Posto X"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
                            {loading ? t('vehicles.form.save_creating') : t('vehicles.costs.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
