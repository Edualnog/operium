"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import {
  Filter,
  X,
  Calendar as CalendarIcon,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import "react-day-picker/dist/style.css"

export interface FilterState {
  tipo: "todos" | "entrada" | "retirada" | "devolucao" | "conserto"
  produtoId: string
  colaboradorId: string
  dataInicio: Date | null
  dataFim: Date | null
}

interface MovimentacoesFiltersProps {
  ferramentas: Array<{ id: string; nome: string }>
  colaboradores: Array<{ id: string; nome: string }>
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  totalEncontrados: number
}

export function MovimentacoesFilters({
  ferramentas,
  colaboradores,
  filters,
  onFiltersChange,
  totalEncontrados,
}: MovimentacoesFiltersProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const hasActiveFilters =
    filters.tipo !== "todos" ||
    filters.produtoId !== "" ||
    filters.colaboradorId !== "" ||
    filters.dataInicio !== null ||
    filters.dataFim !== null

  const clearFilters = () => {
    onFiltersChange({
      tipo: "todos",
      produtoId: "",
      colaboradorId: "",
      dataInicio: null,
      dataFim: null,
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                {t("dashboard.movimentacoes.filters.filters")}
                {hasActiveFilters && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {[
                      filters.tipo !== "todos" ? 1 : 0,
                      filters.produtoId ? 1 : 0,
                      filters.colaboradorId ? 1 : 0,
                      filters.dataInicio ? 1 : 0,
                      filters.dataFim ? 1 : 0,
                    ].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">{t("dashboard.movimentacoes.filters.filters")}</h4>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-7 text-xs"
                    >
                      {t("dashboard.movimentacoes.filters.clear")}
                    </Button>
                  )}
                </div>

                {/* Tipo de Movimentação */}
                <div className="space-y-2">
                  <Label className="text-xs">{t("dashboard.movimentacoes.filters.movement_type")}</Label>
                  <Select
                    value={filters.tipo}
                    onValueChange={(value: any) => updateFilter("tipo", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">{t("dashboard.movimentacoes.filters.all_types")}</SelectItem>
                      <SelectItem value="entrada">{t("dashboard.movimentacoes.filters.entry")}</SelectItem>
                      <SelectItem value="retirada">{t("dashboard.movimentacoes.filters.withdrawal")}</SelectItem>
                      <SelectItem value="devolucao">{t("dashboard.movimentacoes.filters.return")}</SelectItem>
                      <SelectItem value="conserto">{t("dashboard.movimentacoes.filters.repair")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Produto */}
                <div className="space-y-2">
                  <Label className="text-xs">{t("dashboard.movimentacoes.filters.product")}</Label>
                  <Select
                    value={filters.produtoId || "todos"}
                    onValueChange={(value) =>
                      updateFilter("produtoId", value === "todos" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">{t("dashboard.movimentacoes.filters.all_products")}</SelectItem>
                      {ferramentas.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Colaborador */}
                <div className="space-y-2">
                  <Label className="text-xs">{t("dashboard.movimentacoes.filters.collaborator")}</Label>
                  <Select
                    value={filters.colaboradorId || "todos"}
                    onValueChange={(value) =>
                      updateFilter(
                        "colaboradorId",
                        value === "todos" ? "" : value
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">{t("dashboard.movimentacoes.filters.all_collaborators")}</SelectItem>
                      {colaboradores.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data Início */}
                <div className="space-y-2">
                  <Label className="text-xs">{t("dashboard.movimentacoes.filters.start_date")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dataInicio && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dataInicio ? (
                          format(filters.dataInicio, "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        ) : (
                          <span>{t("dashboard.movimentacoes.filters.select")}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dataInicio || undefined}
                        onSelect={(date) => updateFilter("dataInicio", date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Data Fim */}
                <div className="space-y-2">
                  <Label className="text-xs">{t("dashboard.movimentacoes.filters.end_date")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dataFim && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dataFim ? (
                          format(filters.dataFim, "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        ) : (
                          <span>{t("dashboard.movimentacoes.filters.select")}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dataFim || undefined}
                        onSelect={(date) => updateFilter("dataFim", date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="text-sm text-zinc-600">
          {t("dashboard.movimentacoes.filters.movements_found", { count: totalEncontrados })}
        </div>
      </div>

      {/* Badges de filtros ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">{t("dashboard.movimentacoes.filters.active_filters")}</span>
          {filters.tipo !== "todos" && (
            <Badge variant="secondary" className="gap-1">
              {t("dashboard.movimentacoes.filters.type")}: {filters.tipo}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("tipo", "todos")}
              />
            </Badge>
          )}
          {filters.produtoId && (
            <Badge variant="secondary" className="gap-1">
              {t("dashboard.movimentacoes.filters.product")}: {ferramentas.find((f) => f.id === filters.produtoId)?.nome}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("produtoId", "")}
              />
            </Badge>
          )}
          {filters.colaboradorId && (
            <Badge variant="secondary" className="gap-1">
              {t("dashboard.movimentacoes.filters.collaborator")}: {colaboradores.find((c) => c.id === filters.colaboradorId)?.nome}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("colaboradorId", "")}
              />
            </Badge>
          )}
          {filters.dataInicio && (
            <Badge variant="secondary" className="gap-1">
              {t("dashboard.movimentacoes.filters.from")}: {format(filters.dataInicio, "dd/MM/yyyy", { locale: i18n.language?.startsWith("pt") ? ptBR : undefined })}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("dataInicio", null)}
              />
            </Badge>
          )}
          {filters.dataFim && (
            <Badge variant="secondary" className="gap-1">
              {t("dashboard.movimentacoes.filters.to")}: {format(filters.dataFim, "dd/MM/yyyy", { locale: i18n.language?.startsWith("pt") ? ptBR : undefined })}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("dataFim", null)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

