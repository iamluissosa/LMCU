'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Receipt, DollarSign, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Supplier } from '@erp/types';

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

interface ExpenseItem {
  expenseCategoryId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  islrRate: number;
}

export default function DirectPurchasePage() {
  const router = useRouter();

  // Catálogos
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);

  // Cabecera de la factura
  const [invoiceData, setInvoiceData] = useState({
    supplierId: '',
    invoiceNumber: '',
    controlNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
  });

  // Ítems de gasto
  const [items, setItems] = useState<ExpenseItem[]>([]);

  // Cargar catálogos
  useEffect(() => {
    const fetch = async () => {
      try {
        const [supRes, catRes] = await Promise.all([
          apiClient.get<{ items: Supplier[] }>('/suppliers'),
          apiClient.get<ExpenseCategory[]>('/expense-categories'),
        ]);
        setSuppliers(supRes.items || []);
        setCategories(Array.isArray(catRes) ? catRes : []);
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      }
    };
    fetch();
  }, []);

  const addLine = () => {
    setItems([...items, {
      expenseCategoryId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 16,
      islrRate: 0,
    }]);
  };

  const updateLine = (idx: number, field: keyof ExpenseItem, value: string | number) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    ));
  };

  const removeLine = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const calcSubtotal = (item: ExpenseItem) => Number(item.quantity) * Number(item.unitPrice);
  const calcTax = (item: ExpenseItem) => calcSubtotal(item) * (Number(item.taxRate) / 100);
  const calcTotal = () => items.reduce((acc, i) => acc + calcSubtotal(i) + calcTax(i), 0);
  const calcTotalBase = () => items.reduce((acc, i) => acc + calcSubtotal(i), 0);
  const calcTotalTax = () => items.reduce((acc, i) => acc + calcTax(i), 0);

  const handleSubmit = async () => {
    if (!invoiceData.supplierId) return alert('Selecciona un proveedor');
    if (!invoiceData.invoiceNumber) return alert('Ingresa el N° de Factura');
    if (items.length === 0) return alert('Agrega al menos un gasto');
    if (items.some(i => !i.description)) return alert('Todos los gastos deben tener descripción');

    setLoading(true);
    try {
      const payload = {
        ...invoiceData,
        taxableAmount: calcTotalBase(),
        taxAmount: calcTotalTax(),
        totalAmount: calcTotal(),
        items: items.map(i => ({
          expenseCategoryId: i.expenseCategoryId || undefined,
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          taxRate: Number(i.taxRate),
          islrRate: Number(i.islrRate),
          totalLine: calcSubtotal(i),
        })),
      };

      await apiClient.post('/bills/direct', payload);
      alert('✅ Gasto registrado correctamente. No se afectó el inventario.');
      router.push('/dashboard/accounting/bills');
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error(e);
      alert(`❌ Error: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Receipt className="text-orange-500" /> Registro de Gasto (Compra Directa)
          </h1>
          <p className="text-gray-500 text-sm mt-1">Servicios, suministros y gastos operativos — <strong>No afecta el inventario</strong></p>
        </div>
        <button onClick={() => router.push('/dashboard/accounting/bills')}
          className="text-gray-500 hover:text-gray-700 text-sm underline">
          Volver a Facturas
        </button>
      </div>

      {/* AVISO */}
      <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-orange-500" />
        <div>
          <strong>Compra de Gastos:</strong> Esta factura registra un gasto operativo (alquiler, servicios, honorarios, papelería, etc.).
          El stock del almacén <strong>no se modifica</strong>. Para mercancía que entra al inventario, usa el flujo de Orden de Compra.
        </div>
      </div>

      {/* CABECERA */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Datos de la Factura</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor *</label>
            <select className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none"
              value={invoiceData.supplierId}
              onChange={e => setInvoiceData({ ...invoiceData, supplierId: e.target.value })}>
              <option value="">Selecciona...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">N° Factura *</label>
            <input type="text" className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none"
              placeholder="Ej: 000451"
              value={invoiceData.invoiceNumber}
              onChange={e => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">N° Control</label>
            <input type="text" className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none"
              placeholder="00-..."
              value={invoiceData.controlNumber}
              onChange={e => setInvoiceData({ ...invoiceData, controlNumber: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Emisión *</label>
            <input type="date" className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none"
              value={invoiceData.issueDate}
              onChange={e => setInvoiceData({ ...invoiceData, issueDate: e.target.value })} />
          </div>
        </div>
      </div>

      {/* TABLA DE GASTOS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-700">Detalle de Gastos</h2>
          <button onClick={addLine}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={16} /> Añadir Gasto
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600 font-semibold">
              <tr>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3 w-20">Cant.</th>
                <th className="px-4 py-3 w-28">Precio ($)</th>
                <th className="px-4 py-3 w-28">Alíc. IVA</th>
                <th className="px-4 py-3 text-right w-28">Subtotal</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <select
                      className="w-full border rounded p-1 text-xs focus:ring-1 focus:ring-orange-300 outline-none min-w-[140px]"
                      value={item.expenseCategoryId}
                      onChange={e => updateLine(idx, 'expenseCategoryId', e.target.value)}>
                      <option value="">Sin categoría</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="w-full border rounded p-1 text-xs focus:ring-1 focus:ring-orange-300 outline-none min-w-[180px]"
                      placeholder="Ej: Pago CORPOELEC Febrero 2026"
                      value={item.description}
                      onChange={e => updateLine(idx, 'description', e.target.value)} />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min="0.01" step="any"
                      className="w-full border rounded p-1 text-center font-bold focus:ring-1 focus:ring-orange-300 outline-none"
                      value={item.quantity}
                      onChange={e => updateLine(idx, 'quantity', e.target.value)} />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min="0" step="any"
                      className="w-full border rounded p-1 text-right focus:ring-1 focus:ring-orange-300 outline-none"
                      value={item.unitPrice}
                      onChange={e => updateLine(idx, 'unitPrice', e.target.value)} />
                  </td>
                  <td className="px-4 py-2">
                    <select className="w-full border rounded p-1 text-xs focus:ring-1 focus:ring-orange-300 outline-none"
                      value={item.taxRate}
                      onChange={e => updateLine(idx, 'taxRate', Number(e.target.value))}>
                      <option value={16}>16% (G)</option>
                      <option value={8}>8% (R)</option>
                      <option value={0}>Exento</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-800 font-medium">
                    ${(calcSubtotal(item) + calcTax(item)).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => removeLine(idx)}
                      className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400 text-sm">
                    <DollarSign size={28} className="mx-auto mb-2 text-gray-300" />
                    Añade gastos para comenzar...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TOTALES */}
        {items.length > 0 && (
          <div className="p-5 border-t border-gray-100 flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Base Imponible:</span>
                <span className="font-mono">${calcTotalBase().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA:</span>
                <span className="font-mono">${calcTotalTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-800 text-base border-t pt-2">
                <span>Total Gasto:</span>
                <span className="font-mono text-orange-600">${calcTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTÓN GUARDAR */}
      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={loading}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all active:scale-95">
          <Receipt size={18} />
          {loading ? 'Registrando...' : 'Registrar Gasto'}
        </button>
      </div>
    </div>
  );
}
