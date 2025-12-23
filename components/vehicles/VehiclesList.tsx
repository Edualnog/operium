"use client"

import { useState, useMemo } from "react"
import { useVehicles } from "@/lib/hooks/useVehicles"
import { Vehicle } from "@/lib/types/vehicles"
import { VehicleForm } from "./VehicleForm"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
    Filter,
    X,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR, enUS } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

const VehicleIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'TRUCK': return <Truck className="h-4 w-4 text-zinc-500" />
        case 'MOTORCYCLE': return <Bike className="h-4 w-4 text-zinc-500" />
        case 'VAN': return <Truck className="h-4 w-4 text-zinc-500" />
        default: return <Car className="h-4 w-4 text-zinc-500" />
    }
}

export function VehiclesList() {
    const { vehicles, loading, error, addVehicle, updateVehicle, deleteVehicle } = useVehicles()
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
    const router = useRouter()
    const { t, i18n } = useTranslation('common')

    // Filter state
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [typeFilter, setTypeFilter] = useState<string>("all")

    // date-fns locale based on i18n
    const dateLocale = i18n.language === 'pt' ? ptBR : enUS

    // Filtered vehicles
    const filteredVehicles = useMemo(() => {
        return vehicles.filter(vehicle => {
            const matchesStatus = statusFilter === "all" || (vehicle.status || 'active') === statusFilter
            const matchesType = typeFilter === "all" || vehicle.vehicle_type === typeFilter
            return matchesStatus && matchesType
        })
    }, [vehicles, statusFilter, typeFilter])

    const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all"

    const clearFilters = () => {
        setStatusFilter("all")
        setTypeFilter("all")
    }

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
        if (confirm(t('vehicles.delete_confirm'))) {
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
        return <div className="p-8 text-center text-muted-foreground">{t('vehicles.loading')}</div>
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">{t('vehicles.error_loading', { error })}</div>
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{t('vehicles.fleet')}</h2>
                <Button
                    onClick={() => { setEditingVehicle(null); setIsFormOpen(true); }}
                    className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    <Plus className="mr-2 h-4 w-4" /> {t('vehicles.new_vehicle')}
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <div className="hidden sm:block"><Filter className="h-4 w-4 text-zinc-500" /></div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px] h-9 bg-white dark:bg-zinc-900">
                        <SelectValue placeholder={t('vehicles.filters.status')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('vehicles.filters.all_statuses')}</SelectItem>
                        <SelectItem value="active">{t('vehicles.status.active')}</SelectItem>
                        <SelectItem value="maintenance">{t('vehicles.status.maintenance')}</SelectItem>
                        <SelectItem value="out_of_service">{t('vehicles.status.out_of_service')}</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[160px] h-9 bg-white dark:bg-zinc-900">
                        <SelectValue placeholder={t('vehicles.filters.type')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('vehicles.filters.all_types')}</SelectItem>
                        <SelectItem value="CAR">{t('vehicles.types.CAR')}</SelectItem>
                        <SelectItem value="TRUCK">{t('vehicles.types.TRUCK')}</SelectItem>
                        <SelectItem value="VAN">{t('vehicles.types.VAN')}</SelectItem>
                        <SelectItem value="MOTORCYCLE">{t('vehicles.types.MOTORCYCLE')}</SelectItem>
                        <SelectItem value="OTHER">{t('vehicles.types.OTHER')}</SelectItem>
                    </SelectContent>
                </Select>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                        <X className="h-4 w-4 mr-1" /> {t('vehicles.filters.clear')}
                    </Button>
                )}
                <span className="ml-auto text-sm text-zinc-500">
                    {filteredVehicles.length} {t('vehicles.filters.results')}
                </span>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden">
                {/* Desktop Table - Hidden on mobile */}
                <div className="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
                            <TableRow className="border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead className="font-medium text-zinc-500">{t('vehicles.form.plate')}</TableHead>
                                <TableHead className="font-medium text-zinc-500">{t('vehicles.form.brand')}/{t('vehicles.form.model')}</TableHead>
                                <TableHead className="font-medium text-zinc-500">{t('vehicles.form.fuel')}</TableHead>
                                <TableHead className="font-medium text-zinc-500">{t('vehicles.form.acquisition_date')}</TableHead>
                                <TableHead className="font-medium text-zinc-500">{t('vehicles.details.status')}</TableHead>
                                <TableHead className="w-[70px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground border-zinc-200 dark:border-zinc-800">
                                        {t('vehicles.no_vehicles')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredVehicles.map((vehicle) => (
                                    <TableRow
                                        key={vehicle.id}
                                        className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800/50 transition-colors"
                                        onClick={(e) => {
                                            if ((e.target as HTMLElement).closest('.actions-trigger')) return;
                                            handleRowClick(vehicle.id)
                                        }}
                                    >
                                        <TableCell>
                                            <VehicleIcon type={vehicle.vehicle_type} />
                                        </TableCell>
                                        <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">{vehicle.plate}</TableCell>
                                        <TableCell className="text-zinc-600 dark:text-zinc-400">{vehicle.brand} {vehicle.model}</TableCell>
                                        <TableCell className="text-zinc-500 text-sm">
                                            {t(`vehicles.fuel.${vehicle.fuel_type}`) || vehicle.fuel_type}
                                        </TableCell>
                                        <TableCell className="text-zinc-500 text-sm">
                                            {vehicle.acquisition_date
                                                ? format(new Date(vehicle.acquisition_date), 'P', { locale: dateLocale })
                                                : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                                                vehicle.status === 'maintenance'
                                                    ? "bg-orange-100 text-orange-700 ring-orange-500/10 dark:bg-orange-900/20 dark:text-orange-400"
                                                    : vehicle.status === 'out_of_service'
                                                        ? "bg-red-100 text-red-700 ring-red-500/10 dark:bg-red-900/20 dark:text-red-400"
                                                        : "bg-zinc-100 text-zinc-700 ring-zinc-500/10 dark:bg-zinc-800 dark:text-zinc-300"
                                            )}>
                                                {t(`vehicles.status.${vehicle.status || 'active'}`)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="actions-trigger">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                                                        <span className="sr-only">{t('common.actions')}</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">{t('common.actions')}</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => openEdit(vehicle)}>
                                                        <Edit className="mr-2 h-4 w-4" /> {t('common.edit')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(vehicle.id)} className="text-red-600 focus:text-red-600 dark:text-red-400">
                                                        <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
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

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-700">
                    {vehicles.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            {t('vehicles.no_vehicles')}
                        </div>
                    ) : (
                        filteredVehicles.map((vehicle) => (
                            <div
                                key={vehicle.id}
                                className="p-4 space-y-3 active:bg-zinc-50 cursor-pointer dark:active:bg-zinc-800"
                                onClick={() => handleRowClick(vehicle.id)}
                            >
                                {/* Header: Icon + Plate + Status */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <VehicleIcon type={vehicle.vehicle_type} />
                                        <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{vehicle.plate}</span>
                                    </div>
                                    <span className={cn(
                                        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                                        vehicle.status === 'maintenance'
                                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                            : vehicle.status === 'out_of_service'
                                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    )}>
                                        {vehicle.status === 'maintenance' ? 'Manutenção' :
                                            vehicle.status === 'out_of_service' ? 'Fora de serviço' : 'Ativo'}
                                    </span>
                                </div>

                                {/* Vehicle Details */}
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    {vehicle.brand} {vehicle.model} • {t(`vehicles.fuel.${vehicle.fuel_type}`) || vehicle.fuel_type}
                                </p>

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs text-zinc-500">
                                        {vehicle.acquisition_date
                                            ? format(new Date(vehicle.acquisition_date), 'dd/MM/yyyy')
                                            : '—'}
                                    </span>
                                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" className="h-8 text-zinc-600" onClick={() => openEdit(vehicle)}>
                                            <Edit className="h-4 w-4 mr-1" /> Editar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
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
