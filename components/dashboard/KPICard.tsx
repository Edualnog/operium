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
  const Icon = iconMap[iconName]

  const chartData = useMemo(() => {
    if (!miniChart) return []
    return miniChart.data.map((val, index) => ({
      value: val,
      index,
    }))
  }, [miniChart])

  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown

  return (
    <Card className="relative overflow-hidden border border-zinc-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300 group dark:bg-zinc-900 dark:border-zinc-800">
      {/* Gradiente sutil no topo */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <CardContent className="p-4 sm:p-5 lg:p-5 xl:p-6">
        <div className="flex flex-col gap-3.5">
          {/* Header com ícone e título */}
          <div className="flex items-start gap-3">
            <div className={`p-2.5 sm:p-3 rounded-xl shadow-sm flex-shrink-0 ${variant === "destructive"
                ? "bg-gradient-to-br from-red-50 to-red-100 text-red-600 dark:from-red-900/20 dark:to-red-900/10 dark:text-red-400"
                : "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 dark:from-blue-900/20 dark:to-blue-900/10 dark:text-blue-400"
              }`}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-zinc-900 leading-snug flex-1 min-w-0 dark:text-zinc-50">
              {title}
            </h2>
          </div>

          {/* Valor e trend */}
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            </h3>
            {trend && (
              <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${trend.isPositive
                  ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
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

