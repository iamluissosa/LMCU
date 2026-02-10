export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Bienvenido de nuevo, Luis 👋</h1>
      
      {/* Tarjetas de Resumen (Stats) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Ingresos Totales</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">$0.00</h3>
            </div>
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <span>💰</span>
            </div>
          </div>
          <span className="text-xs text-green-600 mt-4 block">+0% este mes</span>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Productos en Stock</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">1</h3>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <span>📦</span>
            </div>
          </div>
          <span className="text-xs text-gray-500 mt-4 block">1 Producto Registrado</span>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Alertas</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">0</h3>
            </div>
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <span>🔔</span>
            </div>
          </div>
          <span className="text-xs text-gray-500 mt-4 block">Todo en orden</span>
        </div>
      </div>

      {/* Área vacía para futuro contenido */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center py-20">
        <p className="text-gray-400">Aquí irán los gráficos de rendimiento próximamente...</p>
      </div>
    </div>
  );
}