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
import {
  criarColaborador,
  atualizarColaborador,
  deletarColaborador,
} from "@/lib/actions"
import { Plus, Search, Trash2, Edit, User, Mail, Phone, Calendar, MapPin, FileDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/lib/hooks/useDebounce"
import { PhotoUpload } from "./PhotoUpload"
import { createClientComponentClient } from "@/lib/supabase-client"
import Image from "next/image"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ColaboradoresFilters, type FilterState } from "./ColaboradoresFilters"

interface Colaborador {
  id: string
  nome: string
  cargo?: string
  telefone?: string
  foto_url?: string | null
  data_admissao?: string | null
  email?: string | null
  cpf?: string | null
  endereco?: string | null
  observacoes?: string | null
  created_at?: string
}

function ColaboradoresList({
  colaboradores: initialColaboradores,
}: {
  colaboradores: Colaborador[]
}) {
  const [colaboradores, setColaboradores] = useState(initialColaboradores)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Colaborador | null>(null)
  const [loading, setLoading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string>("")
  const [exporting, setExporting] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Obter userId para PhotoUpload
  const [userId, setUserId] = useState<string>("")
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Estado dos filtros
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    cargo: "",
    dataAdmissaoInicio: null,
    dataAdmissaoFim: null,
    ordenarPor: "nome",
    ordem: "asc",
    visualizacao: "grid",
  })

  const debouncedSearch = useDebounce(filters.search, 300)

  // Extrair lista única de cargos
  const cargos = useMemo(() => {
    const cargosSet = new Set<string>()
    colaboradores.forEach((c) => {
      if (c.cargo && c.cargo.trim() !== "") {
        cargosSet.add(c.cargo)
      }
    })
    return Array.from(cargosSet).sort()
  }, [colaboradores])

  // Filtrar e ordenar colaboradores
  const filteredAndSortedColaboradores = useMemo(() => {
    let result = [...colaboradores]

    // Busca por texto (nome, email, telefone, CPF)
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase()
      result = result.filter(
        (c) =>
          c.nome.toLowerCase().includes(searchLower) ||
          c.cargo?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower) ||
          c.telefone?.toLowerCase().includes(searchLower) ||
          c.cpf?.toLowerCase().includes(searchLower)
      )
    }

    // Filtro por cargo
    if (filters.cargo) {
      result = result.filter((c) => c.cargo === filters.cargo)
    }

    // Filtro por data de admissão
    if (filters.dataAdmissaoInicio) {
      result = result.filter((c) => {
        if (!c.data_admissao) return false
        const dataAdmissao = new Date(c.data_admissao)
        return dataAdmissao >= filters.dataAdmissaoInicio!
      })
    }

    if (filters.dataAdmissaoFim) {
      result = result.filter((c) => {
        if (!c.data_admissao) return false
        const dataAdmissao = new Date(c.data_admissao)
        // Adicionar 1 dia para incluir o dia final
        const fim = new Date(filters.dataAdmissaoFim!)
        fim.setHours(23, 59, 59, 999)
        return dataAdmissao <= fim
      })
    }

    // Ordenação
    result.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (filters.ordenarPor) {
        case "nome":
          aValue = a.nome.toLowerCase()
          bValue = b.nome.toLowerCase()
          break
        case "cargo":
          aValue = (a.cargo || "").toLowerCase()
          bValue = (b.cargo || "").toLowerCase()
          break
        case "data_admissao":
          aValue = a.data_admissao ? new Date(a.data_admissao).getTime() : 0
          bValue = b.data_admissao ? new Date(b.data_admissao).getTime() : 0
          break
        case "created_at":
          aValue = a.created_at ? new Date(a.created_at).getTime() : 0
          bValue = b.created_at ? new Date(b.created_at).getTime() : 0
          break
        default:
          aValue = a.nome.toLowerCase()
          bValue = b.nome.toLowerCase()
      }

      if (aValue < bValue) return filters.ordem === "asc" ? -1 : 1
      if (aValue > bValue) return filters.ordem === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [colaboradores, debouncedSearch, filters])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      
      // Adicionar foto_url ao formData se houver
      if (photoUrl) {
        formData.set("foto_url", photoUrl)
      }

      if (editing) {
        await atualizarColaborador(editing.id, formData)
      } else {
        await criarColaborador(formData)
      }

      setOpen(false)
      setEditing(null)
      setPhotoUrl("")
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
    setPhotoUrl(colaborador.foto_url || "")
    setOpen(true)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setEditing(null)
      setPhotoUrl("")
    }
  }

  const handleExportPDF = async () => {
    if (filteredAndSortedColaboradores.length === 0) return
    try {
      setExporting(true)
      const [{ jsPDF }, autoTable] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ])

      const doc = new jsPDF()
      const agora = new Date()

      doc.setFontSize(14)
      doc.text("Relatório de Colaboradores", 14, 16)
      doc.setFontSize(10)
      doc.text(`Gerado em ${format(agora, "dd/MM/yyyy HH:mm")}`, 14, 24)
      doc.text(
        `Total: ${filteredAndSortedColaboradores.length}`,
        14,
        30
      )

      const rows = filteredAndSortedColaboradores.map((c, idx) => [
        idx + 1,
        c.nome,
        c.cargo || "-",
        c.telefone || "-",
        c.email || "-",
        c.cpf || "-",
        c.data_admissao ? format(new Date(c.data_admissao), "dd/MM/yyyy") : "-",
      ])

      autoTable.default(doc, {
        startY: 36,
        head: [["#", "Nome", "Cargo", "Telefone", "Email", "CPF", "Admissão"]],
        body: rows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [17, 24, 39] },
      })

      doc.save(`colaboradores_${format(agora, "yyyyMMdd_HHmm")}.pdf`)
    } catch (error) {
      console.error("Erro ao exportar PDF", error)
      alert("Erro ao exportar PDF dos colaboradores")
    } finally {
      setExporting(false)
    }
  }

  // Renderizar card (visualização em grade)
  const renderCard = (colaborador: Colaborador) => (
    <Card key={colaborador.id} className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Foto */}
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-zinc-200 bg-zinc-100 flex-shrink-0">
            {colaborador.foto_url ? (
              <Image
                src={colaborador.foto_url}
                alt={colaborador.nome}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-8 w-8 text-zinc-400" />
              </div>
            )}
          </div>

          {/* Informações */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {colaborador.nome}
                </h3>
                {colaborador.cargo && (
                  <p className="text-sm text-zinc-600 font-medium">
                    {colaborador.cargo}
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(colaborador)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(colaborador.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Informações adicionais */}
            <div className="space-y-1 text-xs text-zinc-500">
              {colaborador.data_admissao && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Admissão:{" "}
                    {format(
                      new Date(colaborador.data_admissao),
                      "dd/MM/yyyy",
                      { locale: ptBR }
                    )}
                  </span>
                </div>
              )}
              {colaborador.email && (
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{colaborador.email}</span>
                </div>
              )}
              {colaborador.telefone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3" />
                  <span>{colaborador.telefone}</span>
                </div>
              )}
              {colaborador.endereco && (
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{colaborador.endereco}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Renderizar linha (visualização em lista)
  const renderRow = (colaborador: Colaborador) => (
    <Card key={colaborador.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Foto */}
          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-zinc-200 bg-zinc-100 flex-shrink-0">
            {colaborador.foto_url ? (
              <Image
                src={colaborador.foto_url}
                alt={colaborador.nome}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-6 w-6 text-zinc-400" />
              </div>
            )}
          </div>

          {/* Informações principais */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
            <div className="min-w-0">
              <h3 className="font-semibold text-base truncate">
                {colaborador.nome}
              </h3>
              {colaborador.cargo && (
                <p className="text-sm text-zinc-600 truncate">
                  {colaborador.cargo}
                </p>
              )}
            </div>

            <div className="text-sm text-zinc-600 truncate">
              {colaborador.email && (
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{colaborador.email}</span>
                </div>
              )}
              {colaborador.telefone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3" />
                  <span>{colaborador.telefone}</span>
                </div>
              )}
            </div>

            <div className="text-sm text-zinc-600">
              {colaborador.data_admissao && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(
                      new Date(colaborador.data_admissao),
                      "dd/MM/yyyy",
                      { locale: ptBR }
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleEdit(colaborador)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDelete(colaborador.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <ColaboradoresFilters
        cargos={cargos}
        filters={filters}
        onFiltersChange={setFilters}
        totalEncontrados={filteredAndSortedColaboradores.length}
      />

      {/* Ações */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={exporting || filteredAndSortedColaboradores.length === 0}
        >
          <FileDown className="mr-2 h-4 w-4" />
          {exporting ? "Gerando PDF..." : "Exportar PDF"}
        </Button>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                {/* Foto */}
                {userId && (
                  <PhotoUpload
                    currentPhotoUrl={editing?.foto_url || photoUrl}
                    onPhotoUploaded={setPhotoUrl}
                    userId={userId}
                    colaboradorId={editing?.id}
                  />
                )}

                {/* Nome */}
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    name="nome"
                    defaultValue={editing?.nome || ""}
                    required
                  />
                </div>

                {/* Cargo */}
                <div className="grid gap-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    name="cargo"
                    placeholder="Ex: Operador, Supervisor, etc."
                    defaultValue={editing?.cargo || ""}
                  />
                </div>

                {/* Data de Admissão */}
                <div className="grid gap-2">
                  <Label htmlFor="data_admissao">Data de Admissão</Label>
                  <Input
                    id="data_admissao"
                    name="data_admissao"
                    type="date"
                    defaultValue={
                      editing?.data_admissao
                        ? editing.data_admissao.split("T")[0]
                        : ""
                    }
                  />
                </div>

                {/* Email e Telefone em linha */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="colaborador@empresa.com"
                      defaultValue={editing?.email || ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      name="telefone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      defaultValue={editing?.telefone || ""}
                    />
                  </div>
                </div>

                {/* CPF */}
                <div className="grid gap-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    name="cpf"
                    placeholder="000.000.000-00"
                    defaultValue={editing?.cpf || ""}
                  />
                </div>

                {/* Endereço */}
                <div className="grid gap-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    name="endereco"
                    placeholder="Rua, número, bairro, cidade"
                    defaultValue={editing?.endereco || ""}
                  />
                </div>

                {/* Observações */}
                <div className="grid gap-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <textarea
                    id="observacoes"
                    name="observacoes"
                    rows={3}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Notas e observações sobre o colaborador..."
                    defaultValue={editing?.observacoes || ""}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
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

      {/* Lista de colaboradores */}
      {filteredAndSortedColaboradores.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 text-sm">
            {filters.search || filters.cargo || filters.dataAdmissaoInicio || filters.dataAdmissaoFim
              ? "Nenhum colaborador encontrado com os filtros aplicados"
              : "Nenhum colaborador cadastrado"}
          </p>
        </div>
      ) : filters.visualizacao === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedColaboradores.map(renderCard)}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAndSortedColaboradores.map(renderRow)}
        </div>
      )}
    </div>
  )
}

export default memo(ColaboradoresList)
