'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Receipt, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Client { id: string; name: string; rif?: string; isIvaAgent: boolean; islrRate: number; }
interface Product { id: string; name: string; code: string; isService: boolean; priceBase: number; }
interface ServiceCategory { id: string; name: string; }

interface SalesOrder {
  id: string;
  clientId: string;
  currencyCode: string;
  exchangeRate: number;
  items: Array<{
    productId?: string;
    serviceCategoryId?: string;
    description?: string;
    quantity: number | string;
    unitPrice: number | string;
    taxRate: number | string;
    discount: number | string;
  }>;
}

interface InvoiceItem {
  type: 'product' | 'service';
  productId?: string; serviceCategoryId?: string;
  description?: string;
  quantity: number; unitPrice: number; taxRate: number; discount: number;
}

function InvoiceNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [invoiceForm, setInvoiceForm] = useState({
    clientId: '', salesOrderId: orderId || '', controlNumber: '',
    currencyCode: 'USD', exchangeRate: 1,
    dueDate: '', notes: '',
  });
  
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { type: 'product', productId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 16, discount: 0 },
  ]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, s] = await Promise.all([
        apiClient.get<{ items: Client[] }>('/clients?limit=200').catch(() => ({ items: [] })),
        apiClient.get<{ items: Product[] }>('/products?limit=500').catch(() => ({ items: [] })),
        apiClient.get<ServiceCategory[]>('/service-categories').catch(() => []),
      ]);
      setClients(c.items ?? []);
      setProducts(p.items ?? []);
      setServiceCategories(s ?? []);

      if (orderId) {
        // Pre-cargar datos del pedido
        const order = await apiClient.get<SalesOrder>(`/sales-orders/${orderId}`);
        if (order) {
          setInvoiceForm(f => ({
            ...f,
            clientId: order.clientId,
            currencyCode: order.currencyCode,
            exchangeRate: Number(order.exchangeRate),
          }));
          const cl = (c.items ?? []).find((x: Client) => x.id === order.clientId) ?? null;
          setSelectedClient(cl);

          if (order.items && order.items.length > 0) {
            setInvoiceItems(
              order.items.map((it) => ({
                type: it.productId ? 'product' : 'service',
                productId: it.productId || '',
                serviceCategoryId: it.serviceCategoryId || '',
                description: it.description || '',
                quantity: Number(it.quantity),
                unitPrice: Number(it.unitPrice),
                taxRate: Number(it.taxRate),
                discount: Number(it.discount),
              }))
            );
          }
        }
      }
    } catch (e: unknown) {
      alert(`Error cargando datos: ${e instanceof Error ? e.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { loadData(); }, [loadData]);

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
        const prod = products.find(prod => prod.id === value);
        if (prod) updated.unitPrice = Number(prod.priceBase);
      }
      return updated;
    }));
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.clientId) return toast.error('Selecciona un cliente.');
    if (invoiceItems.some(i => (i.type === 'product' && !i.productId) || (i.type === 'service' && !i.serviceCategoryId))) {
      return toast.error('Cada ítem debe tener un producto o un servicio seleccionado.');
    }
    setSaving(true);
    try {
      const parsedItems = invoiceItems.map(i => {
        const { type, ...rest } = i;
        const cleanedItem: Record<string, unknown> = { ...rest };
        if (type === 'product' && i.productId) cleanedItem.productId = i.productId;
        if (type === 'service' && i.serviceCategoryId) cleanedItem.serviceCategoryId = i.serviceCategoryId;
        return cleanedItem;
      });

      const dataToSend: Record<string, unknown> = {
        ...invoiceForm,
        exchangeRate: Number(invoiceForm.exchangeRate),
        items: parsedItems,
        retIvaRate: selectedClient?.isIvaAgent ? 75 : 0,
        retISLRRate: selectedClient ? Number(selectedClient.islrRate) : 0,
      };

      if (!dataToSend.dueDate) delete dataToSend.dueDate;
      if (!dataToSend.notes) delete dataToSend.notes;
      if (!dataToSend.poNumber) delete dataToSend.poNumber;

      await apiClient.post('/sales-invoices', dataToSend);
      toast.success('Factura emitida exitosamente.');
      router.push('/dashboard/sales/invoices');
    } catch (err: unknown) {
      toast.error(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally { 
      setSaving(false); 
    }
  };

  const handleClientChange = (clientId: string) => {
    const cl = clients.find(c => c.id === clientId) ?? null;
    setSelectedClient(cl);
    setInvoiceForm(f => ({ ...f, clientId }));
  };

  const fmt = (n: number, cur = 'USD') =>
    new Intl.NumberFormat('es-VE', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(n);

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando asistente de facturación...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href={orderId ? `/dashboard/sales/orders` : `/dashboard/sales/invoices`} 
          className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all shadow-lg shadow-black/20">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Receipt className="text-teal-400" /> Nueva Factura de Venta
          </h1>
          <p className="text-sm text-gray-400 mt-1 uppercase tracking-tight font-medium">Registra facturas para generar cuentas por cobrar.</p>
        </div>
      </div>

      <form onSubmit={handleCreateInvoice} className="bg-[#1A1F2C] rounded-2xl shadow-2xl border border-white/10 p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Cliente *</label>
            <select required className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all appearance-none cursor-pointer"
              value={invoiceForm.clientId} onChange={e => handleClientChange(e.target.value)}>
              <option value="">-- Seleccionar cliente --</option>
              {clients.map(c => <option key={c.id} value={c.id} className="bg-[#1A1F2C]">{c.name} {c.rif ? `(${c.rif})` : ''}</option>)}
            </select>
            {selectedClient?.isIvaAgent && (
              <p className="text-[10px] font-bold text-orange-400 mt-2 uppercase tracking-tight">⚠️ Cliente agente de retención IVA (75% del IVA será retenido)</p>
            )}
            {selectedClient && Number(selectedClient.islrRate) > 0 && (
              <p className="text-[10px] font-bold text-orange-400 mt-1 uppercase tracking-tight">⚠️ Retención ISLR: {selectedClient.islrRate}%</p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">N° de Control (Fact. Física)</label>
            <input className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-teal-500/50 outline-none placeholder:text-gray-600 transition-all font-mono"
              placeholder="Ej: 00-123456"
              value={invoiceForm.controlNumber} onChange={e => setInvoiceForm(f => ({ ...f, controlNumber: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Moneda</label>
            <select className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-teal-500/50 outline-none appearance-none cursor-pointer"
              value={invoiceForm.currencyCode} onChange={e => setInvoiceForm(f => ({ ...f, currencyCode: e.target.value }))}>
              <option value="USD" className="bg-[#1A1F2C]">USD — Dólar</option>
              <option value="VES" className="bg-[#1A1F2C]">VES — Bolívar</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Fecha de Vencimiento</label>
            <input type="date" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-teal-500/50 outline-none color-scheme-dark"
              style={{ colorScheme: 'dark' }}
              value={invoiceForm.dueDate} onChange={e => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">N° Pedido Interno (Referencia)</label>
            <input className="w-full bg-[#0B1120]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-teal-400 focus:ring-2 focus:ring-teal-500/50 outline-none font-mono"
              readOnly={!!orderId} placeholder="ID del SalesOrder..."
              value={invoiceForm.salesOrderId} onChange={e => setInvoiceForm(f => ({ ...f, salesOrderId: e.target.value }))} />
          </div>
        </div>

        {/* Ítems */}
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <h3 className="font-bold text-white text-lg">Ítems de Factura</h3>
            <button type="button" onClick={addInvItem}
              className="text-[10px] font-bold uppercase tracking-widest border border-teal-500/20 text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 rounded-xl px-4 py-2 flex items-center gap-1.5 transition-all shadow-lg shadow-teal-500/5">
              <Plus size={15} /> Agregar línea
            </button>
          </div>
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5 shadow-inner">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-[10px] text-gray-500 uppercase font-black tracking-widest">
                <tr>
                  <th className="px-4 py-4 text-left w-28">Tipo</th>
                  <th className="px-4 py-4 text-left w-[35%]">Producto / Servicio</th>
                  <th className="px-4 py-4 text-right w-24">Cant.</th>
                  <th className="px-4 py-4 text-right w-32">Precio</th>
                  <th className="px-4 py-4 text-right w-24">IVA %</th>
                  <th className="px-4 py-4 text-right w-24">Desc %</th>
                  <th className="px-4 py-4 text-right w-32">Total</th>
                  <th className="px-3 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoiceItems.map((item, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors group">
                    <td className="px-3 py-3">
                       <select className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all appearance-none cursor-pointer"
                         value={item.type} onChange={e => {
                           updateInvItem(i, 'type', e.target.value);
                           updateInvItem(i, 'productId', '');
                           updateInvItem(i, 'serviceCategoryId', '');
                         }}>
                         <option value="product" className="bg-[#1A1F2C]">Producto</option>
                         <option value="service" className="bg-[#1A1F2C]">Servicio</option>
                       </select>
                    </td>
                    <td className="px-3 py-3">
                      {item.type === 'product' ? (
                        <select required className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all appearance-none cursor-pointer"
                          value={item.productId || ''} onChange={e => updateInvItem(i, 'productId', e.target.value)}>
                          <option value="" className="bg-[#1A1F2C]">-- Seleccionar --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id} className="bg-[#1A1F2C]">{p.isService ? '🔧 ' : '📦 '}{p.name}</option>
                          ))}
                        </select>
                      ) : (
                        <select required className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all appearance-none cursor-pointer"
                          value={item.serviceCategoryId || ''} onChange={e => updateInvItem(i, 'serviceCategoryId', e.target.value)}>
                          <option value="" className="bg-[#1A1F2C]">-- Seleccionar Servicio --</option>
                          {serviceCategories.map(s => (
                            <option key={s.id} value={s.id} className="bg-[#1A1F2C]">{s.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input type="number" min="0.01" step="0.01" required
                        className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-right focus:ring-2 focus:ring-teal-500/50 outline-none font-mono"
                        value={item.quantity} onChange={e => updateInvItem(i, 'quantity', Number(e.target.value))} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input type="number" min="0" step="0.01" required
                        className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-right focus:ring-2 focus:ring-teal-500/50 outline-none font-mono"
                        value={item.unitPrice} onChange={e => updateInvItem(i, 'unitPrice', Number(e.target.value))} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <select className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-teal-500/50 outline-none appearance-none cursor-pointer"
                        value={item.taxRate} onChange={e => updateInvItem(i, 'taxRate', Number(e.target.value))}>
                        <option value={16} className="bg-[#1A1F2C]">16%</option>
                        <option value={8} className="bg-[#1A1F2C]">8%</option>
                        <option value={0} className="bg-[#1A1F2C]">0% (Exento)</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input type="number" min="0" max="100"
                        className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-right focus:ring-2 focus:ring-teal-500/50 outline-none font-mono"
                        value={item.discount} onChange={e => updateInvItem(i, 'discount', Number(e.target.value))} />
                    </td>
                    <td className="px-4 py-3 text-right font-black text-white bg-white/5 transition-all">
                      {fmt(calcLine(item), invoiceForm.currencyCode)}
                    </td>
                    <td className="px-2 py-3 text-center">
                      <button type="button" onClick={() => removeInvItem(i)} 
                        disabled={invoiceItems.length === 1}
                        className="text-red-500/60 hover:text-red-400 disabled:opacity-30 p-2 hover:bg-red-500/10 rounded-xl transition-all">
                        <Plus className="rotate-45" size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-6 text-right min-w-[300px] shadow-xl">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Factura</p>
              <p className="text-4xl font-black text-teal-400">{fmt(totalInvoice, invoiceForm.currencyCode)}</p>
              {selectedClient?.isIvaAgent && (
                <p className="text-[10px] font-bold text-orange-400 mt-2 uppercase tracking-widest border-t border-white/5 pt-2">
                  Ret. IVA (75%): -{fmt(totalInvoice * 0.16 * 0.75, invoiceForm.currencyCode)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-8 border-t border-white/10 mt-6">
          <button type="button" onClick={() => router.back()} className="px-8 py-3 text-gray-400 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest rounded-xl text-[10px] transition-all">
            Cancelar
          </button>
          <button type="submit" disabled={saving || invoiceItems.length === 0}
            className="px-10 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-teal-500/20 transition-all">
            {saving ? 'Procesando...' : '✓ Emitir Factura'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewSalesInvoicePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500">Cargando constructor de factura...</div>}>
      <InvoiceNewContent />
    </Suspense>
  );
}
