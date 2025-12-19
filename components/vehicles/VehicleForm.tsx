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
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        const data = {
            plate: formData.get("plate") as string,
            vehicle_type: formData.get("vehicle_type") as VehicleType,
            fuel_type: formData.get("fuel_type") as FuelType,
            brand: formData.get("brand") as string,
            model: formData.get("model") as string,
            year: formData.get("year") ? parseInt(formData.get("year") as string) : undefined,
            acquisition_date: formData.get("acquisition_date") as string,
        }

        await onSubmit(data)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
                    <DialogDescription>
                        {initialData
                            ? "Atualize as informações do veículo abaixo."
                            : "Preencha as informações para cadastrar um novo veículo."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="plate">Placa *</Label>
                            <Input
                                id="plate"
                                name="plate"
                                defaultValue={initialData?.plate}
                                required
                                placeholder="ABC-1234"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="vehicle_type">Tipo *</Label>
                            <Select name="vehicle_type" defaultValue={initialData?.vehicle_type || "CAR"} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CAR">Carro</SelectItem>
                                    <SelectItem value="TRUCK">Caminhão</SelectItem>
                                    <SelectItem value="VAN">Van/Utilitário</SelectItem>
                                    <SelectItem value="MOTORCYCLE">Moto</SelectItem>
                                    <SelectItem value="OTHER">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="brand">Marca</Label>
                            <Input
                                id="brand"
                                name="brand"
                                defaultValue={initialData?.brand}
                                placeholder="Ex: Fiat"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="model">Modelo</Label>
                            <Input
                                id="model"
                                name="model"
                                defaultValue={initialData?.model}
                                placeholder="Ex: Strada"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="fuel_type">Combustível *</Label>
                            <Select name="fuel_type" defaultValue={initialData?.fuel_type || "FLEX"} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GASOLINE">Gasolina</SelectItem>
                                    <SelectItem value="DIESEL">Diesel</SelectItem>
                                    <SelectItem value="FLEX">Flex</SelectItem>
                                    <SelectItem value="ELECTRIC">Elétrico</SelectItem>
                                    <SelectItem value="HYBRID">Híbrido</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="year">Ano</Label>
                            <Input
                                id="year"
                                name="year"
                                type="number"
                                defaultValue={initialData?.year}
                                placeholder="Ex: 2023"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="acquisition_date">Data de Aquisição *</Label>
                        <Input
                            id="acquisition_date"
                            name="acquisition_date"
                            type="date"
                            defaultValue={initialData?.acquisition_date ? new Date(initialData.acquisition_date).toISOString().split('T')[0] : ''}
                            required
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : (initialData ? "Atualizar" : "Criar")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
