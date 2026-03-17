'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  FileText, Plus, RefreshCw, XCircle, Send, Eye, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ── TIPOS ────────────────────────────────────────────────
interface Client { id: string; name: string; rif?: string; }
interface Product { id: string; name: string; code: string; isService: boolean; priceBase: number; }
interface ServiceCategory { id: string; name: string; }
interface QuoteItem {
  type: 'product' | 'service';
  productId?: string; serviceCategoryId?: string;
  description?: string;
  quantity: number; unitPrice: number; taxRate: number; discount: number;
}
interface Quote {
  id: string; quoteNumber: string; status: string;
  issueDate: string; expiresAt?: string;
  totalAmount: number; currencyCode: string;
  client: { name: string; rif?: string };
  _count?: { items: number };
}

// ── HELPERS ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Borrador',  color: 'bg-gray-500/10 text-gray-400 border border-gray-500/20' },
  SENT:      { label: 'Enviada',   color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  ACCEPTED:  { label: 'Aceptada', color: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  REJECTED:  { label: 'Rechazada', color: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  EXPIRED:   { label: 'Vencida',  color: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  CANCELLED: { label: 'Anulada',  color: 'bg-white/5 text-gray-500 border border-white/10' },
};

const fmt = (n: number, cur = 'USD') =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(n);

// ── COMPONENTE PRINCIPAL ─────────────────────────────────
import { toast } from 'sonner';

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentBcvRate, setCurrentBcvRate] = useState<number>(1);

  // Modal crear
  const [showModal, setShowModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: '', currencyCode: 'USD', exchangeRate: 1,
    expiresAt: '', notes: '', internalNote: '',
  });
  const [items, setItems] = useState<QuoteItem[]>([
    { type: 'product', productId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 16, discount: 0 },
  ]);

  // ── CARGA ──────────────────────────────────────────────
  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filterStatus) params.set('status', filterStatus);
      const data = await apiClient.get<{ items: Quote[]; pages: number }>(`/quotes?${params}`);
      setQuotes(data.items ?? []);
      setTotalPages(data.pages ?? 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const loadCatalogs = async () => {
    const [c, p, s] = await Promise.all([
      apiClient.get<{ items: Client[] }>('/clients?limit=200').catch(() => ({ items: [] })),
      apiClient.get<{ items: Product[] }>('/products?limit=500').catch(() => ({ items: [] })),
      apiClient.get<ServiceCategory[]>('/service-categories').catch(() => []),
    ]);
    const clientsRes = c as { items?: Client[] };
    const productsRes = p as { items?: Product[] };
    setClients(clientsRes.items ?? (Array.isArray(c) ? c : []));
    setProducts(productsRes.items ?? (Array.isArray(p) ? p : []));
    setServiceCategories(Array.isArray(s) ? s : []);
  };

  const openModal = async () => {
    await loadCatalogs();
    
    let rate = 1;
    try {
      const data = await apiClient.get<{ rate?: number | string }>('/exchange-rates/latest');
      if (data && data.rate) rate = Number(data.rate);
    } catch (e) {
      console.error('Error cargando tasa BCV', e);
    }
    setCurrentBcvRate(rate);
    setForm({
      clientId: '', currencyCode: 'USD', exchangeRate: rate,
      expiresAt: '', notes: '', internalNote: '',
    });
    setItems([{ type: 'product', productId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 16, discount: 0 }]);
    setShowModal(true);
  };

  // ── ÍTEMS ──────────────────────────────────────────────
  const addItem = () =>
    setItems(prev => [...prev, { type: 'product', productId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 16, discount: 0 }]);

  const removeItem = (i: number) =>
    setItems(prev => prev.filter((_, idx) => idx !== i));

  const updateItem = (i: number, field: keyof QuoteItem, value: string | number) =>
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [field]: value };
      // Auto-completar precio si se selecciona producto
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        if (prod) updated.unitPrice = Number(prod.priceBase);
      }
      return updated;
    }));

  // ── CALCULAR TOTALES ──────────────────────────────────
  const calcLine = (it: QuoteItem) => {
    const base = it.quantity * it.unitPrice * (1 - it.discount / 100);
    return base + base * (it.taxRate / 100);
  };
  const total = items.reduce((acc, it) => acc + calcLine(it), 0);

  // ── GUARDAR ────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) return toast.error('Selecciona un cliente.');
    if (items.some(i => (i.type === 'product' && !i.productId) || (i.type === 'service' && !i.serviceCategoryId))) {
      return toast.error('Cada ítem debe tener un producto o un servicio seleccionado.');
    }
    setSaving(true);
    try {
      const parsedItems = items.map((i: QuoteItem) => {
        const { type, ...rest } = i;
        const cleanedItem: Record<string, string | number | undefined | null> = { ...rest };
        if (type === 'product' && i.productId) cleanedItem.productId = i.productId;
        if (type === 'service' && i.serviceCategoryId) cleanedItem.serviceCategoryId = i.serviceCategoryId;
        return cleanedItem;
      });
      
      const dataToSend: Record<string, unknown> = {
        clientId: form.clientId,
        currencyCode: form.currencyCode,
        exchangeRate: Number(form.exchangeRate),
        items: parsedItems,
      };

      if (form.expiresAt) dataToSend.expiresAt = form.expiresAt;
      if (form.notes) dataToSend.notes = form.notes;
      if (form.internalNote) dataToSend.internalNote = form.internalNote;

      console.log('Enviando datos de cotización:', JSON.stringify(dataToSend, null, 2));
      await apiClient.post('/quotes', dataToSend);
      toast.success('Cotización guardada exitosamente');
      setShowModal(false);
      setItems([{ type: 'product', productId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 16, discount: 0 }]);
      setForm({ clientId: '', currencyCode: 'USD', exchangeRate: 1, expiresAt: '', notes: '', internalNote: '' });
      fetchQuotes();
    } catch (err: unknown) {
      console.error('Error al guardar cotización - Raw error:', err);
      const e = err as { message?: string };
      toast.error(`Error: ${e.message ?? 'No se pudo guardar la cotización'}`);
    } finally { setSaving(false); }
  };

  // ── CONVERTIR A PEDIDO ─────────────────────────────────
  const handleConvert = async (quoteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Convertir esta cotización en Pedido de Venta? Se validará y comprometerá el stock.')) return;
    try {
      const order = await apiClient.post<{ id: string }>(`/quotes/${quoteId}/convert`, {});
      alert('✅ Pedido generado correctamente.');
      router.push(`/dashboard/sales/orders/${order.id}`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Error: ${e.message ?? 'No se pudo convertir'}`);
    }
  };

  // ── CAMBIAR ESTADO ─────────────────────────────────────
  const handleStatusChange = async (quoteId: string, status: string) => {
    try {
      await apiClient.patch(`/quotes/${quoteId}/status`, { status });
      fetchQuotes();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Error: ${e.message}`);
    }
  };

  // ── RENDER ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="text-blue-400" /> Cotizaciones
          </h1>
          <p className="text-sm text-gray-400 mt-1">Gestión del pipeline de ventas · Flujo: Cotización → Pedido → Factura</p>
        </div>
        <button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
          <Plus size={18} /> Nueva Cotización
        </button>
      </div>

      {/* FILTROS */}
      <div className="flex gap-2 flex-wrap">
        {['', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map(s => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}>
            {s === '' ? 'Todas' : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
        <button onClick={fetchQuotes} className="ml-auto p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-[#1A1F2C] rounded-xl shadow-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/5 text-xs uppercase text-gray-400 font-semibold border-b border-white/10">
            <tr>
              <th className="px-5 py-3">N° Cotización</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Vence</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-center">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-500">Cargando...</td></tr>
            ) : quotes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  <FileText size={32} className="mx-auto mb-2 text-gray-600" />
                  <p>No hay cotizaciones. ¡Crea la primera!</p>
                </td>
              </tr>
            ) : quotes.map(q => {
              const st = STATUS_CONFIG[q.status] ?? { label: q.status, color: 'bg-white/5 text-gray-400' };
              return (
                <tr key={q.id} className="hover:bg-white/5 transition-colors cursor-pointer group"
                  onClick={() => router.push(`/dashboard/sales/quotes/${q.id}`)}>
                  <td className="px-5 py-3 font-mono font-semibold text-blue-400">{q.quoteNumber}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-white">{q.client.name}</p>
                    <p className="text-xs text-gray-500">{q.client.rif ?? '—'}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{new Date(q.issueDate).toLocaleDateString('es-VE')}</td>
                  <td className="px-5 py-3 text-gray-400">
                    {q.expiresAt ? new Date(q.expiresAt).toLocaleDateString('es-VE') : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-white">
                    {fmt(Number(q.totalAmount), q.currencyCode)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.color}`}>{st.label}</span>
                  </td>
                  <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Marcar como Enviada */}
                      {q.status === 'DRAFT' && (
                        <button
                          onClick={() => handleStatusChange(q.id, 'SENT')}
                          title="Marcar como Enviada"
                          className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                          <Send size={15} />
                        </button>
                      )}
                      {/* Convertir a Pedido */}
                      {(q.status === 'DRAFT' || q.status === 'SENT') && (
                        <button
                          onClick={(e) => handleConvert(q.id, e)}
                          title="Convertir a Pedido de Venta"
                          className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors">
                          <ArrowRight size={15} />
                        </button>
                      )}
                      {/* Rechazar */}
                      {(q.status === 'DRAFT' || q.status === 'SENT') && (
                        <button
                          onClick={() => handleStatusChange(q.id, 'REJECTED')}
                          title="Rechazar"
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                          <XCircle size={15} />
                        </button>
                      )}
                      <Link href={`/dashboard/sales/quotes/${q.id}`} title="Ver detalle"
                        className="p-1.5 text-gray-400 hover:bg-white/10 rounded-lg transition-colors">
                        <Eye size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── MODAL CREAR COTIZACIÓN ─────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1F2C] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto border border-white/10">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#1A1F2C]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText size={20} className="text-blue-400" /> Nueva Cotización
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors text-xl font-bold">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Cabecera */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Cliente *</label>
                  <select required className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                    <option value="">-- Seleccionar cliente --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.rif ? `(${c.rif})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Válida hasta</label>
                  <input type="date" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Moneda</label>
                  <select className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    value={form.currencyCode} onChange={e => {
                      const newCurr = e.target.value;
                      setForm({ 
                        ...form, 
                        currencyCode: newCurr,
                        exchangeRate: newCurr === 'USD' ? currentBcvRate : 1 
                      });
                    }}>
                    <option value="USD">USD — Dólar</option>
                    <option value="VES">VES — Bolívar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Tasa de cambio</label>
                  <input type="number" step="0.01" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.exchangeRate} onChange={e => setForm({ ...form, exchangeRate: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Observaciones</label>
                  <input type="text" placeholder="Términos y condiciones..."
                    className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-600"
                    value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>

              {/* Ítems */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ítems de la Cotización</h3>
                  <button type="button" onClick={addItem}
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors">
                    <Plus size={14} /> AGREGAR LÍNEA
                  </button>
                </div>

                <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0B1120]">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-[10px] text-gray-400 uppercase font-bold border-b border-white/10">
                      <tr>
                        <th className="px-3 py-2 text-left w-24">Tipo</th>
                        <th className="px-3 py-2 text-left w-[35%]">Ítem</th>
                        <th className="px-3 py-2 text-left">Descripción</th>
                        <th className="px-3 py-2 text-right w-16">Cant.</th>
                        <th className="px-3 py-2 text-right w-24">Precio</th>
                        <th className="px-3 py-2 text-right w-16">IVA %</th>
                        <th className="px-3 py-2 text-right w-16">Desc %</th>
                        <th className="px-3 py-2 text-right w-24">Total</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {items.map((item, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-2 py-2">
                            <select className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                              value={item.type} onChange={e => {
                                updateItem(i, 'type', e.target.value);
                                updateItem(i, 'productId', '');
                                updateItem(i, 'serviceCategoryId', '');
                              }}>
                              <option value="product">Producto</option>
                              <option value="service">Servicio</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            {item.type === 'product' ? (
                              <select required className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                                value={item.productId || ''} onChange={e => updateItem(i, 'productId', e.target.value)}>
                                <option value="">-- Seleccionar --</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.isService ? '🔧 ' : '📦 '}{p.name} ({p.code})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <select required className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                                value={item.serviceCategoryId || ''} onChange={e => updateItem(i, 'serviceCategoryId', e.target.value)}>
                                <option value="">-- Seleccionar Servicio --</option>
                                {serviceCategories.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <input className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-600"
                              placeholder="Descripción adicional..."
                              value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0.01" step="0.01"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-right text-white focus:ring-1 focus:ring-blue-500 outline-none"
                              value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" step="0.01"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-right text-white focus:ring-1 focus:ring-blue-500 outline-none"
                              value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} />
                          </td>
                          <td className="px-2 py-2">
                            <select className="w-full bg-white/5 border border-white/10 rounded-lg px-1.5 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                              value={item.taxRate} onChange={e => updateItem(i, 'taxRate', Number(e.target.value))}>
                              <option value={16}>16%</option>
                              <option value={8}>8%</option>
                              <option value={0}>0% Exento</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" max="100" step="0.5"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-right text-white focus:ring-1 focus:ring-blue-500 outline-none"
                              value={item.discount} onChange={e => updateItem(i, 'discount', Number(e.target.value))} />
                          </td>
                          <td className="px-2 py-2 text-right font-medium text-white text-[11px]">
                            {fmt(calcLine(item))}
                          </td>
                          <td className="px-1 py-2 text-center">
                            {items.length > 1 && (
                              <button type="button" onClick={() => removeItem(i)}
                                className="text-red-400 hover:text-red-600 p-1 rounded">×</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totales */}
                <div className="flex justify-end mt-3">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-3 text-right">
                    <p className="text-[10px] text-blue-400/70 mb-1 font-bold uppercase tracking-wider">Total Cotización</p>
                    <p className="text-2xl font-bold text-blue-400">{fmt(total, form.currencyCode)}</p>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-gray-400 hover:bg-white/5 rounded-xl text-sm transition-colors font-medium">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-500/20">
                  {saving ? 'Guardando...' : '✓ Crear Cotización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
