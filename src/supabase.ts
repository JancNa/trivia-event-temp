/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const metaEnv = (import.meta as any).env || {};

  const url = metaEnv.VITE_SUPABASE_URL ||
    (typeof window !== 'undefined' ? localStorage.getItem('trivia_supabase_url') : null) || '';

  const key = metaEnv.VITE_SUPABASE_ANON_KEY ||
    (typeof window !== 'undefined' ? localStorage.getItem('trivia_supabase_key') : null) || '';

  const serviceKey = metaEnv.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    (typeof window !== 'undefined' ? localStorage.getItem('trivia_supabase_service_key') : null) || '';

  return { url, key, serviceKey };
};

export const config = getSupabaseConfig();

export let supabase: any = null;
export let supabaseAdmin: any = null;

if (config.url && config.key) {
  supabase = createClient(config.url, config.key, { db: { schema: 'temp' } });
  supabaseAdmin = createClient(config.url, config.serviceKey || config.key, { db: { schema: 'temp' } });
}

export function updateSupabaseClient(url: string, key: string, serviceKey?: string) {
  if (!url || !key) return false;
  try {
    localStorage.setItem('trivia_supabase_url', url);
    localStorage.setItem('trivia_supabase_key', key);
    if (serviceKey) localStorage.setItem('trivia_supabase_service_key', serviceKey);
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
