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
import { Plus, Search, Trash2, Edit, User, Mail, Phone, Calendar, MapPin, FileDown, Grid3x3, Square, LayoutGrid } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/lib/hooks/useDebounce"
import { PhotoUpload } from "./PhotoUpload"
import { createClientComponentClient } from "@/lib/supabase-client"
import Image from "next/image"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ColaboradoresFilters, type FilterState } from "./ColaboradoresFilters"
import { cn } from "@/lib/utils"

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

interface MovimentacoesStats {
  [colaboradorId: string]: {
    retiradas: number
    devolucoes: number
    pendente: number
  }
}

function ColaboradoresList({
  colaboradores: initialColaboradores,
  movimentacoesStats = {},
}: {
  colaboradores: Colaborador[]
  movimentacoesStats?: MovimentacoesStats
}) {
  const [colaboradores, setColaboradores] = useState(initialColaboradores)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Colaborador | null>(null)
  const [loading, setLoading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string>("")
  const [exporting, setExporting] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  // Tamanho dos cards (pequeno, medio, grande)
  const [cardSize, setCardSize] = useState<"pequeno" | "medio" | "grande">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("colaboradorCardSize")
      return (saved as "pequeno" | "medio" | "grande") || "medio"
    }
    return "medio"
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("colaboradorCardSize", cardSize)
    }
  }, [cardSize])

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
        <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={exporting || filteredAndSortedColaboradores.length === 0}
        >
          <FileDown className="mr-2 h-4 w-4" />
          {exporting ? "Gerando PDF..." : "Exportar PDF"}
        </Button>
          
          {/* Seletor de tamanho dos cards */}
          <div className="flex items-center gap-1 border rounded-md p-1 bg-background">
            <button
              type="button"
              onClick={() => setCardSize("pequeno")}
              className={cn(
                "p-1.5 rounded hover:bg-accent transition-colors",
                cardSize === "pequeno" && "bg-primary text-primary-foreground"
              )}
              title="Pequeno"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCardSize("medio")}
              className={cn(
                "p-1.5 rounded hover:bg-accent transition-colors",
                cardSize === "medio" && "bg-primary text-primary-foreground"
              )}
              title="Médio"
            >
              <Square className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCardSize("grande")}
              className={cn(
                "p-1.5 rounded hover:bg-accent transition-colors",
                cardSize === "grande" && "bg-primary text-primary-foreground"
              )}
              title="Grande"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

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

      {/* Cards de colaboradores */}
      {filteredAndSortedColaboradores.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 text-sm">
            {filters.search || filters.cargo || filters.dataAdmissaoInicio || filters.dataAdmissaoFim
              ? "Nenhum colaborador encontrado com os filtros aplicados"
              : "Nenhum colaborador cadastrado"}
          </p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-4",
          cardSize === "pequeno" && "md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
          cardSize === "medio" && "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          cardSize === "grande" && "md:grid-cols-2 lg:grid-cols-3"
        )}>
          {filteredAndSortedColaboradores.map((colaborador) => {
            const stats = movimentacoesStats[colaborador.id] || { retiradas: 0, devolucoes: 0, pendente: 0 }
            const taxaDevolucao = stats.pendente > 0 ? "0" : "100"
            
            return (
              <Card key={colaborador.id} className={cn(
                cardSize === "pequeno" && "hover:shadow-md transition-shadow",
                cardSize === "medio" && "hover:shadow-lg transition-shadow",
                cardSize === "grande" && "hover:shadow-xl transition-shadow"
              )}>
                <CardContent className={cn(
                  cardSize === "pequeno" && "p-3",
                  cardSize === "medio" && "p-6",
                  cardSize === "grande" && "p-8"
                )}>
                  <div className={cn(
                    "space-y-4",
                    cardSize === "pequeno" && "space-y-2"
                  )}>
                    {/* Foto e Nome */}
                    <div className={cn(
                      "flex items-center gap-3",
                      cardSize === "pequeno" && "gap-2"
                    )}>
                      <div className={cn(
                        "relative rounded-full overflow-hidden border-2 border-zinc-200 bg-zinc-100 flex-shrink-0",
                        cardSize === "pequeno" && "w-12 h-12",
                        cardSize === "medio" && "w-16 h-16",
                        cardSize === "grande" && "w-20 h-20"
                      )}>
                        {colaborador.foto_url ? (
                          <Image
                            src={colaborador.foto_url}
                            alt={colaborador.nome}
                            fill
                            className="object-cover"
                            sizes={cardSize === "pequeno" ? "48px" : cardSize === "medio" ? "64px" : "80px"}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className={cn(
                              "text-zinc-400",
                              cardSize === "pequeno" && "h-6 w-6",
                              cardSize === "medio" && "h-8 w-8",
                              cardSize === "grande" && "h-10 w-10"
                            )} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          "font-semibold truncate",
                          cardSize === "pequeno" && "text-sm",
                          cardSize === "medio" && "text-lg",
                          cardSize === "grande" && "text-xl"
                        )}>
                          {colaborador.nome}
                        </h3>
                        <p className={cn(
                          "text-muted-foreground truncate",
                          cardSize === "pequeno" && "text-xs",
                          cardSize === "medio" && "text-sm",
                          cardSize === "grande" && "text-sm",
                          !colaborador.cargo && "opacity-50"
                        )}>
                          {colaborador.cargo || "Sem cargo"}
                        </p>
                      </div>
                    </div>

                    {/* Informações */}
                    <div className={cn(
                      "space-y-2",
                      cardSize === "pequeno" && "space-y-1"
                    )}>
                      <div className={cn(
                        "flex items-center gap-2 text-muted-foreground",
                        cardSize === "pequeno" && "text-xs",
                        cardSize === "medio" && "text-sm",
                        cardSize === "grande" && "text-sm",
                        !colaborador.data_admissao && "opacity-50"
                      )}>
                        <Calendar className={cn(
                          cardSize === "pequeno" && "h-3 w-3",
                          cardSize === "medio" && "h-4 w-4",
                          cardSize === "grande" && "h-4 w-4"
                        )} />
                        <span>
                          {colaborador.data_admissao 
                            ? format(new Date(colaborador.data_admissao), "dd/MM/yyyy", { locale: ptBR })
                            : "Sem data"}
                        </span>
                      </div>
                      
                      <div className={cn(
                        "grid grid-cols-2 gap-2",
                        cardSize === "pequeno" && "gap-1"
                      )}>
                        <div>
                          <p className={cn(
                            "text-muted-foreground",
                            cardSize === "pequeno" && "text-xs",
                            cardSize === "medio" && "text-xs",
                            cardSize === "grande" && "text-sm"
                          )}>Retiradas</p>
                          <p className={cn(
                            "font-semibold",
                            cardSize === "pequeno" && "text-sm",
                            cardSize === "medio" && "text-base",
                            cardSize === "grande" && "text-lg"
                          )}>{stats.retiradas}</p>
                        </div>
                        <div>
                          <p className={cn(
                            "text-muted-foreground",
                            cardSize === "pequeno" && "text-xs",
                            cardSize === "medio" && "text-xs",
                            cardSize === "grande" && "text-sm"
                          )}>Devoluções</p>
                          <p className={cn(
                            "font-semibold",
                            cardSize === "pequeno" && "text-sm",
                            cardSize === "medio" && "text-base",
                            cardSize === "grande" && "text-lg"
                          )}>{stats.devolucoes}</p>
                        </div>
                      </div>

                      {/* Taxa de Devolução */}
                      <div>
                        <p className={cn(
                          "text-muted-foreground mb-1",
                          cardSize === "pequeno" && "text-xs",
                          cardSize === "medio" && "text-xs",
                          cardSize === "grande" && "text-sm"
                        )}>Taxa de Devolução</p>
                        <span className={cn(
                          "inline-block text-xs font-medium px-2 py-1 rounded",
                          taxaDevolucao === "100"
                            ? "bg-green-100 text-green-700" 
                            : "bg-red-100 text-red-700"
                        )}>
                          {taxaDevolucao}%
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className={cn(
                      "flex gap-2 pt-2 border-t",
                      cardSize === "pequeno" && "gap-1 pt-1"
                    )}>
                      <Button
                        variant="outline"
                        size={cardSize === "pequeno" ? "sm" : "sm"}
                        onClick={() => handleEdit(colaborador)}
                        className={cn(
                          "flex-1",
                          cardSize === "pequeno" && "text-xs px-2 py-1 h-auto"
                        )}
                      >
                        <Edit className={cn(
                          cardSize === "pequeno" ? "h-3 w-3" : "h-4 w-4",
                          cardSize !== "pequeno" && "mr-1"
                        )} />
                        {cardSize !== "pequeno" && "Editar"}
                      </Button>
                      <Button
                        variant="outline"
                        size={cardSize === "pequeno" ? "sm" : "sm"}
                        onClick={() => handleDelete(colaborador.id)}
                        className={cn(
                          "flex-1 text-destructive hover:text-destructive",
                          cardSize === "pequeno" && "text-xs px-2 py-1 h-auto"
                        )}
                      >
                        <Trash2 className={cn(
                          cardSize === "pequeno" ? "h-3 w-3" : "h-4 w-4",
                          cardSize !== "pequeno" && "mr-1"
                        )} />
                        {cardSize !== "pequeno" && "Excluir"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default memo(ColaboradoresList)
