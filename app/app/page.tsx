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
    User,
    Users,
    AlertTriangle,
    CheckCircle2,
    ArrowDownToLine,
    MapPin,
    Crown
} from 'lucide-react'
import {
    getPendingEquipmentAcceptance,
    acceptEquipment,
    requestEquipmentReturn,
    reportFieldIssue,
    getMyTeamEquipment,
    getMyTeamInfo,
    getAvailableTeams,
    TeamEquipmentMobile,
    AvailableTeam,
    MyTeamInfo
} from './actions'
import { toast } from 'sonner'
import { FieldLanguageSwitcher } from '@/components/operium/FieldLanguageSwitcher'
import { TeamManagerMobile } from '@/components/operium/TeamManagerMobile'
import { useTranslation } from 'react-i18next'

// ============================================================================
// SMART REPORT REMINDER - Shows at right time with status
// ============================================================================

function SmartReportReminder({
    onOpenReport,
    isTeamLeader
}: {
    onOpenReport: () => void
    isTeamLeader: boolean
}) {
    const { t } = useTranslation('common')
    const supabase = createClientComponentClient()
    const [hasIndividualReport, setHasIndividualReport] = useState(false)
    const [hasTeamReport, setHasTeamReport] = useState(false)
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())

    // Check if user has filled reports today
    useEffect(() => {
        const checkReports = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const today = new Date().toISOString().split('T')[0]
                const { data: reports } = await supabase
                    .from('field_reports')
                    .select('id, report_type')
                    .eq('user_id', user.id)
                    .eq('report_date', today)

                setHasIndividualReport(reports?.some(r => r.report_type === 'INDIVIDUAL') || false)
                setHasTeamReport(reports?.some(r => r.report_type === 'TEAM') || false)
            } catch {
                // Ignore errors
            } finally {
                setLoading(false)
            }
        }

        checkReports()
    }, [supabase])

    // Calculate if all reports are filled (individual required, team required only for leaders)
    const allReportsFilled = hasIndividualReport && (!isTeamLeader || hasTeamReport)
    const hasAnyReport = hasIndividualReport || hasTeamReport

    // Update time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date())
        }, 60000) // 1 minute

        return () => clearInterval(interval)
    }, [])

    if (loading) return null

    const REMINDER_HOUR = 18 // 6 PM
    const currentHour = currentTime.getHours()

    // Calculate next reminder time (tomorrow at 6 PM)
    const nextReminder = new Date(currentTime)
    if (currentHour >= REMINDER_HOUR || allReportsFilled) {
        nextReminder.setDate(nextReminder.getDate() + 1)
    }
    nextReminder.setHours(REMINDER_HOUR, 0, 0, 0)

    // Calculate time until next reminder
    const timeDiff = nextReminder.getTime() - currentTime.getTime()
    const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

    // Build status message
    const getStatusMessage = () => {
        if (hasIndividualReport && hasTeamReport) {
            return t('modals.daily_report.both_filled')
        } else if (hasIndividualReport) {
            return isTeamLeader
                ? `${t('modals.daily_report.individual_filled')} • ${t('modals.daily_report.pending_team')}`
                : t('modals.daily_report.individual_filled')
        } else if (hasTeamReport) {
            return `${t('modals.daily_report.team_filled')} • ${t('modals.daily_report.pending_individual')}`
        }
        return ''
    }

    // State A: All reports filled today - show success message
    if (allReportsFilled) {
        return (
            <div className="px-4 pt-3">
                <div className="p-4 bg-green-50 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-white" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[15px] font-semibold text-green-900">
                            {t('report_reminder.already_filled')}
                        </p>
                        <p className="text-[13px] text-green-600 mt-0.5">
                            {getStatusMessage()}
                        </p>
                    </div>
                    <button
                        onClick={onOpenReport}
                        className="px-3 py-1.5 text-[13px] font-medium text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                    >
                        {t('report_reminder.view')}
                    </button>
                </div>
            </div>
        )
    }

    // State B: Has some reports but not all - show partial status
    if (hasAnyReport && currentHour >= REMINDER_HOUR) {
        return (
            <div className="px-4 pt-3">
                <div className="p-4 bg-amber-50 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="h-5 w-5 text-white" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[15px] font-semibold text-amber-900">
                            {getStatusMessage()}
                        </p>
                        <p className="text-[13px] text-amber-600 mt-0.5">
                            Complete todos os relatórios do dia
                        </p>
                    </div>
                    <button
                        onClick={onOpenReport}
                        className="px-3 py-1.5 text-[13px] font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                    >
                        Completar
                    </button>
                </div>
            </div>
        )
    }

    // State B: Reminder time (6 PM - 11:59 PM) and not filled - show action reminder
    if (currentHour >= REMINDER_HOUR) {
        return (
            <div className="px-4 pt-3">
                <div className="p-4 bg-purple-50 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                        <Clock className="h-5 w-5 text-white" strokeWidth={2} />
                    </div>
                    <p className="text-[15px] font-semibold text-neutral-900 flex-1">
                        {t('report_reminder.call_to_action')}
                    </p>
                    <button
                        onClick={onOpenReport}
                        className="px-4 py-2 bg-purple-500 text-white text-[14px] font-semibold rounded-xl
                                   active:scale-95 transition-all"
                    >
                        {t('report_reminder.do_now')}
                    </button>
                </div>
            </div>
        )
    }

    // State C: Before reminder time - show countdown
    return (
        <div className="px-4 pt-3">
            <div className="p-4 bg-neutral-100 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-neutral-600" strokeWidth={2} />
                </div>
                <div className="flex-1">
                    <p className="text-[15px] font-semibold text-neutral-700">
                        {t('report_reminder.daily_report')}
                    </p>
                    <p className="text-[13px] text-neutral-500 mt-0.5">
                        {t('report_reminder.available_at')} 18:00 ({t('report_reminder.in')} {hoursUntil}{t('report_reminder.hours')} {minutesUntil}{t('report_reminder.minutes')})
                    </p>
                </div>
            </div>
        </div>
    )
}

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
// ACTION CARD - Native App Style (iOS-like)
// ============================================================================

function ActionCard({
    icon: Icon,
    title,
    subtitle,
    onClick,
    disabled,
    disabledMessage,
}: {
    icon: any
    title: string
    subtitle: string
    onClick: () => void
    disabled?: boolean
    disabledMessage?: string
}) {
    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 bg-white transition-all duration-150 ${disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'active:bg-neutral-50 active:scale-[0.98]'
                }`}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${disabled ? 'bg-neutral-50' : 'bg-neutral-100'
                }`}>
                <Icon className={`h-5 w-5 ${disabled ? 'text-neutral-400' : 'text-neutral-600'}`} strokeWidth={1.75} />
            </div>
            <div className="flex-1 text-left min-w-0">
                <p className={`text-[16px] font-semibold truncate ${disabled ? 'text-neutral-400' : 'text-neutral-900'}`}>
                    {title}
                </p>
                <p className={`text-[14px] truncate ${disabled ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {disabled && disabledMessage ? disabledMessage : subtitle}
                </p>
            </div>
            <ChevronRight className={`h-5 w-5 flex-shrink-0 ${disabled ? 'text-neutral-200' : 'text-neutral-300'}`} />
        </button>
    )
}

// ============================================================================
// ACTIVITY CARD - Minimal native style
// ============================================================================

function ActivityCard({ event, isLast }: { event: any; isLast?: boolean }) {
    const { t, i18n } = useTranslation('common')

    const getEventInfo = () => {
        switch (event.type) {
            case 'VEHICLE_EXPENSE':
                return {
                    icon: Fuel,
                    label: t('event_types.expense_registered'),
                    iconBg: 'bg-blue-500',
                    value: event.metadata?.valor ? `R$ ${event.metadata.valor.toFixed(2)}` : null
                }
            case 'VEHICLE_STATUS':
                return {
                    icon: Car,
                    label: t('event_types.status_updated'),
                    iconBg: 'bg-orange-500',
                    value: null
                }
            case 'ITEM_IN':
                return {
                    icon: Package,
                    label: t('event_types.item_received'),
                    iconBg: 'bg-green-500',
                    value: null
                }
            case 'ITEM_OUT':
                return {
                    icon: Package,
                    label: t('event_types.item_sent'),
                    iconBg: 'bg-red-500',
                    value: null
                }
            default:
                return {
                    icon: Activity,
                    label: t('event_types.activity'),
                    iconBg: 'bg-neutral-400',
                    value: null
                }
        }
    }

    const { icon: EventIcon, label, iconBg, value } = getEventInfo()
    const currentLocale = i18n.language?.startsWith('pt') ? 'pt-BR' : 'en-US'

    return (
        <div className={`flex items-center gap-3 px-4 py-3 bg-white ${!isLast ? 'border-b border-neutral-100' : ''}`}>
            <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
                <EventIcon className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-neutral-900">{label}</p>
                <p className="text-[13px] text-neutral-400">
                    {new Date(event.created_at).toLocaleDateString(currentLocale, {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </p>
            </div>
            {value && (
                <span className="text-[15px] font-semibold text-neutral-900">{value}</span>
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
    const { t } = useTranslation('common')

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
            setError(err.message || t('modals.expense.error'))
        } finally {
            setLoading(false)
        }
    }

    const tipos = [
        { v: 'combustivel', icon: Fuel, n: t('modals.expense.fuel') },
        { v: 'manutencao', icon: Wrench, n: t('modals.expense.maintenance') },
        { v: 'pedagio', icon: Receipt, n: t('modals.expense.toll') },
        { v: 'estacionamento', icon: ParkingCircle, n: t('modals.expense.parking') },
        { v: 'outros', icon: Package, n: t('modals.expense.other') }
    ]

    return (
        <NativeModal open={open} onClose={onClose} title={t('modals.expense.title')}>
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Vehicle Select */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        {t('modals.expense.vehicle')}
                    </label>
                    <select
                        value={vehicleId}
                        onChange={(e) => setVehicleId(e.target.value)}
                        required
                        className="w-full h-14 px-4 text-base bg-neutral-50 border border-neutral-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:bg-white
                                   appearance-none font-medium text-neutral-900"
                    >
                        <option value="">{t('modals.expense.select_vehicle')}</option>
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
                        {t('modals.expense.expense_type')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {tipos.map((t) => (
                            <button
                                key={t.v}
                                type="button"
                                onClick={() => setTipo(t.v as any)}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${tipo === t.v
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
                        {t('modals.expense.amount')}
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
                        {t('modals.expense.receipt')}
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
                            <span className="text-sm font-medium">{t('modals.expense.photo_hint')}</span>
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
                        {t('modals.expense.notes')}
                    </label>
                    <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder={t('modals.expense.notes_placeholder')}
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
                            <span>{t('modals.expense.submit')}</span>
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
    onSuccess,
    teamVehicle
}: {
    open: boolean
    onClose: () => void
    onSuccess: () => void
    teamVehicle?: { id: string; plate: string; model: string | null } | null
}) {
    const { t } = useTranslation('common')
    const [vehicleId, setVehicleId] = useState('')
    const [status, setStatus] = useState<'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'>('ACTIVE')
    const [observacoes, setObservacoes] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { vehicles } = useOperiumVehicles()
    const { createVehicleStatus } = useOperiumEvents()

    // Use team vehicle if available, otherwise allow selection
    const hasTeamVehicle = !!teamVehicle?.id
    const effectiveVehicleId = hasTeamVehicle ? teamVehicle.id : vehicleId

    // Set vehicle ID from team when modal opens
    useEffect(() => {
        if (open && teamVehicle?.id) {
            setVehicleId(teamVehicle.id)
        }
    }, [open, teamVehicle?.id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!effectiveVehicleId) return
        setLoading(true)
        setError(null)
        try {
            await createVehicleStatus({
                vehicle_id: effectiveVehicleId,
                status,
                observacoes: observacoes || undefined
            })
            onSuccess()
            onClose()
            setVehicleId('')
            setObservacoes('')
        } catch (err: any) {
            setError(err.message || t('modals.status.error'))
        } finally {
            setLoading(false)
        }
    }

    const statusOptions = [
        { v: 'ACTIVE', color: 'bg-green-500', n: t('modals.status.active'), desc: t('modals.status.active_desc') },
        { v: 'MAINTENANCE', color: 'bg-yellow-500', n: t('modals.status.maintenance'), desc: t('modals.status.maintenance_desc') },
        { v: 'INACTIVE', color: 'bg-red-500', n: t('modals.status.inactive'), desc: t('modals.status.inactive_desc') }
    ]

    return (
        <NativeModal open={open} onClose={onClose} title={t('modals.status.title')}>
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        {t('modals.status.vehicle')}
                    </label>
                    {hasTeamVehicle ? (
                        // Fixed vehicle from team - not editable
                        <div className="w-full h-14 px-4 flex items-center bg-neutral-100 border border-neutral-200 rounded-xl">
                            <Car className="h-5 w-5 text-neutral-500 mr-3" />
                            <span className="text-base font-medium text-neutral-900">
                                {teamVehicle.plate} {teamVehicle.model && `- ${teamVehicle.model}`}
                            </span>
                        </div>
                    ) : (
                        // Selectable vehicle (fallback if no team vehicle)
                        <select
                            value={vehicleId}
                            onChange={(e) => setVehicleId(e.target.value)}
                            required
                            className="w-full h-14 px-4 text-base bg-neutral-50 border border-neutral-200 rounded-xl
                                       focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:bg-white
                                       appearance-none font-medium text-neutral-900"
                        >
                            <option value="">{t('modals.status.select_vehicle')}</option>
                            {vehicles.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.plate} {v.model && `- ${v.model}`}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        {t('modals.status.new_status')}
                    </label>
                    <div className="space-y-3">
                        {statusOptions.map((s) => (
                            <button
                                key={s.v}
                                type="button"
                                onClick={() => setStatus(s.v as any)}
                                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${status === s.v
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
                        {t('modals.status.notes')}
                    </label>
                    <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder={t('modals.status.notes_placeholder')}
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
                            <span>{t('modals.status.submit')}</span>
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
    onSuccess,
    isTeamLeader
}: {
    open: boolean
    onClose: () => void
    onSuccess: () => void
    isTeamLeader: boolean
}) {
    const supabase = createClientComponentClient()
    const { t } = useTranslation('common')

    const [summary, setSummary] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [checking, setChecking] = useState(false)

    // Report type state (INDIVIDUAL or TEAM)
    const [reportType, setReportType] = useState<'INDIVIDUAL' | 'TEAM'>('INDIVIDUAL')
    const [existingIndividualReport, setExistingIndividualReport] = useState<any>(null)
    const [existingTeamReport, setExistingTeamReport] = useState<any>(null)

    // Get current report based on type
    const existingReport = reportType === 'INDIVIDUAL' ? existingIndividualReport : existingTeamReport

    const checkTodayReports = useCallback(async () => {
        setChecking(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const today = new Date().toISOString().split('T')[0]

            // Fetch both report types
            const { data: reports } = await supabase
                .from('field_reports')
                .select('*')
                .eq('user_id', user.id)
                .eq('report_date', today)

            // Separate by type
            const individual = reports?.find(r => r.report_type === 'INDIVIDUAL') || null
            const team = reports?.find(r => r.report_type === 'TEAM') || null

            setExistingIndividualReport(individual)
            setExistingTeamReport(team)

            // Pre-load data based on current type
            const currentReport = reportType === 'INDIVIDUAL' ? individual : team
            if (currentReport) {
                setSummary(currentReport.summary || '')
                setNotes(currentReport.notes || '')
            } else {
                setSummary('')
                setNotes('')
            }
        } catch {
            // Ignore
        } finally {
            setChecking(false)
        }
    }, [supabase, reportType])

    useEffect(() => {
        if (open) checkTodayReports()
    }, [open, checkTodayReports])

    // Update form when switching report type
    useEffect(() => {
        const currentReport = reportType === 'INDIVIDUAL' ? existingIndividualReport : existingTeamReport
        if (currentReport) {
            setSummary(currentReport.summary || '')
            setNotes(currentReport.notes || '')
        } else {
            setSummary('')
            setNotes('')
        }
    }, [reportType, existingIndividualReport, existingTeamReport])

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
                .select('org_id, team_id')
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
                    team_id: reportType === 'TEAM' ? profile.team_id : null,
                    user_id: user.id,
                    report_date: today,
                    report_type: reportType,
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

    // Check if it's before allowed time (18h) and no existing report
    const REPORT_HOUR = 18
    const currentHour = new Date().getHours()
    const isBeforeAllowedTime = currentHour < REPORT_HOUR && !existingReport

    // Calculate time until report is available
    const now = new Date()
    const nextReportTime = new Date(now)
    nextReportTime.setHours(REPORT_HOUR, 0, 0, 0)
    const timeDiff = nextReportTime.getTime() - now.getTime()
    const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

    return (
        <NativeModal open={open} onClose={onClose} title={t('modals.daily_report.title')}>
            {checking ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
            ) : isBeforeAllowedTime ? (
                // Block before 18h
                <div className="py-8 space-y-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                            <Clock className="h-8 w-8 text-neutral-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-900">
                            Relatório ainda não disponível
                        </h3>
                        <p className="text-sm text-neutral-500 mt-2 max-w-[280px]">
                            O relatório diário fica disponível a partir das 18:00
                        </p>
                    </div>

                    <div className="bg-neutral-100 rounded-2xl p-4 text-center">
                        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                            Libera em
                        </p>
                        <p className="text-2xl font-bold text-neutral-900">
                            {hoursUntil}h {minutesUntil}min
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full h-12 bg-neutral-200 text-neutral-700 text-base font-medium rounded-xl
                                   active:scale-[0.98] transition-all"
                    >
                        Entendi
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Report Type Selector */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setReportType('INDIVIDUAL')}
                            className={`flex-1 py-3 rounded-xl font-medium text-[15px] transition-all flex items-center justify-center gap-2 ${
                                reportType === 'INDIVIDUAL'
                                    ? 'bg-neutral-900 text-white'
                                    : 'bg-neutral-100 text-neutral-600'
                            }`}
                        >
                            <User className="h-4 w-4" />
                            {t('modals.daily_report.individual')}
                            {existingIndividualReport && <Check className="h-4 w-4 text-green-400" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => isTeamLeader && setReportType('TEAM')}
                            disabled={!isTeamLeader}
                            className={`flex-1 py-3 rounded-xl font-medium text-[15px] transition-all flex items-center justify-center gap-2 ${
                                reportType === 'TEAM'
                                    ? 'bg-neutral-900 text-white'
                                    : 'bg-neutral-100 text-neutral-600'
                            } ${!isTeamLeader ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={!isTeamLeader ? t('modals.daily_report.only_leader') : ''}
                        >
                            <Crown className="h-4 w-4" />
                            {t('modals.daily_report.team')}
                            {existingTeamReport && <Check className="h-4 w-4 text-green-400" />}
                        </button>
                    </div>

                    {existingReport && (
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Check className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-blue-900">{t('modals.daily_report.already_filled')}</p>
                                <p className="text-xs text-blue-600 mt-0.5">{t('modals.daily_report.can_edit')}</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            {t('modals.daily_report.summary_required')}
                        </label>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            required
                            placeholder={t('modals.daily_report.summary_placeholder')}
                            rows={4}
                            className="w-full px-4 py-3 text-base bg-neutral-50 border border-neutral-200 rounded-xl
                                       focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:bg-white resize-none
                                       placeholder:text-neutral-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            {t('modals.daily_report.notes')}
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t('modals.daily_report.notes_placeholder')}
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
                                <span>{existingReport ? t('modals.daily_report.update') : t('modals.daily_report.submit')}</span>
                            </>
                        )}
                    </button>
                </form>
            )}
        </NativeModal>
    )
}

// ============================================================================
// EQUIPMENT ACCEPTANCE BANNER - iOS Alert Style
// ============================================================================

function EquipmentAcceptanceBanner({
    pendingCount,
    onAcceptAll
}: {
    pendingCount: number
    onAcceptAll: () => void
}) {
    if (pendingCount === 0) return null

    return (
        <div className="px-4 pt-3 animate-in slide-in-from-top-4 duration-300">
            <div className="p-4 bg-orange-50 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-neutral-900">
                        {pendingCount} {pendingCount > 1 ? 'novos itens' : 'novo item'}
                    </p>
                    <p className="text-[13px] text-neutral-600">Aguardando confirmação</p>
                </div>
                <button
                    onClick={onAcceptAll}
                    className="px-4 py-2 bg-orange-500 text-white text-[14px] font-semibold rounded-xl
                               active:scale-95 transition-all"
                >
                    Aceitar
                </button>
            </div>
        </div>
    )
}

// ============================================================================
// EQUIPMENT RETURN MODAL
// ============================================================================

function EquipmentReturnModal({
    open,
    onClose,
    equipment,
    onSuccess
}: {
    open: boolean
    onClose: () => void
    equipment: TeamEquipmentMobile[]
    onSuccess: () => void
}) {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            // Pre-select all items
            setSelectedItems(new Set(equipment.map(e => e.id)))
        }
    }, [open, equipment])

    const toggleItem = (id: string) => {
        const newSet = new Set(selectedItems)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedItems(newSet)
    }

    const handleSubmit = async () => {
        if (selectedItems.size === 0) return
        setLoading(true)
        setError(null)
        try {
            await requestEquipmentReturn(Array.from(selectedItems))
            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Erro ao solicitar devolução')
        } finally {
            setLoading(false)
        }
    }

    return (
        <NativeModal open={open} onClose={onClose} title="Devolver Equipamentos">
            <div className="space-y-4">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <p className="text-sm text-neutral-500">
                    Marque os equipamentos que serão devolvidos. O admin validará a devolução.
                </p>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {equipment.filter(e => e.status === 'accepted' || e.status === 'in_use').map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleItem(item.id)}
                            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 text-left ${selectedItems.has(item.id)
                                ? 'bg-green-50 border-green-300'
                                : 'bg-white border-neutral-200'
                                }`}
                        >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedItems.has(item.id)
                                ? 'bg-green-500 border-green-500'
                                : 'border-neutral-300'
                                }`}>
                                {selectedItems.has(item.id) && <Check className="h-4 w-4 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-medium text-neutral-900 truncate">{item.ferramenta_nome}</p>
                                <p className="text-xs text-neutral-400">Qtd: {item.quantity}</p>
                            </div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading || selectedItems.size === 0}
                    className="w-full h-14 bg-green-600 text-white text-base font-semibold rounded-xl
                               disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg
                               flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <ArrowDownToLine className="h-5 w-5" />
                            <span>Solicitar Devolução ({selectedItems.size})</span>
                        </>
                    )}
                </button>
            </div>
        </NativeModal>
    )
}

// ============================================================================
// EQUIPMENT ISSUE REPORT MODAL
// ============================================================================

function EquipmentIssueModal({
    open,
    onClose,
    equipment,
    onSuccess
}: {
    open: boolean
    onClose: () => void
    equipment: TeamEquipmentMobile | null
    onSuccess: () => void
}) {
    const [issueType, setIssueType] = useState<'damage' | 'malfunction' | 'loss' | 'wear' | 'other'>('damage')
    const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
    const [description, setDescription] = useState('')
    const [location, setLocation] = useState('')
    const [photoUrl, setPhotoUrl] = useState<string | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!open) {
            setIssueType('damage')
            setSeverity('medium')
            setDescription('')
            setLocation('')
            setPhotoUrl(null)
            setPhotoPreview(null)
            setError(null)
        }
    }, [open])

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            setError('Selecione apenas imagens')
            return
        }

        // Validar tamanho (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('A imagem deve ter no máximo 5MB')
            return
        }

        // Preview
        const reader = new FileReader()
        reader.onloadend = () => setPhotoPreview(reader.result as string)
        reader.readAsDataURL(file)

        // Upload
        setUploadingPhoto(true)
        setError(null)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('bucket', 'equipment-issues')
            formData.append('folder', 'issues')

            const response = await fetch('/api/upload-photo', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Erro ao fazer upload')
            }

            const data = await response.json()
            setPhotoUrl(data.url)
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer upload da foto')
            setPhotoPreview(null)
        } finally {
            setUploadingPhoto(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!equipment || !description.trim()) return
        setLoading(true)
        setError(null)
        try {
            await reportFieldIssue(equipment.id, {
                type: issueType,
                severity,
                description,
                location: location || undefined,
                photo_url: photoUrl || undefined
            })
            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Erro ao reportar problema')
        } finally {
            setLoading(false)
        }
    }

    const issueTypes = [
        { v: 'damage', n: 'Dano', color: 'bg-red-50 border-red-200' },
        { v: 'malfunction', n: 'Defeito', color: 'bg-orange-50 border-orange-200' },
        { v: 'wear', n: 'Desgaste', color: 'bg-yellow-50 border-yellow-200' },
        { v: 'loss', n: 'Perda', color: 'bg-purple-50 border-purple-200' },
        { v: 'other', n: 'Outro', color: 'bg-neutral-50 border-neutral-200' }
    ]

    const severities = [
        { v: 'low', n: 'Baixa', color: 'bg-green-500' },
        { v: 'medium', n: 'Média', color: 'bg-yellow-500' },
        { v: 'high', n: 'Alta', color: 'bg-orange-500' },
        { v: 'critical', n: 'Crítica', color: 'bg-red-500' }
    ]

    return (
        <NativeModal open={open} onClose={onClose} title="Reportar Problema">
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {equipment && (
                    <div className="p-3 bg-neutral-50 rounded-xl">
                        <p className="text-sm font-medium text-neutral-900">{equipment.ferramenta_nome}</p>
                        <p className="text-xs text-neutral-400">Qtd: {equipment.quantity}</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Tipo de Problema
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {issueTypes.map((t) => (
                            <button
                                key={t.v}
                                type="button"
                                onClick={() => setIssueType(t.v as any)}
                                className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${issueType === t.v
                                    ? 'bg-neutral-900 text-white border-neutral-900'
                                    : `${t.color} text-neutral-700`
                                    }`}
                            >
                                {t.n}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Gravidade
                    </label>
                    <div className="flex gap-2">
                        {severities.map((s) => (
                            <button
                                key={s.v}
                                type="button"
                                onClick={() => setSeverity(s.v as any)}
                                className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${severity === s.v
                                    ? 'border-neutral-900 bg-neutral-50'
                                    : 'border-neutral-200 bg-white'
                                    }`}
                            >
                                <div className={`w-3 h-3 rounded-full ${s.color}`} />
                                {s.n}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Descrição do Problema *
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        placeholder="Descreva o que aconteceu..."
                        rows={3}
                        className="w-full px-4 py-3 text-base bg-neutral-50 border border-neutral-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:bg-white resize-none
                                   placeholder:text-neutral-400"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Local (opcional)
                    </label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Obra, rua, cidade..."
                        className="w-full h-12 px-4 text-base bg-neutral-50 border border-neutral-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:bg-white
                                   placeholder:text-neutral-400"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Foto do Problema (opcional)
                    </label>
                    <div className="flex items-center gap-3">
                        {photoPreview ? (
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-neutral-200">
                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPhotoPreview(null)
                                        setPhotoUrl(null)
                                    }}
                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full
                                               flex items-center justify-center text-xs"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <label className={`flex-1 h-20 border-2 border-dashed border-neutral-300 rounded-xl
                                              flex flex-col items-center justify-center gap-1 cursor-pointer
                                              hover:bg-neutral-50 transition-colors
                                              ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                                {uploadingPhoto ? (
                                    <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                                ) : (
                                    <>
                                        <Camera className="h-6 w-6 text-neutral-400" />
                                        <span className="text-xs text-neutral-500">Tirar ou escolher foto</span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                    disabled={uploadingPhoto}
                                />
                            </label>
                        )}
                    </div>
                    {photoUrl && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Foto anexada
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading || !description.trim() || uploadingPhoto}
                    className="w-full h-14 bg-amber-600 text-white text-base font-semibold rounded-xl
                               disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg shadow-amber-600/20
                               flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <AlertTriangle className="h-5 w-5" />
                            <span>Reportar Problema</span>
                        </>
                    )}
                </button>
            </form>
        </NativeModal>
    )
}

// ============================================================================
// TEAM INFO SECTION - iOS Tabs Style
// ============================================================================

function TeamInfoSection({ teamInfo, loading }: { teamInfo: MyTeamInfo | null; loading?: boolean }) {
    const [activeTab, setActiveTab] = useState<'members' | 'leader' | 'location'>('members')

    // Show skeleton while loading
    if (loading) {
        return (
            <div className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="flex border-b border-neutral-100">
                    <div className="flex-1 py-3 flex justify-center">
                        <div className="h-4 w-16 bg-neutral-200 rounded" />
                    </div>
                    <div className="flex-1 py-3 flex justify-center">
                        <div className="h-4 w-12 bg-neutral-200 rounded" />
                    </div>
                    <div className="flex-1 py-3 flex justify-center">
                        <div className="h-4 w-12 bg-neutral-200 rounded" />
                    </div>
                </div>
                <div className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-200" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-32 bg-neutral-200 rounded" />
                            <div className="h-3 w-20 bg-neutral-100 rounded" />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!teamInfo) return null

    const tabs = [
        { id: 'members' as const, label: 'Membros', count: teamInfo.members.length },
        { id: 'leader' as const, label: 'Líder' },
        { id: 'location' as const, label: 'Local' }
    ]

    return (
        <div className="bg-white rounded-2xl overflow-hidden">
            {/* Tab Headers */}
            <div className="flex border-b border-neutral-100">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-3 text-[13px] font-semibold transition-colors relative ${activeTab === tab.id
                            ? 'text-neutral-900'
                            : 'text-neutral-400'
                            }`}
                    >
                        <span>{tab.label}</span>
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="ml-1 text-[11px] text-neutral-400">({tab.count})</span>
                        )}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-neutral-900 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-4">
                {/* Members Tab */}
                {activeTab === 'members' && (
                    <div className="space-y-3">
                        {teamInfo.members.length === 0 ? (
                            <div className="text-center py-6">
                                <Users className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
                                <p className="text-[14px] text-neutral-400">Nenhum membro na equipe</p>
                            </div>
                        ) : (
                            teamInfo.members.map((member) => (
                                <div key={member.id} className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {member.photo ? (
                                            <img
                                                src={member.photo}
                                                alt={member.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="h-5 w-5 text-neutral-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-medium text-neutral-900 truncate">
                                            {member.name}
                                        </p>
                                        {member.role && (
                                            <p className="text-[13px] text-neutral-400 truncate">
                                                {member.role}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Leader Tab */}
                {activeTab === 'leader' && (
                    <div>
                        {teamInfo.leader_id ? (
                            <div className="flex items-center gap-4 py-2">
                                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-amber-200">
                                    {teamInfo.leader_photo ? (
                                        <img
                                            src={teamInfo.leader_photo}
                                            alt={teamInfo.leader_name || 'Líder'}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Crown className="h-7 w-7 text-amber-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Crown className="h-4 w-4 text-amber-500" />
                                        <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">
                                            Líder da Equipe
                                        </span>
                                    </div>
                                    <p className="text-[18px] font-bold text-neutral-900 mt-0.5">
                                        {teamInfo.leader_name || 'Sem nome'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <Crown className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
                                <p className="text-[14px] text-neutral-400">Nenhum líder definido</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Location Tab */}
                {activeTab === 'location' && (
                    <div>
                        {teamInfo.current_location ? (
                            <div className="flex items-start gap-3 py-2">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <MapPin className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                                        Local de Atuação
                                    </span>
                                    <p className="text-[16px] font-medium text-neutral-900 mt-0.5">
                                        {teamInfo.current_location}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <MapPin className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
                                <p className="text-[14px] text-neutral-400">Nenhum local definido</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// ============================================================================
// TEAM EQUIPMENT SECTION - iOS List Style
// ============================================================================

function TeamEquipmentSection({
    equipment,
    pendingEquipment,
    onAcceptSingle,
    onReportIssue,
    onRefresh
}: {
    equipment: TeamEquipmentMobile[]
    pendingEquipment: any[]
    onAcceptSingle: (id: string) => Promise<void>
    onReportIssue: (item: TeamEquipmentMobile) => void
    onRefresh: () => void
}) {
    const [acceptingId, setAcceptingId] = useState<string | null>(null)
    const [expanded, setExpanded] = useState(true)

    // Combine pending and accepted equipment
    const allEquipment = [
        ...pendingEquipment.map(p => ({ ...p, _isPending: true })),
        ...equipment.filter(e => e.status === 'accepted' || e.status === 'in_use').map(e => ({ ...e, _isPending: false }))
    ]

    if (allEquipment.length === 0) return null

    const handleAccept = async (id: string) => {
        setAcceptingId(id)
        try {
            await onAcceptSingle(id)
            onRefresh()
        } finally {
            setAcceptingId(null)
        }
    }

    const getStatusBadge = (item: any) => {
        if (item._isPending || item.status === 'pending_acceptance') {
            return { text: 'Pendente', bg: 'bg-orange-500' }
        }
        if (item.status === 'pending_return') {
            return { text: 'Devolução', bg: 'bg-blue-500' }
        }
        return { text: 'Em uso', bg: 'bg-green-500' }
    }

    return (
        <div>
            {/* Section Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 mb-2"
            >
                <h3 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-wide">
                    Equipamentos da Equipe
                </h3>
                <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-neutral-200 text-neutral-600 text-[11px] font-bold rounded-full flex items-center justify-center">
                        {allEquipment.length}
                    </span>
                    <ChevronRight className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
                </div>
            </button>

            {/* Equipment List */}
            {expanded && (
                <div className="bg-white rounded-2xl overflow-hidden">
                    {allEquipment.map((item: any, index: number) => {
                        const status = getStatusBadge(item)
                        const isPending = item._isPending || item.status === 'pending_acceptance'
                        const isLast = index === allEquipment.length - 1

                        return (
                            <div
                                key={item.id}
                                className={`flex items-center gap-3 px-4 py-3 ${!isLast ? 'border-b border-neutral-100' : ''}`}
                            >
                                {/* Status indicator */}
                                <div className={`w-2 h-2 rounded-full ${status.bg} flex-shrink-0`} />

                                <div className="flex-1 min-w-0">
                                    <p className="text-[15px] font-medium text-neutral-900 truncate">
                                        {item.ferramenta_nome}
                                    </p>
                                    <p className="text-[13px] text-neutral-400">
                                        Qtd: {item.quantity}
                                    </p>
                                </div>

                                {/* Actions */}
                                {isPending ? (
                                    <button
                                        onClick={() => handleAccept(item.id)}
                                        disabled={acceptingId === item.id}
                                        className="px-3 py-1.5 bg-green-500 text-white text-[13px] font-semibold rounded-lg
                                                   active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {acceptingId === item.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            'Aceitar'
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onReportIssue(item)}
                                        className="w-8 h-8 flex items-center justify-center text-amber-500
                                                   active:bg-amber-50 rounded-full transition-colors"
                                    >
                                        <AlertTriangle className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ============================================================================
// TEAM SELECTION SCREEN
// ============================================================================

function TeamSelectionScreen({ onComplete }: { onComplete: () => void }) {
    const supabase = createClientComponentClient()
    const [hasTeam, setHasTeam] = useState<boolean | null>(null)
    const [selectedTeam, setSelectedTeam] = useState('')
    const [teams, setTeams] = useState<AvailableTeam[]>([])
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
            // Use server action to fetch teams - bypasses client-side RLS issues
            const availableTeams = await getAvailableTeams()
            console.log('[fetchTeams] Server action returned teams:', availableTeams.length)
            setTeams(availableTeams)
        } catch (err) {
            console.error('[fetchTeams] Exception:', err)
            setTeams([])
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
                                className={`py-4 text-base font-medium rounded-xl border-2 transition-all ${hasTeam === true
                                    ? 'bg-neutral-900 text-white border-neutral-900'
                                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                                    }`}
                            >
                                Sim
                            </button>
                            <button
                                type="button"
                                onClick={() => setHasTeam(false)}
                                className={`py-4 text-base font-medium rounded-xl border-2 transition-all ${hasTeam === false
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
    const { loading: loadingProfile, profile: operiumProfile, userName, userId } = useOperiumProfile()
    const { events, loading: loadingEvents, refreshEvents } = useOperiumEvents({ limit: 20 })
    const { t } = useTranslation('common')

    const [showExpenseModal, setShowExpenseModal] = useState(false)
    const [showAllActivities, setShowAllActivities] = useState(false)
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [showReminder, setShowReminder] = useState(false)
    const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)

    // Equipment workflow state
    const [pendingEquipment, setPendingEquipment] = useState<any[]>([])
    const [teamEquipment, setTeamEquipment] = useState<TeamEquipmentMobile[]>([])
    const [showReturnModal, setShowReturnModal] = useState(false)
    const [showIssueModal, setShowIssueModal] = useState(false)
    const [selectedIssueEquipment, setSelectedIssueEquipment] = useState<TeamEquipmentMobile | null>(null)
    const [acceptingAll, setAcceptingAll] = useState(false)
    const [teamInfo, setTeamInfo] = useState<MyTeamInfo | null>(null)
    const [loadingTeamInfo, setLoadingTeamInfo] = useState(true)
    const [hasReportToday, setHasReportToday] = useState(false)

    // CRITICAL: Detect recovery flow from URL hash and redirect to password creation
    // Supabase sends recovery emails with #access_token=...&type=recovery
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hash = window.location.hash
            if (hash.includes('type=recovery') || hash.includes('type=invite')) {
                // Clear hash to prevent re-triggering
                window.history.replaceState(null, '', window.location.pathname)
                // Redirect to password creation - this is a recovery flow!
                router.push('/auth/update-password')
                return
            }
        }
    }, [router])

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

    // Check if user has already filled today's report
    const checkTodayReport = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const today = new Date().toISOString().split('T')[0]
            const { data } = await supabase
                .from('field_reports')
                .select('id')
                .eq('user_id', user.id)
                .eq('report_date', today)
                .maybeSingle()
            setHasReportToday(!!data)
        } catch {
            // Ignore errors
        }
    }, [supabase])

    // Check report status on load and when onboarding completes
    useEffect(() => {
        if (onboardingComplete) {
            checkTodayReport()
        }
    }, [onboardingComplete, checkTodayReport])

    const handleSuccess = () => refreshEvents()

    // Handle report success - update state immediately without refresh
    const handleReportSuccess = () => {
        setHasReportToday(true) // Immediately mark as filled
        refreshEvents()
    }

    const handleOnboardingComplete = () => {
        setOnboardingComplete(true)
    }

    // Fetch data progressively - each section appears as it loads
    const fetchEquipmentData = useCallback(async () => {
        // Set loading states
        setLoadingTeamInfo(true)

        // Fetch team info first (fastest, shows immediately)
        getMyTeamInfo()
            .then(team => {
                setTeamInfo(team)
                setLoadingTeamInfo(false)
            })
            .catch(e => {
                console.error('Error fetching team info:', e)
                setLoadingTeamInfo(false)
            })

        // Fetch equipment data (may take a bit longer)
        getMyTeamEquipment()
            .then(equipment => setTeamEquipment(equipment))
            .catch(e => console.error('Error fetching team equipment:', e))

        // Fetch pending equipment
        getPendingEquipmentAcceptance()
            .then(pending => setPendingEquipment(pending))
            .catch(e => console.error('Error fetching pending equipment:', e))
    }, [])

    useEffect(() => {
        if (onboardingComplete) {
            fetchEquipmentData()
        }
    }, [onboardingComplete, fetchEquipmentData])

    // Auto-refresh when app comes to foreground
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && onboardingComplete) {
                fetchEquipmentData()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        // Also set up a polling interval every 30s
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible' && onboardingComplete) {
                fetchEquipmentData()
            }
        }, 30000)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            clearInterval(interval)
        }
    }, [onboardingComplete, fetchEquipmentData])

    // Accept all pending equipment
    const handleAcceptAllEquipment = async () => {
        if (pendingEquipment.length === 0) return
        setAcceptingAll(true)
        try {
            await Promise.all(pendingEquipment.map(item => acceptEquipment(item.id)))
            toast.success('Equipamentos aceitos!')
            fetchEquipmentData()
        } catch (e) {
            console.error('Error accepting all equipment:', e)
            toast.error('Erro ao aceitar equipamentos')
        } finally {
            setAcceptingAll(false)
        }
    }

    // Accept single equipment
    const handleAcceptSingleEquipment = async (id: string) => {
        try {
            await acceptEquipment(id)
            toast.success('Equipamento aceito!')
            // No fetch needed here as it's called by the child component's onRefresh
        } catch (e) {
            console.error('Error accepting equipment:', e)
            toast.error('Erro ao aceitar equipamento')
            throw e // Re-throw to let child component know it failed
        }
    }

    const handleOpenReportIssue = (item: TeamEquipmentMobile) => {
        setSelectedIssueEquipment(item)
        setShowIssueModal(true)
    }

    const handleIssueReported = () => {
        toast.success('Problema reportado com sucesso')
        setShowIssueModal(false)
        fetchEquipmentData()
    }

    const handleReturnRequested = () => {
        toast.success('Solicitação de devolução enviada')
        setShowReturnModal(false)
        fetchEquipmentData()
    }

    const handleEquipmentSuccess = async () => {
        await fetchEquipmentData()
        refreshEvents()
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
        <div className="min-h-screen bg-[#F2F2F7]">
            {/* Header - Personalizado com nome do colaborador */}
            <header className="bg-[#F2F2F7] pt-safe">
                <div className="px-4 pt-2 pb-1">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            {/* Nome do colaborador como título principal */}
                            <h1 className="text-[28px] font-bold text-neutral-900">
                                {userName || t('mobile_app.header.loading')}
                            </h1>
                            {/* Equipe como subtítulo */}
                            {teamInfo ? (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Users className="h-3.5 w-3.5 text-neutral-400" />
                                    <p className="text-[14px] font-medium text-neutral-500">{teamInfo.name}</p>
                                </div>
                            ) : (
                                <p className="text-[14px] text-neutral-400 mt-0.5">
                                    {t('mobile_app.header.no_team')}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <FieldLanguageSwitcher />
                            <button
                                onClick={handleLogout}
                                className="w-10 h-10 flex items-center justify-center text-neutral-400
                                           active:bg-neutral-200/50 rounded-full transition-colors"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Smart Daily Report Reminder - Adapts based on time and completion status */}
            <SmartReportReminder onOpenReport={() => setShowReportModal(true)} isTeamLeader={!!(teamInfo && userId && teamInfo.leader_id === userId)} />

            {/* Equipment Acceptance Banner */}
            <EquipmentAcceptanceBanner
                pendingCount={pendingEquipment.length}
                onAcceptAll={handleAcceptAllEquipment}
            />

            {/* Main Content */}
            <main className="px-4 pt-4 pb-safe space-y-5">

                {/* Team Management Section */}
                <div>
                    <h3 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-wide px-4 mb-2">
                        Gerenciar Equipe
                    </h3>
                    <div className="bg-white rounded-2xl p-4">
                        <TeamManagerMobile
                            currentTeamId={teamInfo?.id || null}
                            currentTeamName={teamInfo?.name || null}
                            onTeamChange={fetchEquipmentData}
                        />
                    </div>
                </div>

                {/* Team Info Section - Members, Leader, Location */}
                <TeamInfoSection teamInfo={teamInfo} loading={loadingTeamInfo} />

                {/* Quick Actions - iOS Settings Style */}
                <div>
                    <h3 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-wide px-4 mb-2">
                        {t('mobile_app.quick_actions.title')}
                    </h3>
                    <div className="bg-white rounded-2xl overflow-hidden divide-y divide-neutral-100">
                        <ActionCard
                            icon={Receipt}
                            title={t('mobile_app.quick_actions.new_expense')}
                            subtitle={t('mobile_app.quick_actions.new_expense_desc')}
                            onClick={() => setShowExpenseModal(true)}
                        />
                        <ActionCard
                            icon={Car}
                            title={t('mobile_app.quick_actions.vehicle_status')}
                            subtitle={t('mobile_app.quick_actions.vehicle_status_desc')}
                            onClick={() => setShowStatusModal(true)}
                        />
                        <ActionCard
                            icon={FileText}
                            title={t('mobile_app.quick_actions.daily_report')}
                            subtitle={hasReportToday
                                ? t('mobile_app.quick_actions.report_completed')
                                : t('mobile_app.quick_actions.daily_report_desc')}
                            onClick={() => setShowReportModal(true)}
                            disabled={new Date().getHours() < 18 || hasReportToday}
                            disabledMessage={hasReportToday
                                ? t('mobile_app.quick_actions.report_completed')
                                : t('mobile_app.quick_actions.available_at_18')}
                        />
                        {teamEquipment.filter(e => e.status === 'accepted' || e.status === 'in_use').length > 0 && (
                            <ActionCard
                                icon={ArrowDownToLine}
                                title={t('mobile_app.quick_actions.return_equipment')}
                                subtitle={`${teamEquipment.filter(e => e.status === 'accepted' || e.status === 'in_use').length} ${t('mobile_app.quick_actions.in_custody')}`}
                                onClick={() => setShowReturnModal(true)}
                            />
                        )}
                    </div>
                </div>

                {/* Team Equipment Section */}
                <TeamEquipmentSection
                    equipment={teamEquipment}
                    pendingEquipment={pendingEquipment}
                    onAcceptSingle={handleAcceptSingleEquipment}
                    onReportIssue={handleOpenReportIssue}
                    onRefresh={fetchEquipmentData}
                />

                {/* Recent Activity - With pagination */}
                <div>
                    <h3 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-wide px-4 mb-2">
                        {t('mobile_app.activity.title')}
                    </h3>
                    <div className="bg-white rounded-2xl overflow-hidden">
                        {loadingEvents ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
                            </div>
                        ) : events.length === 0 ? (
                            <div className="text-center py-10">
                                <Activity className="h-10 w-10 text-neutral-200 mx-auto mb-2" />
                                <p className="text-[14px] text-neutral-400">{t('mobile_app.activity.no_activity')}</p>
                            </div>
                        ) : (
                            <>
                                {(showAllActivities ? events : events.slice(0, 5)).map((event, index, arr) => (
                                    <ActivityCard
                                        key={event.id}
                                        event={event}
                                        isLast={index === arr.length - 1 && (showAllActivities || events.length <= 5)}
                                    />
                                ))}
                                {events.length > 5 && (
                                    <button
                                        onClick={() => setShowAllActivities(!showAllActivities)}
                                        className="w-full py-3 text-[15px] font-medium text-blue-500
                                                   active:bg-neutral-50 transition-colors border-t border-neutral-100"
                                    >
                                        {showAllActivities ? t('mobile_app.activity.see_less') : `${t('mobile_app.activity.see_all')} (${events.length})`}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Footer - Mobile App */}
                <footer className="py-4 px-4 border-t border-neutral-100 bg-white/80">
                    <div className="flex items-center justify-center gap-4 text-[11px] text-neutral-400">
                        <span>Operium v2.1</span>
                        <span>•</span>
                        <a
                            href="mailto:support@operium.com.br?subject=Bug Report - Operium App v2.1"
                            className="flex items-center gap-1 text-red-400 active:text-red-500"
                        >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Reportar Bug
                        </a>
                    </div>
                </footer>
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
                teamVehicle={teamInfo?.vehicle_id ? {
                    id: teamInfo.vehicle_id,
                    plate: teamInfo.vehicle_plate || '',
                    model: teamInfo.vehicle_model
                } : null}
            />
            <DailyReportModal
                open={showReportModal}
                onClose={() => setShowReportModal(false)}
                onSuccess={handleReportSuccess}
                isTeamLeader={!!(teamInfo && userId && teamInfo.leader_id === userId)}
            />
            <EquipmentReturnModal
                open={showReturnModal}
                onClose={() => setShowReturnModal(false)}
                equipment={teamEquipment.filter(e => e.status === 'accepted' || e.status === 'in_use')}
                onSuccess={handleEquipmentSuccess}
            />
            <EquipmentIssueModal
                open={showIssueModal}
                onClose={() => setShowIssueModal(false)}
                equipment={selectedIssueEquipment}
                onSuccess={handleEquipmentSuccess}
            />
        </div>
    )
}
