"use client"

import { useMemo, useState, useEffect, Fragment } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Search, Plus, Package, RotateCcw, PackageMinus, PackagePlus, FileDown, Filter, FileSignature, Eye, Printer, MoreHorizontal, Star, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Settings, ArrowRight, ArrowLeft, Zap } from "lucide-react"
import { MovimentacoesFilters, type FilterState } from "./MovimentacoesFilters"
import { cn } from "@/lib/utils"
import TermoResponsabilidadeModal from "@/components/signature/TermoResponsabilidadeModal"
import MovimentacaoDetailModal from "./MovimentacaoDetailModal"
import { useTranslation } from "react-i18next"
import { useToast } from "@/components/ui/toast-context"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// ... existing imports ...

interface Movimentacao {
  id: string
  tipo: "entrada" | "retirada" | "devolucao" | "ajuste" | "conserto"
  quantidade: number
  observacoes?: string | null
  data?: string | null
  ferramentas?: { nome: string; tipo_item?: string | null } | null
  colaboradores?: { nome: string } | null
}

interface Ferramenta {
  id: string
  nome: string
  tipo_item?: string | null
  quantidade_disponivel?: number | null
  codigo?: string | null
}

interface Colaborador {
  id: string
  nome: string
}

const ITEMS_PER_PAGE = 35

import { QRScanner } from "@/components/ferramentas/QRScanner"

export default function MovimentacoesList({
  movimentacoes: initialMovs,
  ferramentas,
  colaboradores,
}: {
  movimentacoes: Movimentacao[]
  ferramentas: Ferramenta[]
  colaboradores: Colaborador[]
}) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { t } = useTranslation()
  const { toast } = useToast()

  // Scanner State
  const [isScanning, setIsScanning] = useState(false)
  const handleScanResult = (decodedText: string) => {
    const scannedValue = decodedText.trim()
    const scannedValueUpper = scannedValue.toUpperCase()

    // Search for product by:
    // 1. Exact ID match (UUIDs are case-insensitive in most DBs)
    // 2. Codigo (SKU) match
    // 3. Name match
    const found = ferramentas.find(f =>
      f.id.toLowerCase() === scannedValue.toLowerCase() ||
      (f.codigo && f.codigo.toUpperCase() === scannedValueUpper) ||
      f.nome.toUpperCase() === scannedValueUpper
    )

    if (found) {
      setIsScanning(false)
      toast.success(`Item encontrado: ${found.nome}`)

      // Open New Movement Dialog with this item pre-selected
      setForm(prev => ({
        ...prev,
        tipo: "retirada",
        produto: found.nome,
        produtoId: found.id,
        quantidade: "1"
      }))
      setOpen(true)
    } else {
      toast.error(`Item não encontrado: ${scannedValue.substring(0, 20)}...`)
    }
  }
  const [movimentacoes, setMovimentacoes] = useState(initialMovs)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [starredIds, setStarredIds] = useState<string[]>([])
  const [showStarredOnly, setShowStarredOnly] = useState(false)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    tipo: "entrada" as "entrada" | "retirada" | "devolucao",
    produto: "",
    produtoId: "",
    quantidade: "1",
    colaboradorId: "",
    colaboradorNome: "",
    observacoes: "",
    dataMov: new Date().toISOString().slice(0, 16),
  })
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)


  // Estados para assinatura digital
  const [solicitarAssinatura, setSolicitarAssinatura] = useState(true)
  const [termoModalOpen, setTermoModalOpen] = useState(false)
  const [movimentacaoParaAssinar, setMovimentacaoParaAssinar] = useState<{
    id: string
    colaborador: { id: string; nome: string; cargo?: string; cpf?: string }
    itens: { id: string; nome: string; quantidade: number; tipo_item?: string }[]
    tipo: "retirada" | "devolucao"
    initialSignature?: string | null
  } | null>(null)



  const [openExportDialog, setOpenExportDialog] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [periodoRapido, setPeriodoRapido] = useState<"hoje" | "ontem" | "selecionar" | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState<string>("")
  const [filters, setFilters] = useState<FilterState>({
    tipo: "todos",
    dataInicio: null,
    dataFim: null,
    produtoId: "",
    colaboradorId: "",
  })

  // State for tabs - defined after filters to avoid reference error
  const [activeTab, setActiveTab] = useState<"todos" | "entrada" | "retirada" | "devolucao">("todos")

  // Sync activeTab with filters.tipo
  useEffect(() => {
    if (["todos", "entrada", "retirada", "devolucao"].includes(filters.tipo)) {
      setActiveTab(filters.tipo as any)
    }
  }, [filters.tipo])

  // Atualizar filtros quando período rápido mudar
  useEffect(() => {
    if (periodoRapido === "hoje") {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const fimHoje = new Date()
      fimHoje.setHours(23, 59, 59, 999)
      setFilters(prev => ({
        ...prev,
        dataInicio: hoje,
        dataFim: fimHoje,
      }))
      setDataSelecionada("")
    } else if (periodoRapido === "ontem") {
      const ontem = new Date()
      ontem.setDate(ontem.getDate() - 1)
      ontem.setHours(0, 0, 0, 0)
      const fimOntem = new Date(ontem)
      fimOntem.setHours(23, 59, 59, 999)
      setFilters(prev => ({
        ...prev,
        dataInicio: ontem,
        dataFim: fimOntem,
      }))
      setDataSelecionada("")
    } else if (periodoRapido === "selecionar" && dataSelecionada) {
      const data = new Date(dataSelecionada)
      data.setHours(0, 0, 0, 0)
      const fimData = new Date(data)
      fimData.setHours(23, 59, 59, 999)
      setFilters(prev => ({
        ...prev,
        dataInicio: data,
        dataFim: fimData,
      }))
    } else if (periodoRapido === null) {
      // Só limpar se não houver filtros de data manualmente definidos
      setFilters(prev => {
        // Se os filtros de data foram definidos manualmente (não pelo período rápido), manter
        // Caso contrário, limpar
        if (prev.dataInicio || prev.dataFim) {
          // Verificar se os filtros são do período rápido ou manual
          // Se não houver período rápido ativo, limpar
          return {
            ...prev,
            dataInicio: null,
            dataFim: null,
          }
        }
        return prev
      })
      setDataSelecionada("")
    }
  }, [periodoRapido, dataSelecionada])
  const [exportFilters, setExportFilters] = useState({
    tipo: "todos" as "todos" | "entrada" | "retirada" | "devolucao" | "conserto",
    dataInicio: "",
    dataFim: "",
    produtoId: "",
    colaboradorId: "",
  })


  // Estado para modal de detalhes da movimentação
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedMovimentacaoId, setSelectedMovimentacaoId] = useState<string | null>(null)

  // Atualizar lista quando initialMovs mudar (após router.refresh())
  useEffect(() => {
    console.log("📋 Movimentações atualizadas:", initialMovs.length)
    setMovimentacoes(initialMovs)
  }, [initialMovs])

  // Carregar favoritos do localStorage (cliente) e manter somente IDs ainda presentes
  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem("movimentacoes_starred_v1")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setStarredIds(parsed.filter((id) => initialMovs.some((m) => m.id === id)))
        }
      } catch {
        // ignora
      }
    }
  }, [initialMovs])

  // Persistir favoritos no localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("movimentacoes_starred_v1", JSON.stringify(starredIds))
  }, [starredIds])

  // Limpar seleção de IDs removidos ao atualizar lista
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => initialMovs.some((m) => m.id === id)))
  }, [initialMovs])

  const filtered = useMemo(() => {
    let result = [...movimentacoes]

    // Filtro por busca de texto
    if (search) {
      const s = search.toLowerCase()
      result = result.filter((m) => {
        const nome = (m.ferramentas?.nome || "").toLowerCase()
        const colab = (m.colaboradores?.nome || "").toLowerCase()
        return nome.includes(s) || colab.includes(s) || m.tipo.includes(s)
      })
    }

    // Filtro por tipo
    if (filters.tipo !== "todos") {
      result = result.filter((m) => m.tipo === filters.tipo)
    }

    // Filtro por produto
    if (filters.produtoId) {
      result = result.filter((m) => {
        const produto = ferramentas.find((f) => f.id === filters.produtoId)
        if (!produto) return false
        return m.ferramentas?.nome === produto.nome
      })
    }

    // Filtro por colaborador
    if (filters.colaboradorId) {
      result = result.filter((m) => {
        const colaborador = colaboradores.find((c) => c.id === filters.colaboradorId)
        if (!colaborador) return false
        return m.colaboradores?.nome === colaborador.nome
      })
    }

    // Filtro por data início
    if (filters.dataInicio) {
      const inicio = new Date(filters.dataInicio)
      inicio.setHours(0, 0, 0, 0)
      result = result.filter((m) => {
        if (!m.data) return false
        const dataMov = new Date(m.data)
        return dataMov >= inicio
      })
    }

    // Filtro por data fim
    if (filters.dataFim) {
      const fim = new Date(filters.dataFim)
      fim.setHours(23, 59, 59, 999)
      result = result.filter((m) => {
        if (!m.data) return false
        const dataMov = new Date(m.data)
        return dataMov <= fim
      })
    }

    if (showStarredOnly) {
      result = result.filter((m) => starredIds.includes(m.id))
    }

    return result
  }, [movimentacoes, search, filters, ferramentas, colaboradores, showStarredOnly, starredIds])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedMovimentacoes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, currentPage])

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filters, periodoRapido])

  const suggestions = useMemo(() => {
    // Não mostrar sugestões se já há um produto selecionado
    if (form.produtoId) return []

    const s = form.produto.toLowerCase()
    if (!s) return []

    // Verificar se o texto digitado corresponde exatamente a algum produto selecionado
    const produtoSelecionado = ferramentas.find(f => f.id === form.produtoId)
    if (produtoSelecionado && form.produto.toLowerCase() === produtoSelecionado.nome.toLowerCase()) {
      return []
    }

    return ferramentas
      .filter((f) => f.nome.toLowerCase().includes(s))
      .slice(0, 5)
  }, [form.produto, form.produtoId, ferramentas])

  const colabSuggestions = useMemo(() => {
    // Não mostrar sugestões se já há um colaborador selecionado
    if (form.colaboradorId) return []

    const s = form.colaboradorNome.toLowerCase()
    if (!s) return []

    // Verificar se o texto digitado corresponde exatamente a algum colaborador selecionado
    const colaboradorSelecionado = colaboradores.find(c => c.id === form.colaboradorId)
    if (colaboradorSelecionado && form.colaboradorNome.toLowerCase() === colaboradorSelecionado.nome.toLowerCase()) {
      return []
    }

    return colaboradores.filter((c) => c.nome.toLowerCase().includes(s)).slice(0, 5)
  }, [form.colaboradorNome, form.colaboradorId, colaboradores])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.produtoId) {
      toast.error(t("dashboard.movimentacoes.form.select_product"))
      return
    }
    if (form.tipo !== "entrada" && !form.colaboradorId) {
      toast.error(t("dashboard.movimentacoes.form.select_collaborator"))
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/movimentacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: form.tipo,
          ferramenta_id: form.produtoId,
          quantidade: Number(form.quantidade),
          colaborador_id: form.colaboradorId || undefined,
          observacoes: form.observacoes || undefined,
          data: form.dataMov ? new Date(form.dataMov).toISOString() : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || t("dashboard.movimentacoes.form.error"))

      toast.success(t("dashboard.movimentacoes.form.success"))

      // Verificar se deve abrir modal de assinatura
      const deveAssinar = solicitarAssinatura && (form.tipo === "retirada" || form.tipo === "devolucao")

      if (deveAssinar && form.colaboradorId) {
        // Encontrar dados do colaborador
        const colaboradorSelecionado = colaboradores.find(c => c.id === form.colaboradorId)
        // Encontrar dados do produto
        const produtoSelecionado = ferramentas.find(f => f.id === form.produtoId)

        if (colaboradorSelecionado && produtoSelecionado) {
          // Buscar assinatura existente
          let signature = null
          try {
            const sigRes = await fetch(`/api/colaboradores/assinatura?colaboradorId=${colaboradorSelecionado.id}`)
            if (sigRes.ok) {
              const sigData = await sigRes.json()
              signature = sigData.signature
            }
          } catch (err) {
            console.error("Erro ao buscar assinatura:", err)
          }

          setMovimentacaoParaAssinar({
            id: json.id || json.data?.id || "",
            colaborador: {
              id: colaboradorSelecionado.id,
              nome: colaboradorSelecionado.nome,
            },
            itens: [{
              id: produtoSelecionado.id,
              nome: produtoSelecionado.nome,
              quantidade: Number(form.quantidade),
              tipo_item: produtoSelecionado.tipo_item || undefined,
            }],
            tipo: form.tipo as "retirada" | "devolucao",
            initialSignature: signature,
          })
          setTermoModalOpen(true)
        }
      }

      setOpen(false)
      setForm({
        tipo: "entrada",
        produto: "",
        produtoId: "",
        quantidade: "1",
        colaboradorId: "",
        colaboradorNome: "",
        observacoes: "",
        dataMov: new Date().toISOString().slice(0, 16),
      })

      // Forçar revalidação e atualizar a página
      // Usar setTimeout para garantir que o servidor processou a mudança
      setTimeout(() => {
        router.refresh()
      }, 500)
    } catch (err: any) {
      toast.error(err.message || t("dashboard.movimentacoes.form.error"))
    } finally {
      setLoading(false)
    }
  }

  const tipoBadge = (tipo: string) => {
    const map: Record<string, "default" | "secondary" | "destructive"> = {
      entrada: "secondary",
      retirada: "destructive",
      devolucao: "secondary",
      conserto: "secondary",
    }
    return map[tipo] || "secondary"
  }

  const tipoBadgeClassName = (tipo: string) => {
    if (tipo === "conserto") {
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200"
    }
    return ""
  }

  const getFilteredMovimentacoes = () => {
    // Usar os filtros de exportação (que podem ser diferentes dos filtros da tabela)
    let result = [...movimentacoes]

    // Filtro por tipo
    if (exportFilters.tipo !== "todos") {
      result = result.filter((m) => m.tipo === exportFilters.tipo)
    }

    // Filtro por produto
    if (exportFilters.produtoId) {
      result = result.filter((m) => {
        const produto = ferramentas.find((f) => f.id === exportFilters.produtoId)
        if (!produto) return false
        return m.ferramentas?.nome === produto.nome
      })
    }

    // Filtro por colaborador
    if (exportFilters.colaboradorId) {
      result = result.filter((m) => {
        const colaborador = colaboradores.find((c) => c.id === exportFilters.colaboradorId)
        if (!colaborador) return false
        return m.colaboradores?.nome === colaborador.nome
      })
    }

    // Filtro por data início
    if (exportFilters.dataInicio) {
      const inicio = new Date(exportFilters.dataInicio)
      inicio.setHours(0, 0, 0, 0)
      result = result.filter((m) => {
        if (!m.data) return false
        const dataMov = new Date(m.data)
        return dataMov >= inicio
      })
    }

    // Filtro por data fim
    if (exportFilters.dataFim) {
      const fim = new Date(exportFilters.dataFim)
      fim.setHours(23, 59, 59, 999)
      result = result.filter((m) => {
        if (!m.data) return false
        const dataMov = new Date(m.data)
        return dataMov <= fim
      })
    }

    return result
  }

  // Sincronizar filtros de exportação com filtros da tabela quando o dialog abrir
  useEffect(() => {
    if (openExportDialog) {
      setExportFilters({
        tipo: filters.tipo === "todos" ? "todos" : filters.tipo,
        dataInicio: filters.dataInicio ? format(filters.dataInicio, "yyyy-MM-dd") : "",
        dataFim: filters.dataFim ? format(filters.dataFim, "yyyy-MM-dd") : "",
        produtoId: filters.produtoId || "",
        colaboradorId: filters.colaboradorId || "",
      })
    }
  }, [openExportDialog, filters])

  const handleExportCSV = () => {
    const filtered = getFilteredMovimentacoes()
    if (filtered.length === 0) {
      toast.error(t("dashboard.movimentacoes.actions.no_results_export"))
      return
    }

    setExportingCsv(true)
    try {
      const escape = (val: any) => `"${(val ?? "").toString().replace(/"/g, '""')}"`
      const headers = [
        t("dashboard.movimentacoes.table.date"),
        t("dashboard.movimentacoes.table.type"),
        t("dashboard.movimentacoes.table.product"),
        t("dashboard.movimentacoes.table.quantity"),
        t("dashboard.movimentacoes.table.collaborator"),
        t("dashboard.movimentacoes.table.observations"),
      ]
      const rows = filtered.map((m) => [
        m.data ? format(new Date(m.data), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
        m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1),
        m.ferramentas?.nome || "-",
        m.quantidade,
        m.colaboradores?.nome || "-",
        m.observacoes || "",
      ])
      const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const stamp = new Date().toISOString().replace(/[:.-]/g, "").slice(0, 15)
      a.download = `movimentacoes_${stamp}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Erro ao exportar CSV:", error)
      toast.error(t("dashboard.movimentacoes.actions.export_error"))
    } finally {
      setExportingCsv(false)
      setOpenExportDialog(false)
    }
  }

  // Abrir modal de detalhes da movimentação
  const handleOpenDetail = (movimentacaoId: string) => {
    setSelectedMovimentacaoId(movimentacaoId)
    setDetailModalOpen(true)
  }

  // Reimprimir termo de responsabilidade
  const handleReprintTermo = async (movimentacao: any, savedSignature?: string | null) => {
    if (!movimentacao.colaborador) return

    // Buscar dados completos do colaborador
    const colaboradorCompleto = colaboradores.find(c => c.id === movimentacao.colaborador.id)
    // Buscar dados completos da ferramenta
    const ferramentaCompleta = ferramentas.find(f => f.id === movimentacao.ferramenta?.id)

    if (colaboradorCompleto && movimentacao.ferramenta) {
      // Buscar assinatura existente se não foi fornecida
      let signature = savedSignature || null

      if (!signature) {
        try {
          const sigRes = await fetch(`/api/colaboradores/assinatura?colaboradorId=${colaboradorCompleto.id}`)
          if (sigRes.ok) {
            const sigData = await sigRes.json()
            signature = sigData.signature
          }
        } catch (err) {
          console.error("Erro ao buscar assinatura:", err)
        }
      }

      setMovimentacaoParaAssinar({
        id: movimentacao.id,
        colaborador: {
          id: colaboradorCompleto.id,
          nome: colaboradorCompleto.nome,
        },
        itens: [{
          id: movimentacao.ferramenta.id,
          nome: movimentacao.ferramenta.nome,
          quantidade: movimentacao.quantidade,
          tipo_item: movimentacao.ferramenta.tipo_item || undefined,
        }],
        tipo: movimentacao.tipo as "retirada" | "devolucao",
        initialSignature: signature,
      })
      setDetailModalOpen(false)
      setTermoModalOpen(true)
    }
  }

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id]
      return prev.filter((item) => item !== id)
    })
  }

  const toggleSelectPage = (checked: boolean) => {
    const pageIds = paginatedMovimentacoes.map((m) => m.id)
    setSelectedIds((prev) => {
      if (checked) {
        const merged = new Set([...prev, ...pageIds])
        return Array.from(merged)
      }
      return prev.filter((id) => !pageIds.includes(id))
    })
  }

  const toggleStar = (id: string) => {
    setStarredIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const handleExportSelected = () => {
    const selectedMovs = movimentacoes.filter((m) => selectedIds.includes(m.id))
    if (selectedMovs.length === 0) {
      toast.error(t("dashboard.movimentacoes.actions.select_one"))
      return
    }

    setExportingCsv(true)
    try {
      const escape = (val: any) => `"${(val ?? "").toString().replace(/"/g, '""')}"`
      const headers = [
        "Data/Hora",
        "Tipo",
        "Produto",
        "Quantidade",
        "Colaborador",
        "Observações",
      ]
      const rows = selectedMovs.map((m) => [
        m.data ? format(new Date(m.data), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
        m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1),
        m.ferramentas?.nome || "-",
        m.quantidade,
        m.colaboradores?.nome || "-",
        m.observacoes || "",
      ])
      const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const stamp = new Date().toISOString().replace(/[:.-]/g, "").slice(0, 15)
      a.download = `movimentacoes_selecionadas_${stamp}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Erro ao exportar selecionados:", error)
      toast.error(t("dashboard.movimentacoes.actions.export_error"))
    } finally {
      setExportingCsv(false)
    }
  }

  return (
    <div className="space-y-4">


      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as any)
          setFilters(prev => ({ ...prev, tipo: v as any }))
        }}
        className="w-full space-y-4"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-transparent p-0">
            <TabsTrigger className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2" value="todos">{t("dashboard.movimentacoes.filters.all_types")}</TabsTrigger>
            <TabsTrigger className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2" value="entrada">{t("dashboard.movimentacoes.filters.entry")}</TabsTrigger>
            <TabsTrigger className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2" value="retirada">{t("dashboard.movimentacoes.filters.withdrawal")}</TabsTrigger>
            <TabsTrigger className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2" value="devolucao">{t("dashboard.movimentacoes.filters.return")}</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              onClick={() => setIsScanning(true)}
              className="gap-2 bg-[#37352f] hover:bg-[#37352f]/90 text-white h-10"
            >
              <Zap size={16} className="fill-yellow-400 text-yellow-400" />
              <span className="hidden sm:inline">{t("dashboard.movimentacoes.fast_mode")}</span>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setOpen(true)} className="bg-[#37352f] hover:bg-zinc-800 text-white gap-2 h-10">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("dashboard.movimentacoes.new_button")}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] md:max-w-lg max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{t("dashboard.movimentacoes.form.title")}</DialogTitle>
                    <DialogDescription>{t("dashboard.movimentacoes.form.desc")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Tipo de Movimentação */}
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-3">
                      <div className="grid gap-2">
                        <Label className="font-medium">{t("dashboard.movimentacoes.form.type")}</Label>
                        <Select
                          value={form.tipo}
                          onValueChange={(val: any) => setForm((f) => ({ ...f, tipo: val }))}
                        >
                          <SelectTrigger className="bg-white dark:bg-zinc-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entrada">{t("dashboard.movimentacoes.filters.entry")}</SelectItem>
                            <SelectItem value="retirada">{t("dashboard.movimentacoes.filters.withdrawal")}</SelectItem>
                            <SelectItem value="devolucao">{t("dashboard.movimentacoes.filters.return")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label className="font-medium">{t("dashboard.movimentacoes.form.product")}</Label>
                        <Input
                          placeholder={t("dashboard.movimentacoes.form.select_product")}
                          value={form.produto}
                          onChange={(e) => setForm((f) => ({ ...f, produto: e.target.value, produtoId: "" }))}
                          className="text-sm md:text-base bg-white dark:bg-zinc-900"
                        />
                        {suggestions.length > 0 && (
                          <div className="border rounded-md divide-y bg-white shadow-sm max-h-48 overflow-auto dark:bg-zinc-900 dark:border-zinc-700">
                            {suggestions.map((s) => (
                              <button
                                type="button"
                                key={s.id}
                                className="w-full text-left px-3 py-2 hover:bg-zinc-50 text-sm dark:hover:bg-zinc-800"
                                onClick={() => setForm((f) => ({ ...f, produto: s.nome, produtoId: s.id }))}
                              >
                                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.nome}</div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">{s.tipo_item || t("dashboard.ferramentas.form.tool")}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detalhes */}
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label className="font-medium">{t("dashboard.movimentacoes.form.quantity")}</Label>
                          <Input
                            type="number"
                            min={1}
                            value={form.quantidade}
                            onChange={(e) => setForm((f) => ({ ...f, quantidade: e.target.value }))}
                            required
                            className="bg-white dark:bg-zinc-900"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label className="font-medium">{t("dashboard.movimentacoes.form.date")}</Label>
                          <Input
                            type="datetime-local"
                            value={form.dataMov}
                            onChange={(e) => setForm((f) => ({ ...f, dataMov: e.target.value }))}
                            className="bg-white dark:bg-zinc-900"
                          />
                        </div>
                      </div>

                      {(form.tipo === "retirada" || form.tipo === "devolucao") && (
                        <div className="grid gap-2">
                          <Label className="font-medium">{t("dashboard.movimentacoes.form.collaborator")}</Label>
                          <Input
                            placeholder={t("dashboard.movimentacoes.form.select_collaborator")}
                            value={form.colaboradorNome}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, colaboradorNome: e.target.value, colaboradorId: "" }))
                            }
                            className="bg-white dark:bg-zinc-900"
                          />
                          {colabSuggestions.length > 0 && (
                            <div className="border rounded-md divide-y bg-white shadow-sm max-h-40 overflow-auto dark:bg-zinc-900 dark:border-zinc-700">
                              {colabSuggestions.map((c) => (
                                <button
                                  type="button"
                                  key={c.id}
                                  className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                  onClick={() =>
                                    setForm((f) => ({
                                      ...f,
                                      colaboradorId: c.id,
                                      colaboradorNome: c.nome,
                                    }))
                                  }
                                >
                                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{c.nome}</div>
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-zinc-500">
                            {t("dashboard.movimentacoes.form.collaborator_hint")}
                          </div>
                        </div>
                      )}

                      <div className="grid gap-2">
                        <Label className="font-medium">{t("dashboard.movimentacoes.form.observations")}</Label>
                        <Input
                          placeholder={t("dashboard.ferramentas.actions.optional")}
                          value={form.observacoes}
                          onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                          className="bg-white dark:bg-zinc-900"
                        />
                      </div>
                    </div>

                    {/* Checkbox de assinatura - só aparece para retirada/devolução */}
                    {(form.tipo === "retirada" || form.tipo === "devolucao") && (
                      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                        <Checkbox
                          id="solicitar-assinatura"
                          checked={solicitarAssinatura}
                          onCheckedChange={(checked) => setSolicitarAssinatura(checked === true)}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor="solicitar-assinatura"
                            className="text-sm font-medium text-blue-900 cursor-pointer flex items-center gap-2 dark:text-blue-100"
                          >
                            <FileSignature className="h-4 w-4" />
                            {t("dashboard.movimentacoes.form.request_signature")}
                          </label>
                          <p className="text-xs text-blue-700 mt-0.5 dark:text-blue-300">
                            Gera termo de responsabilidade com assinatura do colaborador
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-[#37352f] hover:bg-zinc-800 text-white">
                      {loading ? t("dashboard.ferramentas.form.saving") : t("dashboard.ferramentas.form.save")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>



            <Dialog open={openExportDialog} onOpenChange={setOpenExportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 h-10">
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("dashboard.movimentacoes.export_button")}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("dashboard.movimentacoes.actions.export_filters_title")}</DialogTitle>
                  <DialogDescription>
                    {t("dashboard.movimentacoes.actions.export_filters_desc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>{t("dashboard.movimentacoes.filters.type")}</Label>
                    <Select
                      value={exportFilters.tipo}
                      onValueChange={(val: any) =>
                        setExportFilters((f) => ({ ...f, tipo: val }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">{t("dashboard.movimentacoes.filters.all_types")}</SelectItem>
                        <SelectItem value="entrada">{t("dashboard.movimentacoes.filters.entry")}</SelectItem>
                        <SelectItem value="retirada">{t("dashboard.movimentacoes.filters.withdrawal")}</SelectItem>
                        <SelectItem value="devolucao">{t("dashboard.movimentacoes.filters.return")}</SelectItem>
                        <SelectItem value="conserto">{t("dashboard.movimentacoes.filters.repair")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>{t("dashboard.movimentacoes.table.product")}</Label>
                    <Select
                      value={exportFilters.produtoId || "todos"}
                      onValueChange={(val) =>
                        setExportFilters((f) => ({ ...f, produtoId: val === "todos" ? "" : val }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">{t("dashboard.ferramentas.filters.all_categories")}</SelectItem>
                        {ferramentas.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>{t("dashboard.movimentacoes.table.collaborator")}</Label>
                    <Select
                      value={exportFilters.colaboradorId || "todos"}
                      onValueChange={(val) =>
                        setExportFilters((f) => ({ ...f, colaboradorId: val === "todos" ? "" : val }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">{t("dashboard.ferramentas.actions.select_collaborator")}</SelectItem>
                        {colaboradores.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>{t("dashboard.movimentacoes.filters.start_date")}</Label>
                      <Input
                        type="date"
                        value={exportFilters.dataInicio}
                        onChange={(e) =>
                          setExportFilters((f) => ({ ...f, dataInicio: e.target.value }))
                        }
                        className="text-sm md:text-base"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("dashboard.movimentacoes.filters.end_date")}</Label>
                      <Input
                        type="date"
                        value={exportFilters.dataFim}
                        onChange={(e) =>
                          setExportFilters((f) => ({ ...f, dataFim: e.target.value }))
                        }
                        className="text-sm md:text-base"
                      />
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {t("dashboard.movimentacoes.actions.export_count", { count: getFilteredMovimentacoes().length })}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setExportFilters({
                        tipo: "todos",
                        dataInicio: "",
                        dataFim: "",
                        produtoId: "",
                        colaboradorId: "",
                      })
                    }}
                  >
                    {t("dashboard.ferramentas.filters.clear")}
                  </Button>
                  <Button onClick={handleExportCSV} disabled={getFilteredMovimentacoes().length === 0}>
                    {exportingCsv ? t("dashboard.ferramentas.actions.exporting") : t("dashboard.movimentacoes.actions.export_csv")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div >
        </div >

        <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            <Input
              placeholder={t("dashboard.movimentacoes.filters.search_placeholder") || "Buscar..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-white border-zinc-300 focus:border-blue-500 dark:bg-zinc-900 dark:border-zinc-700"
            />
          </div>
          <MovimentacoesFilters
            ferramentas={ferramentas}
            colaboradores={colaboradores}
            filters={filters}
            onFiltersChange={setFilters}
            totalEncontrados={filtered.length}
          />
        </div>
      </Tabs >

      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-700">
        <Table className="hidden md:table">
          <TableHeader className="bg-zinc-50 dark:bg-zinc-800">
            <TableRow>
              <TableHead className="w-[40px] text-center">
                <Checkbox
                  className="translate-y-[2px]"
                  checked={
                    paginatedMovimentacoes.length === 0
                      ? false
                      : paginatedMovimentacoes.every((m) => selectedIds.includes(m.id))
                        ? true
                        : paginatedMovimentacoes.some((m) => selectedIds.includes(m.id))
                          ? "indeterminate"
                          : false
                  }
                  onCheckedChange={(checked) => toggleSelectPage(checked === true)}
                />
              </TableHead>
              <TableHead className="w-[40px] text-center"><Star className="h-3 w-3 mx-auto" /></TableHead>
              <TableHead className="w-[40px] text-center">{t("dashboard.movimentacoes.table.type")}</TableHead>
              <TableHead className="w-[60px]">ID</TableHead>
              <TableHead>{t("dashboard.movimentacoes.table.product")}</TableHead>
              <TableHead>{t("dashboard.movimentacoes.table.collaborator")}</TableHead>
              <TableHead>{t("dashboard.movimentacoes.table.date")}</TableHead>
              <TableHead>{t("dashboard.movimentacoes.table.observations")}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMovimentacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  {t("dashboard.movimentacoes.empty.no_results")}
                </TableCell>
              </TableRow>
            ) : (
              paginatedMovimentacoes.map((m) => (
                <TableRow
                  key={m.id}
                  className={cn(
                    "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors",
                    selectedIds.includes(m.id) && "bg-zinc-100 dark:bg-zinc-800",
                    starredIds.includes(m.id) && "bg-zinc-50 dark:bg-zinc-900"
                  )}
                  onClick={() => handleOpenDetail(m.id)}
                >
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(m.id)}
                      onCheckedChange={(checked) => toggleSelect(m.id, checked === true)}
                      className="translate-y-[2px]"
                    />
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={cn(
                        "hover:text-yellow-400 transition-colors dark:text-zinc-600",
                        starredIds.includes(m.id) ? "text-yellow-400 dark:text-yellow-300" : "text-zinc-300"
                      )}
                      onClick={() => toggleStar(m.id)}
                    >
                      <Star className="h-4 w-4" fill={starredIds.includes(m.id) ? "currentColor" : "none"} />
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center" title={t(`dashboard.movimentacoes.filters.${m.tipo}`)}>
                      {m.tipo === 'entrada' && <PackagePlus className="h-4 w-4 text-green-600" />}
                      {m.tipo === 'retirada' && <PackageMinus className="h-4 w-4 text-red-600" />}
                      {m.tipo === 'devolucao' && <RotateCcw className="h-4 w-4 text-blue-600" />}
                      {m.tipo === 'conserto' && <Settings className="h-4 w-4 text-orange-600" />}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{m.id.substring(0, 4)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{m.ferramentas?.nome || t("dashboard.movimentacoes.table.product")}</span>
                      {m.quantidade > 1 && <Badge variant="secondary" className="text-[10px] h-4 px-1">{m.quantidade}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{m.colaboradores?.nome || "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {m.data ? format(new Date(m.data), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate">
                    {m.observacoes || "-"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t("dashboard.colaboradores.list.bulk_actions")}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenDetail(m.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t("dashboard.colaboradores.card.view_details")}
                        </DropdownMenuItem>
                        {(m.tipo === "retirada" || m.tipo === "devolucao") && (
                          <DropdownMenuItem onClick={() => handleReprintTermo(m)}>
                            <Printer className="mr-2 h-4 w-4" />
                            {t("dashboard.movimentacoes.form.request_signature")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-700">
          {paginatedMovimentacoes.map((m) => (
            <Fragment key={m.id}>
              <div
                className="p-4 space-y-3 active:bg-zinc-50 cursor-pointer dark:active:bg-zinc-800"
                onClick={() => handleOpenDetail(m.id)}
              >
                {/* Header: Type + Date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${m.tipo === 'entrada' ? 'bg-green-100 dark:bg-green-900/30' :
                      m.tipo === 'retirada' ? 'bg-red-100 dark:bg-red-900/30' :
                        m.tipo === 'devolucao' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          'bg-orange-100 dark:bg-orange-900/30'
                      }`}>
                      {m.tipo === 'entrada' && <PackagePlus className="h-4 w-4 text-green-600 dark:text-green-400" />}
                      {m.tipo === 'retirada' && <PackageMinus className="h-4 w-4 text-red-600 dark:text-red-400" />}
                      {m.tipo === 'devolucao' && <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                      {m.tipo === 'conserto' && <Settings className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                      {m.tipo === 'entrada' ? 'Entrada' :
                        m.tipo === 'retirada' ? 'Retirada' :
                          m.tipo === 'devolucao' ? 'Devolução' : 'Conserto'}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {m.data ? format(new Date(m.data), "dd/MM HH:mm", { locale: ptBR }) : "-"}
                  </span>
                </div>

                {/* Product Name */}
                <p className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                  {m.ferramentas?.nome || "Produto"}
                </p>

                {/* Details Row */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Qtd: <strong className="text-zinc-900 dark:text-zinc-100">{m.quantidade}</strong>
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400 text-right truncate max-w-[50%]">
                    {m.colaboradores?.nome || "—"}
                  </span>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-2 py-2 text-xs text-zinc-500 dark:text-zinc-300">
        <div>
          {t("dashboard.ferramentas.pagination.showing", { count: paginatedMovimentacoes.length, total: filtered.length })}
          {totalPages > 1 && ` (${t("dashboard.ferramentas.pagination.page", { current: currentPage, total: totalPages })})`}
        </div>
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="min-w-[2rem] text-center">{currentPage}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>





      {/* Modal de Termo de Responsabilidade */}
      {
        movimentacaoParaAssinar && (
          <TermoResponsabilidadeModal
            open={termoModalOpen}
            onOpenChange={(open) => {
              setTermoModalOpen(open)
              if (!open) setMovimentacaoParaAssinar(null)
            }}
            colaborador={movimentacaoParaAssinar.colaborador}
            itens={movimentacaoParaAssinar.itens}
            tipo={movimentacaoParaAssinar.tipo}
            movimentacaoId={movimentacaoParaAssinar.id}
            initialSignature={movimentacaoParaAssinar.initialSignature}
            onSuccess={(termoId, pdfUrl) => {
              console.log("✅ Termo assinado:", termoId, pdfUrl)
              router.refresh()
            }}
          />
        )
      }

      {/* Modal de Detalhes da Movimentação */}
      {
        selectedMovimentacaoId && (
          <MovimentacaoDetailModal
            open={detailModalOpen}
            onOpenChange={(open) => {
              setDetailModalOpen(open)
              if (!open) setSelectedMovimentacaoId(null)
            }}
            movimentacaoId={selectedMovimentacaoId}
            onReprint={handleReprintTermo}
          />
        )
      }

      {/* Scanner Overlay */}
      {
        isScanning && (
          <QRScanner
            onScan={handleScanResult}
            onClose={() => setIsScanning(false)}
            title={t("dashboard.movimentacoes.fast_mode")}
            description="Escaneie o código do item para iniciar uma movimentação"
          />
        )
      }

    </div >
  )
}
