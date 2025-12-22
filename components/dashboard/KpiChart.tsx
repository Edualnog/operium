"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  Cell,
} from "recharts"

interface KpiChartProps {
  title: string
  description?: string
  data: Array<Record<string, any>>
  type?: "bar" | "line" | "area"
  dataKey: string
  xAxisKey: string
  color?: string
  height?: number
}

import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"

export function KpiChart({
  title,
  description,
  data,
  type = "bar",
  dataKey,
  xAxisKey,
  color = "#3b82f6",
  height = 300,
}: KpiChartProps) {
  const { t } = useTranslation('common')
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const gridColor = isDark ? "#27272a" : "#e5e7eb" // zinc-800 : zinc-200
  const axisTextColor = isDark ? "#a1a1aa" : "#6b7280" // zinc-400 : zinc-500
  const axisLineColor = isDark ? "#3f3f46" : "#d1d5db" // zinc-700 : zinc-300
  const tooltipBg = isDark ? "rgba(24, 24, 27, 0.98)" : "rgba(255, 255, 255, 0.98)" // zinc-950 : white
  const tooltipBorder = isDark ? "#27272a" : "#e5e7eb" // zinc-800 : zinc-200
  const tooltipTextColor = isDark ? "#f4f4f5" : "#111827" // zinc-100 : gray-900
  const tooltipLabelColor = isDark ? "#a1a1aa" : "#6b7280" // zinc-400 : gray-500

  if (!data || !Array.isArray(data) || data.length === 0) {
    if (title) {
      return (
        <Card className="border border-slate-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <CardTitle className="text-base sm:text-lg font-bold text-[#37352f] dark:text-zinc-50">
              {title}
            </CardTitle>
            {description && (
              <p className="text-xs sm:text-sm text-zinc-600 mt-1 dark:text-zinc-400">{description}</p>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-zinc-500 text-center py-8 dark:text-zinc-500">
              {t('common.no_data')}
            </p>
          </CardContent>
        </Card>
      )
    }
    return (
      <p className="text-sm text-zinc-500 text-center py-8 dark:text-zinc-500">
        {t('common.no_data')}
      </p>
    )
  }

  // Para gráficos de barra, manter todos os dados (incluindo vazios) para sempre mostrar 10 barras
  const filteredData = Array.isArray(data)
    ? (type === "bar"
      ? data // Não filtrar - manter todos os dados para sempre mostrar 10 barras
      : data.filter((item: any) => item[xAxisKey] && item[xAxisKey] !== "" && item[dataKey] != null && item[dataKey] !== 0))
    : []

  const chartContent = (
    <div style={{ width: "100%", height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart
            data={filteredData}
            margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
            barCategoryGap="10%"
          >
            <defs>
              <linearGradient id={`gradient-${title || "chart"}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.9} />
                <stop offset="95%" stopColor={color} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12, fill: axisTextColor }}
              angle={-45}
              textAnchor="end"
              height={80}
              stroke={axisLineColor}
              tickFormatter={(value) => value || ""}
            />
            <YAxis tick={{ fontSize: 12, fill: axisTextColor }} stroke={axisLineColor} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                const item = payload[0]?.payload
                // Não mostrar tooltip para itens vazios
                if (!item || !item[xAxisKey] || item[xAxisKey] === "" || item[dataKey] === 0 || item[dataKey] == null) return null

                return (
                  <div style={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: "8px",
                    padding: "8px 12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}>
                    <p style={{ fontWeight: 600, marginBottom: "4px", color: tooltipTextColor }}>
                      {label}
                    </p>
                    <p style={{ color: tooltipLabelColor, fontSize: "14px" }}>
                      {payload[0].value}
                    </p>
                  </div>
                )
              }}
              cursor={{ fill: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)" }}
            />
            <Bar
              dataKey={dataKey}
              fill={`url(#gradient-${title || "chart"})`}
              radius={[8, 8, 0, 0]}
            >
              {filteredData.map((entry: any, index: number) => {
                const value = entry?.[dataKey]
                const name = entry?.[xAxisKey]
                // Se o valor for 0 ou o nome estiver vazio, usar transparente
                if (!name || name === "" || value === 0 || value == null) {
                  return <Cell key={`cell-${index}`} fill="transparent" />
                }
                return <Cell key={`cell-${index}`} fill={`url(#gradient-${title || "chart"})`} />
              })}
            </Bar>
          </BarChart>
        ) : type === "line" ? (
          <LineChart data={filteredData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12, fill: axisTextColor }}
              stroke={axisLineColor}
            />
            <YAxis tick={{ fontSize: 12, fill: axisTextColor }} stroke={axisLineColor} />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                color: tooltipTextColor,
              }}
              itemStyle={{ color: tooltipTextColor }}
              labelStyle={{ color: tooltipLabelColor }}
              cursor={{ stroke: color, strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, r: 4 }}
            />
          </LineChart>
        ) : (
          <AreaChart data={filteredData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id={`area-${title || "chart"}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12, fill: axisTextColor }}
              stroke={axisLineColor}
            />
            <YAxis tick={{ fontSize: 12, fill: axisTextColor }} stroke={axisLineColor} />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                color: tooltipTextColor,
              }}
              itemStyle={{ color: tooltipTextColor }}
              labelStyle={{ color: tooltipLabelColor }}
              cursor={{ stroke: color, strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={`url(#area-${title || "chart"})`}
              strokeWidth={2}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )

  if (title) {
    return (
      <Card className="border border-slate-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
          <CardTitle className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </CardTitle>
          {description && (
            <p className="text-xs sm:text-sm text-zinc-600 mt-1 dark:text-zinc-400">{description}</p>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          {chartContent}
        </CardContent>
      </Card>
    )
  }

  return chartContent
}
