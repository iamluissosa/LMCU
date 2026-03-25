'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Receipt, DollarSign, Plus, Trash2, AlertCircle, Tag, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Supplier } from '@erp/types';

interface IslrConceptRef {
  id: string;
  code: string;
  description: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  islrConceptId?: string | null;
  islrConcept?: IslrConceptRef | null;
}

interface Department {
  id: string;
  code: string;
  name: string;
}

type DiscountType = 'PERCENT' | 'FIXED_USD' | 'FIXED_VES';

interface ExpenseItem {
  expenseCategoryId: string;
  departmentId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  islrRate: number;
  // Descuento
  discountType: DiscountType;
  discountValue: number;
}

interface IslrPreview {
  taxableBase: number;
  percentage: number;
  sustraendo: number;
  retainedAmount: number;
  conceptCode: string;
  conceptDescription: string;
  message?: string;
}

export default function DirectPurchasePage() {
  const router = useRouter();

  // Catálogos
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  // Cabecera de la factura
  const [invoiceData, setInvoiceData] = useState({
    supplierId: '',
    invoiceNumber: '',
    controlNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    exchangeRate: 1, // Tasa de cambio Bs/USD — necesaria para descuentos en VES
    currencyCode: 'USD', // Por defecto USD, cambia según proveedor
  });

  // Ítems de gasto
  const [items, setItems] = useState<ExpenseItem[]>([]);

  // Preview ISLR
  const [islrPreview, setIslrPreview] = useState<IslrPreview | null>(null);
  const [islrCalculating, setIslrCalculating] = useState(false);

  // Cargar catálogos y tasa BCV
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [supRes, catRes, dptRes] = await Promise.all([
          apiClient.get<{ items: Supplier[] }>('/suppliers'),
          apiClient.get<ExpenseCategory[]>('/expense-categories'),
          apiClient.get<Department[]>('/departments'),
        ]);
        setSuppliers(supRes.items || []);
        setCategories(Array.isArray(catRes) ? catRes : []);
        setDepartments(Array.isArray(dptRes) ? dptRes : []);
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      }

      // Cargar tasa BCV del día
      try {
        const rateData = await apiClient.get<{ rate: number }>('/exchange-rates/latest');
        if (rateData?.rate) {
          setInvoiceData(prev => ({ ...prev, exchangeRate: Number(rateData.rate) }));
        }
      } catch {
        // Si no hay tasa disponible, se quedará en 1
      }
    };
    fetchData();
  }, []);

  const addLine = () => {
    setItems([...items, {
      expenseCategoryId: '',
      departmentId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 16,
      islrRate: 0,
      discountType: 'PERCENT',
      discountValue: 0,
    }]);
  };

  const updateLine = (idx: number, field: keyof ExpenseItem, value: string | number) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    ));
    // Limpiar preview si cambian datos relevantes
    if (['expenseCategoryId', 'unitPrice', 'quantity', 'discountValue'].includes(field)) {
      setIslrPreview(null);
    }
  };

  const removeLine = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  // ─── Funciones de Cálculo ────────────────────────────────────────────────
  /** Monto bruto de la línea antes del descuento */
  const calcBruto = (item: ExpenseItem) =>
    Number(item.quantity) * Number(item.unitPrice);

  /**
   * Descuento en la moneda ACTIVA de la factura (USD o VES).
   * - PERCENT:    porcentaje sobre el bruto, ya está en la moneda correcta.
   * - FIXED_USD:  el usuario ingresó un monto en USD.
   *               Si la factura es en VES → convertimos a Bs. multiplcándolo por la tasa.
   *               Si la factura es en USD → se usa directamente.
   * - FIXED_VES:  el usuario ingresó un monto en Bs.
   *               Si la factura es en USD → convertimos a USD divid. por la tasa.
   *               Si la factura es en VES → se usa directamente.
   */
  const calcDiscount = (item: ExpenseItem): number => {
    const bruto = calcBruto(item);
    const val   = Number(item.discountValue);
    if (!val || val <= 0) return 0;
    const isVES = invoiceData.currencyCode === 'VES';
    const rate  = invoiceData.exchangeRate > 0 ? invoiceData.exchangeRate : 1;

    switch (item.discountType) {
      case 'PERCENT':   return bruto * (val / 100);          // siempre en moneda activa
      case 'FIXED_USD': return isVES ? val * rate : val;     // si la factura es Bs, convertir
      case 'FIXED_VES': return isVES ? val : val / rate;     // si la factura es USD, convertir
      default: return 0;
    }
  };

  /** Base neta de la línea (después del descuento, sin IVA) */
  const calcBase = (item: ExpenseItem) =>
    Math.max(0, calcBruto(item) - calcDiscount(item));

  /** IVA sobre la base neta */
  const calcTax = (item: ExpenseItem) =>
    calcBase(item) * (Number(item.taxRate) / 100);

  /** Total de la línea (base + IVA) */
  const calcLineTotal = (item: ExpenseItem) => calcBase(item) + calcTax(item);

  // Totales globales
  const calcTotalBase    = () => items.reduce((acc, i) => acc + calcBase(i), 0);
  const calcTotalTax     = () => items.reduce((acc, i) => acc + calcTax(i), 0);
  const calcTotalDiscount= () => items.reduce((acc, i) => acc + calcDiscount(i), 0);
  const calcTotal        = () => items.reduce((acc, i) => acc + calcLineTotal(i), 0);

  // ─── Label visual del tipo de descuento ─────────────────────────────────
  const discountLabel = (type: DiscountType) =>
    ({ PERCENT: '%', FIXED_USD: 'USD', FIXED_VES: 'VES' })[type];

  // ─── ISLR Preview Calculation ────────────────────────────────────────
  const getIslrAffectedItems = () => {
    return items.filter(item => {
      const cat = categories.find(c => c.id === item.expenseCategoryId);
      return cat?.islrConcept && calcBase(item) > 0;
    });
  };

  const calculateIslrPreview = async () => {
    if (!invoiceData.supplierId) return;
    const affectedItems = getIslrAffectedItems();
    if (affectedItems.length === 0) return;

    // Tomar el primer concepto ISLR encontrado (las líneas pueden tener el mismo)
    const firstItem = affectedItems[0];
    if (!firstItem) return;
    const firstCat = categories.find(c => c.id === firstItem.expenseCategoryId);
    if (!firstCat?.islrConcept) return;

    // Sumar bases imponibles de todas las líneas con ese concepto
    const totalBase = affectedItems.reduce((acc, item) => acc + calcBase(item), 0);

    setIslrCalculating(true);
    try {
      const result = await apiClient.post<IslrPreview>('/islr/calculate', {
        taxableBase: totalBase,
        conceptId: firstCat.islrConcept.id,
        supplierId: invoiceData.supplierId,
      });
      setIslrPreview({
        ...result,
        conceptCode: firstCat.islrConcept.code,
        conceptDescription: firstCat.islrConcept.description,
      });
    } catch (e: unknown) {
      const err = e as { message?: string };
      alert(`Error calculando ISLR: ${err.message || 'Error desconocido'}`);
    } finally {
      setIslrCalculating(false);
    }
  };

  const hasIslrItems = getIslrAffectedItems().length > 0;

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!invoiceData.supplierId) return alert('Selecciona un proveedor');
    if (!invoiceData.invoiceNumber) return alert('Ingresa el N° de Factura');
    if (items.length === 0) return alert('Agrega al menos un gasto');
    if (items.some(i => !i.description)) return alert('Todos los gastos deben tener descripción');

    setLoading(true);
    try {
      const payload = {
        supplierId:    invoiceData.supplierId,
        invoiceNumber: invoiceData.invoiceNumber,
        controlNumber: invoiceData.controlNumber,
        issueDate:     invoiceData.issueDate,
        exchangeRate:  invoiceData.exchangeRate,
        currencyCode:  invoiceData.currencyCode,
        // Totales calculados post-descuento
        taxableAmount: calcTotalBase(),
        taxAmount:     calcTotalTax(),
        totalAmount:   calcTotal(),
        items: items.map(i => ({
          expenseCategoryId: i.expenseCategoryId || undefined,
          departmentId:      i.departmentId || undefined,
          description:       i.description,
          quantity:          Number(i.quantity),
          unitPrice:         Number(i.unitPrice),
          taxRate:           Number(i.taxRate),
          islrRate:          Number(i.islrRate),
          discountType:      i.discountValue > 0 ? i.discountType : undefined,
          discountValue:     i.discountValue > 0 ? Number(i.discountValue) : undefined,
          totalLine:         calcBase(i), // Base neta (sin IVA)
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
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Receipt className="text-orange-400" /> Registro de Gasto
          </h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-tight font-medium">
            Compra Directa · Servicios y Suministros · <strong className="text-orange-400/80">No afecta inventario</strong>
          </p>
        </div>
        <button onClick={() => router.push('/dashboard/accounting/bills')}
          className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-all">
          Volver a Facturas
        </button>
      </div>

      {/* AVISO */}
      <div className="flex items-start gap-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl p-5 text-sm text-orange-200 shadow-xl shadow-orange-500/5">
        <AlertCircle size={22} className="mt-0.5 shrink-0 text-orange-400" />
        <div>
          <strong className="text-orange-400 uppercase tracking-widest text-[10px] block mb-1">Nota Importante:</strong>
          Esta factura registra un gasto operativo (alquiler, servicios, honorarios, etc.).
          El stock del almacén <strong className="text-white">no se modificará</strong>.
          Para mercancía de inventario, usa el flujo de Orden de Compra.
        </div>
      </div>

      {/* CABECERA */}
      <div className="bg-[#1A1F2C] p-8 rounded-2xl shadow-2xl border border-white/10">
        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">
          Datos Fiscales de la Factura
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Proveedor *</label>
            <select
              className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-orange-500/50 outline-none appearance-none cursor-pointer transition-all"
              onChange={e => {
                const suppId = e.target.value;
                const supplier = suppliers.find(s => s.id === suppId);
                // Predeterminar moneda según preferencia del proveedor
                let newCurrency = invoiceData.currencyCode;
                if (supplier) {
                  if (supplier.currencyPref === 'USD') newCurrency = 'USD';
                  else if (supplier.currencyPref === 'VES') newCurrency = 'VES';
                  else if (supplier.currencyPref === 'MULTI') newCurrency = 'USD'; // default
                }
                setInvoiceData({ ...invoiceData, supplierId: suppId, currencyCode: newCurrency });
              }}>
              <option value="">Selecciona...</option>
              {suppliers.map(s => <option key={s.id} value={s.id} className="bg-[#1A1F2C]">{s.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Moneda Factura *</label>
            <select
              className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-orange-500/50 outline-none appearance-none cursor-pointer transition-all"
              value={invoiceData.currencyCode}
              onChange={e => setInvoiceData({ ...invoiceData, currencyCode: e.target.value })}>
              <option value="USD" className="bg-[#1A1F2C]">Dólares (USD)</option>
              <option value="VES" className="bg-[#1A1F2C]">Bolívares (VES)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">N° Factura *</label>
            <input type="text"
              className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-orange-500/50 outline-none placeholder:text-gray-600 transition-all font-mono"
              placeholder="Ej: 000451"
              value={invoiceData.invoiceNumber}
              onChange={e => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">N° Control</label>
            <input type="text"
              className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-orange-500/50 outline-none placeholder:text-gray-600 transition-all font-mono"
              placeholder="00-..."
              value={invoiceData.controlNumber}
              onChange={e => setInvoiceData({ ...invoiceData, controlNumber: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Fecha Emisión *</label>
            <input type="date"
              className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
              style={{ colorScheme: 'dark' }}
              value={invoiceData.issueDate}
              onChange={e => setInvoiceData({ ...invoiceData, issueDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
              Tasa Bs/USD
              <span className="bg-emerald-500/10 text-emerald-400 text-[8px] px-1.5 py-0.5 rounded-full font-black ml-1">BCV</span>
            </label>
            <input type="number" step="0.01" min="0"
              className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono font-black focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
              placeholder="Ej: 88.50"
              value={invoiceData.exchangeRate}
              onChange={e => setInvoiceData({ ...invoiceData, exchangeRate: Number(e.target.value) })} />
            <p className="text-[9px] text-gray-600 mt-1 font-medium">Requerida para descuentos en Bs.</p>
          </div>
        </div>
      </div>

      {/* TABLA DE GASTOS */}
      <div className="bg-[#1A1F2C] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-lg font-black text-white tracking-tight uppercase flex items-center gap-2">
            Detalle de Gastos
          </h2>
          <button onClick={addLine}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg shadow-orange-600/20">
            <Plus size={16} /> Añadir Línea
          </button>
        </div>

        <div className="overflow-x-auto pb-4">
          <table className="w-full text-sm text-left min-w-[1050px]">
            <thead className="bg-white/5 text-[10px] uppercase text-gray-500 font-black tracking-widest">
              <tr>
                <th className="px-3 py-4 w-[12%]">Categoría</th>
                <th className="px-3 py-4 w-[12%]">Centro de Costo</th>
                <th className="px-3 py-4 w-[20%]">Descripción del Gasto</th>
                <th className="px-3 py-4 w-[8%] text-center">Cant.</th>
                <th className="px-3 py-4 w-[15%] text-right">Precio ({invoiceData.currencyCode === 'VES' ? 'Bs' : '$'})</th>
                <th className="px-3 py-4 w-[10%] text-center">IVA (%)</th>
                <th className="px-3 py-4 w-[17%]">
                  <span className="flex items-center gap-1 justify-center text-amber-400/80">
                    <Tag size={11} /> Descuento
                  </span>
                </th>
                <th className="px-3 py-4 text-right w-[10%]">Subtotal</th>
                <th className="px-2 py-4 w-[5%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item, idx) => {
                const bruto    = calcBruto(item);
                const discount = calcDiscount(item);
                const lineTotal = calcLineTotal(item);

                return (
                  <tr key={idx} className="hover:bg-white/[0.02] group transition-colors">
                    {/* Categoría */}
                    <td className="px-3 py-3">
                      <select
                        className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-orange-500/50 outline-none appearance-none cursor-pointer"
                        value={item.expenseCategoryId}
                        onChange={e => updateLine(idx, 'expenseCategoryId', e.target.value)}>
                        <option value="" className="bg-[#1A1F2C]">Sin categoría</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id} className="bg-[#1A1F2C]">
                            {c.name}{c.islrConcept ? ` ⚡ ISLR ${c.islrConcept.code}` : ''}
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const cat = categories.find(c => c.id === item.expenseCategoryId);
                        if (cat?.islrConcept) {
                          return (
                            <div className="mt-1 flex items-center gap-1">
                              <ShieldCheck size={10} className="text-blue-400" />
                              <span className="text-[9px] text-blue-400 font-bold">
                                ISLR {cat.islrConcept.code}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </td>
                    {/* Departamento */}
                    <td className="px-3 py-3">
                      <select
                        className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-orange-500/50 outline-none appearance-none cursor-pointer"
                        value={item.departmentId || ''}
                        onChange={e => updateLine(idx, 'departmentId', e.target.value)}>
                        <option value="" className="bg-[#1A1F2C]">Sin C.C.</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id} className="bg-[#1A1F2C]">
                            {d.code} - {d.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* Descripción */}
                    <td className="px-3 py-3">
                      <input type="text"
                        className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-700 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all"
                        placeholder="Ej: Pago CORPOELEC"
                        value={item.description}
                        onChange={e => updateLine(idx, 'description', e.target.value)} />
                    </td>
                    {/* Cantidad - UI Mejorada */}
                    <td className="px-3 py-3">
                      <div className="bg-[#242b3d] border border-white/20 hover:border-orange-500/50 focus-within:border-orange-500/80 focus-within:ring-2 focus-within:ring-orange-500/20 rounded-xl overflow-hidden transition-all shadow-inner">
                        <input type="number" min="0.01" step="any"
                          className="w-full bg-transparent px-2 py-2 text-center font-black text-orange-400 outline-none transition-all"
                          value={item.quantity}
                          onChange={e => updateLine(idx, 'quantity', e.target.value)} />
                      </div>
                    </td>
                    {/* Precio - UI Mejorada */}
                    <td className="px-3 py-3">
                      <div className="bg-[#242b3d] border border-white/20 hover:border-orange-500/50 focus-within:border-orange-500/80 focus-within:ring-2 focus-within:ring-orange-500/20 rounded-xl overflow-hidden transition-all shadow-inner flex items-center pr-2">
                        <span className="pl-3 text-xs text-gray-400 font-bold shrink-0 w-8">{invoiceData.currencyCode === 'VES' ? 'Bs' : '$'}</span>
                        <input type="number" min="0" step="any"
                          className="w-full bg-transparent px-2 py-2 text-right text-white font-mono outline-none transition-all"
                          value={item.unitPrice}
                          onChange={e => updateLine(idx, 'unitPrice', e.target.value)} />
                      </div>
                    </td>
                    {/* IVA */}
                    <td className="px-3 py-3">
                      <select
                        className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-2 py-2 text-xs text-gray-300 focus:ring-1 focus:ring-orange-500/50 outline-none appearance-none cursor-pointer transition-all min-w-[70px] text-center"
                        value={item.taxRate}
                        onChange={e => updateLine(idx, 'taxRate', Number(e.target.value))}>
                        <option value={16} className="bg-[#1A1F2C]">16%</option>
                        <option value={8}  className="bg-[#1A1F2C]">8%</option>
                        <option value={0}  className="bg-[#1A1F2C]">0%</option>
                      </select>
                    </td>
                    {/* ─── DESCUENTO ─── */}
                    <td className="px-3 py-3">
                      <div className="flex items-stretch gap-1">
                        {/* Selector de tipo */}
                        <select
                          className="bg-[#0B1120] border border-amber-500/20 rounded-xl px-2 py-2 text-[10px] text-amber-400 font-black focus:ring-1 focus:ring-amber-500/50 outline-none appearance-none cursor-pointer transition-all w-16 text-center"
                          value={item.discountType}
                          onChange={e => updateLine(idx, 'discountType', e.target.value as DiscountType)}
                          title="Tipo de descuento">
                          <option value="PERCENT"   className="bg-[#1A1F2C]">%</option>
                          <option value="FIXED_USD" className="bg-[#1A1F2C]">$</option>
                          <option value="FIXED_VES" className="bg-[#1A1F2C]">Bs</option>
                        </select>
                        {/* Input del valor */}
                        <div className="flex-1 bg-[#0B1120] border border-amber-500/20 hover:border-amber-500/50 focus-within:border-amber-500/80 focus-within:ring-2 focus-within:ring-amber-500/20 rounded-xl overflow-hidden transition-all shadow-inner">
                          <input type="number" min="0" step="any"
                            className="w-full h-full bg-transparent px-2 py-2 text-xs text-amber-300 font-mono outline-none transition-all text-center min-w-[50px]"
                            placeholder="0"
                            value={item.discountValue === 0 ? '' : item.discountValue}
                            onChange={e => updateLine(idx, 'discountValue', e.target.value)} />
                        </div>
                      </div>
                      {/* Indicador del descuento calculado */}
                      {discount > 0 && (
                        <div className="mt-1 text-center">
                          <span className="text-[9px] text-amber-400/70 font-mono">
                            -{invoiceData.currencyCode === 'VES' ? 'Bs.' : '$'}{discount.toFixed(2)}
                            {item.discountType === 'PERCENT' && (
                              <span className="text-gray-600 ml-1">
                                de {invoiceData.currencyCode === 'VES' ? 'Bs.' : '$'}{bruto.toFixed(2)}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {/* Advertencia si el tipo es VES y la tasa no está configurada */}
                      {item.discountType === 'FIXED_VES' && item.discountValue > 0 && invoiceData.exchangeRate <= 0 && (
                        <p className="text-[9px] text-red-400 mt-1 text-center font-bold">
                          ⚠ Ingresa la tasa Bs/USD
                        </p>
                      )}
                    </td>
                    {/* Subtotal */}
                    <td className="px-5 py-3 text-right font-black text-white bg-white/5 transition-all">
                      <div className="text-sm">{invoiceData.currencyCode === 'VES' ? 'Bs.' : '$'}{lineTotal.toFixed(2)}</div>
                      {discount > 0 && (
                        <div className="text-[9px] text-gray-600 font-mono line-through">
                          {invoiceData.currencyCode === 'VES' ? 'Bs.' : '$'}{(bruto * (1 + Number(item.taxRate) / 100)).toFixed(2)}
                        </div>
                      )}
                    </td>
                    {/* Eliminar */}
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => removeLine(idx)}
                        className="text-red-500/60 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/10">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-20 bg-white/5">
                    <DollarSign size={40} className="mx-auto mb-4 text-gray-700" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Añade gastos para comenzar el registro</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TOTALES */}
        {items.length > 0 && (
          <div className="p-8 border-t border-white/10 flex justify-end">
            <div className="w-96 space-y-3">

              {/* Descuento (solo si hay alguno) */}
              {calcTotalDiscount() > 0 && (
                <div className="flex justify-between items-center px-4 py-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-amber-400" />
                    <span className="text-[10px] font-black text-amber-400/80 uppercase tracking-widest">
                      Descuento Total en {invoiceData.currencyCode === 'VES' ? 'Bs.' : 'USD'}
                    </span>
                  </div>
                  <span className="font-mono font-black text-amber-400">
                    -{invoiceData.currencyCode === 'VES' ? 'Bs.' : '$'}{calcTotalDiscount().toFixed(2)}
                  </span>
                </div>
              )}

              {/* Base + IVA */}
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Base Imponible</p>
                  <p className="font-mono font-black text-xl text-white">{invoiceData.currencyCode === 'VES' ? 'Bs.' : '$'}{calcTotalBase().toFixed(2)}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">IVA Estimado</p>
                  <p className="font-mono font-black text-xl text-orange-400">{invoiceData.currencyCode === 'VES' ? 'Bs.' : '$'}{calcTotalTax().toFixed(2)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center p-6 bg-orange-600/5 rounded-2xl border border-orange-600/10 shadow-xl shadow-orange-600/5">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total a Pagar</span>
                <span className="text-4xl font-black text-orange-400 tracking-tighter">{invoiceData.currencyCode === 'VES' ? 'Bs.' : '$'}{calcTotal().toFixed(2)}</span>
              </div>

              {/* Equivalente en Bolívares (Solo visible si la factura es en dólares) */}
              {invoiceData.exchangeRate > 1 && invoiceData.currencyCode === 'USD' && (
                <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Equivalente Bs.</span>
                  <span className="font-mono font-black text-gray-500">
                    Bs. {(calcTotal() * invoiceData.exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {/* Equivalente en Dólares (Solo visible si la factura es en bolívares) */}
              {invoiceData.exchangeRate > 1 && invoiceData.currencyCode === 'VES' && (
                <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Equivalente USD</span>
                  <span className="font-mono font-black text-gray-500">
                    $ {(calcTotal() / invoiceData.exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* ─── PREVIEW ISLR ─── */}
              {hasIslrItems && (
                <div className="mt-4 border-2 border-blue-500/30 rounded-2xl overflow-hidden bg-blue-500/5">
                  <div className="p-4 border-b border-blue-500/20 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-blue-400" />
                      <span className="text-xs font-black text-blue-300 uppercase tracking-widest">Preview Retención ISLR</span>
                    </div>
                    <button
                      onClick={calculateIslrPreview}
                      disabled={islrCalculating || !invoiceData.supplierId}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                    >
                      {islrCalculating ? 'Calculando...' : 'Calcular ISLR'}
                    </button>
                  </div>

                  {!invoiceData.supplierId && (
                    <div className="p-4 text-center">
                      <p className="text-xs text-yellow-400">⚠ Selecciona un proveedor para calcular la retención ISLR</p>
                    </div>
                  )}

                  {islrPreview && (
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-1 rounded font-mono">
                          Cód. {islrPreview.conceptCode}
                        </span>
                        <span className="text-xs text-blue-200/70">{islrPreview.conceptDescription}</span>
                      </div>

                      {islrPreview.message ? (
                        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-400">{islrPreview.message}</p>
                        </div>
                      ) : (
                        <>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Base Imponible</p>
                            <p className="font-mono font-black text-white text-sm">
                              {invoiceData.currencyCode === 'VES' ? 'Bs.' : '$'}{islrPreview.taxableBase.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">% Retención</p>
                            <p className="font-mono font-black text-blue-400 text-sm">{islrPreview.percentage}%</p>
                          </div>
                          <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Sustraendo</p>
                            <p className="font-mono font-black text-gray-400 text-sm">
                              {invoiceData.currencyCode === 'VES' ? 'Bs.' : '$'}{islrPreview.sustraendo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 bg-blue-600/20 rounded-xl p-4 text-center border border-blue-500/30">
                          <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">ISLR a Retener</p>
                          <p className="font-mono font-black text-blue-300 text-2xl">
                            {invoiceData.currencyCode === 'VES' ? 'Bs.' : '$'}{islrPreview.retainedAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTÓN GUARDAR */}
      <div className="flex justify-end gap-3 pt-6">
        <button onClick={() => router.push('/dashboard/accounting/bills')}
          className="px-8 py-4 text-gray-500 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all">
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={loading}
          className="flex items-center gap-3 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-xs px-10 py-4 rounded-2xl shadow-xl shadow-orange-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Receipt size={20} />
          {loading ? 'Procesando...' : 'Registrar Gasto Directo'}
        </button>
      </div>
    </div>
  );
}
