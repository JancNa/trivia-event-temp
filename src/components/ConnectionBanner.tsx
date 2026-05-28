/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, updateSupabaseClient, config, clearSupabaseClient } from '../supabase';
import { isDemoMode, setDemoMode } from '../dataService';
import { Server, Settings, Zap, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function ConnectionBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(config.url);
  const [supabaseKey, setSupabaseKey] = useState(config.key);
  const [demoActive, setDemoActive] = useState(isDemoMode());
  const [statusMessage, setStatusMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);

  // Force-cleanup potential legacy DOM class on mount
  useEffect(() => {
    document.documentElement.classList.remove('light-mode');
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl || !supabaseKey) {
      setStatusMessage('Por favor completa ambos campos.');
      setIsSuccess(false);
      return;
    }
    
    const success = updateSupabaseClient(supabaseUrl, supabaseKey);
    if (success) {
      setDemoActive(false);
      localStorage.setItem('trivia_use_demo_mode', 'false');
      setStatusMessage('¡Conexión establecida! Recargando para aplicar cambios...');
      setIsSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      setStatusMessage('Error al inicializar el cliente Supabase. Verifica el formato de tus credenciales.');
      setIsSuccess(false);
    }
  };

  const handleToggleDemo = (active: boolean) => {
    setDemoActive(active);
    setDemoMode(active);
  };

  const handleClear = () => {
    clearSupabaseClient();
  };

  return (
    <>
      {/* Floating Badge */}
      <div className="fixed top-3 right-3 z-50 flex items-center gap-2">

        {demoActive ? (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-yellow text-[#111211] rounded-full text-xs font-semibold shadow-lg hover:brightness-110 transition-all cursor-pointer border border-brand-dark/20"
            id="btn-demo-badge"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Modo Demo Activo (Offline)</span>
            <Settings className="w-3 h-3 ml-1 opacity-70" />
          </button>
        ) : supabase ? (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold shadow-lg hover:bg-neutral-800 transition-all cursor-pointer"
            id="btn-supabase-badge"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase Conectado</span>
            <Settings className="w-3 h-3 ml-1 opacity-70" />
          </button>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/80 border border-red-500/30 text-red-400 rounded-full text-xs font-semibold shadow-lg animate-pulse hover:bg-red-900/90 transition-all cursor-pointer"
            id="btn-setup-badge"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>Supabase Requerido</span>
            <Settings className="w-3 h-3 ml-1" />
          </button>
        )}
      </div>

      {/* Settings Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 relative">
            <h3 className="text-xl font-display font-bold text-brand-yellow flex items-center gap-2 mb-2">
              <Server className="w-5 h-5 text-brand-yellow" />
              Configuración de Datos
            </h3>
            <p className="text-sm text-neutral-400 mb-6">
              Elige entre usar una base de datos real en Supabase (requiere tener el esquema <code className="bg-neutral-800 px-1 py-0.5 rounded text-brand-yellow font-mono text-xs">temp</code> creado) o probar inmediatamente el simulador sin conexión.
            </p>

            {/* Selector de Modo */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => handleToggleDemo(true)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  demoActive
                    ? 'border-brand-yellow bg-brand-yellow/10 text-brand-yellow'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
                id="btn-select-demo"
              >
                <Zap className="w-6 h-6 mb-2" />
                <span className="font-semibold text-sm">Modo de Prueba</span>
                <span className="text-[10px] opacity-70 mt-0.5 text-center">Base de Datos Simulada</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleDemo(false)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  !demoActive
                    ? 'border-brand-yellow bg-brand-yellow/10 text-brand-yellow'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
                id="btn-select-supabase"
              >
                <Server className="w-6 h-6 mb-2" />
                <span className="font-semibold text-sm">Supabase Real</span>
                <span className="text-[10px] opacity-70 mt-0.5 text-center">Esquema temp</span>
              </button>
            </div>

            {/* Formulario Supabase */}
            {!demoActive && (
              <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-neutral-800">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">SUPABASE_URL</label>
                  <input
                    type="url"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full bg-neutral-950 border border-neutral-800 text-brand-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow"
                    id="input-supabase-url"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">SUPABASE_ANON_KEY</label>
                  <input
                    type="text"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-neutral-950 border border-neutral-800 text-brand-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow font-mono text-[10px]"
                    id="input-supabase-key"
                  />
                </div>

                {statusMessage && (
                  <p className={`text-xs p-2.5 rounded-lg border ${
                    isSuccess 
                      ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400' 
                      : 'bg-red-950/50 border-red-500/30 text-red-400'
                  }`}>
                    {statusMessage}
                  </p>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 rounded-lg text-xs text-red-400 font-semibold cursor-pointer transition-colors"
                    id="btn-clear-supabase"
                  >
                    Borrar Claves
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-brand-yellow text-[#111211] rounded-lg text-xs font-bold hover:brightness-110 cursor-pointer transition-colors"
                    id="btn-save-supabase"
                  >
                    Conectar Base de Datos
                  </button>
                </div>
              </form>
            )}

            {/* Botón de Cierre */}
            <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-brand-light font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                id="btn-close-settings"
              >
                Cerrar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
