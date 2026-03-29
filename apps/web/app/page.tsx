'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Building2, Lock, Mail, User, Phone, MapPin, Map, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Datos de Empresa
  const [companyName, setCompanyName] = useState('');
  const [rif, setRif] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        // --- REGISTRO UNIFICADO (Auth + DB + Empresa + Roles) ---
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, 
                password, 
                name,
                roleLegacy: isSuperAdmin ? 'ADMIN' : 'USER',
                company: {
                    name: companyName,
                    rif,
                    address,
                    state,
                    city,
                    phone,
                    email: companyEmail,
                    taxpayerType: 'Ordinario' // Default
                }
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Error registrando usuario");
        }
        
        // Login automático después de registrar
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;

        router.push('/dashboard');

      } else {
        // --- LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden font-sans p-4">
      
      {/* BACKGROUND DECORATIONS (GLOW) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className={`relative z-10 bg-slate-900/80 backdrop-blur-md p-8 md:p-10 rounded-3xl shadow-2xl w-full border border-white/5 transition-all duration-500 ease-in-out ${isRegister ? 'max-w-3xl' : 'max-w-md'}`}>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25">
             <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">LMCU ERP</h1>
          <p className="text-gray-400 mt-2 text-sm">
            {isRegister ? 'Crea tu cuenta corporativa' : 'Inicia sesión en tu espacio de trabajo'}
          </p>
        </div>

        <form onSubmit={handleAuth} className={isRegister ? "grid grid-cols-1 md:grid-cols-2 gap-8" : "space-y-6"}>
          
          {/* SECCIÓN 1: CREDENCIALES USUARIO */}
          <div className="space-y-5">
             {isRegister && (
               <div className="mb-6 border-b border-white/10 pb-2">
                 <h2 className="text-lg font-semibold text-white">Datos del Administrador</h2>
                 <p className="text-xs text-gray-400">El usuario principal de la cuenta</p>
               </div>
             )}

             {isRegister && (
               <div>
                 <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Nombre Completo</label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User size={18} className="text-gray-500" />
                   </div>
                   <input required value={name} onChange={e => setName(e.target.value)}
                     className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium" 
                     placeholder="Ej. Juan Pérez" />
                 </div>
               </div>
             )}

             <div>
               <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Correo Electrónico</label>
               <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail size={18} className="text-gray-500" />
                   </div>
                 <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                   className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium" 
                   placeholder="tu@empresa.com" />
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Contraseña</label>
               <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock size={18} className="text-gray-500" />
                   </div>
                 <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                   className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium" 
                   placeholder="••••••••" />
               </div>
             </div>

             {isRegister && (
               <label className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-colors mt-6">
                  <div className="relative flex items-center">
                    <input type="checkbox" checked={isSuperAdmin} onChange={e => setIsSuperAdmin(e.target.checked)} 
                     className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-600 focus:ring-offset-gray-900" />
                  </div>
                  <div>
                    <span className="text-sm text-blue-400 font-bold block">Crear como Super Admin</span>
                    <span className="text-xs text-blue-200/60 block">Rol de desarrollador (Acceso total)</span>
                  </div>
               </label>
             )}

             {/* BOTÓN EN LOGIN (No Registro) */}
             {!isRegister && (
               <div className="pt-2">
                 {error && (
                   <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-start gap-3">
                     <AlertCircle size={18} className="shrink-0 mt-0.5" />
                     <p>{error}</p>
                   </div>
                 )}
                 <button type="submit" disabled={loading}
                   className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2">
                   {loading ? 'Verificando...' : 'Iniciar Sesión'}
                   {!loading && <ArrowRight size={18} />}
                 </button>
               </div>
             )}
          </div>

          {/* SECCIÓN 2: DATOS DE EMPRESA (Sólo Registro) */}
          {isRegister && (
            <div className="space-y-4">
              <div className="mb-6 border-b border-white/10 pb-2">
                 <h2 className="text-lg font-semibold text-white">Datos de la Empresa</h2>
                 <p className="text-xs text-gray-400">Información fiscal para facturación</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Razón Social</label>
                <input required value={companyName} onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">RIF</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Shield size={16} className="text-gray-500" />
                   </div>
                  <input required value={rif} onChange={e => setRif(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm" 
                    placeholder="J-12345678-9" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Estado</label>
                  <input required value={state} onChange={e => setState(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Ciudad</label>
                  <input required value={city} onChange={e => setCity(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Dirección Fiscal</label>
                <div className="relative">
                   <div className="absolute top-3 left-0 pl-4 flex items-center pointer-events-none">
                      <MapPin size={16} className="text-gray-500" />
                   </div>
                  <textarea required value={address} onChange={e => setAddress(e.target.value)} rows={2}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm resize-none custom-scrollbar" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Teléfono</label>
                  <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone size={14} className="text-gray-500" />
                   </div>
                    <input value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Correo Empresa</label>
                  <input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm" />
                </div>
              </div>

            </div>
          )}

          {/* ESPACIO PARA EL BOTÓN DE REGISTRO EN CASO DE ESTAR EN MODO 2 COLUMNAS */}
          {isRegister && (
            <div className="col-span-1 md:col-span-2 pt-4 border-t border-white/5">
                {error && (
                   <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl flex items-start gap-3">
                     <AlertCircle size={18} className="shrink-0 mt-0.5" />
                     <p>{error}</p>
                   </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full max-w-md mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-lg">
                  {loading ? 'Procesando...' : 'Completar Registro Creado'}
                  {!loading && <ArrowRight size={20} />}
                </button>
            </div>
          )}

        </form>

        <div className="mt-8 text-center border-t border-white/10 pt-6">
            <button onClick={() => setIsRegister(!isRegister)} className="text-sm font-medium text-gray-400 hover:text-white transition-colors group flex items-center justify-center gap-2 mx-auto">
                {isRegister ? '¿Ya tienes una cuenta?' : '¿Plataforma nueva?'}
                <span className="text-blue-400 group-hover:text-blue-300 group-hover:underline">
                  {isRegister ? 'Inicia Sesión aquí' : 'Registra tu Empresa'}
                </span>
            </button>
        </div>
      </div>
      
    </div>
  );
}