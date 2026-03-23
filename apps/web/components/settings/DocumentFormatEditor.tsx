'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { createClient } from '@/lib/supabase';
import { FileText, Save, RotateCcw, Upload, X, CheckCircle, Eye } from 'lucide-react';

const supabase = createClient();

interface DocumentFormat {
  documentType: string;
  headerText: string;
  footerText: string;
  legalText: string;
  agentSignatureLabel: string;
  subjectSignatureLabel: string;
  stampUrl: string | null;
}

const DEFAULTS: DocumentFormat = {
  documentType: '',
  headerText: '',
  footerText: '',
  legalText: '',
  agentSignatureLabel: 'Firma del Emisor',
  subjectSignatureLabel: 'Firma del Receptor',
  stampUrl: null,
};

export default function DocumentFormatEditor({ documentType, title, subtitle }: { documentType: string; title: string; subtitle: string }) {
  const [form, setForm] = useState<DocumentFormat>({ ...DEFAULTS, documentType });
  const [saved, setSaved] = useState<DocumentFormat>({ ...DEFAULTS, documentType });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const fetchFormat = useCallback(async () => {
    try {
      const data = await apiClient.get<DocumentFormat>(`/document-formats/${documentType}`);
      setForm(data);
      setSaved(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [documentType]);

  useEffect(() => { fetchFormat(); }, [fetchFormat]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.post(`/document-formats/${documentType}`, form);
      setSaved(form);
      showToast('Formato guardado correctamente', true);
    } catch (e) {
      console.error(e);
      showToast('Error al guardar el formato', false);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Revertirás todos los cambios a los predeterminados. ¿De acuerdo?')) return;
    setForm({ ...DEFAULTS, documentType, stampUrl: form.stampUrl });
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploadingImg(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sin sesión activa');

      const ext = file.name.split('.').pop();
      const fileName = `doc-format-${documentType.toLowerCase()}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      setForm(prev => ({ ...prev, stampUrl: urlData.publicUrl }));
      showToast('Imagen subida. Presiona Guardar para confirmar.', true);
    } catch (err) {
      console.error(err);
      showToast('Error al subir la imagen', false);
    } finally {
      setUploadingImg(false);
    }
  };

  const removeSignature = () => {
    if (!confirm('¿Eliminar la imagen?')) return;
    setForm(prev => ({ ...prev, stampUrl: null }));
  };

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm animate-in slide-in-from-top-2 duration-300 ${
          toast.ok ? 'bg-emerald-900 border border-emerald-500/40 text-emerald-300' : 'bg-red-900 border border-red-500/40 text-red-300'
        }`}>
          <CheckCircle size={18} className={toast.ok ? 'text-emerald-400' : 'text-red-400'} />
          {toast.msg}
        </div>
      )}

      <div className="bg-[#1A1F2C] p-8 rounded-[2rem] shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
              <FileText className="text-blue-400" size={28} /> {title}
            </h2>
            <p className="text-gray-400 text-sm mt-2">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {isDirty && (
              <button
                onClick={handleReset}
                className="text-gray-400 hover:text-white px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors border border-gray-700 hover:border-gray-500 hover:bg-gray-800"
              >
                <RotateCcw size={16} /> Revertir Cambios
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 ${
                isDirty
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              }`}
            >
              {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
              {saving ? 'Guardando...' : isDirty ? 'Guardar Cambios' : 'Guardado'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUMNA FORMULARIO (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-6">
              <h3 className="text-blue-400 font-bold uppercase tracking-widest text-xs border-b border-gray-800 pb-2">
                1. Textos y Base Legal
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                    Referencia Gaceta / Providencia (Encabezado)
                  </label>
                  <input
                    type="text"
                    value={form.headerText || ''}
                    onChange={(e) => setForm({ ...form, headerText: e.target.value })}
                    className="w-full bg-[#0F131A] border-2 border-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-white transition-colors"
                    placeholder="Ej. Providencia Administrativa Nº SNAT..."
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                    Cita Normativa Principal (Texto Central Legal)
                  </label>
                  <textarea
                    value={form.legalText || ''}
                    onChange={(e) => setForm({ ...form, legalText: e.target.value })}
                    rows={4}
                    className="w-full bg-[#0F131A] border-2 border-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-white transition-colors resize-none leading-relaxed"
                    placeholder="Ley aplicable, artículo o reglamento..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                    Notas a Pie de Página (Footer)
                  </label>
                  <textarea
                    value={form.footerText || ''}
                    onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                    rows={2}
                    className="w-full bg-[#0F131A] border-2 border-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-white transition-colors resize-none"
                    placeholder="Información adicional a colocar en el pie..."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-indigo-400 font-bold uppercase tracking-widest text-xs border-b border-gray-800 pb-2">
                2. Nomenclatura de Firmas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                    Firma de Entidad Emisora
                  </label>
                  <input
                    type="text"
                    value={form.agentSignatureLabel || ''}
                    onChange={(e) => setForm({ ...form, agentSignatureLabel: e.target.value })}
                    className="w-full bg-[#0F131A] border-2 border-gray-800 focus:border-indigo-500 rounded-lg px-4 py-2 text-white"
                    placeholder="Firma del Agente"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                    Firma Entidad Receptora
                  </label>
                  <input
                    type="text"
                    value={form.subjectSignatureLabel || ''}
                    onChange={(e) => setForm({ ...form, subjectSignatureLabel: e.target.value })}
                    className="w-full bg-[#0F131A] border-2 border-gray-800 focus:border-indigo-500 rounded-lg px-4 py-2 text-white"
                    placeholder="Firma del Beneficiario"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-xs border-b border-gray-800 pb-2 flex items-center justify-between">
                <span>3. Firma Autorizada (Sello Digital)</span>
              </h3>
              
              <div className="bg-[#0F131A] border-2 border-dashed border-gray-700 hover:border-emerald-500/50 rounded-2xl p-6 transition-colors flex flex-col items-center justify-center min-h-[160px] relative group">
                {form.stampUrl ? (
                  <div className="relative w-full flex flex-col items-center gap-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.stampUrl} alt="Sello y Firma" className="max-h-24 object-contain mx-auto mix-blend-screen" />
                    </div>
                    <button
                      onClick={removeSignature}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 hover:scale-110 transition-all z-10"
                      title="Eliminar Sello"
                    >
                      <X size={14} />
                    </button>
                    <p className="text-xs text-gray-400">Imagen actual montada</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="bg-gray-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                      <Upload size={20} className="text-gray-400 group-hover:text-emerald-400" />
                    </div>
                    <p className="text-gray-300 font-medium text-sm">Sube la firma o logo (PNG Recomendado)</p>
                    <p className="text-gray-500 text-xs mt-1">Impresión sin fondo o fondo blanco</p>
                    <label className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg cursor-pointer inline-block transition-colors border border-gray-600">
                      {uploadingImg ? 'Subiendo...' : 'Seleccionar Archivo'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleSignatureUpload}
                        disabled={uploadingImg}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
            
          </div>
          
          {/* COLUMNA PISTA DE PRUEBA PREVIEW (5 cols) */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0">
             <div className="sticky top-6">
                <div className="bg-white rounded-xl shadow-2xl p-6 text-black border border-gray-200 aspect-[1/1.2] flex flex-col justify-between overflow-hidden relative">
                   <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-[9px] font-black uppercase px-2 py-1 rounded">Live Preview</div>
                   
                   <div>
                     <p className="text-center font-serif text-[8px] leading-tight text-gray-700 italic max-w-[80%] mx-auto mb-4">{form.legalText || '...'}</p>
                     
                     <div className="text-center mb-6">
                        <h4 className="font-black text-sm uppercase underline decoration-2">{title}</h4>
                        <p className="text-[7px] font-bold mt-1 text-gray-600">{form.headerText || '...'}</p>
                     </div>
                     
                     <div className="border border-gray-300 grid grid-cols-2 p-3 gap-2 opacity-50 bg-gray-50">
                        <div className="h-6 bg-gray-200 rounded"></div>
                        <div className="h-6 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded col-span-2 mt-2"></div>
                     </div>
                     
                     <div className="mt-6 border border-gray-300 h-24 bg-gray-50 opacity-50 flex items-center justify-center">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">TABLA CONTENEDORA</p>
                     </div>
                     <p className="text-center mt-2 font-bold uppercase tracking-widest text-[7px] text-gray-600">{form.footerText || '...'}</p>
                   </div>
                   
                   <div className="mt-12 flex justify-between gap-6 border-t border-gray-300 pt-4 relative">
                      {form.stampUrl && (
                         <div className="absolute left-[20%] -top-12 opacity-80 mix-blend-multiply flex justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form.stampUrl} className="h-16 w-32 object-contain" alt="" />
                         </div>
                      )}
                      <div className="flex-1 text-center">
                         <p className="text-[8px] font-black uppercase tracking-wider">{form.agentSignatureLabel || '...'}</p>
                         <p className="text-[6px] text-gray-500 uppercase">Sello de ejemplo</p>
                      </div>
                      <div className="flex-1 text-center">
                         <p className="text-[8px] font-black uppercase tracking-wider">{form.subjectSignatureLabel || '...'}</p>
                         <p className="text-[6px] text-gray-500 uppercase">Firma / Fecha de recepción</p>
                      </div>
                   </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                   <Eye className="text-blue-400 shrink-0 mt-0.5" size={16} />
                   <p className="text-xs text-blue-200 leading-relaxed font-medium">Esta vista previa es solo estructural. Las variables dinámicas como el nombre del cliente, montos y formato tabular se incrustarán automáticamente durante la impresión Ocultando estos rectángulos.</p>
                </div>
             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
