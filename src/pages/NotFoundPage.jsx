import { useEffect } from 'react';
import { setPageSeo } from '../lib/seo';

export default function NotFoundPage() {
  useEffect(() => {
    setPageSeo({
      title: 'Sayfa Bulunamadı | Eztila Butik',
      description: 'Aradığınız sayfa bulunamadı. Eztila Butik kadın giyim koleksiyonuna dönebilirsiniz.',
      path: window.location.pathname,
      robots: 'noindex,follow',
    });
  }, []);

  return (
    <main className="route-state-page">
      <div className="route-state-card">
        <p className="eyebrow">404 · EZTİLA BUTİK</p>
        <h1>Bu sayfa burada değil.</h1>
        <p>Bağlantı değişmiş veya aradığınız sayfa kaldırılmış olabilir. Koleksiyona dönerek ürünleri keşfetmeye devam edebilirsiniz.</p>
        <a className="button button-primary" href="/#koleksiyon">Koleksiyona dön</a>
      </div>
    </main>
  );
}
