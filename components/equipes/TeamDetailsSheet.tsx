"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Team } from "@/app/dashboard/equipes/types"
import TeamMembersManager from "./TeamMembersManager"
import TeamEquipmentManager from "./TeamEquipmentManager"
import TeamVehicleSection from "./TeamVehicleSection"
import { useState } from "react"

interface TeamDetailsSheetProps {
    team: Team | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export default function TeamDetailsSheet({ team, open, onOpenChange }: TeamDetailsSheetProps) {
    const [activeTab, setActiveTab] = useState("members")

    if (!team) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
                <SheetHeader className="mb-4">
                    <SheetTitle>{team.name}</SheetTitle>
                    <SheetDescription>
                        Gerencie membros, equipamentos e detalhes da equipe.
                    </SheetDescription>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="members">Membros</TabsTrigger>
                        <TabsTrigger value="equipment">Equipamentos</TabsTrigger>
                        <TabsTrigger value="vehicle">Veículo</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto mt-4 px-1">
                        <TabsContent value="members" className="h-full mt-0">
                            <TeamMembersManager teamId={team.id} />
                        </TabsContent>
                        <TabsContent value="equipment" className="h-full mt-0">
                            <TeamEquipmentManager teamId={team.id} />
                        </TabsContent>
                        <TabsContent value="vehicle" className="h-full mt-0">
                            <TeamVehicleSection
                                teamId={team.id}
                                vehicleId={team.vehicle_id}
                                vehicleModel={team.vehicle_model}
                                vehiclePlate={team.vehicle_plate}
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </SheetContent>
        </Sheet>
    )
}
