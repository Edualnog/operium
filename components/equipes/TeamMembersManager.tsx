"use client"

import { useState, useEffect, useCallback } from "react"
import { TeamMember } from "@/app/dashboard/equipes/types"
import { getTeamMembers, addTeamMember, removeTeamMember } from "@/app/dashboard/equipes/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, UserPlus, Loader2 } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase-client"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

interface TeamMembersManagerProps {
    teamId: string
}

export default function TeamMembersManager({ teamId }: TeamMembersManagerProps) {
    const { t } = useTranslation()
    const [members, setMembers] = useState<TeamMember[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [availableColabs, setAvailableColabs] = useState<{ id: string, name: string }[]>([])
    const [selectedColab, setSelectedColab] = useState<string>("")
    const [isAdding, setIsAdding] = useState(false)
    const [isPopoverOpen, setIsPopoverOpen] = useState(false)
    const supabase = createClientComponentClient()

    const fetchMembers = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await getTeamMembers(teamId)
            // Filter out members who have left_at set (history) - or show them differently?
            // Requirement says "Listar membros atuais".
            const activeMembers = data.filter(m => !m.left_at)
            setMembers(activeMembers)
        } catch (error) {
            console.error(error)
            toast.error(t('teams.members.toast.error_load'))
        } finally {
            setIsLoading(false)
        }
    }, [teamId, t])

    const fetchAvailableCollaborators = useCallback(async () => {
        console.log("Fetching available collaborators...")

        // Get current user for security filtering
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('colaboradores')
            .select('id, nome, status')
            .eq('profile_id', user.id)  // Security: Filter by user
            .order('nome')

        if (error) {
            console.error("Error fetching collaborators:", error)
            return
        }

        console.log("All collaborators fetched:", data)
        // Filter by ATIVO status (case-insensitive)
        const activeColabs = data?.filter(c => c.status?.toUpperCase() === 'ATIVO') || []
        console.log("Active collaborators:", activeColabs)
        setAvailableColabs(activeColabs.map(c => ({ id: c.id, name: c.nome })))
    }, [supabase])

    useEffect(() => {
        fetchMembers()
        fetchAvailableCollaborators()
    }, [fetchMembers, fetchAvailableCollaborators])

    const handleAddMember = async () => {
        if (!selectedColab) return
        setIsAdding(true)
        try {
            await addTeamMember(teamId, selectedColab, "Membro") // Default role
            setSelectedColab("")
            setIsPopoverOpen(false)
            toast.success(t('teams.members.toast.added'))
        } catch (error: any) {
            toast.error(error.message || t('teams.members.toast.error_add'))
        } finally {
            setIsAdding(false)
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        try {
            await removeTeamMember(memberId)
            await fetchMembers() // Refresh list
            toast.success(t('teams.members.toast.removed'))
        } catch (error: any) {
            toast.error(t('teams.members.toast.error_remove'))
        }
    }

    return (
        <div className="space-y-6">
            {/* Add Member Section */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                    {t('teams.members.add_title')}
                </label>
                <div className="flex gap-2 items-center">
                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isPopoverOpen}
                                className="flex-1 justify-between bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            >
                                {selectedColab
                                    ? availableColabs.find((c) => c.id === selectedColab)?.name
                                    : t('teams.members.search_placeholder')}
                                <UserPlus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[340px] p-0 border-zinc-200 dark:border-zinc-700">
                            <Command>
                                <CommandInput placeholder={t('teams.members.search_placeholder')} />
                                <CommandList>
                                    <CommandEmpty>{t('teams.members.not_found')}</CommandEmpty>
                                    <CommandGroup>
                                        {availableColabs.map((colab) => {
                                            const alreadyInTeam = members.some(m => m.colaborador_id === colab.id)
                                            return (
                                                <CommandItem
                                                    key={colab.id}
                                                    value={colab.name}
                                                    disabled={alreadyInTeam}
                                                    onSelect={() => {
                                                        if (!alreadyInTeam) {
                                                            setSelectedColab(colab.id)
                                                            setIsPopoverOpen(false)
                                                        }
                                                    }}
                                                    className={cn(alreadyInTeam && "opacity-50")}
                                                >
                                                    <span>{colab.name}</span>
                                                    {alreadyInTeam && <Badge variant="outline" className="ml-auto text-xs">{t('teams.members.already_in_team')}</Badge>}
                                                </CommandItem>
                                            )
                                        })}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    <Button onClick={handleAddMember} disabled={!selectedColab || isAdding} className="shrink-0 bg-[#37352f] hover:bg-[#2f2e29] dark:bg-zinc-700 dark:hover:bg-zinc-600">
                        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Members List */}
            <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">{t('teams.members.current_title')} ({members.length})</h4>

                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : members.length === 0 ? (
                    <div className="text-center p-8 bg-muted/20 rounded-lg border border-dashed">
                        <UserPlus className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">{t('teams.members.empty')}</p>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {members.map((member) => (
                            <Card key={member.id} className="overflow-hidden">
                                <CardContent className="p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 border">
                                            <AvatarImage src={member.colaborador_foto || undefined} />
                                            <AvatarFallback>
                                                {member.colaborador_nome?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{member.colaborador_nome}</span>
                                            <span className="text-xs text-muted-foreground">{member.colaborador_cargo || t('teams.members.collaborator')}</span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemoveMember(member.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

