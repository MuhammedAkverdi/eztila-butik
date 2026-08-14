import { useState, useEffect, useMemo } from 'react';
import { validateAndApplyCoupon, getSavedCoupon, saveActiveCoupon } from '../lib/coupons';
import {
  getCartReconciliationMessage,
  hasBlockingCartStockIssue,
  hydrateCartItems,
  reconcileCartItems,
} from '../lib/cart-catalog';
import { getAccountOverview } from '../services/account-service';
import { getCatalogProducts, getStoreConfig } from '../services/catalog-service';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';
const fmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });

export default function CheckoutPage() {
  const [account, setAccount] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeConfig, setStoreConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [stockNotice, setStockNotice] = useState('');
  
  // Steps
  const [step, setStep] = useState(1); // 1 = Address, 2 = Payment

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(() => getSavedCoupon());
  const [couponFeedback, setCouponFeedback] = useState(null);

  // Address form
  const [shippingForm, setShippingForm] = useState({
    invoiceType: 'Bireysel Adres',
    fullName: '',
    phone: '',
    email: '',
    city: '',
    district: '',
    neighborhood: '',
    address: '',
    differentInvoiceAddress: false
  });

  useEffect(() => {
    Promise.all([
      getCatalogProducts(),
      getStoreConfig(),
      getAccountOverview().catch(() => null),
    ]).then(([catalogProducts, config, aData]) => {
      setProducts(catalogProducts);
      setStoreConfig(config);
      setLoadError(false);
      try {
        const savedCart = JSON.parse(localStorage.getItem('eztila-cart') || '[]');
        const reconciled = reconcileCartItems(savedCart, catalogProducts);
        setCart(reconciled.items);
        if (reconciled.changed) {
          localStorage.setItem('eztila-cart', JSON.stringify(reconciled.items));
        }
        setStockNotice(getCartReconciliationMessage(reconciled.issues));
      } catch {
        setCart([]);
      }
      if (aData) {
        setAccount(aData);
        if (aData.addresses?.length > 0) {
          const defaultAddr = aData.addresses.find((a) => a.isDefault) || aData.addresses[0];
          setShippingForm(prev => ({
            ...prev,
            fullName: defaultAddr.contactName || aData.customer.fullName || '',
            phone: defaultAddr.phone || aData.customer.phone || '',
            email: aData.customer.email || '',
            city: defaultAddr.city || '',
            district: defaultAddr.district || '',
            neighborhood: defaultAddr.neighborhood || '',
            address: defaultAddr.address || '',
          }));
        } else {
          setShippingForm(prev => ({
            ...prev,
            fullName: aData.customer.fullName || '',
            phone: aData.customer.phone || '',
            email: aData.customer.email || '',
          }));
        }
      }
    }).catch(() => {
      setLoadError(true);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const cartItems = useMemo(() => hydrateCartItems(cart, products), [cart, products]);

  const subtotalCents = cartItems.reduce((sum, item) => {
    return sum + (item.isQuantityValid ? item.variant.priceCents * item.quantity : 0);
  }, 0);
  const hasStockIssue = hasBlockingCartStockIssue(cartItems);

  const currentCouponResult = useMemo(() => {
    if (!appliedCoupon) return null;
    return validateAndApplyCoupon(appliedCoupon.code, subtotalCents);
  }, [appliedCoupon, subtotalCents]);

  const discountCents = currentCouponResult?.valid ? currentCouponResult.discountCents : 0;
  const isCouponFreeShipping = currentCouponResult?.valid && currentCouponResult.isFreeShipping;
  const freeThreshold = storeConfig?.freeShippingThresholdCents ?? Number.POSITIVE_INFINITY;
  const standardShippingFee = storeConfig?.shippingFeeCents ?? 0;
  const shippingCents = (subtotalCents >= freeThreshold || subtotalCents === 0 || isCouponFreeShipping) ? 0 : standardShippingFee;
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
    setCouponFeedback({ type: 'success', text: `"${res.code}" uygulandı.` });
    setCouponInput('');
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    saveActiveCoupon(null);
    setCouponFeedback(null);
  }

  if (loading) {
    return <main className="checkout-loading"><span>Yükleniyor...</span></main>;
  }

  if (loadError) {
    return (
      <main className="checkout-empty" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <h1>Sepet ve mağaza bilgileri şu anda yüklenemiyor.</h1>
        <p>Lütfen kısa süre sonra tekrar deneyin.</p>
        <a className="button" href="/" style={{ marginTop: '2rem', display: 'inline-block' }}>Ana Sayfaya Dön →</a>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="checkout-empty" style={{textAlign: 'center', padding: '5rem 1rem'}}>
        <h1>Sepetiniz Henüz Boş</h1>
        <a className="button" href="/#koleksiyon" style={{marginTop: '2rem', display: 'inline-block'}}>Koleksiyonu Keşfet →</a>
      </main>
    );
  }

  return (
    <div className="co-shell">
      <header className="co-header">
        <a href="/" className="co-logo"><img src={LOGO} alt="Eztila Butik" /></a>
        <div className="co-stepper-top">
          <div className={`co-step ${step >= 1 ? 'active' : ''}`} onClick={() => setStep(1)}>
            <div className="co-step-num">1</div>
            <span>Adres & Kargo</span>
          </div>
          <div className="co-step-divider"></div>
          <div className={`co-step ${step >= 2 ? 'active' : ''}`} onClick={() => {
            if (!hasStockIssue && shippingForm.fullName && shippingForm.address) setStep(2);
          }}>
            <div className="co-step-num">2</div>
            <span>Ödeme</span>
          </div>
        </div>
      </header>

      <div className="co-container">
        
        {/* LEFT COLUMN: Checkout Form */}
        <div className="co-left">
          
          {step === 1 && (
            <div className="co-step-box">
              <div className="co-payment-notice" role="status">
                <strong>Online ödeme şu anda kapalıdır.</strong>
                <span>Bu sayfa sipariş oluşturmaz ve kart bilgisi istemez.</span>
              </div>

              {(stockNotice || hasStockIssue) && (
                <div className="co-stock-warning" role="alert">
                  <strong>Sepet stok kontrolü gerekli.</strong>
                  <span>{stockNotice || 'Stokta olmayan ürünü sepetinizden kaldırın.'}</span>
                  <a href="/sepetim">Sepeti düzenle →</a>
                </div>
              )}

              {!account && (
                <div className="co-login-prompt">
                  Zaten hesabınız var mı? <a href="/giris?next=/odeme">Giriş Yap</a>
                </div>
              )}
              
              <div className="co-tabs">
                <div className="co-tab active">
                  <span className="co-tab-num">1</span> Adres Bilgileri
                </div>
                <div className="co-tab inactive">
                  <span className="co-tab-num">2</span> Ödeme Durumu
                </div>
              </div>

              <div className="co-address-wrapper">
                <div className="co-address-head">
                  <span>📍 Teslimat Bilgileri</span>
                </div>
                
                <form className="co-address-form" onSubmit={(e) => {
                  e.preventDefault();
                  if (!hasStockIssue) setStep(2);
                }}>
                  <div className="co-form-grid">
                    <label>
                      <span className="co-label">Fatura Türü</span>
                      <select value={shippingForm.invoiceType} onChange={e => setShippingForm({...shippingForm, invoiceType: e.target.value})}>
                        <option>Bireysel Adres</option>
                        <option>Kurumsal Adres</option>
                      </select>
                    </label>
                    <label>
                      <span className="co-label">E-Mail Adresiniz *</span>
                      <input type="email" required value={shippingForm.email} onChange={e => setShippingForm({...shippingForm, email: e.target.value})} />
                    </label>
                    <label>
                      <span className="co-label">Ad Soyad *</span>
                      <input type="text" required value={shippingForm.fullName} onChange={e => setShippingForm({...shippingForm, fullName: e.target.value})} />
                    </label>
                    <label>
                      <span className="co-label">İl Seçiniz *</span>
                      <select required value={shippingForm.city} onChange={e => setShippingForm({...shippingForm, city: e.target.value})}>
                        <option value="">İl Seçiniz</option>
                        <option value="İstanbul">İstanbul</option>
                        <option value="Ankara">Ankara</option>
                        <option value="İzmir">İzmir</option>
                        <option value="Diğer">Diğer</option>
                      </select>
                    </label>
                    <label>
                      <span className="co-label">İlçe</span>
                      <input type="text" value={shippingForm.district} onChange={e => setShippingForm({...shippingForm, district: e.target.value})} />
                    </label>
                    <label>
                      <span className="co-label">Semt</span>
                      <input type="text" value={shippingForm.neighborhood} onChange={e => setShippingForm({...shippingForm, neighborhood: e.target.value})} />
                    </label>
                    <label className="co-full-width">
                      <span className="co-label">Adres *</span>
                      <textarea required rows="3" value={shippingForm.address} onChange={e => setShippingForm({...shippingForm, address: e.target.value})}></textarea>
                    </label>
                    <label>
                      <span className="co-label">Cep Telefonu *</span>
                      <input type="tel" required value={shippingForm.phone} onChange={e => setShippingForm({...shippingForm, phone: e.target.value})} />
                    </label>
                  </div>
                  
                  <label className="co-checkbox-row">
                    <input type="checkbox" checked={shippingForm.differentInvoiceAddress} onChange={e => setShippingForm({...shippingForm, differentInvoiceAddress: e.target.checked})} />
                    <span>Faturamın farklı bir adrese düzenlenmesini istiyorum</span>
                  </label>
                  
                  <button type="submit" className="co-submit-btn" disabled={hasStockIssue}>DEVAM ET</button>
                </form>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="co-step-box">
              <div className="co-payment-head">
                <h2>Online Ödeme Yakında</h2>
                <p>Ödeme altyapımızı güvenli şekilde hazırlıyoruz.</p>
              </div>

              <div className="co-payment-form co-payment-unavailable" role="status">
                <span aria-hidden="true">◇</span>
                <h3>Online ödeme sistemi yakında aktif olacaktır.</h3>
                <p>
                  Şu anda kart bilgisi almıyor ve sipariş oluşturmuyoruz.
                  Sepetiniz bu cihazda korunmaya devam edecektir.
                </p>
                <a href="/sepetim" className="co-submit-btn">SEPETE DÖN</a>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Order Summary */}
        <div className="co-right">
          <div className="co-summary-box">
            <header className="co-summary-head">
              <h3>Sipariş Özet ({cartItems.length} ürün)</h3>
              <a href="/sepetim">Düzenle</a>
            </header>
            
            <div className="co-summary-items">
              {cartItems.map((item, idx) => (
                <div className={`co-summary-item ${!item.isAvailable ? 'unavailable' : ''}`} key={idx}>
                  <div className="co-summary-img-wrap">
                    <img src={item.product.imageUrl} alt={item.product.name} />
                    <span className="co-summary-qty-badge">{item.quantity}</span>
                  </div>
                  <div className="co-summary-item-info">
                    <h4>{item.product.name}</h4>
                    <small>Beden: {item.variantLabel.toUpperCase()}</small>
                    {!item.isAvailable && <small className="co-item-stock-error">Stokta yok</small>}
                    <strong>{item.isQuantityValid
                      ? fmt.format((item.variant.priceCents * item.quantity) / 100)
                      : 'Toplama dahil değil'}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="co-summary-coupon">
              {appliedCoupon && currentCouponResult?.valid ? (
                <div className="co-coupon-applied">
                  <div>
                    <small>UYGULANAN KUPON</small>
                    <strong>{appliedCoupon.code}</strong>
                  </div>
                  <button onClick={handleRemoveCoupon}>Kaldır</button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon}>
                  <input type="text" placeholder="İNDİRİM KODU (örn: EZTILA10)" value={couponInput} onChange={e => setCouponInput(e.target.value)} />
                  <button type="submit">Uygula</button>
                </form>
              )}
              {couponFeedback && <p className="co-coupon-msg" style={{color: couponFeedback.type === 'error' ? 'red' : 'green'}}>{couponFeedback.text}</p>}
            </div>

            <div className="co-summary-totals">
              <div className="co-totals-row">
                <span>Ara Toplam</span>
                <span>{fmt.format(subtotalCents / 100)}</span>
              </div>
              {discountCents > 0 && (
                <div className="co-totals-row discount">
                  <span>İndirim</span>
                  <span>-{fmt.format(discountCents / 100)}</span>
                </div>
              )}
              <div className="co-totals-row">
                <span>Kargo</span>
                <span>{shippingCents === 0 ? 'Ücretsiz' : fmt.format(shippingCents / 100)}</span>
              </div>
              <div className="co-totals-row grand">
                <span>TAHMİNİ TOPLAM</span>
                <span>{fmt.format(totalCents / 100)}</span>
              </div>
            </div>

            <div className="co-summary-perks">
              <p>+ 14 gün ücretsiz kolay iade</p>
              <p>+ Online ödeme altyapısı hazırlanmaktadır</p>
              <p>+ Şeffaf faturalı ve orijinal ürün garantisi</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
