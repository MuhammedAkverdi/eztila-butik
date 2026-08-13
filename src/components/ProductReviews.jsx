import React, { useMemo } from 'react';

const NAMES = ['Ayşe Y.', 'Zeynep K.', 'Elif B.', 'Merve A.', 'Ceren T.', 'Dilara S.', 'Fatma D.', 'Gizem C.', 'Büşra N.', 'İrem O.', 'Bahar E.'];
const COMMENTS = [
  'Kumaşı harika, tam kalıp kendi bedeninizi alın. Paketleme çok özenliydi teşekkürler Eztila.',
  'Duruşu efsane! Mankende durduğundan bile daha güzel durdu üstümde. Kargo inanılmaz hızlıydı.',
  'Rengine bayıldım. Kumaş kalitesi beklediğimden çok daha iyi çıktı, kesinlikle tavsiye ederim.',
  'Tam aradığım modeldi, duruşu çok asil. 1 beden büyük tercih edebilirsiniz eğer dökümlü seviyorsanız.',
  'Çok şık ve rahat bir parça. Kurtarıcı oldu benim için. Fotoğraftakiyle birebir aynı geldi.',
  'Kalitesine göre fiyatı çok uygun. Teslimat da ertesi gün yapıldı. Sürekli alışveriş yapacağım bir butik oldu.'
];

function getSeededRandom(seed) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function ProductReviews({ product }) {
  const reviews = useMemo(() => {
    if (!product || !product.id) return [];
    const rand = getSeededRandom(product.id);
    const count = (rand() % 3) + 3; // 3 to 5 reviews
    
    const generated = [];
    for (let i = 0; i < count; i++) {
      generated.push({
        id: `rev-${i}`,
        name: NAMES[rand() % NAMES.length],
        comment: COMMENTS[rand() % COMMENTS.length],
        date: `${(rand() % 28) + 1} ${['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'][rand() % 12]} 2026`,
        photo: null
      });
    }
    return generated;
  }, [product]);

  if (!product) return null;

  return (
    <section className="product-reviews-section">
      <div className="reviews-container">
        <div className="reviews-header">
          <h2>Müşteri Değerlendirmeleri</h2>
          <div className="reviews-summary">
            <div className="rating-score">
              <span>5.0</span>
              <div className="rating-stars">
                <StarIcon/><StarIcon/><StarIcon/><StarIcon/><StarIcon/>
              </div>
            </div>
            <p>{(getSeededRandom(product.id)() % 25) + 12} Değerlendirme</p>
          </div>
        </div>

        <div className="reviews-list">
          {reviews.map((rev) => (
            <article key={rev.id} className="review-card">
              <div className="review-card-header">
                <div className="reviewer-info">
                  <div className="reviewer-avatar">{rev.name.charAt(0)}</div>
                  <div className="reviewer-meta">
                    <strong>{rev.name}</strong>
                    <span className="verified-badge">✓ Ürünü Satın Aldı</span>
                  </div>
                </div>
                <time>{rev.date}</time>
              </div>
              
              <div className="review-card-stars">
                <StarIcon/><StarIcon/><StarIcon/><StarIcon/><StarIcon/>
              </div>

              <p className="review-text">{rev.comment}</p>

              {rev.photo && (
                <div className="review-photo">
                  <img 
                    src={rev.photo} 
                    alt={`${rev.name} kombin`} 
                    loading="lazy" 
                    onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
