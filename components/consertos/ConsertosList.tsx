"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { registrarRetornoConserto } from "@/lib/actions"
import { CheckCircle2, Clock, Wrench } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"

interface Conserto {
  id: string
  ferramenta_id: string
  descricao?: string
  status: "aguardando" | "em_andamento" | "concluido"
  custo?: number
  data_envio: string
  data_retorno?: string
  ferramentas: {
    id: string
    nome: string
    quantidade_disponivel: number
  }
}

export default function ConsertosList({
  consertos: initialConsertos,
}: {
  consertos: Conserto[]
}) {
  const [consertos, setConsertos] = useState(initialConsertos)
  const [retornoDialog, setRetornoDialog] = useState<Conserto | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const consertosAbertos = consertos.filter(
    (c) => c.status !== "concluido"
  )
  const consertosConcluidos = consertos.filter((c) => c.status === "concluido")

  const handleRetorno = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!retornoDialog) return

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const custo = Number(formData.get("custo"))
    const quantidade = Number(formData.get("quantidade")) || retornoDialog.ferramentas.quantidade_disponivel

    try {
      await registrarRetornoConserto(retornoDialog.id, custo, quantidade)
      setRetornoDialog(null)
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Erro ao registrar retorno")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "destructive" | "secondary"
    > = {
      aguardando: "secondary",
      em_andamento: "default",
      concluido: "default",
    }
    return variants[status] || "default"
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aguardando: "Aguardando",
      em_andamento: "Em Andamento",
      concluido: "Concluído",
    }
    return labels[status] || status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluido":
        return <CheckCircle2 className="h-4 w-4" />
      case "em_andamento":
        return <Wrench className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Consertos Abertos */}
      {consertosAbertos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Consertos em Aberto</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {consertosAbertos.map((conserto) => (
              <Card key={conserto.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">
                          {conserto.ferramentas.nome}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Enviado em{" "}
                          {format(
                            new Date(conserto.data_envio),
                            "dd/MM/yyyy",
                            { locale: ptBR }
                          )}
                        </p>
                      </div>
                      <Badge variant={getStatusBadge(conserto.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(conserto.status)}
                          {getStatusLabel(conserto.status)}
                        </span>
                      </Badge>
                    </div>

                    {conserto.descricao && (
                      <p className="text-sm text-muted-foreground">
                        {conserto.descricao}
                      </p>
                    )}

                    {conserto.status !== "concluido" && (
                      <Button
                        className="w-full"
                        onClick={() => setRetornoDialog(conserto)}
                      >
                        Registrar Retorno
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Consertos Concluídos */}
      {consertosConcluidos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Consertos Concluídos</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {consertosConcluidos.map((conserto) => (
              <Card key={conserto.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">
                          {conserto.ferramentas.nome}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Enviado em{" "}
                          {format(
                            new Date(conserto.data_envio),
                            "dd/MM/yyyy",
                            { locale: ptBR }
                          )}
                        </p>
                        {conserto.data_retorno && (
                          <p className="text-sm text-muted-foreground">
                            Retornou em{" "}
                            {format(
                              new Date(conserto.data_retorno),
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )}
                          </p>
                        )}
                      </div>
                      <Badge variant={getStatusBadge(conserto.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(conserto.status)}
                          {getStatusLabel(conserto.status)}
                        </span>
                      </Badge>
                    </div>

                    {conserto.descricao && (
                      <p className="text-sm text-muted-foreground">
                        {conserto.descricao}
                      </p>
                    )}

                    {conserto.custo && (
                      <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm font-medium">Custo:</span>
                        <span className="text-sm font-semibold">
                          R$ {conserto.custo.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {consertos.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum conserto registrado
        </div>
      )}

      {/* Dialog de Retorno */}
      {retornoDialog && (
        <Dialog open={!!retornoDialog} onOpenChange={() => setRetornoDialog(null)}>
          <DialogContent>
            <form onSubmit={handleRetorno}>
              <DialogHeader>
                <DialogTitle>Registrar Retorno de Conserto</DialogTitle>
                <DialogDescription>
                  Ferramenta: {retornoDialog.ferramentas.nome}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="custo">Custo do Conserto (R$)</Label>
                  <Input
                    id="custo"
                    name="custo"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantidade">Quantidade Retornada</Label>
                  <Input
                    id="quantidade"
                    name="quantidade"
                    type="number"
                    min="1"
                    defaultValue={retornoDialog.ferramentas.quantidade_disponivel}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRetornoDialog(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Processando..." : "Confirmar Retorno"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

