"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ClipboardList,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  AlertTriangle,
  FileText,
  Trash2,
  Eye,
  Loader2,
  Calendar,
  User,
  BarChart3
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { enUS } from "date-fns/locale/en-US"
import { useTranslation } from "react-i18next"
import InventarioContagem from "./InventarioContagem"
import InventarioComparativo from "./InventarioComparativo"

interface Inventario {
  id: string
  descricao: string
  data_inicio: string
  data_fim: string | null
  status: "em_andamento" | "finalizado" | "cancelado"
  responsavel: string | null
  escopo: "todos" | "categoria" | "selecionados"
  categoria_filtro: string | null
  observacoes: string | null
  total_itens: number
  itens_contados: number
  total_divergencias: number
  valor_divergencias: number
}

interface Categoria {
  categoria: string
}

export default function InventarioList() {
  const [inventarios, setInventarios] = useState<Inventario[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedInventario, setSelectedInventario] = useState<Inventario | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "contagem" | "comparativo">("list")
  const [creating, setCreating] = useState(false)
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'pt' ? ptBR : enUS

  const [newInventario, setNewInventario] = useState({
    descricao: "",
    responsavel: "",
    escopo: "todos" as "todos" | "categoria" | "selecionados",
    categoria_filtro: "",
    observacoes: ""
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchInventarios()
    fetchCategorias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchInventarios = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("inventarios")
        .select("id, descricao, data_inicio, data_fim, status, responsavel, escopo, categoria_filtro, observacoes, total_itens, itens_contados, total_divergencias, valor_divergencias, created_at")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setInventarios(data || [])
    } catch (error) {
      console.error("Erro ao buscar inventários:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategorias = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("ferramentas")
        .select("categoria")
        .eq("profile_id", user.id)
        .not("categoria", "is", null)

      if (error) throw error

      const uniqueCategorias = Array.from(new Set(data?.map(d => d.categoria).filter(Boolean)))
      setCategorias(uniqueCategorias as string[])
    } catch (error) {
      console.error("Erro ao buscar categorias:", error)
    }
  }

  const handleCreateInventario = async () => {
    if (!newInventario.descricao.trim()) return

    try {
      setCreating(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar itens do estoque baseado no escopo
      let query = supabase
        .from("ferramentas")
        .select("id, quantidade_disponivel")
        .eq("profile_id", user.id)

      if (newInventario.escopo === "categoria" && newInventario.categoria_filtro) {
        query = query.eq("categoria", newInventario.categoria_filtro)
      }

      const { data: ferramentas, error: ferramentasError } = await query
      if (ferramentasError) throw ferramentasError

      // Criar inventário
      const { data: inventario, error: inventarioError } = await supabase
        .from("inventarios")
        .insert({
          profile_id: user.id,
          descricao: newInventario.descricao,
          responsavel: newInventario.responsavel || null,
          escopo: newInventario.escopo,
          categoria_filtro: newInventario.escopo === "categoria" ? newInventario.categoria_filtro : null,
          observacoes: newInventario.observacoes || null,
          total_itens: ferramentas?.length || 0,
          itens_contados: 0,
          total_divergencias: 0,
          valor_divergencias: 0
        })
        .select()
        .single()

      if (inventarioError) throw inventarioError

      // Criar itens do inventário
      if (ferramentas && ferramentas.length > 0) {
        const inventarioItens = ferramentas.map(f => ({
          inventario_id: inventario.id,
          ferramenta_id: f.id,
          quantidade_sistema: f.quantidade_disponivel,
          quantidade_fisica: null,
          diferenca: null,
          contado: false
        }))

        const { error: itensError } = await supabase
          .from("inventario_itens")
          .insert(inventarioItens)

        if (itensError) throw itensError
      }

      // Reset form
      setNewInventario({
        descricao: "",
        responsavel: "",
        escopo: "todos",
        categoria_filtro: "",
        observacoes: ""
      })
      setShowNewModal(false)
      fetchInventarios()

      // Abrir para contagem
      setSelectedInventario(inventario)
      setViewMode("contagem")
    } catch (error) {
      console.error("Erro ao criar inventário:", error)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteInventario = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este inventário?")) return

    try {
      const { error } = await supabase
        .from("inventarios")
        .delete()
        .eq("id", id)

      if (error) throw error
      fetchInventarios()
    } catch (error) {
      console.error("Erro ao excluir inventário:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "em_andamento":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800"><Clock className="h-3 w-3 mr-1" />{t("dashboard.inventario.status.in_progress")}</Badge>
      case "finalizado":
        return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />{t("dashboard.inventario.status.finished")}</Badge>
      case "cancelado":
        return <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800"><XCircle className="h-3 w-3 mr-1" />{t("dashboard.inventario.status.canceled")}</Badge>
      default:
        return null
    }
  }

  const getProgressPercent = (inv: Inventario) => {
    if (inv.total_itens === 0) return 0
    return Math.round((inv.itens_contados / inv.total_itens) * 100)
  }

  if (viewMode === "contagem" && selectedInventario) {
    return (
      <InventarioContagem
        inventario={selectedInventario}
        onBack={() => {
          setViewMode("list")
          setSelectedInventario(null)
          fetchInventarios()
        }}
        onFinish={() => {
          setViewMode("comparativo")
        }}
      />
    )
  }

  if (viewMode === "comparativo" && selectedInventario) {
    return (
      <InventarioComparativo
        inventario={selectedInventario}
        onBack={() => {
          setViewMode("list")
          setSelectedInventario(null)
          fetchInventarios()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 flex items-center gap-3 dark:text-zinc-100">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white">
              <ClipboardList className="h-6 w-6" />
            </div>
            {t("dashboard.inventario.title")}
          </h1>
          <p className="text-zinc-600 mt-1 dark:text-zinc-400">{t("dashboard.inventario.subtitle")}</p>
        </div>
        <Button
          onClick={() => setShowNewModal(true)}
          className="gap-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
        >
          <Plus className="h-4 w-4" />
          {t("dashboard.inventario.new_button")}
        </Button>
      </div>

      {/* Lista de inventários */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : inventarios.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center dark:bg-purple-900/20">
            <ClipboardList className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-2 dark:text-zinc-100">{t("dashboard.inventario.no_inventory")}</h3>
          <p className="text-zinc-600 mb-6 dark:text-zinc-400">{t("dashboard.inventario.no_inventory_desc")}</p>
          <Button
            onClick={() => setShowNewModal(true)}
            className="gap-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
          >
            <Plus className="h-4 w-4" />
            {t("dashboard.inventario.new_button")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {inventarios.map((inv) => (
            <div
              key={inv.id}
              className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-6 hover:shadow-lg transition-all dark:bg-zinc-900 dark:border-zinc-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">{inv.descricao}</h3>
                    {getStatusBadge(inv.status)}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 mb-4 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(inv.data_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                    {inv.responsavel && (
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {inv.responsavel}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {inv.total_itens} itens
                    </span>
                  </div>

                  {/* Barra de progresso */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Progresso da contagem</span>
                      <span className="font-medium dark:text-zinc-200">{inv.itens_contados}/{inv.total_itens} ({getProgressPercent(inv)}%)</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden dark:bg-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all"
                        style={{ width: `${getProgressPercent(inv)}%` }}
                      />
                    </div>
                  </div>

                  {/* Divergências */}
                  {inv.status === "finalizado" && inv.total_divergencias > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                      <span className="text-orange-700 dark:text-orange-300">
                        {inv.total_divergencias} divergência{inv.total_divergencias !== 1 ? "s" : ""} encontrada{inv.total_divergencias !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2">
                  {inv.status === "em_andamento" && (
                    <Button
                      onClick={() => {
                        setSelectedInventario(inv)
                        setViewMode("contagem")
                      }}
                      className="gap-2"
                      variant="outline"
                    >
                      <Play className="h-4 w-4" />
                      Continuar
                    </Button>
                  )}
                  {inv.status === "finalizado" && (
                    <Button
                      onClick={() => {
                        setSelectedInventario(inv)
                        setViewMode("comparativo")
                      }}
                      className="gap-2"
                      variant="outline"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Ver Resultado
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDeleteInventario(inv.id)}
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Inventário */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Novo Inventário
            </DialogTitle>
            <DialogDescription>
              Inicie uma nova contagem de estoque
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                placeholder="Ex: Inventário Mensal - Junho/2025"
                value={newInventario.descricao}
                onChange={(e) => setNewInventario({ ...newInventario, descricao: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                placeholder="Nome do responsável pela contagem"
                value={newInventario.responsavel}
                onChange={(e) => setNewInventario({ ...newInventario, responsavel: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="escopo">Escopo</Label>
              <Select
                value={newInventario.escopo}
                onValueChange={(value: "todos" | "categoria" | "selecionados") =>
                  setNewInventario({ ...newInventario, escopo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o escopo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os itens</SelectItem>
                  <SelectItem value="categoria">Por categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newInventario.escopo === "categoria" && (
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={newInventario.categoria_filtro}
                  onValueChange={(value) =>
                    setNewInventario({ ...newInventario, categoria_filtro: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                placeholder="Observações adicionais (opcional)"
                value={newInventario.observacoes}
                onChange={(e) => setNewInventario({ ...newInventario, observacoes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateInventario}
              disabled={!newInventario.descricao.trim() || creating}
              className="gap-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Criar e Iniciar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

