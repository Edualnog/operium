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
  const [retornoDialog, setRetornoDialog] = useState<Conserto | null>(null)
  const [loading, setLoading] = useState(false)
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

  const consertosAbertos = useMemo(
    () => consertos.filter((c) => c.status !== "concluido"),
    [consertos]
  )
  const consertosConcluidos = useMemo(
    () => consertos.filter((c) => c.status === "concluido"),
    [consertos]
  )

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

  useEffect(() => {
    async function buscarQuantidadeEmConserto() {
      if (!retornoDialog) return

      try {
        const ferramenta = parseFerramenta(retornoDialog.ferramentas)
        const dataEnvioRef = retornoDialog.data_envio || new Date().toISOString()

        // Primeiro tenta achar a movimentação do envio com referência ao conserto na observação
        const { data: movEnvioPorObs } = await supabase
          .from("movimentacoes")
          .select("quantidade, data")
          .eq("ferramenta_id", ferramenta.id)
          .eq("tipo", "conserto")
          .ilike("observacoes", `%${retornoDialog.id}%`)
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
          .ilike("observacoes", `%${retornoDialog.id}%`)

        const quantidadeJaRetornada = (movRetornos || []).reduce((acc: number, m: any) => acc + (m.quantidade || 0), 0)
        const quantidadeAindaEmConserto = quantidadeEnviada - quantidadeJaRetornada

        setQuantidadeEmConserto(Math.max(0, quantidadeAindaEmConserto))
      } catch (err) {
        console.error("Erro ao buscar quantidade em conserto:", err)
        setQuantidadeEmConserto(1)
      }
    }

    buscarQuantidadeEmConserto()
  }, [retornoDialog, supabase, parseFerramenta])

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
        "www.almoxfacil.alnog.com.br",
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
        return <CheckCircle2 className="h-4 w-4" />
      case "em_andamento":
        return <Wrench className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Dialog open={openExportDialog} onOpenChange={setOpenExportDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">{t("dashboard.consertos.export_pdf")}</Button>
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

              <div className="grid gap-2">
                <Label className="text-sm font-semibold">{t("dashboard.consertos.export.send_period")}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">{t("dashboard.consertos.export.start_date")}</Label>
                    <Input
                      type="date"
                      value={exportFilters.dataEnvioInicio}
                      onChange={(e) =>
                        setExportFilters((f) => ({ ...f, dataEnvioInicio: e.target.value }))
                      }
                      className="text-sm md:text-base"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Data Fim</Label>
                    <Input
                      type="date"
                      value={exportFilters.dataEnvioFim}
                      onChange={(e) =>
                        setExportFilters((f) => ({ ...f, dataEnvioFim: e.target.value }))
                      }
                      className="text-sm md:text-base"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-semibold">{t("dashboard.consertos.export.return_period")}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">{t("dashboard.consertos.export.start_date")}</Label>
                    <Input
                      type="date"
                      value={exportFilters.dataRetornoInicio}
                      onChange={(e) =>
                        setExportFilters((f) => ({ ...f, dataRetornoInicio: e.target.value }))
                      }
                      className="text-sm md:text-base"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Data Fim</Label>
                    <Input
                      type="date"
                      value={exportFilters.dataRetornoFim}
                      onChange={(e) =>
                        setExportFilters((f) => ({ ...f, dataRetornoFim: e.target.value }))
                      }
                      className="text-sm md:text-base"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>{t("dashboard.consertos.export.total_to_export")}</strong> {getFilteredConsertos().length}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setExportFilters({
                    prioridade: "todas",
                    status: "todos",
                    dataEnvioInicio: "",
                    dataEnvioFim: "",
                    dataRetornoInicio: "",
                    dataRetornoFim: "",
                    local: "",
                    produtoId: "",
                  })
                }}
              >

                {t("dashboard.consertos.actions.clear_filters")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpenExportDialog(false)}>
                {t("dashboard.consertos.actions.cancel")}
              </Button>
              <Button onClick={handleExportPDF} disabled={getFilteredConsertos().length === 0}>
                {t("dashboard.consertos.export_pdf")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpenNew(true)}>{t("dashboard.consertos.new_button")}</Button>
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
                      required
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t("dashboard.consertos.form.units", { count: produtos.find(p => p.id === form.produtoId)?.quantidade_disponivel || 0 })}
                    </p>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>{t("dashboard.consertos.form.status")}</Label>
                  <Select value={form.status} onValueChange={(val: any) => setForm((f) => ({ ...f, status: val }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aguardando">{t("dashboard.consertos.status.waiting")}</SelectItem>
                      <SelectItem value="em_andamento">{t("dashboard.consertos.status.in_progress")}</SelectItem>
                      <SelectItem value="concluido">{t("dashboard.consertos.status.completed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("dashboard.consertos.form.location")}</Label>
                  <Input
                    placeholder={t("dashboard.consertos.form.location_placeholder")}
                    value={form.local}
                    onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
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
                  <Label>{t("dashboard.consertos.form.priority")}</Label>
                  <Select
                    value={form.prioridade}
                    onValueChange={(val: any) => setForm((f) => ({ ...f, prioridade: val }))}
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
                  <Label>{t("dashboard.consertos.form.description")}</Label>
                  <Input
                    placeholder={t("dashboard.consertos.form.description_placeholder")}
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenNew(false)}>
                  {t("dashboard.consertos.actions.cancel")}
                </Button>
                <Button type="submit" disabled={loading || !form.produtoId}>
                  {loading ? t("dashboard.consertos.actions.processing") : t("dashboard.consertos.form.save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {/* Consertos Abertos */}
      {consertosAbertos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("dashboard.consertos.open_repairs")}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch">
            {consertosAbertos.map((conserto) => (
              <Card key={conserto.id} className="flex h-full flex-col">
                <CardContent className="p-6 flex h-full flex-col">
                  <div className="flex h-full flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">
                          {parseFerramenta(conserto.ferramentas).nome}
                        </h3>
                        {conserto.prioridade && (
                          <Badge
                            variant={
                              conserto.prioridade === "alta"
                                ? "destructive"
                                : conserto.prioridade === "media"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            Prioridade: {conserto.prioridade}
                          </Badge>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Enviado em{" "}
                          {conserto.data_envio
                            ? format(new Date(conserto.data_envio), "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                            : "-"}
                        </p>
                        {conserto.local_conserto && (
                          <p className="text-xs text-muted-foreground">
                            Local: {conserto.local_conserto}
                          </p>
                        )}
                        {conserto.prazo && (
                          <p className="text-xs text-muted-foreground">
                            Prazo: {format(new Date(conserto.prazo), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <Badge variant={getStatusBadge(conserto.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(conserto.status)}
                          {getStatusLabel(conserto.status)}
                        </span>
                      </Badge>
                    </div>

                    {conserto.descricao && (
                      <p className="text-sm text-muted-foreground">
                        {conserto.descricao}
                      </p>
                    )}

                    <div className="flex flex-col gap-2 mt-auto">
                      {conserto.status === "aguardando" && (
                        <Button
                          variant="secondary"
                          disabled={statusLoadingId === conserto.id}
                          onClick={() => handleAtualizarStatus(conserto.id, "em_andamento")}
                        >
                          {statusLoadingId === conserto.id ? t("dashboard.consertos.actions.processing") : t("dashboard.consertos.actions.mark_in_progress")}
                        </Button>
                      )}

                      {conserto.status !== "concluido" && (
                        <Button
                          className="w-full"
                          onClick={() => setRetornoDialog(conserto)}
                        >
                          {t("dashboard.consertos.actions.register_return")}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Consertos Concluídos */}
      {consertosConcluidos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("dashboard.consertos.completed_repairs")}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch">
            {consertosConcluidos.map((conserto) => (
              <Card key={conserto.id} className="flex h-full flex-col">
                <CardContent className="p-6 flex h-full flex-col">
                  <div className="flex h-full flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">
                          {parseFerramenta(conserto.ferramentas).nome}
                        </h3>
                        {conserto.prioridade && (
                          <Badge
                            variant={
                              conserto.prioridade === "alta"
                                ? "destructive"
                                : conserto.prioridade === "media"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            Prioridade: {conserto.prioridade}
                          </Badge>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Enviado em{" "}
                          {conserto.data_envio
                            ? format(new Date(conserto.data_envio), "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                            : "-"}
                        </p>
                        {conserto.local_conserto && (
                          <p className="text-xs text-muted-foreground">
                            Local: {conserto.local_conserto}
                          </p>
                        )}
                        {conserto.prazo && (
                          <p className="text-xs text-muted-foreground">
                            Prazo: {format(new Date(conserto.prazo), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                        {conserto.data_retorno && (
                          <p className="text-sm text-muted-foreground">
                            {t("dashboard.consertos.labels.returned_at")}{" "}
                            {format(new Date(conserto.data_retorno), "dd/MM/yyyy", {
                              locale: dateLocale,
                            })}
                          </p>
                        )}
                      </div>
                      <Badge variant={getStatusBadge(conserto.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(conserto.status)}
                          {getStatusLabel(conserto.status)}
                        </span>
                      </Badge>
                    </div>

                    {conserto.descricao && (
                      <p className="text-sm text-muted-foreground">
                        {conserto.descricao}
                      </p>
                    )}

                    {conserto.custo && (
                      <div className="flex items-center justify-between p-2 bg-muted rounded-md mt-auto">
                        <span className="text-sm font-medium">{t("dashboard.consertos.labels.cost")}:</span>
                        <span className="text-sm font-semibold">
                          R$ {conserto.custo.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {consertos.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {t("dashboard.consertos.no_repairs")}
        </div>
      )}

      {/* Dialog de Retorno */}
      {retornoDialog && (
        <Dialog open={!!retornoDialog} onOpenChange={(open) => {
          if (!open) {
            setRetornoDialog(null)
            setQuantidadeEmConserto(0)
          }
        }}>
          <DialogContent>
            <form onSubmit={handleRetorno}>
              <DialogHeader>
                <DialogTitle>{t("dashboard.consertos.return.title")}</DialogTitle>
                <DialogDescription>
                  {t("dashboard.consertos.return.tool_label", { name: parseFerramenta(retornoDialog.ferramentas).nome })}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="custo">{t("dashboard.consertos.return.cost")}</Label>
                  <Input
                    id="custo"
                    name="custo"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantidade">{t("dashboard.consertos.return.quantity")}</Label>
                  <Input
                    id="quantidade"
                    name="quantidade"
                    type="number"
                    min="1"
                    max={quantidadeEmConserto}
                    defaultValue={quantidadeEmConserto > 0 ? quantidadeEmConserto : 1}
                    required
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {quantidadeEmConserto > 0
                      ? t("dashboard.consertos.return.in_repair_count", { count: quantidadeEmConserto })
                      : t("dashboard.consertos.actions.loading")}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRetornoDialog(null)}
                >
                  {t("dashboard.consertos.actions.cancel")}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? t("dashboard.consertos.actions.processing") : t("dashboard.consertos.return.confirm")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default memo(ConsertosList)
