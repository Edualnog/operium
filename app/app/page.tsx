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
    ChevronRight,
    Loader2,
    Camera,
    FileText,
    X,
    Check
} from 'lucide-react'

// ============================================================================
// SHARED COMPONENTS
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
    const colors = {
        neutral: 'bg-neutral-100 text-neutral-600',
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        purple: 'bg-purple-50 text-purple-600'
    }

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 p-3 bg-white border border-neutral-200 rounded-lg 
                       hover:border-neutral-300 active:bg-neutral-50 transition-all touch-manipulation"
        >
            <div className={`p-2 rounded-md ${colors[color]}`}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">{title}</p>
                <p className="text-xs text-neutral-500 truncate">{subtitle}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-300 flex-shrink-0" />
        </button>
    )
}

function Modal({
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
        <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black/40" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-xl max-h-[85vh] overflow-hidden flex flex-col safe-bottom">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 flex-shrink-0">
                    <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
                    <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {children}
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// EXPENSE MODAL - Compact Design
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
        } catch { return null }
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
        { v: 'combustivel', l: '⛽', n: 'Combustível' },
        { v: 'manutencao', l: '🔧', n: 'Manutenção' },
        { v: 'pedagio', l: '🛣️', n: 'Pedágio' },
        { v: 'estacionamento', l: '🅿️', n: 'Estac.' },
        { v: 'outros', l: '📦', n: 'Outros' }
    ]

    return (
        <Modal open={open} onClose={onClose} title="Nova Despesa">
            <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Veículo</label>
                    <select
                        value={vehicleId}
                        onChange={(e) => setVehicleId(e.target.value)}
                        required
                        className="w-full h-10 px-3 text-sm bg-neutral-50 border border-neutral-200 rounded-md
                                   focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:bg-white"
                    >
                        <option value="">Selecione...</option>
                        {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>{v.plate} {v.model && `- ${v.model}`}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Tipo</label>
                    <div className="flex flex-wrap gap-1.5">
                        {tipos.map((t) => (
                            <button
                                key={t.v}
                                type="button"
                                onClick={() => setTipo(t.v as any)}
                                className={`px-2.5 py-1.5 text-xs rounded-md border transition-all flex items-center gap-1 ${tipo === t.v
                                        ? 'bg-neutral-800 text-white border-neutral-800'
                                        : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                                    }`}
                            >
                                <span>{t.l}</span>
                                <span>{t.n}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Valor (R$)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        required
                        placeholder="0,00"
                        className="w-full h-10 px-3 text-sm bg-neutral-50 border border-neutral-200 rounded-md
                                   focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:bg-white"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Nota Fiscal</label>
                    {receiptPreview ? (
                        <div className="relative h-16 rounded-md overflow-hidden border border-neutral-200">
                            <img src={receiptPreview} alt="NF" className="w-full h-full object-cover" />
                            <button type="button" onClick={removeReceipt}
                                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white">
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => fileInputRef.current?.click()}
                            className="w-full h-16 flex items-center justify-center gap-2 border border-dashed
                                       border-neutral-300 rounded-md text-neutral-400 text-xs hover:border-neutral-400">
                            <Camera className="h-4 w-4" />
                            <span>Tirar foto</span>
                        </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                        onChange={handleFileChange} className="hidden" />
                </div>

                <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Observações</label>
                    <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Opcional..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-md
                                   focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:bg-white resize-none"
                    />
                </div>

                <button type="submit" disabled={loading || !vehicleId || !valor}
                    className="w-full h-10 bg-neutral-800 text-white text-sm font-medium rounded-md
                               disabled:opacity-50 active:bg-neutral-700">
                    {loading ? 'Salvando...' : 'Registrar'}
                </button>
            </form>
        </Modal>
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
        { v: 'ACTIVE', l: '🟢', n: 'Ativo' },
        { v: 'MAINTENANCE', l: '🟡', n: 'Manutenção' },
        { v: 'INACTIVE', l: '🔴', n: 'Inativo' }
    ]

    return (
        <Modal open={open} onClose={onClose} title="Status do Veículo">
            <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Veículo</label>
                    <select
                        value={vehicleId}
                        onChange={(e) => setVehicleId(e.target.value)}
                        required
                        className="w-full h-10 px-3 text-sm bg-neutral-50 border border-neutral-200 rounded-md
                                   focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:bg-white"
                    >
                        <option value="">Selecione...</option>
                        {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>{v.plate} {v.model && `- ${v.model}`}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Status</label>
                    <div className="flex gap-2">
                        {statusOptions.map((s) => (
                            <button
                                key={s.v}
                                type="button"
                                onClick={() => setStatus(s.v as any)}
                                className={`flex-1 py-2 text-xs rounded-md border transition-all flex items-center justify-center gap-1 ${status === s.v
                                        ? 'bg-neutral-800 text-white border-neutral-800'
                                        : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                                    }`}
                            >
                                <span>{s.l}</span>
                                <span>{s.n}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Observações</label>
                    <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Detalhes sobre o status..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-md
                                   focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:bg-white resize-none"
                    />
                </div>

                <button type="submit" disabled={loading || !vehicleId}
                    className="w-full h-10 bg-neutral-800 text-white text-sm font-medium rounded-md
                               disabled:opacity-50 active:bg-neutral-700">
                    {loading ? 'Salvando...' : 'Atualizar'}
                </button>
            </form>
        </Modal>
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
            // Ignore errors
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
        <Modal open={open} onClose={onClose} title="Relatório do Dia">
            {checking ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                    {error && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-xs text-red-600">{error}</p>
                        </div>
                    )}

                    {existingReport && (
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
                            <Check className="h-4 w-4 text-blue-600" />
                            <p className="text-xs text-blue-600">Relatório de hoje já preenchido</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                            Resumo das atividades *
                        </label>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            required
                            placeholder="O que você fez hoje?"
                            rows={3}
                            className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-md
                                       focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:bg-white resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Observações</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Problemas, pendências..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-md
                                       focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:bg-white resize-none"
                        />
                    </div>

                    <button type="submit" disabled={loading || !summary.trim()}
                        className="w-full h-10 bg-neutral-800 text-white text-sm font-medium rounded-md
                                   disabled:opacity-50 active:bg-neutral-700">
                        {loading ? 'Salvando...' : existingReport ? 'Atualizar' : 'Enviar'}
                    </button>
                </form>
            )}
        </Modal>
    )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function AppPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const { loading: loadingProfile } = useOperiumProfile()
    const { events, loading: loadingEvents, refreshEvents } = useOperiumEvents({ limit: 5 })

    const [showExpenseModal, setShowExpenseModal] = useState(false)
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [showReminder, setShowReminder] = useState(false)

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour >= 17 && hour < 19) setShowReminder(true)
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleSuccess = () => refreshEvents()

    if (loadingProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FBFBFA]">
            {/* Header */}
            <header className="bg-white border-b border-neutral-100 px-4 py-2.5 sticky top-0 z-40">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-base font-semibold text-neutral-900">Operium</h1>
                        <p className="text-[11px] text-neutral-400">Equipe de Campo</p>
                    </div>
                    <button onClick={handleLogout}
                        className="p-2 text-neutral-400 hover:text-neutral-600 active:bg-neutral-100 rounded-md">
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </header>

            {/* Reminder */}
            {showReminder && (
                <div className="mx-3 mt-3 p-2.5 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <p className="text-xs text-purple-700 flex-1">Hora do relatório diário!</p>
                    <button onClick={() => { setShowReminder(false); setShowReportModal(true) }}
                        className="text-[11px] font-medium text-purple-700 px-2 py-1 bg-purple-100 rounded active:bg-purple-200">
                        Fazer
                    </button>
                </div>
            )}

            {/* Content */}
            <main className="p-3 space-y-4">
                <div>
                    <h2 className="text-lg font-medium text-neutral-800">Olá! 👋</h2>
                    <p className="text-xs text-neutral-500">O que você precisa fazer hoje?</p>
                </div>

                <div className="space-y-2">
                    <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Ações</p>
                    <ActionCard icon={Fuel} title="Nova Despesa" subtitle="Registrar gasto"
                        onClick={() => setShowExpenseModal(true)} color="blue" />
                    <ActionCard icon={Activity} title="Status Veículo" subtitle="Atualizar condição"
                        onClick={() => setShowStatusModal(true)} color="orange" />
                    <ActionCard icon={FileText} title="Relatório do Dia" subtitle="Resumo das atividades"
                        onClick={() => setShowReportModal(true)} color="purple" />
                </div>

                <div className="space-y-2">
                    <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                        <History className="h-3 w-3" /> Atividade
                    </p>
                    {loadingEvents ? (
                        <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin text-neutral-300 mx-auto" /></div>
                    ) : events.length === 0 ? (
                        <p className="text-xs text-neutral-400 text-center py-4">Nenhuma atividade</p>
                    ) : (
                        <div className="space-y-1.5">
                            {events.slice(0, 5).map((event) => (
                                <div key={event.id} className="p-2.5 bg-white border border-neutral-100 rounded-lg">
                                    <p className="text-xs text-neutral-700">
                                        {event.type === 'VEHICLE_EXPENSE' && '💰 Despesa'}
                                        {event.type === 'VEHICLE_STATUS' && '🚗 Status'}
                                        {event.type === 'ITEM_IN' && '📥 Entrada'}
                                        {event.type === 'ITEM_OUT' && '📤 Saída'}
                                    </p>
                                    <p className="text-[10px] text-neutral-400 mt-0.5">
                                        {new Date(event.created_at).toLocaleDateString('pt-BR', {
                                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            <VehicleExpenseModal open={showExpenseModal} onClose={() => setShowExpenseModal(false)} onSuccess={handleSuccess} />
            <VehicleStatusModal open={showStatusModal} onClose={() => setShowStatusModal(false)} onSuccess={handleSuccess} />
            <DailyReportModal open={showReportModal} onClose={() => setShowReportModal(false)} onSuccess={handleSuccess} />
        </div>
    )
}
