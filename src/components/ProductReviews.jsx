export default function ProductReviews({ product }) {
  if (!product) return null;

  return (
    <section className="product-reviews-section" aria-labelledby="product-reviews-title">
      <div className="reviews-container">
        <div className="reviews-header reviews-empty">
          <h2 id="product-reviews-title">Müşteri Değerlendirmeleri</h2>
          <p>Bu ürün için henüz değerlendirme yapılmamış.</p>
        </div>
      </div>
    </section>
  );
}
