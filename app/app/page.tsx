'use client'

import { useState, useEffect, useRef } from 'react'
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
    X
} from 'lucide-react'

// Notion-style action card
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
            className="w-full flex items-center gap-4 p-4 bg-white border border-neutral-200 rounded-xl 
                       hover:border-neutral-300 active:bg-neutral-50 transition-all touch-manipulation"
        >
            <div className={`p-3 rounded-lg ${colors[color]}`}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
                <p className="text-sm font-medium text-neutral-800">{title}</p>
                <p className="text-xs text-neutral-500">{subtitle}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400" />
        </button>
    )
}

// Modal container
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between z-10">
                    <h2 className="text-base font-medium text-neutral-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-neutral-600 p-2"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    )
}

// Vehicle Expense Form with Photo Upload
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
            reader.onloadend = () => {
                setReceiptPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const removeReceipt = () => {
        setReceiptFile(null)
        setReceiptPreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
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
                .upload(fileName, receiptFile, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                return null
            }

            const { data: { publicUrl } } = supabase.storage
                .from('operium-receipts')
                .getPublicUrl(fileName)

            return publicUrl
        } catch (err) {
            console.error('Upload failed:', err)
            return null
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!vehicleId || !valor) return

        setLoading(true)
        setError(null)

        try {
            // Upload receipt if present
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
            // Reset form
            setVehicleId('')
            setValor('')
            setObservacoes('')
            removeReceipt()
        } catch (err: any) {
            setError(err.message || 'Erro ao registrar despesa')
        } finally {
            setLoading(false)
        }
    }

    const tipoOptions = [
        { value: 'combustivel', label: '⛽ Combustível' },
        { value: 'manutencao', label: '🔧 Manutenção' },
        { value: 'pedagio', label: '🛣️ Pedágio' },
        { value: 'estacionamento', label: '🅿️ Estac.' },
        { value: 'outros', label: '📦 Outros' }
    ]

    return (
        <Modal open={open} onClose={onClose} title="Nova Despesa">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Veículo
                    </label>
                    <select
                        value={vehicleId}
                        onChange={(e) => setVehicleId(e.target.value)}
                        required
                        className="w-full h-11 px-3 text-sm bg-white border border-neutral-200 rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    >
                        <option value="">Selecione...</option>
                        {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                                {v.plate} {v.model && `- ${v.model}`}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Tipo
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {tipoOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setTipo(opt.value as any)}
                                className={`p-2 text-xs rounded-lg border transition-all ${tipo === opt.value
                                    ? 'bg-neutral-800 text-white border-neutral-800'
                                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Valor (R$)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        required
                        placeholder="0,00"
                        className="w-full h-11 px-3 text-sm bg-white border border-neutral-200 rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    />
                </div>

                {/* Receipt Photo Upload */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Nota Fiscal (opcional)
                    </label>

                    {receiptPreview ? (
                        <div className="relative">
                            <img
                                src={receiptPreview}
                                alt="Nota fiscal"
                                className="w-full h-32 object-cover rounded-lg border border-neutral-200"
                            />
                            <button
                                type="button"
                                onClick={removeReceipt}
                                className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-24 flex flex-col items-center justify-center gap-2
                                       border-2 border-dashed border-neutral-200 rounded-lg
                                       text-neutral-400 hover:border-neutral-300 hover:text-neutral-500
                                       transition-colors"
                        >
                            <Camera className="h-6 w-6" />
                            <span className="text-xs">Tirar foto ou anexar</span>
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

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Observações
                    </label>
                    <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Detalhes adicionais..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-neutral-200 resize-none"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !vehicleId || !valor}
                    className="w-full h-11 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium
                               rounded-lg transition-colors disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Registrar Despesa'}
                </button>
            </form>
        </Modal>
    )
}

// Daily Report Modal
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

    // Check if report exists for today
    useEffect(() => {
        if (open) {
            checkTodayReport()
        }
    }, [open])

    const checkTodayReport = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
            .from('field_reports')
            .select('*')
            .eq('user_id', user.id)
            .eq('report_date', today)
            .single()

        if (data) {
            setExistingReport(data)
            setSummary(data.summary || '')
            setNotes(data.notes || '')
        } else {
            setExistingReport(null)
            setSummary('')
            setNotes('')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!summary.trim()) return

        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')

            // Get org_id from operium_profiles
            const { data: profile } = await supabase
                .from('operium_profiles')
                .select('org_id')
                .eq('user_id', user.id)
                .eq('active', true)
                .single()

            if (!profile) throw new Error('Perfil não encontrado')

            const today = new Date().toISOString().split('T')[0]

            if (existingReport) {
                // Update existing report
                const { error: updateError } = await supabase
                    .from('field_reports')
                    .update({ summary, notes })
                    .eq('id', existingReport.id)

                if (updateError) throw updateError
            } else {
                // Insert new report
                const { error: insertError } = await supabase
                    .from('field_reports')
                    .insert({
                        org_id: profile.org_id,
                        user_id: user.id,
                        report_date: today,
                        summary,
                        notes
                    })

                if (insertError) throw insertError
            }

            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar relatório')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal open={open} onClose={onClose} title="Relatório do Dia">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {existingReport && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-600">
                            📝 Você já preencheu o relatório de hoje. Pode editar se necessário.
                        </p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Resumo das atividades *
                    </label>
                    <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        required
                        placeholder="O que você fez hoje? Quais locais visitou?"
                        rows={4}
                        className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-neutral-200 resize-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Observações adicionais
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Problemas, sugestões, pendências..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-neutral-200 resize-none"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !summary.trim()}
                    className="w-full h-11 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium
                               rounded-lg transition-colors disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : existingReport ? 'Atualizar Relatório' : 'Enviar Relatório'}
                </button>
            </form>
        </Modal>
    )
}

export default function AppPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const { profile, loading: loadingProfile, role } = useOperiumProfile()
    const { events, loading: loadingEvents, refreshEvents } = useOperiumEvents({ limit: 5 })

    const [showExpenseModal, setShowExpenseModal] = useState(false)
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [showReportReminder, setShowReportReminder] = useState(false)

    // Check for end-of-day reminder
    useEffect(() => {
        const checkReportReminder = () => {
            const hour = new Date().getHours()
            // Show reminder between 17:00 and 19:00
            if (hour >= 17 && hour < 19) {
                setShowReportReminder(true)
            }
        }
        checkReportReminder()
        const interval = setInterval(checkReportReminder, 60000) // Check every minute
        return () => clearInterval(interval)
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleSuccess = () => {
        refreshEvents()
    }

    if (loadingProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FBFBFA]">
            {/* Header */}
            <header className="bg-white border-b border-neutral-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-semibold text-neutral-800">Operium</h1>
                        <p className="text-xs text-neutral-500">Equipe de Campo</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* End of Day Reminder */}
            {showReportReminder && (
                <div className="mx-4 mt-4 p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <FileText className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-purple-800">Hora do relatório!</p>
                        <p className="text-xs text-purple-600">Não esqueça de preencher seu relatório do dia.</p>
                    </div>
                    <button
                        onClick={() => {
                            setShowReportReminder(false)
                            setShowReportModal(true)
                        }}
                        className="text-xs font-medium text-purple-700 px-3 py-1.5 bg-purple-100 rounded-lg"
                    >
                        Fazer
                    </button>
                </div>
            )}

            {/* Main Content */}
            <main className="p-4 space-y-6">
                {/* Welcome */}
                <div>
                    <h2 className="text-xl font-medium text-neutral-800">
                        Olá! 👋
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1">
                        O que você precisa fazer hoje?
                    </p>
                </div>

                {/* Quick Actions for Field Teams */}
                <div className="space-y-3">
                    <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
                        Ações Rápidas
                    </h3>

                    <ActionCard
                        icon={Fuel}
                        title="Nova Despesa"
                        subtitle="Registrar abastecimento ou gasto"
                        onClick={() => setShowExpenseModal(true)}
                        color="blue"
                    />
                    <ActionCard
                        icon={Activity}
                        title="Status do Veículo"
                        subtitle="Atualizar condição do veículo"
                        onClick={() => setShowStatusModal(true)}
                        color="orange"
                    />
                    <ActionCard
                        icon={FileText}
                        title="Relatório do Dia"
                        subtitle="Resumo das atividades diárias"
                        onClick={() => setShowReportModal(true)}
                        color="purple"
                    />
                </div>

                {/* Recent Activity */}
                <div className="space-y-3">
                    <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide flex items-center gap-2">
                        <History className="h-3 w-3" />
                        Atividade Recente
                    </h3>

                    {loadingEvents ? (
                        <div className="text-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-neutral-400 mx-auto" />
                        </div>
                    ) : events.length === 0 ? (
                        <p className="text-sm text-neutral-400 text-center py-4">
                            Nenhuma atividade ainda
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {events.slice(0, 5).map((event) => (
                                <div
                                    key={event.id}
                                    className="p-3 bg-white border border-neutral-200 rounded-lg"
                                >
                                    <p className="text-sm text-neutral-700">
                                        {event.type === 'VEHICLE_EXPENSE' && '💰 Despesa registrada'}
                                        {event.type === 'VEHICLE_STATUS' && '🚗 Status atualizado'}
                                        {event.type === 'ITEM_IN' && '📥 Entrada registrada'}
                                        {event.type === 'ITEM_OUT' && '📤 Saída registrada'}
                                    </p>
                                    <p className="text-xs text-neutral-400 mt-1">
                                        {new Date(event.created_at).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
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
            <DailyReportModal
                open={showReportModal}
                onClose={() => setShowReportModal(false)}
                onSuccess={handleSuccess}
            />
        </div>
    )
}
