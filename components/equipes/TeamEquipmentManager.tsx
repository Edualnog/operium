"use client"

import { useState, useEffect, useCallback } from "react"
import { TeamEquipment, EquipmentStatus } from "@/app/dashboard/equipes/types"
import { getTeamEquipment, assignEquipment, returnEquipment, returnEquipmentWithDiscrepancy, endTeamOperation, DiscrepancyType, adminValidateReturn } from "@/app/dashboard/equipes/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ArchiveRestore, PackageSearch, Loader2, AlertTriangle, CheckCircle2, XCircle, Power, Clock, CheckCheck } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

interface TeamEquipmentManagerProps {
    teamId: string
}

export default function TeamEquipmentManager({ teamId }: TeamEquipmentManagerProps) {
    const { t } = useTranslation()
    const [equipment, setEquipment] = useState<TeamEquipment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [availableTools, setAvailableTools] = useState<{ id: string, nome: string }[]>([])
    const [isAdding, setIsAdding] = useState(false)
    const [isPopoverOpen, setIsPopoverOpen] = useState(false)

    // Form for new assignment
    const [selectedToolId, setSelectedToolId] = useState("")
    const [quantity, setQuantity] = useState(1)

    // End operation state
    const [isEndOperationOpen, setIsEndOperationOpen] = useState(false)
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
    const [isEndingOperation, setIsEndingOperation] = useState(false)

    // Discrepancy state
    const [discrepancyItem, setDiscrepancyItem] = useState<TeamEquipment | null>(null)
    const [discrepancyType, setDiscrepancyType] = useState<DiscrepancyType>("damage")
    const [discrepancyNotes, setDiscrepancyNotes] = useState("")
    const [discrepancyQty, setDiscrepancyQty] = useState(0)
    const [isRegisteringDiscrepancy, setIsRegisteringDiscrepancy] = useState(false)

    const supabase = createClientComponentClient()

    const fetchEquipment = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await getTeamEquipment(teamId)
            // Filter active equipment (not returned)
            const activeEquipment = data.filter(e => !e.returned_at)
            setEquipment(activeEquipment)
        } catch (error) {
            console.error(error)
            toast.error(t('teams.equipment.toast.error_load'))
        } finally {
            setIsLoading(false)
        }
    }, [teamId, t])

    const fetchAvailableTools = useCallback(async () => {
        // Get current user for security filtering
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('ferramentas')
            .select('id, nome, estado')
            .eq('profile_id', user.id)  // Security: Filter by user
            .order('nome')
            .limit(100)

        if (error) {
            console.error("Error fetching ferramentas:", error)
            return
        }

        // Filter out only explicitly bad states (damaged, in repair, etc)
        const blockedStates = ['manutenção', 'danificada', 'em_conserto', 'perdida']
        const availableTools = data?.filter(t => !t.estado || !blockedStates.includes(t.estado.toLowerCase())) || []
        setAvailableTools(availableTools)
    }, [supabase])

    useEffect(() => {
        fetchEquipment()
        fetchAvailableTools()
    }, [fetchEquipment, fetchAvailableTools])

    const handleAssign = async () => {
        if (!selectedToolId) return
        setIsAdding(true)
        try {
            await assignEquipment(teamId, selectedToolId, quantity)
            await fetchEquipment()
            setSelectedToolId("")
            setQuantity(1)
            setIsPopoverOpen(false)
            toast.success(t('teams.equipment.toast.assigned'))
        } catch (error: any) {
            toast.error(error.message || t('teams.equipment.toast.error_assign'))
        } finally {
            setIsAdding(false)
        }
    }

    const handleReturn = async (assignmentId: string) => {
        try {
            await returnEquipment(assignmentId)
            await fetchEquipment()
            toast.success(t('teams.equipment.toast.returned'))
        } catch (error) {
            toast.error(t('teams.equipment.toast.error_return'))
        }
    }

    const handleEndOperation = async () => {
        if (selectedItems.size === 0) return
        setIsEndingOperation(true)
        try {
            const result = await endTeamOperation(teamId, Array.from(selectedItems))
            await fetchEquipment()
            setIsEndOperationOpen(false)
            setSelectedItems(new Set())

            if (result.failed === 0) {
                toast.success(t('teams.equipment.toast.all_returned'))
            } else {
                toast.warning(`${result.success} devolvidos, ${result.failed} com erro`)
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsEndingOperation(false)
        }
    }

    const handleDiscrepancy = async () => {
        if (!discrepancyItem) return
        setIsRegisteringDiscrepancy(true)
        try {
            await returnEquipmentWithDiscrepancy(discrepancyItem.id, {
                type: discrepancyType,
                notes: discrepancyNotes,
                quantityReturned: discrepancyType === 'shortage' ? discrepancyQty : undefined
            })
            await fetchEquipment()
            setDiscrepancyItem(null)
            setDiscrepancyNotes("")
            setDiscrepancyQty(0)
            toast.success(t('teams.equipment.toast.discrepancy_registered'))
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsRegisteringDiscrepancy(false)
        }
    }

    const toggleSelectAll = () => {
        if (selectedItems.size === equipment.length) {
            setSelectedItems(new Set())
        } else {
            setSelectedItems(new Set(equipment.map(e => e.id)))
        }
    }

    const toggleItem = (id: string) => {
        const newSet = new Set(selectedItems)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedItems(newSet)
    }

    return (
        <div className="space-y-6">
            {/* Assign Equipment Section */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                    {t('teams.equipment.assign_title')}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex gap-2 flex-1 min-w-0">
                        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isPopoverOpen}
                                    className="flex-1 justify-between bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm truncate"
                                >
                                    <span className="truncate">
                                        {selectedToolId
                                            ? availableTools.find((tool) => tool.id === selectedToolId)?.nome
                                            : t('teams.equipment.search_placeholder')}
                                    </span>
                                    <PackageSearch className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] sm:w-[340px] p-0 border-zinc-200 dark:border-zinc-700">
                                <Command>
                                    <CommandInput placeholder={t('teams.equipment.search_placeholder')} />
                                    <CommandEmpty>{t('teams.equipment.not_found')}</CommandEmpty>
                                    <CommandGroup className="max-h-[200px] overflow-y-auto">
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
                                                    <span className="text-sm">{tool.nome}</span>
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
                            className="w-14 sm:w-16 shrink-0 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus-visible:ring-zinc-400 text-center"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        />
                    </div>

                    <Button onClick={handleAssign} disabled={!selectedToolId || isAdding} className="shrink-0 bg-[#37352f] hover:bg-[#2f2e29] dark:bg-zinc-700 dark:hover:bg-zinc-600 h-10 sm:h-auto">
                        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Equipment List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                        {t('teams.equipment.custody_title')} ({equipment.length})
                    </h4>
                    {equipment.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            onClick={() => {
                                setSelectedItems(new Set(equipment.map(e => e.id)))
                                setIsEndOperationOpen(true)
                            }}
                        >
                            <Power className="h-3.5 w-3.5" />
                            {t('teams.equipment.end_operation')}
                        </Button>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : equipment.length === 0 ? (
                    <div className="text-center p-8 bg-muted/20 rounded-lg border border-dashed">
                        <PackageSearch className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">{t('teams.equipment.empty')}</p>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {equipment.map((item) => {
                            // Status badge helper
                            const getStatusBadge = (status: EquipmentStatus | undefined) => {
                                switch (status) {
                                    case 'pending_acceptance':
                                        return <Badge variant="outline" className="text-[10px] h-5 border-zinc-400 bg-zinc-100 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"><Clock className="h-2.5 w-2.5 mr-1" />Pendente</Badge>
                                    case 'pending_return':
                                        return <Badge variant="outline" className="text-[10px] h-5 border-zinc-400 bg-zinc-100 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"><ArchiveRestore className="h-2.5 w-2.5 mr-1" />Devolução</Badge>
                                    case 'accepted':
                                    case 'in_use':
                                        return <Badge variant="outline" className="text-[10px] h-5 border-[#37352f] bg-[#37352f]/10 text-[#37352f] dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-200"><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Em uso</Badge>
                                    default:
                                        return null
                                }
                            }

                            const handleValidateReturn = async () => {
                                try {
                                    await adminValidateReturn([item.id])
                                    await fetchEquipment()
                                    toast.success(t('teams.equipment.toast.validated'))
                                } catch (error: any) {
                                    toast.error(error.message || t('teams.equipment.toast.error_validate'))
                                }
                            }

                            return (
                                <Card key={item.id} className="overflow-hidden">
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{item.ferramenta_nome}</span>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <Badge variant="outline" className="text-[10px] h-5">
                                                    {t('teams.equipment.qty')}: {item.quantity}
                                                </Badge>
                                                {getStatusBadge(item.status)}
                                                <span className="text-[10px] text-muted-foreground">
                                                    {t('teams.equipment.since')}: {new Date(item.assigned_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {item.status === 'pending_return' ? (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="h-8 gap-1 text-xs bg-[#37352f] hover:bg-[#2f2e29] dark:bg-zinc-700 dark:hover:bg-zinc-600"
                                                    onClick={handleValidateReturn}
                                                >
                                                    <CheckCheck className="h-3.5 w-3.5" />
                                                    Validar
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-300 dark:hover:bg-zinc-800"
                                                        onClick={() => {
                                                            setDiscrepancyItem(item)
                                                            setDiscrepancyQty(item.quantity)
                                                        }}
                                                        title={t('teams.equipment.discrepancy.title')}
                                                    >
                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 ml-1 gap-1 text-xs"
                                                        onClick={() => handleReturn(item.id)}
                                                    >
                                                        <ArchiveRestore className="h-3.5 w-3.5" />
                                                        {t('teams.equipment.return')}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* End Operation Dialog */}
            <Dialog open={isEndOperationOpen} onOpenChange={setIsEndOperationOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Power className="h-5 w-5 text-amber-600" />
                            {t('teams.equipment.end_operation_title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('teams.equipment.end_operation_desc')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <Label className="text-sm font-medium">{t('teams.equipment.checklist_title')}</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={toggleSelectAll}
                            >
                                {selectedItems.size === equipment.length ? (
                                    <><XCircle className="h-3.5 w-3.5 mr-1" /> Desmarcar</>
                                ) : (
                                    <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t('teams.equipment.all_items')}</>
                                )}
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {equipment.map((item) => (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                                        selectedItems.has(item.id)
                                            ? "bg-[#37352f]/10 border-[#37352f]/30 dark:bg-zinc-700 dark:border-zinc-600"
                                            : "bg-zinc-50 border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700"
                                    )}
                                    onClick={() => toggleItem(item.id)}
                                >
                                    <Checkbox
                                        checked={selectedItems.has(item.id)}
                                        onCheckedChange={() => toggleItem(item.id)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{item.ferramenta_nome}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {t('teams.equipment.qty')}: {item.quantity}
                                        </p>
                                    </div>
                                    {selectedItems.has(item.id) && (
                                        <CheckCircle2 className="h-4 w-4 text-[#37352f] dark:text-zinc-300 shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEndOperationOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleEndOperation}
                            disabled={selectedItems.size === 0 || isEndingOperation}
                            className="bg-[#37352f] hover:bg-[#2f2e29] dark:bg-zinc-700 dark:hover:bg-zinc-600"
                        >
                            {isEndingOperation ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            {t('teams.equipment.confirm_return')} ({selectedItems.size})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Discrepancy Dialog */}
            <Dialog open={!!discrepancyItem} onOpenChange={(open) => !open && setDiscrepancyItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            {t('teams.equipment.discrepancy.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {discrepancyItem?.ferramenta_nome}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t('teams.equipment.discrepancy.type')}</Label>
                            <Select value={discrepancyType} onValueChange={(v) => setDiscrepancyType(v as DiscrepancyType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="loss">{t('teams.equipment.discrepancy.loss')}</SelectItem>
                                    <SelectItem value="damage">{t('teams.equipment.discrepancy.damage')}</SelectItem>
                                    <SelectItem value="shortage">{t('teams.equipment.discrepancy.shortage')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {discrepancyType === 'shortage' && (
                            <div className="space-y-2">
                                <Label>{t('teams.equipment.discrepancy.quantity_returned')}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={discrepancyItem?.quantity || 0}
                                    value={discrepancyQty}
                                    onChange={(e) => setDiscrepancyQty(parseInt(e.target.value) || 0)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Original: {discrepancyItem?.quantity}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>{t('teams.equipment.discrepancy.notes')}</Label>
                            <Textarea
                                placeholder={t('teams.equipment.discrepancy.notes_placeholder')}
                                value={discrepancyNotes}
                                onChange={(e) => setDiscrepancyNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDiscrepancyItem(null)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDiscrepancy}
                            disabled={!discrepancyNotes.trim() || isRegisteringDiscrepancy}
                            className="bg-[#37352f] hover:bg-[#2f2e29] dark:bg-zinc-700 dark:hover:bg-zinc-600"
                        >
                            {isRegisteringDiscrepancy ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <AlertTriangle className="h-4 w-4 mr-2" />
                            )}
                            {t('teams.equipment.discrepancy.register')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
