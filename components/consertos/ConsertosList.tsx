"use client"

import { useState, useMemo, memo, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { registrarRetornoConserto, atualizarStatusConserto } from "@/lib/actions"
import { CheckCircle2, Clock, Wrench } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR, enUS } from "date-fns/locale"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { registrarEnvioConserto } from "@/lib/actions"
import { useTranslation } from "react-i18next"
import { useToast } from "@/components/ui/toast-context"

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MoreHorizontal, FileDown, Plus, Search, Filter } from "lucide-react"

interface Conserto {
  id: string
  ferramenta_id: string
  descricao?: string | null
  status: "aguardando" | "em_andamento" | "concluido"
  custo?: number | null
  data_envio?: string | null
  data_retorno?: string | null
  ferramentas:
  | {
    id: string
    nome: string
    quantidade_disponivel: number
  }
  | {
    id: string
    nome: string
    quantidade_disponivel: number
  }[]
  local_conserto?: string | null
  prazo?: string | null
  prioridade?: string | null
  colaboradores?: {
    nome: string
  } | null
}

function ConsertosList({
  consertos: initialConsertos,
}: {
  consertos: Conserto[]
}) {
  const supabase = createClientComponentClient()
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const dateLocale = i18n.language === "pt" ? ptBR : enUS

  const parseFerramenta = useCallback((ferramentas: Conserto["ferramentas"]) => {
    const f = Array.isArray(ferramentas) ? ferramentas[0] : ferramentas
    return {
      id: f?.id || "",
      nome: f?.nome || t("dashboard.consertos.no_name"),
      quantidade_disponivel: Number(f?.quantidade_disponivel || 0),
    }
  }, [t])

  const [consertos, setConsertos] = useState(initialConsertos)
  const [activeTab, setActiveTab] = useState("todos")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [retornoDialog, setRetornoDialog] = useState<Conserto | null>(null)

  // Contagem por status para exibir nas abas
  const statusCounts = useMemo(() => ({
    todos: consertos.length,
    aguardando: consertos.filter(c => c.status === "aguardando").length,
    em_andamento: consertos.filter(c => c.status === "em_andamento").length,
    concluido: consertos.filter(c => c.status === "concluido").length,
  }), [consertos])

  // ... (keep other state)
  const router = useRouter()
  const [openNew, setOpenNew] = useState(false)
  const [openExportDialog, setOpenExportDialog] = useState(false)
  const [produtos, setProdutos] = useState<{ id: string; nome: string; quantidade_disponivel: number }[]>([])
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    produto: "",
    produtoId: "",
    quantidade: "1",
    status: "aguardando" as "aguardando" | "em_andamento" | "concluido",
    local: "",
    prazo: "",
    prioridade: "media",
    descricao: "",
  })
  const [exportFilters, setExportFilters] = useState({
    prioridade: "todas" as "todas" | "baixa" | "media" | "alta",
    status: "todos" as "todos" | "aguardando" | "em_andamento" | "concluido",
    dataEnvioInicio: "",
    dataEnvioFim: "",
    dataRetornoInicio: "",
    dataRetornoFim: "",
    local: "",
    produtoId: "",
  })



  const filteredConsertos = useMemo(() => {
    let result = [...consertos]

    // Filter by Tab
    if (activeTab === "aguardando") {
      result = result.filter(c => c.status === "aguardando")
    } else if (activeTab === "em_andamento") {
      result = result.filter(c => c.status === "em_andamento")
    } else if (activeTab === "concluido") {
      result = result.filter(c => c.status === "concluido")
    }

    // Filter by Search
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(c => {
        const ferramentasArray = Array.isArray(c.ferramentas) ? c.ferramentas : [c.ferramentas]
        return (
          ferramentasArray.some(f => f.nome.toLowerCase().includes(s)) ||
          c.colaboradores?.nome?.toLowerCase().includes(s) ||
          c.local_conserto?.toLowerCase().includes(s) ||
          c.id.toLowerCase().includes(s)
        )
      })
    }

    // Filter by Export Filters (if strictly needed, but usually we separate export filters from view filters. 
    // For now, let's stick to simple view filters for the table to match other tabs)

    return result.sort((a, b) => new Date(b.data_envio || "").getTime() - new Date(a.data_envio || "").getTime())
  }, [consertos, activeTab, search])

  const produtoSuggestions = useMemo(() => {
    // Não mostrar sugestões se já há um produto selecionado
    if (form.produtoId) return []

    const s = form.produto.trim().toLowerCase()
    // Só mostrar sugestões quando o usuário começar a digitar (mínimo 1 caractere)
    if (!s || s.length < 1) return []

    // Filtrar produtos que contêm o texto digitado
    return produtos.filter((p) => p.nome.toLowerCase().includes(s)).slice(0, 5)
  }, [form.produto, form.produtoId, produtos])

  const carregarProdutos = async () => {
    const { data } = await supabase
      .from("ferramentas")
      .select("id, nome, quantidade_disponivel")
      .order("nome", { ascending: true })
    setProdutos(data || [])
  }

  useEffect(() => {
    carregarProdutos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [quantidadeEmConserto, setQuantidadeEmConserto] = useState<number>(0)

  const getQuantidadeRestante = useCallback(async (conserto: Conserto) => {
    try {
      const ferramenta = parseFerramenta(conserto.ferramentas)
      const dataEnvioRef = conserto.data_envio || new Date().toISOString()

      // Primeiro tenta achar a movimentação do envio com referência ao conserto na observação
      const { data: movEnvioPorObs } = await supabase
        .from("movimentacoes")
        .select("quantidade, data")
        .eq("ferramenta_id", ferramenta.id)
        .eq("tipo", "conserto")
        .ilike("observacoes", `%${conserto.id}%`)
        .order("data", { ascending: true })
        .limit(1)

      let movEnvio = movEnvioPorObs?.[0]

      // Fallback: primeiro envio registrado depois da data do conserto
      if (!movEnvio) {
        const { data: movEnvioFallback } = await supabase
          .from("movimentacoes")
          .select("quantidade, data")
          .eq("ferramenta_id", ferramenta.id)
          .eq("tipo", "conserto")
          .gte("data", dataEnvioRef)
          .order("data", { ascending: true })
          .limit(1)
        movEnvio = movEnvioFallback?.[0]
      }

      const quantidadeEnviada = movEnvio?.quantidade || 1

      // Buscar movimentações de entrada (retorno) associadas a este conserto
      const { data: movRetornos } = await supabase
        .from("movimentacoes")
        .select("quantidade")
        .eq("ferramenta_id", ferramenta.id)
        .eq("tipo", "entrada")
        .ilike("observacoes", `%${conserto.id}%`)

      const quantidadeJaRetornada = (movRetornos || []).reduce((acc: number, m: any) => acc + (m.quantidade || 0), 0)
      const quantidadeAindaEmConserto = quantidadeEnviada - quantidadeJaRetornada

      return Math.max(0, quantidadeAindaEmConserto)
    } catch (err) {
      console.error("Erro ao buscar quantidade em conserto:", err)
      return 1
    }
  }, [supabase, parseFerramenta])

  useEffect(() => {
    async function updateQuantidade() {
      if (retornoDialog) {
        const qtd = await getQuantidadeRestante(retornoDialog)
        setQuantidadeEmConserto(qtd)
      }
    }
    updateQuantidade()
  }, [retornoDialog, getQuantidadeRestante])

  const handleRetorno = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!retornoDialog) return

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const custo = Number(formData.get("custo"))
    const quantidade = Number(formData.get("quantidade"))

    if (quantidade < 1) {
      toast.error(t("dashboard.consertos.errors.min_quantity"))
      setLoading(false)
      return
    }

    if (quantidade > quantidadeEmConserto) {
      toast.error(t("dashboard.consertos.errors.invalid_quantity", { count: quantidadeEmConserto }))
      setLoading(false)
      return
    }

    try {
      await registrarRetornoConserto(retornoDialog.id, custo, quantidade)
      setRetornoDialog(null)
      setQuantidadeEmConserto(0)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || t("dashboard.consertos.errors.register_return"))
    } finally {
      setLoading(false)
    }
  }

  const handleQuickReturn = async (conserto: Conserto) => {
    try {
      const qtdRestante = await getQuantidadeRestante(conserto)
      // Se a quantidade restante for 0 ou menor, assumimos 1 para garantir que o retorno seja registrado
      // e o status possivelmente atualizado para concluído
      const qtdParaRetornar = qtdRestante > 0 ? qtdRestante : 1

      await registrarRetornoConserto(conserto.id, 0, qtdParaRetornar)
      toast.success(t("dashboard.consertos.return.success"))
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(t("dashboard.consertos.errors.register_return"))
    }
  }

  const handleAtualizarStatus = async (consertoId: string, status: Conserto["status"]) => {
    try {
      setStatusLoadingId(consertoId)
      await atualizarStatusConserto(consertoId, status)
      setConsertos((prev) => prev.map((c) => (c.id === consertoId ? { ...c, status } : c)))
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || t("dashboard.consertos.errors.update_status"))
    } finally {
      setStatusLoadingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "destructive" | "secondary"
    > = {
      aguardando: "secondary",
      em_andamento: "default",
      concluido: "default",
    }
    return variants[status] || "default"
  }

  const handleNovaOrdem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.produtoId) {
      toast.error(t("dashboard.consertos.errors.select_product"))
      return
    }

    const quantidade = Number(form.quantidade)
    if (quantidade < 1) {
      toast.error(t("dashboard.consertos.errors.min_quantity"))
      return
    }

    const produtoSelecionado = produtos.find(p => p.id === form.produtoId)
    if (produtoSelecionado && quantidade > produtoSelecionado.quantidade_disponivel) {
      toast.error(t("dashboard.consertos.errors.insufficient_quantity", { count: produtoSelecionado.quantidade_disponivel }))
      return
    }

    setLoading(true)
    try {
      await registrarEnvioConserto(
        form.produtoId,
        quantidade,
        form.descricao,
        form.status,
        form.local,
        form.prazo,
        form.prioridade
      )
      setOpenNew(false)
      setForm({
        produto: "",
        produtoId: "",
        quantidade: "1",
        status: "aguardando",
        local: "",
        prazo: "",
        prioridade: "media",
        descricao: "",
      })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || t("dashboard.consertos.errors.create_order"))
    } finally {
      setLoading(false)
    }
  }

  // Função para filtrar consertos baseado nos filtros de exportação
  const getFilteredConsertos = () => {
    let filtered = [...consertos]

    // Filtro por prioridade
    if (exportFilters.prioridade !== "todas") {
      filtered = filtered.filter((c) => c.prioridade === exportFilters.prioridade)
    }

    // Filtro por status
    if (exportFilters.status !== "todos") {
      filtered = filtered.filter((c) => c.status === exportFilters.status)
    }

    // Filtro por produto
    if (exportFilters.produtoId) {
      filtered = filtered.filter((c) => {
        const f = parseFerramenta(c.ferramentas)
        return f.id === exportFilters.produtoId
      })
    }

    // Filtro por local
    if (exportFilters.local.trim()) {
      filtered = filtered.filter((c) =>
        c.local_conserto?.toLowerCase().includes(exportFilters.local.toLowerCase())
      )
    }

    // Filtro por data de envio
    if (exportFilters.dataEnvioInicio) {
      const inicio = new Date(exportFilters.dataEnvioInicio)
      inicio.setHours(0, 0, 0, 0)
      filtered = filtered.filter((c) => {
        if (!c.data_envio) return false
        const dataEnvio = new Date(c.data_envio)
        dataEnvio.setHours(0, 0, 0, 0)
        return dataEnvio >= inicio
      })
    }

    if (exportFilters.dataEnvioFim) {
      const fim = new Date(exportFilters.dataEnvioFim)
      fim.setHours(23, 59, 59, 999)
      filtered = filtered.filter((c) => {
        if (!c.data_envio) return false
        const dataEnvio = new Date(c.data_envio)
        return dataEnvio <= fim
      })
    }

    // Filtro por data de retorno
    if (exportFilters.dataRetornoInicio) {
      const inicio = new Date(exportFilters.dataRetornoInicio)
      inicio.setHours(0, 0, 0, 0)
      filtered = filtered.filter((c) => {
        if (!c.data_retorno) return false
        const dataRetorno = new Date(c.data_retorno)
        dataRetorno.setHours(0, 0, 0, 0)
        return dataRetorno >= inicio
      })
    }

    if (exportFilters.dataRetornoFim) {
      const fim = new Date(exportFilters.dataRetornoFim)
      fim.setHours(23, 59, 59, 999)
      filtered = filtered.filter((c) => {
        if (!c.data_retorno) return false
        const dataRetorno = new Date(c.data_retorno)
        return dataRetorno <= fim
      })
    }

    return filtered
  }

  const handleExportPDF = () => {
    const filteredConsertos = getFilteredConsertos()

    if (filteredConsertos.length === 0) {
      toast.error(t("dashboard.consertos.actions.no_results_export"))
      return
    }

    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text(t("dashboard.consertos.export.report_title"), 14, 16)
    doc.setFontSize(10)
    doc.text(t("dashboard.consertos.export.generated_at", { date: format(new Date(), "dd/MM/yyyy HH:mm", { locale: dateLocale }) }), 14, 22)

    // Adicionar informações dos filtros aplicados
    let yPos = 28
    const filtersApplied: string[] = []
    if (exportFilters.prioridade !== "todas") {
      filtersApplied.push(t("dashboard.consertos.export.filter_priority", { value: t(`dashboard.consertos.priority.${exportFilters.prioridade}`) }))
    }
    if (exportFilters.status !== "todos") {
      filtersApplied.push(t("dashboard.consertos.export.filter_status", { value: getStatusLabel(exportFilters.status) }))
    }
    if (exportFilters.produtoId) {
      const produto = produtos.find((p) => p.id === exportFilters.produtoId)
      if (produto) filtersApplied.push(t("dashboard.consertos.export.filter_product", { value: produto.nome }))
    }
    if (exportFilters.local.trim()) {
      filtersApplied.push(t("dashboard.consertos.export.filter_location", { value: exportFilters.local }))
    }
    if (exportFilters.dataEnvioInicio || exportFilters.dataEnvioFim) {
      const inicio = exportFilters.dataEnvioInicio
        ? format(new Date(exportFilters.dataEnvioInicio), "dd/MM/yyyy")
        : "..."
      const fim = exportFilters.dataEnvioFim
        ? format(new Date(exportFilters.dataEnvioFim), "dd/MM/yyyy")
        : "..."
      filtersApplied.push(t("dashboard.consertos.export.filter_send_date", { start: inicio, end: fim }))
    }
    if (exportFilters.dataRetornoInicio || exportFilters.dataRetornoFim) {
      const inicio = exportFilters.dataRetornoInicio
        ? format(new Date(exportFilters.dataRetornoInicio), "dd/MM/yyyy")
        : "..."
      const fim = exportFilters.dataRetornoFim
        ? format(new Date(exportFilters.dataRetornoFim), "dd/MM/yyyy")
        : "..."
      filtersApplied.push(t("dashboard.consertos.export.filter_return_date", { start: inicio, end: fim }))
    }

    if (filtersApplied.length > 0) {
      doc.setFontSize(8)
      doc.text(t("dashboard.consertos.export.filters_applied", { filters: filtersApplied.join(" | ") }), 14, yPos)
      yPos += 6
    }

    const rows = filteredConsertos.map((c) => {
      const f = parseFerramenta(c.ferramentas)
      return [
        f.nome,
        getStatusLabel(c.status),
        c.prioridade || "-",
        c.local_conserto || "-",
        c.prazo ? format(new Date(c.prazo), "dd/MM/yyyy") : "-",
        c.data_envio ? format(new Date(c.data_envio), "dd/MM/yyyy") : "-",
        c.data_retorno ? format(new Date(c.data_retorno), "dd/MM/yyyy") : "-",
        c.custo ? `R$ ${c.custo.toFixed(2)}` : "-",
      ]
    })

    autoTable(doc, {
      startY: yPos + 4,
      head: [[
        t("dashboard.consertos.export.headers.product"),
        t("dashboard.consertos.export.headers.status"),
        t("dashboard.consertos.export.headers.priority"),
        t("dashboard.consertos.export.headers.location"),
        t("dashboard.consertos.export.headers.deadline"),
        t("dashboard.consertos.export.headers.send_date"),
        t("dashboard.consertos.export.headers.return_date"),
        t("dashboard.consertos.export.headers.cost")
      ]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [17, 24, 39] },
      columnStyles: {
        7: { halign: "right" }, // Custo alinhado à direita
      },
    })

    // Rodapé
    const agora = new Date()
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      const pageHeight = doc.internal.pageSize.height
      const pageWidth = doc.internal.pageSize.width

      // Data e página
      doc.setFontSize(8)
      doc.text(
        t("dashboard.consertos.export.footer_page", { date: format(agora, "dd/MM/yyyy HH:mm", { locale: dateLocale }), current: i, total: pageCount }),
        14,
        pageHeight - 20
      )

      // Rodapé padrão
      doc.setFontSize(7)
      doc.text(
        t("dashboard.consertos.export.footer_generated_by"),
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      )
      doc.text(
        "www.operium.com.br",
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      )
    }

    const stamp = new Date().toISOString().replace(/[:.-]/g, "").slice(0, 15)
    const filterSuffix = filtersApplied.length > 0 ? "_filtrado" : ""
    doc.save(`consertos${filterSuffix}_${stamp}.pdf`)
    setOpenExportDialog(false)
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aguardando: t("dashboard.consertos.status.waiting"),
      em_andamento: t("dashboard.consertos.status.in_progress"),
      concluido: t("dashboard.consertos.status.completed"),
    }
    return labels[status] || status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluido":
        return <CheckCircle2 className="h-4 w-4 shrink-0" />
      case "em_andamento":
        return <Wrench className="h-4 w-4 shrink-0" />
      default:
        return <Clock className="h-4 w-4 shrink-0" />
    }
  }

  return (
    <div className="space-y-8 px-2 md:px-0">
      {/* Voice Assistant Section */}


      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearch(""); }} className="w-full space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-transparent p-0">
            <TabsTrigger className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2" value="todos">
              {t("dashboard.consertos.status.all")}
              <span className="ml-1.5 text-xs text-muted-foreground">({statusCounts.todos})</span>
            </TabsTrigger>
            <TabsTrigger className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2" value="aguardando">
              {t("dashboard.consertos.status.waiting")}
              {statusCounts.aguardando > 0 && <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{statusCounts.aguardando}</span>}
            </TabsTrigger>
            <TabsTrigger className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2" value="em_andamento">
              {t("dashboard.consertos.status.in_progress")}
              {statusCounts.em_andamento > 0 && <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{statusCounts.em_andamento}</span>}
            </TabsTrigger>
            <TabsTrigger className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#37352f] rounded-none border-b-2 border-transparent px-4 pb-2" value="concluido">
              {t("dashboard.consertos.status.completed")}
              <span className="ml-1.5 text-xs text-muted-foreground">({statusCounts.concluido})</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {/* New Conserto Dialog */}
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button onClick={() => setOpenNew(true)} className="bg-[#37352f] hover:bg-zinc-800 text-white gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("dashboard.consertos.new_button")}</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleNovaOrdem}>
                  <DialogHeader>
                    <DialogTitle>{t("dashboard.consertos.form.title")}</DialogTitle>
                    <DialogDescription>{t("dashboard.consertos.form.desc")}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-4">
                    <div className="grid gap-2">
                      <Label>{t("dashboard.consertos.form.product")}</Label>
                      <Input
                        placeholder={t("dashboard.consertos.form.product_placeholder")}
                        value={form.produto}
                        onChange={(e) => setForm((f) => ({ ...f, produto: e.target.value, produtoId: "", quantidade: "1" }))}
                      />
                      {produtoSuggestions.length > 0 && (
                        <div className="border rounded-md divide-y bg-white shadow-sm max-h-40 overflow-auto dark:bg-zinc-900 dark:border-zinc-700 dark:divide-zinc-700">
                          {produtoSuggestions.map((p) => (
                            <button
                              type="button"
                              key={p.id}
                              className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              onClick={() => setForm((f) => ({
                                ...f,
                                produto: p.nome,
                                produtoId: p.id,
                                quantidade: "1" // Resetar quantidade ao selecionar novo produto
                              }))}
                            >
                              <div className="flex items-center justify-between">
                                <span className="dark:text-zinc-100">{p.nome}</span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {t("dashboard.consertos.form.available", { count: p.quantidade_disponivel || 0 })}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {form.produtoId && (
                      <div className="grid gap-2">
                        <Label>{t("dashboard.consertos.form.quantity")}</Label>
                        <Input
                          type="number"
                          min="1"
                          max={produtos.find(p => p.id === form.produtoId)?.quantidade_disponivel || 1}
                          value={form.quantidade}
                          onChange={(e) => setForm((f) => ({ ...f, quantidade: e.target.value }))}
                          placeholder={t("dashboard.consertos.form.quantity")}
                        />
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label>{t("dashboard.consertos.form.priority")}</Label>
                      <Select
                        value={form.prioridade}
                        onValueChange={(val) => setForm((f) => ({ ...f, prioridade: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">{t("dashboard.consertos.priority.low")}</SelectItem>
                          <SelectItem value="media">{t("dashboard.consertos.priority.medium")}</SelectItem>
                          <SelectItem value="alta">{t("dashboard.consertos.priority.high")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("dashboard.consertos.form.location")}</Label>
                      <Input
                        value={form.local}
                        onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
                        placeholder={t("dashboard.consertos.form.location_placeholder")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("dashboard.consertos.form.deadline")}</Label>
                      <Input
                        type="date"
                        value={form.prazo}
                        onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("dashboard.consertos.form.description")}</Label>
                      <Input
                        value={form.descricao}
                        onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                        placeholder={t("dashboard.consertos.form.description_placeholder")}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpenNew(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-[#37352f] hover:bg-zinc-800 text-white">
                      {loading ? t("dashboard.ferramentas.form.saving") : t("dashboard.consertos.form.save")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={openExportDialog} onOpenChange={setOpenExportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileDown className="h-4 w-4 mr-2" />
                  {t("dashboard.consertos.export_pdf")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("dashboard.consertos.export.title")}</DialogTitle>
                  <DialogDescription>
                    {t("dashboard.consertos.export.desc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Prioridade</Label>
                      <Select
                        value={exportFilters.prioridade}
                        onValueChange={(val: any) =>
                          setExportFilters((f) => ({ ...f, prioridade: val }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todas">{t("dashboard.consertos.priority.all")}</SelectItem>
                          <SelectItem value="alta">{t("dashboard.consertos.priority.high")}</SelectItem>
                          <SelectItem value="media">{t("dashboard.consertos.priority.medium")}</SelectItem>
                          <SelectItem value="baixa">{t("dashboard.consertos.priority.low")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select
                        value={exportFilters.status}
                        onValueChange={(val: any) =>
                          setExportFilters((f) => ({ ...f, status: val }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">{t("dashboard.consertos.status.all")}</SelectItem>
                          <SelectItem value="aguardando">{t("dashboard.consertos.status.waiting")}</SelectItem>
                          <SelectItem value="em_andamento">{t("dashboard.consertos.status.in_progress")}</SelectItem>
                          <SelectItem value="concluido">{t("dashboard.consertos.status.completed")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>{t("dashboard.consertos.export.product")}</Label>
                    <Select
                      value={exportFilters.produtoId || "todos"}
                      onValueChange={(val: string) =>
                        setExportFilters((f) => ({ ...f, produtoId: val === "todos" ? "" : val }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("dashboard.consertos.export.product_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">{t("dashboard.consertos.export.all_products")}</SelectItem>
                        {produtos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>{t("dashboard.consertos.export.location")}</Label>
                    <Input
                      placeholder={t("dashboard.consertos.export.location_placeholder")}
                      value={exportFilters.local}
                      onChange={(e) =>
                        setExportFilters((f) => ({ ...f, local: e.target.value }))
                      }
                    />
                  </div>

                  {/* Date Filters omitted for brevity but can keep if needed. For now keeping main layout clean. */}

                </div>
                <DialogFooter>
                  {/* Export buttons... */}
                  <Button onClick={handleExportPDF} disabled={getFilteredConsertos().length === 0}>
                    {t("dashboard.consertos.export_pdf")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            <Input
              placeholder={t("dashboard.movimentacoes.filters.search_placeholder") || "Buscar..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-white border-zinc-300 focus:border-blue-500 dark:bg-zinc-900 dark:border-zinc-700"
            />
          </div>
        </div>
      </Tabs>

      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-700">
        <Table className="hidden md:table">
          <TableHeader className="bg-zinc-50 dark:bg-zinc-800">
            <TableRow>
              <TableHead className="w-[120px]">{t("dashboard.consertos.table.status")}</TableHead>
              <TableHead>{t("dashboard.consertos.table.product")}</TableHead>
              <TableHead>{t("dashboard.consertos.table.priority")}</TableHead>
              <TableHead>{t("dashboard.consertos.table.location")}</TableHead>
              <TableHead className="text-right">{t("dashboard.consertos.table.deadline")}</TableHead>
              <TableHead className="text-right">{t("dashboard.consertos.table.sent_at")}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredConsertos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-zinc-500 dark:text-zinc-400">
                  {t("dashboard.consertos.no_results")}
                </TableCell>
              </TableRow>
            ) : (
              filteredConsertos.map((conserto) => {
                const f = parseFerramenta(conserto.ferramentas)
                return (
                  <TableRow key={conserto.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <TableCell>
                      <Badge variant={getStatusBadge(conserto.status)} className="capitalize gap-2 whitespace-nowrap">
                        {getStatusIcon(conserto.status)}
                        <span>{getStatusLabel(conserto.status)}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{f.nome}</span>
                        <span className="text-xs text-zinc-500">Item #{conserto.id.slice(0, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="capitalize text-sm text-zinc-600 dark:text-zinc-300">
                        {conserto.prioridade || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-zinc-600 dark:text-zinc-300">
                        {conserto.local_conserto || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">
                      {conserto.prazo ? format(new Date(conserto.prazo), "dd/MM/yyyy", { locale: dateLocale }) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">
                      {conserto.data_envio ? format(new Date(conserto.data_envio), "dd/MM/yyyy", { locale: dateLocale }) : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t("dashboard.consertos.actions.actions")}</DropdownMenuLabel>
                          {conserto.status !== "concluido" ? (
                            <DropdownMenuItem onClick={() => handleQuickReturn(conserto)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              {t("dashboard.consertos.actions.register_return")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              {t("dashboard.consertos.status.completed")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setRetornoDialog(conserto)}>
                            <Wrench className="mr-2 h-4 w-4" />
                            {t("dashboard.consertos.actions.update_status")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-700">
          {filteredConsertos.map((conserto) => {
            const f = parseFerramenta(conserto.ferramentas)
            return (
              <div
                key={conserto.id}
                className="p-4 space-y-3 active:bg-zinc-50 dark:active:bg-zinc-800"
              >
                <div className="flex items-start justify-between">
                  <Badge variant={getStatusBadge(conserto.status)} className="capitalize gap-2 whitespace-nowrap text-xs">
                    {getStatusIcon(conserto.status)}
                    <span>{getStatusLabel(conserto.status)}</span>
                  </Badge>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      {conserto.data_envio ? format(new Date(conserto.data_envio), "dd/MM", { locale: dateLocale }) : "-"}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 -mr-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t("dashboard.consertos.actions.actions")}</DropdownMenuLabel>
                        {conserto.status !== "concluido" ? (
                          <DropdownMenuItem onClick={() => handleQuickReturn(conserto)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {t("dashboard.consertos.actions.register_return")}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem disabled>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {t("dashboard.consertos.status.completed")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setRetornoDialog(conserto)}>
                          <Wrench className="mr-2 h-4 w-4" />
                          {t("dashboard.consertos.actions.update_status")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div onClick={() => setRetornoDialog(conserto)} className="cursor-pointer">
                  <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{f.nome}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-zinc-500 truncate max-w-[150px]">{conserto.local_conserto || "-"}</p>
                    {conserto.prioridade && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400 capitalize">
                        {conserto.prioridade}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Return/Update Status Dialog */}
      <Dialog open={!!retornoDialog} onOpenChange={(open) => !open && setRetornoDialog(null)}>
        <DialogContent>
          <form onSubmit={handleRetorno}>
            <DialogHeader>
              <DialogTitle>{t("dashboard.consertos.return_dialog.title")}</DialogTitle>
              <DialogDescription>
                Item: {retornoDialog?.ferramentas && parseFerramenta(retornoDialog.ferramentas).nome}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="grid gap-2">
                <Label>{t("dashboard.consertos.return_dialog.status_label")}</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={retornoDialog?.status === "aguardando" ? "default" : "outline"}
                      onClick={() => retornoDialog && handleAtualizarStatus(retornoDialog.id, "aguardando")}
                      disabled={statusLoadingId === retornoDialog?.id}
                    >
                      {t("dashboard.consertos.status.waiting")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={retornoDialog?.status === "em_andamento" ? "default" : "outline"}
                      onClick={() => retornoDialog && handleAtualizarStatus(retornoDialog.id, "em_andamento")}
                      disabled={statusLoadingId === retornoDialog?.id}
                    >
                      {t("dashboard.consertos.status.in_progress")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Only show return inputs if not just updating status? Or always allow concluding? 
                  The original logic had registrarRetornoConserto which also concludes it. 
                  Let's keep the return form inputs.
              */}
              <div className="grid gap-2">
                <Label>{t("dashboard.consertos.return_dialog.cost")}</Label>
                <Input name="custo" type="number" step="0.01" placeholder="0.00" />
              </div>
              <div className="grid gap-2">
                <Label>{t("dashboard.consertos.return_dialog.quantity_returned")}</Label>
                <Input
                  name="quantidade"
                  type="number"
                  defaultValue={1}
                  max={quantidadeEmConserto}
                  min={1}
                />
                <p className="text-xs text-zinc-500">
                  {t("dashboard.consertos.return_dialog.quantity_max", { count: quantidadeEmConserto })}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRetornoDialog(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-[#37352f] hover:bg-zinc-800 text-white">
                {loading ? "Saving..." : t("dashboard.consertos.return_dialog.conclude_action")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default memo(ConsertosList)
