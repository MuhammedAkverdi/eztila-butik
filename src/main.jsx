import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { MOCK_PRODUCTS, STORE_CONFIG } from './lib/mock-data';
import { getSupabaseClient } from './lib/supabase';

// --- Interceptor to bypass broken external APIs and Vercel proxies ---
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
  
  // Try to read headers if they exist
  let hasAuth = false;
  if (args.length > 1 && args[1] && args[1].headers) {
    const h = new Headers(args[1].headers);
    if (h.has('authorization')) hasAuth = true;
  }
  
  if (url && url.startsWith('/api/')) {
    if (url === '/api/products') {
      return { ok: true, status: 200, json: async () => ({ products: MOCK_PRODUCTS }) };
    }
    if (url === '/api/store-config') {
      return { ok: true, status: 200, json: async () => ({ store: STORE_CONFIG }) };
    }
    if (url === '/api/account') {
      if (!hasAuth) return { ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) };
      
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || 'demo@eztila.com';
      const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
      
      return { ok: true, status: 200, json: async () => ({ 
        customer: { fullName, email, phone: '' }, 
        addresses: [], 
        orders: [],
        paymentMethods: [] 
      }) };
    }
    if (url === '/api/account/orders') {
      if (!hasAuth) return { ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) };
      return { ok: true, status: 200, json: async () => ({ orders: [] }) };
    }
  }
  return originalFetch(...args);
};
// ---------------------------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
