import { VehiclesList } from "@/components/vehicles/VehiclesList"

export default function VehiclesPage() {
    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Gestão de Veículos</h2>
                    <p className="text-muted-foreground">
                        Gerencie sua frota, monitore custos e manutenções.
                    </p>
                </div>
            </div>
            <VehiclesList />
        </div>
    )
}
