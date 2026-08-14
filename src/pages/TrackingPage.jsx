import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MobileNavigation from '../components/MobileNavigation';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';
const WHATSAPP_URL = 'https://wa.me/905078195264?text=Merhaba%20Eztila%20Butik%2C%20sipari%C5%9Fim%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.';

export default function TrackingPage() {
  const [params] = useSearchParams();
  const [orderNo, setOrderNo] = useState(params.get('order') || '');
  const [notice, setNotice] = useState('');

  function handleSearch(e) {
    e?.preventDefault();
    if (!orderNo.trim()) return;
    setNotice('Sipariş takip sistemi henüz aktif değildir. Siparişinizle ilgili destek için WhatsApp hattımızdan bize ulaşabilirsiniz.');
  }

  return (
    <main className="tracking-shell">
      <header className="store-header">
        <MobileNavigation whatsappUrl={WHATSAPP_URL} />
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
        <p>Sipariş takip altyapımızı hazırlıyoruz. Şimdilik siparişinizle ilgili destek için bize ulaşabilirsiniz.</p>

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
          <button type="submit" className="button button-primary">
            Durumu Kontrol Et →
          </button>
        </form>

        {notice && (
          <div className="tracking-result tracking-unavailable" role="status">
            <small>BİLGİLENDİRME</small>
            <h2>Online takip yakında</h2>
            <p>{notice}</p>
            <a
              className="button button-primary"
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp'tan Destek Al
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
