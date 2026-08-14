import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabase';
import { applySavedConsent } from '../lib/signup-consent';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';
const PASSWORD_RECOVERY_KEY = 'eztila-password-recovery';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Giriş yapılıyor, lütfen bekleyin…');
  const [detailedError, setDetailedError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        const supabase = await getSupabaseClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const tokenHash = url.searchParams.get('token_hash');
        const type = url.searchParams.get('type');
        const nextUrl = url.searchParams.get('next') || params.get('next') || '/';
        const urlError = url.searchParams.get('error_description') || url.searchParams.get('error');

        if (urlError) {
          console.error('[AuthCallback] URL Error:', urlError);
          if (isMounted) {
            setStatus('error');
            setMessage(urlError);
            setDetailedError(urlError);
          }
          return;
        }

        let sessionUser = null;

        // 1. Google OAuth / PKCE Code Flow
        if (code) {
          console.log('[AuthCallback] Exchanging code for session…', code);
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('[AuthCallback] exchangeCodeForSession failed:', error);
            // Fallback: Check if session is already stored
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              console.log('[AuthCallback] Fallback session detected:', sessionData.session.user);
              sessionUser = sessionData.session.user;
            } else {
              throw error;
            }
          } else {
            console.log('[AuthCallback] Code exchanged successfully:', data?.user || data?.session?.user);
            sessionUser = data?.user || data?.session?.user;
          }
        }

        // 2. Email Verification / Password Recovery OTP Flow
        if (!sessionUser && tokenHash && type) {
          console.log('[AuthCallback] Verifying OTP token hash…', type);
          const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) {
            console.error('[AuthCallback] verifyOtp error:', error);
            throw error;
          }
          sessionUser = data?.user;

          if (type === 'recovery' && sessionUser) {
            sessionStorage.setItem(PASSWORD_RECOVERY_KEY, JSON.stringify({
              userId: sessionUser.id,
              createdAt: Date.now(),
            }));
            window.location.replace(nextUrl.includes('new-password') ? nextUrl : '/giris?mode=new-password');
            return;
          }
        }

        // 3. Implicit Hash Fragment Fallback (#access_token=...)
        const hash = window.location.hash;
        if (!sessionUser && hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const hashType = hashParams.get('type');

          if (accessToken && refreshToken) {
            console.log('[AuthCallback] Setting session from hash…');
            const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (error) {
              console.error('[AuthCallback] setSession error:', error);
              throw error;
            }
            sessionUser = data?.user;

            if (hashType === 'recovery' && sessionUser) {
              sessionStorage.setItem(PASSWORD_RECOVERY_KEY, JSON.stringify({
                userId: sessionUser.id,
                createdAt: Date.now(),
              }));
              window.location.replace(nextUrl.includes('new-password') ? nextUrl : '/giris?mode=new-password');
              return;
            }
          }
        }

        // 4. Session Validation Fallback
        if (!sessionUser) {
          const { data: sessionData } = await supabase.auth.getSession();
          sessionUser = sessionData?.session?.user;
        }

        if (sessionUser) {
          try {
            await applySavedConsent(supabase);
          } catch (e) {
            console.warn('[AuthCallback] Consent application warning:', e);
          }

          if (isMounted) {
            setStatus('success');
            setMessage('Giriş başarılı! Ana sayfaya yönlendiriliyorsunuz…');
          }
          
          window.setTimeout(() => {
            window.location.replace(nextUrl);
          }, 400);
        } else {
          console.warn('[AuthCallback] No session user found after all checks.');
          if (isMounted) {
            setStatus('error');
            setMessage('Doğrulama bağlantısı geçersiz veya süresi dolmuş.');
            setDetailedError('Oturum oluşturulamadı. Lütfen giriş yapmayı tekrar deneyin.');
          }
        }
      } catch (err) {
        console.error('[AuthCallback] Fatal error:', err);
        if (isMounted) {
          setStatus('error');
          setMessage(err?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
          setDetailedError(err?.message || String(err));
        }
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [params]);

  return (
    <div className="auth-callback">
      <div>
        <span>{status === 'success' ? '✓' : status === 'error' ? '!' : '…'}</span>
        <h1>{status === 'success' ? 'Hoş geldiniz!' : status === 'error' ? 'Bir sorun oluştu' : 'Giriş yapılıyor'}</h1>
        <p>{message}</p>
        {status === 'error' && (
          <>
            {detailedError && detailedError !== message && (
              <p style={{ fontSize: '12px', color: '#b83b3b', marginTop: '8px', opacity: 0.85 }}>
                {detailedError}
              </p>
            )}
            <a href="/giris" style={{ display: 'inline-block', marginTop: '16px' }}>
              Giriş sayfasına dön
            </a>
          </>
        )}
      </div>
    </div>
  );
}
