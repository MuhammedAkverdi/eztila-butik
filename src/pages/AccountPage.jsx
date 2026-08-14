import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { PROMO_COUPONS } from '../lib/coupons';
import { getAccountOverview } from '../services/account-service';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';

const fmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });

const STATUS_MAP = {
  pending_payment: 'Ödeme bekliyor',
  paid: 'Ödendi',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim edildi',
  cancelled: 'İptal',
  refunded: 'İade',
};

const TAB_TITLES = {
  overview: 'Hesabım',
  orders: 'Siparişlerim',
  favorites: 'Favorilerim',
  addresses: 'Adreslerim',
  payments: 'Ödeme yöntemlerim',
  profile: 'Profil bilgilerim',
  security: 'Şifre ve güvenlik',
};

const TABS = [
  { id: 'overview', label: 'Genel bakış', mobile: 'Özet', mark: '01' },
  { id: 'orders', label: 'Siparişlerim', mobile: 'Sipariş', mark: '02' },
  { id: 'favorites', label: 'Favorilerim', mobile: 'Favori', mark: '03' },
  { id: 'addresses', label: 'Adreslerim', mobile: 'Adres', mark: '04' },
  { id: 'payments', label: 'Ödeme yöntemlerim', mobile: 'Ödeme', mark: '05' },
  { id: 'profile', label: 'Profilim', mobile: 'Profil', mark: '06' },
  { id: 'security', label: 'Güvenlik', mobile: 'Şifre', mark: '07' },
];

function OrderRow({ order, onSelect }) {
  return (
    <article className="account-order-row">
      <div>
        <small>{new Date(order.createdAt).toLocaleDateString('tr-TR')}</small>
        <strong>{order.orderNumber}</strong>
      </div>
      <span className={`order-status ${order.status}`}>
        {STATUS_MAP[order.status] || order.status}
      </span>
      <b>{fmt.format(order.totalCents / 100)}</b>
      <button type="button" className="order-detail-btn" onClick={() => onSelect(order)}>
        Detay / Takip →
      </button>
    </article>
  );
}

function EmptyState({ title, text, action, href, onClick }) {
  return (
    <div className="account-empty">
      <span>◇</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {href ? <a href={href}>{action} →</a> : <button type="button" onClick={onClick}>{action} →</button>}
    </div>
  );
}

export default function AccountPage() {
  const [account, setAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [favorites, setFavorites] = useState([]);
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // Load wishlist from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('eztila-favorites') || '[]');
      setFavorites(saved);
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
      if (!currentAccount) { window.location.replace('/giris'); return; }
      setAccount(currentAccount);
      setErrorMsg('');
    } catch {
      setErrorMsg('Hesabın şu anda yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => void loadAccount(), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!selectedOrder) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) { 
      if (e.key === 'Escape') setSelectedOrder(null);
    }
    document.addEventListener('keydown', onKey);
    return () => { 
      document.body.style.overflow = prev; 
      document.removeEventListener('keydown', onKey); 
    };
  }, [selectedOrder]);

  async function handlePasswordChange(e) {
    e.preventDefault();
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
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Şifre güncellenemedi.');
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
    .split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toLocaleUpperCase('tr-TR');

  return (
    <main className="member-shell">
      <header className="store-header member-header">
        <a className="store-logo" href="/" aria-label="Eztila Butik Ana Sayfa">
          <img src={LOGO} alt="Eztila Butik" />
        </a>
        <nav aria-label="Hesap navigasyonu">
          <a href="/#koleksiyon">Yeni sezon</a>
          <a href="/#koleksiyon">Koleksiyon</a>
          <a href="/siparis-takip">Sipariş takip</a>
        </nav>
        <div className="header-tools">
          <span className="member-email">{account?.customer.email}</span>
          <button type="button" className="member-signout" onClick={handleSignout}>
            Çıkış yap
          </button>
        </div>
      </header>

      <section className="member-hero">
        <div className="member-identity">
          <span className="member-avatar" aria-hidden="true">{initials}</span>
          <div>
            <p>EZTİLA MEMBERS</p>
            <h1>Merhaba, {firstName}.</h1>
            <span>Üyelik kimliğin ve hesap güvenliği ayarların tek yerde.</span>
          </div>
        </div>
        <div className="member-hero-actions">
          <small>ÜYE HESABI</small>
          <strong>{account?.customer.email || 'Güvenli hesabın aktif'}</strong>
          <a href="/#koleksiyon">Alışverişe devam et →</a>
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
            {tab.id === 'orders' && <b>{account?.accountBackendAvailable ? account.orders.length : '—'}</b>}
            {tab.id === 'favorites' && <b>{favorites.length}</b>}
            {tab.id === 'addresses' && <b>{account?.accountBackendAvailable ? account.addresses.length : '—'}</b>}
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

        {account && !account.accountBackendAvailable && (
          <div className="account-message" role="status">
            <span>Profil kimliğin Supabase Auth üzerinden doğrulanır. Sipariş, adres ve kayıtlı ödeme verileri için hesap altyapısı henüz aktif değildir.</span>
          </div>
        )}

        {loading ? (
          <div className="account-loading">Hesabın hazırlanıyor…</div>
        ) : account && (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                <div className="member-stat-grid">
                  <article>
                    <span>Siparişlerim</span>
                    <strong>{account.accountBackendAvailable ? account.orders.length : '—'}</strong>
                    <button type="button" onClick={() => setActiveTab('orders')}>Tümünü gör →</button>
                  </article>
                  <article>
                    <span>Favori Parçalarım</span>
                    <strong>{favorites.length}</strong>
                    <button type="button" onClick={() => setActiveTab('favorites')}>Favorileri aç →</button>
                  </article>
                  <article>
                    <span>Kayıtlı Adresler</span>
                    <strong>{account.accountBackendAvailable ? account.addresses.length : '—'}</strong>
                    <button type="button" onClick={() => setActiveTab('addresses')}>Adresleri yönet →</button>
                  </article>
                </div>

                <section className="account-panel member-panel">
                  <div className="account-panel-head">
                    <div>
                      <h2>Son siparişler</h2>
                      <p>Siparişlerinin güncel durumunu buradan takip edebilirsin.</p>
                    </div>
                    <button type="button" onClick={() => setActiveTab('orders')}>Tümünü gör</button>
                  </div>
                  {account.orders.length ? (
                    account.orders.slice(0, 3).map((o) => (
                      <OrderRow key={o.id} order={o} onSelect={(order) => setSelectedOrder(order)} />
                    ))
                  ) : (
                    <EmptyState
                      title="Sipariş geçmişi henüz aktif değil."
                      text="Sipariş altyapısı tamamlandığında gerçek siparişlerin burada görünecek."
                      action="Koleksiyonu keşfet"
                      href="/#koleksiyon"
                    />
                  )}
                </section>

                <section className="account-panel member-panel" style={{ marginTop: '1.5rem' }}>
                  <div className="account-panel-head">
                    <div>
                      <h2>Size Özel İndirim Kuponları</h2>
                      <p>Siparişlerinizde kullanabileceğiniz güncel promosyon kodları.</p>
                    </div>
                  </div>
                  <div className="account-coupons-grid">
                    {PROMO_COUPONS.map((coupon) => (
                      <article key={coupon.code} className="account-coupon-card">
                        <div className="coupon-card-badge">
                          <b>{coupon.type === 'percentage' ? `%${coupon.value}` : coupon.type === 'fixed' ? `${coupon.valueCents / 100} TL` : 'Kargo'}</b>
                          <small>{coupon.type === 'free_shipping' ? 'BEDAVA' : 'İNDİRİM'}</small>
                        </div>
                        <div className="coupon-card-info">
                          <h3>{coupon.code}</h3>
                          <p>{coupon.description}</p>
                        </div>
                        <button
                          type="button"
                          className="coupon-copy-btn"
                          onClick={() => {
                            navigator.clipboard?.writeText(coupon.code);
                            setSuccessMsg(`"${coupon.code}" kodu panoya kopyalandı!`);
                          }}
                        >
                          Kodu Kopyala
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <section className="account-panel member-panel">
                <div className="account-panel-head">
                  <div>
                    <h2>Sipariş geçmişi</h2>
                    <p>Geçmiş ve devam eden tüm siparişlerin.</p>
                  </div>
                </div>
                {account.orders.length ? (
                  account.orders.map((o) => (
                    <OrderRow key={o.id} order={o} onSelect={(order) => setSelectedOrder(order)} />
                  ))
                ) : (
                  <EmptyState
                    title="Sipariş geçmişi henüz aktif değil."
                    text="Gerçek sipariş backend'i hazır olduğunda siparişlerin burada listelenecek."
                    action="Alışverişe başla"
                    href="/#koleksiyon"
                  />
                )}
              </section>
            )}

            {/* FAVORITES TAB */}
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
                    {favorites.map((prod) => (
                      <article key={prod.id} className="favorite-card">
                        <img src={prod.imageUrl || LOGO} alt={prod.name} />
                        <div className="fav-info">
                          <h3>{prod.name}</h3>
                          <strong>{fmt.format(prod.priceCents / 100)}</strong>
                          <div className="fav-actions">
                            <a className="account-primary" href={`/urun/${prod.slug}`}>
                              Seçenekleri Gör
                            </a>
                            <button type="button" className="danger-text-btn" onClick={() => removeFavorite(prod.id)}>
                              Kaldır
                            </button>
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

            {/* ADDRESSES TAB */}
            {activeTab === 'addresses' && (
              <section className="account-panel member-panel">
                <div className="account-panel-head">
                  <div>
                    <h2>Teslimat adresleri</h2>
                    <p>Adres kaydetme altyapısı henüz aktif değildir.</p>
                  </div>
                </div>
                <EmptyState
                  title="Adres kaydetme yakında aktif olacak."
                  text="Şu anda teslimat adresi almıyor veya saklamıyoruz."
                  action="Koleksiyona dön"
                  href="/#koleksiyon"
                />
              </section>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === 'payments' && (
              <section className="account-panel member-panel">
                <div className="account-panel-head">
                  <div>
                    <h2>Kayıtlı ödeme yöntemleri</h2>
                    <p>Online ödeme ve kart saklama altyapısı henüz aktif değildir.</p>
                  </div>
                </div>
                <EmptyState
                  title="Kayıtlı ödeme yöntemi özelliği aktif değil."
                  text="Eztila şu anda kart bilgisi veya ödeme yöntemi saklamamaktadır."
                  action="Koleksiyona dön"
                  href="/#koleksiyon"
                />
              </section>
            )}

            {/* PROFILE TAB */}
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
                    <input
                      autoComplete="name"
                      value={account.customer.fullName || ''}
                      disabled
                    />
                  </label>
                  <label>
                    E-posta adresi
                    <input value={account.customer.email} disabled />
                    <small>Güvenli üyelik hesabına bağlıdır, değiştirilemez.</small>
                  </label>
                  <label>
                    Telefon numarası
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={account.customer.phone || ''}
                      placeholder="05xx xxx xx xx"
                      disabled
                    />
                  </label>
                  <div className="account-consent-box">
                    <strong>Profil güncelleme yakında</strong>
                    <p>Profil, telefon ve iletişim tercihi kaydetme altyapısı henüz aktif değildir.</p>
                  </div>
                </div>
              </section>
            )}

            {/* SECURITY TAB */}
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
                      onChange={(e) => setNewPassword(e.target.value)}
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
                      onChange={(e) => setConfirmPassword(e.target.value)}
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

        {/* ORDER DETAIL MODAL */}
        {selectedOrder && (
          <div className="account-modal-backdrop" onMouseDown={() => setSelectedOrder(null)}>
            <section className="account-modal order-detail-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
              <header>
                <div>
                  <small>SİPARİŞ DETAYI</small>
                  <h2>Sipariş: #{selectedOrder.orderNumber}</h2>
                </div>
                <button type="button" aria-label="Kapat" onClick={() => setSelectedOrder(null)}>×</button>
              </header>
              <div className="order-modal-content">
                <div className="order-modal-header-info">
                  <div>
                    <span>Tarih:</span>
                    <strong>{new Date(selectedOrder.createdAt).toLocaleString('tr-TR')}</strong>
                  </div>
                  <div>
                    <span>Durum:</span>
                    <span className={`order-status ${selectedOrder.status}`}>
                      {STATUS_MAP[selectedOrder.status] || selectedOrder.status}
                    </span>
                  </div>
                  <div>
                    <span>Toplam Tutar:</span>
                    <strong>{fmt.format(selectedOrder.totalCents / 100)}</strong>
                  </div>
                  {selectedOrder.discountCents > 0 && (
                    <div style={{ color: '#277541' }}>
                      <span>Uygulanan Kupon:</span>
                      <strong>🏷️ {selectedOrder.appliedCoupon || 'İndirim'} (−{fmt.format(selectedOrder.discountCents / 100)})</strong>
                    </div>
                  )}
                </div>

                <div className="order-modal-shipping">
                  <h3>Teslimat Bilgileri</h3>
                  <p>{selectedOrder.shippingAddress || 'Standart Kargo Teslimatı'}</p>
                  {selectedOrder.trackingNumber && (
                    <p className="tracking-code">
                      Takip Kodu: <strong>{selectedOrder.trackingNumber}</strong>
                    </p>
                  )}
                </div>

                <div className="order-modal-actions">
                  <a
                    className="button button-primary"
                    href={`/siparis-takip?order=${encodeURIComponent(selectedOrder.orderNumber)}`}
                  >
                    Canlı Kargo Takibi →
                  </a>
                </div>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
