"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Package, 
  User, 
  Calendar, 
  FileText, 
  Download, 
  Printer,
  CheckCircle2,
  XCircle,
  Loader2,
  FileSignature,
  Clock,
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCcw,
  Wrench,
  Image as ImageIcon
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClientComponentClient } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"

interface MovimentacaoDetalhada {
  id: string
  tipo: "entrada" | "retirada" | "devolucao" | "ajuste" | "conserto"
  quantidade: number
  observacoes?: string | null
  data?: string | null
  ferramenta?: {
    id: string
    nome: string
    tipo_item?: string | null
    categoria?: string | null
    foto_url?: string | null
    codigo?: string | null
  } | null
  colaborador?: {
    id: string
    nome: string
    cargo?: string | null
    cpf?: string | null
    telefone?: string | null
    foto_url?: string | null
    email?: string | null
  } | null
  termo?: {
    id: string
    assinatura_base64?: string | null
    assinatura_url?: string | null
    pdf_url?: string | null
    data_assinatura?: string | null
    itens?: any[]
  } | null
}

interface MovimentacaoDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  movimentacaoId: string
  onReprint?: (movimentacao: MovimentacaoDetalhada) => void
}

const tipoConfig = {
  entrada: {
    label: "Entrada",
    icon: ArrowDownLeft,
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    iconColor: "text-emerald-600",
  },
  retirada: {
    label: "Retirada",
    icon: ArrowUpRight,
    color: "bg-red-100 text-red-800 border-red-200",
    iconColor: "text-red-600",
  },
  devolucao: {
    label: "Devolução",
    icon: RefreshCcw,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    iconColor: "text-blue-600",
  },
  ajuste: {
    label: "Ajuste",
    icon: FileText,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    iconColor: "text-purple-600",
  },
  conserto: {
    label: "Conserto",
    icon: Wrench,
    color: "bg-amber-100 text-amber-800 border-amber-200",
    iconColor: "text-amber-600",
  },
}

export default function MovimentacaoDetailModal({
  open,
  onOpenChange,
  movimentacaoId,
  onReprint,
}: MovimentacaoDetailModalProps) {
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [movimentacao, setMovimentacao] = useState<MovimentacaoDetalhada | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    if (open && movimentacaoId) {
      loadMovimentacao()
    }
  }, [open, movimentacaoId])

  const loadMovimentacao = async () => {
    setLoading(true)
    setError(null)

    try {
      // Buscar movimentação com dados relacionados
      const { data: mov, error: movError } = await supabase
        .from("movimentacoes")
        .select(`
          id,
          tipo,
          quantidade,
          observacoes,
          data,
          ferramenta_id,
          colaborador_id,
          ferramentas (
            id,
            nome,
            tipo_item,
            categoria,
            foto_url,
            codigo
          ),
          colaboradores (
            id,
            nome,
            cargo,
            cpf,
            telefone,
            foto_url,
            email
          )
        `)
        .eq("id", movimentacaoId)
        .single()

      if (movError) throw movError

      // Normalizar dados (pode vir como array ou objeto)
      const ferramenta = Array.isArray(mov.ferramentas) ? mov.ferramentas[0] : mov.ferramentas
      const colaborador = Array.isArray(mov.colaboradores) ? mov.colaboradores[0] : mov.colaboradores

      // Tentar buscar termo de responsabilidade associado
      let termo = null
      try {
        const { data: termoData, error: termoError } = await supabase
          .from("termos_responsabilidade")
          .select("id, assinatura_base64, assinatura_url, pdf_url, data_assinatura, itens")
          .eq("movimentacao_id", movimentacaoId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle() // Usar maybeSingle em vez de single para não dar erro se não encontrar
        
        if (!termoError && termoData) {
          termo = termoData
        }
      } catch (termoErr) {
        // Tabela pode não existir ou não ter termo - silenciar erro
        console.log("Termo não encontrado ou tabela não existe")
      }

      setMovimentacao({
        id: mov.id,
        tipo: mov.tipo,
        quantidade: mov.quantidade,
        observacoes: mov.observacoes,
        data: mov.data,
        ferramenta: ferramenta,
        colaborador: colaborador,
        termo: termo,
      })
    } catch (err: any) {
      console.error("Erro ao carregar movimentação:", err)
      setError("Erro ao carregar detalhes da movimentação")
    } finally {
      setLoading(false)
    }
  }

  const handleReprint = () => {
    if (movimentacao && onReprint) {
      onReprint(movimentacao)
    }
  }

  const handleDownloadPDF = async () => {
    if (!movimentacao?.termo?.pdf_url) return
    
    try {
      window.open(movimentacao.termo.pdf_url, "_blank")
    } catch (err) {
      console.error("Erro ao baixar PDF:", err)
    }
  }

  const config = movimentacao ? tipoConfig[movimentacao.tipo] : tipoConfig.entrada
  const Icon = config.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-0" aria-describedby="movimentacao-detail-description">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalhes da Movimentação</DialogTitle>
          <DialogDescription id="movimentacao-detail-description">
            Visualização detalhada da movimentação com informações do item, colaborador e termo de responsabilidade.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            <p className="text-sm text-zinc-500">Carregando detalhes...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <XCircle className="h-12 w-12 text-red-400" />
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        ) : movimentacao ? (
          <>
            {/* Cabeçalho colorido por tipo */}
            <div className={cn(
              "px-6 py-5 border-b",
              movimentacao.tipo === "entrada" && "bg-gradient-to-r from-emerald-50 to-emerald-100/50",
              movimentacao.tipo === "retirada" && "bg-gradient-to-r from-red-50 to-red-100/50",
              movimentacao.tipo === "devolucao" && "bg-gradient-to-r from-blue-50 to-blue-100/50",
              movimentacao.tipo === "ajuste" && "bg-gradient-to-r from-purple-50 to-purple-100/50",
              movimentacao.tipo === "conserto" && "bg-gradient-to-r from-amber-50 to-amber-100/50",
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    movimentacao.tipo === "entrada" && "bg-emerald-100",
                    movimentacao.tipo === "retirada" && "bg-red-100",
                    movimentacao.tipo === "devolucao" && "bg-blue-100",
                    movimentacao.tipo === "ajuste" && "bg-purple-100",
                    movimentacao.tipo === "conserto" && "bg-amber-100",
                  )}>
                    <Icon className={cn("h-6 w-6", config.iconColor)} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">
                      Detalhes da Movimentação
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn("text-xs", config.color)}>
                        {config.label}
                      </Badge>
                      {movimentacao.data && (
                        <span className="text-xs text-zinc-500">
                          {format(new Date(movimentacao.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Produto/Ferramenta */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Item Movimentado
                </h3>
                <div className="bg-zinc-50 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    {movimentacao.ferramenta?.foto_url ? (
                      <img 
                        src={movimentacao.ferramenta.foto_url} 
                        alt={movimentacao.ferramenta.nome}
                        className="w-16 h-16 rounded-lg object-cover border border-zinc-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-zinc-200 flex items-center justify-center">
                        <Package className="h-6 w-6 text-zinc-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 text-lg">
                        {movimentacao.ferramenta?.nome || "Produto não identificado"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {movimentacao.ferramenta?.tipo_item && (
                          <Badge variant="outline" className="text-xs">
                            {movimentacao.ferramenta.tipo_item === "epi" ? "EPI" : 
                             movimentacao.ferramenta.tipo_item === "ferramenta" ? "Ferramenta" : 
                             movimentacao.ferramenta.tipo_item === "consumivel" ? "Consumível" : 
                             movimentacao.ferramenta.tipo_item}
                          </Badge>
                        )}
                        {movimentacao.ferramenta?.categoria && (
                          <span className="text-xs text-zinc-500">
                            {movimentacao.ferramenta.categoria}
                          </span>
                        )}
                        {movimentacao.ferramenta?.codigo && (
                          <span className="text-xs text-zinc-400 font-mono">
                            #{movimentacao.ferramenta.codigo}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-bold text-zinc-900">
                        {movimentacao.quantidade}
                      </span>
                      <p className="text-xs text-zinc-500">unidades</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Colaborador (se houver) */}
              {movimentacao.colaborador && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Colaborador Responsável
                  </h3>
                  <div className="bg-zinc-50 rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      {movimentacao.colaborador.foto_url ? (
                        <img 
                          src={movimentacao.colaborador.foto_url} 
                          alt={movimentacao.colaborador.nome}
                          className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-zinc-200 flex items-center justify-center">
                          <User className="h-6 w-6 text-zinc-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-900">
                          {movimentacao.colaborador.nome}
                        </p>
                        {movimentacao.colaborador.cargo && (
                          <p className="text-sm text-zinc-500">{movimentacao.colaborador.cargo}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-zinc-400">
                          {movimentacao.colaborador.cpf && (
                            <span>CPF: {movimentacao.colaborador.cpf}</span>
                          )}
                          {movimentacao.colaborador.telefone && (
                            <span>Tel: {movimentacao.colaborador.telefone}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Observações */}
              {movimentacao.observacoes && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Observações
                  </h3>
                  <div className="bg-zinc-50 rounded-xl p-4">
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                      {movimentacao.observacoes}
                    </p>
                  </div>
                </div>
              )}

              {/* Assinatura Digital */}
              {movimentacao.termo && (movimentacao.tipo === "retirada" || movimentacao.tipo === "devolucao") && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                    <FileSignature className="h-4 w-4" />
                    Termo de Responsabilidade
                  </h3>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Documento Assinado</span>
                      {movimentacao.termo.data_assinatura && (
                        <span className="text-xs text-green-600 ml-auto">
                          {format(new Date(movimentacao.termo.data_assinatura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    
                    {/* Exibir assinatura */}
                    {(movimentacao.termo.assinatura_base64 || movimentacao.termo.assinatura_url) && (
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <p className="text-xs text-zinc-500 mb-2">Assinatura do colaborador:</p>
                        <div className="flex justify-center">
                          <img 
                            src={movimentacao.termo.assinatura_base64 || movimentacao.termo.assinatura_url || ""}
                            alt="Assinatura"
                            className="max-h-24 object-contain"
                          />
                        </div>
                        <div className="mt-2 pt-2 border-t border-dashed border-zinc-200">
                          <p className="text-xs text-center text-zinc-500">
                            {movimentacao.colaborador?.nome}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Botão para baixar PDF */}
                    {movimentacao.termo.pdf_url && movimentacao.termo.pdf_url !== "local" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDownloadPDF}
                        className="w-full bg-white hover:bg-green-50 border-green-200 text-green-700"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar PDF do Termo
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Sem assinatura mas poderia ter */}
              {!movimentacao.termo && (movimentacao.tipo === "retirada" || movimentacao.tipo === "devolucao") && movimentacao.colaborador && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                    <FileSignature className="h-4 w-4" />
                    Termo de Responsabilidade
                  </h3>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-full">
                        <XCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-amber-800">Sem assinatura registrada</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          Esta movimentação não possui termo de responsabilidade assinado
                        </p>
                      </div>
                    </div>
                    {onReprint && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={handleReprint}
                        className="w-full mt-3 bg-white hover:bg-amber-50 border-amber-200 text-amber-700"
                      >
                        <FileSignature className="h-4 w-4 mr-2" />
                        Gerar Termo de Responsabilidade
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Informações adicionais */}
              <div className="pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ID: {movimentacao.id.slice(0, 8)}...
                  </span>
                  {movimentacao.data && (
                    <span>
                      Registrado em {format(new Date(movimentacao.data), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-zinc-50 border-t flex flex-col sm:flex-row gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              {(movimentacao.tipo === "retirada" || movimentacao.tipo === "devolucao") && movimentacao.colaborador && onReprint && (
                <Button onClick={handleReprint} className="gap-2">
                  <Printer className="h-4 w-4" />
                  {movimentacao.termo ? "Reimprimir Termo" : "Gerar Termo"}
                </Button>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

