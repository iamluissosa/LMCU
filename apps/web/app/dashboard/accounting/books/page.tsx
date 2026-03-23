'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

// ─── Tipos ────────────────────────────────────────────────────
interface SalesRow {
  nroOperacion: number;
  fecha: string;
  tipoDoc: string;
  rif: string;
  razonSocial: string;
  nroFactura: string;
  nroControl: string;
  nroNotaDebito: string;
  nroNotaCredito: string;
  nroAfectada: string;
  totalConIva: number;
  baseExenta: number;
  base8: number;
  iva8: number;
  base16: number;
  iva16: number;
  base31: number;
  iva31: number;
  igtf: number;
  nroCompRet: string;
  fechaRet: string | null;
  montoRet: number;
}

interface PurchaseRow {
  nroOperacion: number;
  fecha: string;
  tipoDoc: string;
  rifProveedor: string;
  nombreProveedor: string;
  nroFactura: string;
  nroControl: string;
  nroNotaCredito: string;
  nroNotaDebito: string;
  nroPlanillaImport: string;
  nroExpedienteAduana: string;
  totalConIva: number;
  sinDerechoCF: number;
  baseExenta: number;
  base8: number;
  iva8: number;
  base16: number;
  iva16: number;
  nroCompRetIva: string;
  montoRetIva: number;
  nroCompRetIslr: string;
  montoRetIslr: number;
}

interface BookResponse<T> {
  periodo: string;
  totalRegistros: number;
  totales: Record<string, number>;
  rows: T[];
}

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

function fmt(n: number) {
  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
}
function fmtDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-VE');
}

// ─── Export CSV ────────────────────────────────────────────────
function exportCSV(rows: object[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(';'),
    ...rows.map(r => headers.map(h => String((r as Record<string,unknown>)[h] ?? '')).join(';')),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Componente principal ──────────────────────────────────────
export default function FiscalBooksPage() {
  const now = new Date();
  const [tab, setTab] = useState<'sales' | 'purchases'>('sales');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<BookResponse<SalesRow> | null>(null);
  const [purchaseData, setPurchaseData] = useState<BookResponse<PurchaseRow> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'sales') {
        const res = await api.get<BookResponse<SalesRow>>(
          `/fiscal-books/sales-book?year=${year}&month=${month}`,
        );
        setSalesData(res.data);
      } else {
        const res = await api.get<BookResponse<PurchaseRow>>(
          `/fiscal-books/purchase-book?year=${year}&month=${month}`,
        );
        setPurchaseData(res.data);
      }
    } catch {
      setError('Error al consultar el libro fiscal. Verifique la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="fiscal-books-page">
      {/* ── Encabezado ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📒 Libros Fiscales IVA</h1>
          <p className="page-subtitle">SENIAT — Prov. 0071 / Prov. 0049</p>
        </div>
      </div>

      {/* ── Controles ── */}
      <div className="controls-bar">
        {/* Selector de tab */}
        <div className="tab-buttons">
          <button
            className={`tab-btn ${tab === 'sales' ? 'active' : ''}`}
            onClick={() => setTab('sales')}
          >
            📋 Libro de Ventas
          </button>
          <button
            className={`tab-btn ${tab === 'purchases' ? 'active' : ''}`}
            onClick={() => setTab('purchases')}
          >
            🛒 Libro de Compras
          </button>
        </div>

        {/* Selector de período */}
        <div className="period-selector">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="period-select"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="period-select"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-primary" onClick={load} disabled={loading}>
            {loading ? '⏳ Cargando...' : '🔍 Consultar'}
          </button>
        </div>

        {/* Exportar */}
        {tab === 'sales' && salesData && (
          <button
            className="btn-export"
            onClick={() => exportCSV(
              salesData.rows,
              `LibroVentas_${MONTHS[month-1]}_${year}.csv`,
            )}
          >
            ⬇️ Exportar CSV
          </button>
        )}
        {tab === 'purchases' && purchaseData && (
          <button
            className="btn-export"
            onClick={() => exportCSV(
              purchaseData.rows,
              `LibroCompras_${MONTHS[month-1]}_${year}.csv`,
            )}
          >
            ⬇️ Exportar CSV
          </button>
        )}
      </div>

      {error && <p className="error-banner">{error}</p>}

      {/* ─────────────────────────────────────
          LIBRO DE VENTAS
         ───────────────────────────────────── */}
      {tab === 'sales' && salesData && (
        <div className="book-section">
          <div className="book-meta">
            <span>Período: <strong>{salesData.periodo}</strong></span>
            <span>Registros: <strong>{salesData.totalRegistros}</strong></span>
          </div>

          <div className="table-scroll">
            <table className="fiscal-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>RIF</th>
                  <th>Razón Social</th>
                  <th>N° Fact.</th>
                  <th>N° Control</th>
                  <th>N° ND</th>
                  <th>N° NC</th>
                  <th>Doc. Afectado</th>
                  <th>Total c/IVA</th>
                  <th>Base Exenta</th>
                  <th>Base 8%</th>
                  <th>IVA 8%</th>
                  <th>Base 16%</th>
                  <th>IVA 16%</th>
                  <th>Base 31%</th>
                  <th>IVA 31%</th>
                  <th>IGTF</th>
                  <th>N° Comp. Ret.</th>
                  <th>Fecha Ret.</th>
                  <th>Monto Ret.</th>
                </tr>
              </thead>
              <tbody>
                {salesData.rows.map((r) => (
                  <tr key={r.nroOperacion} className={r.tipoDoc === 'ANULADA' ? 'voided-row' : ''}>
                    <td className="text-center">{r.nroOperacion}</td>
                    <td>{fmtDate(r.fecha)}</td>
                    <td><span className={`doc-badge doc-${r.tipoDoc.toLowerCase()}`}>{r.tipoDoc}</span></td>
                    <td className="mono">{r.rif}</td>
                    <td className="razon-social">{r.razonSocial}</td>
                    <td className="mono">{r.nroFactura}</td>
                    <td className="mono">{r.nroControl}</td>
                    <td className="mono">{r.nroNotaDebito}</td>
                    <td className="mono">{r.nroNotaCredito}</td>
                    <td className="mono">{r.nroAfectada}</td>
                    <td className="num">{fmt(r.totalConIva)}</td>
                    <td className="num">{fmt(r.baseExenta)}</td>
                    <td className="num">{fmt(r.base8)}</td>
                    <td className="num">{fmt(r.iva8)}</td>
                    <td className="num">{fmt(r.base16)}</td>
                    <td className="num">{fmt(r.iva16)}</td>
                    <td className="num">{fmt(r.base31)}</td>
                    <td className="num">{fmt(r.iva31)}</td>
                    <td className="num">{fmt(r.igtf)}</td>
                    <td className="mono">{r.nroCompRet}</td>
                    <td>{fmtDate(r.fechaRet)}</td>
                    <td className="num ret">{fmt(r.montoRet)}</td>
                  </tr>
                ))}
              </tbody>
              {/* Totales */}
              <tfoot>
                <tr className="totals-row">
                  <td colSpan={10} className="totals-label">TOTALES DEL PERÍODO</td>
                  <td className="num">{fmt(salesData.totales.totalConIva)}</td>
                  <td className="num">{fmt(salesData.totales.baseExenta)}</td>
                  <td className="num">{fmt(salesData.totales.base8)}</td>
                  <td className="num">{fmt(salesData.totales.iva8)}</td>
                  <td className="num">{fmt(salesData.totales.base16)}</td>
                  <td className="num">{fmt(salesData.totales.iva16)}</td>
                  <td className="num">{fmt(salesData.totales.base31)}</td>
                  <td className="num">{fmt(salesData.totales.iva31)}</td>
                  <td className="num">{fmt(salesData.totales.igtf)}</td>
                  <td></td>
                  <td></td>
                  <td className="num ret">{fmt(salesData.totales.montoRet)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────
          LIBRO DE COMPRAS
         ───────────────────────────────────── */}
      {tab === 'purchases' && purchaseData && (
        <div className="book-section">
          <div className="book-meta">
            <span>Período: <strong>{purchaseData.periodo}</strong></span>
            <span>Registros: <strong>{purchaseData.totalRegistros}</strong></span>
          </div>

          <div className="table-scroll">
            <table className="fiscal-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>RIF Prov.</th>
                  <th>Proveedor</th>
                  <th>N° Fact.</th>
                  <th>N° Control</th>
                  <th>N° NC</th>
                  <th>N° ND</th>
                  <th>N° Planilla</th>
                  <th>N° Expediente</th>
                  <th>Total c/IVA</th>
                  <th>Sin Der. CF</th>
                  <th>Base Exenta</th>
                  <th>Base 8%</th>
                  <th>IVA 8%</th>
                  <th>Base 16%</th>
                  <th>IVA 16%</th>
                  <th>N° Comp. Ret. IVA</th>
                  <th>Ret. IVA</th>
                  <th>N° Comp. Ret. ISLR</th>
                  <th>Ret. ISLR</th>
                </tr>
              </thead>
              <tbody>
                {purchaseData.rows.map((r) => (
                  <tr key={r.nroOperacion} className={r.tipoDoc === 'ANULADA' ? 'voided-row' : ''}>
                    <td className="text-center">{r.nroOperacion}</td>
                    <td>{fmtDate(r.fecha)}</td>
                    <td><span className={`doc-badge doc-${r.tipoDoc.toLowerCase()}`}>{r.tipoDoc}</span></td>
                    <td className="mono">{r.rifProveedor}</td>
                    <td className="razon-social">{r.nombreProveedor}</td>
                    <td className="mono">{r.nroFactura}</td>
                    <td className="mono">{r.nroControl}</td>
                    <td className="mono">{r.nroNotaCredito}</td>
                    <td className="mono">{r.nroNotaDebito}</td>
                    <td className="mono">{r.nroPlanillaImport}</td>
                    <td className="mono">{r.nroExpedienteAduana}</td>
                    <td className="num">{fmt(r.totalConIva)}</td>
                    <td className="num warn">{fmt(r.sinDerechoCF)}</td>
                    <td className="num">{fmt(r.baseExenta)}</td>
                    <td className="num">{fmt(r.base8)}</td>
                    <td className="num">{fmt(r.iva8)}</td>
                    <td className="num">{fmt(r.base16)}</td>
                    <td className="num">{fmt(r.iva16)}</td>
                    <td className="mono">{r.nroCompRetIva}</td>
                    <td className="num ret">{fmt(r.montoRetIva)}</td>
                    <td className="mono">{r.nroCompRetIslr}</td>
                    <td className="num ret">{fmt(r.montoRetIslr)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td colSpan={11} className="totals-label">TOTALES DEL PERÍODO</td>
                  <td className="num">{fmt(purchaseData.totales.totalConIva)}</td>
                  <td className="num warn">{fmt(purchaseData.totales.sinDerechoCF)}</td>
                  <td className="num">{fmt(purchaseData.totales.baseExenta)}</td>
                  <td className="num">{fmt(purchaseData.totales.base8)}</td>
                  <td className="num">{fmt(purchaseData.totales.iva8)}</td>
                  <td className="num">{fmt(purchaseData.totales.base16)}</td>
                  <td className="num">{fmt(purchaseData.totales.iva16)}</td>
                  <td></td>
                  <td className="num ret">{fmt(purchaseData.totales.montoRetIva)}</td>
                  <td></td>
                  <td className="num ret">{fmt(purchaseData.totales.montoRetIslr)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!loading && !error && (
        (tab === 'sales'     && !salesData) ||
        (tab === 'purchases' && !purchaseData)
      ) && (
        <div className="empty-state">
          <span className="empty-icon">📅</span>
          <p>Selecciona el período y presiona <strong>Consultar</strong> para generar el libro.</p>
        </div>
      )}

      <style>{`
        .fiscal-books-page {
          padding: 24px;
          background: #0f1117;
          min-height: 100vh;
          color: #e2e8f0;
          font-family: 'Inter', sans-serif;
        }
        .page-header {
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
        }
        .page-subtitle {
          font-size: 0.8rem;
          color: #64748b;
          margin: 4px 0 0;
        }
        .controls-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          margin-bottom: 20px;
          padding: 16px;
          background: #1e2330;
          border-radius: 12px;
          border: 1px solid #2d3748;
        }
        .tab-buttons {
          display: flex;
          gap: 8px;
        }
        .tab-btn {
          padding: 8px 16px;
          border-radius: 8px;
          background: #2d3748;
          color: #e2e8f0;
          border: 1px solid #4a5568;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-color: #667eea;
          color: #fff;
          box-shadow: 0 0 12px rgba(102, 126, 234, 0.4);
        }
        .period-selector {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-left: auto;
        }
        .period-select {
          padding: 8px 12px;
          background: #2d3748;
          border: 1px solid #4a5568;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 0.85rem;
        }
        .btn-primary {
          padding: 8px 18px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: opacity 0.2s;
        }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-export {
          padding: 8px 14px;
          background: #1a4731;
          color: #4ade80;
          border: 1px solid #166534;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: background 0.2s;
        }
        .btn-export:hover { background: #166534; }
        .error-banner {
          background: #3b1f1f;
          color: #f87171;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #7f1d1d;
          margin-bottom: 16px;
          font-size: 0.85rem;
        }
        .book-section {
          background: #1e2330;
          border-radius: 12px;
          border: 1px solid #2d3748;
          overflow: hidden;
        }
        .book-meta {
          display: flex;
          gap: 24px;
          padding: 12px 16px;
          border-bottom: 1px solid #2d3748;
          font-size: 0.82rem;
          color: #94a3b8;
        }
        .book-meta strong { color: #e2e8f0; }
        .table-scroll {
          overflow-x: auto;
        }
        .fiscal-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.75rem;
          white-space: nowrap;
        }
        .fiscal-table thead tr {
          background: #252d3d;
        }
        .fiscal-table th {
          padding: 8px 10px;
          text-align: left;
          font-weight: 600;
          color: #94a3b8;
          border-bottom: 1px solid #2d3748;
          border-right: 1px solid #2d3748;
          position: sticky;
          top: 0;
          background: #252d3d;
          z-index: 1;
        }
        .fiscal-table td {
          padding: 7px 10px;
          border-bottom: 1px solid #1a2130;
          border-right: 1px solid #1a2130;
        }
        .fiscal-table tbody tr:hover {
          background: #252d3d;
        }
        .voided-row td {
          opacity: 0.45;
          text-decoration: line-through;
          color: #ef4444 !important;
        }
        .totals-row {
          background: #1a2a1f !important;
          border-top: 2px solid #166534;
        }
        .totals-row td {
          font-weight: 700;
          color: #4ade80;
        }
        .totals-label {
          color: #94a3b8 !important;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .num {
          text-align: right;
          font-variant-numeric: tabular-nums;
          font-family: 'JetBrains Mono', monospace;
        }
        .ret {
          color: #f97316;
        }
        .warn {
          color: #facc15;
        }
        .mono {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
        }
        .razon-social {
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .text-center { text-align: center; }
        .doc-badge {
          display: inline-block;
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .doc-fact     { background: #1e3a5f; color: #60a5fa; }
        .doc-nc       { background: #3b2f1e; color: #fb923c; }
        .doc-nd       { background: #2f1e3b; color: #c084fc; }
        .doc-anulada  { background: #3b1f1f; color: #ef4444; }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 64px;
          color: #64748b;
          font-size: 0.9rem;
        }
        .empty-icon { font-size: 3rem; }
      `}</style>
    </div>
  );
}
