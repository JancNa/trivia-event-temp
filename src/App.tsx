/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import PlayView from './components/PlayView';
import LeaderboardView from './components/LeaderboardView';
import AdminView from './components/AdminView';
import AdminLogin from './components/AdminLogin';
import { Trophy, ShieldAlert, User, Settings, Sparkles, Navigation } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('trivia_admin_logged') === 'true';
  });

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => setIsAuthenticated(true)} />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><HomePortal /></ProtectedRoute>} />
        <Route path="/play/:leaderboardId" element={<PlayView />} />
        <Route path="/leaderboard/:leaderboardId" element={<ProtectedRoute><LeaderboardView /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminView /></ProtectedRoute>} />
        <Route path="*" element={<ProtectedRoute><HomePortal /></ProtectedRoute>} />
      </Routes>
    </HashRouter>
  );
}

function HomePortal() {
  const handleLogout = () => {
    localStorage.removeItem('trivia_admin_logged');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-brand-dark text-brand-light flex flex-col justify-between p-6 md:p-12 relative overflow-hidden select-none">
      
      {/* Decorative ambient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-yellow/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-yellow/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-brand-yellow flex items-center justify-center text-[#111211] font-display font-black text-lg shadow-lg">
            T
          </div>
          <div>
            <h1 className="font-display font-extrabold tracking-tight text-brand-light leading-none">
              TRIVIA <span className="text-brand-yellow">LIVE</span>
            </h1>
            <span className="text-[9px] text-[#fed600] font-bold uppercase tracking-widest font-mono">
              Dinámica Presencial • Live Dynamics
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block px-3.5 py-1.5 bg-bg-subtle border border-border-default rounded-full text-[10px] font-bold uppercase tracking-widest font-mono text-text-secondary">
            ● v1.0.0 Stable
          </span>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100/75 border border-red-200 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
            title="Cerrar sesión de administrador y bloquear vistas"
            id="btn_admin_logout"
          >
            🔒 Bloquear Portal
          </button>
        </div>
      </header>

      {/* Main card choices */}
      <main className="max-w-4xl w-full mx-auto my-12 z-10">
        
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-display font-black tracking-tight text-brand-light mb-3">
            Plataforma de Trivia en Vivo
          </h2>
          <p className="text-sm text-text-body max-w-lg mx-auto leading-relaxed">
            Un portal de gamificación presencial de alta velocidad optimizado con los colores corporativos de nuestra marca. Elige un rol a continuación:
          </p>
        </div>

        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* VISTA JUGADOR */}
          <div 
            className="group bg-bg-subtle border border-border-default rounded-3xl p-6 shadow-xl transition-all"
            id="portal_play_link"
          >
            <div className="w-12 h-12 bg-bg-elevated border border-border-default rounded-2xl flex items-center justify-center text-[#fed600] mb-6 transition-all">
              <User className="w-6 h-6" />
            </div>
            
            <h3 className="text-lg font-display font-bold text-brand-light mb-2 flex items-center gap-1.5">
              Vista Jugador
              <span className="text-[9px] font-mono font-bold bg-bg-elevated text-text-secondary border border-border-default px-2 py-0.5 rounded-md transition-all">Mobile</span>
            </h3>
            
            <p className="text-xs text-text-body leading-relaxed mb-6">
              Pensado para que los participantes jueguen desde sus teléfonos móviles. Registro de nombre, trivia interactiva de alta fidelidad, cálculo de XP y posiciones.
            </p>

            <span className="text-xs font-bold text-text-secondary flex items-center gap-1.5 uppercase font-mono tracking-wider">
              (URL Única en Admin)
            </span>
          </div>

          {/* VISTA LEADERBOARD */}
          <div 
            className="group bg-bg-subtle border border-border-default rounded-3xl p-6 shadow-xl transition-all"
            id="portal_leaderboard_link"
          >
            <div className="w-12 h-12 bg-bg-elevated border border-border-default rounded-2xl flex items-center justify-center text-[#fed600] mb-6 transition-all">
              <Trophy className="w-6 h-6" />
            </div>
            
            <h3 className="text-lg font-display font-bold text-brand-light mb-2 flex items-center gap-1.5">
              Vista Proyección
              <span className="text-[9px] font-mono font-bold bg-bg-elevated text-text-secondary border border-border-default px-2 py-0.5 rounded-md transition-all">Screen</span>
            </h3>
            
            <p className="text-xs text-text-body leading-relaxed mb-6">
              Diseño de pantalla completa de alto impacto optimizado para proyectores. Podio interactivo 3D del Top 3, buscador con filtros y updates automáticos en tiempo real.
            </p>

            <span className="text-xs font-bold text-text-secondary flex items-center gap-1.5 uppercase font-mono tracking-wider">
              (URL Única en Admin)
            </span>
          </div>

          {/* VISTA ADMIN */}
          <Link 
            to="/admin" 
            className="group bg-bg-subtle border border-border-default hover:border-brand-yellow rounded-3xl p-6 shadow-xl transition-all hover:translate-y-[-4px] cursor-pointer"
            id="portal_admin_link"
          >
            <div className="w-12 h-12 bg-bg-elevated border border-border-default rounded-2xl flex items-center justify-center text-[#fed600] mb-6 group-hover:bg-brand-yellow group-hover:text-[#111211] transition-all">
              <Settings className="w-6 h-6" />
            </div>
            
            <h3 className="text-lg font-display font-bold text-brand-light mb-2 flex items-center gap-1.5">
              Vista Administrador
              <span className="text-[9px] font-mono font-bold bg-bg-elevated text-text-secondary border border-border-default px-2 py-0.5 rounded-md group-hover:border-brand-yellow/30 group-hover:text-brand-yellow transition-all">Control</span>
            </h3>
            
            <p className="text-xs text-text-body leading-relaxed mb-6">
              Panel de administración en vivo. Monitoreo del estado, gestión de preguntas (Altas/Bajas), filtrado y exportación de ganadores en CSV, y botón de reset.
            </p>

            <span className="text-xs font-bold text-brand-yellow group-hover:underline flex items-center gap-1.5 uppercase font-mono tracking-wider">
              Entrar URL: /admin →
            </span>
          </Link>

        </div>
      </main>

      {/* Footer support context */}
      <footer className="max-w-4xl w-full mx-auto border-t border-border-default pt-6 flex flex-col md:flex-row items-center justify-between gap-4 z-10">
        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest font-mono">
          TRIVIA EVENT LIVE COOP • PROYECTO PRESTIGIO
        </p>
        <div className="flex gap-4">
          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Next.js 14 App Router Ready</span>
          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Supabase Integration (temp)</span>
        </div>
      </footer>

    </div>
  );
}
