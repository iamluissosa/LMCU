import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Impresión de Documentos fiscales - LMCU ERP',
  description: 'Módulo aislado de impresión de documentos.',
};

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white text-black min-h-screen">
      {/* 
        Este layout está completamente aislado del Dashboard. 
        Sólo incluye Tailwind y elimina Navbar/Sidebar para impresión limpia.
        No usa el fondo oscuro de la app principal.
      */}
      {children}
    </div>
  );
}
