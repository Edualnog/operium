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
import {
  Filter,
  X,
  Search,
  SortAsc,
  SortDesc,
  Sparkles,
} from "lucide-react"
import { useToast } from "@/components/ui/toast-context"

export interface FilterState {
  search: string
  tipo: "" | "ferramenta" | "epi" | "consumivel"
  estado: "" | "ok" | "danificada" | "em_conserto"
  categoria: string
  ordenarPor: "nome" | "quantidade_disponivel" | "quantidade_total" | "created_at"
  ordem: "asc" | "desc"
}

interface FerramentasFiltersProps {
  categorias: string[]
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  totalEncontrados: number
}

export function FerramentasFilters({
  categorias,
  filters,
  onFiltersChange,
  totalEncontrados,
}: FerramentasFiltersProps) {
  const { t } = useTranslation()
  const [showFilters, setShowFilters] = useState(false)
  const [isSearchingAI, setIsSearchingAI] = useState(false)
  const { toast } = useToast()

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleAISearch = async () => {
    if (!filters.search) return
    setIsSearchingAI(true)

    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: filters.search,
          categorias
        })
      })

      if (!response.ok) throw new Error("Erro na busca IA")

      const newFilters = await response.json()
      onFiltersChange({ ...filters, ...newFilters })
      toast.success("Filtros aplicados pela IA!")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao processar busca inteligente")
    } finally {
      setIsSearchingAI(false)
    }
  }



  const clearFilters = () => {
    onFiltersChange({
      search: "",
      tipo: "",
      estado: "",
      categoria: "",
      ordenarPor: "nome",
      ordem: "asc",
    })
  }

  const hasActiveFilters =
    filters.tipo !== "" || filters.estado !== "" || filters.categoria !== ""

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder={t("dashboard.ferramentas.filters.search_placeholder")}
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10 pr-10"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filters.search) {
                handleAISearch()
              }
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={handleAISearch}
            disabled={isSearchingAI || !filters.search}
            title="Busca Inteligente com IA"
          >
            {isSearchingAI ? (
              <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                {t("dashboard.ferramentas.filters.filters")}
                {hasActiveFilters && (
                  <span className="ml-2 h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                    {[filters.tipo, filters.estado, filters.categoria].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">{t("dashboard.ferramentas.filters.advanced_filters")}</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                      <X className="h-3 w-3 mr-1" />
                      {t("dashboard.ferramentas.filters.clear")}
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{t("dashboard.ferramentas.filters.type")}</Label>
                  <Select
                    value={filters.tipo === "" ? "all" : filters.tipo}
                    onValueChange={(value) => updateFilter("tipo", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("dashboard.ferramentas.filters.all_types")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("dashboard.ferramentas.filters.all_types")}</SelectItem>
                      <SelectItem value="ferramenta">{t("dashboard.ferramentas.filters.tool")}</SelectItem>
                      <SelectItem value="epi">{t("dashboard.ferramentas.filters.ppe")}</SelectItem>
                      <SelectItem value="consumivel">{t("dashboard.ferramentas.filters.consumable")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{t("dashboard.ferramentas.filters.state")}</Label>
                  <Select
                    value={filters.estado === "" ? "all" : filters.estado}
                    onValueChange={(value) => updateFilter("estado", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("dashboard.ferramentas.filters.all_states")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("dashboard.ferramentas.filters.all_states")}</SelectItem>
                      <SelectItem value="ok">{t("dashboard.ferramentas.filters.ok")}</SelectItem>
                      <SelectItem value="danificada">{t("dashboard.ferramentas.filters.damaged")}</SelectItem>
                      <SelectItem value="em_conserto">{t("dashboard.ferramentas.filters.in_repair")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{t("dashboard.ferramentas.filters.category")}</Label>
                  <Select
                    value={filters.categoria === "" ? "all" : filters.categoria}
                    onValueChange={(value) => updateFilter("categoria", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("dashboard.ferramentas.filters.all_categories")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("dashboard.ferramentas.filters.all_categories")}</SelectItem>
                      {categorias.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{t("dashboard.ferramentas.filters.sort_by")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={filters.ordenarPor}
                      onValueChange={(value: any) => updateFilter("ordenarPor", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nome">{t("dashboard.ferramentas.filters.name")}</SelectItem>
                        <SelectItem value="quantidade_disponivel">{t("dashboard.ferramentas.filters.available")}</SelectItem>
                        <SelectItem value="quantidade_total">{t("dashboard.ferramentas.filters.total_quantity")}</SelectItem>
                        <SelectItem value="created_at">{t("dashboard.ferramentas.filters.created_at")}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateFilter("ordem", filters.ordem === "asc" ? "desc" : "asc")}
                      className="w-full"
                    >
                      {filters.ordem === "asc" ? (
                        <SortAsc className="h-4 w-4 mr-2" />
                      ) : (
                        <SortDesc className="h-4 w-4 mr-2" />
                      )}
                      {filters.ordem === "asc" ? t("dashboard.ferramentas.filters.ascending") : t("dashboard.ferramentas.filters.descending")}
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">{t("dashboard.ferramentas.filters.active_filters")}</span>
          {filters.tipo && (
            <span className="text-xs bg-zinc-100 px-2 py-1 rounded-full flex items-center gap-1">
              {t("dashboard.ferramentas.filters.type_label")}: {filters.tipo}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("tipo", "")} />
            </span>
          )}
          {filters.estado && (
            <span className="text-xs bg-zinc-100 px-2 py-1 rounded-full flex items-center gap-1">
              {t("dashboard.ferramentas.filters.state_label")}: {filters.estado}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("estado", "")} />
            </span>
          )}
          {filters.categoria && (
            <span className="text-xs bg-zinc-100 px-2 py-1 rounded-full flex items-center gap-1">
              {t("dashboard.ferramentas.filters.category_label")}: {filters.categoria}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("categoria", "")} />
            </span>
          )}
        </div>
      )}

      {totalEncontrados > 0 && (
        <div className="text-sm text-zinc-600">
          {totalEncontrados} {totalEncontrados === 1 ? t("dashboard.ferramentas.filters.products_found", { count: totalEncontrados }) : t("dashboard.ferramentas.filters.products_found_plural", { count: totalEncontrados })}
        </div>
      )}
    </div>
  )
}
