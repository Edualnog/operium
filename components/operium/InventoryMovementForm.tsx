"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Loader2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import { useOperiumEvents, useOperiumInventory } from "@/lib/hooks/useOperiumEvents"
import { CreateItemMovementInput } from "@/lib/types/operium"
import { useToast } from "@/components/ui/toast-context"

interface InventoryMovementFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultType?: 'ITEM_IN' | 'ITEM_OUT'
    onSuccess?: () => void
}

export function InventoryMovementForm({
    open,
    onOpenChange,
    defaultType = 'ITEM_IN',
    onSuccess
}: InventoryMovementFormProps) {
    const [loading, setLoading] = useState(false)
    const { createItemMovement } = useOperiumEvents()
    const { items, loading: loadingItems } = useOperiumInventory()
    const { toast } = useToast()

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateItemMovementInput>({
        defaultValues: {
            item_id: '',
            type: defaultType,
            quantidade: 1,
            colaborador_id: '',
            fornecedor: '',
            observacoes: '',
        }
    })

    const selectedType = watch('type')

    const onSubmit = async (data: CreateItemMovementInput) => {
        try {
            setLoading(true)
            await createItemMovement(data)
            toast.success(`Movimentação de ${data.quantidade} unidade(s) registrada com sucesso`)
            reset()
            onOpenChange(false)
            onSuccess?.()
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Não foi possível registrar a movimentação")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-zinc-900 dark:text-zinc-100">
                        Registrar Movimentação
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        Registre entrada ou saída de itens do almoxarifado.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Tipo de Movimentação */}
                    <div className="space-y-2">
                        <Label className="text-zinc-700 dark:text-zinc-300">Tipo *</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setValue('type', 'ITEM_IN')}
                                className={`
                  flex items-center justify-center gap-2 p-3 rounded-lg border transition-all
                  ${selectedType === 'ITEM_IN'
                                        ? 'border-green-500 bg-green-50 dark:border-green-400 dark:bg-green-900/20'
                                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'}
                `}
                            >
                                <ArrowDownToLine className={`h-5 w-5 ${selectedType === 'ITEM_IN' ? 'text-green-600 dark:text-green-400' : 'text-zinc-500'}`} />
                                <span className={`font-medium ${selectedType === 'ITEM_IN' ? 'text-green-700 dark:text-green-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                    Entrada
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue('type', 'ITEM_OUT')}
                                className={`
                  flex items-center justify-center gap-2 p-3 rounded-lg border transition-all
                  ${selectedType === 'ITEM_OUT'
                                        ? 'border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-900/20'
                                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'}
                `}
                            >
                                <ArrowUpFromLine className={`h-5 w-5 ${selectedType === 'ITEM_OUT' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500'}`} />
                                <span className={`font-medium ${selectedType === 'ITEM_OUT' ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                    Saída
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Item */}
                    <div className="space-y-2">
                        <Label htmlFor="item_id" className="text-zinc-700 dark:text-zinc-300">
                            Item *
                        </Label>
                        <Select
                            disabled={loadingItems}
                            onValueChange={(value) => setValue('item_id', value)}
                        >
                            <SelectTrigger className="w-full bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                                <SelectValue placeholder={loadingItems ? "Carregando..." : "Selecione o item"} />
                            </SelectTrigger>
                            <SelectContent>
                                {items.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.name} (Qtd: {item.quantity})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Quantidade */}
                    <div className="space-y-2">
                        <Label htmlFor="quantidade" className="text-zinc-700 dark:text-zinc-300">
                            Quantidade *
                        </Label>
                        <Input
                            id="quantidade"
                            type="number"
                            min="1"
                            placeholder="1"
                            className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                            {...register('quantidade', { required: true, min: 1, valueAsNumber: true })}
                        />
                        {errors.quantidade && (
                            <span className="text-xs text-red-500">Informe uma quantidade válida</span>
                        )}
                    </div>

                    {/* Fornecedor (apenas para entrada) */}
                    {selectedType === 'ITEM_IN' && (
                        <div className="space-y-2">
                            <Label htmlFor="fornecedor" className="text-zinc-700 dark:text-zinc-300">
                                Fornecedor
                            </Label>
                            <Input
                                id="fornecedor"
                                placeholder="Nome do fornecedor"
                                className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                                {...register('fornecedor')}
                            />
                        </div>
                    )}

                    {/* Observações */}
                    <div className="space-y-2">
                        <Label htmlFor="observacoes" className="text-zinc-700 dark:text-zinc-300">
                            Observações
                        </Label>
                        <Textarea
                            id="observacoes"
                            placeholder={selectedType === 'ITEM_IN' ? "Número da NF, detalhes..." : "Destino, motivo da saída..."}
                            className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 min-h-[80px]"
                            {...register('observacoes')}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar {selectedType === 'ITEM_IN' ? 'Entrada' : 'Saída'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
