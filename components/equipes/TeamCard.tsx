"use client"

import { Team } from "@/app/dashboard/equipes/types"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Truck, Users, Wrench, MoreHorizontal, MapPin, User, FileText, AlertTriangle, Radio, HardHat } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import CreateEditTeamModal from "./CreateEditTeamModal"
import TeamDetailsSheet from "./TeamDetailsSheet"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

interface TeamCardProps {
    team: Team
}

export default function TeamCard({ team }: TeamCardProps) {
    const { t } = useTranslation()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [selectedTab, setSelectedTab] = useState<"members" | "equipment" | "vehicle">("members")

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
            case 'on_break': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
            case 'off_duty': return 'bg-zinc-50 text-zinc-500 border-zinc-100 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800'
            default: return 'bg-zinc-100 text-zinc-600'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Operando normalmente'
            case 'on_break': return 'Em pausa'
            case 'off_duty': return 'Fora de serviço'
            default: return status
        }
    }

    // Determina se é equipe solo (1 membro)
    const isSoloTeam = (team.member_count || 0) === 1

    // Tipo de atuação inferido do current_service ou hardcoded
    const getOperationType = () => {
        const service = team.current_service?.toLowerCase() || ''
        if (service.includes('manutenção') || service.includes('manutencao')) return 'Manutenção'
        if (service.includes('instalação') || service.includes('instalacao')) return 'Instalação'
        if (service.includes('inspeção') || service.includes('inspecao')) return 'Inspeção'
        if (service.includes('obra')) return 'Obra'
        return 'Operação de Campo'
    }

    return (
        <>
            <Card
                className="group hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm cursor-pointer relative"
                onClick={() => setIsDetailsOpen(true)}
            >
                {/* Microcopy de hover */}
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-zinc-100/80 dark:from-zinc-800/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1.5 pointer-events-none rounded-b-lg">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Ver operação da unidade</span>
                </div>

                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold tracking-tight text-base truncate max-w-[130px] text-zinc-900 dark:text-zinc-100" title={team.name}>
                                {team.name}
                            </h3>
                            {isSoloTeam && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                    Solo
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <div className={cn("px-2 py-0.5 rounded-md border text-[10px] font-medium tracking-wide", getStatusColor(team.status))}>
                                {getStatusLabel(team.status)}
                            </div>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('teams.card.actions')}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                                {t('teams.card.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedTab("members"); setIsDetailsOpen(true) }}>
                                {t('teams.card.manage_members')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedTab("equipment"); setIsDetailsOpen(true) }}>
                                {t('teams.card.equipment')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                                {t('teams.card.deactivate')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 pb-6">
                    {/* Tipo de Atuação */}
                    <div className="flex items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                        <HardHat className="h-4 w-4 text-slate-500" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Área de Serviço</span>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{getOperationType()}</span>
                        </div>
                    </div>

                    {/* Leader Section */}
                    <div className="flex items-center gap-3 p-2 rounded-md bg-muted/40">
                        <Avatar className="h-8 w-8 border bg-background">
                            <AvatarImage src={team.leader_photo || undefined} />
                            <AvatarFallback className="text-xs">
                                {team.leader_name?.substring(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium leading-none">{isSoloTeam ? 'Operador' : t('teams.card.leader')}</span>
                            <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                                {team.leader_name || t('teams.card.not_assigned')}
                            </span>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col items-center justify-center p-2 rounded-md bg-muted/20 border border-border/50">
                            {isSoloTeam ? (
                                <User className="h-4 w-4 text-blue-500 mb-1" />
                            ) : (
                                <Users className="h-4 w-4 text-muted-foreground mb-1" />
                            )}
                            <span className="text-xs text-muted-foreground">{isSoloTeam ? 'Individual' : t('teams.card.members')}</span>
                            <span className="font-semibold text-sm">{team.member_count || 0}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 rounded-md bg-muted/20 border border-border/50">
                            <Wrench className="h-4 w-4 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">{t('teams.card.equip')}</span>
                            <span className="font-semibold text-sm">{team.equipment_quantity || 0}</span>
                        </div>
                    </div>

                    {/* Indicadores de Geração de Dados */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            <Radio className="h-2.5 w-2.5" />
                            Atua em campo
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            <FileText className="h-2.5 w-2.5" />
                            Gera relatórios
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Registra falhas
                        </span>
                    </div>

                    {/* Location & Vehicle Footer */}
                    <div className="space-y-2 pt-2 border-t border-border/50">
                        {team.vehicle_model && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Truck className="h-3.5 w-3.5" />
                                <span className="truncate">{team.vehicle_model} • {team.vehicle_plate}</span>
                            </div>
                        )}
                        {team.current_location && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="truncate max-w-full" title={team.current_location}>
                                    {team.current_location}
                                </span>
                            </div>
                        )}

                        {(!team.vehicle_model && !team.current_location) && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground italic opacity-50">
                                {t('teams.card.no_vehicle_location')}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <CreateEditTeamModal
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                teamToEdit={team}
            />

            <TeamDetailsSheet
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                team={team}
                defaultTab={selectedTab}
            />
        </>
    )
}

