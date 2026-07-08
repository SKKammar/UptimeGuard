"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type UptimeChartProps = {
  data: {
    checked_at: string
    response_time_ms: number
    is_up: boolean
  }[]
}

export function UptimeChart({ data }: UptimeChartProps) {
  if (!data || data.length === 0) {
    return <div className="flex h-[300px] items-center justify-center text-gray-500">No data available</div>
  }

  const chartData = data.map(d => ({
    time: new Date(d.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    latency: d.response_time_ms,
    date: new Date(d.checked_at).toLocaleString()
  })).reverse() // Chronological order if data was descending

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}ms`}
          />
          <Tooltip 
             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
             labelFormatter={(_, payload) => payload[0]?.payload.date}
          />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
