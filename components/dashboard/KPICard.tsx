"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Wrench,
  AlertTriangle,
  Activity,
  Zap,
  ShoppingCart,
  Clock,
  Shield,
  Calendar,
  AlertCircle,
  Target,
} from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"

const iconMap = {
  Package,
  Users,
  Wrench,
  AlertTriangle,
  Activity,
  Zap,
  ShoppingCart,
  TrendingUp,
  Clock,
  Shield,
  Calendar,
  AlertCircle,
  Target,
} as const

type IconName = keyof typeof iconMap

interface KPICardProps {
  title: string
  value: string | number
  description: string
  iconName: IconName
  trend?: {
    value: number
    isPositive: boolean
  }
  miniChart?: {
    data: number[]
    type: "area" | "bar"
    color: string
  }
  variant?: "default" | "destructive"
}

export function KPICard({
  title,
  value,
  description,
  iconName,
  trend,
  miniChart,
  variant = "default",
}: KPICardProps) {
  const { i18n } = useTranslation()
  const Icon = iconMap[iconName]

  const chartData = useMemo(() => {
    if (!miniChart || !Array.isArray(miniChart.data)) return []
    return miniChart.data.map((val, index) => ({
      value: val,
      index,
    }))
  }, [miniChart])

  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown

  return (
    <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-sm transition-all duration-300 group dark:bg-zinc-900 dark:border-zinc-800">

      <CardContent className="p-4 sm:p-5 lg:p-5 xl:p-6">
        <div className="flex flex-col gap-3.5">
          {/* Header com ícone e título */}
          <div className="flex items-start gap-3">
            <Icon className="h-5 w-5 text-zinc-400 mt-0.5 sm:mt-1 dark:text-zinc-500" />
            <h2 className="text-sm sm:text-base lg:text-lg font-bold text-[#37352f] leading-snug flex-1 min-w-0 dark:text-zinc-50">
              {title}
            </h2>
          </div>

          {/* Valor e trend */}
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#37352f] tracking-tight dark:text-zinc-50">
              {typeof value === "number" ? value.toLocaleString(i18n.language) : value}
            </h3>
            {trend && (
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${trend.isPositive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                }`}>
                <TrendIcon className="h-3 w-3" />
                <span>{Math.abs(trend.value).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* Descrição e mini gráfico lado a lado */}
          <div className="flex items-end justify-between gap-3 mt-auto">
            <p className="text-xs sm:text-sm text-zinc-500 flex-1 leading-relaxed dark:text-zinc-400">{description}</p>

            {/* Mini gráfico */}
            {miniChart && (
              <div className="w-20 sm:w-24 h-12 sm:h-14 flex-shrink-0 hidden sm:block">
                <ResponsiveContainer width="100%" height="100%">
                  {miniChart.type === "area" ? (
                    <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`gradient-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={miniChart.color} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={miniChart.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={miniChart.color}
                        fill={`url(#gradient-${title.replace(/\s/g, "")})`}
                        strokeWidth={2}
                        dot={false}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Bar
                        dataKey="value"
                        fill={miniChart.color}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

