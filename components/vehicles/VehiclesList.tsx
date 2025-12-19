"use client"

import { useState } from "react"
import { useVehicles } from "@/lib/hooks/useVehicles"
import { Vehicle } from "@/lib/types/vehicles"
import { VehicleForm } from "./VehicleForm"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Plus,
    MoreHorizontal,
    Truck,
    Car,
    Bike,
    Edit,
    Trash2,
    AlertCircle
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useRouter } from "next/navigation"

const VehicleIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'TRUCK': return <Truck className="h-4 w-4" />
        case 'MOTORCYCLE': return <Bike className="h-4 w-4" />
        case 'VAN': return <Truck className="h-4 w-4" /> // Reuse truck for now or find better
        default: return <Car className="h-4 w-4" />
    }
}

export function VehiclesList() {
    const { vehicles, loading, error, addVehicle, updateVehicle, deleteVehicle } = useVehicles()
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
    const router = useRouter()

    const handleCreate = async (data: any) => {
        try {
            await addVehicle(data)
            setIsFormOpen(false)
        } catch (err) {
            console.error(err)
            // TODO: Toast error
        }
    }

    const handleUpdate = async (data: any) => {
        if (!editingVehicle) return
        try {
            await updateVehicle(editingVehicle.id, data)
            setIsFormOpen(false)
            setEditingVehicle(null)
        } catch (err) {
            console.error(err)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este veículo?")) {
            await deleteVehicle(id)
        }
    }

    const openEdit = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle)
        setIsFormOpen(true)
    }

    const handleRowClick = (id: string) => {
        router.push(`/dashboard/veiculos/${id}`)
    }

    if (loading && vehicles.length === 0) {
        return <div className="p-8 text-center">Carregando frota...</div>
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">Erro ao carregar veículos: {error}</div>
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Frota</h2>
                <Button onClick={() => { setEditingVehicle(null); setIsFormOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Veículo
                </Button>
            </div>

            <div className="rounded-md border bg-white dark:bg-zinc-900">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Placa</TableHead>
                            <TableHead>Marca/Modelo</TableHead>
                            <TableHead>Combustível</TableHead>
                            <TableHead>Aquisição</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[70px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vehicles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Nenhum veículo cadastrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            vehicles.map((vehicle) => (
                                <TableRow
                                    key={vehicle.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={(e) => {
                                        // Don't navigate if clicking actions
                                        if ((e.target as HTMLElement).closest('.actions-trigger')) return;
                                        handleRowClick(vehicle.id)
                                    }}
                                >
                                    <TableCell>
                                        <VehicleIcon type={vehicle.vehicle_type} />
                                    </TableCell>
                                    <TableCell className="font-medium">{vehicle.plate}</TableCell>
                                    <TableCell>{vehicle.brand} {vehicle.model}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{vehicle.fuel_type}</TableCell>
                                    <TableCell>
                                        {vehicle.acquisition_date ? format(new Date(vehicle.acquisition_date), 'dd/MM/yyyy') : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                            Ativo
                                        </span>
                                    </TableCell>
                                    <TableCell className="actions-trigger">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => openEdit(vehicle)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(vehicle.id)} className="text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <VehicleForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={editingVehicle ? handleUpdate : handleCreate}
                initialData={editingVehicle}
                loading={loading}
            />
        </div>
    )
}
