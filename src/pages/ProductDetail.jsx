import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { authFetch } from '../lib/auth-fetch';
import { validateAndApplyCoupon, getSavedCoupon, saveActiveCoupon } from '../lib/coupons';
import ProductReviews from '../components/ProductReviews';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';
const WA_LINK = 'https://wa.me/905078195264?text=';
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? '#b83b3b' : 'none'} stroke={filled ? '#b83b3b' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  const parseVariant = (label) => {
    const parts = label.split('/');
    if (parts.length > 1) {
      return { color: parts[0].trim(), size: parts[1].trim() };
    }
    return { color: null, size: parts[0].trim() };
  };

  const colors = useMemo(() => {
    if (!product?.variants) return [];
    const colorSet = new Set();
    product.variants.forEach(v => {
      const { color } = parseVariant(v.label);
      if (color) colorSet.add(color);
    });
    return Array.from(colorSet);
  }, [product]);

  const sizes = useMemo(() => {
    if (!product?.variants) return [];
    const sizeSet = new Set();
    product.variants.forEach(v => {
      const { size } = parseVariant(v.label);
      if (size) sizeSet.add(size);
    });
    return Array.from(sizeSet);
  }, [product]);

  const handleColorChange = (color) => {
    setSelectedColor(color);
    let match = product.variants.find(v => {
      const pv = parseVariant(v.label);
      return pv.color === color && pv.size === selectedSize;
    });
    if (!match || match.stock < 1) {
      const availableForColor = product.variants.find(v => parseVariant(v.label).color === color && v.stock > 0);
      match = availableForColor || product.variants.find(v => parseVariant(v.label).color === color);
      if (match) setSelectedSize(parseVariant(match.label).size);
    }
    if (match) setSelectedVariant(match);
  };

  const handleSizeChange = (size) => {
    setSelectedSize(size);
    const match = product.variants.find(v => {
      const pv = parseVariant(v.label);
      if (colors.length > 0) return pv.color === selectedColor && pv.size === size;
      return pv.size === size;
    });
    if (match) setSelectedVariant(match);
  };
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartReady, setCartReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [msg, setMsg] = useState(false);
  const [account, setAccount] = useState(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(() => getSavedCoupon());
  const [couponFeedback, setCouponFeedback] = useState(null);

  // Notify state
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyContact, setNotifyContact] = useState('');
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);

  // Share state
  const [shareFeedback, setShareFeedback] = useState('');

  // FOMO state
  const [viewers, setViewers] = useState(0);

  useEffect(() => {
    setViewers(Math.floor(Math.random() * (35 - 8 + 1)) + 8);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/products'),
      authFetch('/api/account'),
    ]).then(async ([pRes, aRes]) => {
      const pData = await pRes.json().catch(() => ({ products: [] }));
      const aData = aRes.ok ? await aRes.json().catch(() => null) : null;
      const prods = pData.products || [];
      setAllProducts(prods);
      setAccount(aData);

      const found = prods.find((p) => p.slug === slug);
      if (found) {
        setProduct(found);
        const firstInStock = found.variants?.find((v) => v.stock > 0) || found.variants?.[0] || null;
        setSelectedVariant(firstInStock);
        if (firstInStock) {
          const { color, size } = parseVariant(firstInStock.label);
          setSelectedColor(color || '');
          setSelectedSize(size || '');
        }
        setSelectedImage(found.imageUrl || LOGO);

        try {
          const favs = JSON.parse(localStorage.getItem('eztila-favorites') || '[]');
          setFavorites(favs);
          setIsFavorite(favs.some((f) => f.id === found.id));
        } catch {
          setIsFavorite(false);
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
      setCartReady(true);
    });
  }, [slug]);

  function toggleWishlist() {
    if (!product) return;
    try {
      const favs = JSON.parse(localStorage.getItem('eztila-favorites') || '[]');
      let updated;
      if (isFavorite) {
        updated = favs.filter((f) => f.id !== product.id);
        setIsFavorite(false);
      } else {
        updated = [...favs, product];
        setIsFavorite(true);
      }
      setFavorites(updated);
      localStorage.setItem('eztila-favorites', JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  function handleAddToCart() {
    if (!product) return;
    const variantLabel = selectedVariant?.label || 'Standart';
    try {
      const currentCart = JSON.parse(localStorage.getItem('eztila-cart') || '[]');
      const idx = currentCart.findIndex((i) => i.productId === product.id && i.variantLabel === variantLabel);
      let updatedCart;
      if (idx >= 0) {
        updatedCart = currentCart.map((item, i) => i === idx ? { ...item, quantity: Math.min(10, item.quantity + quantity) } : item);
      } else {
        updatedCart = [...currentCart, { productId: product.id, quantity, variantLabel }];
      }
      setCart(updatedCart);
      localStorage.setItem('eztila-cart', JSON.stringify(updatedCart));
      setCartOpen(true);
    } catch {
      setMsg(false);
    }
  }

  function updateQty(productId, variantLabel, qty) {
    setCart((prev) => {
      const next = qty < 1
        ? prev.filter((i) => !(i.productId === productId && i.variantLabel === variantLabel))
        : prev.map((i) => i.productId === productId && i.variantLabel === variantLabel ? { ...i, quantity: Math.min(10, qty) } : i);
      localStorage.setItem('eztila-cart', JSON.stringify(next));
      return next;
    });
  }

  function handleNotifySubmit(e) {
    e.preventDefault();
    if (!notifyContact.trim()) return;
    setNotifyLoading(true);
    // Simulate API call
    setTimeout(() => {
      setNotifyLoading(false);
      setNotifySuccess(true);
      setTimeout(() => {
        setShowNotifyModal(false);
        setNotifySuccess(false);
        setNotifyContact('');
      }, 3000);
    }, 800);
  }

  const cartItems = useMemo(() =>
    cart.map((item) => ({ ...item, product: allProducts.find((p) => p.id === item.productId) || (item.productId === product?.id ? product : null) })).filter((i) => i.product),
    [cart, allProducts, product]
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const rawSubtotalCents = cartItems.reduce((sum, item) =>
    sum + (item.product?.variants?.find((v) => v.label === item.variantLabel)?.priceCents || item.product?.priceCents || 0) * item.quantity, 0);

  const freeThreshold = 150000;
  const standardShippingFee = 7900;
  const shippingFee = (rawSubtotalCents >= freeThreshold || rawSubtotalCents === 0) ? 0 : standardShippingFee;
  const finalTotalCents = rawSubtotalCents + shippingFee;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const waContactNumber = '905078195264';
  const shareText = product ? `${product.name} - Eztila Butik` : 'Eztila Butik';

  function handleShareFriend() {
    if (navigator.share) {
      navigator.share({
        title: shareText,
        url: currentUrl
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(currentUrl);
      setShareFeedback('Link kopyalandı!');
      setTimeout(() => setShareFeedback(''), 3000);
    }
  }

  function handleShareWA() {
    const text = encodeURIComponent(`${shareText}\n${currentUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function handleContactWA() {
    const text = encodeURIComponent(`Merhaba, "${product?.name}" ürünü hakkında bilgi almak istiyorum.\nLink: ${currentUrl}`);
    window.open(`https://wa.me/${waContactNumber}?text=${text}`, '_blank');
  }

  if (loading) {
    return (
      <main className="detail-shell">
        <header className="store-header">
          <a className="store-logo" href="/"><img src={LOGO} alt="Eztila Butik" /></a>
        </header>
        <div style={{ textAlign: 'center', padding: '6rem 1rem', color: '#10204f' }}>
          <p>Ürün bilgileri yükleniyor…</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="detail-shell">
        <header className="store-header">
          <a className="store-logo" href="/"><img src={LOGO} alt="Eztila Butik" /></a>
        </header>
        <div className="empty-state">
          <h3>Aradığınız ürün bulunamadı.</h3>
          <a className="button button-primary" href="/#koleksiyon">Koleksiyona dön</a>
        </div>
      </main>
    );
  }

  const currentPrice = selectedVariant?.priceCents || product.priceCents;
  const currentStock = selectedVariant?.stock != null ? selectedVariant.stock : product.stock;
  const hasMultipleImages = product.images && product.images.length > 1;
  const waProductLink = `${WA_LINK}${encodeURIComponent(`Merhaba Eztila Butik, "${product.name}" hakkında bilgi ve beden danışmanlığı almak istiyorum.`)}`;

  return (
    <main className="detail-shell">
      <div className="announcement">
        <span>Türkiye geneli gönderim</span>
        <span>Güvenli ödeme altyapısı</span>
        <span>WhatsApp ürün danışmanlığı</span>
      </div>

      <header className="store-header">
        <a className="store-logo" href="/" aria-label="Eztila Butik Ana Sayfa">
          <img src={LOGO} alt="Eztila Butik" />
        </a>
        <nav aria-label="Ana menü">
          <a href="/#koleksiyon">Yeni sezon</a>
          <a href="/#koleksiyon">Elbiseler</a>
          <a href="/#koleksiyon">Takımlar</a>
          <a href="/siparis-takip">Sipariş takip</a>
        </nav>
        <div className="header-tools">
          <a className="icon-button" href="/" aria-label="Ürün ara">
            <SearchIcon />
          </a>
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

      <div className="breadcrumb">
        <a href="/">Ana Sayfa</a>
        <span>/</span>
        <a href="/#koleksiyon">{product.category}</a>
        <span>/</span>
        <b>{product.name}</b>
      </div>

      <section className="product-detail">
        <div className={`detail-gallery ${hasMultipleImages ? 'has-thumbs' : 'single-image'}`}>
          {hasMultipleImages && (
            <div className="detail-thumbs">
              {product.images.map((imgUrl, i) => (
                <button
                  key={i}
                  type="button"
                  className={selectedImage === imgUrl ? 'active' : ''}
                  onClick={() => setSelectedImage(imgUrl)}
                >
                  <img src={imgUrl} alt="" />
                </button>
              ))}
            </div>
          )}
          <div className="detail-main-image">
            <img src={selectedImage || product.imageUrl || LOGO} alt={product.name} />
          </div>
        </div>

        <div className="detail-info">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>

          <div className="detail-price">
            <strong>{fmt.format(currentPrice / 100)}</strong>
            {product.compareAtCents && product.compareAtCents > currentPrice && (
              <del>{fmt.format(product.compareAtCents / 100)}</del>
            )}
          </div>

          <div className="fomo-triggers">
            <div className="fomo-viewers">
              <span className="pulsing-dot"></span>
              Bu ürünü şu an <strong>{viewers} kişi</strong> inceliyor
            </div>
            {currentStock > 0 && currentStock <= 3 && (
              <div className="fomo-low-stock">
                🔥 Son <strong>{currentStock}</strong> ürün kaldı!
              </div>
            )}
          </div>

          {product.description && (
            <div className="detail-description">
              <p>{product.description}</p>
            </div>
          )}

          {product.variants && product.variants.length > 1 && (
            <div className="detail-field">
              {colors.length > 0 && (
                <div className="variant-group">
                  <span className="variant-label">Renk: <strong>{selectedColor}</strong></span>
                  <div className="variant-options colors">
                    {colors.map(color => (
                      <button 
                        key={color} 
                        type="button"
                        className={`color-swatch ${color === selectedColor ? 'active' : ''}`}
                        onClick={() => handleColorChange(color)}
                        title={color}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {sizes.length > 0 && (
                <div className="variant-group">
                  <span className="variant-label">Beden: <strong>{selectedSize}</strong></span>
                  <div className="variant-options sizes">
                    {sizes.map(size => {
                      const variant = product.variants.find(v => {
                        const pv = parseVariant(v.label);
                        if (colors.length > 0) return pv.color === selectedColor && pv.size === size;
                        return pv.size === size;
                      });
                      const isOut = !variant || variant.stock < 1;
                      return (
                        <button 
                          key={size}
                          type="button"
                          className={`size-box ${size === selectedSize ? 'active' : ''} ${isOut ? 'out-of-stock' : ''}`}
                          onClick={() => !isOut && handleSizeChange(size)}
                          disabled={isOut}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="detail-buy">
            <div className="detail-qty">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
              <b>{quantity}</b>
              <button type="button" onClick={() => setQuantity((q) => Math.min(10, q + 1))}>+</button>
            </div>
            <button
              type="button"
              className="button button-primary"
              onClick={currentStock > 0 ? handleAddToCart : () => setShowNotifyModal(true)}
            >
              {currentStock > 0 ? 'Sepete Ekle' : 'Gelince Haber Ver'}
            </button>
            <button
              type="button"
              className={`icon-button fav-detail-btn ${isFavorite ? 'active' : ''}`}
              onClick={toggleWishlist}
              aria-label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            >
              <HeartIcon filled={isFavorite} />
            </button>
          </div>

          <div className="social-share-block">
            <button type="button" className="share-btn wa-consult" onClick={handleContactWA}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              WhatsApp'tan Danış
            </button>
            <button type="button" className="share-btn wa-share" onClick={handleShareWA}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              WhatsApp ile Paylaş
            </button>
            <button type="button" className="share-btn native-share" onClick={handleShareFriend}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
              Arkadaşına Gönder
            </button>
          </div>
          {shareFeedback && <div className="share-feedback">{shareFeedback}</div>}

          <div className="detail-benefits">
            <article>
              <b>✦</b>
              <div>
                <strong>Aynı Gün / Hızlı Kargolama</strong>
                <span>Siparişiniz özenle paketlenerek 1-2 iş günü içinde kargoya verilir.</span>
              </div>
            </article>
            <article>
              <b>✦</b>
              <div>
                <strong>WhatsApp Beden &amp; Stil Danışmanlığı</strong>
                <span>
                  Beden ve kombin konusunda kararsız mısınız?{' '}
                  <a href={waProductLink} target="_blank" rel="noreferrer">
                    Stil danışmanımıza danışın →
                  </a>
                </span>
              </div>
            </article>
            <article>
              <b>✦</b>
              <div>
                <strong>Kolay Değişim ve İade</strong>
                <span>14 gün içinde koşulsuz iade ve değişim güvencesi.</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <ProductReviews product={product} />

      {/* CART DRAWER ON PRODUCT DETAIL */}
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
                  <img src={item.product?.imageUrl || LOGO} alt="" />
                  <div>
                    <h3>{item.product?.name}</h3>
                    <span>{item.variantLabel}</span>
                    <strong>{fmt.format((item.product?.variants?.find((v) => v.label === item.variantLabel)?.priceCents || item.product?.priceCents || 0) / 100)}</strong>
                    <div className="qty">
                      <button type="button" onClick={() => updateQty(item.productId, item.variantLabel, item.quantity - 1)}>−</button>
                      <b>{item.quantity}</b>
                      <button type="button" onClick={() => updateQty(item.productId, item.variantLabel, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                </article>
              )) : (
                <div className="cart-empty">
                  <span>♡</span>
                  <h3>Sepetin henüz boş.</h3>
                  <button type="button" onClick={() => setCartOpen(false)}>Alışverişe dön</button>
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="cart-summary">
                <div className="cart-calc-rows">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                    <span style={{ color: '#666', fontWeight: '500' }}>Ara toplam</span>
                    <strong style={{ color: '#1a2a47' }}>{fmt.format(rawSubtotalCents / 100)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem', paddingBottom: '1.2rem', borderBottom: '1px solid #eee' }}>
                    <span style={{ color: '#666', fontWeight: '500' }}>Kargo</span>
                    <strong style={{ color: '#1a2a47' }}>{shippingFee === 0 ? 'Ücretsiz' : fmt.format(shippingFee / 100)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    <span style={{ color: '#1a2a47' }}>Toplam</span>
                    <strong style={{ color: '#1a2a47' }}>{fmt.format(finalTotalCents / 100)}</strong>
                  </div>
                </div>

                <a style={{ display: 'block', backgroundColor: '#1a2a47', color: '#fff', textAlign: 'center', padding: '1rem', fontWeight: 'bold', textDecoration: 'none', letterSpacing: '0.5px' }} href="/sepetim">
                  SATIN AL →
                </a>
              </div>
            )}
          </aside>
        </div>
      )}

      {showNotifyModal && (
        <div className="notify-modal-backdrop" onClick={() => !notifyLoading && setShowNotifyModal(false)}>
          <div className="notify-modal" onClick={(e) => e.stopPropagation()}>
            <button className="notify-modal-close" onClick={() => setShowNotifyModal(false)}>×</button>
            <div className="notify-modal-header">
              <h3>Gelince Haber Ver</h3>
              <p>"{product?.name}" ({selectedVariant?.label}) stoğa girdiğinde size haber verelim.</p>
            </div>
            {notifySuccess ? (
              <div className="notify-modal-success">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <h4>Talebiniz Alındı</h4>
                <p>Ürün stoğa girdiğinde size en kısa sürede haber vereceğiz.</p>
              </div>
            ) : (
              <form onSubmit={handleNotifySubmit} className="notify-modal-form">
                <label htmlFor="notifyContact">E-posta veya Telefon Numaranız</label>
                <input
                  id="notifyContact"
                  type="text"
                  placeholder="ornek@email.com veya 5XX XXX XX XX"
                  value={notifyContact}
                  onChange={(e) => setNotifyContact(e.target.value)}
                  disabled={notifyLoading}
                  required
                />
                <button type="submit" className="button button-primary" disabled={notifyLoading || !notifyContact.trim()}>
                  {notifyLoading ? 'Kaydediliyor...' : 'Haber Ver'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
