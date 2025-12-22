"use client"

import { Team } from "@/app/dashboard/equipes/types"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Truck, Users, Wrench, MoreHorizontal, MapPin } from "lucide-react"
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

interface TeamCardProps {
    team: Team
}

export default function TeamCard({ team }: TeamCardProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            case 'on_break': return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
            case 'off_duty': return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800'
            default: return 'bg-slate-100 text-slate-600'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Em Operação'
            case 'on_break': return 'Pausa'
            case 'off_duty': return 'Fora de Serviço'
            default: return status
        }
    }

    return (
        <>
            <Card className="group hover:shadow-md transition-all duration-200 border-border/50 bg-card/50 hover:bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <h3 className="font-semibold tracking-tight text-base truncate max-w-[150px]" title={team.name}>
                            {team.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <div className={cn("px-2 py-0.5 rounded-full border text-[10px] font-medium uppercase tracking-wider", getStatusColor(team.status))}>
                                {getStatusLabel(team.status)}
                            </div>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                                Editar Equipe
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>
                                Gerenciar Membros
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>
                                Equipamentos
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                                Desativar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    {/* Leader Section */}
                    <div className="flex items-center gap-3 p-2 rounded-md bg-muted/40">
                        <Avatar className="h-8 w-8 border bg-background">
                            <AvatarImage src={team.leader_photo || undefined} />
                            <AvatarFallback className="text-xs">
                                {team.leader_name?.substring(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium leading-none">Líder</span>
                            <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                                {team.leader_name || "Não atribuído"}
                            </span>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col items-center justify-center p-2 rounded-md bg-muted/20 border border-border/50">
                            <Users className="h-4 w-4 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">Membros</span>
                            <span className="font-semibold text-sm">{team.member_count || 0}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 rounded-md bg-muted/20 border border-border/50">
                            <Wrench className="h-4 w-4 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">Equip.</span>
                            <span className="font-semibold text-sm">{team.equipment_quantity || 0}</span>
                        </div>
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
                                Sem veículo ou localização
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
            />
        </>
    )
}
