import { supabase } from './supabase';

export async function fetchWithAuth(url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || '';
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(url, {
    ...options,
    headers,
  });

  // If unauthorized and a session was active, attempt a single session refresh and retry
  if (res.status === 401 && session) {
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshData.session?.access_token) {
        const retryHeaders = new Headers(options.headers || {});
        retryHeaders.set('Authorization', `Bearer ${refreshData.session.access_token}`);
        res = await fetch(url, {
          ...options,
          headers: retryHeaders,
        });
      }
    } catch {
      // ignore refresh failures and return the original response
    }
  }

  return res;
}
