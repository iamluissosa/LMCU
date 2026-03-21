'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { createClient } from '@/lib/supabase';
import {
  FileText, Save, RotateCcw, Upload, X, Eye, CheckCircle,
} from 'lucide-react';

const supabase = createClient();

interface DocumentFormats {
  retentionLegalText: string;
  retentionProvidencia: string;
  retentionFooterText: string;
  retentionAgentLabel: string;
  retentionSubjectLabel: string;
  retentionSignatureUrl: string | null;
}

const DEFAULTS: DocumentFormats = {
  retentionLegalText:
    'Ley de IVA Art. 11. "La administración Tributaria podrá designar como responsables del pago del impuesto, en calidad de agentes de retención a quienes por sus funciones públicas o por razón de sus actividades privadas intervengan en operaciones gravadas con el impuesto establecido en este Decreto con Rango, Valor y Fuerza de Ley"',
  retentionProvidencia: 'Providencia Administrativa Nº SNAT/2025/0054 del 01/08/2025',
  retentionFooterText:
    'Este comprobante se emite en función a lo establecido en el artículo 16 de la Providencia Administrativa Nº SNAT/2025/0054 de fecha 01/08/2025',
  retentionAgentLabel: 'Firma del agente de retención',
  retentionSubjectLabel: 'Firma del Beneficiario del Pago Fecha de entrega',
  retentionSignatureUrl: null,
};

export default function DocumentFormatsPage() {
  const [form, setForm] = useState<DocumentFormats>(DEFAULTS);
  const [saved, setSaved] = useState<DocumentFormats>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Cargar configuración ───────────────────────────────────────────────
  const fetchFormats = useCallback(async () => {
    try {
      const data = await apiClient.get<DocumentFormats>('/settings/document-formats');
      setForm(data);
      setSaved(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFormats(); }, [fetchFormats]);

  // ── Guardar configuración ──────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/settings/document-formats', form);
      setSaved(form);
      showToast('Configuración guardada correctamente', true);
    } catch (e) {
      console.error(e);
      showToast('Error al guardar la configuración', false);
    } finally {
      setSaving(false);
    }
  };

  // ── Restaurar defaults ─────────────────────────────────────────────────
  const handleReset = () => {
    if (!confirm('¿Restaurar todos los textos a los valores por defecto?')) return;
    setForm({ ...DEFAULTS, retentionSignatureUrl: form.retentionSignatureUrl });
  };

  // ── Subir imagen de firma/sello ────────────────────────────────────────
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploadingImg(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sin sesión activa');

      // Subir a Supabase Storage en bucket company-assets
      const ext = file.name.split('.').pop();
      const fileName = `retention-signature-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      setForm(prev => ({ ...prev, retentionSignatureUrl: urlData.publicUrl }));
      showToast('Imagen subida. Presiona Guardar para confirmar.', true);
    } catch (err) {
      console.error(err);
      showToast('Error al subir la imagen', false);
    } finally {
      setUploadingImg(false);
    }
  };

  const removeSignature = () => {
    if (!confirm('¿Eliminar la imagen del sello/firma?')) return;
    setForm(prev => ({ ...prev, retentionSignatureUrl: null }));
  };

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* TOAST */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm animate-in slide-in-from-top-2 duration-300 ${
          toast.ok ? 'bg-emerald-900 border border-emerald-500/40 text-emerald-300' : 'bg-red-900 border border-red-500/40 text-red-300'
        }`}>
          <CheckCircle size={18} className={toast.ok ? 'text-emerald-400' : 'text-red-400'} />
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="bg-[#1A1F2C] p-8 rounded-[2rem] shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
              <div className="bg-blue-500/10 p-2.5 rounded-2xl">
                <FileText className="text-blue-500" size={28} />
              </div>
              Formatos de Documentos
            </h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2 ml-14">
              Configuración de documentos fiscales · Multi-empresa
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
            >
              <Eye size={16} /> Preview
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
            >
              <RotateCcw size={16} /> Restaurar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-blue-500/20 active:scale-95"
            >
              <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
        {isDirty && (
          <div className="mt-4 ml-14 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">Cambios sin guardar</span>
          </div>
        )}
      </div>

      <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>

        {/* ── FORMULARIO ─────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* SECCIÓN: Comprobante de Retención IVA */}
          <div className="bg-[#1A1F2C] rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden">
            <div className="bg-white/5 px-8 py-5 border-b border-white/5">
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} className="text-blue-500" />
                Comprobante de Retención de I.V.A.
              </h2>
              <p className="text-gray-500 text-[10px] font-medium mt-1">
                Textos que aparecen en el documento impreso (formato SENIAT)
              </p>
            </div>

            <div className="p-8 space-y-6">

              {/* Texto Legal Art. 11 */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Texto Legal — Encabezado (Art. 11 Ley IVA)
                </label>
                <textarea
                  rows={4}
                  className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-gray-300 text-xs outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium resize-none"
                  value={form.retentionLegalText}
                  onChange={e => setForm({ ...form, retentionLegalText: e.target.value })}
                />
              </div>

              {/* Providencia Administrativa */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Referencia de Providencia Administrativa
                </label>
                <input
                  className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                  value={form.retentionProvidencia}
                  onChange={e => setForm({ ...form, retentionProvidencia: e.target.value })}
                  placeholder="Providencia Administrativa Nº SNAT/..."
                />
              </div>

              {/* Texto Pie de Página */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Texto del Pie de Página
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-gray-300 text-xs outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium resize-none"
                  value={form.retentionFooterText}
                  onChange={e => setForm({ ...form, retentionFooterText: e.target.value })}
                />
              </div>

              {/* Labels de firmas */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Label Firma Izquierda (Agente)
                  </label>
                  <input
                    className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-medium"
                    value={form.retentionAgentLabel}
                    onChange={e => setForm({ ...form, retentionAgentLabel: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Label Firma Derecha (Beneficiario)
                  </label>
                  <input
                    className="w-full bg-[#0B1120] border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-medium"
                    value={form.retentionSubjectLabel}
                    onChange={e => setForm({ ...form, retentionSubjectLabel: e.target.value })}
                  />
                </div>
              </div>

              {/* IMAGEN SELLO + FIRMA */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Imagen del Sello + Firma del Agente de Retención
                </label>
                <p className="text-[10px] text-gray-600 font-medium -mt-1">
                  Aparecerá en la caja de firma izquierda del comprobante. Formatos: PNG, JPG, WEBP. Fondo transparente recomendado.
                </p>

                {form.retentionSignatureUrl ? (
                  <div className="relative bg-white rounded-2xl p-6 border-2 border-emerald-500/30 flex items-center gap-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.retentionSignatureUrl}
                      alt="Sello y firma del agente"
                      className="h-24 object-contain"
                    />
                    <div className="flex-1">
                      <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Imagen cargada</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-1 break-all">
                        {form.retentionSignatureUrl.split('/').pop()}
                      </p>
                    </div>
                    <button
                      onClick={removeSignature}
                      className="absolute top-3 right-3 p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-white/10 hover:border-blue-500/40 rounded-2xl cursor-pointer transition-all group ${uploadingImg ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleSignatureUpload}
                      disabled={uploadingImg}
                    />
                    {uploadingImg ? (
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload size={32} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                    )}
                    <span className="text-[10px] font-black text-gray-500 group-hover:text-blue-400 uppercase tracking-widest transition-colors">
                      {uploadingImg ? 'Subiendo imagen...' : 'Click para subir imagen'}
                    </span>
                  </label>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ── PREVIEW DEL COMPROBANTE ───────────────────────────── */}
        {showPreview && (
          <div className="bg-[#1A1F2C] rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden">
            <div className="bg-white/5 px-8 py-5 border-b border-white/5">
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Eye size={16} className="text-emerald-500" />
                Preview del Comprobante
              </h2>
              <p className="text-gray-500 text-[10px] font-medium mt-1">Vista aproximada del documento imprimible</p>
            </div>
            <div className="p-6 overflow-auto max-h-[700px]">
              {/* Mini-preview del comprobante */}
              <div className="bg-white text-black rounded-xl p-6 text-[9px] font-serif leading-tight shadow-2xl min-w-[520px]">
                {/* Cabecera legal */}
                <div className="text-center mb-3 text-[8px] text-gray-600 max-w-lg mx-auto">
                  {form.retentionLegalText}
                </div>

                {/* Título */}
                <h1 className="text-center text-[13px] font-bold uppercase mb-1">
                  Comprobante de Retención de I.V.A.
                </h1>
                <p className="text-center text-[8px] text-gray-600 mb-4">
                  {form.retentionProvidencia}
                </p>

                {/* Nro comprobante y Fecha */}
                <div className="flex justify-between items-start mb-3 gap-3">
                  <div className="border border-black px-3 py-1.5 flex-1">
                    <span className="text-[8px] font-bold">Nº DE COMPROBANTE</span>
                    <p className="font-bold text-[11px] mt-0.5">2026-000001</p>
                  </div>
                  <div className="border border-black px-3 py-1.5 text-right">
                    <span className="text-[8px] font-bold">FECHA</span>
                    <p className="font-bold text-[11px] mt-0.5">
                      {new Date().toLocaleDateString('es-VE')}
                    </p>
                  </div>
                </div>

                {/* Agente de Retención */}
                <div className="border border-black p-2 mb-2 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[7px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Nombre o Razón Social del Agente de Retención</p>
                    <p className="font-bold text-[10px]">MI EMPRESA C.A.</p>
                  </div>
                  <div>
                    <p className="text-[7px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">RIF del Agente de Retención</p>
                    <p className="font-bold text-[10px]">J-12345678-9</p>
                  </div>
                </div>

                {/* Dirección */}
                <div className="border border-black p-2 mb-2">
                  <p className="text-[7px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Dirección del Agente de Retención</p>
                  <p>Av. Principal, Edificio Empresa, Piso 1, Caracas</p>
                </div>

                {/* Sujeto Retenido */}
                <div className="border border-black p-2 mb-3 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[7px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Nombre del Sujeto a Retención</p>
                    <p className="font-bold">PROVEEDOR EJEMPLO C.A.</p>
                  </div>
                  <div>
                    <p className="text-[7px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">RIF del Sujeto a Retención</p>
                    <p className="font-bold">J-98765432-1</p>
                  </div>
                  <div>
                    <p className="text-[7px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Dirección del Sujeto a Retención</p>
                    <p>Av. Los Ilustres, Caracas</p>
                  </div>
                </div>

                {/* Tabla */}
                <table className="w-full border-collapse border border-black mb-3 text-[7px]">
                  <thead className="bg-gray-100">
                    <tr>
                      {['Nº Oper.','Fecha','Nº Fact.','Nº Control','Clase Op.','Monto Total','Exento','Base Imp.','% Alíc.','IVA Causado','IVA Retenido','% Ret.','Total a Pagar'].map(h => (
                        <th key={h} className="border border-black p-1 text-center">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-1 text-center">1</td>
                      <td className="border border-black p-1 text-center">{new Date().toLocaleDateString('es-VE')}</td>
                      <td className="border border-black p-1 text-center">A-00001</td>
                      <td className="border border-black p-1 text-center">00-000001</td>
                      <td className="border border-black p-1 text-center">01 Registro</td>
                      <td className="border border-black p-1 text-right">100,00</td>
                      <td className="border border-black p-1 text-right">0,00</td>
                      <td className="border border-black p-1 text-right">86,21</td>
                      <td className="border border-black p-1 text-center">16</td>
                      <td className="border border-black p-1 text-right">13,79</td>
                      <td className="border border-black p-1 text-right font-bold">13,79</td>
                      <td className="border border-black p-1 text-center">100</td>
                      <td className="border border-black p-1 text-right font-bold">86,21</td>
                    </tr>
                  </tbody>
                </table>

                {/* Pie */}
                <p className="text-center text-[7px] text-gray-600 mb-4">{form.retentionFooterText}</p>

                {/* Firmas */}
                <div className="flex gap-6 mt-6">
                  <div className="flex-1 text-center">
                    <div className="border border-gray-300 rounded h-16 flex items-center justify-center overflow-hidden mb-1">
                      {form.retentionSignatureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.retentionSignatureUrl} alt="Firma agente" className="max-h-14 object-contain" />
                      ) : (
                        <span className="text-gray-300 text-[8px]">Sello / Firma</span>
                      )}
                    </div>
                    <p className="text-[7px] font-bold">{form.retentionAgentLabel}</p>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="border border-gray-300 rounded h-16 mb-1" />
                    <p className="text-[7px] font-bold">{form.retentionSubjectLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
