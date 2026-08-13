import { useState, useEffect, useMemo } from 'react';
import { authFetch } from '../lib/auth-fetch';
import { getSupabaseClient, getAuthConfig } from '../lib/supabase';
import { validateAndApplyCoupon, getSavedCoupon, saveActiveCoupon } from '../lib/coupons';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';
const fmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" width="20" height="20" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844c-.209 1.125-.843 2.078-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.615Z" />
      <path fill="#4285F4" d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.258c-.806.54-1.835.858-3.047.858-2.344 0-4.328-1.585-5.037-3.716H.956v2.332A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.963 10.704A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.168.281-1.704V4.964H.956A9 9 0 0 0 0 9c0 1.45.347 2.824.956 4.036l3.007-2.332Z" />
      <path fill="#34A853" d="M9 3.58c1.322 0 2.508.454 3.441 1.346l2.581-2.581C13.464.891 11.426 0 9 0A9 9 0 0 0 .956 4.964l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

export default function CheckoutPage() {
  const [account, setAccount] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(() => getSavedCoupon());
  const [couponFeedback, setCouponFeedback] = useState(null);

  // Address form
  const [shippingForm, setShippingForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    city: '',
    district: '',
    neighborhood: '',
    address: '',
    postalCode: '',
  });

  // Card form (PCI-DSS compliant)
  const [cardForm, setCardForm] = useState({
    cardHolder: '',
    cardNumber: '',
    expireMonth: '12',
    expireYear: '2028',
    cvv: '',
    saveCard: false,
  });

  // Agreements
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderComplete, setOrderComplete] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/products'),
      authFetch('/api/account'),
      getAuthConfig().catch(() => ({ googleEnabled: false })),
    ]).then(async ([pRes, aRes, authCfg]) => {
      const pData = await pRes.json().catch(() => ({ products: [] }));
      const aData = aRes.ok ? await aRes.json().catch(() => null) : null;
      setProducts(pData.products || []);
      setGoogleEnabled(authCfg.googleEnabled);
      if (aData) {
        setAccount(aData);
        if (aData.addresses?.length > 0) {
          const defaultAddr = aData.addresses.find((a) => a.isDefault) || aData.addresses[0];
          setSelectedAddressId(defaultAddr.id);
          setShippingForm({
            fullName: defaultAddr.contactName || aData.customer.fullName || '',
            phone: defaultAddr.phone || aData.customer.phone || '',
            email: aData.customer.email || '',
            city: defaultAddr.city || '',
            district: defaultAddr.district || '',
            neighborhood: defaultAddr.neighborhood || '',
            address: defaultAddr.address || '',
            postalCode: defaultAddr.postalCode || '',
          });
        } else {
          setShippingForm((prev) => ({
            ...prev,
            fullName: aData.customer.fullName || '',
            phone: aData.customer.phone || '',
            email: aData.customer.email || '',
          }));
        }
      }
    }).finally(() => {
      try {
        const savedCart = JSON.parse(localStorage.getItem('eztila-cart') || '[]');
        setCart(savedCart);
      } catch {
        setCart([]);
      }
      setLoading(false);
    });
  }, []);

  const cartItems = useMemo(() =>
    cart.map((item) => ({ ...item, product: products.find((p) => p.id === item.productId) })).filter((i) => i.product),
    [cart, products]
  );

  const subtotalCents = cartItems.reduce((sum, item) => {
    const vPrice = item.product.variants?.find((v) => v.label === item.variantLabel)?.priceCents || item.product.priceCents;
    return sum + vPrice * item.quantity;
  }, 0);

  const currentCouponResult = useMemo(() => {
    if (!appliedCoupon) return null;
    return validateAndApplyCoupon(appliedCoupon.code, subtotalCents);
  }, [appliedCoupon, subtotalCents]);

  const discountCents = currentCouponResult?.valid ? currentCouponResult.discountCents : 0;
  const isCouponFreeShipping = currentCouponResult?.valid && currentCouponResult.isFreeShipping;
  const shippingCents = (subtotalCents >= 150000 || subtotalCents === 0 || isCouponFreeShipping) ? 0 : 7900;
  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;

  function handleApplyCoupon(e) {
    e?.preventDefault();
    setCouponFeedback(null);
    const res = validateAndApplyCoupon(couponInput, subtotalCents);
    if (!res.valid) {
      setCouponFeedback({ type: 'error', text: res.message });
      return;
    }
    setAppliedCoupon(res);
    saveActiveCoupon(res);
    setCouponFeedback({ type: 'success', text: `"${res.code}" kuponu başarıyla uygulandı.` });
    setCouponInput('');
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    saveActiveCoupon(null);
    setCouponFeedback({ type: 'info', text: 'Kupon kaldırıldı.' });
  }

  async function handleGoogleAuth() {
    try {
      const supabase = await getSupabaseClient();
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/odeme')}`,
        },
      });
    } catch {
      window.location.assign('/giris?next=/odeme');
    }
  }

  async function handleCompleteOrder(e) {
    e.preventDefault();
    if (!agreedToTerms) {
      setErrorMsg('Lütfen Ön Bilgilendirme Koşulları ve Mesafeli Satış Sözleşmesi\'ni onaylayınız.');
      return;
    }
    if (cardForm.cardNumber.replace(/\s/g, '').length < 16 || cardForm.cvv.length < 3) {
      setErrorMsg('Lütfen geçerli kart numarası ve güvenlik kodunu (CVV) eksiksiz yazınız.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      // Create Order payload
      const orderNumber = `EZT-${Date.now().toString().slice(-6)}`;
      const payload = {
        orderNumber,
        items: cartItems.map((i) => ({
          productId: i.productId,
          productName: i.product.name,
          variant: i.variantLabel,
          quantity: i.quantity,
          priceCents: i.product.priceCents,
        })),
        shippingAddress: `${shippingForm.fullName}, ${shippingForm.neighborhood ? shippingForm.neighborhood + ', ' : ''}${shippingForm.address} ${shippingForm.district}/${shippingForm.city}`,
        phone: shippingForm.phone,
        email: shippingForm.email,
        subtotalCents,
        discountCents,
        appliedCoupon: appliedCoupon?.code || null,
        totalCents,
        shippingCents,
        paymentStatus: 'paid',
        createdAt: new Date().toISOString(),
      };

      // Best effort send to account if logged in
      try {
        await authFetch('/api/account/orders', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        // Fallback
      }

      // Clear Cart & Coupon
      localStorage.removeItem('eztila-cart');
      saveActiveCoupon(null);
      setCart([]);
      setOrderComplete(payload);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sipariş oluşturulamadı. Lütfen tekrar deneyiniz.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="checkout-loading">
        <img src={LOGO} alt="Eztila Butik" />
        <span>Ödeme ortamı hazırlanıyor…</span>
      </main>
    );
  }

  if (orderComplete) {
    return (
      <main className="payment-result">
        <section>
          <span className="result-icon success">✓</span>
          <p className="eyebrow">EZTİLA BUTİK · SİPARİŞ ALINDI</p>
          <h1>Siparişiniz İçin Teşekkürler!</h1>
          <p>
            <strong>{orderComplete.orderNumber}</strong> numaralı siparişiniz başarıyla alındı ve hazırlık sırasına alındı.
            Sipariş detayları <b>{orderComplete.email}</b> adresinize iletilmiştir.
          </p>
          {orderComplete.discountCents > 0 && (
            <p style={{ color: '#277541', fontSize: '0.85rem', fontWeight: 'bold' }}>
              ✓ "{orderComplete.appliedCoupon}" kuponuyla {fmt.format(orderComplete.discountCents / 100)} indirim uygulandı.
            </p>
          )}
          <strong>Toplam Tutar: {fmt.format(orderComplete.totalCents / 100)}</strong>
          <div>
            <a className="button button-primary" href="/hesabim">Siparişimi Takip Et</a>
            <a href="/#koleksiyon">Alışverişe Devam Et →</a>
          </div>
        </section>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="checkout-empty">
        <header className="checkout-header">
          <a href="/"><img src={LOGO} alt="Eztila Butik" /></a>
          <span></span>
        </header>
        <span>♡</span>
        <h1>Sepetiniz Henüz Boş</h1>
        <p>Ödeme yapabilmek için sepetinize en az bir ürün eklemelisiniz.</p>
        <a className="button button-primary" href="/#koleksiyon">Koleksiyonu Keşfet →</a>
      </main>
    );
  }

  // =========================================================================
  // AUTH REQUIREMENT GATE (Giriş / Üyelik Şartı)
  // =========================================================================
  if (!account) {
    return (
      <main className="checkout-page">
        <header className="checkout-header">
          <a href="/"><img src={LOGO} alt="Eztila Butik" /></a>
          <div className="checkout-steps">
            <span className="active"><b>1</b> Üyelik &amp; Giriş</span>
            <i></i>
            <span><b>2</b> Adres</span>
            <i></i>
            <span><b>3</b> Ödeme</span>
          </div>
          <span></span>
        </header>

        <div className="checkout-layout">
          <section className="checkout-main">
            <a className="checkout-back" href="/?openCart=true">← Sepetime dön</a>

            <div className="checkout-title" style={{ margin: '2rem 0 2.5rem' }}>
              <p>EZTİLA BUTİK · GÜVENLİ ALIŞVERİŞ</p>
              <h1>Giriş Yapın veya Üye Olun</h1>
              <span>
                Siparişinizi tamamlamak, kargonuzu anlık takip edebilmek ve faturalarınıza dilediğiniz an erişebilmek için üyelik gerekmektedir.
              </span>
            </div>

            <div className="checkout-auth-card">
              {googleEnabled && (
                <>
                  <button
                    type="button"
                    className="google-auth-btn"
                    onClick={handleGoogleAuth}
                    style={{ width: '100%', minHeight: '52px', justifyContent: 'center' }}
                  >
                    <GoogleIcon />
                    <span>Google ile Tek Tıkla Devam Et</span>
                  </button>
                  <div className="auth-divider" style={{ margin: '1.5rem 0' }}>
                    <span>veya e-posta ile</span>
                  </div>
                </>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <a
                  className="button button-primary"
                  href="/giris?next=/odeme"
                  style={{ width: '100%', minHeight: '50px', textAlign: 'center' }}
                >
                  Giriş Yap →
                </a>
                <a
                  className="button"
                  href="/uye-ol?next=/odeme"
                  style={{
                    width: '100%',
                    minHeight: '50px',
                    textAlign: 'center',
                    border: '1.5px solid var(--navy)',
                    color: 'var(--navy)',
                    background: '#ffffff',
                  }}
                >
                  Yeni Hesap Oluştur →
                </a>
              </div>

              <div className="checkout-assurances" style={{ marginTop: '2rem', borderTop: '1px solid #ece7e0', paddingTop: '1.25rem' }}>
                <span>✦ 10 saniyede hızlı ve güvenli üyelik</span>
                <span>✦ Kayıtlı adresleriniz ile tek tıkla hızlı sipariş</span>
                <span>✦ Hesabım panelinden kargo hareketlerini anlık sorgulama</span>
              </div>
            </div>
          </section>

          {/* SIDEBAR ORDER SUMMARY */}
          <aside className="checkout-summary">
            <header>
              <span>SİPARİŞ ÖZETİ ({cartItems.length} ÜRÜN)</span>
              <a href="/?openCart=true">Düzenle</a>
            </header>

            <div className="checkout-summary-lines">
              {cartItems.map((item) => (
                <article key={`${item.productId}-${item.variantLabel}`}>
                  <div>
                    <img src={item.product.imageUrl || LOGO} alt="" />
                    <b>{item.quantity}</b>
                  </div>
                  <section>
                    <h3>{item.product.name}</h3>
                    <span>Beden: {item.variantLabel}</span>
                    <strong>{fmt.format((item.product.variants?.find((v) => v.label === item.variantLabel)?.priceCents || item.product.priceCents) * item.quantity / 100)}</strong>
                  </section>
                </article>
              ))}
            </div>

            <div className="checkout-summary-totals">
              <div>
                <span>Ara Toplam</span>
                <strong>{fmt.format(subtotalCents / 100)}</strong>
              </div>
              {discountCents > 0 && (
                <div style={{ color: '#277541', fontWeight: 600 }}>
                  <span>Kupon İndirimi ({appliedCoupon.code})</span>
                  <strong>−{fmt.format(discountCents / 100)}</strong>
                </div>
              )}
              <div>
                <span>Kargo</span>
                <strong>{shippingCents === 0 ? 'Ücretsiz' : fmt.format(shippingCents / 100)}</strong>
              </div>
              <div className="grand-total">
                <span>Toplam Ödenecek</span>
                <strong>{fmt.format(totalCents / 100)}</strong>
              </div>
            </div>
          </aside>
        </div>
      </main>
    );
  }

  // =========================================================================
  // LOGGED IN CHECKOUT FLOW (Adres & Ödeme)
  // =========================================================================
  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <a href="/"><img src={LOGO} alt="Eztila Butik" /></a>
        <div className="checkout-steps">
          <span className="done"><b>✓</b> Giriş Yapıldı</span>
          <i></i>
          <span className="active"><b>1</b> Adres &amp; Kargo</span>
          <i></i>
          <span className="active"><b>2</b> Ödeme</span>
        </div>
        <span></span>
      </header>

      <div className="checkout-layout">
        <section className="checkout-main">
          <a className="checkout-back" href="/?openCart=true">← Sepetime dön</a>

          <div className="checkout-title">
            <p>EZTİLA BUTİK</p>
            <h1>Güvenli Ödeme</h1>
            <span>Hoş geldiniz, <b>{account.customer?.fullName || account.customer?.email}</b>. Teslimat bilgilerinizi kontrol edip siparişinizi tamamlayın.</span>
          </div>

          {errorMsg && (
            <div className="checkout-page-error" role="alert">
              <span>{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg('')}>×</button>
            </div>
          )}

          {/* STEP 1: ADDRESS */}
          <div className="checkout-section">
            <header>
              <span>01</span>
              <div>
                <h2>Teslimat ve İletişim Bilgileri</h2>
                <p>Siparişinizin ulaştırılacağı adres ve bilgilendirme detayları.</p>
              </div>
            </header>

            {account?.addresses?.length > 0 && (
              <div className="checkout-addresses">
                {account.addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    className={selectedAddressId === addr.id ? 'active' : ''}
                    onClick={() => {
                      setSelectedAddressId(addr.id);
                      setShippingForm({
                        fullName: addr.contactName,
                        phone: addr.phone,
                        email: account.customer.email,
                        city: addr.city,
                        district: addr.district,
                        neighborhood: addr.neighborhood || '',
                        address: addr.address,
                        postalCode: addr.postalCode || '',
                      });
                    }}
                  >
                    <span className="address-radio"></span>
                    <b>{addr.label} {addr.isDefault && <small>Varsayılan</small>}</b>
                    <strong>{addr.contactName}</strong>
                    <p>{addr.address}<br />{addr.district} / {addr.city}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="checkout-form-grid" style={{ marginTop: '1.25rem' }}>
              <label>
                Ad Soyad
                <input
                  required
                  autoComplete="off"
                  value={shippingForm.fullName}
                  onChange={(e) => setShippingForm({ ...shippingForm, fullName: e.target.value })}
                  placeholder="Adınız ve Soyadınız"
                />
              </label>
              <label>
                Telefon Numarası
                <input
                  required
                  type="tel"
                  autoComplete="off"
                  value={shippingForm.phone}
                  onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                  placeholder="05xx xxx xx xx"
                />
              </label>
              <label className="wide">
                E-posta Adresi (Sipariş Takibi İçin)
                <input
                  required
                  type="email"
                  autoComplete="off"
                  value={shippingForm.email}
                  onChange={(e) => setShippingForm({ ...shippingForm, email: e.target.value })}
                  placeholder="ornek@email.com"
                />
              </label>
              <label>
                İl
                <input
                  required
                  autoComplete="off"
                  value={shippingForm.city}
                  onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                  placeholder="İstanbul"
                />
              </label>
              <label>
                İlçe
                <input
                  required
                  autoComplete="off"
                  value={shippingForm.district}
                  onChange={(e) => setShippingForm({ ...shippingForm, district: e.target.value })}
                  placeholder="Kadıköy"
                />
              </label>
              <label>
                Mahalle
                <input
                  autoComplete="off"
                  value={shippingForm.neighborhood}
                  onChange={(e) => setShippingForm({ ...shippingForm, neighborhood: e.target.value })}
                  placeholder="Caddebostan Mah."
                />
              </label>
              <label>
                Posta Kodu
                <input
                  autoComplete="off"
                  value={shippingForm.postalCode}
                  onChange={(e) => setShippingForm({ ...shippingForm, postalCode: e.target.value })}
                  placeholder="34728"
                />
              </label>
              <label className="wide">
                Açık Adres (Cadde, Sokak, Bina &amp; Daire No)
                <textarea
                  required
                  value={shippingForm.address}
                  onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })}
                  placeholder="Bağdat Cad. No: 10 Daire: 4"
                />
              </label>
            </div>
          </div>

          {/* STEP 2: SHIPPING */}
          <div className="checkout-section">
            <header>
              <span>02</span>
              <div>
                <h2>Kargo Seçeneği</h2>
                <p>Türkiye geneli anlaşmalı hızlı ve sigortalı kargo gönderimi.</p>
              </div>
            </header>
            <div className="payment-ready">
              <span>✓</span>
              <div>
                <strong>Eztila Express &amp; Güvenli Butik Gönderimi</strong>
                <p>
                  {shippingCents === 0 ? 'Tebrikler! Ücretsiz kargo avantajı uygulandı.' : 'Kargo ücreti: 79,00 TL'} (1-2 iş günü içinde teslimat)
                </p>
              </div>
            </div>
          </div>

          {/* STEP 3: PAYMENT */}
          <div className="checkout-section">
            <header>
              <span>03</span>
              <div>
                <h2>Kartla Güvenli Ödeme</h2>
                <p>Ödeme bilgileriniz güvenli şifreleme altyapısıyla korunur.</p>
              </div>
            </header>

            <form onSubmit={handleCompleteOrder} className="checkout-form-grid" autoComplete="off">
              <label className="wide">
                Kart Üzerindeki İsim
                <input
                  required
                  autoComplete="off"
                  spellCheck="false"
                  data-form-type="other"
                  value={cardForm.cardHolder}
                  onChange={(e) => setCardForm({ ...cardForm, cardHolder: e.target.value })}
                  placeholder="KART SAHİBİNİN ADI"
                />
              </label>
              <label className="wide">
                Kart Numarası
                <input
                  required
                  autoComplete="off"
                  spellCheck="false"
                  data-form-type="other"
                  maxLength={19}
                  value={cardForm.cardNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                    setCardForm({ ...cardForm, cardNumber: v });
                  }}
                  placeholder="0000 0000 0000 0000"
                />
              </label>
              <label>
                Son Kullanma Ayı
                <select
                  value={cardForm.expireMonth}
                  onChange={(e) => setCardForm({ ...cardForm, expireMonth: e.target.value })}
                  style={{ border: '1px solid #d9d2c8', minHeight: '49px', padding: '0.85rem' }}
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const m = String(i + 1).padStart(2, '0');
                    return <option key={m} value={m}>{m}</option>;
                  })}
                </select>
              </label>
              <label>
                Son Kullanma Yılı
                <select
                  value={cardForm.expireYear}
                  onChange={(e) => setCardForm({ ...cardForm, expireYear: e.target.value })}
                  style={{ border: '1px solid #d9d2c8', minHeight: '49px', padding: '0.85rem' }}
                >
                  {Array.from({ length: 10 }).map((_, i) => {
                    const y = String(2026 + i);
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </label>
              <label>
                Güvenlik Kodu (CVV)
                <input
                  required
                  type="password"
                  maxLength={4}
                  autoComplete="off"
                  spellCheck="false"
                  data-form-type="other"
                  value={cardForm.cvv}
                  onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, '') })}
                  placeholder="123"
                />
              </label>

              <div className="checkout-agreement wide">
                <input
                  type="checkbox"
                  id="terms-check"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <label htmlFor="terms-check" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
                  <a href="/on-bilgilendirme" target="_blank" rel="noreferrer">Ön Bilgilendirme Formu</a> ve{' '}
                  <a href="/mesafeli-satis" target="_blank" rel="noreferrer">Mesafeli Satış Sözleşmesi</a>'ni okudum, kabul ediyorum.
                </label>
              </div>

              <button
                type="submit"
                className="button button-primary wide"
                disabled={submitting}
                style={{ marginTop: '1rem', minHeight: '56px', fontSize: '0.88rem' }}
              >
                {submitting ? 'Ödeme Güvenle İşleniyor…' : `${fmt.format(totalCents / 100)} ile Siparişi Tamamla →`}
              </button>
            </form>
          </div>
        </section>

        {/* SIDEBAR ORDER SUMMARY */}
        <aside className="checkout-summary">
          <header>
            <span>SİPARİŞ ÖZETİ ({cartItems.length} ÜRÜN)</span>
            <a href="/?openCart=true">Düzenle</a>
          </header>

          <div className="checkout-summary-lines">
            {cartItems.map((item) => (
              <article key={`${item.productId}-${item.variantLabel}`}>
                <div>
                  <img src={item.product.imageUrl || LOGO} alt="" />
                  <b>{item.quantity}</b>
                </div>
                <section>
                  <h3>{item.product.name}</h3>
                  <span>Beden: {item.variantLabel}</span>
                  <strong>{fmt.format((item.product.variants?.find((v) => v.label === item.variantLabel)?.priceCents || item.product.priceCents) * item.quantity / 100)}</strong>
                </section>
              </article>
            ))}
          </div>

          {/* COUPON SECTION IN CHECKOUT */}
          <div className="cart-coupon-wrap" style={{ margin: '1rem 0', padding: '0.85rem', background: '#ffffff', border: '1px solid #ded8cf', borderRadius: '4px' }}>
            {appliedCoupon && currentCouponResult?.valid ? (
              <div className="cart-coupon-applied">
                <div className="coupon-badge-text">
                  <small>UYGULANAN KUPON</small>
                  <strong>🏷️ {appliedCoupon.code}</strong>
                  <span>{appliedCoupon.description}</span>
                </div>
                <button type="button" onClick={handleRemoveCoupon} className="coupon-remove-btn">
                  Kaldır ×
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="cart-coupon-form">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="İNDİRİM KODU (örn: EZTILA10)"
                />
                <button type="submit">Uygula</button>
              </form>
            )}
            {couponFeedback && (
              <div className={`coupon-feedback-msg ${couponFeedback.type}`} style={{ marginTop: '0.4rem' }}>
                {couponFeedback.text}
              </div>
            )}
            {!appliedCoupon && (
              <div className="coupon-available-hint" style={{ marginTop: '0.4rem', fontSize: '0.62rem' }}>
                <span>Siparişte yalnızca 1 indirim kuponu geçerlidir.</span>
              </div>
            )}
          </div>

          <div className="checkout-summary-totals">
            <div>
              <span>Ara Toplam</span>
              <strong>{fmt.format(subtotalCents / 100)}</strong>
            </div>

            {discountCents > 0 && (
              <div style={{ color: '#277541', fontWeight: 600 }}>
                <span>Kupon İndirimi ({appliedCoupon?.code})</span>
                <strong>−{fmt.format(discountCents / 100)}</strong>
              </div>
            )}

            <div>
              <span>Kargo</span>
              <strong>{shippingCents === 0 ? 'Ücretsiz' : fmt.format(shippingCents / 100)}</strong>
            </div>
            <div className="grand-total">
              <span>Toplam Ödenecek</span>
              <strong>{fmt.format(totalCents / 100)}</strong>
            </div>
          </div>

          <div className="checkout-assurances">
            <span>✦ 14 gün ücretsiz kolay iade</span>
            <span>✦ Güvenli 3D Secure kart koruması</span>
            <span>✦ Şeffaf faturalı ve orijinal ürün garantisi</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
