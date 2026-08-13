/**
 * Eztila Butik - İndirim Kuponu ve Promosyon Motoru
 */

export const PROMO_COUPONS = [
  {
    code: 'EZTILA10',
    type: 'percentage',
    value: 10, // %10 indirim
    minSubtotalCents: 50000, // 500 TL ve üzeri
    description: '%10 Yeni Sezon İndirimi (Min. 500 TL)',
  },
  {
    code: 'HOSGELDIN',
    type: 'fixed',
    valueCents: 10000, // 100 TL net indirim
    minSubtotalCents: 75000, // 750 TL ve üzeri
    description: '100 TL Hoş Geldin İndirimi (Min. 750 TL)',
  },
  {
    code: 'VIP20',
    type: 'percentage',
    value: 20, // %20 indirim
    minSubtotalCents: 150000, // 1.500 TL ve üzeri
    description: '%20 VIP Butik İndirimi (Min. 1.500 TL)',
  },
];

const fmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });

/**
 * Kuponu doğrular ve indirim tutarını hesaplar
 */
export function validateAndApplyCoupon(rawCode, subtotalCents) {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) {
    return { valid: false, message: 'Lütfen bir kupon kodu yazınız.' };
  }

  const found = PROMO_COUPONS.find((c) => c.code === code);
  if (!found) {
    return { valid: false, message: 'Geçersiz veya süresi dolmuş kupon kodu.' };
  }

  if (subtotalCents < found.minSubtotalCents) {
    const minTry = fmt.format(found.minSubtotalCents / 100);
    return {
      valid: false,
      message: `"${found.code}" kuponu en az ${minTry} tutarındaki sepetlerde geçerlidir.`,
    };
  }

  let discountCents = 0;
  let isFreeShipping = false;

  if (found.type === 'percentage') {
    discountCents = Math.round((subtotalCents * found.value) / 100);
  } else if (found.type === 'fixed') {
    discountCents = Math.min(found.valueCents, subtotalCents);
  } else if (found.type === 'free_shipping') {
    isFreeShipping = true;
  }

  return {
    valid: true,
    code: found.code,
    type: found.type,
    discountCents,
    isFreeShipping,
    description: found.description,
  };
}

/**
 * Kayıtlı kuponu localStorage'dan getirir
 */
export function getSavedCoupon() {
  try {
    const raw = localStorage.getItem('eztila-active-coupon');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Aktif kuponu localStorage'a kaydeder
 */
export function saveActiveCoupon(couponObj) {
  try {
    if (couponObj) {
      localStorage.setItem('eztila-active-coupon', JSON.stringify(couponObj));
    } else {
      localStorage.removeItem('eztila-active-coupon');
    }
  } catch {
    // ignore
  }
}
