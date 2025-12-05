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
  Package,
  Grid3x3,
  Square,
  LayoutGrid,
  Upload,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Camera,
} from "lucide-react"
import ImportExcel, { ImportConfig } from "../import/ImportExcel"
import ImportInvoice from "../import/ImportInvoice"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/lib/hooks/useDebounce"
import { ProductPhotoUpload } from "./ProductPhotoUpload"
import { createClientComponentClient } from "@/lib/supabase-client"
import Image from "next/image"
import { FerramentasFilters, type FilterState } from "./FerramentasFilters"
import { useTranslation } from "react-i18next"
import { useToast } from "@/components/ui/toast-context"

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
  const debouncedSearch = useDebounce(filters.search, 300)
  const [open, setOpen] = useState(false)
  const [actionDialog, setActionDialog] = useState<{
    type: "entrada" | "retirada" | "devolucao" | "conserto"
    ferramenta: Ferramenta | null
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
  const supabase = createClientComponentClient()
  const { toast } = useToast()
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

  // Estado para modal de importação
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importInvoiceOpen, setImportInvoiceOpen] = useState(false)

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
      const { error } = await supabase.from("produtos").delete().eq("id", id)

      if (error) throw error

      setFerramentas(ferramentas.filter((p) => p.id !== id))
      toast.success("Ferramenta excluída com sucesso")
    } catch (error) {
      console.error("Erro ao excluir:", error)
      toast.error("Erro ao excluir ferramenta")
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
      <FerramentasFilters
        categorias={categorias}
        filters={filters}
        onFiltersChange={setFilters}
        totalEncontrados={filteredFerramentas.length}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={exportingCsv || filteredFerramentas.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            {exportingCsv ? t("dashboard.ferramentas.generating_csv") : t("dashboard.ferramentas.export_csv")}
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t("dashboard.ferramentas.import_button")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportInvoiceOpen(true)}
            title="Importar Nota Fiscal com IA"
          >
            <Camera className="mr-2 h-4 w-4" />
            Importar NF (IA)
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("dashboard.ferramentas.new_button")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editing ? t("dashboard.ferramentas.form.title_edit") : t("dashboard.ferramentas.form.title_new")}
                  </DialogTitle>
                  <DialogDescription>
                    {editing
                      ? t("dashboard.ferramentas.form.desc_edit")
                      : t("dashboard.ferramentas.form.desc_new")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Campos hidden para garantir que valores dos Selects sejam enviados */}
                  <input type="hidden" name="tipo_item" value={tipoItem || editing?.tipo_item || "ferramenta"} />
                  <input type="hidden" name="estado" value={editing?.estado || "ok"} />

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
                        // Atualizar campo hidden
                        const hiddenInput = document.querySelector('input[name="tipo_item"]') as HTMLInputElement
                        if (hiddenInput) {
                          hiddenInput.value = val
                        }
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          // Atualizar campo hidden
                          const hiddenInput = document.querySelector('input[name="estado"]') as HTMLInputElement
                          if (hiddenInput) {
                            hiddenInput.value = value
                          }
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
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.ferramentas.form.min_stock_hint")}
                    </p>
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
                    {t("dashboard.ferramentas.form.cancel")}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? t("dashboard.ferramentas.form.saving") : t("dashboard.ferramentas.form.save")}
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

      {/* Modal de Importação de Nota Fiscal */}
      {importInvoiceOpen && (
        <ImportInvoice
          onClose={() => setImportInvoiceOpen(false)}
          onImport={async (items) => {
            setLoading(true)
            try {
              // Para cada item extraído, criar no banco
              for (const item of items) {
                const formData = new FormData()
                formData.append("nome", item.nome)
                formData.append("quantidade_total", item.quantidade.toString())
                formData.append("estado", "ok")
                formData.append("tipo_item", "ferramenta")

                if (item.valor_unitario) {
                  formData.append("valor_unitario", item.valor_unitario.toString())
                }

                if (item.codigo) {
                  formData.append("codigo", item.codigo)
                } else {
                  // Gerar código se não existir
                  formData.append("codigo", gerarCodigoLocal(item.nome))
                }

                await criarFerramenta(formData)
              }
              toast.success("Itens importados com sucesso!")
              router.refresh()
            } catch (error: any) {
              console.error(error)
              toast.error(error.message || "Erro ao importar itens")
            } finally {
              setLoading(false)
            }
          }}
        />
      )}

      <div className={cn(
        "grid gap-4",
        cardSize === "pequeno" && "md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
        cardSize === "medio" && "md:grid-cols-2 lg:grid-cols-3",
        cardSize === "grande" && "md:grid-cols-2"
      )}>
        {paginatedFerramentas.map((ferramenta) => (
          <Card key={ferramenta.id} className={cn(
            "dark:bg-zinc-900 dark:border-zinc-800",
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
                <div className={cn(
                  "flex items-start justify-between",
                  cardSize === "pequeno" && "flex-col gap-1"
                )}>
                  <div className={cn(
                    "space-y-1",
                    cardSize === "pequeno" && "space-y-0.5 w-full"
                  )}>
                    <div className="flex items-center gap-2">
                      <h3 className={cn(
                        "font-semibold",
                        cardSize === "pequeno" && "text-sm",
                        cardSize === "medio" && "text-lg",
                        cardSize === "grande" && "text-xl"
                      )}>{ferramenta.nome}</h3>
                      {/* Indicador de estoque baixo */}
                      {ferramenta.ponto_ressuprimento !== null &&
                        ferramenta.ponto_ressuprimento !== undefined &&
                        ferramenta.quantidade_disponivel <= ferramenta.ponto_ressuprimento && (
                          <Badge
                            variant="destructive"
                            className={cn(
                              "animate-pulse",
                              cardSize === "pequeno" && "text-[10px] px-1.5 py-0",
                              cardSize === "medio" && "text-xs px-2 py-0.5",
                              cardSize === "grande" && "text-xs px-2 py-0.5"
                            )}
                            title={`Estoque baixo! Mínimo: ${ferramenta.ponto_ressuprimento}`}
                          >
                            ⚠️
                          </Badge>
                        )}
                    </div>
                    <div className={cn(
                      "flex flex-col text-muted-foreground",
                      cardSize === "pequeno" && "text-xs",
                      cardSize === "medio" && "text-sm",
                      cardSize === "grande" && "text-sm"
                    )}>
                      {ferramenta.codigo && <span>{t("dashboard.ferramentas.cards.code")}: {ferramenta.codigo}</span>}
                      {ferramenta.tipo_item && (
                        <span>
                          {t("dashboard.ferramentas.cards.type")}:{" "}
                          {ferramenta.tipo_item === "consumivel"
                            ? t("dashboard.ferramentas.form.consumable")
                            : ferramenta.tipo_item === "epi"
                              ? t("dashboard.ferramentas.form.ppe")
                              : t("dashboard.ferramentas.form.tool")}
                        </span>
                      )}
                      {ferramenta.categoria && <span>{t("dashboard.ferramentas.cards.category")}: {ferramenta.categoria}</span>}
                    </div>
                  </div>
                  <Badge
                    variant={getEstadoBadge(ferramenta.estado)}
                    className={cn(
                      cardSize === "pequeno" && "text-xs",
                      cardSize === "medio" && "text-xs",
                      cardSize === "grande" && "text-sm"
                    )}
                  >
                    {getEstadoLabel(ferramenta.estado)}
                  </Badge>
                </div>

                {ferramenta.foto_url ? (
                  <div className={cn(
                    "relative w-full rounded-lg overflow-hidden border bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700",
                    cardSize === "pequeno" && "h-24",
                    cardSize === "medio" && "h-40",
                    cardSize === "grande" && "h-56"
                  )}>
                    <Image
                      src={ferramenta.foto_url}
                      alt={ferramenta.nome}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className={cn(
                    "relative w-full rounded-lg overflow-hidden border bg-zinc-50 flex items-center justify-center dark:bg-zinc-800 dark:border-zinc-700",
                    cardSize === "pequeno" && "h-24",
                    cardSize === "medio" && "h-40",
                    cardSize === "grande" && "h-56"
                  )}>
                    <Package className={cn(
                      "text-zinc-400 dark:text-zinc-500",
                      cardSize === "pequeno" && "h-6 w-6",
                      cardSize === "medio" && "h-12 w-12",
                      cardSize === "grande" && "h-16 w-16"
                    )} />
                  </div>
                )}

                <div className={cn(
                  "grid grid-cols-2 gap-2",
                  cardSize === "pequeno" && "text-xs",
                  cardSize === "medio" && "text-sm",
                  cardSize === "grande" && "text-sm"
                )}>
                  <div>
                    <p className="text-muted-foreground">{t("dashboard.ferramentas.cards.total")}</p>
                    <p className="font-semibold">
                      {ferramenta.quantidade_total}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("dashboard.ferramentas.cards.available")}</p>
                    <p className="font-semibold">
                      {ferramenta.quantidade_disponivel}
                    </p>
                  </div>
                </div>

                <div className={cn(
                  "flex flex-wrap gap-2",
                  cardSize === "pequeno" && "gap-1"
                )}>
                  <Button
                    variant="outline"
                    size={cardSize === "pequeno" ? "sm" : "sm"}
                    onClick={() =>
                      setActionDialog({
                        type: "entrada",
                        ferramenta,
                      })
                    }
                    className={cn(
                      cardSize === "pequeno" && "text-xs px-2 py-1 h-auto"
                    )}
                  >
                    <PackagePlus className={cn(
                      cardSize === "pequeno" ? "h-3 w-3" : "h-4 w-4",
                      cardSize !== "pequeno" && "mr-1"
                    )} />
                    {cardSize !== "pequeno" && t("dashboard.ferramentas.actions.entry")}
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
                        className={cn(
                          cardSize === "pequeno" && "text-xs px-2 py-1 h-auto"
                        )}
                      >
                        <PackageMinus className={cn(
                          cardSize === "pequeno" ? "h-3 w-3" : "h-4 w-4",
                          cardSize !== "pequeno" && "mr-1"
                        )} />
                        {cardSize !== "pequeno" && t("dashboard.ferramentas.actions.withdraw")}
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
                        className={cn(
                          cardSize === "pequeno" && "text-xs px-2 py-1 h-auto"
                        )}
                      >
                        <RotateCcw className={cn(
                          cardSize === "pequeno" ? "h-3 w-3" : "h-4 w-4",
                          cardSize !== "pequeno" && "mr-1"
                        )} />
                        {cardSize !== "pequeno" && t("dashboard.ferramentas.actions.return")}
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
                      className={cn(
                        cardSize === "pequeno" && "text-xs px-2 py-1 h-auto"
                      )}
                    >
                      <Wrench className={cn(
                        cardSize === "pequeno" ? "h-3 w-3" : "h-4 w-4",
                        cardSize !== "pequeno" && "mr-1"
                      )} />
                      {cardSize !== "pequeno" && t("dashboard.ferramentas.actions.repair")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(ferramenta)
                      setOpen(true)
                    }}
                    className={cn(
                      cardSize === "pequeno" && "h-6 w-6 p-0"
                    )}
                  >
                    <Edit className={cn(
                      cardSize === "pequeno" ? "h-3 w-3" : "h-4 w-4"
                    )} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(ferramenta.id)}
                    className={cn(
                      cardSize === "pequeno" && "h-6 w-6 p-0"
                    )}
                  >
                    <Trash2 className={cn(
                      cardSize === "pequeno" ? "h-3 w-3" : "h-4 w-4",
                      "text-destructive"
                    )} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer de Paginação */}
      {filteredFerramentas.length > 0 && (
        <div className="flex items-center justify-between px-2 py-2 text-xs text-zinc-500">
          <div>
            {t("dashboard.ferramentas.pagination.showing", { count: paginatedFerramentas.length, total: filteredFerramentas.length })}
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

      {filteredFerramentas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-lg border border-dashed border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700">
          <div className="bg-blue-50 p-4 rounded-full mb-4 dark:bg-blue-900/20">
            <Package className="h-10 w-10 text-blue-500 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-2 dark:text-zinc-100">
            {filters.search ? t("dashboard.ferramentas.empty.no_items_title") : t("dashboard.ferramentas.empty.stock_empty_title")}
          </h3>
          <p className="text-zinc-500 max-w-sm mb-6 dark:text-zinc-400">
            {filters.search
              ? t("dashboard.ferramentas.empty.no_items_search")
              : t("dashboard.ferramentas.empty.stock_empty_desc")}
          </p>
          {!filters.search && (
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("dashboard.ferramentas.empty.first_item")}
            </Button>
          )}
          {filters.search && (
            <Button variant="outline" onClick={() => setFilters({ ...filters, search: "" })}>
              {t("dashboard.ferramentas.empty.clear_search")}
            </Button>
          )}
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
                      <Select name="colaborador_id" required>
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
                <Button type="submit" disabled={loading}>
                  {loading ? t("dashboard.ferramentas.actions.processing") : t("dashboard.ferramentas.actions.confirm")}
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
