"use client"

import { useVehicle } from "@/lib/hooks/useVehicles"
import { VehicleMaintenanceList } from "@/components/vehicles/VehicleMaintenanceList"
import { VehicleCostList } from "@/components/vehicles/VehicleCostList"
import { VehicleUsageList } from "@/components/vehicles/VehicleUsageList"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Car, Calendar, Fuel, Truck } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

export default function VehicleDetailsPage({ params }: { params: { id: string } }) {
    const { vehicle, loading, error } = useVehicle(params.id)
    const router = useRouter()

    if (loading) return <div className="p-8">Carregando detalhes...</div>
    if (error || !vehicle) return <div className="p-8 text-red-500">Veículo não encontrado</div>

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center space-x-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{vehicle.plate}</h2>
                    <p className="text-muted-foreground">
                        {vehicle.brand} {vehicle.model} • {vehicle.year}
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">Ativo</div>
                        <p className="text-xs text-muted-foreground">
                            Operacional
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aquisição</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {format(new Date(vehicle.acquisition_date), 'yyyy')}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {format(new Date(vehicle.acquisition_date), 'dd/MM/yyyy')}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Combustível</CardTitle>
                        <Fuel className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{vehicle.fuel_type}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tipo</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{vehicle.vehicle_type}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="maintenance" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="maintenance">Manutenções</TabsTrigger>
                    <TabsTrigger value="costs">Custos</TabsTrigger>
                    <TabsTrigger value="usage">Uso</TabsTrigger>
                </TabsList>
                <TabsContent value="maintenance" className="space-y-4">
                    <VehicleMaintenanceList vehicleId={vehicle.id} />
                </TabsContent>
                <TabsContent value="costs" className="space-y-4">
                    <VehicleCostList vehicleId={vehicle.id} />
                </TabsContent>
                <TabsContent value="usage" className="space-y-4">
                    <VehicleUsageList vehicleId={vehicle.id} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
