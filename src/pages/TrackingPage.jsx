import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';

const STATUS_TITLES = {
  pending_payment: 'Ödeme Bekleniyor',
  paid: 'Ödeme Alındı',
  preparing: 'Siparişiniz Hazırlanıyor',
  shipped: 'Kargoya Verildi',
  delivered: 'Teslim Edildi',
};

export default function TrackingPage() {
  const [params] = useSearchParams();
  const [orderNo, setOrderNo] = useState(params.get('order') || '');
  const [searchedOrder, setSearchedOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSearch(e) {
    e?.preventDefault();
    if (!orderNo.trim()) return;
    setLoading(true);
    setError('');

    // Query mock or api
    setTimeout(() => {
      setLoading(false);
      setSearchedOrder({
        orderNumber: orderNo.toUpperCase(),
        status: 'shipped',
        cargoFirm: 'Yurtiçi Kargo',
        trackingNumber: 'YK-8921849102',
        estimatedDelivery: '1-2 İş Günü',
        createdAt: new Date().toLocaleDateString('tr-TR'),
      });
    }, 400);
  }

  useEffect(() => {
    if (params.get('order')) {
      handleSearch();
    }
  }, [params]);

  return (
    <main className="tracking-shell">
      <header className="store-header">
        <a className="store-logo" href="/"><img src={LOGO} alt="Eztila Butik" /></a>
        <nav aria-label="Ana menü">
          <a href="/#koleksiyon">Yeni sezon</a>
          <a href="/#koleksiyon">Koleksiyon</a>
          <a href="/hesabim">Hesabım</a>
        </nav>
      </header>

      <div className="tracking-card">
        <p className="eyebrow">EZTİLA SİPARİŞ TAKİBİ</p>
        <h1>Kargonuz Nerede?</h1>
        <p>Sipariş numaranızı yazarak kargo durumunuzu anlık olarak sorgulayabilirsiniz.</p>

        <form onSubmit={handleSearch}>
          <label>
            Sipariş Numarası (örn: EZT-123456)
            <input
              required
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              placeholder="EZT-123456"
            />
          </label>
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? 'Sorgulanıyor…' : 'Siparişi Sorgula →'}
          </button>
        </form>

        {error && <div className="tracking-error" role="alert">{error}</div>}

        {searchedOrder && (
          <div className="tracking-result">
            <small>SİPARİŞ DURUMU</small>
            <h2>{STATUS_TITLES[searchedOrder.status] || searchedOrder.status}</h2>
            <p>
              Kargo Firması: <strong>{searchedOrder.cargoFirm}</strong> | Takip No: <strong>{searchedOrder.trackingNumber}</strong>
            </p>
            <div className={`tracking-progress ${searchedOrder.status}`}>
              <span title="Ödeme Alındı"></span>
              <span title="Hazırlanıyor"></span>
              <span title="Kargoda"></span>
              <span title="Teslim Edildi"></span>
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#68645d' }}>
              Tahmini Teslimat Süresi: <strong>{searchedOrder.estimatedDelivery}</strong>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
