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
import { useState, useEffect } from "react"

interface TeamDetailsSheetProps {
    team: Team | null
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultTab?: "members" | "equipment" | "vehicle"
}

export default function TeamDetailsSheet({ team, open, onOpenChange, defaultTab = "members" }: TeamDetailsSheetProps) {
    const [activeTab, setActiveTab] = useState(defaultTab)

    // Sync activeTab when sheet opens with a specific defaultTab
    useEffect(() => {
        if (open) {
            setActiveTab(defaultTab)
        }
    }, [open, defaultTab])

    if (!team) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[700px] sm:w-[800px] lg:w-[950px] flex flex-col h-full border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <SheetTitle className="text-xl font-serif font-bold text-[#37352f] dark:text-zinc-100">{team.name}</SheetTitle>
                    <SheetDescription className="text-zinc-500 dark:text-zinc-400">
                        Gerencie membros, equipamentos e detalhes da equipe.
                    </SheetDescription>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "members" | "equipment" | "vehicle")} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-none border-b border-zinc-100 dark:border-zinc-800 h-11 p-0">
                        <TabsTrigger
                            value="members"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] dark:data-[state=active]:border-zinc-100 rounded-none h-full text-zinc-600 dark:text-zinc-400 data-[state=active]:text-[#37352f] dark:data-[state=active]:text-zinc-100"
                        >
                            Membros
                        </TabsTrigger>
                        <TabsTrigger
                            value="equipment"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] dark:data-[state=active]:border-zinc-100 rounded-none h-full text-zinc-600 dark:text-zinc-400 data-[state=active]:text-[#37352f] dark:data-[state=active]:text-zinc-100"
                        >
                            Equipamentos
                        </TabsTrigger>
                        <TabsTrigger
                            value="vehicle"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] dark:data-[state=active]:border-zinc-100 rounded-none h-full text-zinc-600 dark:text-zinc-400 data-[state=active]:text-[#37352f] dark:data-[state=active]:text-zinc-100"
                        >
                            Veículo
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto px-6 py-4">
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
