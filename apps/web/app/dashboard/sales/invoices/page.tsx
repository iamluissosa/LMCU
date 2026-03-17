'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Receipt, Plus, RefreshCw, Eye, DollarSign,
  AlertTriangle, CheckCircle, Clock, XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SalesInvoice {
  id: string; invoiceNumber: string; status: string;
  issueDate: string; dueDate?: string;
  totalAmount: number; paidAmount: number; currencyCode: string;
  retentionIVA: number; retentionISLR: number;
  client: { name: string; rif?: string };
  _count?: { payments: number };
}

interface Client { id: string; name: string; rif?: string; isIvaAgent: boolean; islrRate: number; }
interface Product { id: string; name: string; code: string; isService: boolean; priceBase: number; }
interface ServiceCategory { id: string; name: string; }

interface InvoiceItem {
  type: 'product' | 'service';
  productId?: string; serviceCategoryId?: string;
  description?: string;
  quantity: number; unitPrice: number; taxRate: number; discount: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT:   { label: 'Borrador',  color: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',    icon: <Clock size={12} /> },
  ISSUED:  { label: 'Emitida',   color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',    icon: <Receipt size={12} /> },
  PARTIAL: { label: 'Parcial',   color: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20', icon: <DollarSign size={12} /> },
  PAID:    { label: 'Cobrada',   color: 'bg-green-500/10 text-green-400 border border-green-500/20',  icon: <CheckCircle size={12} /> },
  VOID:    { label: 'Anulada',   color: 'bg-white/5 text-gray-500 border border-white/10',      icon: <XCircle size={12} /> },
  OVERDUE: { label: 'Vencida',   color: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', icon: <AlertTriangle size={12} /> },
};

const fmt = (n: number, cur = 'USD') =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(n);

export default function SalesInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [overdueCount, setOverdueCount] = useState(0);

  // Modal registro de pago
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<SalesInvoice | null>(null);
  const [payForm, setPayForm] = useState({
    method: 'TRANSFER_USD', reference: '', bankName: '',
    amountApplied: 0, currencyCode: 'USD', exchangeRate: 1,
  });
  const [savingPay, setSavingPay] = useState(false);

  // Modal crear factura
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [invoiceForm, setInvoiceForm] = useState({
    clientId: '', salesOrderId: '', controlNumber: '',
    currencyCode: 'USD', exchangeRate: 1,
    dueDate: '', notes: '',
  });
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { type: 'product', productId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 16, discount: 0 },
  ]);
  const [savingInv, setSavingInv] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filterStatus) params.set('status', filterStatus);
      const [data, overdue] = await Promise.all([
        apiClient.get<{ items: SalesInvoice[]; pages: number }>(`/sales-invoices?${params}`),
        apiClient.get<SalesInvoice[]>('/sales-invoices/overdue').catch(() => []),
      ]);
      setInvoices(data.items ?? []);
      setTotalPages(data.pages ?? 1);
      setOverdueCount(Array.isArray(overdue) ? overdue.length : 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const openPayModal = (inv: SalesInvoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setPayingInvoice(inv);
    const remaining = Number(inv.totalAmount) - Number(inv.paidAmount)
      - Number(inv.retentionIVA) - Number(inv.retentionISLR);
    setPayForm({ method: 'TRANSFER_USD', reference: '', bankName: '', amountApplied: remaining, currencyCode: inv.currencyCode, exchangeRate: 1 });
    setShowPayModal(true);
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    setSavingPay(true);
    try {
      await apiClient.post('/sales-invoices/payment', {
        clientId: payingInvoice.client ? (payingInvoice as any).clientId : '',
        method: payForm.method,
        reference: payForm.reference,
        bankName: payForm.bankName,
        currencyCode: payForm.currencyCode,
        exchangeRate: Number(payForm.exchangeRate),
        amountReceived: Number(payForm.amountApplied),
        igtfAmount: payForm.method === 'CASH_USD' ? Number(payForm.amountApplied) * 0.03 : 0,
        details: [{ salesInvoiceId: payingInvoice.id, amountApplied: Number(payForm.amountApplied) }],
      });
      setShowPayModal(false);
      fetchInvoices();
    } catch (err: unknown) {
      const er = err as { message?: string };
      alert(`Error: ${er.message}`);
    } finally { setSavingPay(false); }
  };

  const loadCatalogs = async () => {
    const [c, p, s] = await Promise.all([
      apiClient.get<any>('/clients?limit=200').catch(() => ({ items: [] })),
      apiClient.get<any>('/products?limit=500').catch(() => ({ items: [] })),
      apiClient.get<ServiceCategory[]>('/service-categories').catch(() => []),
    ]);
    setClients(c.items ?? c ?? []);
    setProducts(p.items ?? p ?? []);
    setServiceCategories(s ?? []);
  };

  const openCreateModal = async () => {
    await loadCatalogs();
    setShowCreateModal(true);
  };

  const calcLine = (it: InvoiceItem) => {
    const base = it.quantity * it.unitPrice * (1 - it.discount / 100);
    return base + base * (it.taxRate / 100);
  };
  const totalInvoice = invoiceItems.reduce((acc, it) => acc + calcLine(it), 0);

  const addInvItem = () => setInvoiceItems(p => [...p, { type: 'product', productId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 16, discount: 0 }]);
  const removeInvItem = (i: number) => setInvoiceItems(p => p.filter((_, idx) => idx !== i));
  const updateInvItem = (i: number, field: keyof InvoiceItem, value: string | number) => {
    setInvoiceItems(p => p.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [field]: value };
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        if (prod) updated.unitPrice = Number(prod.priceBase);
      }
      return updated;
    }));
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.clientId) return alert('Selecciona un cliente.');
    if (invoiceItems.some(i => (i.type === 'product' && !i.productId) || (i.type === 'service' && !i.serviceCategoryId))) {
      return alert('Cada ítem debe tener un producto o un servicio seleccionado.');
    }
    setSavingInv(true);
    try {
      const parsedItems = invoiceItems.map(i => {
        const { type, ...rest } = i;
        return {
          ...rest,
          productId: type === 'product' ? i.productId : null,
          serviceCategoryId: type === 'service' ? i.serviceCategoryId : null,
        };
      });
      await apiClient.post('/sales-invoices', {
        ...invoiceForm,
        exchangeRate: Number(invoiceForm.exchangeRate),
        items: parsedItems,
        retIvaRate: selectedClient?.isIvaAgent ? 75 : 0,
        retISLRRate: selectedClient ? Number(selectedClient.islrRate) : 0,
      });
      setShowCreateModal(false);
      fetchInvoices();
    } catch (err: unknown) {
      const er = err as { message?: string };
      alert(`Error: ${er.message}`);
    } finally { setSavingInv(false); }
  };

  const handleClientChange = (clientId: string) => {
    const cl = clients.find(c => c.id === clientId) ?? null;
    setSelectedClient(cl);
    setInvoiceForm(f => ({ ...f, clientId }));
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Receipt className="text-teal-400" /> Facturas de Venta
          </h1>
          <p className="text-sm text-gray-400 mt-1">Cuentas por Cobrar · Desglose fiscal SENIAT</p>
        </div>
        <div className="flex gap-2">
          {overdueCount > 0 && (
            <button onClick={() => setFilterStatus('OVERDUE')}
              className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-2 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02]">
              <AlertTriangle size={15} /> {overdueCount} vencida{overdueCount !== 1 ? 's' : ''}
            </button>
          )}
          <button onClick={openCreateModal}
            className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-teal-500/20 text-sm">
            <Plus size={18} /> Nueva Factura
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex gap-2 flex-wrap">
        {['', ...Object.keys(STATUS_CONFIG)].map(s => (
          <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s 
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' 
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}>
            {s === '' ? 'Todas' : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
        <button onClick={fetchInvoices} className="ml-auto p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-[#1A1F2C] rounded-xl shadow-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/5 text-xs uppercase text-gray-400 font-semibold border-b border-white/10">
            <tr>
              <th className="px-5 py-3">N° Factura</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Emisión</th>
              <th className="px-5 py-3">Vence</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-right">Cobrado</th>
              <th className="px-5 py-3 text-center">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-500">Cargando...</td></tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-500">
                  <Receipt size={32} className="mx-auto mb-2 text-gray-600" />
                  <p>No hay facturas{filterStatus ? ` en estado "${STATUS_CONFIG[filterStatus]?.label}"` : ''}.</p>
                </td>
              </tr>
            ) : invoices.map(inv => {
              const st = STATUS_CONFIG[inv.status] ?? { label: inv.status, color: 'bg-white/5 text-gray-400', icon: null };
              const pendiente = Number(inv.totalAmount) - Number(inv.paidAmount);
              const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'PAID';
              return (
                <tr key={inv.id}
                  className={`transition-colors cursor-pointer group ${isOverdue ? 'bg-orange-500/5 hover:bg-orange-500/10' : 'hover:bg-white/5'}`}
                  onClick={() => router.push(`/dashboard/sales/invoices/${inv.id}`)}>
                  <td className="px-5 py-3">
                    <p className="font-mono font-semibold text-teal-400">{inv.invoiceNumber}</p>
                    {isOverdue && <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">VENCIDA</p>}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-white">{inv.client.name}</p>
                    <p className="text-xs text-gray-500">{inv.client.rif ?? '—'}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{new Date(inv.issueDate).toLocaleDateString('es-VE')}</td>
                  <td className="px-5 py-3 text-gray-400">
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('es-VE') : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-white">
                    {fmt(Number(inv.totalAmount), inv.currencyCode)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <p className="text-green-400 font-medium">{fmt(Number(inv.paidAmount), inv.currencyCode)}</p>
                    {pendiente > 0.01 && (
                      <p className="text-xs text-red-400 font-medium">{fmt(pendiente, inv.currencyCode)} pendiente</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.color}`}>
                      {st.icon} {st.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(inv.status === 'ISSUED' || inv.status === 'PARTIAL') && (
                        <button onClick={(e) => openPayModal(inv, e)}
                          className="px-2.5 py-1 text-[10px] bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg font-bold uppercase tracking-wider border border-green-500/20 transition-colors">
                          Registrar Cobro
                        </button>
                      )}
                      <Link href={`/dashboard/sales/invoices/${inv.id}`} className="p-1.5 text-gray-400 hover:bg-white/10 rounded-lg transition-colors">
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

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === p ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── MODAL CREAR FACTURA ──────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1F2C] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto border border-white/10">
            <div className="sticky top-0 bg-[#1A1F2C]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between rounded-t-2xl z-20">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Receipt size={20} className="text-teal-400" /> Nueva Factura de Venta
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white transition-colors text-xl font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateInvoice} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Cliente *</label>
                  <select required className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none appearance-none"
                    value={invoiceForm.clientId} onChange={e => handleClientChange(e.target.value)}>
                    <option value="">-- Seleccionar cliente --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.rif ? `(${c.rif})` : ''}</option>)}
                  </select>
                  {selectedClient?.isIvaAgent && (
                    <p className="text-[10px] text-orange-400 mt-1 font-bold uppercase tracking-wider">⚠️ Agente de retención IVA (75%)</p>
                  )}
                  {selectedClient && Number(selectedClient.islrRate) > 0 && (
                    <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">⚠️ Retención ISLR: {selectedClient.islrRate}%</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">N° de Control</label>
                  <input className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none placeholder-gray-600"
                    placeholder="Ej: 00-123456"
                    value={invoiceForm.controlNumber} onChange={e => setInvoiceForm(f => ({ ...f, controlNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Moneda</label>
                  <select className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none appearance-none"
                    value={invoiceForm.currencyCode} onChange={e => setInvoiceForm(f => ({ ...f, currencyCode: e.target.value }))}>
                    <option value="USD">USD — Dólar</option>
                    <option value="VES">VES — Bolívar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Vence</label>
                  <input type="date" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none"
                    value={invoiceForm.dueDate} onChange={e => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">N° Pedido (opcional)</label>
                  <input className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none placeholder-gray-600"
                    placeholder="ID del SalesOrder..."
                    value={invoiceForm.salesOrderId} onChange={e => setInvoiceForm(f => ({ ...f, salesOrderId: e.target.value }))} />
                </div>
              </div>

              {/* Ítems */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ítems de Factura</h3>
                  <button type="button" onClick={addInvItem}
                    className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 transition-colors">
                    <Plus size={14} /> AGREGAR LÍNEA
                  </button>
                </div>
                <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0B1120]">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-[10px] text-gray-400 uppercase font-bold border-b border-white/10">
                      <tr>
                        <th className="px-3 py-2 text-left w-24">Tipo</th>
                        <th className="px-3 py-2 text-left w-[35%]">Producto / Servicio</th>
                        <th className="px-3 py-2 text-right w-16">Cant.</th>
                        <th className="px-3 py-2 text-right w-24">Precio</th>
                        <th className="px-3 py-2 text-right w-16">IVA %</th>
                        <th className="px-3 py-2 text-right w-16">Desc %</th>
                        <th className="px-3 py-2 text-right w-24">Total</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {invoiceItems.map((item, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-2 py-2">
                             <select className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-teal-500 outline-none appearance-none"
                               value={item.type} onChange={e => {
                                 updateInvItem(i, 'type', e.target.value);
                                 updateInvItem(i, 'productId', '');
                                 updateInvItem(i, 'serviceCategoryId', '');
                               }}>
                               <option value="product">Producto</option>
                               <option value="service">Servicio</option>
                             </select>
                          </td>
                          <td className="px-2 py-2">
                            {item.type === 'product' ? (
                              <select required className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-teal-500 outline-none appearance-none"
                                value={item.productId || ''} onChange={e => updateInvItem(i, 'productId', e.target.value)}>
                                <option value="">-- Seleccionar --</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.isService ? '🔧 ' : '📦 '}{p.name}</option>
                                ))}
                              </select>
                            ) : (
                              <select required className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-teal-500 outline-none appearance-none"
                                value={item.serviceCategoryId || ''} onChange={e => updateInvItem(i, 'serviceCategoryId', e.target.value)}>
                                <option value="">-- Seleccionar Servicio --</option>
                                {serviceCategories.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0.01" step="0.01"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-right text-white focus:ring-1 focus:ring-teal-500 outline-none"
                              value={item.quantity} onChange={e => updateInvItem(i, 'quantity', Number(e.target.value))} />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" step="0.01"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-right text-white focus:ring-1 focus:ring-teal-500 outline-none"
                              value={item.unitPrice} onChange={e => updateInvItem(i, 'unitPrice', Number(e.target.value))} />
                          </td>
                          <td className="px-2 py-2">
                            <select className="w-full bg-white/5 border border-white/10 rounded-lg px-1.5 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-teal-500 outline-none appearance-none"
                              value={item.taxRate} onChange={e => updateInvItem(i, 'taxRate', Number(e.target.value))}>
                              <option value={16}>16%</option>
                              <option value={8}>8%</option>
                              <option value={0}>0% Exento</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" max="100"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-right text-white focus:ring-1 focus:ring-teal-500 outline-none"
                              value={item.discount} onChange={e => updateInvItem(i, 'discount', Number(e.target.value))} />
                          </td>
                          <td className="px-2 py-2 text-right font-medium text-white text-[11px]">{fmt(calcLine(item))}</td>
                          <td className="px-1 py-2 text-center">
                            {invoiceItems.length > 1 && (
                              <button type="button" onClick={() => removeInvItem(i)} className="text-red-400 hover:text-red-600">×</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-3">
                  <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl px-5 py-3 text-right">
                    <p className="text-[10px] text-teal-400 font-bold uppercase tracking-wider mb-1">Total Factura</p>
                    <p className="text-2xl font-black text-teal-400">{fmt(totalInvoice, invoiceForm.currencyCode)}</p>
                    {selectedClient?.isIvaAgent && (
                      <p className="text-[10px] text-orange-400 mt-1 font-bold uppercase tracking-wider">
                        Ret. IVA (75%): -{fmt(totalInvoice * 0.16 * 0.75, invoiceForm.currencyCode)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-gray-400 hover:bg-white/5 rounded-xl text-sm transition-colors font-medium">Cancelar</button>
                <button type="submit" disabled={savingInv}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-800 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-500/20 transition-colors">
                  {savingInv ? 'Emitiendo...' : '✓ Emitir Factura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL REGISTRAR COBRO ────────────────────────────── */}
      {showPayModal && payingInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1F2C] rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-white/10">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <DollarSign size={20} className="text-green-400" /> Registrar Cobro
            </h2>
            <p className="text-sm text-gray-400 mb-5">Factura: <span className="font-mono font-bold text-teal-400">{payingInvoice.invoiceNumber}</span></p>

            {/* Resumen de montos */}
            <div className="bg-white/5 rounded-xl p-4 mb-5 border border-white/10 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Total Factura</p>
                <p className="font-bold text-white">{fmt(Number(payingInvoice.totalAmount), payingInvoice.currencyCode)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Retenciones</p>
                <p className="font-bold text-orange-400">
                  -{fmt(Number(payingInvoice.retentionIVA) + Number(payingInvoice.retentionISLR), payingInvoice.currencyCode)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Neto a Cobrar</p>
                <p className="font-bold text-green-400">
                  {fmt(Number(payingInvoice.totalAmount) - Number(payingInvoice.retentionIVA) - Number(payingInvoice.retentionISLR) - Number(payingInvoice.paidAmount), payingInvoice.currencyCode)}
                </p>
              </div>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Método de Pago *</label>
                  <select required className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-green-500 outline-none appearance-none"
                    value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                    <option value="TRANSFER_USD">Transferencia USD</option>
                    <option value="TRANSFER_VES">Transferencia VES</option>
                    <option value="ZELLE">Zelle (USD sin IGTF)</option>
                    <option value="CASH_USD">Efectivo USD ⚠️ IGTF 3%</option>
                    <option value="CASH_VES">Efectivo VES</option>
                    <option value="PAGO_MOVIL">Pago Móvil</option>
                  </select>
                  {payForm.method === 'CASH_USD' && (
                    <p className="text-[10px] text-orange-400 mt-1 font-bold uppercase tracking-wider">IGTF 3% será autocalculado</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Monto Recibido *</label>
                  <input required type="number" step="0.01" min="0.01"
                    className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-green-500 outline-none"
                    value={payForm.amountApplied}
                    onChange={e => setPayForm(f => ({ ...f, amountApplied: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Referencia</label>
                  <input className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-green-500 outline-none placeholder-gray-600"
                    placeholder="Nro. de confirmación..."
                    value={payForm.reference}
                    onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Banco</label>
                  <input className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-green-500 outline-none placeholder-gray-600"
                    placeholder="Banco emisor..."
                    value={payForm.bankName}
                    onChange={e => setPayForm(f => ({ ...f, bankName: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setShowPayModal(false)} className="px-5 py-2.5 text-gray-400 hover:bg-white/5 rounded-xl text-sm transition-colors font-medium">Cancelar</button>
                <button type="submit" disabled={savingPay}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-600/20 transition-colors">
                  {savingPay ? 'Registrando...' : '✓ Confirmar Cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
