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
import { Plus, Search, Trash2, Edit, User, Mail, Phone, Calendar, MapPin, FileDown, Grid3x3, Square, LayoutGrid, Shield, AlertTriangle, ChevronDown, ChevronUp, Download, History, TrendingUp, Upload, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import ImportExcel, { ImportConfig } from "@/components/import/ImportExcel"
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
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useSidebar } from "@/components/ui/sidebar"
import { useTranslation } from "react-i18next"
import { useToast } from "@/components/ui/toast-context"

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
    retiradasFerramenta?: number
    devolucoesFerramenta?: number
  }
}

interface EPIAtivo {
  id: string
  nome: string
  quantidade: number
  validade?: string
  data_retirada?: string
  dias_restantes?: number
}

const ITEMS_PER_PAGE = 35

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
  const [episDialogOpen, setEpisDialogOpen] = useState(false)
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<Colaborador | null>(null)
  const [episAtivos, setEpisAtivos] = useState<EPIAtivo[]>([])
  const [loadingEpis, setLoadingEpis] = useState(false)
  const [fichaDialogOpen, setFichaDialogOpen] = useState(false)
  const [historicoMovimentacoes, setHistoricoMovimentacoes] = useState<Record<string, any[]>>({})
  const [loadingHistorico, setLoadingHistorico] = useState<Record<string, boolean>>({})
  const [exportingFicha, setExportingFicha] = useState<string | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Estado para validação de duplicatas
  const [nomeDigitado, setNomeDigitado] = useState("")
  const [colaboradoresSimilares, setColaboradoresSimilares] = useState<Colaborador[]>([])
  const [confirmarDuplicata, setConfirmarDuplicata] = useState(false)

  const router = useRouter()
  const supabase = createClientComponentClient()
  const { open: sidebarOpen } = useSidebar()
  const { t } = useTranslation()
  const { toast } = useToast()

  // Debounce para verificação de nome duplicado
  const debouncedNome = useDebounce(nomeDigitado, 500)

  // Verificar se existe colaborador com nome similar
  useEffect(() => {
    if (!debouncedNome || debouncedNome.length < 3 || editing) {
      setColaboradoresSimilares([])
      setConfirmarDuplicata(false)
      return
    }

    const nomeLower = debouncedNome.toLowerCase().trim()
    const similares = colaboradores.filter((c) => {
      const colaboradorNome = c.nome.toLowerCase().trim()
      // Verificar se o nome é igual ou muito similar
      return colaboradorNome === nomeLower ||
        colaboradorNome.includes(nomeLower) ||
        nomeLower.includes(colaboradorNome)
    })

    setColaboradoresSimilares(similares)
    if (similares.length > 0) {
      setConfirmarDuplicata(false) // Reset confirmação quando encontra duplicatas
    }
  }, [debouncedNome, colaboradores, editing])

  // Recarregar EPIs quando o modal for aberto ou colaborador mudar
  useEffect(() => {
    if (episDialogOpen && colaboradorSelecionado) {
      carregarEpis(colaboradorSelecionado)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episDialogOpen, colaboradorSelecionado?.id])

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

  // Configuração de importação de Excel
  const importConfig: ImportConfig = {
    title: t("dashboard.colaboradores.import.title"),
    description: t("dashboard.colaboradores.import.description"),
    templateFileName: "modelo_colaboradores.xlsx",
    columns: [
      { excelColumn: "nome", dbColumn: "nome", label: t("dashboard.colaboradores.table.name"), required: true, type: "text" },
      { excelColumn: "cargo", dbColumn: "cargo", label: t("dashboard.colaboradores.table.role"), required: false, type: "text" },
      { excelColumn: "email", dbColumn: "email", label: t("dashboard.colaboradores.table.email"), required: false, type: "text" },
      { excelColumn: "telefone", dbColumn: "telefone", label: t("dashboard.colaboradores.table.phone"), required: false, type: "text" },
      { excelColumn: "cpf", dbColumn: "cpf", label: "CPF", required: false, type: "text" },
      { excelColumn: "endereco", dbColumn: "endereco", label: t("dashboard.colaboradores.form.address"), required: false, type: "text" },
      { excelColumn: "data_admissao", dbColumn: "data_admissao", label: t("dashboard.colaboradores.form.admission_date"), required: false, type: "date" },
      { excelColumn: "observacoes", dbColumn: "observacoes", label: t("dashboard.colaboradores.form.observations"), required: false, type: "text" },
    ],
    onImport: async (data) => {
      let success = 0
      const errors: string[] = []

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        try {
          const formData = new FormData()
          Object.entries(row).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              formData.append(key, value.toString())
            }
          })
          await criarColaborador(formData)
          success++
        } catch (error: any) {
          errors.push(t("dashboard.colaboradores.import.error_creating", { line: i + 2, error: error.message || t("dashboard.colaboradores.form.error_save") }))
        }
      }

      // Atualizar lista após importação
      router.refresh()
      return { success, errors }
    }
  }

  // Estado dos filtros
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    cargo: "",
    dataAdmissaoInicio: null,
    dataAdmissaoFim: null,
    ordenarPor: "nome",
    ordem: "asc",
  })
  const [currentPage, setCurrentPage] = useState(1)

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

  const totalPages = Math.ceil(filteredAndSortedColaboradores.length / ITEMS_PER_PAGE)
  const paginatedColaboradores = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAndSortedColaboradores.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredAndSortedColaboradores, currentPage])

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filters])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Verificar se há duplicatas e não foi confirmado
    if (!editing && colaboradoresSimilares.length > 0 && !confirmarDuplicata) {
      return // Não permite submit sem confirmação
    }

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
      setNomeDigitado("")
      setColaboradoresSimilares([])
      setConfirmarDuplicata(false)
      router.refresh()
    } catch (error) {
      toast.error(t("dashboard.colaboradores.form.error_save"))
    } finally {
      setLoading(false)
    }
  }

  const carregarEpis = async (colaborador: Colaborador) => {
    if (!colaborador) {
      console.error("❌ Colaborador não fornecido")
      return
    }

    console.log("🚀 Iniciando carregamento de EPIs para:", colaborador.nome)
    setLoadingEpis(true)

    try {
      const supabase = createClientComponentClient()
      const { data: user, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.error("❌ Erro de autenticação:", authError)
        setLoadingEpis(false)
        return
      }

      if (!user || !user.user) {
        console.error("❌ Usuário não autenticado")
        setLoadingEpis(false)
        return
      }

      console.log("✅ Usuário autenticado:", user.user.id)

      // Primeiro, buscar TODAS as movimentações do colaborador
      const { data: movimentacoes, error } = await supabase
        .from("movimentacoes")
        .select(`
          id,
          ferramenta_id,
          tipo,
          quantidade,
          data
        `)
        .eq("profile_id", user.user.id)
        .eq("colaborador_id", colaborador.id)
        .in("tipo", ["retirada", "devolucao"])
        .order("data", { ascending: false })

      if (error) {
        console.error("Erro ao buscar movimentações:", error)
        setLoadingEpis(false)
        return
      }

      console.log("📋 Total de movimentações encontradas:", movimentacoes?.length || 0)

      if (!movimentacoes || movimentacoes.length === 0) {
        console.log("⚠️ Nenhuma movimentação encontrada para o colaborador")
        setEpisAtivos([])
        setLoadingEpis(false)
        return
      }

      // Buscar informações das ferramentas relacionadas
      const ferramentaIds = Array.from(new Set(movimentacoes.map((m: any) => m.ferramenta_id).filter((id: any) => id != null)))
      console.log("🔍 IDs de ferramentas para buscar:", ferramentaIds)

      const { data: ferramentasInfo, error: ferError } = await supabase
        .from("ferramentas")
        .select("id, nome, tipo_item, validade, categoria")
        .eq("profile_id", user.user.id)
        .in("id", ferramentaIds)

      if (ferError) {
        console.error("Erro ao buscar ferramentas:", ferError)
        setLoadingEpis(false)
        return
      }

      console.log("🔍 Ferramentas encontradas:", ferramentasInfo?.length || 0)

      // Criar um mapa de ferramentas para acesso rápido
      const ferramentasMap = new Map()
      ferramentasInfo?.forEach((f: any) => {
        ferramentasMap.set(f.id, f)
      })

      // Enriquecer movimentações com dados das ferramentas
      const movimentacoesCompletas = movimentacoes.map((mov: any) => {
        const ferramenta = ferramentasMap.get(mov.ferramenta_id)
        return {
          ...mov,
          ferramentas: ferramenta || null,
        }
      })

      console.log("📦 Movimentações completas:", movimentacoesCompletas)

      // Processar EPIs ativos (retiradas sem devolução correspondente)
      // Ordenar por data (mais antiga primeiro) para processar corretamente
      const movimentacoesOrdenadas = [...movimentacoesCompletas].sort((a, b) => {
        const dataA = new Date(a.data).getTime()
        const dataB = new Date(b.data).getTime()
        return dataA - dataB // Mais antiga primeiro
      })

      // Função auxiliar para verificar se é EPI
      const isEPI = (ferramenta: any): boolean => {
        if (!ferramenta) {
          console.log("⚠️ Ferramenta é null/undefined")
          return false
        }

        console.log(`🔍 Verificando se é EPI: nome="${ferramenta.nome}", tipo_item="${ferramenta.tipo_item}", categoria="${ferramenta.categoria}"`)

        // Se tipo_item está definido como "epi", é EPI
        if (ferramenta.tipo_item === "epi") {
          console.log("✅ Identificado como EPI pelo tipo_item")
          return true
        }

        // Verificar por palavras-chave no nome
        const nomeLower = (ferramenta.nome || "").toLowerCase()
        const categoriaLower = (ferramenta.categoria || "").toLowerCase()

        const palavrasEPI = [
          "capacete", "capacet", "óculos", "oculos", "protetor", "luvas", "luva",
          "máscara", "mascara", "respiratório", "respiratorio", "botas", "bota",
          "calçado", "calcado", "segurança", "seguranca", "epi", "cinto", "arnês", "arnes",
          "protetor auditivo", "abafador", "creme", "protetor solar", "uniforme", "jaleco"
        ]

        const nomeContemEPI = palavrasEPI.some(palavra => nomeLower.includes(palavra))
        const categoriaContemEPI = palavrasEPI.some(palavra => categoriaLower.includes(palavra))

        if (nomeContemEPI) {
          console.log(`✅ Identificado como EPI pelo nome: "${ferramenta.nome}"`)
          return true
        }

        if (categoriaContemEPI) {
          console.log(`✅ Identificado como EPI pela categoria: "${ferramenta.categoria}"`)
          return true
        }

        // Verificar se categoria é exatamente "EPI" ou "epi"
        if (categoriaLower === "epi" || categoriaLower === "equipamento de proteção individual") {
          console.log(`✅ Identificado como EPI pela categoria exata: "${ferramenta.categoria}"`)
          return true
        }

        console.log(`❌ Não identificado como EPI: nome="${ferramenta.nome}", categoria="${ferramenta.categoria}"`)
        return false
      }

      // Contador de retiradas e devoluções por EPI
      const contadorEpis: Record<string, { retiradas: number; devolucoes: number; ultimaRetirada?: any; ferramenta: any }> = {}

      console.log(`🔄 Processando ${movimentacoesOrdenadas.length} movimentações ordenadas...`)

      movimentacoesOrdenadas.forEach((mov: any, index: number) => {
        const ferramenta = mov.ferramentas

        console.log(`\n📦 Movimentação ${index + 1}/${movimentacoesOrdenadas.length}:`)
        console.log(`   - ID: ${mov.id}`)
        console.log(`   - Tipo: ${mov.tipo}`)
        console.log(`   - Quantidade: ${mov.quantidade}`)
        console.log(`   - Data: ${mov.data}`)
        console.log(`   - Ferramenta ID: ${mov.ferramenta_id}`)
        console.log(`   - Ferramenta:`, ferramenta)

        // Verificar se é EPI
        if (!isEPI(ferramenta)) {
          console.log(`   ⏭️ RESULTADO: Não é EPI - pulando`)
          return
        }

        console.log(`   ✅ RESULTADO: É EPI - processando`)

        const epiKey = mov.ferramenta_id
        const quantidade = mov.quantidade || 1

        if (!contadorEpis[epiKey]) {
          contadorEpis[epiKey] = {
            retiradas: 0,
            devolucoes: 0,
            ferramenta: ferramenta,
          }
          console.log(`   📝 Criando novo contador para EPI: ${ferramenta.nome}`)
        }

        if (mov.tipo === "retirada") {
          contadorEpis[epiKey].retiradas += quantidade
          contadorEpis[epiKey].ultimaRetirada = mov
          console.log(`   📥 Retirada registrada: ${ferramenta.nome}, qtd: ${quantidade}, total retiradas: ${contadorEpis[epiKey].retiradas}`)
        } else if (mov.tipo === "devolucao") {
          contadorEpis[epiKey].devolucoes += quantidade
          console.log(`   📤 Devolução registrada: ${ferramenta.nome}, qtd: ${quantidade}, total devoluções: ${contadorEpis[epiKey].devolucoes}`)
        }
      })

      console.log(`\n📊 Resumo: ${Object.keys(contadorEpis).length} EPIs únicos encontrados`)

      console.log("📊 Contador de EPIs:", Object.keys(contadorEpis).length, "EPIs únicos")

      // Calcular EPIs ativos (retiradas - devoluções > 0)
      const episAtivosList: EPIAtivo[] = []

      Object.entries(contadorEpis).forEach(([ferramentaId, contador]) => {
        const saldo = contador.retiradas - contador.devolucoes

        console.log(`📊 EPI "${contador.ferramenta?.nome || ferramentaId}": retiradas=${contador.retiradas}, devoluções=${contador.devolucoes}, saldo=${saldo}`)

        if (saldo > 0 && contador.ultimaRetirada) {
          const ferramenta = contador.ferramenta || contador.ultimaRetirada.ferramentas
          const validade = ferramenta?.validade ? new Date(ferramenta.validade) : null
          const agora = new Date()
          const diasRestantes = validade
            ? Math.floor((validade.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
            : undefined

          episAtivosList.push({
            id: ferramenta?.id || ferramentaId,
            nome: ferramenta?.nome || "EPI Desconhecido",
            quantidade: saldo, // Quantidade ativa (retiradas - devoluções)
            validade: ferramenta?.validade || undefined,
            data_retirada: contador.ultimaRetirada.data,
            dias_restantes: diasRestantes,
          })

          console.log(`✅ EPI ativo adicionado: ${ferramenta?.nome} (quantidade: ${saldo})`)
        } else {
          console.log(`⏭️ EPI "${contador.ferramenta?.nome || ferramentaId}" não está ativo (saldo: ${saldo})`)
        }
      })

      console.log(`📦 Total de EPIs ativos encontrados: ${episAtivosList.length}`)
      console.log("📋 Lista final de EPIs ativos:", episAtivosList)

      if (episAtivosList.length === 0) {
        console.warn("⚠️ NENHUM EPI ATIVO ENCONTRADO!")
        console.warn("   - Verifique se há movimentações de retirada")
        console.warn("   - Verifique se os produtos estão marcados como EPI")
        console.warn("   - Verifique os logs acima para detalhes")
      }

      setEpisAtivos(episAtivosList)
    } catch (err) {
      console.error("❌ Erro completo ao buscar EPIs:", err)
      setEpisAtivos([])
    } finally {
      setLoadingEpis(false)
      console.log("✅ Carregamento de EPIs finalizado")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("dashboard.colaboradores.card.confirm_delete"))) return

    try {
      await deletarColaborador(id)
      router.refresh()
    } catch (error) {
      toast.error(t("dashboard.colaboradores.card.error_delete"))
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
      setNomeDigitado("")
      setColaboradoresSimilares([])
      setConfirmarDuplicata(false)
    }
  }

  const handleAbrirFicha = async (colaborador: Colaborador) => {
    setColaboradorSelecionado(colaborador)
    setFichaDialogOpen(true)

    // Carregar EPIs automaticamente
    await carregarEpis(colaborador)

    // Se já temos o histórico, não buscar novamente
    if (historicoMovimentacoes[colaborador.id]) {
      return
    }

    // Buscar histórico de movimentações
    setLoadingHistorico(prev => ({ ...prev, [colaborador.id]: true }))
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user?.user) return

      const { data: movimentacoes, error } = await supabase
        .from("movimentacoes")
        .select(`
          id,
          tipo,
          quantidade,
          data,
          observacoes,
          ferramentas(id, nome, tipo_item),
          colaboradores(nome)
        `)
        .eq("profile_id", user.user.id)
        .eq("colaborador_id", colaborador.id)
        .order("data", { ascending: false })
        .limit(100)

      if (error) {
        console.error("Erro ao buscar histórico:", error)
        setHistoricoMovimentacoes(prev => ({ ...prev, [colaborador.id]: [] }))
      } else {
        setHistoricoMovimentacoes(prev => ({ ...prev, [colaborador.id]: movimentacoes || [] }))
      }
    } catch (err) {
      console.error("Erro ao buscar histórico:", err)
      setHistoricoMovimentacoes(prev => ({ ...prev, [colaborador.id]: [] }))
    } finally {
      setLoadingHistorico(prev => ({ ...prev, [colaborador.id]: false }))
    }
  }

  const handleExportFichaPDF = async (colaborador: Colaborador) => {
    if (exportingFicha === colaborador.id) return

    setExportingFicha(colaborador.id)

    try {
      // Garantir que temos os EPIs e histórico carregados
      let episColaborador: EPIAtivo[] = []
      if (colaboradorSelecionado?.id === colaborador.id && episAtivos.length > 0) {
        episColaborador = episAtivos
      } else {
        // Buscar EPIs se necessário
        await carregarEpis(colaborador)
        episColaborador = episAtivos
      }

      let historico = historicoMovimentacoes[colaborador.id] || []
      if (historico.length === 0) {
        // Buscar histórico se necessário
        setLoadingHistorico(prev => ({ ...prev, [colaborador.id]: true }))
        try {
          const { data: user } = await supabase.auth.getUser()
          if (user?.user) {
            const { data: movimentacoes, error } = await supabase
              .from("movimentacoes")
              .select(`
                id,
                tipo,
                quantidade,
                data,
                observacoes,
                ferramentas(id, nome, tipo_item),
                colaboradores(nome)
              `)
              .eq("profile_id", user.user.id)
              .eq("colaborador_id", colaborador.id)
              .order("data", { ascending: false })
              .limit(100)

            if (!error && movimentacoes) {
              historico = movimentacoes
              setHistoricoMovimentacoes(prev => ({ ...prev, [colaborador.id]: movimentacoes }))
            }
          }
        } catch (err) {
          console.error("Erro ao buscar histórico:", err)
        } finally {
          setLoadingHistorico(prev => ({ ...prev, [colaborador.id]: false }))
        }
      }

      const jsPDFModule = await import("jspdf")
      const autoTableModule = await import("jspdf-autotable")

      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF
      const autoTable = (autoTableModule.default || autoTableModule) as any

      const doc = new jsPDF()
      const agora = new Date()
      let yPos = 20

      // Cabeçalho
      doc.setFontSize(18)
      doc.text(t("dashboard.colaboradores.details.title").toUpperCase(), 14, yPos)
      yPos += 10

      // Dados pessoais
      doc.setFontSize(12)
      doc.text(t("dashboard.colaboradores.details.personal_data"), 14, yPos)
      yPos += 8

      doc.setFontSize(10)
      const dadosPessoais = [
        [t("dashboard.colaboradores.table.name") + ":", colaborador.nome],
        [t("dashboard.colaboradores.table.role") + ":", colaborador.cargo || t("dashboard.colaboradores.table.no_role")],
        [t("dashboard.colaboradores.table.email") + ":", colaborador.email || "-"],
        [t("dashboard.colaboradores.table.phone") + ":", colaborador.telefone || "-"],
        ["CPF:", colaborador.cpf || "-"],
        [t("dashboard.colaboradores.form.admission_date") + ":", colaborador.data_admissao
          ? format(new Date(colaborador.data_admissao), "dd/MM/yyyy", { locale: ptBR })
          : t("dashboard.colaboradores.details.no_date")],
        [t("dashboard.colaboradores.form.address") + ":", colaborador.endereco || "-"],
      ]

      autoTable(doc, {
        startY: yPos,
        head: [[t("dashboard.colaboradores.details.stats.field"), t("dashboard.colaboradores.details.stats.value")]],
        body: dadosPessoais,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 }, 1: { cellWidth: "auto" } },
      })

      yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : yPos + 40

      // Estatísticas
      const stats = movimentacoesStats[colaborador.id] || { retiradas: 0, devolucoes: 0, pendente: 0, retiradasFerramenta: 0, devolucoesFerramenta: 0 }
      const retiradasBase = stats.retiradasFerramenta ?? stats.retiradas
      const devolucoesBase = stats.devolucoesFerramenta ?? stats.devolucoes
      const taxa = retiradasBase > 0
        ? Math.max(0, Math.min(100, Math.round((devolucoesBase / retiradasBase) * 100)))
        : 100
      const taxaDevolucao = `${taxa}%`

      doc.setFontSize(12)
      doc.text(t("dashboard.colaboradores.details.statistics"), 14, yPos)
      yPos += 8

      doc.setFontSize(10)
      const estatisticas = [
        [t("dashboard.colaboradores.details.stats.total_withdrawals") + ":", stats.retiradas.toString()],
        [t("dashboard.colaboradores.details.stats.total_returns") + ":", stats.devolucoes.toString()],
        [t("dashboard.colaboradores.details.stats.pending_items") + ":", stats.pendente.toString()],
        [t("dashboard.colaboradores.details.stats.return_rate") + ":", taxaDevolucao],
      ]

      autoTable(doc, {
        startY: yPos,
        head: [[t("dashboard.colaboradores.details.stats.metric"), t("dashboard.colaboradores.details.stats.value")]],
        body: estatisticas,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 }, 1: { cellWidth: "auto" } },
      })

      yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : yPos + 30

      // EPIs Ativos
      if (episColaborador.length > 0) {
        doc.setFontSize(12)
        doc.text(t("dashboard.colaboradores.details.active_epis"), 14, yPos)
        yPos += 8

        const episData = episColaborador.map((epi) => [
          epi.nome,
          epi.quantidade.toString(),
          epi.data_retirada
            ? format(new Date(epi.data_retirada), "dd/MM/yyyy", { locale: ptBR })
            : "-",
          epi.validade
            ? format(new Date(epi.validade), "dd/MM/yyyy", { locale: ptBR })
            : "Sem validade",
        ])

        autoTable(doc, {
          startY: yPos,
          head: [[t("dashboard.colaboradores.details.table.item"), t("dashboard.colaboradores.details.table.qty"), t("dashboard.colaboradores.details.table.withdrawal"), t("dashboard.colaboradores.details.table.validity")]],
          body: episData,
          theme: "grid",
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 9 },
        })

        yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : yPos + 40
      }

      // Histórico de Movimentações
      if (historico.length > 0) {
        doc.setFontSize(12)
        doc.text(t("dashboard.colaboradores.details.history"), 14, yPos)
        yPos += 8

        const movData = historico.map((mov) => {
          try {
            return [
              mov.tipo ? mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1) : "-",
              (mov.ferramentas as any)?.nome || "-",
              mov.quantidade ? mov.quantidade.toString() : "0",
              mov.data
                ? format(new Date(mov.data), "dd/MM/yyyy HH:mm", { locale: ptBR })
                : "-",
              mov.observacoes || "-",
            ]
          } catch (err) {
            console.error("Erro ao processar movimentação:", err, mov)
            return ["-", "-", "0", "-", "-"]
          }
        })

        autoTable(doc, {
          startY: yPos,
          head: [[t("dashboard.colaboradores.details.table.type"), t("dashboard.colaboradores.details.table.item"), t("dashboard.colaboradores.details.table.qty"), t("dashboard.colaboradores.details.table.date"), t("dashboard.colaboradores.details.table.obs")]],
          body: movData,
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 },
        })
      }

      // Rodapé
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        const pageHeight = doc.internal.pageSize.height
        const pageWidth = doc.internal.pageSize.width

        // Data e página
        doc.text(
          `${t("dashboard.colaboradores.details.generated_at")} ${format(agora, "dd/MM/yyyy HH:mm", { locale: ptBR })} - ${t("dashboard.ferramentas.pagination.page", { current: i, total: pageCount })}`,
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

      doc.save(`Ficha_${colaborador.nome.replace(/\s+/g, "_")}_${format(agora, "yyyyMMdd", { locale: ptBR })}.pdf`)
    } catch (error) {
      console.error("Erro ao exportar ficha PDF:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error("Detalhes do erro:", errorMessage)
      alert(`${t("dashboard.colaboradores.details.error_pdf")}: ${errorMessage}`)
    } finally {
      setExportingFicha(null)
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
      doc.text(t("dashboard.colaboradores.title"), 14, 16)
      doc.setFontSize(10)
      doc.text(`${t("dashboard.colaboradores.details.generated_at")} ${format(agora, "dd/MM/yyyy HH:mm")}`, 14, 24)
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
        head: [["#", t("dashboard.colaboradores.table.name"), t("dashboard.colaboradores.table.role"), t("dashboard.colaboradores.table.phone"), t("dashboard.colaboradores.table.email"), "CPF", t("dashboard.colaboradores.table.admission")]],
        body: rows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [17, 24, 39] },
      })

      // Rodapé
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        const pageHeight = doc.internal.pageSize.height
        const pageWidth = doc.internal.pageSize.width

        // Data e página
        doc.setFontSize(8)
        doc.text(
          `${t("dashboard.colaboradores.details.generated_at")} ${format(agora, "dd/MM/yyyy HH:mm", { locale: ptBR })} - ${t("dashboard.ferramentas.pagination.page", { current: i, total: pageCount })}`,
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

      doc.save(`colaboradores_${format(agora, "yyyyMMdd_HHmm")}.pdf`)
    } catch (error) {
      console.error("Erro ao exportar PDF", error)
      alert(t("dashboard.colaboradores.details.error_pdf"))
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
            {exporting ? t("common.loading") : t("dashboard.colaboradores.export_button")}
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
              title={t("dashboard.ferramentas.actions.small")}
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
              title={t("dashboard.ferramentas.actions.medium")}
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
              title={t("dashboard.ferramentas.actions.large")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t("dashboard.colaboradores.import_button")}
          </Button>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("dashboard.colaboradores.new_button")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editing ? t("dashboard.colaboradores.form.title_edit") : t("dashboard.colaboradores.form.title_new")}
                  </DialogTitle>
                  <DialogDescription>
                    {editing
                      ? t("dashboard.colaboradores.form.desc_edit")
                      : t("dashboard.colaboradores.form.desc_new")}
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
                    <Label htmlFor="nome">{t("dashboard.colaboradores.form.name")} *</Label>
                    <Input
                      id="nome"
                      name="nome"
                      value={editing ? (editing.nome || "") : nomeDigitado}
                      onChange={(e) => {
                        if (!editing) {
                          setNomeDigitado(e.target.value)
                          setConfirmarDuplicata(false)
                        }
                      }}
                      required
                      className={colaboradoresSimilares.length > 0 && !editing ? "border-yellow-500 focus:ring-yellow-500" : ""}
                    />

                    {/* Aviso de colaborador similar */}
                    {!editing && colaboradoresSimilares.length > 0 && (
                      <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 space-y-2 dark:bg-yellow-900/20 dark:border-yellow-700">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5 dark:text-yellow-400" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                              {t("dashboard.colaboradores.form.duplicate_title")}
                            </p>
                            <p className="text-xs text-yellow-700 mt-1 dark:text-yellow-300">
                              Encontrado{colaboradoresSimilares.length > 1 ? "s" : ""}:
                            </p>
                            <ul className="mt-1 space-y-1">
                              {colaboradoresSimilares.slice(0, 3).map((c) => (
                                <li key={c.id} className="text-sm text-yellow-800 flex items-center gap-2 dark:text-yellow-200">
                                  <User className="h-3 w-3" />
                                  <span className="font-medium">{c.nome}</span>
                                  {c.cargo && <span className="text-xs text-yellow-600 dark:text-yellow-400">({c.cargo})</span>}
                                </li>
                              ))}
                              {colaboradoresSimilares.length > 3 && (
                                <li className="text-xs text-yellow-600 dark:text-yellow-400">
                                  ...e mais {colaboradoresSimilares.length - 3} colaborador(es)
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
                          <input
                            type="checkbox"
                            id="confirmar-duplicata"
                            checked={confirmarDuplicata}
                            onChange={(e) => setConfirmarDuplicata(e.target.checked)}
                            className="h-4 w-4 rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500 dark:border-yellow-600 dark:bg-zinc-800"
                          />
                          <label htmlFor="confirmar-duplicata" className="text-sm text-yellow-800 dark:text-yellow-200">
                            {t("dashboard.colaboradores.form.duplicate_confirm")}
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cargo */}
                  <div className="grid gap-2">
                    <Label htmlFor="cargo">{t("dashboard.colaboradores.form.role")}</Label>
                    <Input
                      id="cargo"
                      name="cargo"
                      placeholder={t("dashboard.colaboradores.form.role_placeholder")}
                      defaultValue={editing?.cargo || ""}
                    />
                  </div>

                  {/* Data de Admissão */}
                  <div className="grid gap-2">
                    <Label htmlFor="data_admissao">{t("dashboard.colaboradores.form.admission_date")}</Label>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">{t("dashboard.colaboradores.form.email")}</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder={t("dashboard.colaboradores.form.email_placeholder")}
                        defaultValue={editing?.email || ""}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="telefone">{t("dashboard.colaboradores.form.phone")}</Label>
                      <Input
                        id="telefone"
                        name="telefone"
                        type="tel"
                        placeholder={t("dashboard.colaboradores.form.phone_placeholder")}
                        defaultValue={editing?.telefone || ""}
                      />
                    </div>
                  </div>

                  {/* CPF */}
                  <div className="grid gap-2">
                    <Label htmlFor="cpf">{t("dashboard.colaboradores.form.cpf")}</Label>
                    <Input
                      id="cpf"
                      name="cpf"
                      placeholder={t("dashboard.colaboradores.form.cpf_placeholder")}
                      defaultValue={editing?.cpf || ""}
                    />
                  </div>

                  {/* Endereço */}
                  <div className="grid gap-2">
                    <Label htmlFor="endereco">{t("dashboard.colaboradores.form.address")}</Label>
                    <Input
                      id="endereco"
                      name="endereco"
                      placeholder={t("dashboard.colaboradores.form.address_placeholder")}
                      defaultValue={editing?.endereco || ""}
                    />
                  </div>

                  {/* Observações */}
                  <div className="grid gap-2">
                    <Label htmlFor="observacoes">{t("dashboard.colaboradores.form.observations")}</Label>
                    <textarea
                      id="observacoes"
                      name="observacoes"
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder={t("dashboard.ferramentas.actions.optional")}
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
                    {t("dashboard.colaboradores.form.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || (!editing && colaboradoresSimilares.length > 0 && !confirmarDuplicata)}
                  >
                    {loading ? t("dashboard.colaboradores.form.saving") : t("dashboard.colaboradores.form.save")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Modal de Importação */}
      {importModalOpen && (
        <ImportExcel
          config={importConfig}
          onClose={() => setImportModalOpen(false)}
        />
      )}

      {/* Cards de colaboradores */}
      {filteredAndSortedColaboradores.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 text-sm dark:text-zinc-400">
            {filters.search || filters.cargo || filters.dataAdmissaoInicio || filters.dataAdmissaoFim
              ? t("dashboard.colaboradores.empty.no_results")
              : t("dashboard.colaboradores.empty.no_records")}
          </p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-4",
          // Grid dinâmico baseado no tamanho do card e estado do sidebar
          cardSize === "pequeno" && !sidebarOpen && "md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
          cardSize === "pequeno" && sidebarOpen && "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
          cardSize === "medio" && !sidebarOpen && "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          cardSize === "medio" && sidebarOpen && "md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3",
          cardSize === "grande" && !sidebarOpen && "md:grid-cols-2 lg:grid-cols-3",
          cardSize === "grande" && "md:grid-cols-2"
        )}>
          {paginatedColaboradores.map((colaborador) => {
            const stats = movimentacoesStats[colaborador.id] || { retiradas: 0, devolucoes: 0, pendente: 0, retiradasFerramenta: 0, devolucoesFerramenta: 0 }
            const retiradasBase = stats.retiradasFerramenta ?? stats.retiradas
            const devolucoesBase = stats.devolucoesFerramenta ?? stats.devolucoes
            const taxaDevolucao = retiradasBase > 0
              ? Math.max(0, Math.min(100, Math.round((devolucoesBase / retiradasBase) * 100)))
              : 100

            return (
              <Card key={colaborador.id} className={cn(
                "overflow-hidden dark:bg-zinc-900 dark:border-zinc-800",
                cardSize === "pequeno" && "hover:shadow-md transition-shadow",
                cardSize === "medio" && "hover:shadow-lg transition-shadow",
                cardSize === "grande" && "hover:shadow-xl transition-shadow"
              )}>
                <CardContent className={cn(
                  "w-full min-w-0",
                  cardSize === "pequeno" && "p-3",
                  cardSize === "medio" && "p-6",
                  cardSize === "grande" && "p-8"
                )}>
                  {/* Área clicável para abrir ficha */}
                  <div
                    className="cursor-pointer"
                    onClick={() => handleAbrirFicha(colaborador)}
                  >
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
                          "relative rounded-full overflow-hidden border-2 border-zinc-200 bg-zinc-100 flex-shrink-0 dark:border-zinc-700 dark:bg-zinc-800",
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
                                "text-zinc-400 dark:text-zinc-500",
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
                            {colaborador.cargo || t("dashboard.colaboradores.table.no_role")}
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
                              : t("dashboard.colaboradores.details.no_date")}
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
                            )}>{t("dashboard.colaboradores.card.withdrawals")}</p>
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
                            )}>{t("dashboard.colaboradores.card.returns")}</p>
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
                          )}>{t("dashboard.colaboradores.card.return_rate")}</p>
                          <span className={cn(
                            "inline-block text-xs font-medium px-2 py-1 rounded",
                            taxaDevolucao === 100
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
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
                          onClick={async (e) => {
                            e.stopPropagation()
                            setColaboradorSelecionado(colaborador)
                            setEpisDialogOpen(true)
                            // Carregar EPIs imediatamente
                            await carregarEpis(colaborador)
                          }}
                          className={cn(
                            "flex-1 min-w-0",
                            cardSize === "pequeno" && "text-xs px-2 py-1 h-auto"
                          )}
                        >
                          <Shield className={cn(
                            cardSize === "pequeno" ? "h-3 w-3" : "h-4 w-4",
                            cardSize !== "pequeno" && "mr-1 flex-shrink-0"
                          )} />
                          <span className={cn(
                            cardSize === "pequeno" && "sr-only",
                            "truncate"
                          )}>
                            {cardSize !== "pequeno" && "EPIs"}
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          size={cardSize === "pequeno" ? "sm" : "sm"}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(colaborador)
                          }}
                          className={cn(
                            "flex-1 min-w-0",
                            cardSize === "pequeno" && "text-xs px-2 py-1 h-auto"
                          )}
                        >
                          <Edit className={cn(
                            cardSize === "pequeno" ? "h-3 w-3" : "h-4 w-4",
                            cardSize !== "pequeno" && "mr-1 flex-shrink-0"
                          )} />
                          <span className={cn(
                            cardSize === "pequeno" && "sr-only",
                            "truncate"
                          )}>
                            {cardSize !== "pequeno" && t("dashboard.colaboradores.card.edit")}
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          size={cardSize === "pequeno" ? "sm" : "sm"}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(colaborador.id)
                          }}
                          className={cn(
                            "flex-1 min-w-0 text-destructive hover:text-destructive",
                            cardSize === "pequeno" && "text-xs px-2 py-1 h-auto"
                          )}
                        >
                          <Trash2 className={cn(
                            cardSize === "pequeno" ? "h-3 w-3" : "h-4 w-4",
                            cardSize !== "pequeno" && "mr-1 flex-shrink-0"
                          )} />
                          <span className={cn(
                            cardSize === "pequeno" && "sr-only",
                            "truncate"
                          )}>
                            {cardSize !== "pequeno" && t("dashboard.colaboradores.card.delete")}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Footer de Paginação */}
      {filteredAndSortedColaboradores.length > 0 && (
        <div className="flex items-center justify-between px-2 py-2 text-xs text-zinc-500 dark:text-zinc-300">
          <div>
            {t("dashboard.ferramentas.pagination.showing", { count: paginatedColaboradores.length, total: filteredAndSortedColaboradores.length })}
            {totalPages > 1 && ` (${t("dashboard.ferramentas.pagination.page", { current: currentPage, total: totalPages })})`}
          </div>
          <div className="flex gap-1 items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="min-w-[2rem] text-center">{currentPage}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de Ficha do Colaborador */}
      <Dialog open={fichaDialogOpen} onOpenChange={setFichaDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("dashboard.colaboradores.details.file_title", { name: colaboradorSelecionado?.nome })}
            </DialogTitle>
            <DialogDescription>
              {t("dashboard.colaboradores.subtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-2">
            {colaboradorSelecionado && (() => {
              const stats = movimentacoesStats[colaboradorSelecionado.id] || { retiradas: 0, devolucoes: 0, pendente: 0, retiradasFerramenta: 0, devolucoesFerramenta: 0 }
              const retiradasBase = stats.retiradasFerramenta ?? stats.retiradas
              const devolucoesBase = stats.devolucoesFerramenta ?? stats.devolucoes
              const taxaDevolucao = retiradasBase > 0
                ? Math.max(0, Math.min(100, Math.round((devolucoesBase / retiradasBase) * 100)))
                : 100
              const historico = historicoMovimentacoes[colaboradorSelecionado.id] || []
              const loadingHist = loadingHistorico[colaboradorSelecionado.id] || false

              return (
                <>
                  {/* Botão de exportar PDF */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportFichaPDF(colaboradorSelecionado)}
                      disabled={exportingFicha === colaboradorSelecionado.id}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {exportingFicha === colaboradorSelecionado.id ? t("dashboard.colaboradores.details.generating_pdf") : t("dashboard.colaboradores.details.print_file")}
                    </Button>
                  </div>

                  {/* Foto e Nome do Colaborador */}
                  <div className="flex items-center gap-4 pb-4 border-b border-zinc-200">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-200 bg-zinc-100 flex-shrink-0">
                      {colaboradorSelecionado.foto_url ? (
                        <Image
                          src={colaboradorSelecionado.foto_url}
                          alt={colaboradorSelecionado.nome}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-12 w-12 text-zinc-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-zinc-900">{colaboradorSelecionado.nome}</h3>
                      <p className="text-zinc-600">{colaboradorSelecionado.cargo || t("dashboard.colaboradores.table.no_role")}</p>
                    </div>
                  </div>

                  {/* Dados Pessoais */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">{t("dashboard.colaboradores.details.personal_data")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                          {colaboradorSelecionado.foto_url ? (
                            <Image
                              src={colaboradorSelecionado.foto_url}
                              alt={colaboradorSelecionado.nome}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <User className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                          )}
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">{t("dashboard.colaboradores.table.name")}</span>
                          <p className="font-medium">{colaboradorSelecionado.nome}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">{t("dashboard.colaboradores.table.role")}</span>
                        <p className="font-medium">{colaboradorSelecionado.cargo || t("dashboard.colaboradores.table.no_role")}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">{t("dashboard.colaboradores.table.email")}</span>
                        <p className="font-medium">{colaboradorSelecionado.email || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">{t("dashboard.colaboradores.table.phone")}</span>
                        <p className="font-medium">{colaboradorSelecionado.telefone || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">CPF</span>
                        <p className="font-medium">{colaboradorSelecionado.cpf || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">{t("dashboard.colaboradores.table.admission")}</span>
                        <p className="font-medium">
                          {colaboradorSelecionado.data_admissao
                            ? format(new Date(colaboradorSelecionado.data_admissao), "dd/MM/yyyy", { locale: ptBR })
                            : t("dashboard.colaboradores.details.no_date")}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-sm text-muted-foreground">{t("dashboard.colaboradores.form.address")}</span>
                        <p className="font-medium">{colaboradorSelecionado.endereco || "-"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Estatísticas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <span className="text-sm text-muted-foreground">{t("dashboard.colaboradores.details.stats.total_withdrawals")}</span>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.retiradas}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <span className="text-sm text-muted-foreground">{t("dashboard.colaboradores.details.stats.total_returns")}</span>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.devolucoes}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <span className="text-sm text-muted-foreground">{t("dashboard.colaboradores.details.stats.pending_items")}</span>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.pendente}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <span className="text-sm text-muted-foreground">{t("dashboard.colaboradores.details.stats.return_rate")}</span>
                      <p className={cn(
                        "text-2xl font-bold",
                        taxaDevolucao === 100 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>{taxaDevolucao}%</p>
                    </div>
                  </div>

                  {/* EPIs Ativos */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">{t("dashboard.colaboradores.details.active_epis")}</h3>
                    <div className="rounded-md border">
                      {episAtivos.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t("dashboard.colaboradores.details.no_active_epis")}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {episAtivos.map((epi) => (
                            <div key={epi.id} className="p-3 bg-zinc-50 rounded-lg text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-zinc-900">{epi.nome}</span>
                                {epi.quantidade > 1 && (
                                  <Badge variant="secondary" className="ml-2">
                                    {epi.quantidade}x
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 text-xs text-zinc-600">
                                Retirado em: {epi.data_retirada
                                  ? format(new Date(epi.data_retirada), "dd/MM/yyyy", { locale: ptBR })
                                  : "-"}
                                {epi.validade ? (
                                  <> | Validade: {format(new Date(epi.validade), "dd/MM/yyyy", { locale: ptBR })}</>
                                ) : (
                                  <> | {t("dashboard.ferramentas.table.no_validity")}</>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Histórico de Movimentações */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">{t("dashboard.colaboradores.details.history")}</h3>
                    <div className="rounded-md border">
                      {loadingHist ? (
                        <div className="p-4 flex justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : historico.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t("dashboard.colaboradores.details.no_history")}
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("dashboard.colaboradores.details.table.date")}</TableHead>
                              <TableHead>{t("dashboard.colaboradores.details.table.type")}</TableHead>
                              <TableHead>{t("dashboard.colaboradores.details.table.item")}</TableHead>
                              <TableHead className="w-[80px]">{t("dashboard.colaboradores.details.table.qty")}</TableHead>
                              <TableHead>{t("dashboard.colaboradores.details.table.obs")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          {/* TableBody for history */}
                          {/* ... (existing TableBody content) ... */}
                        </Table>
                      )}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setFichaDialogOpen(false)}>
              {t("dashboard.colaboradores.details.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de EPIs */}
      <Dialog open={episDialogOpen} onOpenChange={setEpisDialogOpen}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              EPIs de {colaboradorSelecionado?.nome}
            </DialogTitle>
            <DialogDescription>
              Controle de segurança: EPIs ativos atribuídos ao colaborador
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {loadingEpis ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-zinc-500">{t("dashboard.colaboradores.details.loading_epis")}</p>
              </div>
            ) : episAtivos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-zinc-300 mb-4" />
                <p className="text-sm text-zinc-500">{t("dashboard.colaboradores.details.no_active_epis_found")}</p>
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {episAtivos.map((epi) => {
                  const isVencido = epi.dias_restantes !== undefined && epi.dias_restantes < 0
                  const isProximoVencimento = epi.dias_restantes !== undefined && epi.dias_restantes >= 0 && epi.dias_restantes <= 30

                  return (
                    <Card key={epi.id} className={cn(
                      "border",
                      isVencido && "border-red-300 bg-red-50",
                      isProximoVencimento && !isVencido && "border-yellow-300 bg-yellow-50"
                    )}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Shield className="h-3.5 w-3.5 text-zinc-600 flex-shrink-0" />
                              <h4 className="font-semibold text-zinc-900 text-sm truncate">{epi.nome}</h4>
                              {epi.quantidade > 1 && (
                                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 flex-shrink-0">
                                  {epi.quantidade}x
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-0.5 text-xs">
                              {epi.data_retirada && (
                                <div className="flex items-center gap-1.5 text-zinc-600">
                                  <Calendar className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{t("dashboard.colaboradores.details.withdrawn_at")}: {format(new Date(epi.data_retirada), "dd/MM/yyyy", { locale: ptBR })}</span>
                                </div>
                              )}
                              {epi.quantidade > 1 && (
                                <div className="flex items-center gap-1.5 text-zinc-600">
                                  <span className="truncate">{t("dashboard.colaboradores.details.qty_withdrawn")}: {epi.quantidade} unidade(s)</span>
                                </div>
                              )}

                              {epi.validade ? (
                                <div className="flex items-center gap-1.5">
                                  {isVencido ? (
                                    <>
                                      <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0" />
                                      <span className="text-red-600 font-medium text-xs truncate">
                                        {t("dashboard.colaboradores.details.expired_ago", { days: Math.abs(epi.dias_restantes || 0) })}
                                      </span>
                                    </>
                                  ) : isProximoVencimento ? (
                                    <>
                                      <AlertTriangle className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                                      <span className="text-yellow-700 font-medium text-xs truncate">
                                        {t("dashboard.colaboradores.details.expires_in", { days: epi.dias_restantes })} ({format(new Date(epi.validade), "dd/MM/yyyy", { locale: ptBR })})
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Calendar className="h-3 w-3 text-zinc-600 flex-shrink-0" />
                                      <span className="text-zinc-600 text-xs truncate">
                                        {t("dashboard.colaboradores.details.validity")}: {format(new Date(epi.validade), "dd/MM/yyyy", { locale: ptBR })} ({epi.dias_restantes} dias restantes)
                                      </span>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-zinc-500">
                                  <Calendar className="h-3 w-3 flex-shrink-0" />
                                  <span className="text-xs">{t("dashboard.colaboradores.details.no_validity")}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {isVencido && (
                            <Badge variant="destructive" className="flex-shrink-0">
                              {t("dashboard.colaboradores.details.expired")}
                            </Badge>
                          )}
                          {isProximoVencimento && !isVencido && (
                            <Badge variant="secondary" className="flex-shrink-0 bg-yellow-100 text-yellow-800">
                              {t("dashboard.colaboradores.details.attention")}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setEpisDialogOpen(false)}>
              {t("dashboard.colaboradores.details.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default memo(ColaboradoresList)
