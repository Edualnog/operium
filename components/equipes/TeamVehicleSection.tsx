"use client"

import { Team } from "@/app/dashboard/equipes/types"
import { updateTeam } from "@/app/dashboard/equipes/actions"
import { Button } from "@/components/ui/button"
import { Truck, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

interface TeamVehicleSectionProps {
    teamId: string
    vehicleModel?: string | null
    vehiclePlate?: string | null
    vehicleId?: string | null
}

export default function TeamVehicleSection({ teamId, vehicleModel, vehiclePlate, vehicleId }: TeamVehicleSectionProps) {
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)

    const handleUnassign = async () => {
        setIsLoading(true)
        try {
            await updateTeam(teamId, { vehicle_id: "" }) // Empty string to unassign logic in action
            toast.success(t('teams.vehicle.toast.unassigned'))
        } catch (error) {
            toast.error(t('teams.vehicle.toast.error'))
        } finally {
            setIsLoading(false)
        }
    }

    if (!vehicleId) {
        return (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/20">
                <Truck className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">{t('teams.vehicle.not_assigned')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('teams.vehicle.edit_hint')}</p>
            </div>
        )
    }

    return (
        <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h4 className="text-sm font-medium">{t('teams.vehicle.current')}</h4>
                    <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        <span className="text-base font-semibold">{vehicleModel}</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">{t('teams.vehicle.plate')}: {vehiclePlate}</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={handleUnassign}
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                    {t('teams.vehicle.unassign')}
                </Button>
            </div>
        </div>
    )
}

