"use client"

import { Team } from "@/app/dashboard/equipes/types"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Truck, Users, Wrench, MoreHorizontal, MapPin, FileText, AlertTriangle, Radio, HardHat, DollarSign } from "lucide-react"
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
import { deleteTeam } from "@/app/dashboard/equipes/actions"
import { toast } from "sonner"

interface TeamCardProps {
    team: Team
    onDeleted?: () => void
    onUpdated?: (team: Team) => void
}

export default function TeamCard({ team, onDeleted, onUpdated }: TeamCardProps) {
    const { t } = useTranslation()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [selectedTab, setSelectedTab] = useState<"members" | "equipment" | "vehicle">("members")
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isDeleting) return

        setIsDeleting(true)
        try {
            await deleteTeam(team.id)
            toast.success("Equipe desativada com sucesso!")
            onDeleted?.()
        } catch (error: any) {
            toast.error(error.message || "Erro ao desativar equipe")
        } finally {
            setIsDeleting(false)
        }
    }

    // Status neutro estilo Notion - sem cores chamativas
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            case 'on_break': return 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500'
            case 'off_duty': return 'bg-zinc-50 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600'
            default: return 'bg-zinc-100 text-zinc-500'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Operando'
            case 'on_break': return 'Em pausa'
            case 'off_duty': return 'Inativo'
            default: return status
        }
    }

    // Número de colaboradores
    const memberCount = team.member_count || 0

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
                        <h3 className="font-medium tracking-tight text-base truncate max-w-[160px] text-zinc-800 dark:text-zinc-200" title={team.name}>
                            {team.name}
                        </h3>
                        <div className={cn("inline-flex px-2 py-0.5 rounded text-[11px] font-medium", getStatusColor(team.status))}>
                            {getStatusLabel(team.status)}
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
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Desativando..." : t('teams.card.deactivate')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 pb-6">
                    {/* Área de Serviço - estilo Notion */}
                    <div className="flex items-center gap-2">
                        <HardHat className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-xs text-zinc-500">{getOperationType()}</span>
                    </div>

                    {/* Líder/Responsável */}
                    <div className="flex items-center gap-2.5 py-2">
                        <Avatar className="h-7 w-7 border border-zinc-200 dark:border-zinc-700">
                            <AvatarImage src={team.leader_photo || undefined} />
                            <AvatarFallback className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                {team.leader_name?.substring(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Responsável</span>
                            <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                                {team.leader_name || 'Não definido'}
                            </span>
                        </div>
                    </div>

                    {/* Métricas - estilo Notion neutro */}
                    <div className="grid grid-cols-3 gap-3 py-2">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                                <span className="text-[10px] text-zinc-400 uppercase tracking-wide truncate">Membros</span>
                            </div>
                            <span className="text-lg font-medium text-zinc-700 dark:text-zinc-300">{memberCount}</span>
                        </div>
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                                <Wrench className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                                <span className="text-[10px] text-zinc-400 uppercase tracking-wide truncate">Equip.</span>
                            </div>
                            <span className="text-lg font-medium text-zinc-700 dark:text-zinc-300">{team.equipment_quantity || 0}</span>
                        </div>
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                                <DollarSign className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                                <span className="text-[10px] text-zinc-400 uppercase tracking-wide truncate">Custos</span>
                            </div>
                            <span className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                                {(team.total_costs || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>

                    {/* Indicadores de Dados - discretos */}
                    <div className="flex flex-wrap gap-1 pt-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] text-zinc-400">
                            <Radio className="h-2 w-2" />
                            Campo
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] text-zinc-400">
                            <FileText className="h-2 w-2" />
                            Relatórios
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] text-zinc-400">
                            <AlertTriangle className="h-2 w-2" />
                            Falhas
                        </span>
                    </div>

                    {/* Rodapé - Veículo e Localização */}
                    <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        {team.vehicle_model && (
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <Truck className="h-3 w-3" />
                                <span className="truncate">{team.vehicle_plate}</span>
                            </div>
                        )}
                        {team.current_location && (
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate" title={team.current_location}>
                                    {team.current_location}
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <CreateEditTeamModal
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                teamToEdit={team}
                onTeamUpdated={onUpdated}
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

