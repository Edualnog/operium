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
  Trash2,
  Edit,
  PackagePlus,
  PackageMinus,
  RotateCcw,
  Wrench,
  FileDown,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { useDebounce } from "@/lib/hooks/useDebounce"
import { ProductPhotoUpload } from "./ProductPhotoUpload"
import { createClientComponentClient } from "@/lib/supabase-client"
import Image from "next/image"
import { FerramentasFilters, type FilterState } from "./FerramentasFilters"

interface Ferramenta {
  id: string
  nome: string
  categoria?: string
  quantidade_total: number
  quantidade_disponivel: number
  estado: "ok" | "danificada" | "em_conserto"
  tipo_item?: "ferramenta" | "epi" | "consumivel"
  codigo?: string | null
  foto_url?: string | null
  tamanho?: string | null
  cor?: string | null
  created_at?: string | null
}

interface Colaborador {
  id: string
  nome: string
}

function FerramentasList({
  ferramentas: initialFerramentas,
  colaboradores,
}: {
  ferramentas: Ferramenta[]
  colaboradores: Colaborador[]
}) {
  const [ferramentas, setFerramentas] = useState(initialFerramentas)
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    tipo: "",
    estado: "",
    categoria: "",
    ordenarPor: "nome",
    ordem: "asc",
  })
  const debouncedSearch = useDebounce(filters.search, 300)
  const [open, setOpen] = useState(false)
  const [actionDialog, setActionDialog] = useState<{
    type: "entrada" | "retirada" | "devolucao" | "conserto"
    ferramenta: Ferramenta | null
  } | null>(null)
  const [editing, setEditing] = useState<Ferramenta | null>(null)
  const [loading, setLoading] = useState(false)
  const [productCode, setProductCode] = useState("")
  const [productPhoto, setProductPhoto] = useState("")
  const [tipoItem, setTipoItem] = useState<"ferramenta" | "epi" | "consumivel">("ferramenta")
  const [exportingCsv, setExportingCsv] = useState(false)
  const supabase = createClientComponentClient()
  const [userId, setUserId] = useState<string>("")
  useEffect(() => {
    if (editing) {
      setProductCode(editing.codigo || "")
      setProductPhoto(editing.foto_url || "")
      setTipoItem(editing.tipo_item || "ferramenta")
    } else {
      setProductCode("")
      setProductPhoto("")
      setTipoItem("ferramenta")
    }
  }, [editing])
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categorias = useMemo(() => {
    const set = new Set<string>()
    ferramentas.forEach((f) => {
      if (f.categoria && f.categoria.trim() !== "") set.add(f.categoria)
    })
    return Array.from(set).sort()
  }, [ferramentas])

  const filteredFerramentas = useMemo(() => {
    let result = [...ferramentas]
    const searchLower = debouncedSearch.toLowerCase()

    if (searchLower) {
      result = result.filter(
        (f) =>
          f.nome.toLowerCase().includes(searchLower) ||
          f.categoria?.toLowerCase().includes(searchLower) ||
          f.codigo?.toLowerCase().includes(searchLower)
      )
    }

    if (filters.tipo) {
      result = result.filter((f) => f.tipo_item === filters.tipo)
    }

    if (filters.estado) {
      result = result.filter((f) => f.estado === filters.estado)
    }

    if (filters.categoria) {
      result = result.filter((f) => f.categoria === filters.categoria)
    }

    result.sort((a, b) => {
      let aVal: any
      let bVal: any
      switch (filters.ordenarPor) {
        case "quantidade_disponivel":
          aVal = a.quantidade_disponivel
          bVal = b.quantidade_disponivel
          break
        case "quantidade_total":
          aVal = a.quantidade_total
          bVal = b.quantidade_total
          break
        case "created_at":
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0
          break
        default:
          aVal = a.nome.toLowerCase()
          bVal = b.nome.toLowerCase()
      }
      if (aVal < bVal) return filters.ordem === "asc" ? -1 : 1
      if (aVal > bVal) return filters.ordem === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [ferramentas, debouncedSearch, filters])

  const gerarCodigoLocal = (nome: string, tamanho?: string, cor?: string, tipo?: string) => {
    const tipoMap: Record<string, string> = {
      ferramenta: "FER",
      epi: "EPI",
      consumivel: "CON",
    }
    const siglaTipo = tipoMap[tipo || "ferramenta"] || "PRD"
    const iniciais = nome
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 4)
    const tam = (tamanho || "").replace(/\s+/g, "").toUpperCase()
    const corSigla = (cor || "").replace(/\s+/g, "").toUpperCase().slice(0, 3)
    const rand = Math.floor(Math.random() * 900 + 100)
    return [siglaTipo, iniciais || "XX", tam || undefined, corSigla || undefined, rand]
      .filter(Boolean)
      .join("-")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const nome = formData.get("nome")?.toString() || ""
      const tamanho = formData.get("tamanho")?.toString() || ""
      const cor = formData.get("cor")?.toString() || ""
      const tipo = (formData.get("tipo_item")?.toString() as any) || "ferramenta"

      if (!formData.get("codigo") || (formData.get("codigo") as string).trim() === "") {
        formData.set("codigo", gerarCodigoLocal(nome, tamanho, cor, tipo))
      }

      if (productPhoto) {
        formData.set("foto_url", productPhoto)
      }

      if (editing) {
        await atualizarFerramenta(editing.id, formData)
      } else {
        await criarFerramenta(formData)
      }

      setOpen(false)
      setEditing(null)
      setProductPhoto("")
      setProductCode("")
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

  const handleExportCSV = () => {
    if (filteredFerramentas.length === 0) return
    setExportingCsv(true)
    try {
      const escape = (val: any) => `"${(val ?? "").toString().replace(/"/g, '""')}"`
      const headers = [
        "Nome",
        "Código",
        "Tipo",
        "Categoria",
        "Qtd Total",
        "Disponível",
        "Estado",
        "Tamanho",
        "Cor",
      ]
      const rows = filteredFerramentas.map((f) => [
        f.nome,
        f.codigo || "",
        f.tipo_item || "",
        f.categoria || "",
        f.quantidade_total,
        f.quantidade_disponivel,
        f.estado,
        f.tamanho || "",
        f.cor || "",
      ])
      const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const stamp = new Date().toISOString().replace(/[:.-]/g, "").slice(0, 15)
      a.download = `produtos_${stamp}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingCsv(false)
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
            observacoes,
            (formData.get("status_conserto") as any) || "aguardando",
            formData.get("local_conserto")?.toString(),
            formData.get("prazo_conserto")?.toString(),
            formData.get("prioridade_conserto")?.toString()
          )
          router.push("/dashboard/consertos")
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
      <FerramentasFilters
        categorias={categorias}
        filters={filters}
        onFiltersChange={setFilters}
        totalEncontrados={filteredFerramentas.length}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={exportingCsv || filteredFerramentas.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            {exportingCsv ? "Gerando CSV..." : "Exportar CSV"}
          </Button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Atualize as informações do produto"
                    : "Adicione um novo produto ao estoque"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {userId && (
                  <ProductPhotoUpload
                    currentPhotoUrl={editing?.foto_url || productPhoto}
                    onPhotoUploaded={setProductPhoto}
                    userId={userId}
                    productId={editing?.id}
                  />
                )}
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    name="nome"
                    defaultValue={editing?.nome || ""}
                    onBlur={(e) =>
                      setProductCode(
                        gerarCodigoLocal(
                          e.target.value,
                          (document.getElementById("tamanho") as HTMLInputElement)?.value || "",
                          (document.getElementById("cor") as HTMLInputElement)?.value || "",
                          tipoItem
                        )
                      )
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tipo_item">Categoria</Label>
                  <Select
                    name="tipo_item"
                    defaultValue={editing?.tipo_item || tipoItem}
                    onValueChange={(val: any) => {
                      setTipoItem(val)
                      setProductCode(
                        gerarCodigoLocal(
                          (document.getElementById("nome") as HTMLInputElement)?.value || "",
                          (document.getElementById("tamanho") as HTMLInputElement)?.value || "",
                          (document.getElementById("cor") as HTMLInputElement)?.value || "",
                          val
                        )
                      )
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ferramenta">Ferramenta</SelectItem>
                      <SelectItem value="epi">EPI</SelectItem>
                      <SelectItem value="consumivel">Consumível</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="categoria">Linha/Grupo</Label>
                    <Input
                      id="categoria"
                      name="categoria"
                      placeholder="Ex: Corte, Segurança"
                      defaultValue={editing?.categoria || ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="codigo">Código</Label>
                    <Input
                      id="codigo"
                      name="codigo"
                      value={
                        productCode ||
                        gerarCodigoLocal(
                          (document.getElementById("nome") as HTMLInputElement)?.value || editing?.nome || "",
                          (document.getElementById("tamanho") as HTMLInputElement)?.value || editing?.tamanho || "",
                          (document.getElementById("cor") as HTMLInputElement)?.value || editing?.cor || "",
                          tipoItem
                        )
                      }
                      onChange={(e) => setProductCode(e.target.value)}
                      placeholder="Gerado automaticamente"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tamanho">Tamanho / Medida</Label>
                    <Input
                      id="tamanho"
                      name="tamanho"
                      placeholder="Ex: M, 500ml, 10mm"
                      defaultValue={editing?.tamanho || ""}
                      onBlur={(e) =>
                        setProductCode(
                          gerarCodigoLocal(
                            (document.getElementById("nome") as HTMLInputElement)?.value || "",
                            e.target.value,
                            (document.getElementById("cor") as HTMLInputElement)?.value || "",
                            tipoItem
                          )
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cor">Cor</Label>
                    <Input
                      id="cor"
                      name="cor"
                      placeholder="Ex: Azul, Preto"
                      defaultValue={editing?.cor || ""}
                      onBlur={(e) =>
                        setProductCode(
                          gerarCodigoLocal(
                            (document.getElementById("nome") as HTMLInputElement)?.value || "",
                            (document.getElementById("tamanho") as HTMLInputElement)?.value || "",
                            e.target.value,
                            tipoItem
                          )
                        )
                      }
                    />
                  </div>
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
                    <div className="flex flex-col text-sm text-muted-foreground">
                      {ferramenta.codigo && <span>Código: {ferramenta.codigo}</span>}
                      {ferramenta.tipo_item && (
                        <span>
                          Tipo:{" "}
                          {ferramenta.tipo_item === "consumivel"
                            ? "Consumível"
                            : ferramenta.tipo_item === "epi"
                              ? "EPI"
                              : "Ferramenta"}
                        </span>
                      )}
                      {ferramenta.categoria && <span>Categoria: {ferramenta.categoria}</span>}
                    </div>
                  </div>
                  <Badge variant={getEstadoBadge(ferramenta.estado)}>
                    {getEstadoLabel(ferramenta.estado)}
                  </Badge>
                </div>

                {ferramenta.foto_url && (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden border bg-zinc-50">
                    <Image src={ferramenta.foto_url} alt={ferramenta.nome} fill className="object-cover" />
                  </div>
                )}

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
          {filters.search
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

                {actionDialog.type === "conserto" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="status_conserto">Status</Label>
                      <Select name="status_conserto" defaultValue="aguardando">
                        <SelectTrigger>
                          <SelectValue placeholder="Status do conserto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aguardando">Aguardando</SelectItem>
                          <SelectItem value="em_andamento">Em Andamento</SelectItem>
                          <SelectItem value="concluido">Concluído</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="local_conserto">Local / Responsável</Label>
                      <Input id="local_conserto" name="local_conserto" placeholder="Ex: Oficina interna, Fornecedor X" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="prazo_conserto">Prazo previsto</Label>
                      <Input id="prazo_conserto" name="prazo_conserto" type="date" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="prioridade_conserto">Prioridade</Label>
                      <Select name="prioridade_conserto" defaultValue="media">
                        <SelectTrigger>
                          <SelectValue placeholder="Prioridade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
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

export default memo(FerramentasList)
