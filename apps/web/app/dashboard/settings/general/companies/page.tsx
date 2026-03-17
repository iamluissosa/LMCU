'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { createClient } from '@/lib/supabase';
import { Building2, Plus, Pencil, X, Save, MapPin } from 'lucide-react';

const supabase = createClient();

interface Company {
  id: string;
  name: string;
  rif: string;
  address: string;
  state: string;
  city: string;
  taxpayerType: string;
  phone: string;
  email: string;
  website: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);

  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewCompany, setViewCompany] = useState<Company | null>(null); // ✅ Nuevo estado para ver detalles
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Datos del Formulario
  const [formData, setFormData] = useState({
    name: '',
    rif: '',
    address: '',
    state: '',
    city: '',
    taxpayerType: 'Ordinario',
    phone: '',
    email: '',
    website: '' // ✅
  });

  // Cargar Empresas
  const fetchCompanies = useCallback(async () => {
    try {
      const data = await apiClient.get<Company[]>('/companies');
      setCompanies(data);
    } catch (error) {
       console.error(error);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  // Abrir Modal
  const handleOpen = (company?: Company) => {
    if (company) {
      setEditingId(company.id);
      setFormData(company);
    } else {
      setEditingId(null);
      setFormData({ 
        name: '', rif: '', address: '', state: '', city: '', 
        taxpayerType: 'Ordinario', phone: '', email: '', website: '' 
      });
    }
    setIsModalOpen(true);
  };

  // Guardar
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingId 
        ? `/companies/${editingId}`
        : '/companies';
      
      if (editingId) {
          await apiClient.patch(url, formData);
      } else {
          await apiClient.post(url, formData);
      }

      setIsModalOpen(false);
      fetchCompanies();
    } catch (error) {
      console.error(error);
      alert('❌ Error al guardar la empresa');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-[#1A1F2C] p-8 rounded-[2rem] shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
            <div className="bg-blue-500/10 p-2.5 rounded-2xl">
              <Building2 className="text-blue-500" size={28} />
            </div>
            Empresas
          </h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2 ml-14">Gestión de Entidades Fiscales</p>
        </div>
        <button onClick={() => handleOpen()} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 transition-all font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 active:scale-95">
          <Plus size={18} /> Nueva Empresa
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-[#1A1F2C] rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden">
        {companies.length === 0 ? (
           <div className="p-20 text-center">
             <div className="bg-[#0B1120] w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                <Building2 size={40} className="text-gray-600" />
             </div>
             <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No hay empresas registradas</p>
           </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0B1120] text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="px-8 py-5">RIF / Identificación</th>
                <th className="px-8 py-5">Razón Social</th>
                <th className="px-8 py-5">Ubicación</th>
                <th className="px-8 py-5 text-center">Tipo Fiscal</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-blue-500/5 transition-colors group">
                  <td className="px-8 py-5 font-mono text-blue-400 font-black">
                    <button onClick={() => setViewCompany(company)} className="hover:text-blue-300 transition-colors">
                      {company.rif}
                    </button>
                  </td>
                  <td className="px-8 py-5 font-bold text-white tracking-tight">{company.name}</td>
                  <td className="px-8 py-5 text-gray-400">
                    <div className="flex items-center gap-2 font-medium">
                      <MapPin size={14} className="text-gray-600" /> {company.city}, {company.state}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      company.taxpayerType === 'Especial' 
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {company.taxpayerType}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => handleOpen(company)} className="p-2.5 bg-[#0B1120] text-gray-500 hover:text-blue-400 hover:border-blue-500/50 border border-white/5 rounded-xl transition-all active:scale-90">
                      <Pencil size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#1A1F2C] rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-[#1A1F2C]">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tighter">
                  {editingId ? 'Editar Empresa' : 'Nueva Empresa'}
                </h3>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Información Fiscal y de Contacto</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-[#0B1120] text-gray-500 hover:text-red-500 p-3 rounded-2xl border border-white/5 transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-10 grid grid-cols-2 gap-6">
              
              {/* HEADER DE CARGA DE RIF */}
              <div className="col-span-2 bg-blue-500/5 border border-blue-500/10 rounded-3xl p-6 mb-2 flex items-center justify-between group transition-all hover:bg-blue-500/10">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-500/20 p-3 rounded-2xl text-blue-400">
                      <Save size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest">Carga Inteligente</h4>
                        <p className="text-[10px] text-blue-300/60 font-medium mt-0.5 uppercase tracking-tight">Sube una foto del RIF para autocompletar campos</p>
                    </div>
                </div>
                <label className="cursor-pointer bg-blue-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 active:scale-95">
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const formDataUpload = new FormData();
                        formDataUpload.append('file', file);
                        const { data: { session } } = await supabase.auth.getSession();
                        try {
                            e.target.value = '';
                            const res = await fetch('http://localhost:3001/companies/extract-rif', {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${session?.access_token}` },
                                body: formDataUpload
                            });
                            if (!res.ok) {
                                const errData = await res.json().catch(() => ({ message: res.statusText }));
                                throw new Error(errData.message || 'Error desconocido al procesar RIF');
                            }
                            const extracted = await res.json();
                            if (extracted.rif) {
                                setFormData(prev => ({
                                    ...prev,
                                    rif: extracted.rif || prev.rif,
                                    name: extracted.name || prev.name,
                                    address: extracted.address || prev.address 
                                }));
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    }} />
                    Abrir Archivo
                </label>
              </div>

              <div className="col-span-1 space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">RIF / ID</label>
                <input required className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-mono font-bold" 
                  placeholder="J-12345678-9"
                  value={formData.rif} onChange={e => setFormData({...formData, rif: e.target.value})} />
              </div>
              <div className="col-span-1 space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tipo de Contribuyente</label>
                <select className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-bold"
                  value={formData.taxpayerType} onChange={e => setFormData({...formData, taxpayerType: e.target.value})}>
                  <option value="Ordinario">Ordinario</option>
                  <option value="Especial">Especial (Retiene IVA)</option>
                  <option value="Formal">Formal</option>
                </select>
              </div>
              <div className="col-span-2 space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Razón Social Completa</label>
                <input required className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-bold" 
                  placeholder="Ej. Inversiones Mi Empresa C.A."
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div className="col-span-1 space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Estado</label>
                <input required className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-bold" 
                  placeholder="Ej: Carabobo"
                  value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
              </div>
              <div className="col-span-1 space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ciudad / Municipio</label>
                <input required className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-bold" 
                  placeholder="Ej: Montalbán"
                  value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Dirección Fiscal Detallada</label>
                <textarea required className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-medium" rows={2} 
                  placeholder="Av, Edif, Piso, Local..."
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              
              <div className="col-span-1 space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Teléfono</label>
                <input className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-bold" 
                  placeholder="0414-1234567"
                  value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="col-span-1 space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
                <input className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-bold lowercase" 
                  placeholder="contacto@empresa.com"
                  value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Sitio Web (Opcional)</label>
                <input className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-medium" 
                  placeholder="https://www.miempresa.com"
                  value={formData.website || ''} onChange={e => setFormData({...formData, website: e.target.value})} />
              </div>

              <div className="col-span-2 pt-6 flex justify-end gap-4 border-t border-white/5">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 active:scale-95 flex items-center gap-2">
                  {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Empresa</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL DE DETALLES */}
      {viewCompany && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#1A1F2C] rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-10 py-10 text-white flex justify-between items-start relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Building2 size={120} />
              </div>
              <div className="relative z-10">
                <h3 className="text-3xl font-black tracking-tighter leading-tight">{viewCompany.name}</h3>
                <p className="opacity-80 font-mono text-sm mt-2 font-black tracking-widest bg-black/20 inline-block px-3 py-1 rounded-lg uppercase">{viewCompany.rif}</p>
              </div>
              <button onClick={() => setViewCompany(null)} className="text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all relative z-10">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                 <div className="p-5 bg-[#0B1120] rounded-[2rem] border border-white/5">
                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-2">Tipo Fiscal</span>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block ${
                      viewCompany.taxpayerType === 'Especial' 
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {viewCompany.taxpayerType}
                    </span>
                 </div>
                 <div className="p-5 bg-[#0B1120] rounded-[2rem] border border-white/5">
                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-2">Ubicación</span>
                    <p className="text-sm font-black text-white tracking-tight leading-tight">{viewCompany.city}<br/><span className="text-gray-500 text-xs uppercase tracking-widest">{viewCompany.state}</span></p>
                 </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] text-gray-500 uppercase font-black tracking-widest border-b border-white/5 pb-2">Dirección Fiscal</h4>
                <div className="bg-[#0B1120] p-6 rounded-[2rem] border border-white/5 group transition-all hover:border-blue-500/30">
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">
                    <MapPin size={16} className="inline mr-2 text-blue-500/50 mb-1" />
                    {viewCompany.address}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] text-gray-500 uppercase font-black tracking-widest border-b border-white/5 pb-2">Canales de Contacto</h4>
                <div className="grid gap-3">
                  {viewCompany.phone && (
                    <div className="flex items-center gap-4 bg-[#0B1120] p-4 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all group">
                      <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl group-hover:scale-110 transition-transform"><PhoneIcon /></div>
                      <span className="text-white font-bold">{viewCompany.phone}</span>
                    </div>
                  )}
                  {viewCompany.email && (
                    <div className="flex items-center gap-4 bg-[#0B1120] p-4 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group">
                      <div className="bg-blue-500/10 text-blue-400 p-2.5 rounded-xl group-hover:scale-110 transition-transform"><MailIcon /></div>
                      <a href={`mailto:${viewCompany.email}`} className="text-white font-bold hover:text-blue-400 transition-colors truncate">{viewCompany.email}</a>
                    </div>
                  )}
                  {viewCompany.website && (
                    <div className="flex items-center gap-4 bg-[#0B1120] p-4 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
                       <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-xl group-hover:scale-110 transition-transform"><GlobeIcon /></div>
                       <a href={viewCompany.website} target="_blank" rel="noreferrer" className="text-white font-bold hover:text-indigo-400 transition-colors truncate">{viewCompany.website}</a>
                    </div>
                  )}
                  {!viewCompany.phone && !viewCompany.email && !viewCompany.website && (
                    <p className="text-gray-600 italic text-[10px] font-black uppercase tracking-widest pl-4">Sin datos de contacto</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-10 py-6 bg-[#0B1120] border-t border-white/5 flex justify-end">
                <button onClick={() => {
                   setViewCompany(null);
                   handleOpen(viewCompany);
                }} className="text-blue-500 hover:text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:translate-x-[-4px]">
                   <Pencil size={14} /> Editar Información Completa
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Iconos Auxiliares pequeños solo para este componente
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const MailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>;