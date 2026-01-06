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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  Package,
  Grid3x3,
  Square,
  LayoutGrid,
  Upload,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Camera,
  Search,
  Download,
} from "lucide-react"
import ImportExcel, { ImportConfig } from "../import/ImportExcel"
import ImportInvoice from "../import/ImportInvoice"
import SmartImport from "../import/SmartImport"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/lib/hooks/useDebounce"
import { ProductPhotoUpload } from "./ProductPhotoUpload"
import { CatalogSearch } from "./CatalogSearch"
import { IncidentReporter } from "./IncidentReporter"
import { createClientComponentClient } from "@/lib/supabase-client"
import Image from "next/image"
import { type FilterState } from "./FerramentasFilters"
import { useTranslation } from "react-i18next"
import { useToast } from "@/components/ui/toast-context"
import { useCelebration } from "@/lib/hooks/useCelebration"
import { RegistrationCelebration, type RegistrationCelebrationData } from "@/components/ui/RegistrationCelebration"
import { GamificationProgress } from "@/components/ui/GamificationProgress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  MoreHorizontal,
  Copy,
  Printer,
  Archive,
  ArrowUpDown,
  AlertTriangle,
} from "lucide-react"

import QRCode from 'qrcode'
import { AssetMemoryCard } from "@/components/dashboard/AssetMemoryCard"
import { FEATURES } from "@/lib/features"
// VoiceCommandButton removed
import { ProductLabel } from "./ProductLabel"

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
  ponto_ressuprimento?: number | null
  created_at?: string | null
}

interface Colaborador {
  id: string
  nome: string
}

const ITEMS_PER_PAGE = 35

function FerramentasList({
  ferramentas: initialFerramentas,
  colaboradores,
}: {
  ferramentas: Ferramenta[]
  colaboradores: Colaborador[]
}) {
  const { t } = useTranslation()
  const [ferramentas, setFerramentas] = useState(initialFerramentas)

  // Atualizar estado quando initialFerramentas mudar (após router.refresh)
  useEffect(() => {
    setFerramentas(initialFerramentas)
  }, [initialFerramentas])
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    tipo: "",
    estado: "",
    categoria: "",
    ordenarPor: "nome",
    ordem: "asc",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<"todos" | "ativos" | "inativos">("ativos")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const debouncedSearch = useDebounce(filters.search, 300)
  const [open, setOpen] = useState(false)
  const [actionDialog, setActionDialog] = useState<{
    type: "entrada" | "retirada" | "devolucao" | "conserto" | "incident"
    ferramenta: Ferramenta
    initialQuantity?: number
    initialCollaboratorId?: string
  } | null>(null)

  const [editing, setEditing] = useState<Ferramenta | null>(null)
  const [loading, setLoading] = useState(false)

  // Tamanho dos cards (pequeno, medio, grande)
  const [cardSize, setCardSize] = useState<"pequeno" | "medio" | "grande">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("productCardSize")
      return (saved as "pequeno" | "medio" | "grande") || "medio"
    }
    return "medio"
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("productCardSize", cardSize)
    }
  }, [cardSize])
  const [productCode, setProductCode] = useState("")
  const [productPhoto, setProductPhoto] = useState("")
  const [tipoItem, setTipoItem] = useState<"ferramenta" | "epi" | "consumivel">("ferramenta")
  const [exportingCsv, setExportingCsv] = useState(false)

  // Voice data removed

  // New state for catalog linkage to be robust against re-renders
  const [catalogItemId, setCatalogItemId] = useState<string | null>(null)

  // Voice command handler removed
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const { celebrate } = useCelebration()
  const [celebrationData, setCelebrationData] = useState<RegistrationCelebrationData | null>(null)
  const [userId, setUserId] = useState<string>("")
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const router = useRouter()

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

  // Clear selection when filters or page change
  useEffect(() => {
    setSelectedItems(new Set())
  }, [filters, activeTab, currentPage])

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const toggleAll = () => {
    if (selectedItems.size === filteredFerramentas.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredFerramentas.map(f => f.id)))
    }
  }

  const handleExportPDF = async () => {
    if (selectedItems.size === 0) {
      toast.error("Selecione pelo menos um item para exportar")
      return
    }

    try {
      setLoading(true)
      const { jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF()

      const itemsToExport = ferramentas.filter(f => selectedItems.has(f.id))

      const tableData = itemsToExport.map(item => [
        item.nome,
        item.codigo || "-",
        item.quantidade_disponivel.toString(),
        item.estado,
        item.tamanho || "-",
        item.cor || "-"
      ])

      autoTable(doc, {
        head: [['Nome', 'Código', 'Qtd', 'Estado', 'Tamanho', 'Cor']],
        body: tableData,
      })

      doc.save("ferramentas.pdf")
      toast.success("PDF exportado com sucesso")
    } catch (error) {
      console.error("Erro ao exportar PDF:", error)
      toast.error("Erro ao gerar PDF")
    } finally {
      setLoading(false)
    }
  }

  const handleExportSelectedCSV = () => {
    if (selectedItems.size === 0) {
      toast.error("Selecione pelo menos um item para exportar")
      return
    }
    const itemsToExport = ferramentas.filter(f => selectedItems.has(f.id))

    // Create CSV content
    const headers = ["Nome", "Código", "Categoria", "Quantidade Total", "Quantidade Disponível", "Estado", "Tipo", "Tamanho", "Cor"]
    const csvContent = [
      headers.join(","),
      ...itemsToExport.map(f => [
        `"${f.nome}"`,
        `"${f.codigo || ""}"`,
        `"${f.categoria || ""}"`,
        f.quantidade_total,
        f.quantidade_disponivel,
        f.estado,
        f.tipo_item || "ferramenta",
        `"${f.tamanho || ""}"`,
        `"${f.cor || ""}"`
      ].join(","))
    ].join("\n")

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `produtos_selecionados_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importInvoiceOpen, setImportInvoiceOpen] = useState(false)
  const [smartImportOpen, setSmartImportOpen] = useState(false)

  // Configuração de importação de Excel
  const importConfig: ImportConfig = {
    title: "Importar Ferramentas/Estoque",
    description: "Importe ferramentas, EPIs ou consumíveis a partir de uma planilha Excel ou CSV",
    templateFileName: "modelo_ferramentas.xlsx",
    columns: [
      { excelColumn: "nome", dbColumn: "nome", label: "Nome", required: true, type: "text" },
      { excelColumn: "categoria", dbColumn: "categoria", label: "Categoria", required: false, type: "text" },
      { excelColumn: "codigo", dbColumn: "codigo", label: "Código", required: false, type: "text" },
      { excelColumn: "quantidade_total", dbColumn: "quantidade_total", label: "Qtd Total", required: true, type: "number" },
      { excelColumn: "quantidade_disponivel", dbColumn: "quantidade_disponivel", label: "Qtd Disponível", required: false, type: "number" },
      { excelColumn: "tipo_item", dbColumn: "tipo_item", label: "Tipo", required: false, type: "select", options: ["ferramenta", "epi", "consumivel"] },
      { excelColumn: "estado", dbColumn: "estado", label: "Estado", required: false, type: "select", options: ["ok", "danificada", "em_conserto"] },
      { excelColumn: "tamanho", dbColumn: "tamanho", label: "Tamanho", required: false, type: "text" },
      { excelColumn: "cor", dbColumn: "cor", label: "Cor", required: false, type: "text" },
      { excelColumn: "ponto_ressuprimento", dbColumn: "ponto_ressuprimento", label: "Ponto Ressuprimento", required: false, type: "number" },
    ],
    onImport: async (data) => {
      let success = 0
      const errors: string[] = []

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        try {
          const formData = new FormData()

          // Se quantidade_disponivel não foi informada, usar quantidade_total
          if (!row.quantidade_disponivel && row.quantidade_total) {
            row.quantidade_disponivel = row.quantidade_total
          }

          // Valores padrão
          if (!row.estado) row.estado = "ok"
          if (!row.tipo_item) row.tipo_item = "ferramenta"

          Object.entries(row).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              formData.append(key, value.toString())
            }
          })
          await criarFerramenta(formData)
          success++
        } catch (error: any) {
          errors.push(`Linha ${i + 2}: ${error.message || "Erro ao criar item"}`)
        }
      }

      router.refresh()
      return { success, errors }
    }
  }

  const categorias = useMemo(() => {
    const set = new Set<string>()
    ferramentas.forEach((f) => {
      if (f.categoria && f.categoria.trim() !== "") set.add(f.categoria)
    })
    return Array.from(set).sort()
  }, [ferramentas])



  const counts = useMemo(() => {
    return {
      todos: ferramentas.length,
      ativos: ferramentas.filter(f => f.estado === 'ok').length,
      inativos: ferramentas.filter(f => f.estado !== 'ok').length
    }
  }, [ferramentas])

  const filteredFerramentas = useMemo(() => {
    let result = [...ferramentas]
    const searchLower = debouncedSearch.toLowerCase()

    // Filtro por Tab
    if (activeTab === "ativos") {
      result = result.filter(f => f.estado === 'ok')
    } else if (activeTab === "inativos") {
      result = result.filter(f => f.estado !== 'ok')
    }

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

    // if (filters.estado) { ... } // Estado filter is now handled by tabs mainly, but we can keep it for advanced filtering if needed or remove it. Let's keep it compatible but tabs take precedence for primary filtering.

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
  }, [ferramentas, debouncedSearch, filters, activeTab])

  const totalPages = Math.ceil(filteredFerramentas.length / ITEMS_PER_PAGE)
  const paginatedFerramentas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredFerramentas.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredFerramentas, currentPage])

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filters])

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

  const handleAutoFill = async (targetField: 'categoria' | 'codigo' | 'ponto_ressuprimento', btn: HTMLButtonElement) => {
    const nomeInput = document.getElementById("nome") as HTMLInputElement
    const nome = nomeInput?.value

    if (!nome) {
      toast.error("Preencha o nome do produto primeiro")
      return
    }

    const originalContent = btn.innerHTML
    btn.innerHTML = '<svg class="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>'
    btn.disabled = true

    try {
      // Coletar contexto atual do formulário
      const context = {
        nome,
        categoria: (document.getElementById("categoria") as HTMLInputElement)?.value,
        tipo_item: tipoItem,
        tamanho: (document.getElementById("tamanho") as HTMLInputElement)?.value,
        cor: (document.getElementById("cor") as HTMLInputElement)?.value,
      }

      const res = await fetch("/api/ai/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, targetField })
      })

      if (!res.ok) throw new Error("Erro na IA")

      const data = await res.json()

      if (data.suggestion) {
        if (targetField === 'categoria') {
          const input = document.getElementById("categoria") as HTMLInputElement
          if (input) input.value = data.suggestion
        } else if (targetField === 'codigo') {
          setProductCode(data.suggestion)
        } else if (targetField === 'ponto_ressuprimento') {
          const input = document.getElementById("ponto_ressuprimento") as HTMLInputElement
          if (input) input.value = data.suggestion
        }
        toast.success("Sugestão aplicada!")
      }
    } catch (error) {
      console.error(error)
      toast.error("Erro ao gerar sugestão")
    } finally {
      btn.innerHTML = originalContent
      btn.disabled = false
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const nome = formData.get("nome")?.toString() || ""
      const tamanho = formData.get("tamanho")?.toString() || ""
      const cor = formData.get("cor")?.toString() || ""
      const tipo = formData.get("tipo_item")?.toString() || tipoItem || "ferramenta"

      // Garantir que os valores dos campos hidden estejam corretos
      formData.set("tipo_item", tipo)
      if (!formData.get("estado")) {
        formData.set("estado", "ok")
      }

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

        // Celebrar cadastro de novo produto
        const newCount = ferramentas.length + 1
        const MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000]
        const isMilestone = MILESTONES.includes(newCount)

        setCelebrationData({
          type: "ferramenta",
          itemName: nome,
          totalCount: newCount
        })

        // Confetti baseado no milestone
        if (isMilestone) {
          celebrate({ type: 'level_up' })
        } else if (newCount <= 3) {
          celebrate({ type: 'action_complete' })
        } else {
          celebrate({ type: 'action_complete' })
        }
      }

      // Fechar modal e limpar estados
      setOpen(false)
      setEditing(null)
      setProductPhoto("")
      setProductCode("")

      // Forçar atualização da lista
      router.refresh()

      // Aguardar um pouco e recarregar novamente para garantir
      setTimeout(() => {
        router.refresh()
      }, 500)
    } catch (error: any) {
      console.error("Erro ao salvar ferramenta:", error)
      // Melhorar mensagem de erro
      let errorMessage = "Erro desconhecido ao salvar produto"
      if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      } else if (error?.toString) {
        errorMessage = error.toString()
      }
      toast.error(`Erro ao salvar produto: ${errorMessage}`) // Replaced alert with toast.error
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta ferramenta?")) return

    try {
      await deletarFerramenta(id)

      setFerramentas(ferramentas.filter((p) => p.id !== id))
      toast.success("Ferramenta excluída com sucesso")
    } catch (error: any) {
      console.error("Erro ao excluir:", error)
      toast.error(error.message || "Erro ao excluir ferramenta")
    }
  }

  const handleEdit = (produto: Ferramenta) => {
    setEditing(produto)
    setOpen(true)
  }

  const handlePhotoUpload = async (file: File) => {
    if (!editing?.id) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("productId", editing.id)
    formData.append("bucketName", "produtos-fotos")

    try {
      const response = await fetch("/api/upload-photo", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro no upload")
      }

      const data = await response.json()
      // Update the editing state with the new photo URL
      setEditing((prev) => prev ? ({ ...prev, foto_url: data.url }) : null)
      // Also update the list
      setFerramentas((prev) => prev.map(f => f.id === editing.id ? { ...f, foto_url: data.url } : f))

      toast.success("Foto atualizada com sucesso")
    } catch (error: any) {
      console.error("Erro no upload:", error)
      toast.error(error.message || "Erro ao processar ação")
    }
  }

  const handleGenerateLabel = async (ferramenta: Ferramenta) => {
    try {
      // Generate QR Code Data URI with product ID (for scanner)
      const qrCodeDataUri = await QRCode.toDataURL(ferramenta.id, { margin: 0 })

      // Manual HTML construction with corrected styling for A4 Grid
      const html = `
        <div style="
          width: 50mm;
          height: 30mm;
          padding: 2mm;
          border: 1px dotted #ccc; /* Dotted border for cutting guide */
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: Arial, sans-serif;
          background-color: white;
          box-sizing: border-box;
          margin: 0;
          float: left; /* Allow floating for grid layout */
        " class="print-label">
          <h3 style="
            margin: 0 0 2px 0;
            font-size: 10px;
            text-align: center;
            max-height: 12px;
            overflow: hidden;
            width: 100%;
            white-space: nowrap;
            text-overflow: ellipsis;
          ">
            ${ferramenta.nome}
          </h3>
          
          <div style="margin: 2px 0;">
            <img 
              src="${qrCodeDataUri}" 
              alt="QR Code"
              style="width: 40px; height: 40px;"
            />
          </div>

          <div style="font-size: 8px; font-weight: bold;">
            ${ferramenta.codigo || ferramenta.id.substring(0, 8)}
          </div>
          
          <div style="font-size: 7px; margin-top: 1px;">
             ${ferramenta.tamanho ? ferramenta.tamanho : ''} 
             ${ferramenta.tamanho && ferramenta.cor ? ' - ' : ''}
             ${ferramenta.cor ? ferramenta.cor : ''}
          </div>
        </div>
      `

      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Etiqueta - ${ferramenta.nome}</title>
              <style>
                @media print {
                  @page { margin: 10mm; } /* Default A4 margins */
                  body { margin: 0; padding: 0; }
                }
                body {
                  margin: 0;
                  padding: 10px;
                  background-color: white;
                  display: flex;
                  flex-wrap: wrap; /* Grid layout */
                  align-content: flex-start;
                  gap: 0; 
                }
                .print-label {
                  background-color: white;
                  box-sizing: border-box;
                }
              </style>
            </head>
            <body>
              ${html}
              <script>
                window.onload = () => { 
                  setTimeout(() => { 
                    window.print(); 
                    window.close(); 
                  }, 500); 
                }
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
      }
    } catch (error: any) {
      console.error("Erro ao gerar etiqueta:", error)
      toast.error("Erro ao gerar etiqueta")
    }
  }

  const handleGenerateBulkLabels = async () => {
    if (selectedItems.size === 0) {
      toast.error(t("dashboard.ferramentas.bulk_labels.no_selection") || "Selecione pelo menos um produto")
      return
    }

    try {
      const itemsToLabel = ferramentas.filter(f => selectedItems.has(f.id))

      // Generate QR codes for all items
      const labelsHtml: string[] = []

      for (const ferramenta of itemsToLabel) {
        const qrCodeDataUri = await QRCode.toDataURL(ferramenta.id, { margin: 0 })

        labelsHtml.push(`
          <div class="label">
            <h3>${ferramenta.nome}</h3>
            <div class="qr">
              <img src="${qrCodeDataUri}" alt="QR Code" />
            </div>
            <div class="code">${ferramenta.codigo || ferramenta.id.substring(0, 8)}</div>
            <div class="details">
              ${ferramenta.tamanho ? ferramenta.tamanho : ''}
              ${ferramenta.tamanho && ferramenta.cor ? ' - ' : ''}
              ${ferramenta.cor ? ferramenta.cor : ''}
            </div>
          </div>
        `)
      }

      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${t("dashboard.ferramentas.bulk_labels.title") || "Etiquetas"} - ${itemsToLabel.length} ${t("dashboard.ferramentas.bulk_labels.products") || "produtos"}</title>
              <style>
                * {
                  box-sizing: border-box;
                  margin: 0;
                  padding: 0;
                }
                @page {
                  size: A4;
                  margin: 10mm;
                }
                body {
                  font-family: Arial, sans-serif;
                  background: white;
                  padding: 10mm;
                }
                .container {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 2mm;
                }
                .label {
                  width: 48mm;
                  height: 30mm;
                  border: 1px dashed #ccc;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  padding: 2mm;
                  page-break-inside: avoid;
                }
                .label h3 {
                  font-size: 8px;
                  text-align: center;
                  max-height: 14px;
                  overflow: hidden;
                  width: 100%;
                  white-space: nowrap;
                  text-overflow: ellipsis;
                  margin-bottom: 1mm;
                }
                .label .qr img {
                  width: 38px;
                  height: 38px;
                }
                .label .code {
                  font-size: 7px;
                  font-weight: bold;
                  margin-top: 1mm;
                }
                .label .details {
                  font-size: 6px;
                  color: #666;
                  margin-top: 1mm;
                }
                @media print {
                  body { padding: 0; }
                  .container { gap: 0; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                ${labelsHtml.join('')}
              </div>
              <script>
                window.onload = () => { 
                  setTimeout(() => { 
                    window.print(); 
                  }, 500); 
                }
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
        toast.success(t("dashboard.ferramentas.bulk_labels.success") || `${itemsToLabel.length} etiquetas geradas para impressão`)
      }
    } catch (error) {
      console.error("Erro ao gerar etiquetas em lote:", error)
      toast.error(t("dashboard.ferramentas.bulk_labels.error") || "Erro ao gerar etiquetas")
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
      toast.error(error.message || "Erro ao processar ação")
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
    const keys: Record<string, string> = {
      ok: "dashboard.ferramentas.status.ok",
      danificada: "dashboard.ferramentas.status.damaged",
      em_conserto: "dashboard.ferramentas.status.in_repair",
    }
    return t(keys[estado] || estado)
  }

  return (
    <div className="space-y-4">
      {/* Action buttons and progress - aligned */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Gamification Progress */}
        <GamificationProgress
          type="ferramenta"
          currentCount={ferramentas.length}
          className="flex-1 max-w-md"
        />

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setSmartImportOpen(true)} className="h-10 gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dashboard.ferramentas.import_products")}</span>
          </Button>

          <Button onClick={() => {
            setEditing(null)
            setOpen(true)
          }} className="bg-[#37352f] hover:bg-zinc-800 text-white font-medium h-10">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("dashboard.ferramentas.new_button")}</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-4">
        <div className="hidden sm:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)} className="bg-[#37352f] hover:bg-zinc-800 text-white">
                  {t("dashboard.ferramentas.new_button")}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[85vw] md:max-w-2xl h-[85vh] max-h-[85vh] overflow-y-auto overflow-x-hidden p-3 sm:p-6">
                <form onSubmit={handleSubmit} className="w-full max-w-full">
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-lg sm:text-xl">
                      {editing ? t("dashboard.ferramentas.form.title_edit") : t("dashboard.ferramentas.form.title_new")}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                      {editing
                        ? t("dashboard.ferramentas.form.desc_edit")
                        : t("dashboard.ferramentas.form.desc_new")}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Memory Layer (Internal Only) */}
                  {editing && FEATURES.OBSERVER_INTERNAL_VIEW && (
                    <div className="mb-4">
                      <AssetMemoryCard ferramentaId={editing.id} />
                    </div>
                  )}

                  <div className="grid gap-3 sm:gap-4 py-3 sm:py-4 w-full max-w-full">
                    {/* Campos hidden para garantir que valores dos Selects sejam enviados */}
                    <input type="hidden" name="tipo_item" value={tipoItem || editing?.tipo_item || "ferramenta"} />
                    <input type="hidden" name="estado" value={editing?.estado || "ok"} />

                    {/* Catalog ID Hidden Field - Controlled by React State now */}
                    <input type="hidden" name="catalog_item_id" value={catalogItemId || ""} />

                    {!editing && (
                      <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 sm:p-4 rounded-lg border border-dashed border-slate-200 dark:border-zinc-700 mb-3 sm:mb-4">
                        <Label className="mb-2 block text-blue-600 dark:text-blue-400 font-medium">
                          ✨ {t("dashboard.ferramentas.form.catalog_search_label") || "Comece buscando no Catálogo Global"}
                        </Label>
                        <CatalogSearch
                          onSelect={(item) => {
                            // Update State
                            setCatalogItemId(item.id)
                            setProductCode(item.model)

                            // DOM manipulation kept for uncontrolled inputs that don't have state binding yet
                            // Ideally we should move all to state, but this hybrid approach fixes the critical bug
                            const nomeInput = document.getElementById("nome") as HTMLInputElement
                            const catInput = document.getElementById("categoria") as HTMLInputElement
                            const codInput = document.getElementById("codigo") as HTMLInputElement

                            if (nomeInput) nomeInput.value = item.name
                            if (catInput) catInput.value = item.category || ""
                            if (codInput) codInput.value = item.model

                            if (item.image) {
                              setProductPhoto(item.image)
                            }

                            toast.success("Dados preenchidos via Catálogo Global")
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Selecione um item para preencher automaticamente nome, categoria e foto.
                        </p>
                      </div>
                    )}

                    {userId && (
                      <ProductPhotoUpload
                        currentPhotoUrl={editing?.foto_url || productPhoto}
                        onPhotoUploaded={setProductPhoto}
                        userId={userId}
                        productId={editing?.id}
                      />
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="nome">{t("dashboard.ferramentas.form.name")} *</Label>
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
                      <Label htmlFor="tipo_item">{t("dashboard.ferramentas.form.type")}</Label>
                      <Select
                        name="tipo_item"
                        defaultValue={editing?.tipo_item || tipoItem}
                        onValueChange={(val: any) => {
                          setTipoItem(val)
                          const hiddenInput = document.querySelector('input[name="tipo_item"]') as HTMLInputElement
                          if (hiddenInput) hiddenInput.value = val
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
                          <SelectValue placeholder={t("dashboard.ferramentas.form.select_type")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ferramenta">{t("dashboard.ferramentas.form.tool")}</SelectItem>
                          <SelectItem value="epi">{t("dashboard.ferramentas.form.ppe")}</SelectItem>
                          <SelectItem value="consumivel">{t("dashboard.ferramentas.form.consumable")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="categoria">{t("dashboard.ferramentas.form.line_group")}</Label>
                        <div className="flex gap-2">
                          <Input
                            id="categoria"
                            name="categoria"
                            placeholder={t("dashboard.ferramentas.form.line_placeholder")}
                            defaultValue={editing?.categoria || ""}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Sugerir Categoria (IA)"
                            onClick={(e) => handleAutoFill('categoria', e.currentTarget)}
                          >
                            <Sparkles className="h-3 w-3 text-indigo-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="codigo">{t("dashboard.ferramentas.form.code")}</Label>
                        <div className="flex gap-2">
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
                            placeholder={t("dashboard.ferramentas.form.auto_generated")}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Sugerir Código (IA)"
                            onClick={(e) => handleAutoFill('codigo', e.currentTarget)}
                          >
                            <Sparkles className="h-3 w-3 text-indigo-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="tamanho">{t("dashboard.ferramentas.form.size")}</Label>
                        <Input
                          id="tamanho"
                          name="tamanho"
                          placeholder={t("dashboard.ferramentas.form.size_placeholder")}
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
                        <Label htmlFor="cor">{t("dashboard.ferramentas.form.color")}</Label>
                        <Input
                          id="cor"
                          name="cor"
                          placeholder={t("dashboard.ferramentas.form.color_placeholder")}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="quantidade_total">{t("dashboard.ferramentas.form.quantity_total")} *</Label>
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
                        <Label htmlFor="estado">{t("dashboard.ferramentas.form.status")} *</Label>
                        <Select
                          name="estado"
                          defaultValue={editing?.estado || "ok"}
                          onValueChange={(value) => {
                            const hiddenInput = document.querySelector('input[name="estado"]') as HTMLInputElement
                            if (hiddenInput) hiddenInput.value = value
                          }}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ok">{t("dashboard.ferramentas.status.ok")}</SelectItem>
                            <SelectItem value="danificada">{t("dashboard.ferramentas.status.damaged")}</SelectItem>
                            <SelectItem value="em_conserto">{t("dashboard.ferramentas.status.in_repair")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ponto_ressuprimento">{t("dashboard.ferramentas.form.min_stock")}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="ponto_ressuprimento"
                          name="ponto_ressuprimento"
                          type="number"
                          min="0"
                          placeholder={t("dashboard.ferramentas.form.min_stock_placeholder")}
                          defaultValue={editing?.ponto_ressuprimento || ""}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Sugerir Ponto de Ressuprimento (IA)"
                          onClick={(e) => handleAutoFill('ponto_ressuprimento', e.currentTarget)}
                        >
                          <Sparkles className="h-3 w-3 text-indigo-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setOpen(false)
                        setEditing(null)
                        setCatalogItemId(null) // Reset on close
                      }}
                      className="w-full sm:w-auto"
                    >
                      {t("dashboard.ferramentas.form.cancel")}
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-[#37352f] hover:bg-zinc-800 text-white w-full sm:w-auto">
                      {loading ? t("dashboard.ferramentas.form.saving") : t("dashboard.ferramentas.form.save")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>



            <Button variant="outline" onClick={() => setImportInvoiceOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4 text-zinc-500" />
              {t("dashboard.ferramentas.add_invoice_ai")}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {t("dashboard.ferramentas.export")}
                  <ChevronLeft className="ml-2 h-4 w-4 rotate-[-90deg]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportSelectedCSV}>
                  <FileDown className="mr-2 h-4 w-4" /> {t("dashboard.ferramentas.export_csv")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileDown className="mr-2 h-4 w-4" /> {t("dashboard.ferramentas.export_pdf")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Mais ações removed */}
          </div>
        </div>

        {/* Mobile-only action bar */}
        <div className="grid sm:hidden grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportInvoiceOpen(true)} className="w-full text-xs h-9">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            <span className="truncate">{t("dashboard.ferramentas.add_invoice_ai")}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full text-xs h-9">
                <FileDown className="h-3.5 w-3.5 mr-1.5" />
                {t("dashboard.ferramentas.export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportSelectedCSV}>
                <FileDown className="mr-2 h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileDown className="mr-2 h-4 w-4" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-md border shadow-sm">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("dashboard.ferramentas.filters.search_placeholder")}
                    className="pl-8"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
                {/* 
                   "Mais filtros" isn't fully implemented in the inspected code. 
                   If the user says it's not working, and there's no visible logic for it,
                   I will wrap it in a Popover with some basic content OR 
                   if it's intended to toggle visibility of advanced filters (like ColaboradoresList might have), I'll add that state.
                   Lets assume it toggles a filter row.
                */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      {t("dashboard.ferramentas.filters.more_filters")} <ChevronLeft className="h-4 w-4 rotate-[-90deg]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">{t("dashboard.ferramentas.filters.title")}</h4>
                        <p className="text-sm text-muted-foreground">{t("dashboard.ferramentas.filters.description")}</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="category-filter">{t("dashboard.ferramentas.filters.category")}</Label>
                        <Select
                          value={filters.categoria}
                          onValueChange={(v) => setFilters(prev => ({ ...prev, categoria: v === "all" ? "" : v }))}
                        >
                          <SelectTrigger id="category-filter">
                            <SelectValue placeholder={t("dashboard.ferramentas.filters.select_category")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("dashboard.ferramentas.filters.all_categories")}</SelectItem>
                            {categorias.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="type-filter">{t("dashboard.ferramentas.filters.type")}</Label>
                        <Select
                          value={filters.tipo}
                          onValueChange={(v) => setFilters(prev => ({ ...prev, tipo: (v === "all" ? "" : v) as any }))}
                        >                       <SelectTrigger id="type-filter">
                            <SelectValue placeholder={t("dashboard.ferramentas.filters.select_type")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("dashboard.ferramentas.filters.all_types")}</SelectItem>
                            <SelectItem value="ferramenta">{t("dashboard.ferramentas.form.tool")}</SelectItem>
                            <SelectItem value="epi">{t("dashboard.ferramentas.form.ppe")}</SelectItem>
                            <SelectItem value="consumivel">{t("dashboard.ferramentas.form.consumable")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <TabsList className="w-full justify-start bg-transparent p-0 h-auto border-b rounded-none border-transparent">
              <TabsTrigger
                value="ativos"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#37352f] data-[state=active]:text-[#37352f] px-4 py-2"
              >
                {t("dashboard.ferramentas.tabs.active")}
                <span className="ml-2 text-zinc-500 font-medium">{counts.ativos}</span>
              </TabsTrigger>
              <TabsTrigger
                value="inativos"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#37352f] data-[state=active]:text-[#37352f] px-4 py-2"
              >
                {t("dashboard.ferramentas.tabs.inactive")}
                <span className="ml-2 text-zinc-400 font-medium">{counts.inativos}</span>
              </TabsTrigger>
              <TabsTrigger
                value="todos"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#37352f] data-[state=active]:text-[#37352f] px-4 py-2"
              >
                {t("dashboard.ferramentas.tabs.all")}
                <span className="ml-2 text-zinc-500 font-medium">{counts.todos}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="bg-zinc-50 p-2 border-b flex items-center justify-between dark:bg-zinc-800/50">
            <span className="text-sm text-zinc-600 dark:text-zinc-400 pl-2">
              {t("dashboard.ferramentas.list.selected_count", { count: selectedItems.size, total: filteredFerramentas.length })}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white dark:bg-zinc-800 text-zinc-700 border-zinc-200 hover:text-zinc-900">
                  {t("dashboard.ferramentas.list.bulk_actions")} <ChevronLeft className="ml-2 h-4 w-4 rotate-[-90deg]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("dashboard.ferramentas.list.bulk_actions")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportSelectedCSV} disabled={selectedItems.size === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV ({selectedItems.size})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} disabled={selectedItems.size === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF ({selectedItems.size})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleGenerateBulkLabels} disabled={selectedItems.size === 0}>
                  <Printer className="h-4 w-4 mr-2" />
                  Gerar Etiquetas ({selectedItems.size})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (selectedItems.size === 0) {
                      toast.info("Selecione pelo menos um item")
                      return
                    }
                    if (confirm(`Tem certeza que deseja excluir ${selectedItems.size} item(s)?`)) {
                      selectedItems.forEach(id => handleDelete(id))
                      setSelectedItems(new Set())
                    }
                  }}
                  disabled={selectedItems.size === 0}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Selecionados ({selectedItems.size})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-zinc-50/50 dark:bg-zinc-800/50">
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedItems.size === filteredFerramentas.length && filteredFerramentas.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="w-[200px]">{t("dashboard.ferramentas.table.product")}</TableHead>
                  <TableHead className="w-[120px]">{t("dashboard.ferramentas.table.sku")}</TableHead>
                  <TableHead className="w-[100px]">{t("dashboard.ferramentas.table.format")}</TableHead>
                  <TableHead className="w-[100px]">{t("dashboard.ferramentas.table.value")}</TableHead>
                  <TableHead className="w-[80px]">{t("dashboard.ferramentas.table.stock")}</TableHead>
                  <TableHead className="w-[100px]">{t("dashboard.ferramentas.table.status")}</TableHead>
                  <TableHead className="w-[100px] text-center">{t("dashboard.ferramentas.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFerramentas.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((ferramenta) => (
                  <TableRow key={ferramenta.id}>
                    <TableCell className="w-[40px]">
                      <Checkbox
                        checked={selectedItems.has(ferramenta.id)}
                        onCheckedChange={() => toggleSelection(ferramenta.id)}
                      />
                    </TableCell>
                    <TableCell className="w-[200px]">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-zinc-100 overflow-hidden relative">
                          {ferramenta.foto_url ? (
                            <Image src={ferramenta.foto_url} alt={ferramenta.nome} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                              <Package size={20} />
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">{ferramenta.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="w-[120px] text-zinc-500 font-mono text-xs">{ferramenta.codigo || "-"}</TableCell>
                    <TableCell className="w-[100px]">
                      <span className="text-zinc-600">{ferramenta.tamanho || "Simples"}</span>
                    </TableCell>
                    <TableCell className="w-[100px] font-medium">
                      500,00
                    </TableCell>
                    <TableCell className="w-[80px]">
                      <span className={cn(
                        "font-semibold",
                        ferramenta.quantidade_disponivel === 0 ? "text-red-600" : "text-zinc-700 dark:text-zinc-300"
                      )}>
                        {ferramenta.quantidade_disponivel}
                      </span>
                    </TableCell>
                    <TableCell className="w-[100px]">
                      <Badge variant="secondary" className={cn(
                        ferramenta.estado === 'ok'
                          ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-zinc-200"
                          : "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 border-zinc-300"
                      )}>
                        {ferramenta.estado === 'ok' ? "Ativo" : getEstadoLabel(ferramenta.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-[100px] text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-20 flex items-center justify-center gap-1 mx-auto data-[state=open]:bg-muted bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700">
                            Ações <ChevronLeft className="h-3 w-3 rotate-[-90deg]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => { setEditing(ferramenta); setOpen(true); }}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGenerateLabel(ferramenta)}>
                            <Printer className="mr-2 h-4 w-4" /> Gerar etiqueta
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(ferramenta.id)}>
                            <Archive className="mr-2 h-4 w-4" /> Inativar / Excluir
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => setActionDialog({ type: "incident", ferramenta })}>
                            <AlertTriangle className="mr-2 h-4 w-4" /> Reportar Problema
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-700">
            {paginatedFerramentas.map((ferramenta) => (
              <div
                key={ferramenta.id}
                className="p-4 space-y-3 active:bg-zinc-50 cursor-pointer dark:active:bg-zinc-800"
                onClick={() => { setEditing(ferramenta); setOpen(true); }}
              >
                {/* Header: Image + Name + Stock */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-md bg-zinc-100 overflow-hidden relative flex-shrink-0">
                    {ferramenta.foto_url ? (
                      <Image src={ferramenta.foto_url} alt={ferramenta.nome} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-300">
                        <Package size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{ferramenta.nome}</p>
                    <p className="text-sm text-zinc-500">{ferramenta.codigo || "Sem código"}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "text-xl font-bold",
                      ferramenta.quantidade_disponivel === 0 ? "text-red-600" : "text-zinc-800 dark:text-zinc-200"
                    )}>
                      {ferramenta.quantidade_disponivel}
                    </span>
                    <p className="text-xs text-zinc-500">em estoque</p>
                  </div>
                </div>

                {/* Details Row */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={cn(
                      ferramenta.estado === 'ok'
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-zinc-200 text-zinc-700"
                    )}>
                      {ferramenta.estado === 'ok' ? "Ativo" : getEstadoLabel(ferramenta.estado)}
                    </Badge>
                    {ferramenta.tamanho && (
                      <span className="text-zinc-500">{ferramenta.tamanho}</span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 text-zinc-500">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditing(ferramenta); setOpen(true); }}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleGenerateLabel(ferramenta); }}>
                        <Printer className="mr-2 h-4 w-4" /> Etiqueta
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
          {/* Pagination reusable */}
          {filteredFerramentas.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-zinc-500">
                {t("dashboard.ferramentas.pagination.showing", { count: paginatedFerramentas.length, total: filteredFerramentas.length })}
              </div>
              <div className="flex gap-1 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </div>
      </Tabs >

      {/* Modals restored */}
      {
        importModalOpen && (
          <ImportExcel
            config={importConfig}
            onClose={() => setImportModalOpen(false)}
          />
        )
      }
      {
        importInvoiceOpen && (
          <ImportInvoice
            onClose={() => setImportInvoiceOpen(false)}
            onImport={async (items) => {
              /* Integrated logic from previous code */
              setLoading(true)
              try {
                for (const item of items) {
                  const formData = new FormData()
                  formData.append("nome", item.nome)
                  formData.append("quantidade_total", item.quantidade.toString())
                  formData.append("estado", "ok")
                  formData.append("tipo_item", "ferramenta")
                  if (item.valor_unitario) formData.append("valor_unitario", item.valor_unitario.toString())
                  if (item.codigo) formData.append("codigo", item.codigo)
                  else formData.append("codigo", gerarCodigoLocal(item.nome))
                  await criarFerramenta(formData)
                }
                toast.success("Itens importados com sucesso!")
                router.refresh()
              } catch (err: any) {
                toast.error(err.message)
              } finally { setLoading(false) }
            }}
          />
        )
      }
      {
        smartImportOpen && (
          <SmartImport
            open={smartImportOpen}
            onClose={() => setSmartImportOpen(false)}
            onImport={importConfig.onImport}
          />
        )
      }

      {/* Dialog de Ações */}
      {
        actionDialog && (
          <Dialog
            open={!!actionDialog}
            onOpenChange={() => setActionDialog(null)}
          >
            <DialogContent>
              <form onSubmit={handleAction}>
                <DialogHeader>
                  <DialogTitle>
                    {actionDialog.type === "entrada" && t("dashboard.ferramentas.actions.register_entry")}
                    {actionDialog.type === "retirada" && t("dashboard.ferramentas.actions.register_withdrawal")}
                    {actionDialog.type === "devolucao" && t("dashboard.ferramentas.actions.register_return")}
                    {actionDialog.type === "conserto" && t("dashboard.ferramentas.actions.send_to_repair")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("dashboard.ferramentas.actions.tool")}: {actionDialog.ferramenta?.nome}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {(actionDialog.type === "retirada" ||
                    actionDialog.type === "devolucao") && (
                      <div className="grid gap-2">
                        <Label htmlFor="colaborador_id">{t("dashboard.ferramentas.actions.collaborator")} *</Label>
                        <Select name="colaborador_id" required defaultValue={actionDialog.initialCollaboratorId}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("dashboard.ferramentas.actions.select_collaborator")} />
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
                    <Label htmlFor="quantidade">{t("dashboard.ferramentas.actions.quantity")} *</Label>
                    <Input
                      id="quantidade"
                      name="quantidade"
                      type="number"
                      defaultValue={actionDialog.initialQuantity}
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
                        <Label htmlFor="status_conserto">{t("dashboard.ferramentas.actions.status")}</Label>
                        <Select name="status_conserto" defaultValue="aguardando">
                          <SelectTrigger>
                            <SelectValue placeholder={t("dashboard.ferramentas.actions.repair_status_placeholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aguardando">{t("dashboard.consertos.status.waiting")}</SelectItem>
                            <SelectItem value="em_andamento">{t("dashboard.consertos.status.in_progress")}</SelectItem>
                            <SelectItem value="concluido">{t("dashboard.consertos.status.completed")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="local_conserto">{t("dashboard.ferramentas.actions.location")}</Label>
                        <Input id="local_conserto" name="local_conserto" placeholder={t("dashboard.ferramentas.actions.location_placeholder")} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="prazo_conserto">{t("dashboard.ferramentas.actions.deadline")}</Label>
                        <Input id="prazo_conserto" name="prazo_conserto" type="date" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="prioridade_conserto">{t("dashboard.ferramentas.actions.priority")}</Label>
                        <Select name="prioridade_conserto" defaultValue="media">
                          <SelectTrigger>
                            <SelectValue placeholder={t("dashboard.ferramentas.actions.priority")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baixa">{t("dashboard.ferramentas.actions.priority_low")}</SelectItem>
                            <SelectItem value="media">{t("dashboard.ferramentas.actions.priority_medium")}</SelectItem>
                            <SelectItem value="alta">{t("dashboard.ferramentas.actions.priority_high")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="observacoes">{t("dashboard.ferramentas.actions.observations")}</Label>
                    <Input
                      id="observacoes"
                      name="observacoes"
                      placeholder={t("dashboard.ferramentas.actions.optional")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActionDialog(null)}
                  >
                    {t("dashboard.ferramentas.form.cancel")}
                  </Button>
                  <Button type="submit" disabled={loading} className="bg-[#37352f] hover:bg-zinc-800 text-white">
                    {loading ? t("dashboard.ferramentas.actions.processing") : t("dashboard.ferramentas.actions.confirm")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )
      }

      {/* Incident Wizard Dialog */}
      {actionDialog?.type === "incident" && (
        <Dialog open={true} onOpenChange={() => setActionDialog(null)}>
          <DialogContent className="max-w-3xl">
            {/* No Header here as IncidentReporter has its own progress header */}
            <div className="pt-2">
              <IncidentReporter
                ferramentaNome={actionDialog.ferramenta.nome}
                maxQuantity={actionDialog.ferramenta.quantidade_disponivel}
                onCancel={() => setActionDialog(null)}
                onSubmit={async (data) => {
                  // Adapt the structured data to the existing 'conserto' action interface
                  // We serialize the structured data into the 'observacoes' field text
                  // Format: [FALHA: TIPO - SUBTIPO] obs

                  const structuredObs = `[FALHA: ${data.category.toUpperCase()} - ${data.issue.toUpperCase()}]`

                  // Trigger the backend action for "send to repair" (conserto)
                  // We reuse registrarEnvioConserto for now as it sets status to 'em_conserto' or 'danificada' logic?
                  // Ideally we want status 'danificada'.
                  // registrarEnvioConserto sets status to 'em_conserto'. 
                  // Let's us updating tool directly or using the conserto flow if that's what user expects.
                  // User story says report problem. usually means broken.
                  // Let's use registrarEnvioConserto which is robust, but pass specific params.

                  try {
                    setLoading(true)
                    // Signature: (id, quantidade, descricao, status, local, prazo, prioridade)
                    await registrarEnvioConserto(
                      actionDialog.ferramenta.id,
                      data.quantity, // Quantidade selecionada
                      structuredObs, // Descricao/Observacoes
                      "aguardando", // Status
                      "Interno (Triagem)", // Local
                      new Date().toISOString().split('T')[0], // Prazo (Hoje)
                      "alta" // Prioridade
                    )
                    toast.success("Incidente registrado com sucesso!")
                    setActionDialog(null)
                  } catch (err) {
                    toast.error("Erro ao registrar incidente")
                  } finally {
                    setLoading(false)
                  }
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* QR Scanner is now rendered standalone above, not in a Dialog */}

      {/* Registration Celebration */}
      {celebrationData && (
        <RegistrationCelebration
          data={celebrationData}
          onClose={() => setCelebrationData(null)}
        />
      )}

    </div >
  )
}

export default memo(FerramentasList)

