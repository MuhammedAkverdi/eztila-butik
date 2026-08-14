import { Routes, Route, useSearchParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const Storefront = lazy(() => import('./pages/Storefront'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const TrackingPage = lazy(() => import('./pages/TrackingPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));

function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f3e7d8' }}>
      <p style={{ color: '#10204f', fontFamily: 'Georgia, serif', fontSize: '1.2rem' }}>Yükleniyor…</p>
    </div>
  );
}

function AuthPageWrapper({ defaultMode = 'login' }) {
  const [params] = useSearchParams();
  const mode = params.get('mode') || defaultMode;
  const next = params.get('next') || '/';
  return <AuthPage initialMode={mode} next={next} />;
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/giris" element={<AuthPageWrapper defaultMode="login" />} />
        <Route path="/uye-ol" element={<AuthPageWrapper defaultMode="signup" />} />
        <Route path="/hesabim" element={<AccountPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/urun/:slug" element={<ProductDetail />} />
        <Route path="/sepetim" element={<CartPage />} />
        <Route path="/odeme" element={<CheckoutPage />} />
        <Route path="/siparis-takip" element={<TrackingPage />} />
        <Route path="/kvkk-aydinlatma" element={<LegalPage />} />
        <Route path="/uyelik-sozlesmesi" element={<LegalPage />} />
        <Route path="/on-bilgilendirme" element={<LegalPage />} />
        <Route path="/mesafeli-satis" element={<LegalPage />} />
        <Route path="/ticari-ileti" element={<LegalPage />} />
      </Routes>
    </Suspense>
  );
}
