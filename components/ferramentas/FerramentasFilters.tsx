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
import {
  Filter,
  X,
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react"

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
  const [showFilters, setShowFilters] = useState(false)

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
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
            placeholder="Buscar por nome, código ou categoria..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
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
                  <h4 className="font-semibold text-sm">Filtros avançados</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                      <X className="h-3 w-3 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={filters.tipo === "" ? "all" : filters.tipo}
                    onValueChange={(value) => updateFilter("tipo", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ferramenta">Ferramenta</SelectItem>
                      <SelectItem value="epi">EPI</SelectItem>
                      <SelectItem value="consumivel">Consumível</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Estado</Label>
                  <Select
                    value={filters.estado === "" ? "all" : filters.estado}
                    onValueChange={(value) => updateFilter("estado", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ok">OK</SelectItem>
                      <SelectItem value="danificada">Danificada</SelectItem>
                      <SelectItem value="em_conserto">Em Conserto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Categoria</Label>
                  <Select
                    value={filters.categoria === "" ? "all" : filters.categoria}
                    onValueChange={(value) => updateFilter("categoria", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categorias.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Ordenar por</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={filters.ordenarPor}
                      onValueChange={(value: any) => updateFilter("ordenarPor", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nome">Nome</SelectItem>
                        <SelectItem value="quantidade_disponivel">Disponível</SelectItem>
                        <SelectItem value="quantidade_total">Quantidade Total</SelectItem>
                        <SelectItem value="created_at">Data Cadastro</SelectItem>
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
                      {filters.ordem === "asc" ? "Crescente" : "Decrescente"}
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
          <span className="text-xs text-zinc-500">Filtros ativos:</span>
          {filters.tipo && (
            <span className="text-xs bg-zinc-100 px-2 py-1 rounded-full flex items-center gap-1">
              Tipo: {filters.tipo}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("tipo", "")} />
            </span>
          )}
          {filters.estado && (
            <span className="text-xs bg-zinc-100 px-2 py-1 rounded-full flex items-center gap-1">
              Estado: {filters.estado}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("estado", "")} />
            </span>
          )}
          {filters.categoria && (
            <span className="text-xs bg-zinc-100 px-2 py-1 rounded-full flex items-center gap-1">
              Categoria: {filters.categoria}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("categoria", "")} />
            </span>
          )}
        </div>
      )}

      {totalEncontrados > 0 && (
        <div className="text-sm text-zinc-600">
          {totalEncontrados} produto{totalEncontrados !== 1 ? "s" : ""} encontrado
          {totalEncontrados !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  )
}
