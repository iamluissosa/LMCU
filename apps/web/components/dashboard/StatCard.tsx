'use client';

import React from 'react';

interface TrendBadgeProps {
  delta: number | null;
}

const TrendBadge = ({ delta }: TrendBadgeProps) => {
  if (delta === null || delta === undefined) return null;
  const isPositive = delta >= 0;
  return (
    <span
      className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
        isPositive
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-red-500/15 text-red-400'
      }`}
    >
      {isPositive ? '▲' : '▼'} {Math.abs(delta)}%
    </span>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  colorClass: string;      // Tailwind bg color del ícono: 'bg-blue-500/20 text-blue-400'
  delta?: number | null;   // % cambio vs mes anterior
  badge?: React.ReactNode; // Badge personalizado (JSX)
  href?: string;           // Link al módulo
  wide?: boolean;          // lg:col-span-2
}

/**
 * Tarjeta de KPI reutilizable para el dashboard.
 * Reemplaza los ~15 líneas de HTML repetido por cada tarjeta.
 */
export function StatCard({ title, value, subtitle, icon, colorClass, delta, badge, href, wide }: StatCardProps) {
  const Wrapper = href ? 'a' : 'div';
  return (
    <Wrapper
      href={href}
      className={`bg-[#1A1F2C] p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-all duration-200 cursor-default ${href ? 'cursor-pointer hover:shadow-xl' : ''} ${wide ? 'lg:col-span-2' : ''}`}
    >
      {/* Destellos de fondo decorativos */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${colorClass.split(' ')[0]}`} />
      </div>

      <div className="flex justify-between items-start mb-4 relative">
        <p className="text-sm font-medium text-gray-400 leading-tight">{title}</p>
        <div className={`${colorClass} p-2.5 rounded-xl group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>

      <div className="relative">
        <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          <TrendBadge delta={delta ?? null} />
          {badge}
        </div>
      </div>
    </Wrapper>
  );
}
