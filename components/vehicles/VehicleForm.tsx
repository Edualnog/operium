"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Vehicle, VehicleType, FuelType } from "@/lib/types/vehicles"
import { useTranslation } from "react-i18next"

interface VehicleFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: any) => Promise<void>
    initialData?: Vehicle | null
    loading?: boolean
}

export function VehicleForm({
    open,
    onOpenChange,
    onSubmit,
    initialData,
    loading,
}: VehicleFormProps) {
    const { t } = useTranslation('common')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        const data = {
            plate: formData.get("plate") as string,
            vehicle_type: formData.get("vehicle_type") as VehicleType,
            fuel_type: formData.get("fuel_type") as FuelType,
            status: formData.get("status") as string,
            brand: formData.get("brand") as string,
            model: formData.get("model") as string,
            year: formData.get("year") ? parseInt(formData.get("year") as string) : undefined,
            acquisition_date: formData.get("acquisition_date") as string,
            acquisition_value: formData.get("acquisition_value") ? parseFloat(formData.get("acquisition_value") as string) : 0,
            current_odometer: formData.get("current_odometer") ? parseFloat(formData.get("current_odometer") as string) : 0,
        }

        await onSubmit(data)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? t('vehicles.form.title_edit') : t('vehicles.form.title_new')}</DialogTitle>
                    <DialogDescription>
                        {initialData
                            ? t('vehicles.form.description_edit')
                            : t('vehicles.form.description_new')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="plate">{t('vehicles.form.plate')} *</Label>
                            <Input
                                id="plate"
                                name="plate"
                                defaultValue={initialData?.plate}
                                required
                                placeholder={t('vehicles.form.placeholder_plate')}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="vehicle_type">{t('vehicles.form.type')} *</Label>
                            <Select name="vehicle_type" defaultValue={initialData?.vehicle_type || "CAR"} required>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('common.actions.select', { defaultValue: 'Select' })} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CAR">{t('vehicles.types.CAR')}</SelectItem>
                                    <SelectItem value="TRUCK">{t('vehicles.types.TRUCK')}</SelectItem>
                                    <SelectItem value="VAN">{t('vehicles.types.VAN')}</SelectItem>
                                    <SelectItem value="MOTORCYCLE">{t('vehicles.types.MOTORCYCLE')}</SelectItem>
                                    <SelectItem value="OTHER">{t('vehicles.types.OTHER')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="brand">{t('vehicles.form.brand')} *</Label>
                            <Input
                                id="brand"
                                name="brand"
                                defaultValue={initialData?.brand}
                                placeholder={t('vehicles.form.placeholder_brand')}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="model">{t('vehicles.form.model')} *</Label>
                            <Input
                                id="model"
                                name="model"
                                defaultValue={initialData?.model}
                                placeholder={t('vehicles.form.placeholder_model')}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="fuel_type">{t('vehicles.form.fuel')} *</Label>
                            <Select name="fuel_type" defaultValue={initialData?.fuel_type || "FLEX"} required>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('common.actions.select', { defaultValue: 'Select' })} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GASOLINE">{t('vehicles.fuel.GASOLINE')}</SelectItem>
                                    <SelectItem value="DIESEL">{t('vehicles.fuel.DIESEL')}</SelectItem>
                                    <SelectItem value="FLEX">{t('vehicles.fuel.FLEX')}</SelectItem>
                                    <SelectItem value="ELECTRIC">{t('vehicles.fuel.ELECTRIC')}</SelectItem>
                                    <SelectItem value="HYBRID">{t('vehicles.fuel.HYBRID')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="year">{t('vehicles.form.year')}</Label>
                            <Input
                                id="year"
                                name="year"
                                type="number"
                                defaultValue={initialData?.year}
                                placeholder={t('vehicles.form.placeholder_year')}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="acquisition_date">{t('vehicles.form.acquisition_date')} *</Label>
                            <Input
                                id="acquisition_date"
                                name="acquisition_date"
                                type="date"
                                defaultValue={initialData?.acquisition_date ? new Date(initialData.acquisition_date).toISOString().split('T')[0] : ''}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="acquisition_value">{t('vehicles.form.acquisition_value')}</Label>
                            <Input
                                id="acquisition_value"
                                name="acquisition_value"
                                type="number"
                                step="0.01"
                                defaultValue={initialData?.acquisition_value}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="current_odometer">{t('vehicles.form.odometer')}</Label>
                            <Input
                                id="current_odometer"
                                name="current_odometer"
                                type="number"
                                step="1"
                                defaultValue={initialData?.current_odometer || 0}
                                placeholder="0"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="status">{t('vehicles.details.status')}</Label>
                            <Select name="status" defaultValue={initialData?.status || "active"} required>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('common.actions.select', { defaultValue: 'Select' })} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">{t('vehicles.status.active')}</SelectItem>
                                    <SelectItem value="maintenance">{t('vehicles.status.maintenance')}</SelectItem>
                                    <SelectItem value="out_of_service">{t('vehicles.status.out_of_service')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
                            {loading
                                ? (initialData ? t('vehicles.form.save_updating') : t('vehicles.form.save_creating'))
                                : (initialData ? t('vehicles.form.update') : t('vehicles.form.create'))}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
