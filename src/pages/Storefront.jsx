import { useState, useEffect, useMemo } from 'react';
import {
  filterCatalogProducts,
  getCatalogFilterOptions,
  normalizeCatalogValue,
  sortCatalogProducts,
} from '../lib/catalog-discovery';
import { getAccountOverview } from '../services/account-service';
import { getCatalogCategories, getCatalogProducts, getStoreConfig } from '../services/catalog-service';
import MobileNavigation from '../components/MobileNavigation';

const LOGO = 'https://cdn.myikas.com/images/theme-images/6c2e3155-6f89-4bee-ad12-391769e1a2c7/image_1080.webp';
const HERO_IMG = 'https://cdn.myikas.com/images/d22d5168-9c4e-4d2f-bf44-29933b7f8aad/f5595db0-5fe4-4b29-b14c-3da73997399c/image_1080.webp';
const fmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function HeartIcon({ filled = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#b83b3b' : 'none'} stroke={filled ? '#b83b3b' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.05 7.42C8.84 7.42 8.49 7.5 8.2 7.81C7.9 8.13 7.07 8.91 7.07 10.49C7.07 12.07 8.22 13.59 8.38 13.8C8.54 14.01 10.6 17.18 13.78 18.55C14.54 18.88 15.13 19.08 15.59 19.22C16.35 19.46 17.05 19.43 17.6 19.35C18.21 19.26 19.48 18.58 19.74 17.85C20 17.12 20 16.49 19.92 16.36C19.84 16.23 19.63 16.15 19.32 16C19.01 15.84 17.18 14.94 16.84 14.82C16.5 14.7 16.25 14.64 16 15.01C15.75 15.38 15.04 16.23 14.82 16.48C14.61 16.73 14.39 16.76 14.08 16.61C13.77 16.45 12.78 16.13 11.61 15.08C10.7 14.26 10.08 13.26 9.9 12.95C9.72 12.64 9.88 12.47 10.04 12.31C10.18 12.17 10.35 11.94 10.51 11.75C10.67 11.56 10.72 11.42 10.82 11.22C10.93 11.01 10.87 10.83 10.79 10.67C10.72 10.51 10.1 8.97 9.84 8.37C9.6 7.78 9.34 7.86 9.15 7.85C8.97 7.84 8.76 7.84 8.55 7.84Z"/>
    </svg>
  );
}

function CatalogFilters({
  categories,
  category,
  onCategoryChange,
  sizeOptions,
  selectedSizes,
  onToggleSize,
  colorOptions,
  selectedColors,
  onToggleColor,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  onClear,
  showCategory = false,
}) {
  return (
    <div className="catalog-filters">
      {showCategory && (
        <label className="filter-group filter-category">
          <span>Kategori</span>
          <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      )}

      <fieldset className="filter-group">
        <legend>Beden</legend>
        <div className="filter-options filter-sizes">
          {sizeOptions.map((option) => (
            <label key={option.key} className={selectedSizes.includes(option.key) ? 'active' : ''}>
              <input
                type="checkbox"
                checked={selectedSizes.includes(option.key)}
                onChange={() => onToggleSize(option.key)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Renk</legend>
        <div className="filter-options filter-colors">
          {colorOptions.map((option) => (
            <label key={option.key} className={selectedColors.includes(option.key) ? 'active' : ''}>
              <input
                type="checkbox"
                checked={selectedColors.includes(option.key)}
                onChange={() => onToggleColor(option.key)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="filter-group filter-price">
        <legend>Fiyat aralığı</legend>
        <div>
          <label>
            <span>En az</span>
            <input type="number" min="0" inputMode="numeric" value={minPrice} onChange={(event) => onMinPriceChange(event.target.value)} placeholder="₺" />
          </label>
          <label>
            <span>En fazla</span>
            <input type="number" min="0" inputMode="numeric" value={maxPrice} onChange={(event) => onMaxPriceChange(event.target.value)} placeholder="₺" />
          </label>
        </div>
      </fieldset>

      <button type="button" className="filter-clear" onClick={onClear}>Filtreleri temizle</button>
    </div>
  );
}

export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tümü');
  const [sort, setSort] = useState('featured');
  const [favorites, setFavorites] = useState([]);
  const [notice, setNotice] = useState('');
  const [storeConfig, setStoreConfig] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [catalogError, setCatalogError] = useState(false);
  const [account, setAccount] = useState(null);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      getCatalogProducts(),
      getCatalogCategories(),
      getStoreConfig(),
      getAccountOverview().catch(() => null),
    ]).then(([catalogProducts, catalogCategories, config, currentAccount]) => {
      setProducts(catalogProducts);
      setCategoryOptions(catalogCategories);
      const requestedCategorySlug = new URLSearchParams(window.location.search).get('category');
      const requestedCategory = catalogCategories.find((item) => item.slug === requestedCategorySlug);
      if (requestedCategory) setCategory(requestedCategory.name);
      setStoreConfig(config);
      setAccount(currentAccount);
      setCatalogError(false);
    }).catch(() => {
      setCatalogError(true);
      setNotice('Koleksiyon şu anda yüklenemedi. Lütfen kısa süre sonra tekrar deneyin.');
    })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try { setFavorites(JSON.parse(localStorage.getItem('eztila-favorites') || '[]')); } catch { setFavorites([]); }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('focusSearch') === 'true') {
      requestAnimationFrame(() => {
        document.querySelector('#koleksiyon')?.scrollIntoView();
        document.querySelector('#search')?.focus();
      });
    }

    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!filterOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [filterOpen]);

  function toggleFavorite(product) {
    setFavorites((prev) => {
      const isFav = prev.some((p) => p.id === product.id);
      let next;
      if (isFav) {
        next = prev.filter((p) => p.id !== product.id);
      } else {
        next = [...prev, product];
      }
      localStorage.setItem('eztila-favorites', JSON.stringify(next));
      return next;
    });
  }

  const categories = useMemo(() => ['Tümü', ...categoryOptions.map((item) => item.name)], [categoryOptions]);
  const filterOptions = useMemo(() => getCatalogFilterOptions(products), [products]);

  const toggleFilterValue = (setter, value) => {
    setter((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('Tümü');
    setSelectedSizes([]);
    setSelectedColors([]);
    setMinPrice('');
    setMaxPrice('');
  };

  const chooseNavigationCategory = (keyword) => {
    if (!keyword) {
      setCategory('Tümü');
      document.querySelector('#koleksiyon')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const match = categoryOptions.find((item) => normalizeCatalogValue(item.name) === keyword)
      || categoryOptions.find((item) => normalizeCatalogValue(item.name).includes(keyword));
    setCategory(match?.name || 'Tümü');
    document.querySelector('#koleksiyon')?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeFilterCount = selectedSizes.length
    + selectedColors.length
    + (category === 'Tümü' ? 0 : 1)
    + (minPrice ? 1 : 0)
    + (maxPrice ? 1 : 0);

  const filtered = useMemo(() => {
    const result = filterCatalogProducts(products, {
      search,
      category,
      sizes: selectedSizes,
      colors: selectedColors,
      minPrice,
      maxPrice,
    });
    return sortCatalogProducts(result, sort);
  }, [products, category, search, selectedSizes, selectedColors, minPrice, maxPrice, sort]);

  const whatsappLink = storeConfig?.whatsappNumber
    ? `https://wa.me/${storeConfig.whatsappNumber}?text=Merhaba%20Eztila%20Butik%2C%20yard%C4%B1m%20almak%20istiyorum.`
    : null;

  function focusProductSearch() {
    document.querySelector('#koleksiyon')?.scrollIntoView({ behavior: 'smooth' });
    requestAnimationFrame(() => document.querySelector('#search')?.focus());
  }

  return (
    <main className="shop-shell">
      <div className="announcement">
        <span>41 seçili butik ürün</span>
        <span>Trendyol üzerinden alışveriş</span>
        <span>WhatsApp ürün danışmanlığı</span>
      </div>

      <header className="store-header">
        <MobileNavigation
          categories={categoryOptions}
          favoriteCount={favorites.length}
          accountHref={account ? '/hesabim' : '/giris'}
          accountLabel={account ? 'Hesabım' : 'Giriş / Üye Ol'}
          onCategorySelect={(selectedCategory) => {
            setCategory(selectedCategory.name);
            document.querySelector('#koleksiyon')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onSearch={focusProductSearch}
          whatsappUrl={whatsappLink}
        />
        <a className="store-logo" href="#top" aria-label="Eztila Butik Ana Sayfa">
          <img src={LOGO} alt="Eztila Butik" />
        </a>
        <nav aria-label="Ana menü">
          <a href="#koleksiyon" onClick={() => chooseNavigationCategory('')}>Yeni sezon</a>
          <a href="/?category=elbise#koleksiyon" onClick={(event) => { event.preventDefault(); chooseNavigationCategory('elbise'); }}>Elbiseler</a>
          <a href="/?category=alt-ust-takim#koleksiyon" onClick={(event) => { event.preventDefault(); chooseNavigationCategory('takım'); }}>Takımlar</a>
        </nav>
        <div className="header-tools">
          <button className="icon-button" onClick={focusProductSearch} aria-label="Ürün ara">
            <SearchIcon />
          </button>
          <a className="icon-button fav-header-btn" href="/hesabim" aria-label={`Favorilerim (${favorites.length})`}>
            <HeartIcon filled={favorites.length > 0} />
            {favorites.length > 0 && <span className="header-badge">{favorites.length}</span>}
          </a>
          <a className="account-link" href={account ? '/hesabim' : '/giris'} aria-label={account ? 'Hesabım' : 'Giriş yap veya üye ol'}>
            <span className="account-link-icon" aria-hidden="true"><UserIcon /></span>
            <span className="account-link-text">{account ? 'Hesabım' : 'Giriş / Üye ol'}</span>
          </a>
        </div>
      </header>

      <section className="commerce-hero" id="top">
        <div className="hero-content">
          <p className="eyebrow">EZTİLA · YENİ KOLEKSİYON</p>
          <h1>Tarzını<br />kendin yaz.</h1>
          <p>Günün her anına eşlik eden modern, feminen ve özenle seçilmiş parçalar.</p>
          <a className="button button-primary" href="#koleksiyon">Koleksiyonu keşfet <span>→</span></a>
          <div className="hero-proof">
            <span>41+ seçili ürün</span>
            <span>Detaylı ürün galerileri</span>
            <span>Trendyol &amp; WhatsApp erişimi</span>
          </div>
        </div>
        <div className="hero-image">
          <img src={products.find((p) => p.featured)?.imageUrl || HERO_IMG} alt="Eztila yeni sezon kadın giyim" />
          <div className="hero-badge">
            <small>Yeni sezon</small>
            <strong>Şimdi yayında</strong>
          </div>
        </div>
      </section>

      <section className="catalog-section" id="koleksiyon">
        <div className="catalog-title">
          <div>
            <p className="eyebrow">ONLINE MAĞAZA</p>
            <h2>Tüm koleksiyon</h2>
          </div>
          <p>{products.length || 41} ürün · Özel seçilmiş butik parçalar</p>
        </div>
        <div className="catalog-toolbar">
          <label className="search-box">
            <span><SearchIcon /></span>
            <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün ara..." />
          </label>
          <div className="category-pills">
            {categories.map((cat) => (
              <button key={cat} className={cat === category ? 'active' : ''} onClick={() => setCategory(cat)}>{cat}</button>
            ))}
          </div>
          <select className="desktop-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ürünleri sırala">
            <option value="featured">Önerilen</option>
            <option value="low">Fiyat: düşükten</option>
            <option value="high">Fiyat: yüksekten</option>
          </select>
        </div>

        <div className="mobile-catalog-actions">
          <button type="button" onClick={() => setFilterOpen(true)} aria-haspopup="dialog">
            Filtrele {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
          </button>
          <label>
            <span>Sırala</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Ürünleri sırala">
              <option value="featured">Önerilen</option>
              <option value="low">Fiyat: düşükten</option>
              <option value="high">Fiyat: yüksekten</option>
            </select>
          </label>
        </div>

        <div className="desktop-catalog-filters">
          <CatalogFilters
            categories={categories}
            category={category}
            onCategoryChange={setCategory}
            sizeOptions={filterOptions.sizes}
            selectedSizes={selectedSizes}
            onToggleSize={(value) => toggleFilterValue(setSelectedSizes, value)}
            colorOptions={filterOptions.colors}
            selectedColors={selectedColors}
            onToggleColor={(value) => toggleFilterValue(setSelectedColors, value)}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPriceChange={setMinPrice}
            onMaxPriceChange={setMaxPrice}
            onClear={clearFilters}
          />
        </div>

        {(activeFilterCount > 0 || search) && (
          <div className="active-filters" aria-label="Aktif filtreler">
            {search && <button type="button" onClick={() => setSearch('')}>Arama: {search} ×</button>}
            {category !== 'Tümü' && <button type="button" onClick={() => setCategory('Tümü')}>{category} ×</button>}
            {selectedSizes.map((key) => (
              <button key={key} type="button" onClick={() => toggleFilterValue(setSelectedSizes, key)}>
                {filterOptions.sizes.find((option) => option.key === key)?.label || key} ×
              </button>
            ))}
            {selectedColors.map((key) => (
              <button key={key} type="button" onClick={() => toggleFilterValue(setSelectedColors, key)}>
                {filterOptions.colors.find((option) => option.key === key)?.label || key} ×
              </button>
            ))}
            {minPrice && <button type="button" onClick={() => setMinPrice('')}>En az {minPrice} ₺ ×</button>}
            {maxPrice && <button type="button" onClick={() => setMaxPrice('')}>En fazla {maxPrice} ₺ ×</button>}
            <button type="button" className="clear-all-filters" onClick={clearFilters}>Filtreleri temizle</button>
          </div>
        )}

        {!loading && !catalogError && <p className="catalog-result-count" aria-live="polite">{filtered.length} ürün</p>}

        {filterOpen && (
          <div className="filter-drawer-overlay" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFilterOpen(false);
          }}>
            <aside className="filter-drawer" role="dialog" aria-modal="true" aria-labelledby="filter-drawer-title">
              <header>
                <div>
                  <small>KOLEKSİYON</small>
                  <h2 id="filter-drawer-title">Filtrele</h2>
                </div>
                <button type="button" onClick={() => setFilterOpen(false)} aria-label="Filtreleri kapat">×</button>
              </header>
              <div className="filter-drawer-content">
                <CatalogFilters
                  categories={categories}
                  category={category}
                  onCategoryChange={setCategory}
                  sizeOptions={filterOptions.sizes}
                  selectedSizes={selectedSizes}
                  onToggleSize={(value) => toggleFilterValue(setSelectedSizes, value)}
                  colorOptions={filterOptions.colors}
                  selectedColors={selectedColors}
                  onToggleColor={(value) => toggleFilterValue(setSelectedColors, value)}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  onMinPriceChange={setMinPrice}
                  onMaxPriceChange={setMaxPrice}
                  onClear={clearFilters}
                  showCategory
                />
              </div>
              <footer>
                <button type="button" onClick={() => setFilterOpen(false)}>{filtered.length} ürünü göster</button>
              </footer>
            </aside>
          </div>
        )}

        {notice && <div className="store-notice" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}

        {loading ? (
          <div className="loading-grid">{Array.from({ length: 8 }).map((_, i) => <span key={i} />)}</div>
        ) : (
          <div className="commerce-grid">
            {filtered.map((product, idx) => {
              const isFavorite = favorites.some((f) => f.id === product.id);
              return (
                <article key={product.id} className="commerce-card">
                  <div className="card-media">
                    {(() => {
                      if (product.compareAtCents && product.compareAtCents > product.priceCents) {
                        return <span className="sale-badge">İNDİRİM</span>;
                      }
                      if (product.isNew) {
                        return <span className="new-badge">YENİ</span>;
                      }
                      return null;
                    })()}
                    
                    <button
                      type="button"
                      className={`card-fav-btn ${isFavorite ? 'active' : ''}`}
                      onClick={() => toggleFavorite(product)}
                      aria-label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                    >
                      <HeartIcon filled={isFavorite} />
                    </button>

                    <a href={`/urun/${product.slug}`}>
                      <img
                        src={product.imageUrl || LOGO}
                        alt={product.name}
                        loading={idx < 4 ? 'eager' : 'lazy'}
                        width="600"
                        height="800"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = LOGO;
                        }}
                      />
                    </a>
                    <a className="card-choice-button" href={`/urun/${product.slug}`}>Ürünü İncele</a>
                  </div>
                  <div className="card-info">
                    <span>{product.category}</span>
                    <h3><a href={`/urun/${product.slug}`}>{product.name}</a></h3>
                    <div className="price-row">
                      <strong>{fmt.format(product.priceCents / 100)}</strong>
                      {product.compareAtCents && product.compareAtCents > product.priceCents && <del>{fmt.format(product.compareAtCents / 100)}</del>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <h3>{catalogError
              ? 'Koleksiyon şu anda görüntülenemiyor.'
              : products.length === 0
                ? 'Koleksiyon henüz yayında değil.'
                : 'Bu filtrelere uygun ürün bulunamadı.'}</h3>
            {!catalogError && products.length > 0 && <button onClick={clearFilters}>Filtreleri temizle</button>}
          </div>
        )}
      </section>

      <section className="story-section" id="hakkimizda">
        <div>
          <p className="eyebrow">EZTİLA DÜNYASI</p>
          <h2>Her güne biraz<br />daha fazla sen.</h2>
          <p>Koleksiyonlarımızı özgüvenli, rahat ve zamansız bir stil için seçiyoruz. Beden ve kombin konusunda WhatsApp üzerinden yanındayız.</p>
          {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer">Stil danışmanına yaz →</a>}
        </div>
        <div className="story-cards">
          <article><b>01</b><strong>Özenli seçim</strong><span>Trendleri Eztila çizgisiyle buluşturan koleksiyon.</span></article>
          <article><b>02</b><strong>Hızlı destek</strong><span>Ürün, beden ve kombin sorularına WhatsApp'tan yanıt.</span></article>
          <article><b>03</b><strong>Kolay erişim</strong><span>Beğendiğin ürün için Trendyol'a geç veya WhatsApp'tan bilgi al.</span></article>
        </div>
      </section>

      <footer className="store-footer">
        <div><img src={LOGO} alt="Eztila Butik" /><p>Zarafetin ve şıklığın adresi.</p></div>
        <div>
          <strong>Keşfet</strong>
          <a href="#koleksiyon">Tüm ürünler</a>
          {storeConfig?.instagramUrl && <a href={storeConfig.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>}
          {storeConfig?.trendyolUrl && <a href={storeConfig.trendyolUrl} target="_blank" rel="noreferrer">Trendyol</a>}
        </div>
        <div>
          <strong>Destek</strong>
          <a href="/hesabim">Müşteri hesabım</a>
          {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer">WhatsApp</a>}
          {storeConfig?.contactPhone && <a href={`tel:${storeConfig.contactPhone}`}>{storeConfig.contactPhone}</a>}
          {storeConfig?.contactEmail && <a href={`mailto:${storeConfig.contactEmail}`}>{storeConfig.contactEmail}</a>}
        </div>
        <div>
          <strong>Yasal</strong>
          <a href="/kvkk-aydinlatma">KVKK Aydınlatma</a>
          <a href="/uyelik-sozlesmesi">Üyelik Sözleşmesi</a>
          <a href="/on-bilgilendirme">Ön Bilgilendirme</a>
          <a href="/mesafeli-satis">Mesafeli Satış</a>
          <a href="/ticari-ileti">Ticari İleti İzni</a>
          <span>© 2026 Eztila Butik · <a href="/admin">Yönetim</a></span>
        </div>
      </footer>

      {whatsappLink && (
        <a className="floating-whatsapp" href={whatsappLink} target="_blank" rel="noreferrer" aria-label="WhatsApp Destek Hattı">
          <WhatsAppIcon />
          <span>WhatsApp</span>
          <strong>Ürün danış</strong>
        </a>
      )}
    </main>
  );
}
