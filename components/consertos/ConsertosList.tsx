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

  const consertosAbertos = useMemo(
    () => consertos.filter((c) => c.status !== "concluido"),
    [consertos]
  )
  const consertosConcluidos = useMemo(
    () => consertos.filter((c) => c.status === "concluido"),
    [consertos]
  )

  const produtoSuggestions = useMemo(() => {
    const s = form.produto.toLowerCase()
    if (!s) return produtos.slice(0, 5)
    return produtos.filter((p) => p.nome.toLowerCase().includes(s)).slice(0, 5)
  }, [form.produto, produtos])

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

  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text("Relatório de Consertos", 14, 16)
    doc.setFontSize(10)
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 22)

    const rows = consertos.map((c) => {
      const f = parseFerramenta(c.ferramentas)
      return [
        f.nome,
        c.status,
        c.prioridade || "-",
        c.local_conserto || "-",
        c.prazo ? format(new Date(c.prazo), "dd/MM/yyyy") : "-",
        c.data_envio ? format(new Date(c.data_envio), "dd/MM/yyyy") : "-",
      ]
    })

    autoTable(doc, {
      startY: 28,
      head: [["Produto", "Status", "Prioridade", "Local", "Prazo", "Data Envio"]],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [17, 24, 39] },
    })

    const stamp = new Date().toISOString().replace(/[:.-]/g, "").slice(0, 15)
    doc.save(`consertos_${stamp}.pdf`)
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
        <Button variant="outline" onClick={handleExportPDF}>
          Exportar PDF
        </Button>
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
