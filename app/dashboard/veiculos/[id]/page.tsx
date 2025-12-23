"use client"

import { useState } from "react"
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
import { ArrowLeft, Car, Calendar, Fuel, Truck, FileText, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { createClientComponentClient } from "@/lib/supabase-client"
import { generateVehicleReport } from "@/lib/utils/generateVehicleReport"
import { toast } from "sonner"
import { VehicleAssignmentDialog } from "@/components/vehicles/VehicleAssignmentDialog"

export default function VehicleDetailsPage({ params }: { params: { id: string } }) {
    const { vehicle, loading, error, refreshVehicle } = useVehicle(params.id)
    const router = useRouter()
    const { t } = useTranslation('common')



    // Assignment State
    const [isAssignmentOpen, setIsAssignmentOpen] = useState(false)

    // Report State
    const [isReportOpen, setIsReportOpen] = useState(false)
    const [reportLoading, setReportLoading] = useState(false)
    const [reportConfig, setReportConfig] = useState({
        startDate: '',
        endDate: ''
    })

    const supabase = createClientComponentClient()

    // Moved early returns after all hooks
    if (loading) return <div className="p-8">{t('vehicles.details.loading')}</div>
    if (error || !vehicle) return <div className="p-8 text-red-500">{t('vehicles.details.not_found')}</div>

    const handleGenerateReport = async () => {
        if (!vehicle) return

        try {
            setReportLoading(true)

            // Build query filters
            let maintQuery = supabase
                .from("vehicle_maintenances")
                .select("*")
                .eq("vehicle_id", vehicle.id)

            let costQuery = supabase
                .from("vehicle_costs")
                .select("*")
                .eq("vehicle_id", vehicle.id)

            if (reportConfig.startDate) {
                maintQuery = maintQuery.gte('maintenance_date', reportConfig.startDate)
                costQuery = costQuery.gte('reference_month', reportConfig.startDate)
            }
            if (reportConfig.endDate) {
                maintQuery = maintQuery.lte('maintenance_date', reportConfig.endDate)
                costQuery = costQuery.lte('reference_month', reportConfig.endDate)
            }

            const [maintRes, costRes] = await Promise.all([
                maintQuery.order("maintenance_date", { ascending: false }),
                costQuery.order("reference_month", { ascending: false })
            ])

            if (maintRes.error) throw maintRes.error
            if (costRes.error) throw costRes.error

            await generateVehicleReport({
                vehicle,
                maintenances: maintRes.data || [],
                costs: costRes.data || [],
                startDate: reportConfig.startDate,
                endDate: reportConfig.endDate
            })

            toast.success("Relatório gerado com sucesso!")
            setIsReportOpen(false)
        } catch (error: any) {
            console.error("Error generating report:", error)
            toast.error("Erro ao gerar relatório: " + error.message)
        } finally {
            setReportLoading(false)
        }
    }

    // Move early returns to AFTER all hooks
    // if (loading) return ... 
    // This was already done below, just cleaning up duplicates

    // Assignment State
    // const [isAssignmentOpen, setIsAssignmentOpen] = useState(false)
    // This is already declared above.

    const hasDriver = !!vehicle.current_driver_id

    return (
        <div className="h-full flex-1 flex-col space-y-6 p-4 sm:p-6 md:p-8 md:flex">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3 sm:space-x-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{vehicle.plate}</h2>
                        <p className="text-sm text-muted-foreground truncate">
                            {vehicle.brand || '-'} {vehicle.model || '-'} • {vehicle.year || '-'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1 text-sm">
                                <FileText className="h-4 w-4" />
                                <span className="hidden sm:inline">Exportar</span> PDF
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Gerar Relatório PDF</DialogTitle>
                                <DialogDescription>
                                    Escolha o período para o relatório. Deixe em branco para todo o histórico.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Data Inicial</Label>
                                    <Input
                                        type="date"
                                        value={reportConfig.startDate}
                                        onChange={(e) => setReportConfig(prev => ({ ...prev, startDate: e.target.value }))}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Data Final</Label>
                                    <Input
                                        type="date"
                                        value={reportConfig.endDate}
                                        onChange={(e) => setReportConfig(prev => ({ ...prev, endDate: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleGenerateReport} disabled={reportLoading}>
                                    {reportLoading ? "Gerando..." : "Gerar Relatório"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-5">
                <Card className="col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('vehicles.assignment.current_driver')}</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="flex justify-between items-end">
                        <div className="space-y-1">
                            {hasDriver ? (
                                <>
                                    <div className="text-2xl font-bold">{vehicle.driver?.name}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Status: {t('vehicles.details.active')}
                                    </p>
                                </>
                            ) : (
                                <div className="text-xl font-medium text-muted-foreground">{t('vehicles.assignment.no_driver')}</div>
                            )}
                        </div>
                        <Button
                            variant={hasDriver ? "outline" : "default"}
                            className={!hasDriver ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900" : ""}
                            onClick={() => setIsAssignmentOpen(true)}
                        >
                            {hasDriver ? t('vehicles.assignment.return_button') : t('vehicles.assignment.assign_button')}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('vehicles.details.status')}</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{t('vehicles.details.active')}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('vehicles.details.operational')}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('vehicles.details.acquisition')}</CardTitle>
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
                        <CardTitle className="text-sm font-medium">{t('vehicles.details.fuel')}</CardTitle>
                        <Fuel className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{t(`vehicles.fuel.${vehicle.fuel_type}`)}</div>
                    </CardContent>
                </Card>
            </div>

            <VehicleAssignmentDialog
                open={isAssignmentOpen}
                onOpenChange={setIsAssignmentOpen}
                vehicleId={vehicle.id}
                currentDriverId={vehicle.current_driver_id}
                onSuccess={() => {
                    refreshVehicle()
                }}
            />

            <Tabs defaultValue="maintenance" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="maintenance">{t('vehicles.details.tabs.maintenance')}</TabsTrigger>
                    <TabsTrigger value="costs">{t('vehicles.details.tabs.costs')}</TabsTrigger>
                    <TabsTrigger value="usage">{t('vehicles.details.tabs.usage')}</TabsTrigger>
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
