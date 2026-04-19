"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { FileText, Plus, X, CheckCircle } from "lucide-react";

// ── TIPOS ────────────────────────────────────────────────
interface Client {
  id: string;
  name: string;
  rif?: string;
}
interface Product {
  id: string;
  name: string;
  code: string;
  isService: boolean;
  priceBase: number;
}
interface ServiceCategory {
  id: string;
  name: string;
}
interface QuoteItem {
  type: "product" | "service";
  productId?: string;
  serviceCategoryId?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  unitOfMeasure: string;
}

interface QuoteFormData {
  clientId: string;
  expiresAt: string;
  currencyCode: "USD" | "VES";
  exchangeRate: number;
  salespersonId?: string;
  notes: string;
  internalNote: string;
  items: QuoteItem[];
}

interface QuoteFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: Partial<QuoteFormData> & { id?: string };
}

const fmt = (n: number, cur = "USD") =>
  new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
  }).format(n);

export default function QuoteFormModal({
  open,
  onClose,
  onSaved,
  initialData,
}: QuoteFormModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentBcvRate, setCurrentBcvRate] = useState<number>(1);

  const isEditing = !!initialData?.id;

  const [form, setForm] = useState<QuoteFormData>({
    clientId: "",
    expiresAt: "",
    currencyCode: "USD",
    exchangeRate: 1,
    salespersonId: "",
    notes: "",
    internalNote: "",
    items: [
      {
        type: "product",
        productId: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 16,
        discount: 0,
        unitOfMeasure: "Pza",
      },
    ],
  });

  // ── CARGA DE CATÁLOGOS ─────────────────────────────────
  const loadCatalogs = useCallback(async () => {
    const [c, p, s, sales] = await Promise.all([
      apiClient
        .get<{ items: Client[] }>("/clients?limit=200")
        .catch(() => ({ items: [] })),
      apiClient
        .get<{ items: Product[] }>("/products?limit=500")
        .catch(() => ({ items: [] })),
      apiClient.get<ServiceCategory[]>("/service-categories").catch(() => []),
      apiClient.get<any[]>("/users/salespersons").catch(() => []),
    ]);
    const clientsRes = c as { items?: Client[] };
    const productsRes = p as { items?: Product[] };
    setClients(clientsRes.items ?? (Array.isArray(c) ? c : []));
    setProducts(productsRes.items ?? (Array.isArray(p) ? p : []));
    setServiceCategories(Array.isArray(s) ? s : []);
    setSalespersons(Array.isArray(sales) ? sales : []);
  }, []);

  // ── INICIALIZAR AL ABRIR MODAL ────────────────────────
  useEffect(() => {
    if (!open) return;

    const init = async () => {
      await loadCatalogs();

      // Obtener tasa BCV
      let rate = 1;
      try {
        const data = await apiClient.get<{ rate?: number | string }>(
          "/exchange-rates/latest",
        );
        if (data && data.rate) rate = Number(data.rate);
      } catch (e) {
        console.error("Error cargando tasa BCV", e);
      }
      setCurrentBcvRate(rate);

      if (isEditing && initialData) {
        setForm({
          clientId: initialData.clientId || "",
          expiresAt: initialData.expiresAt || "",
          currencyCode: initialData.currencyCode || "USD",
          exchangeRate: initialData.exchangeRate || rate,
          salespersonId: initialData.salespersonId || "",
          notes: initialData.notes || "",
          internalNote: initialData.internalNote || "",
          items: initialData.items || [],
        });
      } else {
        setForm({
          clientId: "",
          expiresAt: "",
          currencyCode: "USD",
          exchangeRate: rate,
          salespersonId: "",
          notes: "",
          internalNote: "",
          items: [
            {
              type: "product",
              productId: "",
              description: "",
              quantity: 1,
              unitPrice: 0,
              taxRate: 16,
              discount: 0,
              unitOfMeasure: "Pza",
            },
          ],
        });
      }
    };

    init();
  }, [open, isEditing, initialData, loadCatalogs]);

  // ── ÍTEMS ─────────────────────────────────────────────
  const addItem = () =>
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          type: "product",
          productId: "",
          description: "",
          quantity: 1,
          unitPrice: 0,
          taxRate: 16,
          discount: 0,
          unitOfMeasure: "Pza",
        },
      ],
    }));

  const removeItem = (i: number) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== i),
    }));

  const updateItem = (
    i: number,
    field: keyof QuoteItem,
    value: string | number,
  ) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => {
        if (idx !== i) return item;
        const updated = { ...item, [field]: value };
        // Auto-completar precio si se selecciona producto
        if (field === "productId") {
          const prod = products.find((p) => p.id === value);
          if (prod) updated.unitPrice = Number(prod.priceBase);
        }
        return updated;
      }),
    }));

  // ── CALCULAR TOTALES ──────────────────────────────────
  const calcLine = (it: QuoteItem) => {
    const base = it.quantity * it.unitPrice * (1 - it.discount / 100);
    return base + base * (it.taxRate / 100);
  };
  const total = form.items.reduce((acc, it) => acc + calcLine(it), 0);

  // ── GUARDAR ────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) return toast.error("Selecciona un cliente.");
    if (
      form.items.some(
        (i) =>
          (i.type === "product" && !i.productId) ||
          (i.type === "service" && !i.serviceCategoryId),
      )
    ) {
      return toast.error(
        "Cada ítem debe tener un producto o un servicio seleccionado.",
      );
    }
    setSaving(true);
    try {
      const cleanedItems = form.items.map((i: QuoteItem) => {
        const cleanedItem: Record<string, string | number | undefined | null> =
          {
            description: i.description || null,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate,
            discount: i.discount,
          };
        if (i.type === "product" && i.productId) {
          cleanedItem.productId = i.productId;
        }
        if (i.type === "service" && i.serviceCategoryId) {
          cleanedItem.serviceCategoryId = i.serviceCategoryId;
        }
        return cleanedItem;
      });

      const dataToSend: Record<string, unknown> = {
        clientId: form.clientId,
        currencyCode: form.currencyCode,
        exchangeRate: Number(form.exchangeRate),
        items: cleanedItems,
      };

      if (form.salespersonId) dataToSend.salespersonId = form.salespersonId;
      if (form.expiresAt) dataToSend.expiresAt = form.expiresAt;
      if (form.notes) dataToSend.notes = form.notes;
      if (form.internalNote) dataToSend.internalNote = form.internalNote;

      if (isEditing && initialData?.id) {
        await apiClient.patch(`/quotes/${initialData.id}`, dataToSend);
        toast.success("Cotización actualizada correctamente");
      } else {
        await apiClient.post("/quotes", dataToSend);
        toast.success("Cotización creada correctamente");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error("Error al guardar cotización:", err);
      const e = err as {
        message?: string | string[];
        error?: string;
        statusCode?: number;
      };
      const msg = Array.isArray(e.message) ? e.message.join(", ") : e.message;
      toast.error(
        msg ||
          "No se pudo guardar la cotización. Revisa los datos e intenta de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1F2C] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-white/10">
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#1A1F2C]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={20} className="text-blue-400" />
            {isEditing ? "Editar Cotización" : "Nueva Cotización"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Cabecera */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Cliente *
              </label>
              <select
                required
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              >
                <option value="">-- Seleccionar cliente --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.rif ? `(${c.rif})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Vendedor / Asesor
              </label>
              <select
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                value={form.salespersonId || ""}
                onChange={(e) => setForm({ ...form, salespersonId: e.target.value })}
              >
                <option value="">-- Sin Asignar --</option>
                {salespersons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Válida hasta
              </label>
              <input
                type="date"
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm({ ...form, expiresAt: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Moneda
              </label>
              <select
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                value={form.currencyCode}
                onChange={(e) => {
                  const newCurr = e.target.value as "USD" | "VES";
                  setForm({
                    ...form,
                    currencyCode: newCurr,
                    exchangeRate: newCurr === "USD" ? currentBcvRate : 1,
                  });
                }}
              >
                <option value="USD">USD — Dólar</option>
                <option value="VES">VES — Bolívar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Tasa de cambio
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.exchangeRate}
                onChange={(e) =>
                  setForm({ ...form, exchangeRate: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Observaciones
              </label>
              <input
                type="text"
                placeholder="Términos y condiciones..."
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-600"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Ítems */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Ítems de la Cotización
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
              >
                <Plus size={14} /> AGREGAR LÍNEA
              </button>
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0B1120]">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-[10px] text-gray-400 uppercase font-bold border-b border-white/10">
                  <tr>
                    <th className="px-3 py-2 text-left w-24">Tipo</th>
                    <th className="px-3 py-2 text-left w-[28%]">Ítem</th>
                    <th className="px-3 py-2 text-left">Descripción</th>
                    <th className="px-3 py-2 text-center w-20">UdM</th>
                    <th className="px-3 py-2 text-right w-20">Cant.</th>
                    <th className="px-3 py-2 text-right w-24">Precio</th>
                    <th className="px-3 py-2 text-right w-16">IVA %</th>
                    <th className="px-3 py-2 text-right w-16">Desc %</th>
                    <th className="px-3 py-2 text-right w-24">Total</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {form.items.map((item, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-2 py-2">
                        <select
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                          value={item.type}
                          onChange={(e) => {
                            const newType = e.target.value as
                              | "product"
                              | "service";
                            setForm((prev) => ({
                              ...prev,
                              items: prev.items.map((it, idx) =>
                                idx === i
                                  ? {
                                      ...it,
                                      type: newType,
                                      productId: "",
                                      serviceCategoryId: "",
                                    }
                                  : it,
                              ),
                            }));
                          }}
                        >
                          <option value="product">Producto</option>
                          <option value="service">Servicio</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        {item.type === "product" ? (
                          <select
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                            value={item.productId || ""}
                            onChange={(e) =>
                              updateItem(i, "productId", e.target.value)
                            }
                          >
                            <option value="">-- Seleccionar --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.isService ? "🔧 " : "📦 "}
                                {p.name} ({p.code})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                            value={item.serviceCategoryId || ""}
                            onChange={(e) =>
                              updateItem(i, "serviceCategoryId", e.target.value)
                            }
                          >
                            <option value="">-- Seleccionar Servicio --</option>
                            {serviceCategories.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-600"
                          placeholder="Descripción adicional..."
                          value={item.description}
                          onChange={(e) =>
                            updateItem(i, "description", e.target.value)
                          }
                        />
                      </td>
                      {/* ── UNIDAD DE MEDIDA ── */}
                      <td className="px-2 py-2">
                        <select
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-1.5 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none text-center"
                          value={item.unitOfMeasure}
                          onChange={(e) =>
                            updateItem(i, "unitOfMeasure", e.target.value)
                          }
                        >
                          <option value="Pza">Pza — Pieza</option>
                          <option value="Und">Und — Unidad</option>
                          <option value="KG">KG — Kilogramo</option>
                          <option value="G">G — Gramo</option>
                          <option value="L">L — Litro</option>
                          <option value="ML">ML — Mililitro</option>
                          <option value="M">M — Metro</option>
                          <option value="M2">M² — Metro Cuadrado</option>
                          <option value="M3">M³ — Metro Cúbico</option>
                          <option value="CM">CM — Centímetro</option>
                          <option value="HR">HR — Hora</option>
                          <option value="DIA">Día</option>
                          <option value="MES">Mes</option>
                          <option value="CAJA">Caja</option>
                          <option value="PAQ">Paquete</option>
                          <option value="PAR">Par</option>
                          <option value="DOC">Docena</option>
                          <option value="SERV">Servicio</option>
                        </select>
                      </td>
                      {/* ── CANTIDAD — sin flechas, selección automática al focus ── */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-right text-white focus:ring-1 focus:ring-blue-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
                          value={item.quantity}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            updateItem(i, "quantity", Number(e.target.value))
                          }
                        />
                      </td>
                      {/* ── PRECIO — sin flechas, selección automática al focus ── */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-right text-white focus:ring-1 focus:ring-blue-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
                          value={item.unitPrice}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            updateItem(i, "unitPrice", Number(e.target.value))
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-1.5 py-1.5 text-[11px] text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                          value={item.taxRate}
                          onChange={(e) =>
                            updateItem(i, "taxRate", Number(e.target.value))
                          }
                        >
                          <option value={16}>16%</option>
                          <option value={8}>8%</option>
                          <option value={0}>0% Exento</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-right text-white focus:ring-1 focus:ring-blue-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
                          value={item.discount}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            updateItem(i, "discount", Number(e.target.value))
                          }
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-white text-[11px]">
                        {fmt(calcLine(item))}
                      </td>
                      <td className="px-1 py-2 text-center">
                        {form.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="text-red-400 hover:text-red-600 p-1 rounded"
                          >
                            ×
                          </button>
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
                <p className="text-[10px] text-blue-400/70 mb-1 font-bold uppercase tracking-wider">
                  Total Cotización
                </p>
                <p className="text-2xl font-bold text-blue-400">
                  {fmt(total, form.currencyCode)}
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-400 hover:bg-white/5 rounded-xl text-sm transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
            >
              {saving
                ? "Guardando..."
                : isEditing
                  ? "✓ Actualizar Cotización"
                  : "✓ Crear Cotización"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
