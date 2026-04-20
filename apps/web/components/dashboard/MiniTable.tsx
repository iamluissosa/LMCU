'use client';

interface Column<T> {
  key: keyof T | string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
}

interface MiniTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  rankBadge?: boolean; // Muestra número de posición como badge
}

/**
 * Tabla compacta y reutilizable para listas de top N registros en el dashboard.
 * Compatible con Top Clientes, Top Vendedores, Productos en Stock Crítico.
 */
export function MiniTable<T extends Record<string, any>>({
  rows,
  columns,
  emptyMessage = 'Sin datos disponibles',
  rankBadge = false,
}: MiniTableProps<T>) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-gray-500 text-sm py-6">{emptyMessage}</p>
    );
  }

  const rankColors = [
    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'bg-gray-400/20 text-gray-300 border-gray-400/30',
    'bg-orange-400/20 text-orange-400 border-orange-400/30',
    'bg-white/5 text-gray-500 border-white/10',
    'bg-white/5 text-gray-500 border-white/10',
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-white/5">
            {rankBadge && <th className="pb-3 pr-3 text-xs text-gray-500 font-medium">#</th>}
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`pb-3 pr-3 text-xs text-gray-500 font-medium uppercase tracking-wide text-${col.align || 'left'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-white/3 transition-colors">
              {rankBadge && (
                <td className="py-3 pr-3">
                  <span className={`text-xs font-bold border px-1.5 py-0.5 rounded-md ${rankColors[i] ?? rankColors[3]}`}>
                    {i + 1}
                  </span>
                </td>
              )}
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`py-3 pr-3 text-gray-300 text-${col.align || 'left'}`}
                >
                  {col.render ? col.render(row, i) : row[col.key as string]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
