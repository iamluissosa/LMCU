'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface WeeklyPoint {
  week: string;  // "2026-W04-07" (formato YYYY-WMM-DD)
  total: number;
}

interface SalesSparklineProps {
  data: WeeklyPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Convertir la clave de semana a label legible
    const parts = label.split('-'); // ["2026", "W04", "07"]
    const weekLabel = parts.length === 3
      ? `Sem. del ${parts[2]}/${parts[1]?.replace('W', '')}`
      : label;

    return (
      <div className="bg-[#0F1117] border border-white/10 rounded-xl px-3 py-2 shadow-xl text-sm">
        <p className="text-gray-400 text-xs mb-1">{weekLabel}</p>
        <p className="text-white font-bold">
          ${Number(payload[0].value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Gráfica de área (sparkline) para la tendencia de ventas semanales.
 * Usa Recharts con un tema oscuro coherente con el diseño del dashboard.
 */
export function SalesSparkline({ data }: SalesSparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-gray-600 text-sm">
        Sin datos de ventas para graficar
      </div>
    );
  }

  // Formatear label del eje X: mostrar solo "Sem N"
  const formatXAxis = (key: string) => {
    const parts = key.split('-');
    if (parts.length < 3) return key;
    return `${parts[2]}/${parts[1]?.replace('W', '')}`;
  };

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

        <XAxis
          dataKey="week"
          tickFormatter={formatXAxis}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />

        <Area
          type="monotone"
          dataKey="total"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#salesGradient)"
          dot={false}
          activeDot={{ r: 5, fill: '#818cf8', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
