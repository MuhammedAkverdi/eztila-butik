import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { validateAndApplyCoupon, getSavedCoupon, saveActiveCoupon } from '../lib/coupons';
import {
  addVariantToCart,
  getCartReconciliationMessage,
  hydrateCartItems,
  reconcileCartItems,
  setCartItemQuantity,
} from '../lib/cart-catalog';
import {
  findVariant,
  getColorOptions,
  getSizeOptions,
  isProductSoldOut,
  LOW_STOCK_MAX,
} from '../lib/catalog-stock';
import { getNextGalleryIndex, getProductGalleryImages } from '../lib/product-gallery';
import ProductReviews from '../components/ProductReviews';
import MobileNavigation from '../components/MobileNavigation';
import { getAccountOverview } from '../services/account-service';
import { getCatalogProductBySlug, getCatalogProducts, getStoreConfig } from '../services/catalog-service';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';
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
  const [storeConfig, setStoreConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  const colorOptions = useMemo(() => getColorOptions(product), [product]);
  const sizeOptions = useMemo(
    () => getSizeOptions(product, selectedColor || null),
    [product, selectedColor]
  );

  const handleColorChange = (color) => {
    setSelectedColor(color);
    setSelectedSize('');
    setSelectedVariant(null);
    setQuantity(1);
    setStockNotice('');
  };

  const handleSizeChange = (size) => {
    const match = findVariant(product, { color: selectedColor || null, size });
    if (!match || match.stock < 1) return;
    setSelectedSize(size);
    setSelectedVariant(match);
    setQuantity(1);
    setStockNotice('');
  };
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState(() => new Set());
  const touchStartX = useRef(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [stockNotice, setStockNotice] = useState('');
  const [account, setAccount] = useState(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(() => getSavedCoupon());
  const [couponFeedback, setCouponFeedback] = useState(null);

  // Share state
  const [shareFeedback, setShareFeedback] = useState('');
  const galleryImages = useMemo(() => getProductGalleryImages(product, LOGO), [product]);
  const mobileCategories = useMemo(() => {
    const bySlug = new Map();
    allProducts.forEach((item) => {
      if (item.categorySlug && !bySlug.has(item.categorySlug)) {
        bySlug.set(item.categorySlug, { name: item.category, slug: item.categorySlug });
      }
    });
    return [...bySlug.values()];
  }, [allProducts]);

  useEffect(() => {
    Promise.all([
      getCatalogProductBySlug(slug),
      getCatalogProducts(),
      getStoreConfig(),
      getAccountOverview().catch(() => null),
    ]).then(([found, prods, config, aData]) => {
      setAllProducts(prods);
      setStoreConfig(config);
      setAccount(aData);
      setProduct(found);
      setLoadError(false);

      if (found) {
        const onlyVariant = found.variants?.length === 1 ? found.variants[0] : null;
        const initialVariant = onlyVariant?.stock > 0 ? onlyVariant : null;
        setSelectedVariant(initialVariant);
        setSelectedColor(initialVariant?.color || '');
        setSelectedSize(initialVariant?.size || '');
        setSelectedImageIndex(0);
        setFailedImages(new Set());

        try {
          const savedCart = JSON.parse(localStorage.getItem('eztila-cart') || '[]');
          const reconciled = reconcileCartItems(savedCart, prods);
          setCart(reconciled.items);
          if (reconciled.changed) {
            localStorage.setItem('eztila-cart', JSON.stringify(reconciled.items));
          }
          setStockNotice(getCartReconciliationMessage(reconciled.issues));
        } catch {
          setCart([]);
        }

        try {
          const favs = JSON.parse(localStorage.getItem('eztila-favorites') || '[]');
          setFavorites(favs);
          setIsFavorite(favs.some((f) => f.id === found.id));
        } catch {
          setIsFavorite(false);
        }
      }
    }).catch(() => {
      setAllProducts([]);
      setProduct(null);
      setLoadError(true);
    }).finally(() => {
      setLoading(false);
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
    if (!product || !selectedVariant) {
      setStockNotice('Lütfen renk ve beden seçin.');
      return;
    }
    const result = addVariantToCart(cart, product, selectedVariant, quantity);
    setCart(result.items);
    localStorage.setItem('eztila-cart', JSON.stringify(result.items));
    setStockNotice(result.error);
    if (!result.error || result.items !== cart) setCartOpen(true);
  }

  function updateQty(item, qty) {
    const result = setCartItemQuantity(cart, allProducts, item, qty);
    setCart(result.items);
    localStorage.setItem('eztila-cart', JSON.stringify(result.items));
    setStockNotice(result.error);
  }

  const cartItems = useMemo(() => hydrateCartItems(cart, allProducts), [cart, allProducts]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const rawSubtotalCents = cartItems.reduce((sum, item) =>
    sum + (item.isQuantityValid ? item.variant.priceCents * item.quantity : 0), 0);

  const freeThreshold = storeConfig?.freeShippingThresholdCents ?? Number.POSITIVE_INFINITY;
  const standardShippingFee = storeConfig?.shippingFeeCents ?? 0;
  const shippingFee = (rawSubtotalCents >= freeThreshold || rawSubtotalCents === 0) ? 0 : standardShippingFee;
  const finalTotalCents = rawSubtotalCents + shippingFee;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const waContactNumber = storeConfig?.whatsappNumber || '';
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
    if (!waContactNumber) return;
    const text = encodeURIComponent(`Merhaba, "${product?.name}" ürünü hakkında bilgi almak istiyorum.\nLink: ${currentUrl}`);
    window.open(`https://wa.me/${waContactNumber}?text=${text}`, '_blank');
  }

  function moveGallery(direction) {
    setSelectedImageIndex((current) => getNextGalleryIndex(galleryImages, current, direction, failedImages));
  }

  function handleGalleryImageError(imageUrl) {
    const nextFailed = new Set(failedImages);
    nextFailed.add(imageUrl);
    setFailedImages(nextFailed);
    const replacement = galleryImages.findIndex((candidate) => !nextFailed.has(candidate));
    if (replacement >= 0) setSelectedImageIndex(replacement);
  }

  function handleGalleryKeyDown(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveGallery(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveGallery(1);
    }
  }

  if (loading) {
    return (
      <main className="detail-shell">
        <header className="store-header">
          <MobileNavigation />
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
          <MobileNavigation />
          <a className="store-logo" href="/"><img src={LOGO} alt="Eztila Butik" /></a>
        </header>
        <div className="empty-state">
          <h3>{loadError ? 'Ürün bilgileri şu anda yüklenemiyor.' : 'Aradığınız ürün bulunamadı.'}</h3>
          <a className="button button-primary" href="/#koleksiyon">Koleksiyona dön</a>
        </div>
      </main>
    );
  }

  const currentPrice = selectedVariant?.priceCents || product.priceCents;
  const soldOut = isProductSoldOut(product);
  const currentStock = selectedVariant?.stock ?? 0;
  const hasMultipleImages = galleryImages.length > 1;
  const selectedImage = galleryImages[selectedImageIndex] || LOGO;
  const displayedImage = failedImages.has(selectedImage) ? LOGO : selectedImage;
  const waProductLink = waContactNumber
    ? `https://wa.me/${waContactNumber}?text=${encodeURIComponent(`Merhaba Eztila Butik, "${product.name}" hakkında bilgi ve beden danışmanlığı almak istiyorum.`)}`
    : null;

  return (
    <main className="detail-shell">
      <div className="announcement">
        <span>Türkiye geneli gönderim</span>
        <span>Güvenli ödeme altyapısı</span>
        <span>WhatsApp ürün danışmanlığı</span>
      </div>

      <header className="store-header">
        <MobileNavigation
          categories={mobileCategories}
          cartCount={cartCount}
          favoriteCount={favorites.length}
          accountHref={account ? '/hesabim' : '/giris'}
          accountLabel={account ? 'Hesabım' : 'Giriş / Üye Ol'}
          onCartOpen={() => setCartOpen(true)}
          whatsappUrl={waProductLink}
        />
        <a className="store-logo" href="/" aria-label="Eztila Butik Ana Sayfa">
          <img src={LOGO} alt="Eztila Butik" />
        </a>
        <nav aria-label="Ana menü">
          <a href="/#koleksiyon">Yeni sezon</a>
          <a href="/?category=elbise#koleksiyon">Elbiseler</a>
          <a href="/?category=alt-ust-takim#koleksiyon">Takımlar</a>
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
        <a href={`/?category=${encodeURIComponent(product.categorySlug || '')}#koleksiyon`}>{product.category}</a>
        <span>/</span>
        <b>{product.name}</b>
      </div>

      <section className="product-detail">
        <div className={`detail-gallery ${hasMultipleImages ? 'has-thumbs' : 'single-image'}`}>
          {hasMultipleImages && (
            <div className="detail-thumbs" aria-label="Ürün görselleri">
              {galleryImages.map((imgUrl, i) => (
                <button
                  key={imgUrl}
                  type="button"
                  className={`${selectedImageIndex === i ? 'active' : ''} ${failedImages.has(imgUrl) ? 'image-failed' : ''}`}
                  onClick={() => setSelectedImageIndex(i)}
                  disabled={failedImages.has(imgUrl)}
                  aria-label={`${i + 1}. ürün görselini göster`}
                  aria-current={selectedImageIndex === i ? 'true' : undefined}
                >
                  <img
                    src={failedImages.has(imgUrl) ? LOGO : imgUrl}
                    alt=""
                    loading="lazy"
                    width="80"
                    height="110"
                    onError={() => handleGalleryImageError(imgUrl)}
                  />
                </button>
              ))}
            </div>
          )}
          <div
            className="detail-main-image"
            tabIndex={hasMultipleImages ? 0 : undefined}
            onKeyDown={hasMultipleImages ? handleGalleryKeyDown : undefined}
            onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
            onTouchEnd={(event) => {
              if (!hasMultipleImages || touchStartX.current == null) return;
              const distance = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
              if (Math.abs(distance) >= 45) moveGallery(distance > 0 ? -1 : 1);
              touchStartX.current = null;
            }}
            aria-label={hasMultipleImages ? 'Ürün görsel galerisi. Ok tuşlarıyla gezinebilirsiniz.' : undefined}
          >
            <img
              src={displayedImage}
              alt={`${product.name} - görsel ${selectedImageIndex + 1}`}
              loading="eager"
              fetchPriority="high"
              width="900"
              height="1200"
              onError={() => handleGalleryImageError(selectedImage)}
            />
            {hasMultipleImages && (
              <>
                <button type="button" className="gallery-arrow gallery-arrow-prev" onClick={() => moveGallery(-1)} aria-label="Önceki görsel">‹</button>
                <button type="button" className="gallery-arrow gallery-arrow-next" onClick={() => moveGallery(1)} aria-label="Sonraki görsel">›</button>
                <span className="gallery-counter" aria-live="polite">{selectedImageIndex + 1} / {galleryImages.length}</span>
              </>
            )}
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

          {currentStock > 0 && currentStock <= LOW_STOCK_MAX && (
            <div className="fomo-triggers">
              <div className="fomo-low-stock">
                Son <strong>{currentStock}</strong> adet
              </div>
            </div>
          )}

          {soldOut && (
            <p className="product-stock-status sold-out" role="status">
              Bu ürünün tüm seçenekleri şu anda tükenmiştir.
            </p>
          )}

          {product.description && (
            <div className="detail-description">
              <p>{product.description}</p>
            </div>
          )}

          {product.variants && product.variants.length > 1 && (
            <div className="detail-field">
              {colorOptions.length > 0 && (
                <div className="variant-group">
                  <span className="variant-label">Renk: <strong>{selectedColor || 'Seçiniz'}</strong></span>
                  <div className="variant-options colors">
                    {colorOptions.map((option) => (
                      <button 
                        key={option.value}
                        type="button"
                        className={`color-swatch ${option.value === selectedColor ? 'active' : ''} ${!option.isAvailable ? 'out-of-stock' : ''}`}
                        onClick={() => handleColorChange(option.value)}
                        title={option.isAvailable ? option.value : `${option.value} — Tükendi`}
                        disabled={!option.isAvailable}
                      >
                        {option.value}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {colorOptions.length > 0 && !selectedColor && (
                <p className="variant-help">Bedenleri görmek için renk seçin.</p>
              )}
              {sizeOptions.length > 0 && (
                <div className="variant-group">
                  <span className="variant-label">Beden: <strong>{selectedSize || 'Seçiniz'}</strong></span>
                  <div className="variant-options sizes">
                    {sizeOptions.map((option) => (
                        <button 
                          key={option.variant.id}
                          type="button"
                          className={`size-box ${option.value === selectedSize ? 'active' : ''} ${!option.isAvailable ? 'out-of-stock' : ''}`}
                          onClick={() => handleSizeChange(option.value)}
                          disabled={!option.isAvailable}
                          title={option.isAvailable ? `${option.stock} adet stokta` : 'Tükendi'}
                        >
                          {option.value}
                        </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="detail-buy">
            <div className="detail-qty">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={!selectedVariant}>−</button>
              <b>{quantity}</b>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                disabled={!selectedVariant || quantity >= currentStock}
              >+</button>
            </div>
            <button
              type="button"
              className="button button-primary"
              onClick={handleAddToCart}
              disabled={!selectedVariant || currentStock < 1}
            >
              {soldOut ? 'Tükendi' : selectedVariant ? 'Sepete Ekle' : 'Seçenek Seçin'}
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
          {stockNotice && (
            <p className="stock-feedback" role="status">{stockNotice}</p>
          )}
          {soldOut && (
            <p className="stock-notify-note" role="status">
              Stok bildirimi hizmeti henüz aktif değildir.
            </p>
          )}

          <div className="social-share-block">
            <button type="button" className="share-btn wa-consult" onClick={handleContactWA} disabled={!waContactNumber}>
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
                  {waProductLink && (
                    <a href={waProductLink} target="_blank" rel="noreferrer">
                      Stil danışmanımıza danışın →
                    </a>
                  )}
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
                    <strong>{fmt.format(item.variant.priceCents / 100)}</strong>
                    {!item.isAvailable && (
                      <p className="cart-stock-warning">Bu ürün şu anda stokta bulunmuyor.</p>
                    )}
                    <div className="qty">
                      <button type="button" onClick={() => updateQty(item, item.quantity - 1)}>−</button>
                      <b>{item.quantity}</b>
                      <button
                        type="button"
                        onClick={() => updateQty(item, item.quantity + 1)}
                        disabled={!item.isAvailable || item.quantity >= item.stock}
                      >+</button>
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

    </main>
  );
}
