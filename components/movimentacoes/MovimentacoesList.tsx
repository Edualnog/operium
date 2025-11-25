"use client"

import { useMemo, useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Search, Plus, Package, RotateCcw, PackageMinus, PackagePlus, FileDown, Filter } from "lucide-react"
import { MovimentacoesFilters, type FilterState } from "./MovimentacoesFilters"
import { cn } from "@/lib/utils"

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
}

interface Colaborador {
  id: string
  nome: string
}

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
  const [movimentacoes, setMovimentacoes] = useState(initialMovs)
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

  // Atualizar lista quando initialMovs mudar (após router.refresh())
  useEffect(() => {
    console.log("📋 Movimentações atualizadas:", initialMovs.length)
    setMovimentacoes(initialMovs)
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

    return result
  }, [movimentacoes, search, filters, ferramentas, colaboradores])

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
      alert("Selecione um produto da lista")
      return
    }
    if (form.tipo !== "entrada" && !form.colaboradorId) {
      alert("Selecione um colaborador")
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
      if (!res.ok) throw new Error(json.error || "Erro ao registrar movimentação")

      console.log("✅ Movimentação registrada com sucesso!")
      
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
      alert(err.message || "Erro ao registrar movimentação")
    } finally {
      setLoading(false)
    }
  }

  const tipoBadge = (tipo: string) => {
    const map: Record<string, "default" | "secondary" | "destructive"> = {
      entrada: "default",
      retirada: "destructive",
      devolucao: "default",
      conserto: "secondary",
    }
    return map[tipo] || "default"
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
      alert("Nenhuma movimentação encontrada com os filtros selecionados")
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
      alert("Erro ao exportar CSV")
    } finally {
      setExportingCsv(false)
      setOpenExportDialog(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros de Período Rápido */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4 pb-4 border-b border-zinc-200">
        <span className="text-sm font-medium text-zinc-700 whitespace-nowrap">Período:</span>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant={periodoRapido === "hoje" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodoRapido(periodoRapido === "hoje" ? null : "hoje")}
            className="text-sm"
          >
            Hoje
          </Button>
          <Button
            type="button"
            variant={periodoRapido === "ontem" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodoRapido(periodoRapido === "ontem" ? null : "ontem")}
            className="text-sm"
          >
            Ontem
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={periodoRapido === "selecionar" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodoRapido(periodoRapido === "selecionar" ? null : "selecionar")}
              className="text-sm"
            >
              Selecionar
            </Button>
            {periodoRapido === "selecionar" && (
              <Input
                type="date"
                value={dataSelecionada}
                onChange={(e) => {
                  setDataSelecionada(e.target.value)
                  if (e.target.value) {
                    setPeriodoRapido("selecionar")
                  }
                }}
                className="w-auto h-9 text-sm"
              />
            )}
          </div>
          {periodoRapido && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPeriodoRapido(null)
                setDataSelecionada("")
                setFilters(prev => ({
                  ...prev,
                  dataInicio: null,
                  dataFim: null,
                }))
              }}
              className="text-sm text-zinc-500 hover:text-zinc-700"
            >
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <MovimentacoesFilters
        ferramentas={ferramentas}
        colaboradores={colaboradores}
        filters={filters}
        onFiltersChange={setFilters}
        totalEncontrados={filtered.length}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Buscar por produto, colaborador ou tipo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm md:text-base"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={openExportDialog} onOpenChange={setOpenExportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={exportingCsv || movimentacoes.length === 0}>
                <Filter className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Filtros de Exportação</DialogTitle>
                <DialogDescription>
                  Selecione os filtros para exportar as movimentações em CSV
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Tipo de Movimentação</Label>
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
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="retirada">Retirada</SelectItem>
                      <SelectItem value="devolucao">Devolução</SelectItem>
                      <SelectItem value="conserto">Conserto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Produto</Label>
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
                      <SelectItem value="todos">Todos os produtos</SelectItem>
                      {ferramentas.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Colaborador</Label>
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
                      <SelectItem value="todos">Todos os colaboradores</SelectItem>
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
                    <Label>Data Início</Label>
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
                    <Label>Data Fim</Label>
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
                  {getFilteredMovimentacoes().length} movimentação(ões) serão exportadas
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
                  Limpar Filtros
                </Button>
                <Button onClick={handleExportCSV} disabled={getFilteredMovimentacoes().length === 0}>
                  {exportingCsv ? "Exportando..." : "Exportar CSV"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-md max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Nova movimentação</DialogTitle>
                <DialogDescription>Escolha o tipo, produto e quantidade.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(val: any) => setForm((f) => ({ ...f, tipo: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="retirada">Saída/Retirada</SelectItem>
                      <SelectItem value="devolucao">Devolução</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Produto</Label>
                  <Input
                    placeholder="Digite o nome do produto"
                    value={form.produto}
                    onChange={(e) => setForm((f) => ({ ...f, produto: e.target.value, produtoId: "" }))}
                    className="text-sm md:text-base"
                  />
                  {suggestions.length > 0 && (
                    <div className="border rounded-md divide-y bg-white shadow-sm max-h-48 overflow-auto">
                      {suggestions.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-50 text-sm"
                          onClick={() => setForm((f) => ({ ...f, produto: s.nome, produtoId: s.id }))}
                        >
                          <div className="text-sm font-medium text-zinc-900">{s.nome}</div>
                          <div className="text-xs text-zinc-500">{s.tipo_item || "Produto"}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min={form.tipo === "entrada" ? 1 : 1}
                      value={form.quantidade}
                      onChange={(e) => setForm((f) => ({ ...f, quantidade: e.target.value }))}
                      required
                    />
                  </div>

                  {(form.tipo === "retirada" || form.tipo === "devolucao") && (
                    <div className="grid gap-2">
                      <Label>Colaborador</Label>
                      <Input
                        placeholder="Digite o nome do colaborador"
                        value={form.colaboradorNome}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, colaboradorNome: e.target.value, colaboradorId: "" }))
                        }
                      />
                      {colabSuggestions.length > 0 && (
                        <div className="border rounded-md divide-y bg-white shadow-sm max-h-40 overflow-auto">
                          {colabSuggestions.map((c) => (
                            <button
                              type="button"
                              key={c.id}
                              className="w-full text-left px-3 py-2 hover:bg-zinc-50"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  colaboradorId: c.id,
                                  colaboradorNome: c.nome,
                                }))
                              }
                            >
                              <div className="text-sm font-medium text-zinc-900">{c.nome}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-zinc-500">
                        Escolha o colaborador responsável pela retirada/devolução.
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Data/Hora</Label>
                  <Input
                    type="datetime-local"
                    value={form.dataMov}
                    onChange={(e) => setForm((f) => ({ ...f, dataMov: e.target.value }))}
                  />
                  <div className="text-xs text-zinc-500">Se preferir, ajuste a data/hora. Por padrão usamos agora.</div>
                </div>

                <div className="grid gap-2">
                  <Label>Observações</Label>
                  <Input
                    placeholder="Opcional"
                    value={form.observacoes}
                    onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Cabeçalho da tabela */}
        {/* Cabeçalho - Desktop */}
        <div className="hidden md:grid grid-cols-[2fr_100px_150px_180px_1fr] gap-4 px-4 py-3 bg-zinc-50 border-b border-zinc-200 font-semibold text-xs text-zinc-700 uppercase tracking-wide">
          <div>Item</div>
          <div className="text-center">Quantidade</div>
          <div>Responsável</div>
          <div>Data/Hora</div>
          <div>Observações</div>
        </div>
        
        {/* Corpo da tabela */}
        <div className="divide-y divide-zinc-200">
          {filtered.map((m) => (
            <>
              {/* Versão Desktop */}
              <div
                key={m.id}
                className="hidden md:grid grid-cols-[2fr_100px_150px_180px_1fr] gap-4 px-4 py-3 hover:bg-zinc-50/50 transition-colors"
              >
              <div className="flex items-center gap-2 min-w-0">
                <Badge 
                  variant={tipoBadge(m.tipo)} 
                  className={cn(
                    "capitalize shrink-0 text-xs px-2 py-0.5",
                    tipoBadgeClassName(m.tipo)
                  )}
                >
                  {m.tipo}
                </Badge>
                <span className="font-medium text-sm text-zinc-900 truncate">
                  {m.ferramentas?.nome || "Produto"}
                </span>
              </div>
              <div className="flex items-center justify-center text-sm font-medium text-zinc-700">
                {m.quantidade}
              </div>
              <div className="flex items-center text-sm text-zinc-700 truncate">
                {m.colaboradores?.nome || "-"}
              </div>
              <div className="flex items-center text-sm text-zinc-600">
                {m.data ? format(new Date(m.data), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
              </div>
              <div className="flex items-center text-sm text-zinc-600 truncate" title={m.observacoes || ""}>
                {m.observacoes || "-"}
              </div>
              </div>
              
              {/* Versão Mobile */}
              <div
                key={`${m.id}-mobile`}
                className="md:hidden p-3 border-b border-zinc-200 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge 
                    variant={tipoBadge(m.tipo)} 
                    className={cn(
                      "capitalize shrink-0 text-xs px-2 py-0.5",
                      tipoBadgeClassName(m.tipo)
                    )}
                  >
                    {m.tipo}
                  </Badge>
                  <span className="text-xs text-zinc-500">
                    {m.data ? format(new Date(m.data), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm text-zinc-900">
                    {m.ferramentas?.nome || "Produto"}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-600">
                  <span>Qtd: <strong>{m.quantidade}</strong></span>
                  <span>Resp: <strong>{m.colaboradores?.nome || "-"}</strong></span>
                </div>
                {m.observacoes && (
                  <div className="text-xs text-zinc-500 pt-1 border-t border-zinc-100">
                    {m.observacoes}
                  </div>
                )}
              </div>
            </>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma movimentação encontrada
        </div>
      )}
    </div>
  )
}
