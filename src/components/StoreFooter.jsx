export default function StoreFooter({ logoUrl, storeConfig, whatsappUrl }) {
  return (
    <footer className="store-footer">
      <div className="footer-brand">
        <img src={logoUrl} alt="Eztila Butik" width="82" height="82" loading="lazy" />
        <p>Kadın giyim koleksiyonlarını keşfet, ürün detaylarını incele ve sana uygun kanal üzerinden bize ulaş.</p>
      </div>
      <div>
        <strong>Keşfet</strong>
        <a href="/#koleksiyon">Tüm ürünler</a>
        <a href="/#kategoriler">Kategoriler</a>
        <a href="/hesabim">Favorilerim</a>
      </div>
      <div>
        <strong>Bize Ulaş</strong>
        {storeConfig?.trendyolUrl && <a href={storeConfig.trendyolUrl} target="_blank" rel="noreferrer">Trendyol mağazamız</a>}
        {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp destek</a>}
        {storeConfig?.instagramUrl && <a href={storeConfig.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>}
        {storeConfig?.contactPhone && <a href={`tel:${storeConfig.contactPhone}`}>{storeConfig.contactPhone}</a>}
        {storeConfig?.contactEmail && <a href={`mailto:${storeConfig.contactEmail}`}>{storeConfig.contactEmail}</a>}
      </div>
      <div>
        <strong>Yasal</strong>
        <a href="/kvkk-aydinlatma">KVKK Aydınlatma</a>
        <a href="/uyelik-sozlesmesi">Üyelik Sözleşmesi</a>
        <a href="/ticari-ileti">Ticari İleti İzni</a>
      </div>
      <span className="footer-copyright">© {new Date().getFullYear()} Eztila Butik</span>
    </footer>
  );
}
