'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Receipt, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

interface Client { id: string; name: string; rif?: string; isIvaAgent: boolean; islrRate: number; }
interface Product { id: string; name: string; code: string; isService: boolean; priceBase: number; }
interface ServiceCategory { id: string; name: string; }

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
        apiClient.get<any>('/clients?limit=200').catch(() => ({ items: [] })),
        apiClient.get<any>('/products?limit=500').catch(() => ({ items: [] })),
        apiClient.get<ServiceCategory[]>('/service-categories').catch(() => []),
      ]);
      setClients(c.items ?? c ?? []);
      setProducts(p.items ?? p ?? []);
      setServiceCategories(s ?? []);

      if (orderId) {
        // Pre-cargar datos del pedido
        const order = await apiClient.get<any>(`/sales-orders/${orderId}`);
        if (order) {
          setInvoiceForm(f => ({
            ...f,
            clientId: order.clientId,
            currencyCode: order.currencyCode,
            exchangeRate: Number(order.exchangeRate),
          }));
          const cl = (c.items ?? c ?? []).find((x: Client) => x.id === order.clientId) ?? null;
          setSelectedClient(cl);

          if (order.items && order.items.length > 0) {
            setInvoiceItems(
              order.items.map((it: any) => ({
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
    } catch (e: any) {
      alert(`Error cargando datos: ${e.message}`);
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
    if (!invoiceForm.clientId) return alert('Selecciona un cliente.');
    if (invoiceItems.some(i => (i.type === 'product' && !i.productId) || (i.type === 'service' && !i.serviceCategoryId))) {
      return alert('Cada ítem debe tener un producto o un servicio seleccionado.');
    }
    setSaving(true);
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
      alert('Factura emitida exitosamente.');
      router.push('/dashboard/sales/invoices');
    } catch (err: any) {
      alert(`Error: ${err.message || 'Error desconocido'}`);
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={orderId ? `/dashboard/sales/orders` : `/dashboard/sales/invoices`} 
          className="p-2 bg-white border rounded-xl hover:bg-gray-50 text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Receipt className="text-teal-600" /> Nueva Factura de Venta
          </h1>
          <p className="text-sm text-gray-500 mt-1">Registra facturas para generar cuentas por cobrar.</p>
        </div>
      </div>

      <form onSubmit={handleCreateInvoice} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cliente *</label>
            <select required className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-300 outline-none"
              value={invoiceForm.clientId} onChange={e => handleClientChange(e.target.value)}>
              <option value="">-- Seleccionar cliente --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.rif ? `(${c.rif})` : ''}</option>)}
            </select>
            {selectedClient?.isIvaAgent && (
              <p className="text-xs text-orange-600 mt-1">⚠️ Cliente agente de retención IVA (75% del IVA será retenido)</p>
            )}
            {selectedClient && Number(selectedClient.islrRate) > 0 && (
              <p className="text-xs text-orange-600">⚠️ Retención ISLR: {selectedClient.islrRate}%</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">N° de Control (Fact. Física)</label>
            <input className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-300 outline-none"
              placeholder="Ej: 00-123456"
              value={invoiceForm.controlNumber} onChange={e => setInvoiceForm(f => ({ ...f, controlNumber: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Moneda</label>
            <select className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-300 outline-none"
              value={invoiceForm.currencyCode} onChange={e => setInvoiceForm(f => ({ ...f, currencyCode: e.target.value }))}>
              <option value="USD">USD — Dólar</option>
              <option value="VES">VES — Bolívar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de Vencimiento (opcional)</label>
            <input type="date" className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-300 outline-none"
              value={invoiceForm.dueDate} onChange={e => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">N° Pedido Interno (Referencia)</label>
            <input className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-300 outline-none bg-gray-50"
              readOnly={!!orderId} placeholder="ID del SalesOrder..."
              value={invoiceForm.salesOrderId} onChange={e => setInvoiceForm(f => ({ ...f, salesOrderId: e.target.value }))} />
          </div>
        </div>

        {/* Ítems */}
        <div>
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <h3 className="font-semibold text-gray-800 text-lg">Ítems de Factura</h3>
            <button type="button" onClick={addInvItem}
              className="text-sm border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg px-3 py-1.5 font-medium flex items-center gap-1 transition-colors">
              <Plus size={15} /> Agregar línea
            </button>
          </div>
          <div className="border rounded-xl mx-auto w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-3 text-left w-24">Tipo</th>
                  <th className="px-3 py-3 text-left w-[35%]">Producto / Servicio</th>
                  <th className="px-3 py-3 text-right w-20">Cant.</th>
                  <th className="px-3 py-3 text-right w-24">Precio</th>
                  <th className="px-3 py-3 text-right w-20">IVA %</th>
                  <th className="px-3 py-3 text-right w-20">Desc %</th>
                  <th className="px-3 py-3 text-right w-28">Total</th>
                  <th className="px-2 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoiceItems.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 py-2">
                       <select className="w-full border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none"
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
                        <select required className="w-full border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none"
                          value={item.productId || ''} onChange={e => updateInvItem(i, 'productId', e.target.value)}>
                          <option value="">-- Seleccionar --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.isService ? '🔧 ' : '📦 '}{p.name}</option>
                          ))}
                        </select>
                      ) : (
                        <select required className="w-full border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none"
                          value={item.serviceCategoryId || ''} onChange={e => updateInvItem(i, 'serviceCategoryId', e.target.value)}>
                          <option value="">-- Seleccionar Servicio --</option>
                          {serviceCategories.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0.01" step="0.01" required
                        className="w-full border rounded-lg px-2 py-2 text-sm text-right focus:ring-2 focus:ring-teal-300 outline-none"
                        value={item.quantity} onChange={e => updateInvItem(i, 'quantity', Number(e.target.value))} />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" step="0.01" required
                        className="w-full border rounded-lg px-2 py-2 text-sm text-right focus:ring-2 focus:ring-teal-300 outline-none"
                        value={item.unitPrice} onChange={e => updateInvItem(i, 'unitPrice', Number(e.target.value))} />
                    </td>
                    <td className="px-2 py-2">
                      <select className="w-full border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none"
                        value={item.taxRate} onChange={e => updateInvItem(i, 'taxRate', Number(e.target.value))}>
                        <option value={16}>16%</option>
                        <option value={8}>8%</option>
                        <option value={0}>0% (Exento)</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" max="100"
                        className="w-full border rounded-lg px-2 py-2 text-sm text-right focus:ring-2 focus:ring-teal-300 outline-none"
                        value={item.discount} onChange={e => updateInvItem(i, 'discount', Number(e.target.value))} />
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-gray-800 bg-white">
                      {fmt(calcLine(item), invoiceForm.currencyCode)}
                    </td>
                    <td className="px-1 py-2 text-center">
                      <button type="button" onClick={() => removeInvItem(i)} 
                        disabled={invoiceItems.length === 1}
                        className="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-red-400 p-1.5 hover:bg-red-50 rounded-lg">
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="bg-teal-50/50 border border-teal-100 rounded-xl px-6 py-4 text-right min-w-[250px]">
              <p className="text-sm text-gray-500 mb-1">Total Factura</p>
              <p className="text-3xl font-bold text-teal-800">{fmt(totalInvoice, invoiceForm.currencyCode)}</p>
              {selectedClient?.isIvaAgent && (
                <p className="text-xs text-orange-600 mt-2 font-medium">
                  Ret. IVA (75%): -{fmt(totalInvoice * 0.16 * 0.75, invoiceForm.currencyCode)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
          <button type="button" onClick={() => router.back()} className="px-6 py-3 text-gray-600 hover:bg-gray-100 font-medium rounded-xl text-sm transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving || invoiceItems.length === 0}
            className="px-8 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-sm transition-colors">
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
