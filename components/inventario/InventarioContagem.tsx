"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"

// Função para tocar som de confirmação
const playBeep = (type: "success" | "warning" | "error" = "success") => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    if (type === "success") {
      // Som de sucesso: dois beeps agudos rápidos (quantidade bateu!)
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime) // A5
      oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1) // C#6
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } else if (type === "warning") {
      // Som de alerta: três beeps médios (divergência encontrada!)
      oscillator.type = "triangle"
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.15)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.3)
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.45)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.45)
    } else {
      // Som de erro: beep grave longo
      oscillator.frequency.setValueAtTime(220, audioContext.currentTime) // A3
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.4)
    }
  } catch (e) {
    console.log("Audio não suportado")
  }
}
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Search,
  Check,
  Package,
  Loader2,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Inventario {
  id: string
  descricao: string
  total_itens: number
  itens_contados: number
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

interface InventarioContagemProps {
  inventario: Inventario
  onBack: () => void
  onFinish: () => void
}

export default function InventarioContagem({ inventario, onBack, onFinish }: InventarioContagemProps) {
  const [itens, setItens] = useState<InventarioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedItem, setSelectedItem] = useState<InventarioItem | null>(null)
  const [quantidadeFisica, setQuantidadeFisica] = useState("")
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<"todos" | "pendentes" | "contados">("pendentes")
  
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchItens()
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
        .order("contado", { ascending: true })

      if (error) throw error
      setItens(data || [])
    } catch (error) {
      console.error("Erro ao buscar itens:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectItem = (item: InventarioItem) => {
    setSelectedItem(item)
    setQuantidadeFisica(item.quantidade_fisica?.toString() || "")
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleSaveContagem = async () => {
    if (!selectedItem || quantidadeFisica === "") return

    try {
      setSaving(true)
      const qtdFisica = parseInt(quantidadeFisica)
      const diferenca = qtdFisica - selectedItem.quantidade_sistema

      // Atualizar item
      const { error: itemError } = await supabase
        .from("inventario_itens")
        .update({
          quantidade_fisica: qtdFisica,
          diferenca: diferenca,
          contado: true,
          data_contagem: new Date().toISOString()
        })
        .eq("id", selectedItem.id)

      if (itemError) throw itemError

      // Atualizar contagem do inventário
      const contados = itens.filter(i => i.contado || i.id === selectedItem.id).length
      await supabase
        .from("inventarios")
        .update({ itens_contados: contados })
        .eq("id", inventario.id)

      // Atualizar estado local
      setItens(prev => prev.map(item => 
        item.id === selectedItem.id 
          ? { ...item, quantidade_fisica: qtdFisica, diferenca, contado: true }
          : item
      ))

      // Tocar som baseado na divergência
      if (diferenca === 0) {
        playBeep("success") // Quantidade bateu!
      } else {
        playBeep("warning") // Divergência encontrada!
      }
      
      // Ir para próximo item não contado
      const nextItem = itens.find(i => !i.contado && i.id !== selectedItem.id)
      if (nextItem) {
        handleSelectItem(nextItem)
      } else {
        setSelectedItem(null)
        setQuantidadeFisica("")
      }
    } catch (error) {
      console.error("Erro ao salvar contagem:", error)
      playBeep("error")
    } finally {
      setSaving(false)
    }
  }

  const handleFinalizarInventario = async () => {
    try {
      setSaving(true)
      
      // Calcular divergências
      const divergencias = itens.filter(i => i.contado && i.diferenca !== 0)
      
      await supabase
        .from("inventarios")
        .update({
          status: "finalizado",
          data_fim: new Date().toISOString(),
          total_divergencias: divergencias.length,
          itens_contados: itens.filter(i => i.contado).length
        })
        .eq("id", inventario.id)

      onFinish()
    } catch (error) {
      console.error("Erro ao finalizar inventário:", error)
    } finally {
      setSaving(false)
    }
  }

  const filteredItens = itens.filter(item => {
    const matchSearch = 
      item.ferramenta?.nome.toLowerCase().includes(search.toLowerCase()) ||
      item.ferramenta?.codigo?.toLowerCase().includes(search.toLowerCase())
    
    const matchFilter = 
      filter === "todos" ||
      (filter === "pendentes" && !item.contado) ||
      (filter === "contados" && item.contado)

    return matchSearch && matchFilter
  })

  const contados = itens.filter(i => i.contado).length
  const pendentes = itens.filter(i => !i.contado).length
  const progressPercent = itens.length > 0 ? Math.round((contados / itens.length) * 100) : 0

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
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Contagem de Estoque</h1>
            <p className="text-sm text-zinc-600">{inventario.descricao}</p>
          </div>
        </div>
        <Button
          onClick={handleFinalizarInventario}
          disabled={pendentes > 0 || saving}
          className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Finalizar Inventário
        </Button>
      </div>

      {/* Progresso */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-700">Progresso da Contagem</span>
          <span className="text-sm font-bold text-purple-600">{progressPercent}%</span>
        </div>
        <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {contados} contados
          </span>
          <span className="flex items-center gap-1">
            <Circle className="h-3 w-3 text-zinc-300" />
            {pendentes} pendentes
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lista de itens */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="p-4 border-b border-zinc-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Buscar item ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 mt-3">
              {(["pendentes", "contados", "todos"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    filter === f
                      ? "bg-purple-100 text-purple-700"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  {f === "pendentes" && `Pendentes (${pendentes})`}
                  {f === "contados" && `Contados (${contados})`}
                  {f === "todos" && `Todos (${itens.length})`}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto divide-y divide-zinc-100">
            {filteredItens.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum item encontrado</p>
              </div>
            ) : (
              filteredItens.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={cn(
                    "w-full p-4 text-left hover:bg-zinc-50 transition-colors flex items-center gap-3",
                    selectedItem?.id === item.id && "bg-purple-50 hover:bg-purple-50"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    item.contado ? "bg-green-100" : "bg-zinc-100"
                  )}>
                    {item.contado ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-zinc-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 truncate">{item.ferramenta?.nome}</p>
                    <p className="text-xs text-zinc-500">
                      {item.ferramenta?.codigo && `Cód: ${item.ferramenta.codigo} • `}
                      {item.ferramenta?.categoria || "Sem categoria"}
                    </p>
                  </div>
                  {item.contado && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium">{item.quantidade_fisica}</p>
                      {item.diferenca !== 0 && (
                        <p className={cn(
                          "text-xs font-medium",
                          item.diferenca! > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {item.diferenca! > 0 ? "+" : ""}{item.diferenca}
                        </p>
                      )}
                    </div>
                  )}
                  <ChevronRight className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Área de contagem */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          {selectedItem ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-900">{selectedItem.ferramenta?.nome}</h3>
                {selectedItem.ferramenta?.codigo && (
                  <p className="text-sm text-zinc-500 mt-1">Código: {selectedItem.ferramenta.codigo}</p>
                )}
              </div>

              <div className="bg-zinc-50 rounded-lg p-4">
                <p className="text-sm text-zinc-600 mb-1">Quantidade no Sistema</p>
                <p className="text-3xl font-bold text-zinc-400 blur-sm hover:blur-none transition-all cursor-pointer" title="Passe o mouse para ver">
                  {selectedItem.quantidade_sistema}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  * Oculto para não influenciar a contagem
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Quantidade Física Contada *
                </label>
                <Input
                  ref={inputRef}
                  type="number"
                  min="0"
                  placeholder="Digite a quantidade contada"
                  value={quantidadeFisica}
                  onChange={(e) => setQuantidadeFisica(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveContagem()
                    }
                  }}
                  className="text-center text-2xl h-14 font-bold"
                />
              </div>

              <Button
                onClick={handleSaveContagem}
                disabled={quantidadeFisica === "" || saving}
                className="w-full gap-2 h-12 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                Confirmar Contagem
              </Button>

              {selectedItem.contado && selectedItem.diferenca !== 0 && (
                <div className={cn(
                  "p-3 rounded-lg flex items-center gap-2",
                  selectedItem.diferenca! > 0 ? "bg-green-50" : "bg-red-50"
                )}>
                  <AlertTriangle className={cn(
                    "h-4 w-4",
                    selectedItem.diferenca! > 0 ? "text-green-600" : "text-red-600"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    selectedItem.diferenca! > 0 ? "text-green-700" : "text-red-700"
                  )}>
                    Diferença: {selectedItem.diferenca! > 0 ? "+" : ""}{selectedItem.diferenca} unidades
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
                <Search className="h-10 w-10 text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Selecione um item</h3>
              <p className="text-sm text-zinc-600">
                Escolha um item da lista para iniciar a contagem
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

