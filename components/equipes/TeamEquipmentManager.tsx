"use client"

import { useState, useEffect } from "react"
import { TeamEquipment } from "@/app/dashboard/equipes/types"
import { getTeamEquipment, assignEquipment, returnEquipment } from "@/app/dashboard/equipes/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ArchiveRestore, PackageSearch, Loader2, ArrowRight } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useForm } from "react-hook-form"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface TeamEquipmentManagerProps {
    teamId: string
}

export default function TeamEquipmentManager({ teamId }: TeamEquipmentManagerProps) {
    const [equipment, setEquipment] = useState<TeamEquipment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [availableTools, setAvailableTools] = useState<{ id: string, nome: string }[]>([])
    const [isAdding, setIsAdding] = useState(false)
    const [isPopoverOpen, setIsPopoverOpen] = useState(false)

    // Form for new assignment
    const [selectedToolId, setSelectedToolId] = useState("")
    const [quantity, setQuantity] = useState(1)

    const supabase = createClientComponentClient()

    const fetchEquipment = async () => {
        setIsLoading(true)
        try {
            const data = await getTeamEquipment(teamId)
            // Filter active equipment (not returned)
            const activeEquipment = data.filter(e => !e.returned_at)
            setEquipment(activeEquipment)
        } catch (error) {
            console.error(error)
            toast.error("Erro ao carregar equipamentos.")
        } finally {
            setIsLoading(false)
        }
    }

    const fetchAvailableTools = async () => {
        const { data } = await supabase
            .from('ferramentas')
            .select('id, nome')
            .eq('status', 'disponivel') // Assuming 'active' or 'available' status
            .order('nome')
            .limit(50)

        if (data) setAvailableTools(data)
    }

    useEffect(() => {
        fetchEquipment()
        fetchAvailableTools()
    }, [teamId])

    const handleAssign = async () => {
        if (!selectedToolId) return
        setIsAdding(true)
        try {
            await assignEquipment(teamId, selectedToolId, quantity)
            await fetchEquipment()
            setSelectedToolId("")
            setQuantity(1)
            setIsPopoverOpen(false)
            toast.success("Equipamento atribuído!")
        } catch (error: any) {
            toast.error(error.message || "Erro ao atribuir equipamento.")
        } finally {
            setIsAdding(false)
        }
    }

    const handleReturn = async (assignmentId: string) => {
        try {
            await returnEquipment(assignmentId)
            await fetchEquipment()
            toast.success("Equipamento devolvido.")
        } catch (error) {
            toast.error("Erro na devolução.")
        }
    }

    return (
        <div className="space-y-6">
            {/* Assign Equipment Section */}
            <div className="flex gap-2 items-end p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium leading-none">
                        Atribuir Ferramenta
                    </label>
                    <div className="flex gap-2">
                        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isPopoverOpen}
                                    className="w-full justify-between"
                                >
                                    {selectedToolId
                                        ? availableTools.find((tool) => tool.id === selectedToolId)?.nome
                                        : "Buscar ferramenta..."}
                                    <PackageSearch className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar ferramenta..." />
                                    <CommandEmpty>Nenhuma ferramenta encontrada.</CommandEmpty>
                                    <CommandGroup>
                                        {availableTools.map((tool) => (
                                            <CommandItem
                                                key={tool.id}
                                                value={tool.nome}
                                                onSelect={() => {
                                                    setSelectedToolId(tool.id)
                                                    setIsPopoverOpen(false)
                                                }}
                                            >
                                                <div className="flex items-center">
                                                    <span>{tool.nome}</span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        <Input
                            type="number"
                            min={1}
                            className="w-20"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        />
                    </div>
                </div>
                <Button onClick={handleAssign} disabled={!selectedToolId || isAdding}>
                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
            </div>

            {/* Equipment List */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Em Custódia ({equipment.length})</h4>

                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : equipment.length === 0 ? (
                    <div className="text-center p-8 bg-muted/20 rounded-lg border border-dashed">
                        <PackageSearch className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum equipamento com a equipe.</p>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {equipment.map((item) => (
                            <Card key={item.id} className="overflow-hidden">
                                <CardContent className="p-3 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{item.ferramenta_nome}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-[10px] h-5">
                                                Qtd: {item.quantity}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground">
                                                Desde: {new Date(item.assigned_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 ml-2 gap-1 text-xs"
                                        onClick={() => handleReturn(item.id)}
                                    >
                                        <ArchiveRestore className="h-3.5 w-3.5" />
                                        Devolver
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
