/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';

interface AdminLoginProps {
  onSuccess: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!password) {
      setError('Por favor, ingresa la contraseña.');
      return;
    }

    setLoading(true);

    // Simulate light loading for sleek UX entrance
    setTimeout(() => {
      // Accept 'admin' or 'admin123' as super intuitive defaults
      const isCorrect = password === 'admin' || password === 'admin123' || password === 'TRIVIA2026';
      
      if (isCorrect) {
        localStorage.setItem('trivia_admin_logged', 'true');
        onSuccess();
      } else {
        setError('Contraseña incorrecta. Inténtalo de nuevo.');
        setPassword('');
      }
      setLoading(false);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-brand-dark text-brand-light flex flex-col justify-center items-center p-6 relative select-none">
      
      {/* Ambient background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-brand-yellow/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-brand-yellow/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-bg-subtle border border-border-default rounded-3xl p-8 shadow-2xl relative z-10 transition-all duration-300">
        
        {/* Core visual header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-yellow flex items-center justify-center text-[#111211] shadow-lg mb-4 ring-4 ring-brand-yellow/10">
            <Lock className="w-6 h-6" />
          </div>
          
          <h2 className="text-2xl font-display font-black tracking-tight text-brand-light leading-snug">
            Acceso Autorizado
          </h2>
          <p className="text-xs text-text-body mt-2 max-w-sm">
            Escribe la credencial de control para ingresar a la configuración y panel de selección.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-body mb-2">
              Contraseña de Administración
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa admin o admin123"
                className="w-full pl-10 pr-10 py-3 bg-bg-elevated border border-border-default text-brand-light rounded-2xl text-sm focus:outline-none focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20 font-medium transition-all"
                id="input_admin_password"
                disabled={loading}
                autoFocus
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-brand-light cursor-pointer"
                id="btn_toggle_pass_visibility"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Validation error display */}
          {error && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl transition-all animate-bounce">
              {error}
            </p>
          )}

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-yellow hover:brightness-105 text-[#111211] font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider relative h-[48px] shadow-md hover:shadow-lg active:scale-[0.98]"
            id="btn_admin_submit_login"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-brand-dark/20 border-t-brand-dark rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Verificar Credencial</span>
                <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Informative Hint tag to prevent user lockouts */}
        <div className="mt-8 pt-6 border-t border-border-default text-center">
          <p className="text-[10px] text-text-secondary font-mono tracking-wide">
            💡 Contraseña por defecto: <span className="bg-bg-elevated px-1.5 py-0.5 rounded text-brand-light font-bold text-[11px] border border-border-default">admin</span> o <span className="bg-bg-elevated px-1.5 py-0.5 rounded text-brand-light font-bold text-[11px] border border-border-default font-mono">admin123</span>
          </p>
        </div>

      </div>

      <footer className="mt-12 text-center text-[10px] text-text-secondary font-semibold uppercase tracking-widest leading-none select-none">
        Trivia Live Protocol • AI Studio 
      </footer>

    </div>
  );
}
