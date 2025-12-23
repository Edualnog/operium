'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import { useOperiumProfile } from '@/lib/hooks/useOperiumProfile'
import { useOperiumEvents, useOperiumVehicles } from '@/lib/hooks/useOperiumEvents'
import {
    Fuel,
    Activity,
    History,
    LogOut,
    Loader2,
    Camera,
    FileText,
    X,
    Check,
    Car,
    Wrench,
    Receipt,
    ParkingCircle,
    Package,
    Clock,
    ChevronRight,
    Plus,
    User
} from 'lucide-react'

// ============================================================================
// NATIVE APP BOTTOM SHEET MODAL
// ============================================================================

function NativeModal({
    open,
    onClose,
    title,
    children
}: {
    open: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
}) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 touch-none">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div className="fixed inset-x-0 bottom-0 animate-in slide-in-from-bottom duration-300">
                <div className="bg-white rounded-t-[20px] shadow-2xl max-h-[85vh] flex flex-col">
                    {/* Handle */}
                    <div className="flex justify-center pt-3 pb-2 touch-none">
                        <div className="w-10 h-1 bg-neutral-300 rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="px-5 pb-3 border-b border-neutral-100">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-neutral-400 hover:text-neutral-600 active:bg-neutral-100 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// ACTION CARD - Native App Style
// ============================================================================

function ActionCard({
    icon: Icon,
    title,
    subtitle,
    onClick,
    color = 'neutral'
}: {
    icon: any
    title: string
    subtitle: string
    onClick: () => void
    color?: 'neutral' | 'blue' | 'green' | 'orange' | 'purple'
}) {
    const colorClasses = {
        neutral: 'bg-neutral-50 text-neutral-700',
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        purple: 'bg-purple-50 text-purple-600'
    }

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-neutral-100
                       active:scale-[0.98] active:bg-neutral-50 transition-all duration-150 shadow-sm"
        >
            <div className={`p-3 rounded-xl ${colorClasses[color]} flex-shrink-0`}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left min-w-0">
                <p className="text-base font-medium text-neutral-900 truncate">{title}</p>
                <p className="text-sm text-neutral-500 truncate mt-0.5">{subtitle}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-300 flex-shrink-0" />
        </button>
    )
}

// ============================================================================
// ACTIVITY CARD
// ============================================================================

function ActivityCard({ event }: { event: any }) {
    const getEventInfo = () => {
        switch (event.type) {
            case 'VEHICLE_EXPENSE':
                return {
                    icon: Fuel,
                    label: 'Despesa registrada',
                    color: 'bg-blue-50 text-blue-600',
                    value: event.metadata?.valor ? `R$ ${event.metadata.valor.toFixed(2)}` : null
                }
            case 'VEHICLE_STATUS':
                return {
                    icon: Car,
                    label: 'Status atualizado',
                    color: 'bg-orange-50 text-orange-600',
                    value: null
                }
            case 'ITEM_IN':
                return {
                    icon: Package,
                    label: 'Item recebido',
                    color: 'bg-green-50 text-green-600',
                    value: null
                }
            case 'ITEM_OUT':
                return {
                    icon: Package,
                    label: 'Item enviado',
                    color: 'bg-red-50 text-red-600',
                    value: null
                }
            default:
                return {
                    icon: Activity,
                    label: 'Atividade',
                    color: 'bg-neutral-50 text-neutral-600',
                    value: null
                }
        }
    }

    const { icon: EventIcon, label, color, value } = getEventInfo()

    return (
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-neutral-100">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                <EventIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900">{label}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                    {new Date(event.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </p>
            </div>
            {value && (
                <span className="text-sm font-semibold text-neutral-700">{value}</span>
            )}
        </div>
    )
}

// ============================================================================
// EXPENSE MODAL - Native App Style
// ============================================================================

function VehicleExpenseModal({
    open,
    onClose,
    onSuccess
}: {
    open: boolean
    onClose: () => void
    onSuccess: () => void
}) {
    const supabase = createClientComponentClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [vehicleId, setVehicleId] = useState('')
    const [tipo, setTipo] = useState<'combustivel' | 'manutencao' | 'pedagio' | 'estacionamento' | 'outros'>('combustivel')
    const [valor, setValor] = useState('')
    const [observacoes, setObservacoes] = useState('')
    const [receiptFile, setReceiptFile] = useState<File | null>(null)
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { vehicles } = useOperiumVehicles()
    const { createVehicleExpense } = useOperiumEvents()

    useEffect(() => {
        if (!open) {
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }, [open])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setReceiptFile(file)
            const reader = new FileReader()
            reader.onloadend = () => setReceiptPreview(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    const removeReceipt = () => {
        setReceiptFile(null)
        setReceiptPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const uploadReceipt = async (): Promise<string | null> => {
        if (!receiptFile) return null
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null
            const fileExt = receiptFile.name.split('.').pop()
            const fileName = `${user.id}/${Date.now()}.${fileExt}`
            const { error: uploadError } = await supabase.storage
                .from('operium-receipts')
                .upload(fileName, receiptFile, { cacheControl: '3600', upsert: false })
            if (uploadError) return null
            const { data: { publicUrl } } = supabase.storage.from('operium-receipts').getPublicUrl(fileName)
            return publicUrl
        } catch {
            return null
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!vehicleId || !valor) return
        setLoading(true)
        setError(null)
        try {
            const receiptUrl = await uploadReceipt()
            await createVehicleExpense({
                vehicle_id: vehicleId,
                tipo,
                valor: parseFloat(valor),
                observacoes: observacoes || undefined,
                receipt_url: receiptUrl || undefined
            })
            onSuccess()
            onClose()
            setVehicleId('')
            setValor('')
            setObservacoes('')
            removeReceipt()
        } catch (err: any) {
            setError(err.message || 'Erro ao registrar')
        } finally {
            setLoading(false)
        }
    }

    const tipos = [
        { v: 'combustivel', icon: Fuel, n: 'Combustível' },
        { v: 'manutencao', icon: Wrench, n: 'Manutenção' },
        { v: 'pedagio', icon: Receipt, n: 'Pedágio' },
        { v: 'estacionamento', icon: ParkingCircle, n: 'Estacionar' },
        { v: 'outros', icon: Package, n: 'Outros' }
    ]

    return (
        <NativeModal open={open} onClose={onClose} title="Nova Despesa">
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Vehicle Select */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Veículo
                    </label>
                    <select
                        value={vehicleId}
                        onChange={(e) => setVehicleId(e.target.value)}
                        required
                        className="w-full h-14 px-4 text-base bg-neutral-50 border border-neutral-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:bg-white
                                   appearance-none font-medium text-neutral-900"
                    >
                        <option value="">Selecione o veículo</option>
                        {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                                {v.plate} {v.model && `- ${v.model}`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Tipo de despesa
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {tipos.map((t) => (
                            <button
                                key={t.v}
                                type="button"
                                onClick={() => setTipo(t.v as any)}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                    tipo === t.v
                                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-lg'
                                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                                }`}
                            >
                                <t.icon className="h-6 w-6" />
                                <span className="text-sm font-medium">{t.n}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Valor
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-neutral-400 font-semibold">
                            R$
                        </span>
                        <input
                            type="number"
                            step="0.01"
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            required
                            placeholder="0,00"
                            className="w-full h-16 pl-14 pr-4 text-3xl font-bold bg-neutral-50 border-2 border-neutral-200
                                       rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:bg-white
                                       text-neutral-900 placeholder:text-neutral-300"
                        />
                    </div>
                </div>

                {/* Receipt Photo */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Comprovante (opcional)
                    </label>
                    {receiptPreview ? (
                        <div className="relative h-40 rounded-xl overflow-hidden border-2 border-neutral-200">
                            <img src={receiptPreview} alt="Comprovante" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={removeReceipt}
                                className="absolute top-3 right-3 p-2 bg-black/70 backdrop-blur-sm rounded-full text-white
                                           active:scale-95 transition-transform"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-32 flex flex-col items-center justify-center gap-3 border-2 border-dashed
                                       border-neutral-300 rounded-xl text-neutral-400 hover:border-neutral-400
                                       active:bg-neutral-50 transition-colors"
                        >
                            <Camera className="h-8 w-8" />
                            <span className="text-sm font-medium">Tirar foto ou anexar</span>
                        </button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Observações
                    </label>
                    <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Adicione uma nota (opcional)"
                        rows={3}
                        className="w-full px-4 py-3 text-base bg-neutral-50 border border-neutral-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:bg-white resize-none
                                   placeholder:text-neutral-400"
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || !vehicleId || !valor}
                    className="w-full h-14 bg-neutral-900 text-white text-base font-semibold rounded-xl
                               disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg shadow-neutral-900/20
                               flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <Check className="h-5 w-5" />
                            <span>Registrar Despesa</span>
                        </>
                    )}
                </button>
            </form>
        </NativeModal>
    )
}

// ============================================================================
// VEHICLE STATUS MODAL
// ============================================================================

function VehicleStatusModal({
    open,
    onClose,
    onSuccess
}: {
    open: boolean
    onClose: () => void
    onSuccess: () => void
}) {
    const [vehicleId, setVehicleId] = useState('')
    const [status, setStatus] = useState<'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'>('ACTIVE')
    const [observacoes, setObservacoes] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { vehicles } = useOperiumVehicles()
    const { createVehicleStatus } = useOperiumEvents()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!vehicleId) return
        setLoading(true)
        setError(null)
        try {
            await createVehicleStatus({
                vehicle_id: vehicleId,
                status,
                observacoes: observacoes || undefined
            })
            onSuccess()
            onClose()
            setVehicleId('')
            setObservacoes('')
        } catch (err: any) {
            setError(err.message || 'Erro ao atualizar status')
        } finally {
            setLoading(false)
        }
    }

    const statusOptions = [
        { v: 'ACTIVE', color: 'bg-green-500', n: 'Em operação', desc: 'Funcionando normalmente' },
        { v: 'MAINTENANCE', color: 'bg-yellow-500', n: 'Manutenção', desc: 'Em reparo ou revisão' },
        { v: 'INACTIVE', color: 'bg-red-500', n: 'Parado', desc: 'Fora de operação' }
    ]

    return (
        <NativeModal open={open} onClose={onClose} title="Status do Veículo">
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Veículo
                    </label>
                    <select
                        value={vehicleId}
                        onChange={(e) => setVehicleId(e.target.value)}
                        required
                        className="w-full h-14 px-4 text-base bg-neutral-50 border border-neutral-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:bg-white
                                   appearance-none font-medium text-neutral-900"
                    >
                        <option value="">Selecione o veículo</option>
                        {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                                {v.plate} {v.model && `- ${v.model}`}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Novo status
                    </label>
                    <div className="space-y-3">
                        {statusOptions.map((s) => (
                            <button
                                key={s.v}
                                type="button"
                                onClick={() => setStatus(s.v as any)}
                                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${
                                    status === s.v
                                        ? 'border-neutral-900 bg-neutral-50'
                                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full ${s.color} flex-shrink-0`} />
                                <div className="flex-1">
                                    <p className="text-base font-semibold text-neutral-900">{s.n}</p>
                                    <p className="text-sm text-neutral-500 mt-0.5">{s.desc}</p>
                                </div>
                                {status === s.v && (
                                    <Check className="h-6 w-6 text-neutral-900 flex-shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Observações
                    </label>
                    <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Detalhes sobre o status..."
                        rows={3}
                        className="w-full px-4 py-3 text-base bg-neutral-50 border border-neutral-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:bg-white resize-none
                                   placeholder:text-neutral-400"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !vehicleId}
                    className="w-full h-14 bg-neutral-900 text-white text-base font-semibold rounded-xl
                               disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg shadow-neutral-900/20
                               flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <Check className="h-5 w-5" />
                            <span>Atualizar Status</span>
                        </>
                    )}
                </button>
            </form>
        </NativeModal>
    )
}

// ============================================================================
// DAILY REPORT MODAL
// ============================================================================

function DailyReportModal({
    open,
    onClose,
    onSuccess
}: {
    open: boolean
    onClose: () => void
    onSuccess: () => void
}) {
    const supabase = createClientComponentClient()

    const [summary, setSummary] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [existingReport, setExistingReport] = useState<any>(null)
    const [checking, setChecking] = useState(false)

    const checkTodayReport = useCallback(async () => {
        setChecking(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const today = new Date().toISOString().split('T')[0]
            const { data } = await supabase
                .from('field_reports')
                .select('*')
                .eq('user_id', user.id)
                .eq('report_date', today)
                .maybeSingle()
            if (data) {
                setExistingReport(data)
                setSummary(data.summary || '')
                setNotes(data.notes || '')
            } else {
                setExistingReport(null)
                setSummary('')
                setNotes('')
            }
        } catch {
            // Ignore
        } finally {
            setChecking(false)
        }
    }, [supabase])

    useEffect(() => {
        if (open) checkTodayReport()
    }, [open, checkTodayReport])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!summary.trim()) return
        setLoading(true)
        setError(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Não autenticado')
            const { data: profile } = await supabase
                .from('operium_profiles')
                .select('org_id')
                .eq('user_id', user.id)
                .eq('active', true)
                .single()
            if (!profile) throw new Error('Perfil não encontrado')
            const today = new Date().toISOString().split('T')[0]

            if (existingReport) {
                await supabase.from('field_reports').update({ summary, notes }).eq('id', existingReport.id)
            } else {
                await supabase.from('field_reports').insert({
                    org_id: profile.org_id,
                    user_id: user.id,
                    report_date: today,
                    summary,
                    notes
                })
            }
            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <NativeModal open={open} onClose={onClose} title="Relatório do Dia">
            {checking ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {existingReport && (
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Check className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-blue-900">Relatório de hoje</p>
                                <p className="text-xs text-blue-600 mt-0.5">Você já preencheu - pode editar abaixo</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Resumo das atividades *
                        </label>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            required
                            placeholder="O que você fez hoje?"
                            rows={4}
                            className="w-full px-4 py-3 text-base bg-neutral-50 border border-neutral-200 rounded-xl
                                       focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:bg-white resize-none
                                       placeholder:text-neutral-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Observações
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Problemas, pendências, sugestões..."
                            rows={3}
                            className="w-full px-4 py-3 text-base bg-neutral-50 border border-neutral-200 rounded-xl
                                       focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:bg-white resize-none
                                       placeholder:text-neutral-400"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !summary.trim()}
                        className="w-full h-14 bg-neutral-900 text-white text-base font-semibold rounded-xl
                                   disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg shadow-neutral-900/20
                                   flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <Check className="h-5 w-5" />
                                <span>{existingReport ? 'Atualizar Relatório' : 'Enviar Relatório'}</span>
                            </>
                        )}
                    </button>
                </form>
            )}
        </NativeModal>
    )
}

// ============================================================================
// TEAM SELECTION SCREEN
// ============================================================================

function TeamSelectionScreen({ onComplete }: { onComplete: () => void }) {
    const supabase = createClientComponentClient()
    const [hasTeam, setHasTeam] = useState<boolean | null>(null)
    const [selectedTeam, setSelectedTeam] = useState('')
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingTeams, setLoadingTeams] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (hasTeam === true) {
            fetchTeams()
        }
    }, [hasTeam])

    const fetchTeams = async () => {
        setLoadingTeams(true)
        try {
            const { data } = await supabase.from('teams').select('id, name').order('name')
            setTeams(data || [])
        } catch (err) {
            console.error('Error fetching teams:', err)
        } finally {
            setLoadingTeams(false)
        }
    }

    const handleComplete = async () => {
        setLoading(true)
        setError(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Não autenticado')

            await supabase
                .from('operium_profiles')
                .update({
                    team_id: hasTeam ? selectedTeam || null : null,
                    onboarding_complete: true
                })
                .eq('user_id', user.id)

            onComplete()
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-900 rounded-2xl mb-2">
                        <User className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-neutral-900">Bem-vindo!</h1>
                    <p className="text-base text-neutral-500">Configure seu perfil para começar</p>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 space-y-5">
                    <div>
                        <p className="text-base font-semibold text-neutral-900 mb-3">
                            Você faz parte de alguma equipe?
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setHasTeam(true)}
                                className={`py-4 text-base font-medium rounded-xl border-2 transition-all ${
                                    hasTeam === true
                                        ? 'bg-neutral-900 text-white border-neutral-900'
                                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                                }`}
                            >
                                Sim
                            </button>
                            <button
                                type="button"
                                onClick={() => setHasTeam(false)}
                                className={`py-4 text-base font-medium rounded-xl border-2 transition-all ${
                                    hasTeam === false
                                        ? 'bg-neutral-900 text-white border-neutral-900'
                                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                                }`}
                            >
                                Não
                            </button>
                        </div>
                    </div>

                    {hasTeam === true && (
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Selecione sua equipe
                            </label>
                            {loadingTeams ? (
                                <div className="h-14 flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                                </div>
                            ) : teams.length === 0 ? (
                                <p className="text-sm text-neutral-400 py-3">Nenhuma equipe cadastrada</p>
                            ) : (
                                <select
                                    value={selectedTeam}
                                    onChange={(e) => setSelectedTeam(e.target.value)}
                                    className="w-full h-14 px-4 text-base bg-neutral-50 border border-neutral-200 rounded-xl
                                               focus:outline-none focus:ring-2 focus:ring-neutral-300 appearance-none
                                               font-medium text-neutral-900"
                                >
                                    <option value="">Selecione...</option>
                                    {teams.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleComplete}
                    disabled={loading || hasTeam === null || (hasTeam === true && !selectedTeam && teams.length > 0)}
                    className="w-full h-14 bg-neutral-900 text-white text-base font-semibold rounded-xl
                               disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg shadow-neutral-900/20
                               flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continuar'}
                </button>
            </div>
        </div>
    )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function AppPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const { loading: loadingProfile, profile: operiumProfile, userName } = useOperiumProfile()
    const { events, loading: loadingEvents, refreshEvents } = useOperiumEvents({ limit: 5 })

    const [showExpenseModal, setShowExpenseModal] = useState(false)
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [showReminder, setShowReminder] = useState(false)
    const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)

    useEffect(() => {
        const checkOnboarding = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('operium_profiles')
                .select('onboarding_complete')
                .eq('user_id', user.id)
                .eq('active', true)
                .maybeSingle()

            setOnboardingComplete(data?.onboarding_complete ?? false)
        }
        if (!loadingProfile) {
            checkOnboarding()
        }
    }, [supabase, loadingProfile])

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour >= 17 && hour < 19) setShowReminder(true)
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleSuccess = () => refreshEvents()

    const handleOnboardingComplete = () => {
        setOnboardingComplete(true)
    }

    if (loadingProfile || onboardingComplete === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
        )
    }

    if (!onboardingComplete) {
        return <TeamSelectionScreen onComplete={handleOnboardingComplete} />
    }

    return (
        <div className="min-h-screen bg-neutral-50">
            {/* Header - iOS Style */}
            <header className="bg-white border-b border-neutral-100 sticky top-0 z-40 backdrop-blur-xl bg-white/80">
                <div className="px-5 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-neutral-900">Operium</h1>
                            <p className="text-sm text-neutral-500 mt-0.5">Equipe de Campo</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-3 text-neutral-400 hover:text-neutral-600 active:bg-neutral-100 rounded-xl
                                       transition-colors"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Reminder Banner */}
            {showReminder && (
                <div className="mx-4 mt-4">
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200
                                    rounded-2xl flex items-center gap-3 shadow-sm">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Clock className="h-5 w-5 text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-purple-900 flex-1">
                            Hora do relatório diário!
                        </p>
                        <button
                            onClick={() => {
                                setShowReminder(false)
                                setShowReportModal(true)
                            }}
                            className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg
                                       active:scale-95 transition-transform"
                        >
                            Fazer
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="px-5 py-6 space-y-8 pb-safe">
                {/* Greeting */}
                <div>
                    <h2 className="text-2xl font-bold text-neutral-900">
                        Olá{userName ? `, ${userName}` : ''}! 👋
                    </h2>
                    <p className="text-base text-neutral-500 mt-1">O que você precisa fazer hoje?</p>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide px-1">
                        Ações Rápidas
                    </h3>
                    <ActionCard
                        icon={Fuel}
                        title="Nova Despesa"
                        subtitle="Registrar combustível ou manutenção"
                        onClick={() => setShowExpenseModal(true)}
                        color="blue"
                    />
                    <ActionCard
                        icon={Car}
                        title="Status do Veículo"
                        subtitle="Atualizar condição atual"
                        onClick={() => setShowStatusModal(true)}
                        color="orange"
                    />
                    <ActionCard
                        icon={FileText}
                        title="Relatório do Dia"
                        subtitle="Resumo das atividades realizadas"
                        onClick={() => setShowReportModal(true)}
                        color="purple"
                    />
                </div>

                {/* Recent Activity */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <History className="h-4 w-4 text-neutral-400" />
                        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                            Atividade Recente
                        </h3>
                    </div>
                    {loadingEvents ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-12">
                            <Activity className="h-12 w-12 text-neutral-200 mx-auto mb-3" />
                            <p className="text-sm text-neutral-400">Nenhuma atividade registrada</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {events.map((event) => (
                                <ActivityCard key={event.id} event={event} />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            <VehicleExpenseModal
                open={showExpenseModal}
                onClose={() => setShowExpenseModal(false)}
                onSuccess={handleSuccess}
            />
            <VehicleStatusModal
                open={showStatusModal}
                onClose={() => setShowStatusModal(false)}
                onSuccess={handleSuccess}
            />
            <DailyReportModal
                open={showReportModal}
                onClose={() => setShowReportModal(false)}
                onSuccess={handleSuccess}
            />
        </div>
    )
}
