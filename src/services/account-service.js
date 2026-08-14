import { getSupabaseClient } from '../lib/supabase.js';

// Only authentication identity is real at this stage. Account collections
// stay empty until their backend and access policies are implemented.
export async function getAccountOverview() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user) return null;

  const metadata = data.user.user_metadata || {};

  return {
    customer: {
      fullName: metadata.full_name || metadata.name || '',
      email: data.user.email || '',
      phone: data.user.phone || metadata.phone || '',
    },
    addresses: [],
    orders: [],
    paymentMethods: [],
    accountBackendAvailable: false,
  };
}
