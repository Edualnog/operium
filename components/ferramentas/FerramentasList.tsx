"use client"

import { useState, useMemo } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  criarFerramenta,
  atualizarFerramenta,
  deletarFerramenta,
  registrarEntrada,
  registrarRetirada,
  registrarDevolucao,
  registrarEnvioConserto,
} from "@/lib/actions"
import {
  Plus,
  Search,
  Trash2,
  Edit,
  PackagePlus,
  PackageMinus,
  RotateCcw,
  Wrench,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

interface Ferramenta {
  id: string
  nome: string
  categoria?: string
  quantidade_total: number
  quantidade_disponivel: number
  estado: "ok" | "danificada" | "em_conserto"
}

interface Colaborador {
  id: string
  nome: string
}

export default function FerramentasList({
  ferramentas: initialFerramentas,
  colaboradores,
}: {
  ferramentas: Ferramenta[]
  colaboradores: Colaborador[]
}) {
  const [ferramentas, setFerramentas] = useState(initialFerramentas)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [actionDialog, setActionDialog] = useState<{
    type: "entrada" | "retirada" | "devolucao" | "conserto"
    ferramenta: Ferramenta | null
  } | null>(null)
  const [editing, setEditing] = useState<Ferramenta | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const filteredFerramentas = useMemo(() => {
    if (!search) return ferramentas
    const searchLower = search.toLowerCase()
    return ferramentas.filter(
      (f) =>
        f.nome.toLowerCase().includes(searchLower) ||
        f.categoria?.toLowerCase().includes(searchLower)
    )
  }, [ferramentas, search])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      if (editing) {
        await atualizarFerramenta(editing.id, formData)
      } else {
        await criarFerramenta(formData)
      }

      setOpen(false)
      setEditing(null)
      router.refresh()
    } catch (error) {
      alert("Erro ao salvar ferramenta")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta ferramenta?")) return

    try {
      await deletarFerramenta(id)
      router.refresh()
    } catch (error) {
      alert("Erro ao excluir ferramenta")
    }
  }

  const handleAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!actionDialog?.ferramenta) return

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const quantidade = Number(formData.get("quantidade"))
    const observacoes = formData.get("observacoes")?.toString()

    try {
      switch (actionDialog.type) {
        case "entrada":
          await registrarEntrada(
            actionDialog.ferramenta.id,
            quantidade,
            observacoes
          )
          break
        case "retirada":
          const colaboradorId = formData.get("colaborador_id")?.toString()
          if (!colaboradorId) throw new Error("Colaborador é obrigatório")
          await registrarRetirada(
            actionDialog.ferramenta.id,
            colaboradorId,
            quantidade,
            observacoes
          )
          break
        case "devolucao":
          const colaboradorIdDev = formData.get("colaborador_id")?.toString()
          if (!colaboradorIdDev) throw new Error("Colaborador é obrigatório")
          await registrarDevolucao(
            actionDialog.ferramenta.id,
            colaboradorIdDev,
            quantidade,
            observacoes
          )
          break
        case "conserto":
          await registrarEnvioConserto(
            actionDialog.ferramenta.id,
            quantidade,
            observacoes
          )
          break
      }

      setActionDialog(null)
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Erro ao processar ação")
    } finally {
      setLoading(false)
    }
  }

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      ok: "default",
      danificada: "destructive",
      em_conserto: "secondary",
    }
    return variants[estado] || "default"
  }

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      ok: "OK",
      danificada: "Danificada",
      em_conserto: "Em Conserto",
    }
    return labels[estado] || estado
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ferramenta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Ferramenta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Editar Ferramenta" : "Nova Ferramenta"}
                </DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Atualize as informações da ferramenta"
                    : "Adicione uma nova ferramenta ao estoque"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    name="nome"
                    defaultValue={editing?.nome || ""}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input
                    id="categoria"
                    name="categoria"
                    defaultValue={editing?.categoria || ""}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="quantidade_total">Quantidade Total *</Label>
                    <Input
                      id="quantidade_total"
                      name="quantidade_total"
                      type="number"
                      min="0"
                      defaultValue={editing?.quantidade_total || 0}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="estado">Estado *</Label>
                    <Select
                      name="estado"
                      defaultValue={editing?.estado || "ok"}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ok">OK</SelectItem>
                        <SelectItem value="danificada">Danificada</SelectItem>
                        <SelectItem value="em_conserto">Em Conserto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false)
                    setEditing(null)
                  }}
                >
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredFerramentas.map((ferramenta) => (
          <Card key={ferramenta.id}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{ferramenta.nome}</h3>
                    {ferramenta.categoria && (
                      <p className="text-sm text-muted-foreground">
                        {ferramenta.categoria}
                      </p>
                    )}
                  </div>
                  <Badge variant={getEstadoBadge(ferramenta.estado)}>
                    {getEstadoLabel(ferramenta.estado)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-semibold">
                      {ferramenta.quantidade_total}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Disponível</p>
                    <p className="font-semibold">
                      {ferramenta.quantidade_disponivel}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActionDialog({
                        type: "entrada",
                        ferramenta,
                      })
                    }
                  >
                    <PackagePlus className="h-4 w-4 mr-1" />
                    Entrada
                  </Button>
                  {ferramenta.quantidade_disponivel > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setActionDialog({
                            type: "retirada",
                            ferramenta,
                          })
                        }
                      >
                        <PackageMinus className="h-4 w-4 mr-1" />
                        Retirar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setActionDialog({
                            type: "devolucao",
                            ferramenta,
                          })
                        }
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Devolver
                      </Button>
                    </>
                  )}
                  {ferramenta.estado === "ok" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setActionDialog({
                          type: "conserto",
                          ferramenta,
                        })
                      }
                    >
                      <Wrench className="h-4 w-4 mr-1" />
                      Conserto
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(ferramenta)
                      setOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(ferramenta.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFerramentas.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {search
            ? "Nenhuma ferramenta encontrada"
            : "Nenhuma ferramenta cadastrada"}
        </div>
      )}

      {/* Dialog de Ações */}
      {actionDialog && (
        <Dialog
          open={!!actionDialog}
          onOpenChange={() => setActionDialog(null)}
        >
          <DialogContent>
            <form onSubmit={handleAction}>
              <DialogHeader>
                <DialogTitle>
                  {actionDialog.type === "entrada" && "Registrar Entrada"}
                  {actionDialog.type === "retirada" && "Registrar Retirada"}
                  {actionDialog.type === "devolucao" && "Registrar Devolução"}
                  {actionDialog.type === "conserto" && "Enviar para Conserto"}
                </DialogTitle>
                <DialogDescription>
                  Ferramenta: {actionDialog.ferramenta?.nome}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {(actionDialog.type === "retirada" ||
                  actionDialog.type === "devolucao") && (
                  <div className="grid gap-2">
                    <Label htmlFor="colaborador_id">Colaborador *</Label>
                    <Select name="colaborador_id" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um colaborador" />
                      </SelectTrigger>
                      <SelectContent>
                        {colaboradores.map((col) => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="quantidade">Quantidade *</Label>
                  <Input
                    id="quantidade"
                    name="quantidade"
                    type="number"
                    min="1"
                    max={
                      actionDialog.type === "retirada" ||
                      actionDialog.type === "devolucao" ||
                      actionDialog.type === "conserto"
                        ? actionDialog.ferramenta?.quantidade_disponivel
                        : undefined
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Input
                    id="observacoes"
                    name="observacoes"
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActionDialog(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Processando..." : "Confirmar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

