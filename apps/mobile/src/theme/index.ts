import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

/**
 * Paleta de colores corporativa LMCU
 * Diseñada para coherencia visual con la web app (Next.js)
 */
const brandColors = {
  primary: '#6366f1',       // Indigo principal - igual a la web
  primaryContainer: '#312e81',
  onPrimary: '#ffffff',
  secondary: '#8b5cf6',     // Violeta accent
  secondaryContainer: '#4c1d95',
  onSecondary: '#ffffff',
  success: '#10b981',       // Emerald para métricas positivas
  warning: '#f59e0b',       // Amber para alertas
  error: '#ef4444',         // Red para errores
  info: '#3b82f6',          // Blue para información
};

export const LightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brandColors.primary,
    primaryContainer: '#e0e7ff',
    onPrimary: brandColors.onPrimary,
    secondary: brandColors.secondary,
    secondaryContainer: '#ede9fe',
    onSecondary: brandColors.onSecondary,
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceVariant: '#f1f5f9',
    onSurface: '#1e293b',
    onSurfaceVariant: '#64748b',
    outline: '#e2e8f0',
    error: brandColors.error,
  },
};

export const DarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818cf8',
    primaryContainer: brandColors.primaryContainer,
    onPrimary: '#ffffff',
    secondary: '#a78bfa',
    secondaryContainer: brandColors.secondaryContainer,
    onSecondary: '#ffffff',
    background: '#0f172a',   // Slate-900 - coherente con la web dark
    surface: '#1e293b',      // Slate-800
    surfaceVariant: '#334155', // Slate-700
    onSurface: '#f8fafc',
    onSurfaceVariant: '#94a3b8',
    outline: '#334155',
    error: '#f87171',
  },
};

// Constantes de diseño reutilizables
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
} as const;

// Colores semánticos extra (métricas del ERP)
export const semanticColors = {
  revenue: brandColors.success,
  expense: brandColors.error,
  commission: '#f59e0b',
  pending: '#64748b',
  approved: brandColors.success,
  rejected: brandColors.error,
} as const;
