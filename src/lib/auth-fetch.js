import { getSupabaseClient } from './supabase';

export async function authFetch(url, options = {}) {
  const supabase = await getSupabaseClient();

  const doFetch = async (token) => {
    const headers = new Headers(options.headers);
    if (token) headers.set('authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  };

  const { data } = await supabase.auth.getSession();
  let response = await doFetch(data.session?.access_token);

  if (response.status === 401 && data.session) {
    const refreshed = (await supabase.auth.refreshSession()).data.session?.access_token;
    if (refreshed && refreshed !== data.session.access_token) {
      response = await doFetch(refreshed);
    }
  }

  return response;
}
