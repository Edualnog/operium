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
import TeamCostsSection from "./TeamCostsSection"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"

interface TeamDetailsSheetProps {
    team: Team | null
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultTab?: "members" | "equipment" | "vehicle" | "costs"
}

export default function TeamDetailsSheet({ team, open, onOpenChange, defaultTab = "members" }: TeamDetailsSheetProps) {
    const { t } = useTranslation()
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
            <SheetContent className="w-full sm:w-[500px] md:w-[700px] lg:w-[850px] max-w-none flex flex-col h-full border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <SheetTitle className="text-xl font-serif font-bold text-[#37352f] dark:text-zinc-100">{team.name}</SheetTitle>
                    <SheetDescription className="text-zinc-500 dark:text-zinc-400">
                        {t('teams.details.description')}
                    </SheetDescription>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-none border-b border-zinc-100 dark:border-zinc-800 h-11 p-0">
                        <TabsTrigger
                            value="members"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] dark:data-[state=active]:border-zinc-100 rounded-none h-full text-zinc-600 dark:text-zinc-400 data-[state=active]:text-[#37352f] dark:data-[state=active]:text-zinc-100"
                        >
                            {t('teams.details.tabs.members')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="equipment"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] dark:data-[state=active]:border-zinc-100 rounded-none h-full text-zinc-600 dark:text-zinc-400 data-[state=active]:text-[#37352f] dark:data-[state=active]:text-zinc-100"
                        >
                            {t('teams.details.tabs.equipment')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="vehicle"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] dark:data-[state=active]:border-zinc-100 rounded-none h-full text-zinc-600 dark:text-zinc-400 data-[state=active]:text-[#37352f] dark:data-[state=active]:text-zinc-100"
                        >
                            {t('teams.details.tabs.vehicle')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="costs"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 dark:data-[state=active]:border-emerald-400 rounded-none h-full text-zinc-600 dark:text-zinc-400 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400"
                        >
                            Custos
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
                        <TabsContent value="costs" className="h-full mt-0">
                            <TeamCostsSection teamId={team.id} />
                        </TabsContent>
                    </div>
                </Tabs>
            </SheetContent>
        </Sheet>
    )
}
