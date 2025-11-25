"use client"

import { useMemo, useState } from "react"
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
import { Search, Plus, Package, RotateCcw, PackageMinus, PackagePlus } from "lucide-react"

interface Movimentacao {
  id: string
  tipo: "entrada" | "retirada" | "devolucao" | "ajuste" | "conserto"
  quantidade: number
  observacoes?: string | null
  data?: string | null
  created_at?: string | null
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
  })
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    if (!s) return movimentacoes
    return movimentacoes.filter((m) => {
      const nome = (m.ferramentas?.nome || "").toLowerCase()
      const colab = (m.colaboradores?.nome || "").toLowerCase()
      return nome.includes(s) || colab.includes(s) || m.tipo.includes(s)
    })
  }, [movimentacoes, search])

  const suggestions = useMemo(() => {
    const s = form.produto.toLowerCase()
    if (!s) return []
    return ferramentas
      .filter((f) => f.nome.toLowerCase().includes(s))
      .slice(0, 5)
  }, [form.produto, ferramentas])

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
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Erro ao registrar movimentação")

      setOpen(false)
      setForm({
        tipo: "entrada",
        produto: "",
        produtoId: "",
        quantidade: "1",
        colaboradorId: "",
        colaboradorNome: "",
        observacoes: "",
      })
      router.refresh()
    } catch (err: any) {
      alert(err.message || "Erro ao registrar movimentação")
    } finally {
      setLoading(false)
    }
  }

  const tipoBadge = (tipo: string) => {
    const map: Record<string, "default" | "secondary" | "destructive"> = {
      entrada: "default",
      retirada: "secondary",
      devolucao: "default",
      conserto: "secondary",
    }
    return map[tipo] || "default"
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Buscar por produto, colaborador ou tipo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                  />
                  {suggestions.length > 0 && (
                    <div className="border rounded-md divide-y bg-white shadow-sm max-h-48 overflow-auto">
                      {suggestions.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-50"
                          onClick={() => setForm((f) => ({ ...f, produto: s.nome, produtoId: s.id }))}
                        >
                          <div className="text-sm font-medium text-zinc-900">{s.nome}</div>
                          <div className="text-xs text-zinc-500">{s.tipo_item || "Produto"}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                        onChange={(e) => setForm((f) => ({ ...f, colaboradorNome: e.target.value, colaboradorId: "" }))}
                        list="colab-suggestions"
                      />
                      <datalist id="colab-suggestions">
                        {colaboradores.map((c) => (
                          <option
                            key={c.id}
                            value={c.nome}
                            onClick={() => setForm((f) => ({ ...f, colaboradorId: c.id, colaboradorNome: c.nome }))}
                          >
                            {c.nome}
                          </option>
                        ))}
                      </datalist>
                      <div className="text-xs text-zinc-500">Selecione um colaborador da lista para vincular.</div>
                    </div>
                  )}
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

      <div className="grid gap-3">
        {filtered.map((m) => (
          <Card key={m.id} className="border border-zinc-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={tipoBadge(m.tipo)} className="capitalize">
                      {m.tipo}
                    </Badge>
                    <span className="text-sm text-zinc-600">
                      {m.data ? format(new Date(m.data), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                    </span>
                  </div>
                  <div className="text-base font-semibold text-zinc-900">
                    {m.ferramentas?.nome || "Produto"}
                  </div>
                  <div className="text-sm text-zinc-600 flex flex-wrap gap-3">
                    <span className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {m.quantidade}
                    </span>
                    {m.colaboradores?.nome && (
                      <span className="flex items-center gap-1">
                        <RotateCcw className="h-4 w-4" />
                        {m.colaboradores.nome}
                      </span>
                    )}
                    {m.observacoes && <span className="text-xs text-zinc-500">{m.observacoes}</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma movimentação encontrada
        </div>
      )}
    </div>
  )
}
