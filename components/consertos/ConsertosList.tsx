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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { registrarRetornoConserto } from "@/lib/actions"
import { CheckCircle2, Clock, Wrench } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { registrarEnvioConserto } from "@/lib/actions"

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
  const parseFerramenta = (ferramentas: Conserto["ferramentas"]) => {
    const f = Array.isArray(ferramentas) ? ferramentas[0] : ferramentas
    return {
      id: f?.id || "",
      nome: f?.nome || "Sem nome",
      quantidade_disponivel: Number(f?.quantidade_disponivel || 0),
    }
  }

  const [consertos, setConsertos] = useState(initialConsertos)
  const [retornoDialog, setRetornoDialog] = useState<Conserto | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [openNew, setOpenNew] = useState(false)
  const [openExportDialog, setOpenExportDialog] = useState(false)
  const [produtos, setProdutos] = useState<{ id: string; nome: string }[]>([])
  const [form, setForm] = useState({
    produto: "",
    produtoId: "",
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
    
    const s = form.produto.toLowerCase()
    if (!s) return produtos.slice(0, 5)
    
    // Verificar se o texto digitado corresponde exatamente a algum produto selecionado
    const produtoSelecionado = produtos.find(p => p.id === form.produtoId)
    if (produtoSelecionado && form.produto.toLowerCase() === produtoSelecionado.nome.toLowerCase()) {
      return []
    }
    
    return produtos.filter((p) => p.nome.toLowerCase().includes(s)).slice(0, 5)
  }, [form.produto, form.produtoId, produtos])

  const carregarProdutos = async () => {
    const { data } = await supabase.from("ferramentas").select("id, nome").order("nome", { ascending: true })
    setProdutos(data || [])
  }

  useEffect(() => {
    carregarProdutos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const handleRetorno = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!retornoDialog) return

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const custo = Number(formData.get("custo"))
    const ferramenta = parseFerramenta(retornoDialog.ferramentas)
    const quantidade = Number(formData.get("quantidade")) || ferramenta.quantidade_disponivel

    try {
      await registrarRetornoConserto(retornoDialog.id, custo, quantidade)
      setRetornoDialog(null)
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Erro ao registrar retorno")
    } finally {
      setLoading(false)
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
      alert("Selecione um produto")
      return
    }
    setLoading(true)
    try {
      await registrarEnvioConserto(
        form.produtoId,
        1,
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
        status: "aguardando",
        local: "",
        prazo: "",
        prioridade: "media",
        descricao: "",
      })
      router.refresh()
    } catch (err: any) {
      alert(err.message || "Erro ao criar ordem de conserto")
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
      alert("Nenhum conserto encontrado com os filtros selecionados.")
      return
    }

    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text("Relatório de Consertos", 14, 16)
    doc.setFontSize(10)
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 22)

    // Adicionar informações dos filtros aplicados
    let yPos = 28
    const filtersApplied: string[] = []
    if (exportFilters.prioridade !== "todas") {
      filtersApplied.push(`Prioridade: ${exportFilters.prioridade}`)
    }
    if (exportFilters.status !== "todos") {
      filtersApplied.push(`Status: ${getStatusLabel(exportFilters.status)}`)
    }
    if (exportFilters.produtoId) {
      const produto = produtos.find((p) => p.id === exportFilters.produtoId)
      if (produto) filtersApplied.push(`Produto: ${produto.nome}`)
    }
    if (exportFilters.local.trim()) {
      filtersApplied.push(`Local: ${exportFilters.local}`)
    }
    if (exportFilters.dataEnvioInicio || exportFilters.dataEnvioFim) {
      const inicio = exportFilters.dataEnvioInicio
        ? format(new Date(exportFilters.dataEnvioInicio), "dd/MM/yyyy")
        : "..."
      const fim = exportFilters.dataEnvioFim
        ? format(new Date(exportFilters.dataEnvioFim), "dd/MM/yyyy")
        : "..."
      filtersApplied.push(`Data Envio: ${inicio} a ${fim}`)
    }
    if (exportFilters.dataRetornoInicio || exportFilters.dataRetornoFim) {
      const inicio = exportFilters.dataRetornoInicio
        ? format(new Date(exportFilters.dataRetornoInicio), "dd/MM/yyyy")
        : "..."
      const fim = exportFilters.dataRetornoFim
        ? format(new Date(exportFilters.dataRetornoFim), "dd/MM/yyyy")
        : "..."
      filtersApplied.push(`Data Retorno: ${inicio} a ${fim}`)
    }

    if (filtersApplied.length > 0) {
      doc.setFontSize(8)
      doc.text(`Filtros: ${filtersApplied.join(" | ")}`, 14, yPos)
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
      head: [["Produto", "Status", "Prioridade", "Local", "Prazo", "Data Envio", "Data Retorno", "Custo"]],
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
        `Gerado em ${format(agora, "dd/MM/yyyy HH:mm", { locale: ptBR })} - Página ${i} de ${pageCount}`,
        14,
        pageHeight - 20
      )
      
      // Rodapé padrão
      doc.setFontSize(7)
      doc.text(
        "Gerado por Almox Fácil",
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
      aguardando: "Aguardando",
      em_andamento: "Em Andamento",
      concluido: "Concluído",
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
            <Button variant="outline">Exportar PDF</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Filtros de Exportação</DialogTitle>
              <DialogDescription>
                Selecione os filtros para exportar apenas os consertos desejados. Deixe em branco para exportar todos.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
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
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="aguardando">Aguardando</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Produto (Opcional)</Label>
                <Select
                  value={exportFilters.produtoId || "todos"}
                  onValueChange={(val: string) =>
                    setExportFilters((f) => ({ ...f, produtoId: val === "todos" ? "" : val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os produtos</SelectItem>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Local de Conserto (Opcional)</Label>
                <Input
                  placeholder="Digite o local (ex: Oficina, Fornecedor)"
                  value={exportFilters.local}
                  onChange={(e) =>
                    setExportFilters((f) => ({ ...f, local: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-semibold">Período de Envio</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Data Início</Label>
                    <Input
                      type="date"
                      value={exportFilters.dataEnvioInicio}
                      onChange={(e) =>
                        setExportFilters((f) => ({ ...f, dataEnvioInicio: e.target.value }))
                      }
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
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-semibold">Período de Retorno</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Data Início</Label>
                    <Input
                      type="date"
                      value={exportFilters.dataRetornoInicio}
                      onChange={(e) =>
                        setExportFilters((f) => ({ ...f, dataRetornoInicio: e.target.value }))
                      }
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
                    />
                  </div>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Total de consertos que serão exportados:</strong> {getFilteredConsertos().length}
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
                Limpar Filtros
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpenExportDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleExportPDF} disabled={getFilteredConsertos().length === 0}>
                Exportar PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpenNew(true)}>Adicionar Produto para Conserto</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleNovaOrdem}>
              <DialogHeader>
                <DialogTitle>Nova Ordem de Conserto</DialogTitle>
                <DialogDescription>Selecione o produto e detalhes do conserto.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                <div className="grid gap-2">
                  <Label>Produto</Label>
                  <Input
                    placeholder="Digite o nome do produto"
                    value={form.produto}
                    onChange={(e) => setForm((f) => ({ ...f, produto: e.target.value, produtoId: "" }))}
                  />
                  {produtoSuggestions.length > 0 && (
                    <div className="border rounded-md divide-y bg-white shadow-sm max-h-40 overflow-auto">
                      {produtoSuggestions.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-50"
                          onClick={() => setForm((f) => ({ ...f, produto: p.nome, produtoId: p.id }))}
                        >
                          {p.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(val: any) => setForm((f) => ({ ...f, status: val }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aguardando">Aguardando</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Local / Responsável</Label>
                  <Input
                    placeholder="Oficina, fornecedor, setor"
                    value={form.local}
                    onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Prazo previsto</Label>
                  <Input
                    type="date"
                    value={form.prazo}
                    onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={form.prioridade}
                    onValueChange={(val: any) => setForm((f) => ({ ...f, prioridade: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Detalhes do defeito ou observações"
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenNew(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || !form.produtoId}>
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {/* Consertos Abertos */}
      {consertosAbertos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Consertos em Aberto</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {consertosAbertos.map((conserto) => (
              <Card key={conserto.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
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

                    {conserto.status !== "concluido" && (
                      <Button
                        className="w-full"
                        onClick={() => setRetornoDialog(conserto)}
                      >
                        Registrar Retorno
                      </Button>
                    )}
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
          <h2 className="text-xl font-semibold">Consertos Concluídos</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {consertosConcluidos.map((conserto) => (
              <Card key={conserto.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
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
                            Retornou em{" "}
                            {format(new Date(conserto.data_retorno), "dd/MM/yyyy", {
                              locale: ptBR,
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
                      <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm font-medium">Custo:</span>
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
          Nenhum conserto registrado
        </div>
      )}

      {/* Dialog de Retorno */}
      {retornoDialog && (
        <Dialog open={!!retornoDialog} onOpenChange={() => setRetornoDialog(null)}>
          <DialogContent>
            <form onSubmit={handleRetorno}>
                <DialogHeader>
                  <DialogTitle>Registrar Retorno de Conserto</DialogTitle>
                  <DialogDescription>
                    Ferramenta: {parseFerramenta(retornoDialog.ferramentas).nome}
                  </DialogDescription>
                </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="custo">Custo do Conserto (R$)</Label>
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
                  <Label htmlFor="quantidade">Quantidade Retornada</Label>
                  <Input
                    id="quantidade"
                    name="quantidade"
                    type="number"
                    min="1"
                    defaultValue={parseFerramenta(retornoDialog.ferramentas).quantidade_disponivel}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRetornoDialog(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Processando..." : "Confirmar Retorno"}
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
