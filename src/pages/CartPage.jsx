import { useState, useEffect, useMemo } from 'react';
import { validateAndApplyCoupon, getSavedCoupon, saveActiveCoupon } from '../lib/coupons';

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
  const [storeConfig, setStoreConfig] = useState(null);
  
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(() => getSavedCoupon());
  const [couponFeedback, setCouponFeedback] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/store-config').then(r => r.json())
    ]).then(([pData, sData]) => {
      setProducts(pData.products || []);
      setStoreConfig(sData.store || null);
    }).catch(() => {
      // ignore
    }).finally(() => {
      try {
        const saved = JSON.parse(localStorage.getItem('eztila-cart') || '[]');
        setCart(saved);
      } catch {
        setCart([]);
      }
      setLoading(false);
    });
  }, []);

  const cartItems = useMemo(() =>
    cart.map((item) => ({ ...item, product: products.find((p) => p.id === item.productId) })).filter((i) => i.product),
  [cart, products]);

  const updateQty = (productId, variantLabel, newQty) => {
    setCart((prev) => {
      let next;
      if (newQty < 1) {
        next = prev.filter((i) => !(i.productId === productId && i.variantLabel === variantLabel));
      } else {
        next = prev.map((i) => i.productId === productId && i.variantLabel === variantLabel ? { ...i, quantity: Math.min(10, newQty) } : i);
      }
      localStorage.setItem('eztila-cart', JSON.stringify(next));
      return next;
    });
  };

  const rawSubtotalCents = cartItems.reduce((sum, item) => {
    const vPrice = item.product?.variants.find((v) => v.label === item.variantLabel)?.priceCents || item.product?.priceCents || 0;
    return sum + (vPrice * item.quantity);
  }, 0);

  const currentCouponResult = useMemo(() => {
    if (!appliedCoupon) return null;
    return validateAndApplyCoupon(appliedCoupon.code, rawSubtotalCents);
  }, [appliedCoupon, rawSubtotalCents]);

  const discountCents = currentCouponResult?.valid ? currentCouponResult.discountCents : 0;
  const isCouponFreeShipping = currentCouponResult?.valid && currentCouponResult.isFreeShipping;

  const freeThreshold = storeConfig?.freeShippingThresholdCents ?? 150000;
  const standardShippingFee = storeConfig?.shippingFeeCents ?? 8900;
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

  return (
    <div className="cartpage-shell">
      <header className="store-header">
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
                    const price = item.product.variants.find((v) => v.label === item.variantLabel)?.priceCents || item.product.priceCents;
                    return (
                      <tr key={idx}>
                        <td className="cp-td-product">
                          <img src={item.product.imageUrl} alt={item.product.name} />
                          <div className="cp-product-info">
                            <small>MOOİ BUTİK</small>
                            <h4>{item.product.name} - {item.variantLabel.toUpperCase()}</h4>
                            <button className="cp-order-note-btn">Sipariş Notu</button>
                          </div>
                        </td>
                        <td className="cp-td-qty">
                          <div className="cp-qty-controls">
                            <button onClick={() => updateQty(item.productId, item.variantLabel, item.quantity - 1)}>-</button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateQty(item.productId, item.variantLabel, item.quantity + 1)}>+</button>
                          </div>
                        </td>
                        <td className="cp-td-price">
                          {fmt.format(price / 100)}
                        </td>
                        <td className="cp-td-total">
                          {fmt.format((price * item.quantity) / 100)}
                        </td>
                        <td className="cp-td-action">
                          <button onClick={() => updateQty(item.productId, item.variantLabel, 0)} aria-label="Sil">
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

          <a href="/odeme" className="cp-checkout-button" onClick={(e) => { if(cartItems.length === 0) e.preventDefault(); }}>SATIN AL</a>
          
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
