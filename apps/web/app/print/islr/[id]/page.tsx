'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface VoucherData {
  id: string;
  controlNumber: string;
  totalInvoice: number;
  taxableBase: number;
  percentage: number;
  sustraendo: number;
  retainedAmount: number;
  retentionDate: string;
  company: {
    name: string;
    rif: string;
    address: string;
    settings: {
      islrRetentionLegalText?: string;
      islrRetentionAgentLabel?: string;
      islrRetentionSubjectLabel?: string;
      retentionSignatureUrl?: string;
    };
  };
  supplier: {
    name: string;
    rif: string;
    personType: string;
    address: string;
  };
  concept: {
    code: string;
    description: string;
  };
}

interface DocumentFormat {
  documentType: string;
  headerText: string;
  footerText: string;
  legalText: string;
  agentSignatureLabel: string;
  subjectSignatureLabel: string;
  stampUrl: string | null;
}

export default function PrintIslrVoucherPage() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<VoucherData | null>(null);
  const [docFormat, setDocFormat] = useState<DocumentFormat | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVoucher() {
      try {
        const voucher = await apiClient.get<VoucherData>(`/islr/${id}/voucher`);
        setData(voucher);
        
        try {
          const format = await apiClient.get<DocumentFormat>('/document-formats/RET_ISLR');
          setDocFormat(format);
        } catch {
          // Ignorar error de formato y usar defaults
        }
      } catch (e: unknown) {
        const err = e as { message?: string };
        setError(err.message || 'Error al cargar documento');
      } finally {
        setLoading(false);
      }
    }
    void fetchVoucher();
  }, [id]);

  // Imprimir automáticamente cuando los datos estén listos
  useEffect(() => {
    if (!loading && data && !error) {
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, data, error]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        <h3>{error || 'No se pudo cargar el documento'}</h3>
      </div>
    );
  }

  const { company, supplier, concept, controlNumber, retentionDate, totalInvoice, taxableBase, percentage, sustraendo, retainedAmount } = data;
  const settings = company.settings || {};

  const handlePrint = () => window.print();

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans bg-white text-black min-h-screen">
      {/* Barra de Acciones - Solo visible si el usuario cierra el diálogo de impresión */}
      <div className="flex justify-between items-center mb-8 print:hidden border-b pb-4">
        <h1 className="text-xl font-bold">Comprobante de Retención ISLR</h1>
        <button
          onClick={handlePrint}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg active:scale-95"
        >
          <Printer size={18} />
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* COMPROBANTE FÍSICO (Formato Oficial SENIAT Decreto 1808) */}
      <div className="border-4 border-black p-8 relative">
        {/* Cabecera Legal */}
        <div className="text-center text-[10px] sm:text-xs mb-8">
          <p className="font-serif italic leading-tight max-w-xl mx-auto">
            {docFormat?.legalText || 'Para dar cumplimiento con la normativa establecida en el Artículo 24, Decreto 1.808 en materia de Retenciones de ISLR publicado en Gaceta Oficial No. 36.203 de fecha 12 de mayo de 1.997'}
          </p>
        </div>

        {/* Logo y Título Principal */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black uppercase underline decoration-2 underline-offset-4">
            Comprobante de Retención de I.S.L.R.
          </h2>
        </div>

        {/* Nro Comprobante y Fecha */}
        <div className="flex justify-end gap-4 mb-8">
          <div className="border-2 border-black px-4 py-2 w-48 text-center bg-gray-50">
            <span className="text-[10px] font-bold block mb-1">Nº COMPROBANTE</span>
            <span className="font-black text-sm text-red-600 font-mono tracking-widest">{controlNumber}</span>
          </div>
          <div className="border-2 border-black px-4 py-2 w-32 text-center bg-gray-50">
            <span className="text-[10px] font-bold block mb-1">FECHA</span>
            <span className="font-bold text-sm">{new Date(retentionDate).toLocaleDateString('es-VE')}</span>
          </div>
        </div>

        {/* Datos Agente (Empresa) */}
        <div className="border-2 border-black mb-4">
          <div className="bg-gray-200 border-b-2 border-black px-3 py-1">
            <h3 className="text-xs font-black uppercase tracking-widest">A. Datos del Agente de Retención</h3>
          </div>
          <div className="p-4 grid grid-cols-4 gap-4 text-sm">
            <div className="col-span-3">
              <span className="text-[10px] font-bold block mb-0.5 text-gray-500">Nombre o Razón Social</span>
              <p className="font-black">{company.name.toUpperCase()}</p>
            </div>
            <div className="col-span-1 border-l-2 pl-4 border-gray-300">
              <span className="text-[10px] font-bold block mb-0.5 text-gray-500">N° RIF</span>
              <p className="font-black">{company.rif}</p>
            </div>
            <div className="col-span-4 mt-2 pt-2 border-t border-gray-100">
              <span className="text-[10px] font-bold block mb-0.5 text-gray-500">Dirección</span>
              <p className="text-sm">{company.address || 'NO REGISTRADA'}</p>
            </div>
          </div>
        </div>

        {/* Datos Beneficiario (Proveedor) */}
        <div className="border-2 border-black mb-8">
          <div className="bg-gray-200 border-b-2 border-black px-3 py-1">
            <h3 className="text-xs font-black uppercase tracking-widest">B. Datos del Beneficiario</h3>
          </div>
          <div className="p-4 grid grid-cols-4 gap-4 text-sm">
            <div className="col-span-3">
              <span className="text-[10px] font-bold block mb-0.5 text-gray-500">Nombre o Razón Social</span>
              <p className="font-black">{supplier.name.toUpperCase()}</p>
            </div>
            <div className="col-span-1 border-l-2 pl-4 border-gray-300">
              <span className="text-[10px] font-bold block mb-0.5 text-gray-500">N° RIF</span>
              <p className="font-black">{supplier.rif}</p>
            </div>
            <div className="col-span-2 mt-2 pt-2 border-t border-gray-100">
              <span className="text-[10px] font-bold block mb-0.5 text-gray-500">Tipo de Persona Fiscal</span>
              <p className="font-bold">{supplier.personType}</p>
            </div>
            <div className="col-span-2 mt-2 pt-2 border-t border-gray-100 border-l pl-4">
              <span className="text-[10px] font-bold block mb-0.5 text-gray-500">Dirección</span>
              <p className="text-xs">{supplier.address || 'NO REGISTRADA'}</p>
            </div>
          </div>
        </div>

        {/* Tabla Informativa (Con un solo item de consolidado) */}
        <div className="mb-12 border-2 border-black">
          <table className="w-full text-sm text-center border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border-b-2 border-r-2 border-black p-2 font-bold text-[10px] w-24 leading-tight">Cód. Concepto<br/>(SENIAT)</th>
                <th className="border-b-2 border-r-2 border-black p-2 font-bold text-[10px]">Descripción del Concepto Retenido</th>
                <th className="border-b-2 border-r-2 border-black p-2 font-bold text-[10px] leading-tight">Monto Total<br/>Facturado (Bs)</th>
                <th className="border-b-2 border-r-2 border-black p-2 font-bold text-[10px] leading-tight">Base<br/>Imponible (Bs)</th>
                <th className="border-b-2 border-r-2 border-black p-2 font-bold text-[10px] w-12">%<br/>Ret.</th>
                <th className="border-b-2 border-r-2 border-black p-2 font-bold text-[10px] leading-tight">Sustraendo<br/>(Bs.)</th>
                <th className="border-b-2 border-black p-2 font-bold text-[10px] bg-red-100 leading-tight text-red-800">ISLR<br/>RETENIDO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-r-2 border-black p-3 font-mono font-bold">{concept.code}</td>
                <td className="border-r-2 border-black p-3 text-left text-xs font-semibold">{concept.description}</td>
                <td className="border-r-2 border-black p-3">
                  {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(totalInvoice)}
                </td>
                <td className="border-r-2 border-black p-3 font-bold">
                  {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(taxableBase)}
                </td>
                <td className="border-r-2 border-black p-3 text-center">{percentage}%</td>
                <td className="border-r-2 border-black p-3 text-gray-600">
                  {sustraendo > 0 ? new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(sustraendo) : '0,00'}
                </td>
                <td className="p-3 font-black text-red-600 bg-red-50 text-base">
                  {new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(retainedAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Firmas */}
        <div className="flex justify-between mt-24 gap-12 max-w-2xl mx-auto">
          <div className="flex-1 text-center relative border-t-2 border-black pt-2">
            {docFormat?.stampUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={docFormat.stampUrl} 
                alt="Firma" 
                className="absolute -top-24 left-1/2 -translate-x-1/2 h-24 object-contain opacity-80"
              />
            )}
            <p className="font-bold text-xs uppercase tracking-wider mb-1">
              {docFormat?.agentSignatureLabel || 'Agente de Retención'}
            </p>
            <p className="text-[10px] text-gray-600">Firma y Sello</p>
          </div>
          <div className="flex-1 text-center relative border-t-2 border-black pt-2">
            <p className="font-bold text-xs uppercase tracking-wider mb-1">
              {docFormat?.subjectSignatureLabel || 'Beneficiario'}
            </p>
            <p className="text-[10px] text-gray-600">Firma / Sello / Fecha de recepción</p>
          </div>
        </div>

      </div>
    </div>
  );
}
