/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

// Retreive variables from Vite Env, Next.js Env fallbacks, or temporary LocalStorage config
const getSupabaseConfig = () => {
  const metaEnv = (import.meta as any).env || {};
  const procEnv = (typeof process !== 'undefined' ? process.env : {}) || {};
  
  const envUrl = metaEnv.VITE_SUPABASE_URL || 
                 metaEnv.NEXT_PUBLIC_SUPABASE_URL || 
                 procEnv.NEXT_PUBLIC_SUPABASE_URL || 
                 procEnv.VITE_SUPABASE_URL;
                 
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || 
                 metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                 procEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                 procEnv.VITE_SUPABASE_ANON_KEY;

  const envServiceKey = metaEnv.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                        metaEnv.SUPABASE_SERVICE_ROLE_KEY ||
                        procEnv.SUPABASE_SERVICE_ROLE_KEY || 
                        procEnv.VITE_SUPABASE_SERVICE_ROLE_KEY;
  
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('trivia_supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('trivia_supabase_key') : null;
  const localServiceKey = typeof window !== 'undefined' ? localStorage.getItem('trivia_supabase_service_key') : null;

  return {
    url: envUrl || localUrl || '',
    key: envKey || localKey || '',
    serviceKey: envServiceKey || localServiceKey || ''
  };
};

export const config = getSupabaseConfig();

export let supabase: any = null;
export let supabaseAdmin: any = null;

if (config.url && config.key) {
  try {
    supabase = createClient(config.url, config.key, {
      db: { schema: 'temp' }
    });
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
}

// Admin client using service role key if available, otherwise fallback to normal client to prevent crashes
if (config.url) {
  try {
    const adminKey = config.serviceKey || config.key;
    supabaseAdmin = createClient(config.url, adminKey, {
      db: { schema: 'temp' }
    });
  } catch (error) {
    console.error('Failed to initialize Supabase admin client:', error);
  }
}

export function updateSupabaseClient(url: string, key: string, serviceKey?: string) {
  if (!url || !key) return false;
  try {
    supabase = createClient(url, key, {
      db: { schema: 'temp' }
    });
    supabaseAdmin = createClient(url, serviceKey || key, {
      db: { schema: 'temp' }
    });
    localStorage.setItem('trivia_supabase_url', url);
    localStorage.setItem('trivia_supabase_key', key);
    if (serviceKey) {
      localStorage.setItem('trivia_supabase_service_key', serviceKey);
    }
    window.location.reload();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export function clearSupabaseClient() {
  localStorage.removeItem('trivia_supabase_url');
  localStorage.removeItem('trivia_supabase_key');
  localStorage.removeItem('trivia_supabase_service_key');
  window.location.reload();
}
