"use client"

import { useState, useMemo, memo } from "react"
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
import {
  criarColaborador,
  atualizarColaborador,
  deletarColaborador,
} from "@/lib/actions"
import { Plus, Search, Trash2, Edit } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/lib/hooks/useDebounce"

interface Colaborador {
  id: string
  nome: string
  cargo?: string
  telefone?: string
}

function ColaboradoresList({
  colaboradores: initialColaboradores,
}: {
  colaboradores: Colaborador[]
}) {
  const [colaboradores, setColaboradores] = useState(initialColaboradores)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Colaborador | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const filteredColaboradores = useMemo(() => {
    if (!debouncedSearch) return colaboradores
    const searchLower = debouncedSearch.toLowerCase()
    return colaboradores.filter((c) =>
      c.nome.toLowerCase().includes(searchLower)
    )
  }, [colaboradores, debouncedSearch])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      if (editing) {
        await atualizarColaborador(editing.id, formData)
      } else {
        await criarColaborador(formData)
      }

      setOpen(false)
      setEditing(null)
      router.refresh()
    } catch (error) {
      alert("Erro ao salvar colaborador")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este colaborador?")) return

    try {
      await deletarColaborador(id)
      router.refresh()
    } catch (error) {
      alert("Erro ao excluir colaborador")
    }
  }

  const handleEdit = (colaborador: Colaborador) => {
    setEditing(colaborador)
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Editar Colaborador" : "Novo Colaborador"}
                </DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Atualize as informações do colaborador"
                    : "Adicione um novo colaborador ao sistema"}
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
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    name="cargo"
                    defaultValue={editing?.cargo || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    defaultValue={editing?.telefone || ""}
                  />
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
        {filteredColaboradores.map((colaborador) => (
          <Card key={colaborador.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{colaborador.nome}</h3>
                  {colaborador.cargo && (
                    <p className="text-sm text-muted-foreground">
                      {colaborador.cargo}
                    </p>
                  )}
                  {colaborador.telefone && (
                    <p className="text-sm text-muted-foreground">
                      {colaborador.telefone}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(colaborador)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(colaborador.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredColaboradores.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {search
            ? "Nenhum colaborador encontrado"
            : "Nenhum colaborador cadastrado"}
        </div>
      )}
    </div>
  )
}

export default memo(ColaboradoresList)

