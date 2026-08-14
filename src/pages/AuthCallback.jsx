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
        let sessionUser = null;

        // 1. Manually parse the URL to guarantee we get the code parameter
        const urlParams = new URL(window.location.href).searchParams;
        const code = urlParams.get('code');
        const nextUrl = urlParams.get('next') || '/';

        if (code) {
          // Explicitly exchange the code
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          sessionUser = data?.user;
        }

        // 2. Fallback: Check hash fragment for implicit flow
        const hash = window.location.hash;
        if (!sessionUser && hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (error) throw error;
            sessionUser = data?.user;
          }

          if (type === 'recovery' && sessionUser) {
            sessionStorage.setItem(PASSWORD_RECOVERY_KEY, JSON.stringify({
              userId: sessionUser.id,
              createdAt: Date.now(),
            }));
            window.location.replace(nextUrl.includes('new-password') ? nextUrl : '/giris?mode=new-password');
            return;
          }
        }

        // 3. Fallback: If no code or hash, check if already logged in
        if (!sessionUser) {
          const { data } = await supabase.auth.getUser();
          sessionUser = data?.user;
        }

        if (sessionUser) {
          // Attempt consent application silently
          try { await applySavedConsent(supabase); } catch {}
          
          setStatus('success');
          setMessage('Hesabın doğrulandı! Yönlendiriliyorsun…');
          window.setTimeout(() => window.location.replace(nextUrl), 800);
        } else {
          setStatus('error');
          setMessage('Doğrulama bağlantısı geçersiz veya süresi dolmuş.');
        }
      } catch (err) {
        console.error('AuthCallback error:', err);
        setStatus('error');
        setMessage('Bir hata oluştu. Lütfen tekrar dene.');
      }
    })();
  }, []);

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
