'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, FileText, CheckSquare, ReceiptText, Clock } from 'lucide-react';

const TABS = [
  { name: 'Retención I.V.A.', path: '/dashboard/settings/general/document-formats/retention-iva', icon: ReceiptText, ready: true },
  { name: 'Retención I.S.L.R.', path: '/dashboard/settings/general/document-formats/retention-islr', icon: FileText, ready: true },
  { name: 'Factura / Nota de Entrega', path: '/dashboard/settings/general/document-formats/invoice', icon: CheckSquare, ready: false },
];

export default function DocumentFormatsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="text-blue-500" /> Formatos de Impresión y Legales
        </h1>
        <p className="text-gray-400 mt-1">
          Configuración escalable Multi-Documento para la emisión física y PDF.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* SIDEBAR TABS */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
          {TABS.map(tab => {
            const isActive = pathname === tab.path;
            const Icon = tab.icon;
            
            return tab.ready ? (
              <Link 
                key={tab.path} 
                href={tab.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 border ${
                  isActive 
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] font-bold' 
                    : 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-800 hover:text-white hover:border-gray-600'
                }`}
              >
                <Icon size={18} />
                {tab.name}
              </Link>
            ) : (
              <div 
                key={tab.path}
                className="flex items-center justify-between px-4 py-3 rounded-xl border bg-gray-900/50 border-gray-800/50 text-gray-600 cursor-not-allowed"
                title="Próximante"
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className="opacity-50" />
                  <span className="text-sm">{tab.name}</span>
                </div>
                <Clock size={14} className="text-orange-500/50" />
              </div>
            )
          })}
        </div>

        {/* EDITOR AREA */}
        <div className="flex-1 w-full relative">
           {children}
        </div>
      </div>
    </div>
  );
}
