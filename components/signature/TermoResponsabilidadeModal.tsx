"use client"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import SignaturePad, { SignaturePadRef } from "./SignaturePad"
import { FileText, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClientComponentClient } from "@/lib/supabase-client"

interface ItemMovimentacao {
  id: string
  nome: string
  quantidade: number
  tipo_item?: string
}

interface TermoResponsabilidadeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  colaborador: {
    id: string
    nome: string
    cargo?: string
    cpf?: string
  }
  itens: ItemMovimentacao[]
  tipo: "retirada" | "devolucao"
  onSuccess?: (termoId: string, pdfUrl: string) => void
  movimentacaoId?: string
  initialSignature?: string | null
}

export default function TermoResponsabilidadeModal({
  open,
  onOpenChange,
  colaborador,
  itens,
  tipo,
  onSuccess,
  movimentacaoId,
  initialSignature,
}: TermoResponsabilidadeModalProps) {
  const signaturePadRef = useRef<SignaturePadRef>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const supabase = createClientComponentClient()
  const dataAtual = new Date()

  // Carregar assinatura inicial se existir
  useEffect(() => {
    if (open && initialSignature) {
      // Pequeno delay para garantir que o canvas foi montado
      setTimeout(() => {
        if (signaturePadRef.current) {
          signaturePadRef.current.fromDataURL(initialSignature)
          setHasSignature(true)
        }
      }, 500)
    }
  }, [open, initialSignature])

  const handleClear = () => {
    signaturePadRef.current?.clear()
    setHasSignature(false)
  }

  const handleSignatureChange = (isEmpty: boolean) => {
    setHasSignature(!isEmpty)
  }

  const generatePDF = async () => {
    if (!hasSignature || signaturePadRef.current?.isEmpty()) {
      setError("Por favor, assine o termo antes de confirmar.")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Obter assinatura como imagem
      const signatureDataUrl = signaturePadRef.current?.toDataURL() || ""

      // Importar jsPDF dinamicamente
      const { default: jsPDF } = await import("jspdf")

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      let yPos = 20

      // Cabeçalho
      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      doc.text("TERMO DE RESPONSABILIDADE", pageWidth / 2, yPos, { align: "center" })
      yPos += 8

      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(tipo === "retirada" ? "Entrega de Equipamentos" : "Devolução de Equipamentos", pageWidth / 2, yPos, { align: "center" })
      yPos += 15

      // Linha divisória
      doc.setDrawColor(200)
      doc.line(20, yPos, pageWidth - 20, yPos)
      yPos += 10

      // Dados do colaborador
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("DADOS DO COLABORADOR", 20, yPos)
      yPos += 8

      doc.setFont("helvetica", "normal")
      doc.text(`Nome: ${colaborador.nome}`, 20, yPos)
      yPos += 6
      if (colaborador.cargo) {
        doc.text(`Cargo: ${colaborador.cargo}`, 20, yPos)
        yPos += 6
      }
      if (colaborador.cpf) {
        doc.text(`CPF: ${colaborador.cpf}`, 20, yPos)
        yPos += 6
      }
      doc.text(`Data: ${format(dataAtual, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`, 20, yPos)
      yPos += 12

      // Itens
      doc.setFont("helvetica", "bold")
      doc.text(tipo === "retirada" ? "EQUIPAMENTOS RECEBIDOS" : "EQUIPAMENTOS DEVOLVIDOS", 20, yPos)
      yPos += 8

      doc.setFont("helvetica", "normal")
      itens.forEach((item, index) => {
        const tipoLabel = item.tipo_item === "epi" ? " (EPI)" : item.tipo_item === "ferramenta" ? " (Ferramenta)" : ""
        doc.text(`${index + 1}. ${item.nome}${tipoLabel} - Quantidade: ${item.quantidade}`, 25, yPos)
        yPos += 6
      })
      yPos += 8

      // Termo
      doc.setFont("helvetica", "bold")
      doc.text("DECLARAÇÃO", 20, yPos)
      yPos += 8

      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)

      if (tipo === "retirada") {
        const termoTexto = [
          `Eu, ${colaborador.nome}, declaro ter recebido os equipamentos acima listados`,
          "em perfeito estado de conservação e funcionamento, comprometendo-me a:",
          "",
          "• Utilizar os equipamentos exclusivamente para as atividades profissionais;",
          "• Zelar pela conservação e guarda adequada dos equipamentos;",
          "• Comunicar imediatamente qualquer dano, defeito ou extravio;",
          "• Devolver os equipamentos ao término do uso ou quando solicitado;",
          "• Responsabilizar-me por danos causados por mau uso ou negligência.",
          "",
          "Declaro estar ciente de que o não cumprimento destas obrigações poderá",
          "acarretar as penalidades previstas em lei e no regulamento interno.",
        ]

        termoTexto.forEach((linha) => {
          doc.text(linha, 20, yPos)
          yPos += 5
        })
      } else {
        const termoTexto = [
          `Eu, ${colaborador.nome}, declaro ter devolvido os equipamentos acima`,
          "listados em conformidade com as condições de recebimento.",
        ]

        termoTexto.forEach((linha) => {
          doc.text(linha, 20, yPos)
          yPos += 5
        })
      }

      yPos += 15

      // Assinatura
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("ASSINATURA DO COLABORADOR", 20, yPos)
      yPos += 5

      // Adicionar imagem da assinatura
      if (signatureDataUrl) {
        doc.addImage(signatureDataUrl, "PNG", 20, yPos, 80, 32)
        yPos += 35
      }

      // Linha para assinatura
      doc.setDrawColor(100)
      doc.line(20, yPos, 100, yPos)
      yPos += 5
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(colaborador.nome, 20, yPos)
      yPos += 4
      doc.text(format(dataAtual, "dd/MM/yyyy HH:mm"), 20, yPos)

      // Rodapé
      doc.setFontSize(8)
      doc.setTextColor(128)
      doc.text(
        "Documento gerado eletronicamente pelo sistema Almox Fácil",
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      )
      doc.text(
        `ID do Termo: ${movimentacaoId || "N/A"} | ${format(dataAtual, "dd/MM/yyyy HH:mm:ss")}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      )

      // Gerar blob do PDF
      const pdfBlob = doc.output("blob")

      // Upload para Supabase Storage
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      const fileName = `termo_${colaborador.id}_${format(dataAtual, "yyyyMMdd_HHmmss")}.pdf`
      const filePath = `termos/${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        })

      // Se o bucket não existir, criar localmente e baixar
      let publicUrl = ""
      if (uploadError) {
        console.warn("Erro ao fazer upload (bucket pode não existir):", uploadError)
        // Baixar diretamente sem salvar no storage
        doc.save(`Termo_${colaborador.nome.replace(/\s+/g, "_")}_${format(dataAtual, "yyyyMMdd")}.pdf`)
        publicUrl = "local"
      } else {
        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from("documentos")
          .getPublicUrl(filePath)
        publicUrl = urlData.publicUrl

        // Baixar também localmente
        doc.save(`Termo_${colaborador.nome.replace(/\s+/g, "_")}_${format(dataAtual, "yyyyMMdd")}.pdf`)
      }

      // Salvar registro do termo no banco
      const { error: dbError } = await supabase.from("termos_responsabilidade").insert({
        profile_id: user.id,
        colaborador_id: colaborador.id,
        movimentacao_id: movimentacaoId || null, // Converter string vazia para null
        tipo,
        itens: itens.map((i) => ({ id: i.id, nome: i.nome, quantidade: i.quantidade })),
        assinatura_url: publicUrl !== "local" ? publicUrl : null,
        assinatura_base64: signatureDataUrl, // Salvar assinatura em base64 para visualização rápida
        pdf_url: publicUrl !== "local" ? publicUrl : null,
        data_assinatura: dataAtual.toISOString(),
      })

      if (dbError) {
        console.error("Erro ao salvar no banco:", dbError)
        // Não lançar erro fatal para não impedir o download do PDF, mas avisar
        setError(`O PDF foi gerado, mas houve um erro ao salvar no sistema: ${dbError.message}. Verifique se a tabela 'termos_responsabilidade' existe.`)
        // Manter success=true para permitir fechar, mas mostrar o erro
      } else {
        setSuccess(true)
      }

      setPdfUrl(publicUrl)
      onSuccess?.(movimentacaoId || "", publicUrl)
    } catch (err: any) {
      console.error("Erro ao gerar termo:", err)
      setError(err.message || "Erro ao gerar o termo. Tente novamente.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClose = () => {
    setSuccess(false)
    setError(null)
    setPdfUrl(null)
    setHasSignature(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6" aria-describedby="termo-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Termo de Responsabilidade
          </DialogTitle>
          <DialogDescription id="termo-description">
            {tipo === "retirada"
              ? "O colaborador deve assinar para confirmar o recebimento dos equipamentos"
              : "O colaborador deve assinar para confirmar a devolução dos equipamentos"}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">Termo Assinado com Sucesso!</h3>
              <p className="text-sm text-zinc-600 mt-1">
                O PDF foi gerado e baixado automaticamente.
              </p>
            </div>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        ) : (
          <>
            {/* Dados do colaborador */}
            <div className="bg-zinc-50 rounded-lg p-3 sm:p-4 space-y-2">
              <h4 className="font-medium text-zinc-900 text-sm sm:text-base">Colaborador</h4>
              <div className="text-xs sm:text-sm text-zinc-600 space-y-1">
                <p><strong>Nome:</strong> {colaborador.nome}</p>
                {colaborador.cargo && <p><strong>Cargo:</strong> {colaborador.cargo}</p>}
                {colaborador.cpf && <p><strong>CPF:</strong> {colaborador.cpf}</p>}
              </div>
            </div>

            {/* Itens */}
            <div className="space-y-2">
              <h4 className="font-medium text-zinc-900 text-sm sm:text-base">
                {tipo === "retirada" ? "Equipamentos a Receber" : "Equipamentos a Devolver"}
              </h4>
              <div className="bg-zinc-50 rounded-lg p-2 sm:p-3 space-y-2">
                {itens.map((item, index) => (
                  <div key={item.id || index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 text-xs sm:text-sm py-1 border-b border-zinc-200 last:border-0">
                    <span className="text-zinc-700 font-medium">{item.nome}</span>
                    <div className="flex items-center gap-2">
                      {item.tipo_item && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          {item.tipo_item === "epi" ? "EPI" : item.tipo_item === "ferramenta" ? "Ferramenta" : item.tipo_item}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] sm:text-xs">{item.quantidade}x</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Termo resumido */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-blue-900">
              <p className="font-medium mb-2">Ao assinar, o colaborador declara:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                {tipo === "retirada" ? (
                  <>
                    <li>Receber os equipamentos em perfeito estado</li>
                    <li>Comprometer-se a usar corretamente e conservar</li>
                    <li>Devolver ao término do uso ou quando solicitado</li>
                    <li>Responsabilizar-se por danos por mau uso</li>
                  </>
                ) : (
                  <>
                    <li>Devolver os equipamentos conforme recebidos</li>
                    <li>Informar qualquer dano ou problema ocorrido</li>
                  </>
                )}
              </ul>
            </div>

            {/* Área de assinatura */}
            <div className="space-y-2">
              <h4 className="font-medium text-zinc-900 text-sm sm:text-base">Assinatura do Colaborador</h4>
              <p className="text-xs text-zinc-500 sm:hidden">Use o dedo para assinar abaixo</p>
              <SignaturePad
                ref={signaturePadRef}
                width={600}
                height={200}
                onChange={handleSignatureChange}
                className="touch-manipulation"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isGenerating}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                onClick={generatePDF}
                disabled={!hasSignature || isGenerating}
                className="gap-2 w-full sm:w-auto min-h-[44px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Confirmar e Gerar PDF</span>
                    <span className="sm:hidden">Gerar PDF</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

