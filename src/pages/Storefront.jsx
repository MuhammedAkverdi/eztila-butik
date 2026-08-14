import { useState, useEffect, useMemo } from 'react';
import { authFetch } from '../lib/auth-fetch';
import { validateAndApplyCoupon, getSavedCoupon, saveActiveCoupon } from '../lib/coupons';
import { getSupabaseClient } from '../lib/supabase';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';
const WA_LINK = 'https://wa.me/905078195264?text=Merhaba%20Eztila%20Butik%2C%20yard%C4%B1m%20almak%20istiyorum.';
const HERO_IMG = 'https://cdn.myikas.com/images/d22d5168-9c4e-4d2f-bf44-29933b7f8aad/f5595db0-5fe4-4b29-b14c-3da73997399c/image_1080.webp';
const fmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function HeartIcon({ filled = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#b83b3b' : 'none'} stroke={filled ? '#b83b3b' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.05 7.42C8.84 7.42 8.49 7.5 8.2 7.81C7.9 8.13 7.07 8.91 7.07 10.49C7.07 12.07 8.22 13.59 8.38 13.8C8.54 14.01 10.6 17.18 13.78 18.55C14.54 18.88 15.13 19.08 15.59 19.22C16.35 19.46 17.05 19.43 17.6 19.35C18.21 19.26 19.48 18.58 19.74 17.85C20 17.12 20 16.49 19.92 16.36C19.84 16.23 19.63 16.15 19.32 16C19.01 15.84 17.18 14.94 16.84 14.82C16.5 14.7 16.25 14.64 16 15.01C15.75 15.38 15.04 16.23 14.82 16.48C14.61 16.73 14.39 16.76 14.08 16.61C13.77 16.45 12.78 16.13 11.61 15.08C10.7 14.26 10.08 13.26 9.9 12.95C9.72 12.64 9.88 12.47 10.04 12.31C10.18 12.17 10.35 11.94 10.51 11.75C10.67 11.56 10.72 11.42 10.82 11.22C10.93 11.01 10.87 10.83 10.79 10.67C10.72 10.51 10.1 8.97 9.84 8.37C9.6 7.78 9.34 7.86 9.15 7.85C8.97 7.84 8.76 7.84 8.55 7.84Z"/>
    </svg>
  );
}

export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tümü');
  const [sort, setSort] = useState('featured');
  const [cart, setCart] = useState([]);
  const [cartReady, setCartReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [notice, setNotice] = useState('');
  const [storeConfig, setStoreConfig] = useState(null);
  const [account, setAccount] = useState(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(() => getSavedCoupon());
  const [couponFeedback, setCouponFeedback] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/products'),
      fetch('/api/store-config'),
      authFetch('/api/account'),
    ]).then(async ([pRes, sRes, aRes]) => ({
      products: (await pRes.json()).products || [],
      config: sRes.ok ? await sRes.json() : null,
      account: aRes.ok ? await aRes.json() : null,
    })).then((data) => {
      setProducts(data.products);
      if (data.config?.store) setStoreConfig(data.config.store);
      if (data.account) setAccount(data.account);
    }).catch(() => setNotice('Ürünler şu anda yüklenemedi. Lütfen kısa süre sonra tekrar deneyin.'))
      .finally(() => setLoading(false));

    getSupabaseClient().then(async (sb) => {
      const { data } = await sb.auth.getUser();
      if (data?.user) {
        setAccount((prev) => prev || { email: data.user.email, fullName: data.user.user_metadata?.full_name || 'Hesabım' });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try { setCart(JSON.parse(localStorage.getItem('eztila-cart') || '[]')); } catch { setCart([]); }
      try { setFavorites(JSON.parse(localStorage.getItem('eztila-favorites') || '[]')); } catch { setFavorites([]); }
      setCartReady(true);
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('openCart') === 'true') {
      setCartOpen(true);
    }

    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (cartReady) localStorage.setItem('eztila-cart', JSON.stringify(cart));
  }, [cart, cartReady]);

  function toggleFavorite(product) {
    setFavorites((prev) => {
      const isFav = prev.some((p) => p.id === product.id);
      let next;
      if (isFav) {
        next = prev.filter((p) => p.id !== product.id);
      } else {
        next = [...prev, product];
      }
      localStorage.setItem('eztila-favorites', JSON.stringify(next));
      return next;
    });
  }

  const categories = useMemo(() => ['Tümü', ...Array.from(new Set(products.map((p) => p.category))).sort()], [products]);

  const filtered = useMemo(() => {
    const q = search.toLocaleLowerCase('tr-TR').trim();
    const result = products.filter((p) =>
      (category === 'Tümü' || p.category === category) &&
      (!q || `${p.name} ${p.category}`.toLocaleLowerCase('tr-TR').includes(q))
    );
    if (sort === 'low') result.sort((a, b) => a.priceCents - b.priceCents);
    if (sort === 'high') result.sort((a, b) => b.priceCents - a.priceCents);
    if (sort === 'new') result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return result;
  }, [products, category, search, sort]);

  const cartItems = useMemo(() =>
    cart.map((item) => ({ ...item, product: products.find((p) => p.id === item.productId) })).filter((i) => i.product),
    [cart, products]
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const rawSubtotalCents = cartItems.reduce((sum, item) =>
    sum + (item.product?.variants.find((v) => v.label === item.variantLabel)?.priceCents || item.product?.priceCents || 0) * item.quantity, 0);

  // Recalculate applied coupon against current subtotal
  const currentCouponResult = useMemo(() => {
    if (!appliedCoupon) return null;
    return validateAndApplyCoupon(appliedCoupon.code, rawSubtotalCents);
  }, [appliedCoupon, rawSubtotalCents]);

  const discountCents = currentCouponResult?.valid ? currentCouponResult.discountCents : 0;
  const isCouponFreeShipping = currentCouponResult?.valid && currentCouponResult.isFreeShipping;

  const freeThreshold = storeConfig?.freeShippingThresholdCents ?? 150000;
  const standardShippingFee = storeConfig?.shippingFeeCents ?? 7900;
  const shippingFee = (rawSubtotalCents >= freeThreshold || rawSubtotalCents === 0 || isCouponFreeShipping) ? 0 : standardShippingFee;
  const finalTotalCents = Math.max(0, rawSubtotalCents - discountCents) + shippingFee;

  function handleApplyCoupon(e) {
    e?.preventDefault();
    setCouponFeedback(null);
    const res = validateAndApplyCoupon(couponInput, rawSubtotalCents);
    if (!res.valid) {
      setCouponFeedback({ type: 'error', text: res.message });
      return;
    }
    setAppliedCoupon(res);
    saveActiveCoupon(res);
    setCouponFeedback({ type: 'success', text: `Tebrikler! "${res.code}" kuponu başarıyla uygulandı.` });
    setCouponInput('');
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    saveActiveCoupon(null);
    setCouponFeedback({ type: 'info', text: 'Kupon kaldırıldı.' });
  }

  function addToCart(product) {
    const variantId = selectedVariants[product.id];
    const variantLabel = product.variants.find((v) => v.id === variantId)?.label || product.variants.find((v) => v.stock > 0)?.label || 'Standart';
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id && i.variantLabel === variantLabel);
      if (idx >= 0) return prev.map((item, i) => i === idx ? { ...item, quantity: Math.min(10, item.quantity + 1) } : item);
      return [...prev, { productId: product.id, quantity: 1, variantLabel }];
    });
    setCartOpen(true);
  }

  function updateQty(productId, variantLabel, qty) {
    setCart((prev) => qty < 1
      ? prev.filter((i) => !(i.productId === productId && i.variantLabel === variantLabel))
      : prev.map((i) => i.productId === productId && i.variantLabel === variantLabel ? { ...i, quantity: Math.min(10, qty) } : i)
    );
  }

  return (
    <main className="shop-shell">
      <div className="announcement">
        <span>Türkiye geneli gönderim</span>
        <span>Güvenli ödeme altyapısı</span>
        <span>WhatsApp ürün danışmanlığı</span>
      </div>

      <header className="store-header">
        <a className="store-logo" href="#top" aria-label="Eztila Butik Ana Sayfa">
          <img src={LOGO} alt="Eztila Butik" />
        </a>
        <nav aria-label="Ana menü">
          <a href="#koleksiyon">Yeni sezon</a>
          <a href="#koleksiyon">Elbiseler</a>
          <a href="#koleksiyon">Takımlar</a>
          <a href="/siparis-takip">Sipariş takip</a>
        </nav>
        <div className="header-tools">
          <button className="icon-button" onClick={() => document.querySelector('#search')?.focus()} aria-label="Ürün ara">
            <SearchIcon />
          </button>
          <a className="icon-button fav-header-btn" href="/hesabim" aria-label={`Favorilerim (${favorites.length})`}>
            <HeartIcon filled={favorites.length > 0} />
            {favorites.length > 0 && <span className="header-badge">{favorites.length}</span>}
          </a>
          <a className="account-link" href={account ? '/hesabim' : '/giris'} aria-label={account ? 'Hesabım' : 'Giriş yap veya üye ol'}>
            <span className="account-link-icon" aria-hidden="true"><UserIcon /></span>
            <span className="account-link-text">{account ? 'Hesabım' : 'Giriş / Üye ol'}</span>
          </a>
          <button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`Sepetim, ${cartCount} ürün`}>
            <span className="cart-btn-icon"><BagIcon /></span>
            <span className="cart-btn-label">Sepet</span>
            <b>{cartCount}</b>
          </button>
        </div>
      </header>

      <section className="commerce-hero" id="top">
        <div className="hero-content">
          <p className="eyebrow">EZTİLA · YENİ KOLEKSİYON</p>
          <h1>Tarzını<br />kendin yaz.</h1>
          <p>Günün her anına eşlik eden modern, feminen ve özenle seçilmiş parçalar.</p>
          <a className="button button-primary" href="#koleksiyon">Koleksiyonu keşfet <span>→</span></a>
          <div className="hero-proof">
            <span>41+ seçili ürün</span>
            <span>Güncel fiyat &amp; stok</span>
            <span>Kolay iade</span>
          </div>
        </div>
        <div className="hero-image">
          <img src={products.find((p) => p.featured)?.imageUrl || HERO_IMG} alt="Eztila yeni sezon kadın giyim" />
          <div className="hero-badge">
            <small>Yeni sezon</small>
            <strong>Şimdi yayında</strong>
          </div>
        </div>
      </section>

      <section className="catalog-section" id="koleksiyon">
        <div className="catalog-title">
          <div>
            <p className="eyebrow">ONLINE MAĞAZA</p>
            <h2>Tüm koleksiyon</h2>
          </div>
          <p>{products.length || 41} ürün · Özel seçilmiş butik parçalar</p>
        </div>
        <div className="catalog-toolbar">
          <label className="search-box">
            <span><SearchIcon /></span>
            <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün ara..." />
          </label>
          <div className="category-pills">
            {categories.slice(0, 8).map((cat) => (
              <button key={cat} className={cat === category ? 'active' : ''} onClick={() => setCategory(cat)}>{cat}</button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sıralama">
            <option value="featured">Önerilen</option>
            <option value="new">En yeni</option>
            <option value="low">Fiyat: düşükten</option>
            <option value="high">Fiyat: yüksekten</option>
          </select>
        </div>

        {notice && <div className="store-notice" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}

        {loading ? (
          <div className="loading-grid">{Array.from({ length: 8 }).map((_, i) => <span key={i} />)}</div>
        ) : (
          <div className="commerce-grid">
            {filtered.map((product, idx) => {
              const isFavorite = favorites.some((f) => f.id === product.id);
              return (
                <article key={product.id} className="commerce-card">
                  <div className="card-media">
                    {(() => {
                      const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || product.stock;
                      if (totalStock > 0 && totalStock <= 5) {
                        return <span className="fomo-low-stock-badge">🔥 Son {totalStock} Ürün</span>;
                      }
                      if (product.compareAtCents && product.compareAtCents > product.priceCents) {
                        return <span className="sale-badge">İNDİRİM</span>;
                      }
                      if (idx < 4) {
                        return <span className="new-badge">YENİ</span>;
                      }
                      return null;
                    })()}
                    
                    <button
                      type="button"
                      className={`card-fav-btn ${isFavorite ? 'active' : ''}`}
                      onClick={() => toggleFavorite(product)}
                      aria-label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                    >
                      <HeartIcon filled={isFavorite} />
                    </button>

                    <a href={`/urun/${product.slug}`}>
                      <img src={product.imageUrl || LOGO} alt={product.name} loading={idx < 4 ? 'eager' : 'lazy'} />
                    </a>
                    <button onClick={() => addToCart(product)} disabled={product.stock < 1}>
                      {product.stock > 0 ? 'Sepete ekle' : 'Tükendi'}
                    </button>
                  </div>
                  <div className="card-info">
                    <span>{product.category}</span>
                    <h3><a href={`/urun/${product.slug}`}>{product.name}</a></h3>
                    <div className="price-row">
                      <strong>{fmt.format(product.priceCents / 100)}</strong>
                      {product.compareAtCents && product.compareAtCents > product.priceCents && <del>{fmt.format(product.compareAtCents / 100)}</del>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <h3>Aramana uygun ürün bulunamadı.</h3>
            <button onClick={() => { setSearch(''); setCategory('Tümü'); }}>Filtreleri temizle</button>
          </div>
        )}
      </section>

      <section className="story-section" id="hakkimizda">
        <div>
          <p className="eyebrow">EZTİLA DÜNYASI</p>
          <h2>Her güne biraz<br />daha fazla sen.</h2>
          <p>Koleksiyonlarımızı özgüvenli, rahat ve zamansız bir stil için seçiyoruz. Beden ve kombin konusunda WhatsApp üzerinden yanındayız.</p>
          <a href={WA_LINK} target="_blank" rel="noreferrer">Stil danışmanına yaz →</a>
        </div>
        <div className="story-cards">
          <article><b>01</b><strong>Özenli seçim</strong><span>Trendleri Eztila çizgisiyle buluşturan koleksiyon.</span></article>
          <article><b>02</b><strong>Hızlı destek</strong><span>Ürün, beden ve kombin sorularına WhatsApp'tan yanıt.</span></article>
          <article><b>03</b><strong>Güvenli alışveriş</strong><span>Fiyatı, stoku ve sipariş durumunu şeffaf gör.</span></article>
        </div>
      </section>

      <footer className="store-footer">
        <div><img src={LOGO} alt="Eztila Butik" /><p>Zarafetin ve şıklığın adresi.</p></div>
        <div>
          <strong>Keşfet</strong>
          <a href="#koleksiyon">Tüm ürünler</a>
          <a href="https://www.instagram.com/eztilabutik/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://www.trendyol.com/magaza/eztila-m-977827" target="_blank" rel="noreferrer">Trendyol</a>
        </div>
        <div>
          <strong>Destek</strong>
          <a href="/hesabim">Müşteri hesabım</a>
          <a href="/siparis-takip">Sipariş takip</a>
          <a href={WA_LINK} target="_blank" rel="noreferrer">WhatsApp</a>
          <a href="tel:+905078195264">+90 507 819 52 64</a>
          <a href="mailto:eztilabutik@gmail.com">eztilabutik@gmail.com</a>
        </div>
        <div>
          <strong>Yasal</strong>
          <a href="/kvkk-aydinlatma">KVKK Aydınlatma</a>
          <a href="/uyelik-sozlesmesi">Üyelik Sözleşmesi</a>
          <a href="/on-bilgilendirme">Ön Bilgilendirme</a>
          <a href="/mesafeli-satis">Mesafeli Satış</a>
          <a href="/ticari-ileti">Ticari İleti İzni</a>
          <span>© 2026 Eztila Butik · <a href="/admin">Yönetim</a></span>
        </div>
      </footer>

      {/* CART DRAWER */}
      {cartOpen && (
        <div className="overlay" onMouseDown={() => setCartOpen(false)}>
          <aside className="cart-drawer" onMouseDown={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <small>EZTİLA</small>
                <h2>Sepetim ({cartCount})</h2>
              </div>
              <button type="button" onClick={() => setCartOpen(false)}>×</button>
            </div>
            <div className="cart-lines">
              {cartItems.length ? cartItems.map((item) => (
                <article key={`${item.productId}-${item.variantLabel}`}>
                  <img src={item.product.imageUrl || LOGO} alt="" />
                  <div>
                    <h3>{item.product.name}</h3>
                    <span>{item.variantLabel}</span>
                    <strong>{fmt.format((item.product.variants.find((v) => v.label === item.variantLabel)?.priceCents || item.product.priceCents) / 100)}</strong>
                    <div className="qty">
                      <button onClick={() => updateQty(item.productId, item.variantLabel, item.quantity - 1)}>−</button>
                      <b>{item.quantity}</b>
                      <button onClick={() => updateQty(item.productId, item.variantLabel, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                </article>
              )) : (
                <div className="cart-empty">
                  <span>♡</span>
                  <h3>Sepetin henüz boş.</h3>
                  <button onClick={() => setCartOpen(false)}>Alışverişe dön</button>
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="cart-summary">
                {/* PROMO COUPON SECTION */}
                <div className="cart-coupon-wrap">
                  {appliedCoupon && currentCouponResult?.valid ? (
                    <div className="cart-coupon-applied">
                      <div className="coupon-badge-text">
                        <small>UYGULANAN KUPON</small>
                        <strong>🏷️ {appliedCoupon.code}</strong>
                        <span>{appliedCoupon.description}</span>
                      </div>
                      <button type="button" onClick={handleRemoveCoupon} className="coupon-remove-btn" title="Kuponu Kaldır">
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
                    <div className={`coupon-feedback-msg ${couponFeedback.type}`}>
                      {couponFeedback.text}
                    </div>
                  )}

                  {!appliedCoupon && (
                    <div className="coupon-available-hint">
                      <span>Kullanılabilir kodlar: <b>EZTILA10</b> (%10), <b>HOSGELDIN</b> (100 TL) · <i>(Siparişte 1 kupon geçerlidir)</i></span>
                    </div>
                  )}
                </div>

                <div className="cart-calc-rows">
                  <div>
                    <span>Ara toplam</span>
                    <strong>{fmt.format(rawSubtotalCents / 100)}</strong>
                  </div>

                  {discountCents > 0 && (
                    <div className="discount-row">
                      <span>Kupon İndirimi ({appliedCoupon.code})</span>
                      <strong>−{fmt.format(discountCents / 100)}</strong>
                    </div>
                  )}

                  <div>
                    <span>Kargo</span>
                    <strong>{shippingFee === 0 ? 'Ücretsiz' : fmt.format(shippingFee / 100)}</strong>
                  </div>

                  <div className="cart-grand-total">
                    <span>Toplam</span>
                    <strong>{fmt.format(finalTotalCents / 100)}</strong>
                  </div>
                </div>

                <button className="button button-primary" style={{ marginTop: '1.5rem' }} onClick={() => window.location.assign('/odeme')}>
                  Güvenli ödemeye geç →
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      <a className="floating-whatsapp" href={WA_LINK} target="_blank" rel="noreferrer" aria-label="WhatsApp Destek Hattı">
        <WhatsAppIcon />
        <span>WhatsApp</span>
        <strong>Ürün danış</strong>
      </a>
    </main>
  );
}
