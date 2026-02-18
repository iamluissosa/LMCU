'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        // --- REGISTRO UNIFICADO (Auth + DB) ---
        // Llamamos a nuestro backend para que cree Auth + User DB atómicamente (o casi)
        const res = await fetch('http://localhost:3001/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, 
                password, 
                name,
                roleLegacy: isSuperAdmin ? 'ADMIN' : 'USER'
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
        const { data, error } = await supabase.auth.signInWithPassword({
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">LMCU ERP</h1>
          <p className="text-gray-500 mt-2">
            {isRegister ? 'Crear nueva cuenta' : 'Inicia sesión para gestionar tu empresa'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input required value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {isRegister && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
               <input type="checkbox" id="superuser" checked={isSuperAdmin} onChange={e => setIsSuperAdmin(e.target.checked)} 
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
               <label htmlFor="superuser" className="text-sm text-blue-800 font-medium">Crear como Super Admin (Dev)</label>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
            {loading ? 'Procesando...' : (isRegister ? 'Registrarse' : 'Ingresar al Sistema')}
          </button>
        </form>

        <div className="mt-6 text-center">
            <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-blue-600 hover:underline">
                {isRegister ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate aquí'}
            </button>
        </div>
      </div>
    </div>
  );
}