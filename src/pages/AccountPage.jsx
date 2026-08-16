import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import MobileNavigation from '../components/MobileNavigation';
import { getAccountOverview } from '../services/account-service';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';
const fmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });

const TAB_TITLES = {
  overview: 'Hesabım',
  favorites: 'Favorilerim',
  profile: 'Profil bilgilerim',
  security: 'Şifre ve güvenlik',
};

const TABS = [
  { id: 'overview', label: 'Genel bakış', mobile: 'Özet', mark: '01' },
  { id: 'favorites', label: 'Favorilerim', mobile: 'Favori', mark: '02' },
  { id: 'profile', label: 'Profilim', mobile: 'Profil', mark: '03' },
  { id: 'security', label: 'Güvenlik', mobile: 'Şifre', mark: '04' },
];

function EmptyState({ title, text, action, href }) {
  return (
    <div className="account-empty">
      <span>◇</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <a href={href}>{action} →</a>
    </div>
  );
}

export default function AccountPage() {
  const [account, setAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [favorites, setFavorites] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem('eztila-favorites') || '[]'));
    } catch {
      setFavorites([]);
    }
  }, []);

  function removeFavorite(productId) {
    const updated = favorites.filter((item) => item.id !== productId);
    setFavorites(updated);
    localStorage.setItem('eztila-favorites', JSON.stringify(updated));
    setSuccessMsg('Ürün favorilerden kaldırıldı.');
  }

  async function loadAccount() {
    try {
      const currentAccount = await getAccountOverview();
      if (!currentAccount) {
        window.location.replace('/giris');
        return;
      }
      setAccount(currentAccount);
      setErrorMsg('');
    } catch {
      setErrorMsg('Hesabın şu anda yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAccount(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handlePasswordChange(event) {
    event.preventDefault();
    if (newPassword.length < 10) {
      setErrorMsg('Yeni şifre en az 10 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Şifreler birbiriyle eşleşmiyor.');
      return;
    }
    setPwSaving(true);
    setErrorMsg('');
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccessMsg('Şifreniz başarıyla değiştirildi.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Şifre güncellenemedi.');
    } finally {
      setPwSaving(false);
    }
  }

  async function handleSignout() {
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut({ scope: 'global' });
    window.location.assign('/');
  }

  const firstName = account?.customer.fullName?.trim().split(' ')[0] || 'hoş geldin';
  const initials = (account?.customer.fullName || account?.customer.email || 'E B')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toLocaleUpperCase('tr-TR');

  return (
    <main className="member-shell">
      <header className="store-header member-header">
        <MobileNavigation
          favoriteCount={favorites.length}
          accountHref="/hesabim"
          accountLabel="Hesabım"
          onSignOut={handleSignout}
        />
        <a className="store-logo" href="/" aria-label="Eztila Butik Ana Sayfa">
          <img src={LOGO} alt="Eztila Butik" />
        </a>
        <nav aria-label="Hesap navigasyonu">
          <a href="/#koleksiyon">Yeni sezon</a>
          <a href="/#koleksiyon">Koleksiyon</a>
        </nav>
        <div className="header-tools">
          <span className="member-email">{account?.customer.email}</span>
          <button type="button" className="member-signout" onClick={handleSignout}>Çıkış yap</button>
        </div>
      </header>

      <section className="member-hero">
        <div className="member-identity">
          <span className="member-avatar" aria-hidden="true">{initials}</span>
          <div>
            <p>EZTİLA MEMBERS</p>
            <h1>Merhaba, {firstName}.</h1>
            <span>Favori parçaların ve hesap güvenliği ayarların tek yerde.</span>
          </div>
        </div>
        <div className="member-hero-actions">
          <small>ÜYE HESABI</small>
          <strong>{account?.customer.email || 'Hesabın aktif'}</strong>
          <a href="/#koleksiyon">Koleksiyonu incele →</a>
        </div>
      </section>

      <nav className="member-tabs" role="tablist" aria-label="Hesap bölümleri">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            <i>{tab.mark}</i>
            <span className="tab-desktop">{tab.label}</span>
            <span className="tab-mobile">{tab.mobile}</span>
            {tab.id === 'favorites' && <b>{favorites.length}</b>}
          </button>
        ))}
      </nav>

      <section className="member-content">
        <header>
          <p>MÜŞTERİ HESABI</p>
          <h2>{TAB_TITLES[activeTab]}</h2>
        </header>

        {successMsg && (
          <div className="account-message" role="status">
            <span>{successMsg}</span>
            <button type="button" aria-label="Mesajı kapat" onClick={() => setSuccessMsg('')}>×</button>
          </div>
        )}

        {errorMsg && (
          <div className="account-error" role="alert">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => { setLoading(true); loadAccount(); }}>Yeniden dene</button>
          </div>
        )}

        {loading ? (
          <div className="account-loading">Hesabın hazırlanıyor…</div>
        ) : account && (
          <>
            {activeTab === 'overview' && (
              <div className="member-stat-grid account-compact-overview">
                <article>
                  <span>Favori Parçalarım</span>
                  <strong>{favorites.length}</strong>
                  <button type="button" onClick={() => setActiveTab('favorites')}>Favorileri aç →</button>
                </article>
                <article>
                  <span>Profil Bilgilerim</span>
                  <strong aria-hidden="true">◇</strong>
                  <button type="button" onClick={() => setActiveTab('profile')}>Profili görüntüle →</button>
                </article>
                <article>
                  <span>Hesap Güvenliği</span>
                  <strong aria-hidden="true">✓</strong>
                  <button type="button" onClick={() => setActiveTab('security')}>Güvenliği aç →</button>
                </article>
              </div>
            )}

            {activeTab === 'favorites' && (
              <section className="account-panel member-panel">
                <div className="account-panel-head">
                  <div>
                    <h2>Favori Ürünlerim ({favorites.length})</h2>
                    <p>Beğendiğin ve daha sonra incelemek istediğin koleksiyon parçaları.</p>
                  </div>
                </div>
                {favorites.length ? (
                  <div className="account-favorites-grid">
                    {favorites.map((product) => (
                      <article key={product.id} className="favorite-card">
                        <img src={product.imageUrl || LOGO} alt={product.name} />
                        <div className="fav-info">
                          <h3>{product.name}</h3>
                          <strong>{fmt.format(product.priceCents / 100)}</strong>
                          <div className="fav-actions">
                            <a className="account-primary" href={`/urun/${product.slug}`}>Ürünü İncele</a>
                            <button type="button" className="danger-text-btn" onClick={() => removeFavorite(product.id)}>Kaldır</button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Henüz favori ürünün yok."
                    text="Koleksiyonu gezerken beğendiğin parçaları kalp ikonuna tıklayarak favorilerine ekleyebilirsin."
                    action="Koleksiyonu incele"
                    href="/#koleksiyon"
                  />
                )}
              </section>
            )}

            {activeTab === 'profile' && (
              <section className="account-panel member-panel">
                <div className="account-panel-head">
                  <div>
                    <h2>Kişisel bilgilerim</h2>
                    <p>Supabase Auth hesabından okunan kimlik bilgilerin.</p>
                  </div>
                </div>
                <div className="account-profile-form">
                  <label>
                    Ad soyad
                    <input autoComplete="name" value={account.customer.fullName || ''} disabled />
                  </label>
                  <label>
                    E-posta adresi
                    <input value={account.customer.email} disabled />
                    <small>Üyelik hesabına bağlıdır, değiştirilemez.</small>
                  </label>
                  <label>
                    Telefon numarası
                    <input type="tel" autoComplete="tel" value={account.customer.phone || ''} placeholder="05xx xxx xx xx" disabled />
                  </label>
                  <div className="account-consent-box">
                    <strong>Profil güncelleme yakında</strong>
                    <p>Profil, telefon ve iletişim tercihi kaydetme altyapısı henüz aktif değildir.</p>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'security' && (
              <section className="account-panel member-panel">
                <div className="account-panel-head">
                  <div>
                    <h2>Şifre ve Güvenlik</h2>
                    <p>Hesabınızın güvenliği için güçlü bir şifre kullanın.</p>
                  </div>
                </div>
                <form className="account-profile-form" onSubmit={handlePasswordChange}>
                  <label>
                    Yeni Şifre
                    <input
                      type="password"
                      required
                      minLength={10}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="En az 10 karakter"
                    />
                    <small>Şifreniz en az 10 karakter uzunluğunda olmalıdır.</small>
                  </label>
                  <label>
                    Yeni Şifre (Tekrar)
                    <input
                      type="password"
                      required
                      minLength={10}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Yeni şifrenizi tekrar yazın"
                    />
                  </label>
                  <button type="submit" className="account-primary" disabled={pwSaving}>
                    {pwSaving ? 'Şifre Güncelleniyor…' : 'Şifreyi Değiştir'}
                  </button>
                </form>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
