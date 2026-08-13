import { useLocation } from 'react-router-dom';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';

const LEGAL_DOCS = {
  '/kvkk-aydinlatma': {
    eyebrow: 'KİŞİSEL VERİLERİN KORUNMASI',
    title: 'KVKK Aydınlatma Metni',
    date: '13 Ağustos 2026',
    sections: [
      {
        title: '1. Veri Sorumlusu',
        content: '6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, Eztila Butik olarak veri sorumlusu sıfatıyla kişisel verilerinizi mevzuata uygun şekilde işlemekteyiz.',
      },
      {
        title: '2. İşlenen Kişisel Veriler ve Amaçları',
        content: 'Adınız, soyadınız, teslimat adresiniz, telefon numaranız ve e-posta adresiniz; siparişlerin teslimatı, faturalandırma ve müşteri memnuniyeti süreçlerinin yürütülmesi amacıyla işlenmektedir.',
      },
      {
        title: '3. Veri Güvenliği',
        content: 'Kredi kartı bilgileriniz hiçbir surette sistemlerimizde saklanmamakta olup, ödemeler BDDK lisanslı güvenli ödeme altyapıları üzerinden 256-bit SSL korumasıyla gerçekleşmektedir.',
      },
    ],
  },
  '/uyelik-sozlesmesi': {
    eyebrow: 'KULLANICI SÖZLEŞMESİ',
    title: 'Üyelik Sözleşmesi',
    date: '13 Ağustos 2026',
    sections: [
      {
        title: '1. Taraflar',
        content: 'İşbu sözleşme Eztila Butik ile siteye üye olan kullanıcı arasında elektronik ortamda akdedilmiştir.',
      },
      {
        title: '2. Üyelik Şartları',
        content: 'Üye, kayıt sırasında sağladığı tüm bilgilerin doğru ve güncel olduğunu kabul ve taahhüt eder.',
      },
      {
        title: '3. Gizlilik ve Güvenlik',
        content: 'Üyenin hesap şifresinin güvenliği bizzat üyeye aittir. Eztila Butik hesap verilerini yalnız sipariş ve kullanıcı deneyimi için kullanır.',
      },
    ],
  },
  '/on-bilgilendirme': {
    eyebrow: 'YASAL BİLGİLENDİRME',
    title: 'Ön Bilgilendirme Formu',
    date: '13 Ağustos 2026',
    sections: [
      {
        title: '1. Satıcı Bilgileri',
        content: 'Unvan: Eztila Butik | İletişim: eztilabutik@gmail.com | Tel: +90 507 819 52 64',
      },
      {
        title: '2. Cayma Hakkı',
        content: 'Alıcı, sözleşme konusu ürünün kendisine veya gösterdiği adresteki kişi/kuruluşa tesliminden itibaren 14 (on dört) gün içinde hiçbir gerekçe göstermeksizin cayma hakkını kullanabilir.',
      },
    ],
  },
  '/mesafeli-satis': {
    eyebrow: 'TÜKETİCİ HAKLARI',
    title: 'Mesafeli Satış Sözleşmesi',
    date: '13 Ağustos 2026',
    sections: [
      {
        title: '1. Konu',
        content: 'İşbu Sözleşme’nin konusu, Alıcı’nın Satıcı’ya ait internet sitesinden elektronik ortamda siparişini yaptığı ürünün satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun hükümleridir.',
      },
      {
        title: '2. Teslimat Koşulları',
        content: 'Siparişler anlaşmalı kargo firmaları aracılığıyla 1-3 iş günü içerisinde kargoya teslim edilir.',
      },
    ],
  },
  '/ticari-ileti': {
    eyebrow: 'İLETİŞİM ONAYI',
    title: 'Ticari Elektronik İleti İzni',
    date: '13 Ağustos 2026',
    sections: [
      {
        title: '1. İzin Kapsamı',
        content: 'Eztila Butik tarafından sunulan yeni sezon koleksiyonları, indirim ve kampanyalardan e-posta ve SMS yoluyla haberdar olmak amacıyla verilen isteğe bağlı izin metnidir.',
      },
      {
        title: '2. İptal ve Değişiklik',
        content: 'Bu izni dilediğiniz an Hesabım panelinizden veya e-postalardaki "Abonelikten Ayrıl" bağlantısından tek tıkla iptal edebilirsiniz.',
      },
    ],
  },
};

export default function LegalPage() {
  const location = useLocation();
  const doc = LEGAL_DOCS[location.pathname] || LEGAL_DOCS['/kvkk-aydinlatma'];

  return (
    <main className="legal-shell">
      <header className="legal-header">
        <a href="/"><img src={LOGO} alt="Eztila Butik" /></a>
        <nav>
          <a href="/#koleksiyon">Koleksiyon</a>
          <a href="/hesabim">Hesabım</a>
          <a href="/">Mağaza</a>
        </nav>
      </header>

      <section className="legal-hero">
        <p className="eyebrow">{doc.eyebrow}</p>
        <h1>{doc.title}</h1>
        <span>Eztila Butik şeffaf, güvenli ve kullanıcı odaklı alışveriş deneyimi sunar.</span>
        <small>Son Güncelleme: {doc.date}</small>
      </section>

      <article className="legal-document">
        {doc.sections.map((sec, idx) => (
          <section key={idx}>
            <h2>{sec.title}</h2>
            <p>{sec.content}</p>
          </section>
        ))}
      </article>

      <footer className="legal-footer">
        <a href="/kvkk-aydinlatma">KVKK Aydınlatma</a>
        <a href="/uyelik-sozlesmesi">Üyelik Sözleşmesi</a>
        <a href="/on-bilgilendirme">Ön Bilgilendirme</a>
        <a href="/mesafeli-satis">Mesafeli Satış</a>
        <a href="/ticari-ileti">Ticari İleti İzni</a>
      </footer>
    </main>
  );
}
