import './globals.css'; // Asegúrate de que este archivo exista, si no, borra esta línea.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LMCU ERP',
  description: 'Sistema de Gestión Empresarial',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-background text-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}