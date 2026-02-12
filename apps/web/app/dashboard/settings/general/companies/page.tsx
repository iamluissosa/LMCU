'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Building2, Plus, Pencil, X, Save, MapPin } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewCompany, setViewCompany] = useState<any | null>(null); // ✅ Nuevo estado para ver detalles

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
  const fetchCompanies = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('http://localhost:3001/companies', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      setCompanies(await res.json());
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  // Abrir Modal
  const handleOpen = (company?: any) => {
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
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const url = editingId 
        ? `http://localhost:3001/companies/${editingId}`
        : 'http://localhost:3001/companies';
      
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Error al guardar');

      setIsModalOpen(false);
      fetchCompanies();
    } catch (error) {
      alert('❌ Error al guardar la empresa');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="text-blue-600" /> Empresas
          </h1>
          <p className="text-gray-500 text-sm">Gestiona tus entidades fiscales</p>
        </div>
        <button onClick={() => handleOpen()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus size={18} /> Nueva Empresa
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {companies.length === 0 ? (
           <div className="p-10 text-center text-gray-500">No hay empresas registradas.</div>
        ) : (
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 font-semibold uppercase text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">RIF</th>
                <th className="px-6 py-4">Razón Social</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4 text-center">Tipo</th>
                <th className="px-6 py-4 text-right">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-blue-600 font-medium">
                    <button onClick={() => setViewCompany(company)} className="hover:underline hover:text-blue-800">
                      {company.rif}
                    </button>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">{company.name}</td>
                  <td className="px-6 py-4 text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin size={14} /> {company.city}, {company.state}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      company.taxpayerType === 'Especial' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {company.taxpayerType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleOpen(company)} className="p-2 text-gray-500 hover:text-blue-600">
                      <Pencil size={16} />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">
                {editingId ? '✏️ Editar Empresa' : '✨ Nueva Empresa'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400 hover:text-red-500" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 grid grid-cols-2 gap-4">
              
              {/* HEADER DE CARGA DE RIF */}
              <div className="col-span-2 bg-blue-50 border border-blue-100 rounded-lg p-4 mb-2 flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-bold text-blue-800">Carga Automática</h4>
                    <p className="text-xs text-blue-600">Sube una foto del RIF para autocompletar.</p>
                </div>
                <label className="cursor-pointer bg-white text-blue-600 border border-blue-200 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 flex items-center gap-2 shadow-sm transition-all">
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        // Validar tamaño/tipo si es necesario
                        const formDataUpload = new FormData();
                        formDataUpload.append('file', file);

                        const { data: { session } } = await supabase.auth.getSession();
                        
                        try {
                            // Mostrar loading visual si se quiere
                            e.target.value = ''; // Reset input
                            
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
                            
                            // Autocompletar (Solo si hay datos validos)
                            if (extracted.rif) {
                                setFormData(prev => ({
                                    ...prev,
                                    rif: extracted.rif || prev.rif,
                                    name: extracted.name || prev.name,
                                    address: extracted.address || prev.address 
                                }));
                                alert('✅ Datos extraídos del RIF correctamente. Por favor verifica la información.');
                            } else {
                                alert('⚠️ No se pudieron detectar datos claros en el documento.');
                            }

                        } catch (err) {
                            console.error(err);
                            alert('❌ Error procesando el documento. Inténtalo manual.');
                        }
                    }} />
                    Subir RIF (PDF/Foto)
                </label>
              </div>


              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">RIF</label>
                <input required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="J-12345678-9"
                  value={formData.rif} onChange={e => setFormData({...formData, rif: e.target.value})} />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contribuyente</label>
                <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.taxpayerType} onChange={e => setFormData({...formData, taxpayerType: e.target.value})}>
                  <option value="Ordinario">Ordinario</option>
                  <option value="Especial">Especial (Retiene IVA)</option>
                  <option value="Formal">Formal</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                <input required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Nombre de la empresa"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <input required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Ej: Carabobo"
                  value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Municipio</label>
                <input required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Ej: Montalbán"
                  value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Fiscal Detallada</label>
                <textarea required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={2} 
                  placeholder="Av, Edif, Piso, Local..."
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="0414-1234567"
                  value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="contacto@empresa.com"
                  value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Sitio Web</label>
                <input className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="https://www.miempresa.com"
                  value={formData.website || ''} onChange={e => setFormData({...formData, website: e.target.value})} />
              </div>

              <div className="col-span-2 pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
                  {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Empresa</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL DE DETALLES */}
      {viewCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-600 px-6 py-6 text-white flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">{viewCompany.name}</h3>
                <p className="opacity-90 font-mono text-sm mt-1">{viewCompany.rif}</p>
              </div>
              <button onClick={() => setViewCompany(null)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Tipo de Contribuyente</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                      viewCompany.taxpayerType === 'Especial' 
                        ? 'bg-purple-100 text-purple-700 border-purple-200' 
                        : 'bg-blue-100 text-blue-700 border-blue-200'
                    }`}>
                      {viewCompany.taxpayerType}
                    </span>
                 </div>
                 <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Ubicación</span>
                    <p className="text-sm font-medium text-gray-800">{viewCompany.city}, {viewCompany.state}</p>
                 </div>
              </div>

              <div>
                <h4 className="text-xs text-gray-500 uppercase font-bold mb-2 border-b pb-1">Dirección Fiscal</h4>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <MapPin size={14} className="inline mr-1 text-gray-400 mb-0.5" />
                  {viewCompany.address}
                </p>
              </div>

              <div>
                <h4 className="text-xs text-gray-500 uppercase font-bold mb-2 border-b pb-1">Contacto</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  {viewCompany.phone && (
                    <div className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-700 p-1.5 rounded-md"><PhoneIcon /></span>
                      {viewCompany.phone}
                    </div>
                  )}
                  {viewCompany.email && (
                    <div className="flex items-center gap-2">
                      <span className="bg-orange-100 text-orange-700 p-1.5 rounded-md"><MailIcon /></span>
                      <a href={`mailto:${viewCompany.email}`} className="hover:underline hover:text-blue-600">{viewCompany.email}</a>
                    </div>
                  )}
                  {viewCompany.website && (
                    <div className="flex items-center gap-2">
                       <span className="bg-indigo-100 text-indigo-700 p-1.5 rounded-md"><GlobeIcon /></span>
                       <a href={viewCompany.website} target="_blank" rel="noreferrer" className="hover:underline hover:text-blue-600 truncate">{viewCompany.website}</a>
                    </div>
                  )}
                  {!viewCompany.phone && !viewCompany.email && !viewCompany.website && (
                    <p className="text-gray-400 italic text-sm pl-2">No hay información de contacto registrada.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button onClick={() => {
                   setViewCompany(null);
                   handleOpen(viewCompany);
                }} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                   <Pencil size={14} /> Editar Información
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