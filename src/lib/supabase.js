import { createClient } from '@supabase/supabase-js';

let client = null;

export async function getSupabaseClient() {
  if (client) return client;
  client = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    }
  );
  return client;
}

export async function getAuthConfig() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    googleEnabled: true,
  };
}
