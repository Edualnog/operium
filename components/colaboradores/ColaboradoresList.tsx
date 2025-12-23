"use client"

import { useState, useMemo, memo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  criarColaborador,
  atualizarColaborador,
  deletarColaborador,
  promoverColaborador,
  demitirColaborador,
} from "@/lib/actions"
import {
  Plus,
  Search,
  Trash2,
  Edit,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  FileDown,
  ChevronDown,
  Download,
  History,
  TrendingUp,
  Upload,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Archive,
  MoreHorizontal,
  AlertTriangle,
  HardHat,
  Briefcase,
  Clock,
  UserX
} from "lucide-react"
import SmartImport from "@/components/import/SmartImport"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/lib/hooks/useDebounce"
import { PhotoUpload } from "./PhotoUpload"
import { createClientComponentClient } from "@/lib/supabase-client"
import { CollaboratorTrustCard } from "@/components/dashboard/CollaboratorTrustCard"
import { FEATURES } from "@/lib/features"
import Image from "next/image"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { type FilterState } from "./ColaboradoresFilters"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSidebar } from "@/components/ui/sidebar"
import { useTranslation } from "react-i18next"
import { useToast } from "@/components/ui/toast-context"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

interface RoleHistoryEntry {
  role_function: string
  promoted_at: string
  notes?: string
}

interface Colaborador {
  id: string
  nome: string
  cargo?: string
  telefone?: string
  foto_url?: string | null
  data_admissao?: string | null
  email?: string | null
  cpf?: string | null
  endereco?: string | null
  observacoes?: string | null
  created_at?: string
  almox_score?: number
  level?: string
  // Operational profile fields
  role_function?: string
  seniority_bucket?: 'LESS_THAN_6_MONTHS' | '6_TO_24_MONTHS' | 'MORE_THAN_24_MONTHS'
  // Lifecycle fields
  status?: 'ATIVO' | 'DEMITIDO'
  demitido_at?: string | null
  demitido_motivo?: string | null
  role_history?: RoleHistoryEntry[]
}

interface MovimentacoesStats {
  [colaboradorId: string]: {
    retiradas: number
    devolucoes: number
    pendente: number
    retiradasFerramenta?: number
    devolucoesFerramenta?: number
  }
}

interface EPIAtivo {
  id: string
  nome: string
  quantidade: number
  validade?: string
  data_retirada?: string
  dias_restantes?: number
}

const ITEMS_PER_PAGE = 35

function ColaboradoresList({
  colaboradores: initialColaboradores,
  movimentacoesStats = {},
}: {
  colaboradores: Colaborador[]
  movimentacoesStats?: MovimentacoesStats
}) {
  const [colaboradores, setColaboradores] = useState(initialColaboradores)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Colaborador | null>(null)
  const [loading, setLoading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string>("")
  const [exporting, setExporting] = useState(false)
  const [episDialogOpen, setEpisDialogOpen] = useState(false)
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<Colaborador | null>(null)
  const [episAtivos, setEpisAtivos] = useState<EPIAtivo[]>([])
  const [loadingEpis, setLoadingEpis] = useState(false)
  const [fichaDialogOpen, setFichaDialogOpen] = useState(false)
  const [historicoMovimentacoes, setHistoricoMovimentacoes] = useState<Record<string, any[]>>({})
  const [loadingHistorico, setLoadingHistorico] = useState<Record<string, boolean>>({})
  const [exportingFicha, setExportingFicha] = useState<string | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Estado para validação de duplicatas
  const [nomeDigitado, setNomeDigitado] = useState("")
  const [colaboradoresSimilares, setColaboradoresSimilares] = useState<Colaborador[]>([])
  const [confirmarDuplicata, setConfirmarDuplicata] = useState(false)

  // Estado para dados preenchidos por voz
  const [voiceData, setVoiceData] = useState<any>(null)



  const router = useRouter()
  const supabase = createClientComponentClient()
  const { open: sidebarOpen } = useSidebar()
  const { t } = useTranslation()
  const { toast } = useToast()

  // Atualizar estado quando prop mudar
  useEffect(() => {
    setColaboradores(initialColaboradores)
  }, [initialColaboradores])

  // Estado dos filtros
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    cargo: "",
    dataAdmissaoInicio: null,
    dataAdmissaoFim: null,
    ordenarPor: "nome",
    ordem: "asc",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<"todos" | "ativos" | "inativos" | "demitidos">("ativos")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const debouncedSearch = useDebounce(filters.search, 300)

  // Clear selection when filters or page change
  useEffect(() => {
    setSelectedItems(new Set())
  }, [filters, activeTab, currentPage])

  // Debounce para verificação de nome duplicado
  const debouncedNome = useDebounce(nomeDigitado, 500)

  // Verificar se existe colaborador com nome similar
  useEffect(() => {
    if (!debouncedNome || debouncedNome.length < 3 || editing) {
      setColaboradoresSimilares([])
      setConfirmarDuplicata(false)
      return
    }

    const nomeLower = debouncedNome.toLowerCase().trim()
    const similares = colaboradores.filter((c) => {
      const colaboradorNome = c.nome.toLowerCase().trim()
      // Verificar se o nome é igual ou muito similar
      return colaboradorNome === nomeLower ||
        colaboradorNome.includes(nomeLower) ||
        nomeLower.includes(colaboradorNome)
    })

    setColaboradoresSimilares(similares)
    if (similares.length > 0) {
      setConfirmarDuplicata(false) // Reset confirmação quando encontra duplicatas
    }
  }, [debouncedNome, colaboradores, editing])

  // Recarregar EPIs quando o modal for aberto ou colaborador mudar
  useEffect(() => {
    if (episDialogOpen && colaboradorSelecionado) {
      carregarEpis(colaboradorSelecionado)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episDialogOpen, colaboradorSelecionado?.id])

  // Tamanho dos cards (legacy, but kept for compatibility if needed elsewhere, though unused in Table)
  const [cardSize, setCardSize] = useState<"pequeno" | "medio" | "grande">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("colaboradorCardSize")
      return (saved as "pequeno" | "medio" | "grande") || "medio"
    }
    return "medio"
  })

  // Obter userId para PhotoUpload
  const [userId, setUserId] = useState<string>("")

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Configuração de importação
  const importConfig = {
    title: t("dashboard.colaboradores.import.title"),
    description: t("dashboard.colaboradores.import.description"),
    templateFileName: "modelo_colaboradores.xlsx",
    columns: [
      { excelColumn: "nome", dbColumn: "nome", label: t("dashboard.colaboradores.table.name"), required: true, type: "text" },
      { excelColumn: "cargo", dbColumn: "cargo", label: t("dashboard.colaboradores.table.role"), required: false, type: "text" },
      { excelColumn: "email", dbColumn: "email", label: t("dashboard.colaboradores.table.email"), required: false, type: "text" },
      { excelColumn: "telefone", dbColumn: "telefone", label: t("dashboard.colaboradores.table.phone"), required: false, type: "text" },
      { excelColumn: "cpf", dbColumn: "cpf", label: "CPF", required: false, type: "text" },
      { excelColumn: "endereco", dbColumn: "endereco", label: t("dashboard.colaboradores.form.address"), required: false, type: "text" },
      { excelColumn: "data_admissao", dbColumn: "data_admissao", label: t("dashboard.colaboradores.form.admission_date"), required: false, type: "date" },
      { excelColumn: "observacoes", dbColumn: "observacoes", label: t("dashboard.colaboradores.form.observations"), required: false, type: "text" },
    ],
    onImport: async (data) => {
      let success = 0
      const errors: string[] = []

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        try {
          const formData = new FormData()
          Object.entries(row).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              formData.append(key, value.toString())
            }
          })
          await criarColaborador(formData)
          success++
        } catch (error: any) {
          errors.push(t("dashboard.colaboradores.import.error_creating", { line: i + 2, error: error.message || t("dashboard.colaboradores.form.error_save") }))
        }
      }

      // Atualizar lista após importação
      router.refresh()
      return { success, errors }
    }
  }

  // Filtrar e ordenar colaboradores
  const filteredAndSortedColaboradores = useMemo(() => {
    let result = [...colaboradores]

    // Busca por texto (nome, email, telefone, CPF)
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase()
      result = result.filter(
        (c) =>
          c.nome.toLowerCase().includes(searchLower) ||
          c.cargo?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower) ||
          c.telefone?.toLowerCase().includes(searchLower) ||
          c.cpf?.toLowerCase().includes(searchLower)
      )
    }

    // Filtro por cargo
    if (filters.cargo) {
      result = result.filter((c) => c.cargo === filters.cargo)
    }

    // Filtro por Tab
    if (activeTab === "ativos") {
      result = result.filter((c) => c.status !== 'DEMITIDO')
    } else if (activeTab === "demitidos") {
      result = result.filter((c) => c.status === 'DEMITIDO')
    }
    // 'todos' mostra tudo
    // 'inativos' mantido para compatibilidade futura
    if (activeTab === "inativos") {
      // Placeholder
    }

    // Filtro por data de admissão
    if (filters.dataAdmissaoInicio) {
      result = result.filter((c) => {
        if (!c.data_admissao) return false
        const dataAdmissao = new Date(c.data_admissao)
        return dataAdmissao >= filters.dataAdmissaoInicio!
      })
    }

    if (filters.dataAdmissaoFim) {
      result = result.filter((c) => {
        if (!c.data_admissao) return false
        const dataAdmissao = new Date(c.data_admissao)
        // Adicionar 1 dia para incluir o dia final
        const fim = new Date(filters.dataAdmissaoFim!)
        fim.setHours(23, 59, 59, 999)
        return dataAdmissao <= fim
      })
    }

    // Ordenação
    result.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (filters.ordenarPor) {
        case "nome":
          aValue = a.nome.toLowerCase()
          bValue = b.nome.toLowerCase()
          break
        case "cargo":
          aValue = (a.cargo || "").toLowerCase()
          bValue = (b.cargo || "").toLowerCase()
          break
        case "data_admissao":
          aValue = a.data_admissao ? new Date(a.data_admissao).getTime() : 0
          bValue = b.data_admissao ? new Date(b.data_admissao).getTime() : 0
          break
        case "created_at":
          aValue = a.created_at ? new Date(a.created_at).getTime() : 0
          bValue = b.created_at ? new Date(b.created_at).getTime() : 0
          break
        default:
          aValue = a.nome.toLowerCase()
          bValue = b.nome.toLowerCase()
      }

      if (aValue < bValue) return filters.ordem === "asc" ? -1 : 1
      if (aValue > bValue) return filters.ordem === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [colaboradores, debouncedSearch, filters, activeTab])

  const uniqueRoles = useMemo(() => {
    const roles = new Set(colaboradores.map(c => c.cargo).filter(Boolean))
    return Array.from(roles).sort()
  }, [colaboradores])

  // Counts for Tabs
  const counts = useMemo(() => {
    // Como não temos status real, retornamos total para 'ativos' e 'todos'
    return {
      todos: colaboradores.length,
      ativos: colaboradores.filter(c => c.status !== 'DEMITIDO').length,
      demitidos: colaboradores.filter(c => c.status === 'DEMITIDO').length,
      inativos: 0
    }
  }, [colaboradores])

  const totalPages = Math.ceil(filteredAndSortedColaboradores.length / ITEMS_PER_PAGE)
  const paginatedColaboradores = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAndSortedColaboradores.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredAndSortedColaboradores, currentPage])

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filters, activeTab])

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const toggleAll = () => {
    if (selectedItems.size === filteredAndSortedColaboradores.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredAndSortedColaboradores.map(c => c.id)))
    }
  }

  const handleExportPDF = async () => {
    if (selectedItems.size === 0) {
      toast.error("Selecione pelo menos um item para exportar")
      return
    }

    try {
      setLoading(true)
      const { jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF()

      const itemsToExport = colaboradores.filter(c => selectedItems.has(c.id))

      const tableData = itemsToExport.map(item => [
        item.nome,
        item.cargo || "-",
        item.email || "-",
        item.telefone || "-",
        item.data_admissao ? format(new Date(item.data_admissao), 'dd/MM/yyyy') : "-"
      ])

      autoTable(doc, {
        head: [['Nome', 'Cargo', 'Email', 'Telefone', 'Admissão']],
        body: tableData,
      })

      doc.save("colaboradores.pdf")
      toast.success("PDF exportado com sucesso")
    } catch (error) {
      console.error("Erro ao exportar PDF:", error)
      toast.error("Erro ao gerar PDF")
    } finally {
      setLoading(false)
    }
  }

  const handleExportSelectedCSV = () => {
    if (selectedItems.size === 0) {
      toast.error("Selecione pelo menos um item para exportar")
      return
    }
    const itemsToExport = colaboradores.filter(c => selectedItems.has(c.id))

    // Create CSV content
    const headers = ["Nome", "Cargo", "Email", "Telefone", "CPF", "Endereço", "Data Admissão", "Observações"]
    const csvContent = [
      headers.join(","),
      ...itemsToExport.map(c => [
        `"${c.nome}"`,
        `"${c.cargo || ""}"`,
        `"${c.email || ""}"`,
        `"${c.telefone || ""}"`,
        `"${c.cpf || ""}"`,
        `"${c.endereco || ""}"`,
        `"${c.data_admissao ? format(new Date(c.data_admissao), 'yyyy-MM-dd') : ""}"`,
        `"${c.observacoes || ""}"`
      ].join(","))
    ].join("\n")

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `colaboradores_selecionados_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Verificar se há duplicatas e não foi confirmado
    if (!editing && colaboradoresSimilares.length > 0 && !confirmarDuplicata) {
      return // Não permite submit sem confirmação
    }

    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      // Adicionar foto_url ao formData se houver
      if (photoUrl) {
        formData.set("foto_url", photoUrl)
      }

      if (editing) {
        await atualizarColaborador(editing.id, formData)
      } else {
        await criarColaborador(formData)
      }

      setOpen(false)
      setEditing(null)
      setPhotoUrl("")
      setNomeDigitado("")
      setColaboradoresSimilares([])
      setConfirmarDuplicata(false)
      router.refresh()
    } catch (error) {
      toast.error(t("dashboard.colaboradores.form.error_save"))
    } finally {
      setLoading(false)
    }
  }

  // Funções auxiliares mantidas (carregarEpis, handleDelete, etc)
  const carregarEpis = async (colaborador: Colaborador) => {
    if (!colaborador) return
    setLoadingEpis(true)
    try {
      const supabase = createClientComponentClient()
      const { data: user } = await supabase.auth.getUser()
      if (!user?.user) return

      const { data: movimentacoes } = await supabase
        .from("movimentacoes")
        .select(`id, ferramenta_id, tipo, quantidade, data`)
        .eq("profile_id", user.user.id)
        .eq("colaborador_id", colaborador.id)
        .in("tipo", ["retirada", "devolucao"])
        .order("data", { ascending: false })

      if (!movimentacoes || movimentacoes.length === 0) {
        setEpisAtivos([])
        return
      }

      const ferramentaIds = Array.from(new Set(movimentacoes.map((m: any) => m.ferramenta_id).filter((id: any) => id != null)))
      const { data: ferramentasInfo } = await supabase
        .from("ferramentas")
        .select("id, nome, tipo_item, validade, categoria")
        .eq("profile_id", user.user.id)
        .in("id", ferramentaIds)

      const ferramentasMap = new Map()
      ferramentasInfo?.forEach((f: any) => ferramentasMap.set(f.id, f))

      const movimentacoesCompletas = movimentacoes.map((mov: any) => ({
        ...mov,
        ferramentas: ferramentasMap.get(mov.ferramenta_id) || null
      }))

      // Contador de retiradas e devoluções por EPI simplified
      const contadorEpis: Record<string, any> = {}
      movimentacoesCompletas.forEach((mov: any) => {
        const ferramenta = mov.ferramentas
        // Simple check logic for EPI
        if (!ferramenta) return
        if (ferramenta.tipo_item !== 'epi' && !ferramenta.nome.toLowerCase().includes('capacete') && !ferramenta.categoria?.toLowerCase().includes('epi')) return

        const id = mov.ferramenta_id
        if (!contadorEpis[id]) {
          contadorEpis[id] = { retiradas: 0, devolucoes: 0, ferramenta }
        }
        if (mov.tipo === 'retirada') contadorEpis[id].retiradas += (mov.quantidade || 0)
        if (mov.tipo === 'devolucao') contadorEpis[id].devolucoes += (mov.quantidade || 0)
      })

      const episAtivosList: EPIAtivo[] = []
      Object.entries(contadorEpis).forEach(([id, stats]: [string, any]) => {
        const saldo = stats.retiradas - stats.devolucoes
        if (saldo > 0) {
          episAtivosList.push({
            id,
            nome: stats.ferramenta.nome,
            quantidade: saldo
          })
        }
      })
      setEpisAtivos(episAtivosList)

    } catch (err) {
      console.error(err)
      setEpisAtivos([])
    } finally {
      setLoadingEpis(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("dashboard.colaboradores.card.confirm_delete"))) return

    try {
      await deletarColaborador(id)
      router.refresh()
    } catch (error) {
      toast.error(t("dashboard.colaboradores.card.error_delete"))
    }
  }

  const handleEdit = (colaborador: Colaborador) => {
    setEditing(colaborador)
    setPhotoUrl(colaborador.foto_url || "")
    setOpen(true)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setEditing(null)
      setPhotoUrl("")
      setNomeDigitado("")
      setColaboradoresSimilares([])
      setConfirmarDuplicata(false)
    }
  }

  const handleAbrirFicha = async (colaborador: Colaborador) => {
    setColaboradorSelecionado(colaborador)
    setFichaDialogOpen(true)
    await carregarEpis(colaborador)
  }

  // Promote handler - opens promote dialog
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)
  const [promoteTarget, setPromoteTarget] = useState<Colaborador | null>(null)
  const [promoteNewRole, setPromoteNewRole] = useState("")
  const [promoteNotes, setPromoteNotes] = useState("")
  const [promoteLoading, setPromoteLoading] = useState(false)

  const handlePromote = (colaborador: Colaborador) => {
    setPromoteTarget(colaborador)
    setPromoteNewRole("")
    setPromoteNotes("")
    setPromoteDialogOpen(true)
  }

  const handlePromoteSubmit = async () => {
    if (!promoteTarget || !promoteNewRole.trim()) return
    setPromoteLoading(true)
    try {
      await promoverColaborador(promoteTarget.id, promoteNewRole.trim(), promoteNotes.trim() || undefined)
      toast.success("Colaborador promovido com sucesso!")
      setPromoteDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error("Erro ao promover colaborador")
    } finally {
      setPromoteLoading(false)
    }
  }

  // Dismiss handler - opens dismiss dialog
  const [demitirDialogOpen, setDemitirDialogOpen] = useState(false)
  const [demitirTarget, setDemitirTarget] = useState<Colaborador | null>(null)
  const [demitirMotivo, setDemitirMotivo] = useState("")
  const [demitirLoading, setDemitirLoading] = useState(false)

  const handleDemitir = (colaborador: Colaborador) => {
    setDemitirTarget(colaborador)
    setDemitirMotivo("")
    setDemitirDialogOpen(true)
  }

  const handleDemitirSubmit = async () => {
    if (!demitirTarget || !demitirMotivo.trim()) return
    setDemitirLoading(true)
    try {
      await demitirColaborador(demitirTarget.id, demitirMotivo.trim())
      toast.success("Colaborador demitido. Registros preservados.")
      setDemitirDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error("Erro ao demitir colaborador")
    } finally {
      setDemitirLoading(false)
    }
  }

  // History handler - opens history dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [historyTarget, setHistoryTarget] = useState<Colaborador | null>(null)

  const handleViewHistory = (colaborador: Colaborador) => {
    setHistoryTarget(colaborador)
    setHistoryDialogOpen(true)
  }

  return (
    <div className="space-y-4">


      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full sm:w-auto">
          <TabsList className="bg-transparent p-0">
            <TabsTrigger className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2" value="ativos">{t("dashboard.ferramentas.tabs.active")} ({counts.ativos})</TabsTrigger>
            <TabsTrigger className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2" value="demitidos">Demitidos ({counts.demitidos})</TabsTrigger>
            <TabsTrigger className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2" value="todos">{t("dashboard.ferramentas.tabs.all")} ({counts.todos})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 w-full sm:w-auto items-center">
          <Button onClick={() => setOpen(true)} className="gap-2 flex-1 sm:flex-none bg-[#37352f] hover:bg-zinc-800 text-white h-11 sm:h-10">
            <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t("dashboard.colaboradores.new_button")}</span>
          </Button>

          <Button variant="outline" onClick={() => setImportModalOpen(true)} className="gap-2 h-11 sm:h-10">
            <Upload className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t("dashboard.colaboradores.import_button")}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 sm:h-10">
                <FileDown className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("dashboard.colaboradores.export_button").split(' ')[0]}</span>
                <ChevronLeft className="ml-0 sm:ml-2 h-4 w-4 rotate-[-90deg]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportSelectedCSV}>
                <FileDown className="mr-2 h-4 w-4" /> Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-md border shadow-sm">
        {/* Search Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("dashboard.colaboradores.search_placeholder")}
                  className="pl-8"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    {t("dashboard.colaboradores.filters.advanced_filters")} <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("dashboard.colaboradores.filters.role")}</Label>
                      <Select
                        value={filters.cargo || "all"}
                        onValueChange={(v) => setFilters(prev => ({ ...prev, cargo: v === "all" ? "" : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("dashboard.colaboradores.filters.all_roles")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("dashboard.colaboradores.filters.all_roles")}</SelectItem>
                          {uniqueRoles.map((role: any) => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-0 text-muted-foreground"
                      onClick={() => setFilters(prev => ({ ...prev, cargo: "", dataAdmissaoInicio: null, dataAdmissaoFim: null }))}
                    >
                      {t("dashboard.colaboradores.filters.clear")}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Selection Info */}
        <div className="bg-zinc-50 p-2 border-b flex items-center justify-between dark:bg-zinc-800/50">
          <span className="text-sm text-zinc-600 dark:text-zinc-400 pl-2">
            {t("dashboard.colaboradores.list.selected_count", { count: selectedItems.size, total: filteredAndSortedColaboradores.length })}
          </span>
          <Button variant="outline" size="sm" className="bg-white dark:bg-zinc-800 text-zinc-700 border-zinc-200 hover:text-zinc-900">
            {t("dashboard.colaboradores.list.bulk_actions")} <ChevronLeft className="ml-2 h-4 w-4 rotate-[-90deg]" />
          </Button>
        </div>

        {/* Desktop Table - Hidden on mobile */}
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow className="bg-zinc-50/50 dark:bg-zinc-800/50">
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={selectedItems.size === filteredAndSortedColaboradores.length && filteredAndSortedColaboradores.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>{t("dashboard.colaboradores.table.name")}</TableHead>
              <TableHead>{t("dashboard.colaboradores.table.role")}</TableHead>
              <TableHead>{t("dashboard.colaboradores.table.email")} / {t("dashboard.colaboradores.table.phone")}</TableHead>
              <TableHead>{t("dashboard.colaboradores.table.admission_date")}</TableHead>
              <TableHead className="text-right">{t("dashboard.colaboradores.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedColaboradores.map((colaborador) => (
              <TableRow key={colaborador.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedItems.has(colaborador.id)}
                    onCheckedChange={() => toggleSelection(colaborador.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-zinc-100 overflow-hidden relative border flex-shrink-0">
                      {colaborador.foto_url ? (
                        <Image src={colaborador.foto_url} alt={colaborador.nome} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                          <User size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-start">
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">{colaborador.nome}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium leading-4",
                          (colaborador.level === 'MASTER' || !colaborador.level) ? "bg-[#fdecc8] text-[#442a1d]" :
                            colaborador.level === 'PRO' ? "bg-[#e3e2e0] text-[#32302c]" :
                              colaborador.level === 'MEMBER' ? "bg-[#fadec9] text-[#49290e]" :
                                "bg-[#f1f0ef] text-[#37352f]"
                        )}>
                          <span className="mr-1 opacity-80">
                            {colaborador.level === 'MASTER' ? '🥇' :
                              colaborador.level === 'PRO' ? '🥈' :
                                colaborador.level === 'MEMBER' ? '👷' : '🐣'}
                          </span>
                          {colaborador.almox_score || 500}
                        </span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {colaborador.role_function ? (
                    <Badge variant="outline" className="font-normal">{colaborador.role_function}</Badge>
                  ) : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm text-zinc-600">
                    <span>{colaborador.email || "-"}</span>
                    <span className="text-xs text-zinc-400">{colaborador.telefone || "-"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {colaborador.data_admissao ? format(new Date(colaborador.data_admissao), 'dd/MM/yyyy') : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Ver EPIs / Ficha"
                      className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      onClick={() => handleAbrirFicha(colaborador)}
                    >
                      <HardHat className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(colaborador)}>
                          <Edit className="mr-2 h-4 w-4" /> {t("dashboard.colaboradores.card.edit")}
                        </DropdownMenuItem>
                        {colaborador.status !== 'DEMITIDO' && (
                          <>
                            <DropdownMenuItem onClick={() => handlePromote(colaborador)}>
                              <TrendingUp className="mr-2 h-4 w-4" /> Promover
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewHistory(colaborador)}>
                              <Clock className="mr-2 h-4 w-4" /> Ver Histórico
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-orange-600" onClick={() => handleDemitir(colaborador)}>
                              <UserX className="mr-2 h-4 w-4" /> Demitir
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(colaborador.id)}>
                          <Archive className="mr-2 h-4 w-4" /> {t("dashboard.colaboradores.card.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-700">
          {paginatedColaboradores.map((colaborador) => (
            <div
              key={colaborador.id}
              className="p-4 space-y-3 active:bg-zinc-50 cursor-pointer dark:active:bg-zinc-800"
              onClick={() => handleAbrirFicha(colaborador)}
            >
              {/* Header: Photo + Name + Score */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-zinc-100 overflow-hidden relative border flex-shrink-0">
                  {colaborador.foto_url ? (
                    <Image src={colaborador.foto_url} alt={colaborador.nome} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <User size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{colaborador.nome}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {colaborador.role_function && (
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{colaborador.role_function}</span>
                    )}
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                      (colaborador.level === 'MASTER' || !colaborador.level) ? "bg-[#fdecc8] text-[#442a1d]" :
                        colaborador.level === 'PRO' ? "bg-[#e3e2e0] text-[#32302c]" : "bg-[#f1f0ef] text-[#37352f]"
                    )}>
                      {colaborador.level === 'MASTER' ? '🥇' : colaborador.level === 'PRO' ? '🥈' : '👷'} {colaborador.almox_score || 500}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(colaborador); }}>
                      <Edit className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAbrirFicha(colaborador); }}>
                      <HardHat className="mr-2 h-4 w-4" /> Ver Ficha
                    </DropdownMenuItem>
                    {colaborador.status !== 'DEMITIDO' && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePromote(colaborador); }}>
                        <TrendingUp className="mr-2 h-4 w-4" /> Promover
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Contact Info */}
              <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                <span className="truncate max-w-[60%]">{colaborador.telefone || colaborador.email || "—"}</span>
                <span>{colaborador.data_admissao ? format(new Date(colaborador.data_admissao), 'dd/MM/yy') : "—"}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {filteredAndSortedColaboradores.length > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-zinc-500">
              {t("dashboard.ferramentas.pagination.showing", { count: paginatedColaboradores.length, total: filteredAndSortedColaboradores.length })}
            </div>
            <div className="flex gap-1 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editing ? t("dashboard.colaboradores.form.title_edit") : t("dashboard.colaboradores.form.title_new")}
              </DialogTitle>
              <DialogDescription>
                {editing ? t("dashboard.colaboradores.form.desc_edit") : t("dashboard.colaboradores.form.desc_new")}
              </DialogDescription>
            </DialogHeader>

            {/* Memory Layer (Internal Only) */}
            {editing && FEATURES.OBSERVER_INTERNAL_VIEW && (
              <div className="mb-4">
                <CollaboratorTrustCard colaboradorId={editing.id} />
              </div>
            )}

            {!editing && colaboradoresSimilares.length > 0 && !confirmarDuplicata && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-yellow-800">
                      {t("dashboard.colaboradores.duplicates.warning_title")}
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {t("dashboard.colaboradores.duplicates.warning_message")}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {colaboradoresSimilares.map(c => (
                        <li key={c.id} className="text-sm text-yellow-700 flex items-center gap-2">
                          <User size={14} />
                          <span className="font-medium">{c.nome}</span>
                          <span className="text-yellow-600">({c.cargo || t("dashboard.colaboradores.table.no_role")})</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="bg-white border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                        onClick={() => setConfirmarDuplicata(true)}
                      >
                        {t("dashboard.colaboradores.duplicates.ignorar")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}


            <ScrollableFormContent>
              <div className="space-y-4 py-2">

                {/* 1. DADOS PESSOAIS */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-4">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <User className="h-4 w-4 text-zinc-500" />
                    {t("dashboard.colaboradores.form.section_personal")}
                  </h3>

                  {/* Foto centralizada no topo */}
                  {/* Layout vertical: Foto (esquerda) + Nome (embaixo, maior) */}
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-start">
                      <PhotoUpload
                        currentPhotoUrl={photoUrl}
                        onPhotoUploaded={setPhotoUrl}
                        userId={userId}
                      />
                    </div>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="nome">
                          {t("dashboard.colaboradores.form.name")} *
                          {editing?.nome && <span className="text-xs text-zinc-500 ml-2">(imutável)</span>}
                        </Label>
                        {/* Hidden input to preserve value when field is disabled */}
                        {editing?.nome && (
                          <input type="hidden" name="nome" value={editing.nome} />
                        )}
                        <Input
                          id="nome"
                          name={editing?.nome ? "nome_display" : "nome"}
                          defaultValue={editing?.nome || voiceData?.nome || ""}
                          value={editing?.nome ? undefined : nomeDigitado}
                          onChange={editing?.nome ? undefined : (e) => setNomeDigitado(e.target.value)}
                          placeholder="Nome completo"
                          required={!editing?.nome}
                          disabled={!!editing?.nome}
                          className={`bg-white dark:bg-zinc-900 h-12 text-lg ${editing?.nome ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. CONTATO */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-4">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-zinc-500" />
                    {t("dashboard.colaboradores.form.section_contact")}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">{t("dashboard.colaboradores.form.email")}</Label>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          defaultValue={editing?.email || voiceData?.email || ""}
                          className="pl-9 bg-white dark:bg-zinc-900"
                          placeholder="email@empresa.com"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="telefone">{t("dashboard.colaboradores.form.phone")}</Label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                        <Input
                          id="telefone"
                          name="telefone"
                          defaultValue={editing?.telefone || voiceData?.telefone || ""}
                          className="pl-9 bg-white dark:bg-zinc-900"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="endereco">{t("dashboard.colaboradores.form.address")}</Label>
                      <div className="relative">
                        <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                        <Input
                          id="endereco"
                          name="endereco"
                          defaultValue={editing?.endereco || ""}
                          className="pl-9 bg-white dark:bg-zinc-900"
                          placeholder="Endereço completo"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. PROFISSIONAL */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-4">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-zinc-500" />
                    {t("dashboard.colaboradores.form.section_professional")}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="role_function">
                        {t("dashboard.colaboradores.form.role_function")} *
                        {editing?.role_function && <span className="text-xs text-zinc-500 ml-2">(imutável)</span>}
                      </Label>
                      {/* Hidden input to preserve value when field is disabled */}
                      {editing?.role_function && (
                        <input type="hidden" name="role_function" value={editing.role_function} />
                      )}
                      <Input
                        id="role_function"
                        name={editing?.role_function ? "role_function_display" : "role_function"}
                        defaultValue={editing?.role_function || ""}
                        placeholder={t("dashboard.colaboradores.form.role_function_placeholder")}
                        required={!editing?.role_function}
                        disabled={!!editing?.role_function}
                        className={`bg-white dark:bg-zinc-900 ${editing?.role_function ? 'opacity-60 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="seniority_bucket">
                        {t("dashboard.colaboradores.form.seniority_bucket")} *
                        {editing?.seniority_bucket && <span className="text-xs text-zinc-500 ml-2">(imutável)</span>}
                      </Label>
                      {/* Hidden input to preserve value when field is disabled */}
                      {editing?.seniority_bucket && (
                        <input type="hidden" name="seniority_bucket" value={editing.seniority_bucket} />
                      )}
                      <Select
                        name={editing?.seniority_bucket ? "seniority_bucket_display" : "seniority_bucket"}
                        defaultValue={editing?.seniority_bucket || ""}
                        required={!editing?.seniority_bucket}
                        disabled={!!editing?.seniority_bucket}
                      >
                        <SelectTrigger className={`bg-white dark:bg-zinc-900 ${editing?.seniority_bucket ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          <SelectValue placeholder={t("dashboard.colaboradores.form.seniority_placeholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LESS_THAN_6_MONTHS">
                            {t("dashboard.colaboradores.form.seniority_options.LESS_THAN_6_MONTHS")}
                          </SelectItem>
                          <SelectItem value="6_TO_24_MONTHS">
                            {t("dashboard.colaboradores.form.seniority_options.6_TO_24_MONTHS")}
                          </SelectItem>
                          <SelectItem value="MORE_THAN_24_MONTHS">
                            {t("dashboard.colaboradores.form.seniority_options.MORE_THAN_24_MONTHS")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="data_admissao">{t("dashboard.colaboradores.form.admission_date")}</Label>
                      <Input
                        id="data_admissao"
                        name="data_admissao"
                        type="date"
                        defaultValue={editing?.data_admissao ? new Date(editing.data_admissao).toISOString().split('T')[0] : ""}
                        className="bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="observacoes">{t("dashboard.colaboradores.form.observations")}</Label>
                      <Input
                        id="observacoes"
                        name="observacoes"
                        defaultValue={editing?.observacoes || ""}
                        placeholder="Observações adicionais..."
                        className="bg-white dark:bg-zinc-900"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </ScrollableFormContent>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("dashboard.colaboradores.form.cancel")}
              </Button>
              <Button type="submit" disabled={loading} className="bg-[#37352f] hover:bg-zinc-800 text-white">
                {loading ? t("dashboard.colaboradores.form.saving") : t("dashboard.colaboradores.form.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {importModalOpen && (
        <SmartImport
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImport={importConfig.onImport}
          entityType="collaborators"
          requiredFields={["nome"]}
          title={t("dashboard.colaboradores.import.title")}
        />
      )}

      {fichaDialogOpen && colaboradorSelecionado && (
        <Dialog open={fichaDialogOpen} onOpenChange={setFichaDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t("dashboard.colaboradores.details.file_title", { name: colaboradorSelecionado.nome })}</DialogTitle>
            </DialogHeader>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <HardHat className="h-5 w-5 text-orange-600" />
                  {t("dashboard.colaboradores.details.active_epis")}
                </h4>
                {loadingEpis ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin h-8 w-8 text-zinc-400" />
                  </div>
                ) : (
                  episAtivos.length > 0 ? (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("dashboard.colaboradores.details.table.item")}</TableHead>
                            <TableHead className="text-right">{t("dashboard.colaboradores.details.table.qty")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {episAtivos.map(epi => (
                            <TableRow key={epi.id}>
                              <TableCell className="font-medium">{epi.nome}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary" className="font-mono">
                                  {epi.quantidade}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed">
                      <p>{t("dashboard.colaboradores.details.no_active_epis")}</p>
                    </div>
                  )
                )}
              </div>

            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Promote Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Promover Colaborador
            </DialogTitle>
            <DialogDescription>
              Registrar promoção de {promoteTarget?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cargo Atual</Label>
              <div className="text-sm text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded">
                {promoteTarget?.role_function || "Não definido"}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newRole">Novo Cargo *</Label>
              <Input
                id="newRole"
                value={promoteNewRole}
                onChange={(e) => setPromoteNewRole(e.target.value)}
                placeholder="Ex: Mecânico Sênior"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promoteNotes">Observações</Label>
              <Input
                id="promoteNotes"
                value={promoteNotes}
                onChange={(e) => setPromoteNotes(e.target.value)}
                placeholder="Motivo da promoção..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePromoteSubmit} disabled={promoteLoading || !promoteNewRole.trim()}>
              {promoteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Promover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Demitir Dialog */}
      <Dialog open={demitirDialogOpen} onOpenChange={setDemitirDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <UserX className="h-5 w-5" />
              Demitir Colaborador
            </DialogTitle>
            <DialogDescription>
              Esta ação marcará {demitirTarget?.nome} como demitido. Os registros serão preservados para análise.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="demitirMotivo">Motivo da Demissão *</Label>
              <Input
                id="demitirMotivo"
                value={demitirMotivo}
                onChange={(e) => setDemitirMotivo(e.target.value)}
                placeholder="Ex: Término de contrato, solicitação..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDemitirDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDemitirSubmit} disabled={demitirLoading || !demitirMotivo.trim()}>
              {demitirLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Demissão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Histórico de Cargos
            </DialogTitle>
            <DialogDescription>
              Linha do tempo de {historyTarget?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {historyTarget?.role_history && historyTarget.role_history.length > 0 ? (
              <div className="relative pl-6 space-y-4">
                {/* Timeline line */}
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-zinc-200 dark:bg-zinc-700" />

                {historyTarget.role_history.map((entry, idx) => (
                  <div key={idx} className="relative">
                    {/* Timeline dot */}
                    <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 ${idx === historyTarget.role_history!.length - 1
                      ? "bg-emerald-500 border-emerald-500"
                      : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600"
                      }`} />

                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {entry.role_function}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {format(new Date(entry.promoted_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      {entry.notes && (
                        <div className="text-xs text-zinc-400 mt-1 italic">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                Sem histórico de promoções registrado
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ScrollableFormContent({ children }: { children: React.ReactNode }) {
  return <div className="max-h-[60vh] overflow-y-auto pr-2">{children}</div>
}

export default memo(ColaboradoresList)
