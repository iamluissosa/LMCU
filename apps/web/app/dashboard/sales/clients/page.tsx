'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Users, Plus, Search, RefreshCw, FileText, CheckCircle,
  Briefcase, Edit, Trash2, ShieldAlert
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  rif?: string;
  taxpayerType?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  isIvaAgent: boolean;
  islrRate: number;
  paymentTerms: number;
  creditLimit: number;
  _count?: { quotes: number; salesOrders: number; salesInvoices: number };
}

const TAXPAYER_TYPE_LABELS: Record<string, string> = {
  NATURAL: 'Natural',
  JURIDICAL: 'Jurídico',
  JURIDICAL_FOREIGN: 'Jurídico Extranjero',
  GOVERNMENT: 'Gubernamental',
};

const fmt = (n: number, cur = 'USD') =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(n);

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', rif: '', taxpayerType: 'JURIDICAL', contactName: '',
    email: '', phone: '', address: '', isIvaAgent: false,
    islrRate: 0, paymentTerms: 0, creditLimit: 0,
  });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (searchTerm) params.set('search', searchTerm);
      const data = await apiClient.get<{ items: Client[]; pages: number }>(`/clients?${params}`);
      setClients(data.items ?? []);
      setTotalPages(data.pages ?? 1);
    } catch (e: any) {
      console.error('Fetch Client Error:', JSON.stringify(e, null, 2), e);
      if (e.message) alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { fetchClients(); }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchClients, searchTerm]);

  const openModal = (client?: Client) => {
    if (client) {
      setEditingId(client.id);
      setForm({
        name: client.name || '',
        rif: client.rif || '',
        taxpayerType: client.taxpayerType || 'JURIDICAL',
        contactName: client.contactName || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        isIvaAgent: client.isIvaAgent || false,
        islrRate: Number(client.islrRate) || 0,
        paymentTerms: Number(client.paymentTerms) || 0,
        creditLimit: Number(client.creditLimit) || 0,
      });
    } else {
      setEditingId(null);
      setForm({
        name: '', rif: '', taxpayerType: 'JURIDICAL', contactName: '',
        email: '', phone: '', address: '', isIvaAgent: false,
        islrRate: 0, paymentTerms: 0, creditLimit: 0,
      });
    }
    setShowModal(true);
  };

  const calculateFormatRIF = (raw: string) => {
    let clean = raw.replace(/[^JGVEP0-9]/gi, '').toUpperCase();
    if (clean.length > 1) {
       const type = clean.charAt(0);
       const nums = clean.slice(1, 9);
       const digit = clean.slice(9, 10);
       clean = `${type}-${nums}${digit ? '-' + digit : ''}`;
    }
    return clean;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    console.log('--- Iniciando handleSave ---');
    try {
      const payload = {
        ...form,
        islrRate: Number(form.islrRate),
        paymentTerms: Number(form.paymentTerms),
        creditLimit: Number(form.creditLimit),
      };

      console.log('Payload a enviar:', payload);

      if (editingId) {
        console.log(`PATCH /clients/${editingId}`);
        await apiClient.patch(`/clients/${editingId}`, payload);
      } else {
        console.log('POST /clients');
        const res = await apiClient.post('/clients', payload);
        console.log('Respuesta POST /clients:', res);
      }
      setShowModal(false);
      fetchClients();
    } catch (err: unknown) {
      console.error('--- ERROR en handleSave ---', err);
      const er = err as { message?: string, error?: string | string[] | Record<string,any> };
      const msg = Array.isArray(er.message) ? er.message.join(', ') : er.message;
      alert(`Ocurrió un error al guardar: ${msg || 'Desconocido'}`);
    } finally {
      console.log('--- FIN handleSave --- setSaving(false)');
      setSaving(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if ((client._count?.quotes ?? 0) > 0 || (client._count?.salesInvoices ?? 0) > 0) {
      alert('No se puede eliminar porque tiene documentos de venta asociados.');
      return;
    }
    if (!confirm(`¿Eliminar al cliente ${client.name}?`)) return;
    try {
      await apiClient.delete(`/clients/${client.id}`);
      fetchClients();
    } catch (err: unknown) {
      const er = err as { message?: string };
      alert(`Error: ${er.message}`);
    }
  };

  // Función opcional si tuvieran el Microservicio de CedulaVE integrado en la API:
  const buscarIdentificacion = async () => {
    if (!form.rif) return;
    const cleanId = form.rif; 
    if (cleanId.length < 5) return;
    
    try {
      setLoading(true);
      const res = await apiClient.get<any>(`/clients/lookup/cedula/${cleanId}`).catch(() => null);
      if (res && res.primer_nombre) { // La data tiene { primer_nombre, primer_apellido, etc }
        const { primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, nacionalidad } = res;
        const partesNombre = [primer_nombre, segundo_nombre, primer_apellido, segundo_apellido].filter(Boolean);
        const nombreCompleto = partesNombre.join(' ');
        
        let txType = form.taxpayerType;
        if (nacionalidad === 'V' || nacionalidad === 'E') {
           txType = 'NATURAL';
        }
        
        setForm(f => ({ 
           ...f, 
           name: nombreCompleto,
           taxpayerType: txType
        }));
      } else {
        alert('No se encontraron datos en CedulaVE para este documento.');
      }
    } catch (error) {
       console.log("Servicio CedulaVE no disponible.", error);
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-blue-600" /> Clientes y Cuentas
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de cartera de clientes B2B y perfiles fiscales SENIAT</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm text-sm">
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* FILTROS / BÚSQUEDA */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por RIF, Nombre, Email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <button onClick={fetchClients} className="px-3 py-2 text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
          <RefreshCw size={18} className={loading && !searchTerm ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
            <tr>
              <th className="px-5 py-3">Razón Social / RIF</th>
              <th className="px-5 py-3">Contacto</th>
              <th className="px-5 py-3">Perfil Fiscal</th>
              <th className="px-5 py-3 text-right">Crédito</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && clients.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400">Cargando cuentas...</td></tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  <Briefcase size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>No se encontraron clientes.</p>
                </td>
              </tr>
            ) : clients.map(client => (
              <tr key={client.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-5 py-3">
                  <p className="font-semibold text-gray-800">{client.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <FileText size={12} className="text-gray-400" /> {client.rif || 'Sin RIF'}
                  </p>
                </td>
                <td className="px-5 py-3">
                  <p className="text-gray-700">{client.contactName || '—'}</p>
                  <p className="text-xs text-blue-600">{client.email || ''}</p>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded w-max">
                      {TAXPAYER_TYPE_LABELS[client.taxpayerType || ''] || client.taxpayerType}
                    </span>
                    <div className="flex gap-2 mt-1">
                      {client.isIvaAgent && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium" title="Agente de Retención de IVA (75% / 100%)">
                           Ret. IVA
                        </span>
                      )}
                      {Number(client.islrRate) > 0 && (
                        <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium" title={`Retención de ISLR del ${client.islrRate}%`}>
                          ISLR {client.islrRate}%
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <p className="font-medium text-gray-800">{fmt(Number(client.creditLimit))}</p>
                  <p className="text-xs text-gray-500">{client.paymentTerms} días plazo</p>
                </td>
                <td className="px-5 py-3 text-right">
                   <div className="flex justify-end gap-1">
                      <button onClick={() => openModal(client)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(client)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium ${page === p ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── MODAL CRUD ──────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Users size={20} className="text-blue-600" />
                {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Sección: Datos Básicos */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider border-b pb-1">Identificación Básica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Documento (Cédula o RIF)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" required
                        placeholder="V-12345678 o J-12345678-9"
                        className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
                        value={form.rif} 
                        onChange={e => setForm({ ...form, rif: calculateFormatRIF(e.target.value) })}
                      />
                      <button type="button" onClick={buscarIdentificacion} title="Autocompletar vía CedulaVE / SENIAT"
                        className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-2 rounded-xl transition-colors">
                        <Search size={18} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Razón Social / Nombre Completo *</label>
                    <input 
                      type="text" required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Contacto */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider border-b pb-1">Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Persona de Contacto</label>
                    <input type="text" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail (Facturación)</label>
                    <input type="email" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
                    <input type="text" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección Fiscal / Entrega</label>
                    <input type="text" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Sección: Perfil Fiscal SENIAT */}
              <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                <h3 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                  <ShieldAlert size={16} /> Perfil Fiscal (SENIAT)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Contribuyente</label>
                    <select className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.taxpayerType} onChange={e => setForm({ ...form, taxpayerType: e.target.value })}>
                      <option value="JURIDICAL">Jurídico</option>
                      <option value="NATURAL">Natural</option>
                      <option value="JURIDICAL_FOREIGN">Jurídico Extranjero</option>
                      <option value="GOVERNMENT">Gubernamental</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center mt-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300"
                        checked={form.isIvaAgent} onChange={e => setForm({ ...form, isIvaAgent: e.target.checked })} />
                      Es Agente de Retención IVA
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">% Retención ISLR (General)</label>
                    <div className="relative">
                      <input type="number" step="0.5" min="0" max="100"
                        className="w-full border border-gray-300 rounded-xl pl-3 pr-8 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right"
                        value={form.islrRate} onChange={e => setForm({ ...form, islrRate: Number(e.target.value) })} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Comercial / Crédito */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider border-b pb-1">Comercial / Crédito</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Límite de Crédito (Max $)</label>
                    <input type="number" step="0.01" min="0"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Días Vencimiento Factura</label>
                    <input type="number" min="0"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: Number(e.target.value) })} />
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2">
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  {saving ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
