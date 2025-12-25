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
import { Loader2, Package, Calendar, Wrench } from 'lucide-react'
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

    const selectAll = () => {
        if (selectedIds.size === pendingTools.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(pendingTools.map(t => t.movimentacao_id)))
        }
    }

    const handleReturn = async () => {
        if (selectedIds.size === 0) return

        setLoading(true)
        try {
            const { registrarDevolucao } = await import('@/lib/actions')

            const selectedTools = pendingTools.filter(tool =>
                selectedIds.has(tool.movimentacao_id)
            )

            for (const tool of selectedTools) {
                await registrarDevolucao(
                    tool.item_id,
                    colaboradorId,
                    tool.quantity,
                    'Devolução via quick return'
                )
            }

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
            <DialogContent className="max-w-[95vw] sm:max-w-md md:max-w-lg p-0 gap-0 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                {/* Header - Notion style */}
                <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <DialogTitle className="text-base sm:text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                        Devolução de Ferramentas
                    </DialogTitle>
                    <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Itens em custódia de <span className="font-medium text-zinc-700 dark:text-zinc-300">{colaboradorName}</span>
                    </DialogDescription>
                </DialogHeader>

                {/* Content */}
                <div className="px-4 sm:px-6 py-4">
                    {pendingTools.length === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                                <Package className="h-6 w-6 sm:h-7 sm:w-7 text-zinc-400" />
                            </div>
                            <p className="text-sm text-zinc-500">Nenhuma ferramenta em custódia</p>
                        </div>
                    ) : (
                        <>
                            {/* Select All */}
                            <button
                                onClick={selectAll}
                                className="w-full flex items-center gap-2 px-3 py-2 mb-3 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                            >
                                <Checkbox
                                    checked={selectedIds.size === pendingTools.length}
                                    className="h-4 w-4 border-zinc-300 dark:border-zinc-600"
                                />
                                <span>Selecionar todos ({pendingTools.length})</span>
                            </button>

                            {/* Tools List */}
                            <div className="space-y-2 max-h-[280px] sm:max-h-[350px] overflow-y-auto">
                                {pendingTools.map((tool) => (
                                    <button
                                        key={tool.movimentacao_id}
                                        onClick={() => toggleSelection(tool.movimentacao_id)}
                                        className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${selectedIds.has(tool.movimentacao_id)
                                                ? 'border-zinc-400 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800'
                                                : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600'
                                            }`}
                                    >
                                        <Checkbox
                                            checked={selectedIds.has(tool.movimentacao_id)}
                                            className="mt-0.5 h-4 w-4 border-zinc-300 dark:border-zinc-600"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Wrench className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                                                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                                    {tool.item_name}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(tool.saida_at).toLocaleDateString('pt-BR')}
                                                </span>
                                                {tool.quantity > 1 && (
                                                    <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">
                                                        Qtd: {tool.quantity}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        className="order-2 sm:order-1 flex-1 h-10 sm:h-9 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleReturn}
                        disabled={loading || selectedIds.size === 0}
                        className="order-1 sm:order-2 flex-1 h-10 sm:h-9 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                Registrar Devolução ({selectedIds.size})
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
