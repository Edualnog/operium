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
  if (!data || data.length === 0) {
    if (title) {
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
            <p className="text-sm text-zinc-500 text-center py-8">
              Nenhum dado disponível
            </p>
          </CardContent>
        </Card>
      )
    }
    return (
      <p className="text-sm text-zinc-500 text-center py-8">
        Nenhum dado disponível
      </p>
    )
  }

  const chartContent = (
    <div style={{ width: "100%", height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart 
            data={data} 
            margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
            barCategoryGap="10%"
          >
            <defs>
              <linearGradient id={`gradient-${title || "chart"}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.9} />
                <stop offset="95%" stopColor={color} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              angle={-45}
              textAnchor="end"
              height={80}
              stroke="#d1d5db"
              tickFormatter={(value) => value || ""}
            />
            <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} stroke="#d1d5db" />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                const item = payload[0]?.payload
                if (!item || !item[xAxisKey] || item[xAxisKey] === "" || item[dataKey] === 0) return null
                
                return (
                  <div style={{
                    backgroundColor: "rgba(255, 255, 255, 0.98)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}>
                    <p style={{ fontWeight: 600, marginBottom: "4px", color: "#111827" }}>
                      {label}
                    </p>
                    <p style={{ color: "#6b7280", fontSize: "14px" }}>
                      {payload[0].value}
                    </p>
                  </div>
                )
              }}
              cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
            />
            <Bar
              dataKey={dataKey}
              fill={`url(#gradient-${title || "chart"})`}
              radius={[8, 8, 0, 0]}
              cell={(props: any) => {
                const { payload } = props
                // Não renderizar barra se o valor for 0 ou o nome estiver vazio
                if (!payload || !payload[xAxisKey] || payload[xAxisKey] === "" || (payload[dataKey] === 0 || !payload[dataKey])) {
                  return <rect {...props} fill="transparent" stroke="none" />
                }
                return <rect {...props} />
              }}
            />
          </BarChart>
        ) : type === "line" ? (
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              stroke="#d1d5db"
            />
            <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} stroke="#d1d5db" />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.98)",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
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
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id={`area-${title || "chart"}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              stroke="#d1d5db"
            />
            <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} stroke="#d1d5db" />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.98)",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
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
          {chartContent}
        </CardContent>
      </Card>
    )
  }

  return chartContent
}
