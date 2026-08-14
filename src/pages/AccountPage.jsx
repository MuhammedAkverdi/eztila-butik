import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { authFetch } from '../lib/auth-fetch';
import { PROMO_COUPONS } from '../lib/coupons';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';

const EMPTY_ADDRESS = {
  label: 'Evim',
  contactName: '',
  phone: '',
  city: '',
  district: '',
  neighborhood: '',
  address: '',
  postalCode: '',
  isDefault: true,
};

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
  const [editAddress, setEditAddress] = useState(null);
  const [editAddressId, setEditAddressId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [favorites, setFavorites] = useState([]);
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
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

  function addFavoriteToCart(product) {
    try {
      const currentCart = JSON.parse(localStorage.getItem('eztila-cart') || '[]');
      const defaultVariant = product.variants?.find((v) => v.stock > 0)?.label || 'Standart';
      const idx = currentCart.findIndex((i) => i.productId === product.id && i.variantLabel === defaultVariant);
      let updatedCart;
      if (idx >= 0) {
        updatedCart = currentCart.map((item, i) => i === idx ? { ...item, quantity: Math.min(10, item.quantity + 1) } : item);
      } else {
        updatedCart = [...currentCart, { productId: product.id, quantity: 1, variantLabel: defaultVariant }];
      }
      localStorage.setItem('eztila-cart', JSON.stringify(updatedCart));
      setSuccessMsg(`"${product.name}" sepete eklendi.`);
    } catch {
      setErrorMsg('Ürün sepete eklenemedi.');
    }
  }

  async function loadAccount() {
    try {
      const res = await authFetch('/api/account');
      if (res.status === 401) { 
        setErrorMsg('Yetkisiz giriş (401). Lütfen tekrar giriş yapın (Vercel Proxy bypass test).'); 
        return; 
      }
      if (!res.ok) throw new Error('Hesap bilgileri alınamadı.');
      setAccount(await res.json());
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
    if (!editAddress && !selectedOrder) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) { 
      if (e.key === 'Escape' && !saving) { 
        setEditAddress(null); 
        setEditAddressId(null);
        setSelectedOrder(null);
      } 
    }
    document.addEventListener('keydown', onKey);
    return () => { 
      document.body.style.overflow = prev; 
      document.removeEventListener('keydown', onKey); 
    };
  }, [editAddress, selectedOrder, saving]);

  function startEditAddress(addr) {
    const { id, ...rest } = addr;
    setEditAddressId(id);
    setEditAddress(rest);
  }

  function startNewAddress() {
    if (!account) return;
    setEditAddress({
      ...EMPTY_ADDRESS,
      contactName: account.customer.fullName || '',
      phone: account.customer.phone || '',
      isDefault: account.addresses.length === 0,
    });
    setEditAddressId(null);
  }

  async function handleAddressSave(e) {
    e.preventDefault();
    if (!editAddress) return;
    setSaving(true);
    setErrorMsg('');
    try {
      const url = editAddressId ? `/api/account/addresses/${editAddressId}` : '/api/account/addresses';
      const res = await authFetch(url, {
        method: editAddressId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(editAddress),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Adres kaydedilemedi');
      setSuccessMsg(editAddressId ? 'Adres başarıyla güncellendi.' : 'Yeni teslimat adresi eklendi.');
      setEditAddress(null);
      setEditAddressId(null);
      await loadAccount();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Adres kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteAddress(id) {
    if (!confirm('Bu adresi silmek istediğine emin misin?')) return;
    try {
      const res = await authFetch(`/api/account/addresses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSuccessMsg('Adres başarıyla silindi.');
      await loadAccount();
    } catch {
      setErrorMsg('Adres silinemedi. Lütfen tekrar dene.');
    }
  }

  async function setDefaultAddress(id) {
    try {
      const res = await authFetch(`/api/account/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) throw new Error();
      setSuccessMsg('Varsayılan teslimat adresi güncellendi.');
      await loadAccount();
    } catch {
      setErrorMsg('Varsayılan adres güncellenemedi.');
    }
  }

  async function deletePaymentMethod(id) {
    if (!confirm('Bu kayıtlı ödeme yöntemini kaldırmak istediğine emin misin?')) return;
    try {
      const res = await authFetch(`/api/account/payment-methods/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSuccessMsg('Ödeme yöntemi kaldırıldı.');
      await loadAccount();
    } catch {
      setErrorMsg('Ödeme yöntemi kaldırılamadı.');
    }
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    if (!account) return;
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await authFetch('/api/account', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(account.customer),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Profil güncellenemedi');
      setSuccessMsg('Profil bilgileriniz başarıyla güncellendi.');
      await loadAccount();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Profil güncellenemedi.');
    } finally {
      setSaving(false);
    }
  }

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
            <span>Siparişlerin, adreslerin ve sana özel butik deneyimin tek yerde.</span>
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
            {tab.id === 'orders' && <b>{account?.orders.length || 0}</b>}
            {tab.id === 'favorites' && <b>{favorites.length}</b>}
            {tab.id === 'addresses' && <b>{account?.addresses.length || 0}</b>}
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
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                <div className="member-stat-grid">
                  <article>
                    <span>Siparişlerim</span>
                    <strong>{account.orders.length}</strong>
                    <button type="button" onClick={() => setActiveTab('orders')}>Tümünü gör →</button>
                  </article>
                  <article>
                    <span>Favori Parçalarım</span>
                    <strong>{favorites.length}</strong>
                    <button type="button" onClick={() => setActiveTab('favorites')}>Favorileri aç →</button>
                  </article>
                  <article>
                    <span>Kayıtlı Adresler</span>
                    <strong>{account.addresses.length}</strong>
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
                      title="Henüz siparişin yok."
                      text="Beğendiğin parçaları keşfet; ilk siparişin burada görünecek."
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
                    title="Henüz siparişin yok."
                    text="Yeni sezon koleksiyonundan ilk Eztila görünümünü oluştur."
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
                            <button type="button" className="account-primary" onClick={() => addFavoriteToCart(prod)}>
                              Sepete Ekle
                            </button>
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
                    <p>Ödeme sırasında hızlıca seçebileceğin kayıtlı teslimat adreslerin.</p>
                  </div>
                  <button type="button" className="account-primary" onClick={startNewAddress}>
                    + Yeni adres ekle
                  </button>
                </div>
                <div className="address-grid">
                  {account.addresses.map((addr) => (
                    <article key={addr.id} className={addr.isDefault ? 'default-address-card' : ''}>
                      {addr.isDefault && <b>Varsayılan</b>}
                      <h3>{addr.label}</h3>
                      <strong>{addr.contactName}</strong>
                      <p>
                        {addr.neighborhood && `${addr.neighborhood}, `}{addr.address}<br />
                        {addr.district} / {addr.city} {addr.postalCode && `(${addr.postalCode})`}
                      </p>
                      <span className="address-phone">{addr.phone}</span>
                      <div className="address-actions">
                        <button type="button" onClick={() => startEditAddress(addr)}>Düzenle</button>
                        {!addr.isDefault && (
                          <button type="button" onClick={() => setDefaultAddress(addr.id)}>Varsayılan Yap</button>
                        )}
                        <button type="button" className="danger" onClick={() => deleteAddress(addr.id)}>Sil</button>
                      </div>
                    </article>
                  ))}
                </div>
                {!account.addresses.length && !editAddress && (
                  <EmptyState
                    title="Kayıtlı adresin yok."
                    text="Teslimat bilgilerini bir kez ekle, sonraki alışverişlerini hızlandır."
                    action="İlk adresini ekle"
                    onClick={startNewAddress}
                  />
                )}
              </section>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === 'payments' && (
              <section className="account-panel member-panel">
                <div className="account-panel-head">
                  <div>
                    <h2>Kayıtlı ödeme yöntemleri</h2>
                    <p>Kart numarası ve CVV Eztila'da saklanmaz; yalnız lisanslı ödeme kuruluşu tokenı kullanılır.</p>
                  </div>
                </div>
                <div className="payment-card-grid">
                  {account.paymentMethods?.map((pm) => (
                    <article key={pm.id}>
                      <div>
                        <span>{pm.cardBrand || 'KART'}</span>
                        <b>•••• •••• •••• {pm.lastFourDigits}</b>
                        <small>{pm.cardAlias}</small>
                      </div>
                      <button type="button" onClick={() => deletePaymentMethod(pm.id)}>Kaldır</button>
                    </article>
                  ))}
                </div>
                {!account.paymentMethods?.length && (
                  <EmptyState
                    title="Henüz kayıtlı kartın yok."
                    text="Güvenli kart saklama altyapısı ile sipariş sırasında kartını bir sonraki alışverişin için kaydedebilirsin."
                    action="Alışverişe dön"
                    href="/#koleksiyon"
                  />
                )}
              </section>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <section className="account-panel member-panel">
                <div className="account-panel-head">
                  <div>
                    <h2>Kişisel bilgilerim</h2>
                    <p>Sipariş ve teslimat iletişiminde kullanılacak resmi hesap bilgilerin.</p>
                  </div>
                </div>
                <form className="account-profile-form" onSubmit={handleProfileSave}>
                  <label>
                    Ad soyad
                    <input
                      required
                      autoComplete="name"
                      value={account.customer.fullName || ''}
                      onChange={(e) => setAccount({
                        ...account,
                        customer: { ...account.customer, fullName: e.target.value }
                      })}
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
                      onChange={(e) => setAccount({
                        ...account,
                        customer: { ...account.customer, phone: e.target.value }
                      })}
                      placeholder="05xx xxx xx xx"
                    />
                  </label>
                  <div className="account-consent-box">
                    <strong>İletişim tercihleri</strong>
                    <p>Kampanya, indirim ve yeni sezon bilgilendirme onaylarınızı dilediğiniz zaman güncelleyebilirsiniz.</p>
                    <label className="account-checkbox">
                      <input
                        type="checkbox"
                        checked={!!(account.customer.emailMarketing && account.customer.smsMarketing)}
                        onChange={(e) => setAccount({
                          ...account,
                          customer: {
                            ...account.customer,
                            emailMarketing: e.target.checked,
                            smsMarketing: e.target.checked,
                          }
                        })}
                      />
                      <span>Yeni ürün ve kampanyaları e-posta ve SMS ile almak istiyorum.</span>
                    </label>
                    <a href="/ticari-ileti" target="_blank" rel="noreferrer">Ticari ileti izni ayrıntıları →</a>
                  </div>
                  <button type="submit" className="account-primary" disabled={saving}>
                    {saving ? 'Kaydediliyor…' : 'Bilgilerimi Güncelle'}
                  </button>
                </form>
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

        {/* ADDRESS MODAL */}
        {editAddress && (
          <div className="account-modal-backdrop" onMouseDown={() => { if (!saving) { setEditAddress(null); setEditAddressId(null); } }}>
            <section className="account-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
              <header>
                <div>
                  <small>TESLİMAT ADRESİ</small>
                  <h2>{editAddressId ? 'Adresi düzenle' : 'Yeni adres ekle'}</h2>
                </div>
                <button type="button" aria-label="Pencereyi kapat" onClick={() => { setEditAddress(null); setEditAddressId(null); }}>×</button>
              </header>
              <form onSubmit={handleAddressSave}>
                <div className="account-form-grid">
                  <label>
                    Adres başlığı (örn: Evim, İşyeri)
                    <input required value={editAddress.label} onChange={(e) => setEditAddress({ ...editAddress, label: e.target.value })} placeholder="Evim / İş" />
                  </label>
                  <label>
                    Teslim Alacak Kişi (Ad Soyad)
                    <input required autoComplete="name" value={editAddress.contactName} onChange={(e) => setEditAddress({ ...editAddress, contactName: e.target.value })} />
                  </label>
                  <label>
                    Telefon
                    <input required type="tel" autoComplete="tel" value={editAddress.phone} onChange={(e) => setEditAddress({ ...editAddress, phone: e.target.value })} placeholder="05xx xxx xx xx" />
                  </label>
                  <label>
                    İl
                    <input required autoComplete="address-level1" value={editAddress.city} onChange={(e) => setEditAddress({ ...editAddress, city: e.target.value })} placeholder="İstanbul" />
                  </label>
                  <label>
                    İlçe
                    <input required autoComplete="address-level2" value={editAddress.district} onChange={(e) => setEditAddress({ ...editAddress, district: e.target.value })} placeholder="Kadıköy" />
                  </label>
                  <label>
                    Mahalle
                    <input value={editAddress.neighborhood || ''} onChange={(e) => setEditAddress({ ...editAddress, neighborhood: e.target.value })} placeholder="Caddebostan Mah." />
                  </label>
                  <label className="wide">
                    Açık Adres (Cadde, Sokak, Bina No, Daire No)
                    <textarea required autoComplete="street-address" value={editAddress.address} onChange={(e) => setEditAddress({ ...editAddress, address: e.target.value })} placeholder="Bağdat Cad. No: 123 Daire: 4" />
                  </label>
                  <label>
                    Posta kodu
                    <input autoComplete="postal-code" value={editAddress.postalCode || ''} onChange={(e) => setEditAddress({ ...editAddress, postalCode: e.target.value })} placeholder="34728" />
                  </label>
                  <label className="account-checkbox wide">
                    <input type="checkbox" checked={editAddress.isDefault} onChange={(e) => setEditAddress({ ...editAddress, isDefault: e.target.checked })} />
                    <span>Bu adresi varsayılan teslimat adresim yap</span>
                  </label>
                </div>
                <footer>
                  <button type="button" onClick={() => { setEditAddress(null); setEditAddressId(null); }}>Vazgeç</button>
                  <button type="submit" className="account-primary" disabled={saving}>
                    {saving ? 'Kaydediliyor…' : 'Adresi Kaydet'}
                  </button>
                </footer>
              </form>
            </section>
          </div>
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
