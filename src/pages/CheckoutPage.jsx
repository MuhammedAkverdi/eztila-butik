import { useState, useEffect, useMemo } from 'react';
import { authFetch } from '../lib/auth-fetch';
import { validateAndApplyCoupon, getSavedCoupon, saveActiveCoupon } from '../lib/coupons';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';
const fmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });

export default function CheckoutPage() {
  const [account, setAccount] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  // Card form (PCI-DSS compliant UI mockup)
  const [cardForm, setCardForm] = useState({
    cardHolder: '',
    cardNumber: '',
    expireMonth: '12',
    expireYear: '2028',
    cvv: '',
  });

  // Agreements
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderComplete, setOrderComplete] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()).catch(() => ({ products: [] })),
      authFetch('/api/account').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([pData, aData]) => {
      setProducts(pData.products || []);
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
  [cart, products]);

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
    setCouponFeedback({ type: 'success', text: `"${res.code}" uygulandı.` });
    setCouponInput('');
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    saveActiveCoupon(null);
    setCouponFeedback(null);
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

      try {
        await authFetch('/api/account/orders', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        // Fallback for guest checkout
      }

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
    return <main className="checkout-loading"><span>Yükleniyor...</span></main>;
  }

  if (orderComplete) {
    return (
      <main className="payment-result" style={{textAlign: 'center', padding: '5rem 1rem'}}>
        <h1 style={{fontSize: '2rem', marginBottom: '1rem'}}>Siparişiniz İçin Teşekkürler!</h1>
        <p><strong>{orderComplete.orderNumber}</strong> numaralı siparişiniz başarıyla alındı.</p>
        <p style={{margin: '2rem 0'}}><a href="/" className="button">Alışverişe Devam Et</a></p>
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
            if(shippingForm.fullName && shippingForm.address) setStep(2);
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
                  <span className="co-tab-num">2</span> Ödeme Bilgileri
                </div>
              </div>

              <div className="co-address-wrapper">
                <div className="co-address-head">
                  <span>📍 Yeni Adres Ekle</span>
                </div>
                
                <form className="co-address-form" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
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
                  
                  <button type="submit" className="co-submit-btn">ADRESİ KAYDET</button>
                </form>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="co-step-box">
              
              <div className="co-payment-head">
                <h2>Kartla Güvenli Ödeme</h2>
                <p>Ödeme bilgileriniz güvenli şifreleme altyapısıyla korunur.</p>
              </div>

              <form className="co-payment-form" onSubmit={handleCompleteOrder}>
                {errorMsg && <div className="co-error">{errorMsg}</div>}
                
                <div className="co-form-grid">
                  <label className="co-full-width">
                    <span className="co-label-dark">KART ÜZERİNDEKİ İSİM</span>
                    <input required type="text" placeholder="KART SAHİBİNİN ADI" value={cardForm.cardHolder} onChange={e => setCardForm({...cardForm, cardHolder: e.target.value})} />
                  </label>
                  <label className="co-full-width">
                    <span className="co-label-dark">KART NUMARASI</span>
                    <input required type="text" placeholder="0000 0000 0000 0000" maxLength="19" value={cardForm.cardNumber} onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                      setCardForm({...cardForm, cardNumber: v});
                    }} />
                  </label>
                  <label>
                    <span className="co-label-dark">SON KULLANMA AYI</span>
                    <select value={cardForm.expireMonth} onChange={e => setCardForm({...cardForm, expireMonth: e.target.value})}>
                      {Array.from({length: 12}).map((_,i) => {
                        const m = String(i+1).padStart(2,'0');
                        return <option key={m} value={m}>{m}</option>;
                      })}
                    </select>
                  </label>
                  <label>
                    <span className="co-label-dark">SON KULLANMA YILI</span>
                    <select value={cardForm.expireYear} onChange={e => setCardForm({...cardForm, expireYear: e.target.value})}>
                      {Array.from({length: 10}).map((_,i) => <option key={i} value={2026+i}>{2026+i}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="co-label-dark">GÜVENLİK KODU (CVV)</span>
                    <input required type="password" placeholder="123" maxLength="4" value={cardForm.cvv} onChange={e => setCardForm({...cardForm, cvv: e.target.value.replace(/\D/g,'')})} />
                  </label>
                </div>

                <div className="co-agreements-box">
                  <label className="co-checkbox-row align-start">
                    <input type="checkbox" required checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} />
                    <span>
                      <a href="/on-bilgilendirme" target="_blank" rel="noreferrer">Ön Bilgilendirme Formu</a><br/>
                      ve<br/>
                      <a href="/mesafeli-satis" target="_blank" rel="noreferrer">Mesafeli Satış Sözleşmesi</a><br/>
                      'ni okudum, kabul ediyorum.
                    </span>
                  </label>
                </div>

                <button type="submit" disabled={submitting} className="co-submit-btn">
                  {submitting ? 'İŞLENİYOR...' : `${fmt.format(totalCents / 100)} İLE SİPARİŞİ TAMAMLA`}
                </button>
              </form>

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
                <div className="co-summary-item" key={idx}>
                  <div className="co-summary-img-wrap">
                    <img src={item.product.imageUrl} alt={item.product.name} />
                    <span className="co-summary-qty-badge">{item.quantity}</span>
                  </div>
                  <div className="co-summary-item-info">
                    <h4>{item.product.name}</h4>
                    <small>Beden: {item.variantLabel.toUpperCase()}</small>
                    <strong>{fmt.format(((item.product.variants?.find((v) => v.label === item.variantLabel)?.priceCents || item.product.priceCents) * item.quantity) / 100)}</strong>
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
                <span>TOPLAM ÖDENECEK</span>
                <span>{fmt.format(totalCents / 100)}</span>
              </div>
            </div>

            <div className="co-summary-perks">
              <p>+ 14 gün ücretsiz kolay iade</p>
              <p>+ Güvenli 3D Secure kart koruması</p>
              <p>+ Şeffaf faturalı ve orijinal ürün garantisi</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
