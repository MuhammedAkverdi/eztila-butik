import { useState, useEffect } from 'react';
import { getSupabaseClient, getAuthConfig } from '../lib/supabase';
import { TERMS_VERSION, PRIVACY_VERSION, saveConsent } from '../lib/signup-consent';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';
const HERO_IMG = 'https://cdn.myikas.com/images/d22d5168-9c4e-4d2f-bf44-29933b7f8aad/f5595db0-5fe4-4b29-b14c-3da73997399c/image_1080.webp';
const RECOVERY_KEY = 'eztila-password-recovery';

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" width="18" height="18">
      <path fill="#EA4335" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844c-.209 1.125-.843 2.078-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.615Z" />
      <path fill="#4285F4" d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.258c-.806.54-1.835.858-3.047.858-2.344 0-4.328-1.585-5.037-3.716H.956v2.332A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.963 10.704A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.168.281-1.704V4.964H.956A9 9 0 0 0 0 9c0 1.45.347 2.824.956 4.036l3.007-2.332Z" />
      <path fill="#34A853" d="M9 3.58c1.322 0 2.508.454 3.441 1.346l2.581-2.581C13.464.891 11.426 0 9 0A9 9 0 0 0 .956 4.964l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

export default function AuthPage({ initialMode = 'login', next = '/' }) {
  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [validSession, setValidSession] = useState(initialMode !== 'new-password');

  useEffect(() => {
    getAuthConfig()
      .then((cfg) => setGoogleEnabled(cfg.googleEnabled))
      .catch(() => setErrorMsg('Üyelik sistemi şu anda hazırlanıyor.'));
  }, []);

  useEffect(() => {
    if (initialMode === 'new-password') {
      (async () => {
        try {
          const raw = sessionStorage.getItem(RECOVERY_KEY);
          const rec = raw ? JSON.parse(raw) : null;
          const { data } = await (await getSupabaseClient()).auth.getUser();
          const valid = !!(data.user && rec?.userId === data.user.id && typeof rec.createdAt === 'number' && Date.now() - rec.createdAt < 600000);
          setValidSession(valid);
          if (!valid) setErrorMsg('Bu şifre yenileme bağlantısı geçersiz veya süresi dolmuş. Yeni bağlantı iste.');
        } catch {
          setValidSession(false);
          setErrorMsg('Şifre yenileme oturumu doğrulanamadı.');
        }
      })();
    }
  }, [initialMode]);

  const targetRedirect = next || '/';

  function validateConsent() {
    if (!termsAccepted) {
      throw new Error('Üyelik oluşturmak için Üyelik Sözleşmesi’ni kabul etmelisin.');
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '').slice(0, 20);
    if (marketingConsent && cleanPhone.replace(/\D/g, '').length < 10) {
      throw new Error('E-posta ve SMS izni için geçerli bir telefon numarası yaz.');
    }
    const payload = {
      phone: cleanPhone,
      marketingEmail: marketingConsent,
      marketingSms: marketingConsent,
      acceptedAt: new Date().toISOString(),
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      createdAt: Date.now(),
    };
    saveConsent(payload);
    return payload;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const supabase = await getSupabaseClient();

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw new Error('E-posta veya şifre hatalı. Bilgilerini kontrol edip tekrar dene.');
        window.location.assign(targetRedirect);
        return;
      }

      if (mode === 'signup') {
        if (fullName.trim().length < 3) throw new Error('Ad soyadını eksiksiz yaz.');
        if (password.length < 10) throw new Error('Şifren en az 10 karakter olmalı.');
        if (password !== confirmPw) throw new Error('Şifreler birbiriyle aynı değil.');

        const consent = validateConsent();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: consent.phone,
              marketing_email: consent.marketingEmail,
              marketing_sms: consent.marketingSms,
              marketing_consent_at: consent.marketingEmail || consent.marketingSms ? consent.acceptedAt : null,
              terms_accepted_at: consent.acceptedAt,
              terms_version: consent.termsVersion,
              privacy_notice_version: consent.privacyVersion,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(targetRedirect)}`,
          },
        });

        if (error) throw new Error('Bu bilgilerle üyelik oluşturulamadı. E-postanı kontrol edip tekrar dene.');
        if (data.session) {
          window.location.assign(targetRedirect);
          return;
        }
        setSuccessMsg('Üyeliğin oluşturuldu. E-postana gelen doğrulama bağlantısına tıklayınca hesabın açılacak.');
        return;
      }

      if (mode === 'forgot') {
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=%2Fgiris%3Fmode%3Dnew-password`,
        });
        setSuccessMsg('Bu e-posta sistemde kayıtlıysa şifre yenileme bağlantısını gönderdik.');
        return;
      }

      if (mode === 'new-password') {
        if (!validSession) throw new Error('Önce e-postandaki geçerli şifre yenileme bağlantısını aç.');
        if (password.length < 10) throw new Error('Yeni şifren en az 10 karakter olmalı.');
        if (password !== confirmPw) throw new Error('Şifreler birbiriyle aynı değil.');

        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error('Şifre yenilenemedi. E-postandaki bağlantıyı yeniden aç.');
        sessionStorage.removeItem(RECOVERY_KEY);
        await supabase.auth.signOut({ scope: 'others' });
        setSuccessMsg('Şifren yenilendi. Hesabına yönlendiriliyorsun…');
        window.setTimeout(() => window.location.assign('/hesabim'), 700);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Bir hata oluştu. Lütfen tekrar dene.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setErrorMsg('');
    try {
      if (mode === 'signup') validateConsent();
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(targetRedirect)}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google ile giriş şu anda başlatılamadı. E-posta ve şifrenle devam edebilirsin.');
      setLoading(false);
    }
  }

  function switchTab(newMode) {
    setMode(newMode);
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPw('');
  }

  return (
    <main className="auth-shell">
      <section className="auth-editorial">
        <img src={HERO_IMG} alt="Eztila Butik yeni sezon" />
        <div className="auth-editorial-overlay">
          <a href="/" className="auth-brand">
            <img src={LOGO} alt="Eztila Butik" />
          </a>
          <div>
            <p>EZTİLA MEMBERS</p>
            <h1>Tarzın.<br />Adresin.<br />Hesabın.</h1>
            <span>Yeni sezon parçaları ve sana özel butik deneyimi.</span>
          </div>
        </div>
      </section>

      <section className="auth-card-wrap">
        <a href="/" className="auth-back">← Mağazaya dön</a>
        <div className="auth-card">
          <div className="auth-title">
            <p>EZTİLA BUTİK</p>
            <h2>
              {mode === 'signup' && 'Eztila’ya katıl'}
              {mode === 'forgot' && 'Şifreni yenile'}
              {mode === 'new-password' && 'Yeni şifreni belirle'}
              {mode === 'login' && 'Tekrar hoş geldin'}
            </h2>
            <span>
              {mode === 'signup' && 'Favori parçalarına, adreslerine ve siparişlerine tek yerden ulaş.'}
              {mode === 'forgot' && 'E-postanı yaz, sana güvenli yenileme bağlantısı gönderelim.'}
              {mode === 'new-password' && 'Hesabın için güçlü ve yeni bir şifre oluştur.'}
              {mode === 'login' && 'Siparişlerini takip et, adreslerini kaydet ve alışverişini hızlandır.'}
            </span>
          </div>

          {(mode === 'login' || mode === 'signup') && (
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={mode === 'login' ? 'active' : ''}
                onClick={() => switchTab('login')}
              >
                Giriş yap
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                className={mode === 'signup' ? 'active' : ''}
                onClick={() => switchTab('signup')}
              >
                Üye ol
              </button>
            </div>
          )}

          {googleEnabled && (mode === 'login' || mode === 'signup') && (
            <>
              <button
                type="button"
                className="google-button"
                onClick={handleGoogle}
                disabled={loading}
              >
                <GoogleIcon />
                <span>Google ile devam et</span>
              </button>
              <div className="auth-divider">
                <span>veya e-posta ile</span>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label>
                Ad soyad
                <input
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Adın ve soyadın"
                />
              </label>
            )}

            {mode !== 'new-password' && (
              <label>
                E-posta adresi
                <input
                  autoComplete="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                />
              </label>
            )}

            {mode === 'signup' && (
              <label>
                Telefon
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xx xxx xx xx"
                />
              </label>
            )}

            {mode !== 'forgot' && (
              <label>
                {mode === 'new-password' ? 'Yeni şifre' : 'Şifre'}
                <input
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  type="password"
                  required
                  minLength={mode === 'login' ? 6 : 10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                />
              </label>
            )}

            {(mode === 'signup' || mode === 'new-password') && (
              <label>
                Şifreyi tekrar yaz
                <input
                  autoComplete="new-password"
                  type="password"
                  required
                  minLength={10}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="••••••••••"
                />
              </label>
            )}

            {mode === 'signup' && (
              <div className="auth-consents">
                <label className="auth-check">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <span>
                    <a href="/uyelik-sozlesmesi" target="_blank" rel="noreferrer">Üyelik Sözleşmesi</a>’ni okudum ve kabul ediyorum.
                  </span>
                </label>
                <p>
                  Kişisel verilerinin kullanımını <a href="/kvkk-aydinlatma" target="_blank" rel="noreferrer">KVKK Aydınlatma Metni</a> açıklar.
                </p>
                <label className="auth-check optional">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                  />
                  <span>
                    Kampanya ve yeni ürünleri e-posta ve SMS ile almak istiyorum. <b>İsteğe bağlıdır.</b>
                  </span>
                </label>
                <a className="auth-consent-link" href="/ticari-ileti" target="_blank" rel="noreferrer">
                  Ticari ileti izninin ayrıntıları →
                </a>
              </div>
            )}

            {mode === 'login' && (
              <button
                type="button"
                className="forgot-link"
                onClick={() => switchTab('forgot')}
              >
                Şifremi unuttum
              </button>
            )}

            {errorMsg && <div className="auth-error" role="alert">{errorMsg}</div>}
            {successMsg && <div className="auth-success" role="status">{successMsg}</div>}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading || (mode === 'new-password' && !validSession)}
            >
              {loading
                ? 'Lütfen bekle…'
                : mode === 'signup'
                ? 'Üyeliğimi oluştur →'
                : mode === 'forgot'
                ? 'Yenileme bağlantısı gönder →'
                : mode === 'new-password'
                ? 'Yeni şifreyi kaydet →'
                : 'Hesabıma giriş yap →'}
            </button>
          </form>

          {(mode === 'forgot' || mode === 'new-password') && (
            <button
              type="button"
              className="auth-secondary"
              onClick={() => switchTab('login')}
            >
              ← Giriş ekranına dön
            </button>
          )}

          <p className="auth-privacy">
            Kart bilgilerin Eztila’da tutulmaz. Hesap verilerin yalnız sipariş ve müşteri deneyimi için kullanılır.
          </p>
        </div>
      </section>
    </main>
  );
}
