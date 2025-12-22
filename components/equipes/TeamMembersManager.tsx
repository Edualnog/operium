"use client"

import { useState, useEffect } from "react"
import { TeamMember } from "@/app/dashboard/equipes/types"
import { getTeamMembers, addTeamMember, removeTeamMember } from "@/app/dashboard/equipes/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, UserPlus, Loader2 } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase-client"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TeamMembersManagerProps {
    teamId: string
}

export default function TeamMembersManager({ teamId }: TeamMembersManagerProps) {
    const [members, setMembers] = useState<TeamMember[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [availableColabs, setAvailableColabs] = useState<{ id: string, name: string }[]>([])
    const [selectedColab, setSelectedColab] = useState<string>("")
    const [isAdding, setIsAdding] = useState(false)
    const supabase = createClientComponentClient()

    const fetchMembers = async () => {
        setIsLoading(true)
        try {
            const data = await getTeamMembers(teamId)
            // Filter out members who have left_at set (history) - or show them differently?
            // Requirement says "Listar membros atuais".
            const activeMembers = data.filter(m => !m.left_at)
            setMembers(activeMembers)
        } catch (error) {
            console.error(error)
            toast.error("Erro ao carregar membros.")
        } finally {
            setIsLoading(false)
        }
    }

    const fetchAvailableCollaborators = async () => {
        const { data } = await supabase
            .from('colaboradores')
            .select('id, nome')
            .eq('status', 'ativo')
            .order('nome')

        if (data) setAvailableColabs(data.map(c => ({ id: c.id, name: c.nome })))
    }

    useEffect(() => {
        fetchMembers()
        fetchAvailableCollaborators()
    }, [teamId])

    const handleAddMember = async () => {
        if (!selectedColab) return
        setIsAdding(true)
        try {
            await addTeamMember(teamId, selectedColab, "Membro") // Default role
            await fetchMembers()
            setSelectedColab("")
            toast.success("Membro adicionado com sucesso!")
        } catch (error: any) {
            toast.error(error.message || "Erro ao adicionar membro.")
        } finally {
            setIsAdding(false)
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        try {
            await removeTeamMember(memberId)
            await fetchMembers() // Refresh list
            toast.success("Membro removido da equipe.")
        } catch (error: any) {
            toast.error("Erro ao remover membro.")
        }
    }

    return (
        <div className="space-y-6">
            {/* Add Member Section */}
            <div className="flex gap-2 items-end p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Adicionar Colaborador
                    </label>
                    <Select value={selectedColab} onValueChange={setSelectedColab}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione um colaborador..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableColabs.map((colab) => (
                                <SelectItem
                                    key={colab.id}
                                    value={colab.id}
                                    disabled={members.some(m => m.colaborador_id === colab.id)}
                                >
                                    {colab.name} {members.some(m => m.colaborador_id === colab.id) && '(Já na equipe)'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleAddMember} disabled={!selectedColab || isAdding}>
                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
            </div>

            {/* Members List */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Membros Atuais ({members.length})</h4>

                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : members.length === 0 ? (
                    <div className="text-center p-8 bg-muted/20 rounded-lg border border-dashed">
                        <UserPlus className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum membro nesta equipe.</p>
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
                                            <span className="text-xs text-muted-foreground">{member.colaborador_cargo || 'Colaborador'}</span>
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
