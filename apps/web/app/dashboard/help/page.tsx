'use client';

import { useState } from 'react';
import { 
  BookOpen, Shield, Users, ShoppingCart, Package, 
  DollarSign, Calculator, Settings, Receipt, FileText,
  Building2, Hash, CreditCard, ClipboardCheck, Truck,
  TrendingUp, CircleHelp, AlertTriangle
} from 'lucide-react';

type SectionID = 'intro' | 'admin' | 'inventory' | 'sales' | 'finance' | 'settings';

const MENU_ITEMS = [
  { id: 'intro', icon: BookOpen, label: '1. Introducción al ERP LMCU', color: 'text-blue-400' },
  { id: 'admin', icon: Shield, label: '2. Primeros Pasos: Super Admin', color: 'text-purple-400' },
  { id: 'inventory', icon: Package, label: '3. Productos e Inventario', color: 'text-emerald-400' },
  { id: 'sales', icon: ShoppingCart, label: '4. Módulo de Ventas', color: 'text-amber-400' },
  { id: 'finance', icon: DollarSign, label: '5. Pagos y Finanzas', color: 'text-rose-400' },
  { id: 'settings', icon: Settings, label: '6. Ajustes Fiscales y Formatos', color: 'text-gray-400' },
];

export default function HelpDocPage() {
  const [activeTab, setActiveTab] = useState<SectionID>('intro');

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-[#0A0F1A]">
      
      {/* NAVEGACIÓN LATERAL MANUAL */}
      <aside className="w-80 border-r border-white/5 bg-[#121824] flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
              <CircleHelp size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Centro de Ayuda</h1>
              <p className="text-xs text-blue-400 font-medium">ERP v1.0.0 — Documentación</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <h2 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-3 mb-3">Temario Oficial</h2>
          <nav className="space-y-1">
            {MENU_ITEMS.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as SectionID)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 text-left ${
                    isActive 
                      ? 'bg-white/10 text-white font-medium shadow-sm' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <item.icon size={18} className={`${isActive ? item.color : 'opacity-70'} shrink-0`} />
                  <span className="text-sm truncate leading-tight">{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                </button>
              )
            })}
          </nav>

          <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/5">
             <div className="flex items-center gap-2 mb-2">
                 <AlertTriangle size={14} className="text-yellow-500" />
                 <span className="text-xs font-bold text-gray-300">Tip de Navegación</span>
             </div>
             <p className="text-xs text-gray-500 leading-relaxed">
               Este manual es interactivo. Utiliza el teclado o el clic del mouse para saltar instantáneamente entre los temas operativos de tu empresa.
             </p>
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar relative">
         <div className="max-w-4xl mx-auto px-6 py-10 lg:px-12 lg:py-16">
            
            {activeTab === 'intro' && <IntroSection />}
            {activeTab === 'admin' && <AdminSection />}
            {activeTab === 'inventory' && <InventorySection />}
            {activeTab === 'sales' && <SalesSection />}
            {activeTab === 'finance' && <FinanceSection />}
            {activeTab === 'settings' && <SettingsSection />}

         </div>
      </main>

    </div>
  );
}

// ============================================
// COMPONENTES DE SECCIONES (MARKDOWN HTML EXCELENTE)
// ============================================

function IntroSection() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
       <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6 inline-block">Módulo 1</span>
       <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
         Bienvenido al <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">LMCU ERP Multi-inquilino</span>
       </h1>
       <p className="text-xl text-gray-400 font-light leading-relaxed mb-12">
         Una guía corporativa definitiva para entender la arquitectura, diseño y operación del portal administrativo para la gestión de múltiples empresas.
       </p>

       <div className="space-y-12">
         {/* Bloque 1 */}
         <section className="bg-[#1A1F2C]/50 rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-400"><Building2 size={24} /></div>
              <h2 className="text-2xl font-bold text-white">¿Qué es un Entorno Multi-Empresa?</h2>
            </div>
            <p className="text-gray-300 leading-loose text-sm">
              LMCU ERP ha sido diseñado bajo una arquitectura de "software como servicio" (SaaS). Esto significa que <strong>un solo sistema alberga decenas de empresas (Tenants)</strong>.
            </p>
            <ul className="mt-6 space-y-3">
               <li className="flex gap-3 text-sm text-gray-400"><span className="text-blue-500 font-bold shrink-0">→</span> Los datos nunca se cruzan entre empresas. Tu facturación, inventario y retenciones son exclusivas de tu entorno.</li>
               <li className="flex gap-3 text-sm text-gray-400"><span className="text-blue-500 font-bold shrink-0">→</span> Los administradores globales pueden ser invitados a múltiples empresas usando el mismo correo (Login único).</li>
               <li className="flex gap-3 text-sm text-gray-400"><span className="text-blue-500 font-bold shrink-0">→</span> Las integraciones del Banco Central de Venezuela (BCV) funcionan a nivel macro del sistema y proveen automatización contable global a todos.</li>
            </ul>
         </section>

         {/* Bloque 2 */}
         <section className="bg-[#1A1F2C]/50 rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-400"><TrendingUp size={24} /></div>
              <h2 className="text-2xl font-bold text-white">Entendiendo las Tasas de Cambio (USD/EUR)</h2>
            </div>
            <p className="text-gray-300 leading-loose text-sm">
              Toda la facturación y retención en Venezuela depende estrictamente de los valores dictaminados por el BCV.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
               <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                 <h4 className="text-white font-bold mb-2 flex items-center gap-2"><DollarSign size={16} className="text-green-400"/> Menú Superior</h4>
                 <p className="text-xs text-gray-400 leading-relaxed">
                   En la barra de navegación (arriba a la derecha), el sistema muestra constantemente los valores fijos del dólar y el euro. Estos se actualizan de los servidores gubernamentales si presionas el botón circular de "Recargar".
                 </p>
               </div>
               <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                 <h4 className="text-white font-bold mb-2 flex items-center gap-2"><CreditCard size={16} className="text-blue-400"/> Transacciones</h4>
                 <p className="text-xs text-gray-400 leading-relaxed">
                   Al momento de cerrar un Pago de Factura, el sistema calculará silenciosamente la equivalencia e imprimirá el factor exacto del día en el documento, protegiendo a la empresa ante fiscalizaciones fiscales.
                 </p>
               </div>
            </div>
         </section>
       </div>
    </div>
  )
}

function AdminSection() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
       <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider mb-6 inline-block">Módulo 2</span>
       <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
         Manual del Administrador
       </h1>
       <p className="text-xl text-gray-400 font-light leading-relaxed mb-12">
         Aprende a delegar poder, crear jerarquías de seguridad a lo largo y ancho de tu organización, y estructurar el motor financiero (ISLR/Series).
       </p>

       {/* CREACIÓN DE ROLES */}
       <div className="mb-12">
         <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Shield className="text-purple-400" /> 1. Gestión de Permisos (RBAC)
         </h3>
         <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
           <p className="text-sm text-gray-300 leading-relaxed mb-6">
             El sistema LMCU utiliza un modelo avanzado de "Role Based Access Control" (RBAC). A diferencia de los sistemas tradicionales, tú no le das <em>permisos a una persona</em>; tú le das <strong>permisos a un ROL</strong> (ej: "Supervisor de Caja").
           </p>
           <ol className="list-decimal list-inside space-y-4 text-sm text-gray-400 ml-2">
             <li className="pl-2">Dirígete en el menú vertical a <strong className="text-white">Sistema &gt; Configuración &gt; Usuarios</strong>.</li>
             <li className="pl-2">Selecciona la pestaña <strong className="text-blue-400">Escudo (Roles y Permisos)</strong> en la parte superior.</li>
             <li className="pl-2">Presiona <span className="bg-gradient-to-r from-blue-600 to-indigo-600 px-2 py-0.5 rounded text-white">+ Crear Rol</span>. Escribe "Vendedor" y marca ÚNICAMENTE la casilla: <code className="bg-black/50 px-1 py-0.5 rounded border border-white/10 text-rose-300">Crear Cotizaciones y Pedidos</code>.</li>
             <li className="pl-2">Guarda el Rol. Ahora, puedes ir a la pestaña <strong>Usuarios</strong> e invitar al correo del empleado asignándole ese rol exacto. Si el empleado intenta entrar a "Facturas de Compra", el sistema le botará automáticamente de la vista bloqueando el acceso.</li>
           </ol>
           
           <div className="mt-8 bg-black/40 border-l-4 border-yellow-500 p-4 rounded-r-xl">
             <p className="text-xs text-yellow-500 font-bold mb-1">¡ADVERTENCIA DEL SISTEMA!</p>
             <p className="text-xs text-gray-400">Cualquier empleado cuyo "Tipo de Acceso" sea <strong className="text-white">SUPER ADMIN</strong> ignorará todo bloqueo y tendrá acceso garantizado al 100% de la empresa, independientemente del Rol customizado que se haya elegido en el selector.</p>
           </div>
         </div>
       </div>

       {/* CORRELATIVOS */}
       <div className="mb-12">
         <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Hash className="text-purple-400" /> 2. Series, Correlativos y Legalidad
         </h3>
         <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
           <p className="text-sm text-gray-300 leading-relaxed mb-6">
             Antes de procesar la primera venta o compra, el Administrador tiene la obligación de inicializar el sistema contable con el talonario autorizado por las instituciones tributarias.
           </p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-white/5 rounded-xl p-5 hover:bg-white/5 transition-colors">
                <Receipt className="text-emerald-400 mb-3" size={20} />
                <h4 className="text-white font-bold mb-2">Prefijos de Facturación</h4>
                <p className="text-xs text-gray-400">Dirígete a <strong className="text-gray-300">Configuración &gt; Correlativos</strong>. Define tu serial (ej. FAC- ) y el número histórico oficial con el cual empezarás a facturar electrónicamente. Esto es inamovible tras su facturación y suple protección anti-fraudes.</p>
              </div>
              <div className="border border-white/5 rounded-xl p-5 hover:bg-white/5 transition-colors">
                <Calculator className="text-orange-400 mb-3" size={20} />
                <h4 className="text-white font-bold mb-2">Tabla de ISLR Nacional</h4>
                <p className="text-xs text-gray-400">Configuración &gt; Ajustes Fiscales. Acá cargas la base legal y porcentajes. <strong>Si falta un concepto en la vida real</strong>, el contador de la empresa tiene el poder de añadir su código decreto para habilitarlo a lo largo del subsistema del ERP.</p>
              </div>
           </div>
         </div>
       </div>
    </div>
  )
}

function InventorySection() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
       <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6 inline-block">Módulo 3</span>
       <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
         Inventario y Logística
       </h1>
       <p className="text-xl text-gray-400 font-light leading-relaxed mb-12">
         Las entrañas operativas: controla de forma milimétrica tu catálogo de productos, existencias en almacén e historial de suministro de proveedores directos.
       </p>

       <div className="space-y-6">
         {/* Productos */}
         <div className="group bg-[#1A1F2C]/40 border-l-4 border-transparent hover:border-emerald-500 border-y border-r border-y-white/5 border-r-white/5 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:bg-[#1A1F2C]/80">
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-3">
               <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><Package size={20} /></div>
               Creación de Productos (SKUs)
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed pl-14">
              En <strong className="text-gray-200">Operaciones &gt; Inventario</strong> accederás al núcleo. Un producto tiene dos precios fundamentales: el <strong>Precio Base</strong> (costo de adquisición) y la capacidad de soportar categorización e impuestos directos adheridos, como un IVA grabado de 16%. El "Stock Actual" nunca debe ser envenenado alterándolo manualmente; siempre dependerá de las matemáticas detrás de las "Recepciones" corporativas.
            </p>
         </div>

         {/* OC y Proveedores */}
         <div className="group bg-[#1A1F2C]/40 border-l-4 border-transparent hover:border-teal-500 border-y border-r border-y-white/5 border-r-white/5 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:bg-[#1A1F2C]/80">
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-3">
               <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400"><ShoppingCart size={20} /></div>
               Procura y Órdenes de Compra (OC)
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed pl-14">
              Si el stock se acaba, usarás el submódulo <strong className="text-gray-200">Órdenes de Compra</strong> o <strong className="text-gray-200">Proveedores</strong>.
              <br/><br/>
              Una Orden de Compra es un compromiso presupuestario. Seleccionas un proveedor y agregas ítems del catálogo. Esto <em>no afecta contabilidad ni afecta niveles de inventario físico</em>. Otorga al contador la visión de deudas inminentes proyectadas.
            </p>
         </div>

         {/* Recepciones */}
         <div className="group bg-[#1A1F2C]/40 border-l-4 border-transparent hover:border-green-500 border-y border-r border-y-white/5 border-r-white/5 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:bg-[#1A1F2C]/80">
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-3">
               <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><ClipboardCheck size={20} /></div>
               Recepciones en Almacén (El Ingreso Real)
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed pl-14">
              ¿Llegó finalmente el camión con mercancía aprobada en una Orden de Compra previa? Irás a <strong className="text-gray-200">Recepciones</strong>. Al procesar el registro (asociado o no a un proveedor oficial), el stock de los productos correspondientes incrementará inmediatamente. Este el único puente logístico validado para sumar masivamente inventario.
            </p>
         </div>
       </div>
    </div>
  )
}

function SalesSection() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
       <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-wider mb-6 inline-block">Módulo 4</span>
       <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
         Módulo de Ventas
       </h1>
       <p className="text-xl text-gray-400 font-light leading-relaxed mb-12">
         El corazón que inyecta capital a la empresa. Transforma oportunidades crudas (Cotizaciones) en rentabilidad sólida (Facturación Física e Impresión de Reportes).
       </p>

       <div className="relative">
         {/* Timeline */}
         <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-amber-500/50 via-orange-500/20 to-transparent z-0 hidden sm:block"></div>
         
         <div className="space-y-10 relative z-10">
           {/* Paso 1: Clientes */}
           <div className="flex flex-col sm:flex-row gap-6 items-start">
             <div className="bg-[#1A1F2C] border border-white/10 w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 shadow-xl">
               <Users className="text-amber-500" size={32} />
             </div>
             <div className="pt-2">
               <h3 className="text-xl font-bold text-white mb-2">1. Captación de Cartera de Clientes</h3>
               <p className="text-sm text-gray-400 leading-relaxed mb-3">
                 Antes de iniciar operaciones comerciales, debes poblar <strong className="text-white">Operaciones &gt; Clientes</strong>. Se requiere ingresar su Documento RIF/Cédula, correo oficial para entregas en PDF, número de contacto móvil y dirección fiscal oficial.
               </p>
             </div>
           </div>

           {/* Paso 2: Cotizaciones */}
           <div className="flex flex-col sm:flex-row gap-6 items-start">
             <div className="bg-[#1A1F2C] border border-white/10 w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 shadow-xl">
               <FileText className="text-orange-400" size={32} />
             </div>
             <div className="pt-2">
               <h3 className="text-xl font-bold text-white mb-2">2. Cotizaciones Formativas (Presupuestos)</h3>
               <p className="text-sm text-gray-400 leading-relaxed mb-3">
                 El vendedor creará una nueva Cotización sumando al usuario objetivo el "carrito" de productos que están cotizando. Se congela el valor del día según Base, subtotal, IVA o exclusión fiscal. <strong>Este ente es estático y no compromete mercancía real de los almacenes (Soft Lock).</strong>
               </p>
             </div>
           </div>

           {/* Paso 3: Pedidos */}
           <div className="flex flex-col sm:flex-row gap-6 items-start">
             <div className="bg-[#1A1F2C] border border-white/10 w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 shadow-xl">
               <ShoppingCart className="text-red-400" size={32} />
             </div>
             <div className="pt-2">
               <h3 className="text-xl font-bold text-white mb-2">3. Pedido de Venta (Reserva Activa)</h3>
               <p className="text-sm text-gray-400 leading-relaxed mb-3">
                 La cotización es aceptada. Al ser convertida en <strong>Pedido (Orden)</strong>, entra en vigencia ejecutiva y la mercancía suele considerarse abstractamente bloqueada en compromisos para el despachador. Su transición puede moverse a estatus de facturación inminente.
               </p>
             </div>
           </div>

           {/* Paso 4: Factura Impresa PDF */}
           <div className="flex flex-col sm:flex-row gap-6 items-start">
             <div className="bg-[#1A1F2C] border border-white/10 w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 shadow-xl ring-2 ring-rose-500/30">
               <Receipt className="text-rose-500 animate-pulse-slow" size={32} />
             </div>
             <div className="pt-2">
               <h3 className="text-xl font-bold text-white mb-2">4. Facturación Múltiple PDF Oficial</h3>
               <p className="text-sm text-gray-400 leading-relaxed mb-3">
                 El estadio cumbre. El pedido se despacha en el sistema presionando "Facturar" ó "Anular". Al facturarse, el stock decrementa matemáticamente su saldo corporativo, y se genera un correlativo incuestionable (Número de Factura Oficial). Podrás entrar en el detalle del documento y clickar el botón rojo <strong>"Imprimir / PDF"</strong> para escupir sin descargas secundarias el recibo corporativo listo para entregar impreso.
               </p>
             </div>
           </div>

         </div>
       </div>
    </div>
  )
}

function FinanceSection() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
       <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider mb-6 inline-block">Módulo 5</span>
       <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
         Pago, Egresos y Libros de Finanzas
       </h1>
       <p className="text-xl text-gray-400 font-light leading-relaxed mb-12">
         Garantiza la fidelidad contable y tributaria. Control de los egresos en multimoneda, cruce con retenciones ISLR y emisión computarizada del Impuesto de Valor Añadido (Libro de Compra).
       </p>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
         {/* Card Cuentas por Pagar */}
         <div className="bg-gradient-to-b from-[#1A1F2C] to-[#0A0F1A] border-t border-rose-500/30 rounded-2xl p-6 shadow-xl">
            <DollarSign className="text-rose-400 mb-4" size={28} />
            <h3 className="text-lg font-bold text-white mb-2">Facturas de Compra (Cuentas por Pagar)</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
               <strong className="text-gray-200">Facturación &gt; Facturas de Compra.</strong> Obligatorias para toda empresa seria. Aquí el contador vacía del papel físico las facturas entregadas por corporativas ajenas, registrando IVA, retención porcentual y desglose de montos exentos y cobrados. Todo esto alimentará automáticamente el Libro Fiscal oficial.
            </p>
         </div>

         {/* Card Salidas de dinero */}
         <div className="bg-gradient-to-b from-[#1A1F2C] to-[#0A0F1A] border-t border-purple-500/30 rounded-2xl p-6 shadow-xl">
            <CreditCard className="text-purple-400 mb-4" size={28} />
            <h3 className="text-lg font-bold text-white mb-2">Creación de Pagos y Egresos</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
               Ninguna factura se paga sola en la contabilidad. Un operador financiero debe ingresar a <strong className="text-gray-200">Finanzas &gt; Registrar Pago</strong>. Indicará cómo se canceló esa deuda millonaria (Referencia Zelle, Efectivo en Dólares, Transferencia Banesco o BofA) dictando el factor referencial pactado ese día (tasa paralela / BCV).
            </p>
         </div>
       </div>

       {/* Libro Fiscal y Reporteria */}
       <div className="bg-[#1A1F2C]/60 rounded-3xl p-8 border border-white/5">
         <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <FileText className="text-gray-300" /> Libros de IVA e Historial de Gastos
         </h3>
         <div className="text-sm text-gray-300 leading-loose">
           <p className="mb-4">
             Mes a mes, deberes formales. Cero dolores de cabeza. La sección <strong>Finanzas &gt; Libros Fiscales IVA</strong> es el Santo Grial.
           </p>
           <p>
             Elige entre <strong className="text-white">"Libro de Ventas"</strong> o <strong className="text-white">"Libro de Compras"</strong>, indica el periodo específico del mes activo (p.ej Marzo) y oprime <code>"Imprimir Reporte Fiscal (PDF)"</code>. En base al artículo vigente del SENIAT, se generará una rejilla PDF legal para ser entregada vía portal estatal que cumple todos los dictámenes tributarios sobre operaciones exentas y sujetas. Además en el módulo <strong>Reportes Extras</strong> te darás cuenta a donde vuela el dinero viendo históricos categorizados.
           </p>
         </div>
       </div>
    </div>
  )
}

function SettingsSection() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
       <span className="px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-400 text-xs font-bold uppercase tracking-wider mb-6 inline-block">Módulo 6 — Anexo IT</span>
       <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
         Ajuste Formatos de Documentos
       </h1>
       <p className="text-xl text-gray-400 font-light leading-relaxed mb-12">
         Soporte avanzado y personalización del PDF corporativo entregado a los clientes. Requiere precaución por parte del IT o Encargado Administrativo.
       </p>

       <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
         <div className="flex items-start gap-5">
            <div className="p-4 bg-slate-800 rounded-full border border-slate-600 hidden sm:block">
               <Settings size={32} className="text-slate-300 animate-[spin_8s_linear_infinite]" />
            </div>
            <div>
               <h3 className="text-xl font-bold text-white mb-4">Mapeo de Coordenadas de Impresión Directa</h3>
               <p className="text-sm text-gray-300 leading-relaxed mb-6">
                 Esta sección está bloqueada a simples mortales y requerirás el rol de "Super Admin" para configurar medidas microscópicas de papel pre-impreso y facturas forma libre en impresoras de inyección o carro de impacto (matriz de punto).
               </p>
               
               <ul className="space-y-4 text-sm text-gray-400">
                 <li className="flex gap-4 p-4 bg-black/30 rounded-xl border border-white/5">
                   <strong className="text-blue-400 w-24 shrink-0">Paso 1:</strong>
                   <span>Ir a Sistema &gt; Configuración &gt; Formatos.</span>
                 </li>
                 <li className="flex gap-4 p-4 bg-black/30 rounded-xl border border-white/5">
                   <strong className="text-blue-400 w-24 shrink-0">Paso 2:</strong>
                   <span>Seleccionar el tipo de documento a editar ("Format: FACTURA OFICIAL").</span>
                 </li>
                 <li className="flex gap-4 p-4 bg-black/30 rounded-xl border border-white/5">
                   <strong className="text-blue-400 w-24 shrink-0">Paso 3:</strong>
                   <span>Crear variables cartesianas paramétricas de posición `(X, Y)` en la pantalla. Pudiendo colocar el prefijo y número exactamente dentro del pequeño rectángulo predeterminado por la plantilla del imprentero en milímetros precisos.</span>
                 </li>
               </ul>

               <p className="text-xs text-yellow-500/80 italic mt-6 font-medium">Nota: Para no arruinar talonarios oficiales con errores en el eje Y, solicita siempre hacer una "Factura de Pruebas" visual antes de activar la caja registradora o impresora y ejecutar tu orden local.</p>
            </div>
         </div>
       </div>

    </div>
  )
}
