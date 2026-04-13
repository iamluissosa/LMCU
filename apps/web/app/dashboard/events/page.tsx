'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Calendar, Plus, Search, Eye, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal para Nuevo Evento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', date: '' });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any[]>('/events');
      setEvents(data || []);
    } catch (e) {
      toast.error('Error cargando eventos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.post('/events', formData);
      toast.success('Evento creado con éxito');
      setIsModalOpen(false);
      setFormData({ name: '', date: '' });
      fetchEvents();
    } catch (e) {
      toast.error('Error al crear evento');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEvents = events.filter(ev => 
    ev.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-[#1A1F2C] p-6 rounded-3xl shadow-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-fuchsia-500" />
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Calendar className="text-purple-500" /> Eventos
          </h1>
          <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest font-bold">Mide la Rentabilidad y Utilidad por Proyecto</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/dashboard/events/report')} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-[10px] font-black uppercase tracking-widest">
            <TrendingUp size={16} className="text-emerald-400" /> Reporte Mensual
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-xl shadow-purple-500/20 text-[10px] font-black uppercase tracking-widest">
            <Plus size={16} /> Crear Evento
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input 
          type="text" placeholder="Buscar evento de campo..." 
          className="w-full pl-12 pr-4 py-3 bg-[#1A1F2C] border border-white/5 text-white placeholder-gray-500 rounded-2xl focus:ring-1 focus:ring-purple-500 outline-none transition-all font-medium text-sm"
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid de Eventos */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 font-mono text-xs uppercase tracking-widest">Cargando eventos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(ev => (
            <div key={ev.id} className="bg-[#1A1F2C] border border-white/5 p-6 rounded-3xl hover:border-purple-500/40 transition-all hover:bg-white/[0.02] cursor-pointer flex flex-col justify-between min-h-[220px] shadow-lg" onClick={() => router.push(`/dashboard/events/${ev.id}`)}>
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ${ev.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {ev.status === 'ACTIVE' ? <Clock size={12} /> : <CheckCircle size={12} />}
                    {ev.status === 'ACTIVE' ? 'En Curso' : 'Completado'}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono bg-[#0B1120] px-2 py-1 rounded-lg border border-white/5">
                    {new Date(ev.date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight">{ev.name}</h3>
              </div>
              <div className="mt-8 flex justify-between items-center border-t border-white/5 pt-5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ver Finanzas</span>
                <span className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Eye size={14} />
                </span>
              </div>
            </div>
          ))}
          {filteredEvents.length === 0 && (
            <div className="col-span-full py-16 text-center bg-[#1A1F2C] border border-white/5 rounded-3xl text-gray-500 font-mono text-xs uppercase tracking-widest">No existen eventos registrados.</div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-[#1A1F2C] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-lg font-black text-white mb-6 uppercase tracking-wider text-center">Registrar <span className="text-purple-400">Evento</span></h2>
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Nombre del Proyecto</label>
                <input required className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="INICIO OPERATIVO SEMANA SANTA 2026"/>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Fecha de Ejecución</label>
                <input required type="date" className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none block" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}/>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-[#0B1120] hover:bg-white/5 text-gray-300 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-white/5">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50">Crear y Continuar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
