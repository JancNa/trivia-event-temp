/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

// Public credentials — safe to hardcode (anon key, RLS enforced)
const SUPABASE_URL = 'https://zgctbuwztqbafrfjxujq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnY3RidXd6dHFiYWZyZmp4dWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MzY0NDEsImV4cCI6MjA5NTQxMjQ0MX0.Dmxg2fBKjkk3Ou1fLrtati3p9_KKBMELJG8uLvh2KwY';

const getSupabaseConfig = () => {
  const metaEnv = (import.meta as any).env || {};

  const envUrl = metaEnv.VITE_SUPABASE_URL || SUPABASE_URL;
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  const envServiceKey = metaEnv.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                        metaEnv.SUPABASE_SERVICE_ROLE_KEY ||
                        typeof window !== 'undefined' ? localStorage.getItem('trivia_supabase_service_key') || '' : '';

  return {
    url: envUrl,
    key: envKey,
    serviceKey: envServiceKey as string
  };
};

export const config = getSupabaseConfig();

export const supabase = createClient(config.url, config.key, {
  db: { schema: 'temp' }
});

export const supabaseAdmin = createClient(
  config.url,
  config.serviceKey || config.key,
  { db: { schema: 'temp' } }
);

export function updateSupabaseClient(url: string, key: string, serviceKey?: string) {
  if (!url || !key) return false;
  try {
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
  localStorage.removeItem('trivia_supabase_service_key');
  window.location.reload();
}
