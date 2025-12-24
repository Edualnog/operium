'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createClientComponentClient } from '@/lib/supabase-client'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Package, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface PendingTool {
    movimentacao_id: string
    item_id: string
    item_name: string
    quantity: number
    saida_at: string
}

interface QuickReturnModalProps {
    open: boolean
    onClose: () => void
    colaboradorId: string
    colaboradorName: string
    pendingTools: PendingTool[]
    onSuccess: () => void
}

export function QuickReturnModal({
    open,
    onClose,
    colaboradorId,
    colaboradorName,
    pendingTools,
    onSuccess
}: QuickReturnModalProps) {
    const { t } = useTranslation('common')
    const supabase = createClientComponentClient()
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)

    const toggleSelection = (movimentacaoId: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(movimentacaoId)) {
            newSet.delete(movimentacaoId)
        } else {
            newSet.add(movimentacaoId)
        }
        setSelectedIds(newSet)
    }

    const handleReturn = async () => {
        if (selectedIds.size === 0) return

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Update each selected movimentacao with retorno_at
            const updates = Array.from(selectedIds).map(async (movId) => {
                return supabase
                    .from('movimentacoes')
                    .update({
                        retorno_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', movId)
                    .eq('colaborador_id', colaboradorId) // Safety check
                    .is('retorno_at', null) // Only update if not already returned
            })

            await Promise.all(updates)

            toast.success(t('colaboradores.return_success'))
            setSelectedIds(new Set())
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error returning tools:', error)
            toast.error(t('colaboradores.return_error'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('colaboradores.quick_return')}</DialogTitle>
                    <DialogDescription>
                        {t('colaboradores.tools_in_possession')}: <strong>{colaboradorName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {pendingTools.length === 0 ? (
                        <div className="text-center py-8 text-neutral-500">
                            <Package className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
                            <p>{t('colaboradores.no_pending')}</p>
                        </div>
                    ) : (
                        pendingTools.map((tool) => (
                            <div
                                key={tool.movimentacao_id}
                                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-neutral-50 transition-colors"
                            >
                                <Checkbox
                                    checked={selectedIds.has(tool.movimentacao_id)}
                                    onCheckedChange={() => toggleSelection(tool.movimentacao_id)}
                                    className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-neutral-900">
                                        {tool.item_name}
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>
                                            {t('colaboradores.withdrawn_on')}: {new Date(tool.saida_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {tool.quantity > 1 && (
                                        <p className="text-sm text-neutral-600 mt-1">
                                            Qtd: {tool.quantity}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleReturn}
                        className="flex-1"
                        disabled={loading || selectedIds.size === 0}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                {t('colaboradores.return_selected')} ({selectedIds.size})
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
