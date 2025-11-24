"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface KpiListProps {
  title: string
  description?: string
  items: Array<{
    id: string
    nome: string
    [key: string]: any
  }>
  columns: Array<{
    key: string
    label: string
    render?: (item: any) => React.ReactNode
  }>
  emptyMessage?: string
  maxItems?: number
}

export function KpiList({
  title,
  description,
  items,
  columns,
  emptyMessage = "Nenhum item encontrado",
  maxItems = 10,
}: KpiListProps) {
  const displayItems = items.slice(0, maxItems)

  return (
    <Card className="border border-zinc-200 bg-white shadow-sm">
      <CardHeader className="pb-3 border-b border-zinc-100">
        <CardTitle className="text-base sm:text-lg font-semibold text-zinc-900">
          {title}
        </CardTitle>
        {description && (
          <p className="text-xs sm:text-sm text-zinc-600 mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {displayItems.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {displayItems.map((item, index) => (
              <div
                key={item.id || index}
                className="flex items-center justify-between gap-4 p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-zinc-400">
                      #{index + 1}
                    </span>
                    <h4 className="text-sm font-semibold text-zinc-900 truncate">
                      {item.nome}
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {columns.map((col) => (
                      <div key={col.key} className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-500">{col.label}:</span>
                        <span className="text-xs font-medium text-zinc-700">
                          {col.render
                            ? col.render(item)
                            : String(item[col.key] || "-")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {items.length > maxItems && (
          <p className="text-xs text-zinc-500 text-center mt-4">
            Mostrando {maxItems} de {items.length} itens
          </p>
        )}
      </CardContent>
    </Card>
  )
}

