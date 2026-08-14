import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabase';
import { applySavedConsent } from '../lib/signup-consent';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';
const PASSWORD_RECOVERY_KEY = 'eztila-password-recovery';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Hesabın doğrulanıyor…');

  useEffect(() => {
    (async () => {
      try {
        const supabase = await getSupabaseClient();

        // Handle PKCE code flow from OAuth
        const code = params.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Code exchange failed:', error.message);
            throw error;
          }
        }

        // Handle hash fragment from Supabase auth (fallback/legacy)
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          }

          // Handle password recovery
          if (type === 'recovery') {
            const { data } = await supabase.auth.getUser();
            if (data.user) {
              sessionStorage.setItem(PASSWORD_RECOVERY_KEY, JSON.stringify({
                userId: data.user.id,
                createdAt: Date.now(),
              }));
            }
            window.location.replace(next.includes('new-password') ? next : '/giris?mode=new-password');
            return;
          }
        }

        // Apply saved consent data from signup
        try {
          await applySavedConsent(supabase);
        } catch {
          // Consent application is best-effort
        }

        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setStatus('success');
          setMessage('Hesabın doğrulandı! Yönlendiriliyorsun…');
          window.setTimeout(() => window.location.replace(next), 800);
        } else {
          setStatus('error');
          setMessage('Doğrulama bağlantısı geçersiz veya süresi dolmuş.');
        }
      } catch {
        setStatus('error');
        setMessage('Bir hata oluştu. Lütfen tekrar dene.');
      }
    })();
  }, [next]);

  return (
    <div className="auth-callback">
      <div>
        <span>{status === 'success' ? '✓' : status === 'error' ? '!' : '…'}</span>
        <h1>{status === 'success' ? 'Hoş geldin!' : status === 'error' ? 'Bir sorun oluştu' : 'Doğrulanıyor'}</h1>
        <p>{message}</p>
        {status === 'error' && <a href="/giris">Giriş sayfasına dön</a>}
      </div>
    </div>
  );
}
