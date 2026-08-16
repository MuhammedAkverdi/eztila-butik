import { useEffect, useRef, useState } from 'react';
import { getCatalogCategories, getStoreConfig } from '../services/catalog-service';

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8a5.5 5.5 0 0 0 1-8.8Z" />
    </svg>
  );
}

function countLabel(value) {
  const count = Number(value) || 0;
  return count > 99 ? '99+' : String(count);
}

export default function MobileNavigation({
  categories,
  favoriteCount = 0,
  accountHref = '/hesabim',
  accountLabel = 'Hesabım',
  onCategorySelect,
  onSearch,
  onSignOut,
  whatsappUrl,
}) {
  const [open, setOpen] = useState(false);
  const [fallbackCategories, setFallbackCategories] = useState([]);
  const [fallbackWhatsappUrl, setFallbackWhatsappUrl] = useState(null);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const drawerId = 'mobile-store-navigation';

  useEffect(() => {
    if (categories !== undefined && whatsappUrl !== undefined) return undefined;
    let active = true;
    Promise.all([
      categories === undefined ? getCatalogCategories().catch(() => []) : Promise.resolve([]),
      whatsappUrl === undefined ? getStoreConfig().catch(() => null) : Promise.resolve(null),
    ]).then(([catalogCategories, config]) => {
      if (!active) return;
      if (categories === undefined) setFallbackCategories(catalogCategories);
      if (whatsappUrl === undefined && config?.whatsappNumber) {
        setFallbackWhatsappUrl(`https://wa.me/${config.whatsappNumber}?text=Merhaba%20Eztila%20Butik%2C%20yard%C4%B1m%20almak%20istiyorum.`);
      }
    });
    return () => {
      active = false;
    };
  }, [categories, whatsappUrl]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus === true) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };
  const handleCategoryClick = (event, category) => {
    if (onCategorySelect) {
      event.preventDefault();
      onCategorySelect(category);
    }
    closeMenu();
  };
  const menuCategories = categories ?? fallbackCategories;
  const menuWhatsappUrl = whatsappUrl ?? fallbackWhatsappUrl;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="mobile-menu-trigger"
        aria-label="Menüyü aç"
        aria-expanded={open}
        aria-controls={drawerId}
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>

      <div className="mobile-header-tools" aria-label="Mobil hızlı işlemler">
        {onSearch ? (
          <button type="button" onClick={onSearch} aria-label="Ürün ara"><SearchIcon /></button>
        ) : (
          <a href="/?focusSearch=true#koleksiyon" aria-label="Ürün ara"><SearchIcon /></a>
        )}
        <a className="mobile-header-favorite" href="/hesabim" aria-label={`Favorilerim, ${favoriteCount} ürün`}>
          <HeartIcon />
          {favoriteCount > 0 ? <b>{countLabel(favoriteCount)}</b> : null}
        </a>
      </div>

      {open ? (
        <div className="mobile-nav-overlay" onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu(true);
        }}>
          <aside id={drawerId} className="mobile-nav-drawer" role="dialog" aria-modal="true" aria-labelledby="mobile-nav-title">
            <header>
              <div>
                <small>EZTİLA BUTİK</small>
                <h2 id="mobile-nav-title">Menü</h2>
              </div>
              <button ref={closeRef} type="button" onClick={() => closeMenu(true)} aria-label="Menüyü kapat">×</button>
            </header>

            <nav aria-label="Mobil ana menü">
              <a href="/" onClick={closeMenu}>Ana Sayfa</a>
              <a href="/#koleksiyon" onClick={closeMenu}>Tüm Koleksiyon</a>
              {menuCategories.length > 0 ? (
                <div className="mobile-nav-categories">
                  <span>Kategoriler</span>
                  {menuCategories.map((category) => (
                    <a
                      key={category.slug || category.name}
                      href={`/?category=${encodeURIComponent(category.slug || '')}#koleksiyon`}
                      onClick={(event) => handleCategoryClick(event, category)}
                    >
                      {category.name}
                    </a>
                  ))}
                </div>
              ) : null}
              <a href={accountHref} onClick={closeMenu}>{accountLabel}</a>
              {menuWhatsappUrl ? <a href={menuWhatsappUrl} target="_blank" rel="noreferrer" onClick={closeMenu}>WhatsApp Destek</a> : null}
              {onSignOut ? <button type="button" className="mobile-nav-signout" onClick={() => { closeMenu(); onSignOut(); }}>Çıkış Yap</button> : null}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
