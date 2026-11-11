import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Ambil variabel lingkungan Astro (client-side didahului PUBLIC_)
const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_PROJECT_URL) ||
  '';

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_PUBLISHABLE_KEY) ||
  '';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[SUPABASE CLIENT] Variabel PUBLIC_SUPABASE_URL atau PUBLIC_SUPABASE_ANON_KEY tidak ditemukan. Realtime mode dinonaktifkan.'
    );
    return null;
  }

  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return client;
  } catch (err) {
    console.error('[SUPABASE CLIENT] Gagal inisialisasi Supabase client:', err);
    return null;
  }
}

export function isSupabaseAvailable(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
