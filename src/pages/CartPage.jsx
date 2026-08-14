import { useState, useEffect, useMemo } from 'react';
import { validateAndApplyCoupon, getSavedCoupon, saveActiveCoupon } from '../lib/coupons';
import {
  getCartReconciliationMessage,
  hasBlockingCartStockIssue,
  hydrateCartItems,
  reconcileCartItems,
  setCartItemQuantity,
} from '../lib/cart-catalog';
import { getCatalogProducts, getStoreConfig } from '../services/catalog-service';
import MobileNavigation from '../components/MobileNavigation';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';
const fmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', verticalAlign: 'middle'}}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', verticalAlign: 'middle'}}>
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  );
}

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [storeConfig, setStoreConfig] = useState(null);
  const [stockNotice, setStockNotice] = useState('');
  
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(() => getSavedCoupon());
  const [couponFeedback, setCouponFeedback] = useState(null);

  useEffect(() => {
    Promise.all([
      getCatalogProducts(),
      getStoreConfig(),
    ]).then(([catalogProducts, config]) => {
      setProducts(catalogProducts);
      setStoreConfig(config);
      setLoadError(false);
      try {
        const saved = JSON.parse(localStorage.getItem('eztila-cart') || '[]');
        const reconciled = reconcileCartItems(saved, catalogProducts);
        setCart(reconciled.items);
        if (reconciled.changed) {
          localStorage.setItem('eztila-cart', JSON.stringify(reconciled.items));
        }
        setStockNotice(getCartReconciliationMessage(reconciled.issues));
      } catch {
        setCart([]);
      }
    }).catch(() => {
      setLoadError(true);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const cartItems = useMemo(() => hydrateCartItems(cart, products), [cart, products]);
  const mobileCategories = useMemo(() => {
    const bySlug = new Map();
    products.forEach((product) => {
      if (product.categorySlug && !bySlug.has(product.categorySlug)) {
        bySlug.set(product.categorySlug, { name: product.category, slug: product.categorySlug });
      }
    });
    return [...bySlug.values()];
  }, [products]);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const whatsappUrl = storeConfig?.whatsappNumber
    ? `https://wa.me/${storeConfig.whatsappNumber}?text=Merhaba%20Eztila%20Butik%2C%20yard%C4%B1m%20almak%20istiyorum.`
    : null;

  const updateQty = (item, newQty) => {
    const result = setCartItemQuantity(cart, products, item, newQty);
    setCart(result.items);
    localStorage.setItem('eztila-cart', JSON.stringify(result.items));
    setStockNotice(result.error);
  };

  const rawSubtotalCents = cartItems.reduce((sum, item) => {
    return sum + (item.isQuantityValid ? item.variant.priceCents * item.quantity : 0);
  }, 0);
  const hasStockIssue = hasBlockingCartStockIssue(cartItems);

  const currentCouponResult = useMemo(() => {
    if (!appliedCoupon) return null;
    return validateAndApplyCoupon(appliedCoupon.code, rawSubtotalCents);
  }, [appliedCoupon, rawSubtotalCents]);

  const discountCents = currentCouponResult?.valid ? currentCouponResult.discountCents : 0;
  const isCouponFreeShipping = currentCouponResult?.valid && currentCouponResult.isFreeShipping;

  const freeThreshold = storeConfig?.freeShippingThresholdCents ?? Number.POSITIVE_INFINITY;
  const standardShippingFee = storeConfig?.shippingFeeCents ?? 0;
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
    setCouponFeedback({ type: 'success', text: `Tebrikler! "${res.code}" kuponu uygulandı.` });
    setCouponInput('');
    setTimeout(() => setCouponOpen(false), 1500);
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    saveActiveCoupon(null);
    setCouponFeedback(null);
  }

  if (loading) return null;

  if (loadError) {
    return (
      <main className="checkout-empty" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <h1>Sepet bilgileri şu anda yüklenemiyor.</h1>
        <p>Lütfen kısa süre sonra tekrar deneyin.</p>
        <a className="button" href="/" style={{ marginTop: '2rem', display: 'inline-block' }}>Ana Sayfaya Dön →</a>
      </main>
    );
  }

  return (
    <div className="cartpage-shell">
      <header className="store-header">
        <MobileNavigation categories={mobileCategories} cartCount={cartCount} whatsappUrl={whatsappUrl} />
        <a className="store-logo" href="/" aria-label="Eztila Butik Ana Sayfa">
          <img src={LOGO} alt="Eztila Butik" />
        </a>
      </header>

      <div className="cartpage-container">
        
        {/* LEFT COLUMN: Cart Items */}
        <div className="cartpage-left">
          <div className="cartpage-header-badge">
            <CartIcon />
            <span>Sepetim</span>
          </div>

          <div className="cartpage-items-wrapper">
            {stockNotice && <p className="cart-stock-notice" role="status">{stockNotice}</p>}
            {cartItems.length > 0 ? (
              <table className="cartpage-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Adet</th>
                    <th>Fiyat</th>
                    <th>Toplam</th>
                    <th>Sil</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item, idx) => {
                    const price = item.variant.priceCents;
                    return (
                      <tr key={idx} className={!item.isAvailable ? 'cart-row-unavailable' : ''}>
                        <td className="cp-td-product">
                          <img src={item.product.imageUrl} alt={item.product.name} />
                          <div className="cp-product-info">
                            <small>MOOİ BUTİK</small>
                            <h4>{item.product.name} - {item.variantLabel.toUpperCase()}</h4>
                            {!item.isAvailable && (
                              <p className="cart-stock-warning">Bu ürün şu anda stokta bulunmuyor.</p>
                            )}
                            {item.isAvailable && item.stock <= 3 && (
                              <p className="cart-low-stock">En fazla {item.stock} adet mevcut.</p>
                            )}
                            <button className="cp-order-note-btn">Sipariş Notu</button>
                          </div>
                        </td>
                        <td className="cp-td-qty">
                          <span className="cp-mobile-label">Adet</span>
                          <div className="cp-qty-controls">
                            <button onClick={() => updateQty(item, item.quantity - 1)} aria-label={`${item.product.name} adedini azalt`}>-</button>
                            <span>{item.quantity}</span>
                            <button
                              onClick={() => updateQty(item, item.quantity + 1)}
                              disabled={!item.isAvailable || item.quantity >= item.stock}
                              aria-label={`${item.product.name} adedini artır`}
                            >+</button>
                          </div>
                        </td>
                        <td className="cp-td-price">
                          <span className="cp-mobile-label">Birim fiyat</span>
                          {fmt.format(price / 100)}
                        </td>
                        <td className="cp-td-total">
                          <span className="cp-mobile-label">Toplam</span>
                          {fmt.format((price * item.quantity) / 100)}
                        </td>
                        <td className="cp-td-action">
                          <button onClick={() => updateQty(item, 0)} aria-label="Sil">
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="cp-empty">
                <h3>Sepetiniz boş.</h3>
                <p>Alışverişe devam etmek için ürünlerimizi inceleyebilirsiniz.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Order Summary */}
        <div className="cartpage-right">
          <a href="/#koleksiyon" className="cp-continue-shopping">Alışverişe Devam Et <span>{'>'}</span></a>
          
          <div className="cp-summary-box">
            <div className="cp-summary-row">
              <span>Sepet Toplamı</span>
              <span>:</span>
              <span>{fmt.format(rawSubtotalCents / 100)}</span>
            </div>
            {discountCents > 0 && (
              <div className="cp-summary-row" style={{ color: '#277541' }}>
                <span>İndirim ({appliedCoupon?.code}) <button onClick={handleRemoveCoupon} style={{fontSize: '0.7rem', textDecoration:'underline', background:'none', border:'none', cursor:'pointer', color:'#277541'}}>(İptal)</button></span>
                <span>:</span>
                <span>-{fmt.format(discountCents / 100)}</span>
              </div>
            )}
            <div className="cp-summary-row">
              <span>Kargo Ücreti</span>
              <span>:</span>
              <span>{shippingFee === 0 ? 'Ücretsiz' : fmt.format(shippingFee / 100)}</span>
            </div>
            <div className="cp-summary-row cp-grand-total">
              <span>Genel Toplam</span>
              <span>:</span>
              <span>{fmt.format(finalTotalCents / 100)}</span>
            </div>
          </div>

          {hasStockIssue && (
            <p className="cart-checkout-warning" role="alert">
              Stokta olmayan ürünleri kaldırmadan ödeme adımına geçemezsiniz.
            </p>
          )}
          <a
            href="/odeme"
            className={`cp-checkout-button ${hasStockIssue ? 'disabled' : ''}`}
            aria-disabled={cartItems.length === 0 || hasStockIssue}
            onClick={(event) => {
              if (cartItems.length === 0 || hasStockIssue) event.preventDefault();
            }}
          >SATIN AL</a>
          
          <button className="cp-coupon-toggle" onClick={() => setCouponOpen(true)}>Kupon Kodu Ekle <span>{'>'}</span></button>
        </div>
      </div>

      {/* COUPON MODAL DRAWER */}
      {couponOpen && (
        <div className="cp-drawer-backdrop" onClick={() => setCouponOpen(false)}>
          <div className="cp-drawer" onClick={(e) => e.stopPropagation()}>
            <header className="cp-drawer-header">
              <button onClick={() => setCouponOpen(false)} aria-label="Kapat">X</button>
            </header>
            <div className="cp-drawer-content">
              <h3>Kupon Kodu</h3>
              <form onSubmit={handleApplyCoupon}>
                <input 
                  type="text" 
                  value={couponInput} 
                  onChange={(e) => setCouponInput(e.target.value)} 
                  placeholder="Kupon Kodunu Giriniz" 
                  autoFocus 
                />
                {couponFeedback && (
                  <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: couponFeedback.type === 'error' ? '#d93025' : '#277541' }}>
                    {couponFeedback.text}
                  </p>
                )}
                <button type="submit" className="cp-drawer-submit">AKTİFLEŞTİR</button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
