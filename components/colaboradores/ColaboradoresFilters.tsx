"use client"

import { useState } from "react"
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
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import "react-day-picker/dist/style.css"
import { useTranslation } from "react-i18next"

export interface FilterState {
  search: string
  cargo: string
  dataAdmissaoInicio: Date | null
  dataAdmissaoFim: Date | null
  ordenarPor: "nome" | "cargo" | "data_admissao" | "created_at"
  ordem: "asc" | "desc"
}

interface ColaboradoresFiltersProps {
  cargos: string[]
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  totalEncontrados: number
}

export function ColaboradoresFilters({
  cargos,
  filters,
  onFiltersChange,
  totalEncontrados,
}: ColaboradoresFiltersProps) {
  const { t } = useTranslation()
  const [showFilters, setShowFilters] = useState(false)

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      cargo: "",
      dataAdmissaoInicio: null,
      dataAdmissaoFim: null,
      ordenarPor: "nome",
      ordem: "asc",
    })
  }

  const hasActiveFilters =
    filters.cargo !== "" ||
    filters.dataAdmissaoInicio !== null ||
    filters.dataAdmissaoFim !== null

  return (
    <div className="space-y-4">
      {/* Barra de busca principal */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder={t("dashboard.colaboradores.filters.search_placeholder")}
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                {t("dashboard.colaboradores.filters.advanced_filters")}
                {hasActiveFilters && (
                  <span className="ml-2 h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                    {[
                      filters.cargo,
                      filters.dataAdmissaoInicio,
                      filters.dataAdmissaoFim,
                    ].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">{t("dashboard.colaboradores.filters.advanced_filters")}</h4>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-7 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t("dashboard.colaboradores.filters.clear")}
                    </Button>
                  )}
                </div>

                {/* Filtro por Cargo */}
                <div className="space-y-2">
                  <Label className="text-xs">{t("dashboard.colaboradores.filters.role")}</Label>
                  <Select
                    value={filters.cargo === "" ? "all" : filters.cargo}
                    onValueChange={(value) => updateFilter("cargo", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("dashboard.colaboradores.filters.all_roles")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("dashboard.colaboradores.filters.all_roles")}</SelectItem>
                      {cargos.map((cargo) => (
                        <SelectItem key={cargo} value={cargo}>
                          {cargo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Data de Admissão */}
                <div className="space-y-2">
                  <Label className="text-xs">{t("dashboard.colaboradores.form.admission_date")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filters.dataAdmissaoInicio && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dataAdmissaoInicio ? (
                            format(filters.dataAdmissaoInicio, "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                          ) : (
                            <span>{t("dashboard.colaboradores.filters.from")}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dataAdmissaoInicio || undefined}
                          onSelect={(date) =>
                            updateFilter("dataAdmissaoInicio", date)
                          }
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filters.dataAdmissaoFim && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dataAdmissaoFim ? (
                            format(filters.dataAdmissaoFim, "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                          ) : (
                            <span>{t("dashboard.colaboradores.filters.to")}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dataAdmissaoFim || undefined}
                          onSelect={(date) =>
                            updateFilter("dataAdmissaoFim", date)
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Ordenação */}
                <div className="space-y-2">
                  <Label className="text-xs">{t("dashboard.colaboradores.filters.sort_by")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={filters.ordenarPor}
                      onValueChange={(value: any) =>
                        updateFilter("ordenarPor", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nome">{t("dashboard.colaboradores.table.name")}</SelectItem>
                        <SelectItem value="cargo">{t("dashboard.colaboradores.filters.role")}</SelectItem>
                        <SelectItem value="data_admissao">
                          {t("dashboard.colaboradores.form.admission_date")}
                        </SelectItem>
                        <SelectItem value="created_at">{t("dashboard.colaboradores.filters.created_at")}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateFilter(
                          "ordem",
                          filters.ordem === "asc" ? "desc" : "asc"
                        )
                      }
                      className="w-full"
                    >
                      {filters.ordem === "asc" ? (
                        <SortAsc className="h-4 w-4 mr-2" />
                      ) : (
                        <SortDesc className="h-4 w-4 mr-2" />
                      )}
                      {filters.ordem === "asc" ? t("dashboard.colaboradores.filters.asc") : t("dashboard.colaboradores.filters.desc")}
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

        </div>
      </div>

      {/* Badges de filtros ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">{t("dashboard.colaboradores.filters.active_filters")}</span>
          {filters.cargo && (
            <Badge variant="secondary" className="gap-1">
              {t("dashboard.colaboradores.filters.role")}: {filters.cargo}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("cargo", "")}
              />
            </Badge>
          )}
          {filters.dataAdmissaoInicio && (
            <Badge variant="secondary" className="gap-1">
              {t("dashboard.colaboradores.filters.from")}: {format(filters.dataAdmissaoInicio, "dd/MM/yyyy", { locale: ptBR })}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("dataAdmissaoInicio", null)}
              />
            </Badge>
          )}
          {filters.dataAdmissaoFim && (
            <Badge variant="secondary" className="gap-1">
              {t("dashboard.colaboradores.filters.to")}: {format(filters.dataAdmissaoFim, "dd/MM/yyyy", { locale: ptBR })}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("dataAdmissaoFim", null)}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Contador de resultados */}
      {totalEncontrados > 0 && (
        <div className="text-sm text-zinc-600">
          <span>
            {t("dashboard.colaboradores.filters.found_count_plural", { count: totalEncontrados })}
          </span>
        </div>
      )}
    </div>
  )
}
