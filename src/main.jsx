import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { MOCK_PRODUCTS, STORE_CONFIG } from './lib/mock-data';

// --- Interceptor to bypass broken external APIs and Vercel proxies ---
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
  
  if (url && url.startsWith('/api/')) {
    if (url === '/api/products') {
      return { ok: true, status: 200, json: async () => ({ products: MOCK_PRODUCTS }) };
    }
    if (url === '/api/store-config') {
      return { ok: true, status: 200, json: async () => ({ store: STORE_CONFIG }) };
    }
    if (url === '/api/account') {
      return { ok: true, status: 200, json: async () => ({ 
        customer: { fullName: '', email: 'demo@eztila.com', phone: '' }, 
        addresses: [], 
        orders: [],
        paymentMethods: [] 
      }) };
    }
    if (url === '/api/account/orders') {
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
