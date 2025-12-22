"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { ptBR, enUS } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { useTranslation } from "react-i18next"

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
  showViewMore?: boolean
  viewMoreLink?: string
}

export function KpiList({
  title,
  description,
  items,
  columns,
  emptyMessage = "Nenhum item encontrado",
  maxItems = 10,
  showViewMore = false,
  viewMoreLink,
}: KpiListProps) {
  const router = useRouter()
  const { t, i18n } = useTranslation('common')
  const safeItems = Array.isArray(items) ? items : []
  const displayItems = safeItems.slice(0, maxItems)
  const hasMoreItems = safeItems.length > maxItems

  return (
    <Card className="border border-slate-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
        <CardTitle className="text-base sm:text-lg font-bold text-[#37352f] dark:text-zinc-50">
          {title}
        </CardTitle>
        {description && (
          <p className="text-xs sm:text-sm text-[#37352f]/60 mt-1 dark:text-zinc-400">{description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {displayItems.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8 dark:text-zinc-500">{emptyMessage === "Nenhum item encontrado" ? t('common.no_items_found') : emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {displayItems.map((item, index) => (
              <div
                key={item.id || index}
                className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors dark:border-zinc-800 dark:hover:bg-zinc-800/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                      #{index + 1}
                    </span>
                    <h4 className="text-sm font-semibold text-zinc-900 truncate dark:text-zinc-100">
                      {item.nome}
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {columns.map((col) => (
                      <div key={col.key} className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-500">{col.label}:</span>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
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
        {hasMoreItems && !showViewMore && (
          <p className="text-xs text-zinc-500 text-center mt-4 dark:text-zinc-500">
            {t('common.showing_items', { count: maxItems, total: items.length })}
          </p>
        )}
        {showViewMore && hasMoreItems && viewMoreLink && (
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              className="w-full dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => router.push(viewMoreLink)}
            >
              {t('common.view_more')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

