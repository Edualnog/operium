"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Package,
  Loader2,
  Edit,
  Check
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Inventario {
  id: string
  descricao: string
  data_inicio: string
  data_fim: string | null
  responsavel: string | null
  total_itens: number
  itens_contados: number
  total_divergencias: number
}

interface InventarioItem {
  id: string
  inventario_id: string
  ferramenta_id: string
  quantidade_sistema: number
  quantidade_fisica: number | null
  diferenca: number | null
  contado: boolean
  ferramenta?: {
    id: string
    nome: string
    codigo: string | null
    categoria: string | null
  }
}

interface InventarioComparativoProps {
  inventario: Inventario
  onBack: () => void
}

const motivosAjuste = [
  { value: "perda_avaria", label: "Perda / Avaria" },
  { value: "furto_extravio", label: "Furto / Extravio" },
  { value: "erro_lancamento", label: "Erro de lançamento anterior" },
  { value: "vencimento_descarte", label: "Vencimento / Descarte" },
  { value: "transferencia", label: "Transferência não registrada" },
  { value: "outro", label: "Outro" },
]

export default function InventarioComparativo({ inventario, onBack }: InventarioComparativoProps) {
  const [itens, setItens] = useState<InventarioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"todos" | "divergentes" | "ok">("divergentes")
  const [selectedItem, setSelectedItem] = useState<InventarioItem | null>(null)
  const [showAjusteModal, setShowAjusteModal] = useState(false)
  const [ajusteMotivo, setAjusteMotivo] = useState("")
  const [ajusteObservacao, setAjusteObservacao] = useState("")
  const [saving, setSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchItens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventario.id])

  const fetchItens = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("inventario_itens")
        .select(`
          *,
          ferramenta:ferramentas(id, nome, codigo, categoria)
        `)
        .eq("inventario_id", inventario.id)
        .eq("contado", true)
        .order("diferenca", { ascending: true })

      if (error) throw error
      setItens(data || [])
    } catch (error) {
      console.error("Erro ao buscar itens:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAjuste = (item: InventarioItem) => {
    setSelectedItem(item)
    setAjusteMotivo("")
    setAjusteObservacao("")
    setShowAjusteModal(true)
  }

  const handleSaveAjuste = async () => {
    if (!selectedItem || !ajusteMotivo) return

    try {
      setSaving(true)

      // Registrar ajuste
      await supabase.from("inventario_ajustes").insert({
        inventario_item_id: selectedItem.id,
        quantidade_anterior: selectedItem.quantidade_sistema,
        quantidade_nova: selectedItem.quantidade_fisica,
        diferenca: selectedItem.diferenca,
        motivo: ajusteMotivo,
        observacao: ajusteObservacao || null,
        aprovado_por: null,
        aplicado: false
      })

      // Atualizar estoque real
      await supabase
        .from("ferramentas")
        .update({ quantidade_disponivel: selectedItem.quantidade_fisica })
        .eq("id", selectedItem.ferramenta_id)

      // Marcar ajuste como aplicado
      await supabase
        .from("inventario_ajustes")
        .update({ aplicado: true })
        .eq("inventario_item_id", selectedItem.id)

      setShowAjusteModal(false)
      setSelectedItem(null)
      
      // Atualizar lista (remover da lista de divergentes ou atualizar status)
      setItens(prev => prev.map(item => 
        item.id === selectedItem.id 
          ? { ...item, diferenca: 0, quantidade_sistema: selectedItem.quantidade_fisica! }
          : item
      ))
    } catch (error) {
      console.error("Erro ao salvar ajuste:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleExportPdf = async () => {
    try {
      setGeneratingPdf(true)

      const { default: jsPDF } = await import("jspdf")
      const { default: autoTable } = await import("jspdf-autotable")

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.width
      let yPos = 20

      // Título
      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      doc.text("RELATÓRIO DE INVENTÁRIO", pageWidth / 2, yPos, { align: "center" })
      yPos += 10

      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(inventario.descricao, pageWidth / 2, yPos, { align: "center" })
      yPos += 15

      // Info
      doc.setFontSize(10)
      doc.text(`Data Início: ${format(new Date(inventario.data_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 20, yPos)
      yPos += 6
      if (inventario.data_fim) {
        doc.text(`Data Fim: ${format(new Date(inventario.data_fim), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 20, yPos)
        yPos += 6
      }
      if (inventario.responsavel) {
        doc.text(`Responsável: ${inventario.responsavel}`, 20, yPos)
        yPos += 6
      }
      yPos += 5

      // Resumo
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("RESUMO", 20, yPos)
      yPos += 6

      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      
      const divergentes = itens.filter(i => i.diferenca !== 0)
      const sobras = divergentes.filter(i => i.diferenca! > 0)
      const faltas = divergentes.filter(i => i.diferenca! < 0)
      const totalSobras = sobras.reduce((acc, i) => acc + (i.diferenca || 0), 0)
      const totalFaltas = faltas.reduce((acc, i) => acc + Math.abs(i.diferenca || 0), 0)

      doc.text(`• Total de itens: ${itens.length}`, 25, yPos); yPos += 5
      doc.text(`• Itens conferidos: ${inventario.itens_contados}`, 25, yPos); yPos += 5
      doc.text(`• Divergências encontradas: ${divergentes.length}`, 25, yPos); yPos += 5
      doc.text(`• Total de sobras: +${totalSobras} unidades`, 25, yPos); yPos += 5
      doc.text(`• Total de faltas: -${totalFaltas} unidades`, 25, yPos); yPos += 10

      // Tabela de divergências
      if (divergentes.length > 0) {
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.text("DIVERGÊNCIAS ENCONTRADAS", 20, yPos)
        yPos += 5

        autoTable(doc, {
          startY: yPos,
          head: [["Item", "Código", "Sistema", "Físico", "Diferença"]],
          body: divergentes.map(item => [
            item.ferramenta?.nome || "-",
            item.ferramenta?.codigo || "-",
            item.quantidade_sistema.toString(),
            (item.quantidade_fisica || 0).toString(),
            (item.diferenca! > 0 ? "+" : "") + item.diferenca!.toString()
          ]),
          theme: "grid",
          headStyles: { fillColor: [107, 70, 193] },
          styles: { fontSize: 9 },
        })
      }

      // Itens sem divergência
      const semDivergencia = itens.filter(i => i.diferenca === 0)
      if (semDivergencia.length > 0) {
        const finalY = (doc as any).lastAutoTable?.finalY || yPos + 10
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.text("ITENS SEM DIVERGÊNCIA", 20, finalY + 10)

        autoTable(doc, {
          startY: finalY + 15,
          head: [["Item", "Código", "Quantidade"]],
          body: semDivergencia.map(item => [
            item.ferramenta?.nome || "-",
            item.ferramenta?.codigo || "-",
            item.quantidade_sistema.toString()
          ]),
          theme: "grid",
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 9 },
        })
      }

      // Rodapé
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(128)
        doc.text(
          `Gerado pelo Almox Fácil em ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        )
      }

      // Salvar
      doc.save(`Inventario_${inventario.descricao.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`)
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
    } finally {
      setGeneratingPdf(false)
    }
  }

  const divergentes = itens.filter(i => i.diferenca !== 0)
  const semDivergencia = itens.filter(i => i.diferenca === 0)
  const sobras = divergentes.filter(i => i.diferenca! > 0)
  const faltas = divergentes.filter(i => i.diferenca! < 0)

  const filteredItens = filter === "todos" 
    ? itens 
    : filter === "divergentes" 
      ? divergentes 
      : semDivergencia

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Resultado do Inventário</h1>
            <p className="text-sm text-zinc-600">{inventario.descricao}</p>
          </div>
        </div>
        <Button
          onClick={handleExportPdf}
          disabled={generatingPdf}
          variant="outline"
          className="gap-2"
        >
          {generatingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          Exportar PDF
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 text-zinc-600 mb-2">
            <Package className="h-4 w-4" />
            <span className="text-sm">Total de Itens</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{itens.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Sem Divergência</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{semDivergencia.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <ArrowUpRight className="h-4 w-4" />
            <span className="text-sm">Sobras</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">+{sobras.reduce((a, i) => a + (i.diferenca || 0), 0)}</p>
          <p className="text-xs text-zinc-500">{sobras.length} itens</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <ArrowDownRight className="h-4 w-4" />
            <span className="text-sm">Faltas</span>
          </div>
          <p className="text-2xl font-bold text-red-600">-{faltas.reduce((a, i) => a + Math.abs(i.diferenca || 0), 0)}</p>
          <p className="text-xs text-zinc-500">{faltas.length} itens</p>
        </div>
      </div>

      {/* Alerta de divergências */}
      {divergentes.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-orange-800">
              {divergentes.length} divergência{divergentes.length !== 1 ? "s" : ""} encontrada{divergentes.length !== 1 ? "s" : ""}
            </h4>
            <p className="text-sm text-orange-700 mt-1">
              Revise os itens e registre os ajustes com justificativa para manter o histórico.
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {(["divergentes", "ok", "todos"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filter === f
                ? "bg-purple-100 text-purple-700"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            {f === "divergentes" && `Divergências (${divergentes.length})`}
            {f === "ok" && `Sem Divergência (${semDivergencia.length})`}
            {f === "todos" && `Todos (${itens.length})`}
          </button>
        ))}
      </div>

      {/* Tabela de itens */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-zinc-700">Item</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-zinc-700">Sistema</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-zinc-700">Físico</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-zinc-700">Diferença</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-zinc-700">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    Nenhum item encontrado
                  </td>
                </tr>
              ) : (
                filteredItens.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{item.ferramenta?.nome}</p>
                      <p className="text-xs text-zinc-500">{item.ferramenta?.codigo || "Sem código"}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{item.quantidade_sistema}</td>
                    <td className="px-4 py-3 text-center font-medium">{item.quantidade_fisica}</td>
                    <td className="px-4 py-3 text-center">
                      {item.diferenca === 0 ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <Minus className="h-3 w-3 mr-1" />
                          OK
                        </Badge>
                      ) : item.diferenca! > 0 ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          +{item.diferenca}
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                          {item.diferenca}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.diferenca !== 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAjuste(item)}
                          className="gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Ajustar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Ajuste */}
      <Dialog open={showAjusteModal} onOpenChange={setShowAjusteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-purple-600" />
              Ajuste de Estoque
            </DialogTitle>
            <DialogDescription>
              Registre o motivo da divergência encontrada
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="bg-zinc-50 rounded-lg p-4">
                <p className="font-medium text-zinc-900">{selectedItem.ferramenta?.nome}</p>
                <div className="grid grid-cols-3 gap-4 mt-3 text-center">
                  <div>
                    <p className="text-xs text-zinc-500">Sistema</p>
                    <p className="font-bold text-zinc-900">{selectedItem.quantidade_sistema}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Físico</p>
                    <p className="font-bold text-zinc-900">{selectedItem.quantidade_fisica}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Diferença</p>
                    <p className={cn(
                      "font-bold",
                      selectedItem.diferenca! > 0 ? "text-blue-600" : "text-red-600"
                    )}>
                      {selectedItem.diferenca! > 0 ? "+" : ""}{selectedItem.diferenca}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Motivo do Ajuste *</Label>
                <Select value={ajusteMotivo} onValueChange={setAjusteMotivo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {motivosAjuste.map((motivo) => (
                      <SelectItem key={motivo.value} value={motivo.value}>
                        {motivo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea
                  placeholder="Descreva detalhes adicionais sobre o ajuste..."
                  value={ajusteObservacao}
                  onChange={(e) => setAjusteObservacao(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                O estoque será atualizado para <strong>{selectedItem.quantidade_fisica}</strong> unidades.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAjusteModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveAjuste}
              disabled={!ajusteMotivo || saving}
              className="gap-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Confirmar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

