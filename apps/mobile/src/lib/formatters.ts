/**
 * Formateadores de utilidad para la app móvil LMCU.
 * Centralizados para consistencia y fácil cambio de locale/currency.
 */

const CURRENCY_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const PERCENT_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Formatea un número como moneda (MXN)
 * @example formatCurrency(150000) => "$150,000"
 */
export function formatCurrency(value: number): string {
  return CURRENCY_FORMATTER.format(value);
}

/**
 * Formatea un número como porcentaje
 * @example formatPercent(0.235) => "23.5%"
 * @example formatPercent(23.5) => "23.5%" (acepta ambas formas)
 */
export function formatPercent(value: number): string {
  // Si el valor es > 1, asumimos que ya está en forma porcentual (ej: 23.5)
  const normalized = value > 1 ? value / 100 : value;
  return PERCENT_FORMATTER.format(normalized);
}

/**
 * Formatea un número con abreviaciones para métricas compactas
 * @example formatCompact(1500000) => "1.5M"
 * @example formatCompact(25000) => "25K"
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}
