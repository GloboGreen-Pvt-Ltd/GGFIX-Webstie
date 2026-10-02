'use client';

/**
 * /shop-home/services/marketplace — browse the GGFIX marketplace catalog.
 *
 * Data (all public, read-only):
 *   - GET {MARKETPLACE_BASE}/marketplace/products  — the product catalog the
 *     admin manages at /management/items ({ title, type, brandId, modelId,
 *     price, status, imageUrl }; any extra fields such as condition, shop
 *     name, city or warranty are shown when a product carries them).
 *   - GET /master/device-categories                — the category cards.
 *   - GET /master/brands[/{id}/models]             — brand/model names, the
 *     model photo when a product has none, and the model's categoryId, which
 *     is how a product is placed in a category (products carry no category
 *     of their own).
 *
 * ?category=<CODE> preselects a category — the dashboard's Marketplace tiles
 * link here with it. Read from window.location (not useSearchParams) so the
 * static export needs no Suspense boundary; changes update the URL with
 * history.replaceState so a refresh or shared link keeps the filter.
 *
 * Search, brand, type and sort are client-side over the loaded catalog —
 * the products endpoint takes no filter params. Browse only: there is no
 * shop-side cart or buy endpoint in this client (the cart API is
 * customer-scoped), so cards show details and price, not a buy button.
 *
 * Banner art: /images/marketplace-hero.png when that file exists, otherwise
 * the bundled /buy.png device shot.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BadgePercent,
  Cog,
  Headphones,
  Laptop,
  LayoutGrid,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Store,
  Tablet,
  Truck,
  Watch,
  Wrench,
  X,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import { MARKETPLACE_BASE, MASTER_BASE } from '@/lib/api';
import { DEVICE_CATEGORIES, sortDeviceCategories } from '@/lib/siteContent';
import { loadCatalog, resolveMediaUrl } from '@/lib/deviceImage';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';

const CATEGORY_ICONS = {
  MOBILE: Smartphone,
  TABLET: Tablet,
  LAPTOP: Laptop,
  SMARTWATCHES: Watch,
  AUDIO_DEVICE: Headphones,
};

// Soft per-category card tints (All first), cycled by position.
const TINTS = ['bg-[#F3F3F3]', 'bg-[#EEF7FF]', 'bg-[#F5EFFF]', 'bg-[#FFF0F2]', 'bg-[#FFF5E8]', 'bg-[#F3F3F3]', 'bg-[#F3F3F3]'];

const BENEFITS = [
  { icon: ShieldCheck, title: 'Verified Sellers', subtitle: '100% Trusted', tone: 'bg-[#F3F3F3] text-[#079455]' },
  { icon: BadgePercent, title: 'Best Prices', subtitle: 'Great Discounts', tone: 'bg-[#EEF7FF] text-[#1570EF]' },
  { icon: RotateCcw, title: 'Easy Returns', subtitle: '7 Days Policy', tone: 'bg-[#FFF5E8] text-[#F79009]' },
  { icon: BadgeCheck, title: 'Warranty', subtitle: 'Brand Warranty', tone: 'bg-[#F5EFFF] text-[#7F56D9]' },
];

const SORTS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A to Z' },
];

const CONTROL = 'rounded-[14px] border border-[#ECECEC] bg-[#F8F8F8]';

// Public master data, fetched WITHOUT any login token: masterApi would attach a
// stored admin token, and an expired one makes these public lists 401 — the
// page then silently fell back to the old cards.
async function fetchMaster(path) {
  const res = await fetch(`${MASTER_BASE().replace(/\/+$/, '')}${path}`, { credentials: 'omit', headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status}).`);
  return res.json();
}

async function fetchProducts() {
  const res = await fetch(`${MARKETPLACE_BASE().replace(/\/+$/, '')}/marketplace/products`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Could not load marketplace products (${res.status}).`);
  const body = await res.json().catch(() => []);
  return Array.isArray(body) ? body : Array.isArray(body?.content) ? body.content : [];
}

function Img({ src, fallbackIcon: Fallback, className = 'h-full w-full', iconClassName = 'h-10 w-10' }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (!src || broken) return <Fallback className={cx(iconClassName, 'text-[#079455]/50')} aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element -- remote catalog photos, not app assets Next can optimize.
  return <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className={cx('object-contain object-center', className)} />;
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[#ECECEC] bg-[#F8F8F8] py-8">
      <div className="relative flex h-full max-w-[600px] flex-col justify-center px-6 sm:px-10">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#475467]">
          <span className="rounded-lg bg-[#067647] px-2 py-0.5 text-[12px] font-extrabold tracking-wide text-white">GGFIX</span>
          Your Tech Service Partner
        </p>
        <h2 className="mt-3 text-[30px] font-extrabold leading-[1.1] tracking-tight text-[#111111] sm:text-[38px]">
          Device Service <span className="text-[#079455]">Made Simple</span>
        </h2>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-semibold text-[#344054]">
          {[
            { icon: Wrench, label: 'Trusted Technicians' },
            { icon: Cog, label: 'Genuine Parts' },
            { icon: Truck, label: 'Doorstep Pickup' },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-[#079455]">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              {label}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <Link
            href="/shop-home/services/book-service"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#F3BF23] px-6 text-[15px] font-bold text-[#1E1E1E] transition hover:bg-[#E5B11A]"
          >
            Book a Service
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section className="grid grid-cols-2 gap-2 rounded-[20px] border border-[#ECECEC] bg-[#F8F8F8] p-3 lg:grid-cols-4 lg:divide-x lg:divide-[#ECECEC] lg:p-5">
      {BENEFITS.map(({ icon: Icon, title, subtitle, tone }) => (
        <div key={title} className="flex flex-col items-center px-2 py-3 text-center sm:flex-row sm:justify-center sm:gap-3 sm:text-left">
          <span className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', tone)}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="mt-2 sm:mt-0">
            <span className="block text-[14.5px] font-extrabold text-[#111111]">{title}</span>
            <span className="block text-[12.5px] text-[#666666]">{subtitle}</span>
          </span>
        </div>
      ))}
    </section>
  );
}

function ProductCard({ p }) {
  const Fallback = CATEGORY_ICONS[p.categoryCode] || Smartphone;
  const meta = [p.condition || p.deviceCondition, p.warranty || p.warrantyLabel].filter(Boolean);
  const seller = p.shopName || p.sellerName;
  const place = p.city || p.shopCity || p.location;
  return (
    <article className="flex flex-col overflow-hidden rounded-[18px] border border-[#ECECEC] bg-[#F8F8F8] transition hover:-translate-y-0.5">
      <div className="relative flex h-44 items-center justify-center bg-[#F8F8F8] p-4">
        <Img src={p.image} fallbackIcon={Fallback} iconClassName="h-12 w-12" />
        {p.type ? (
          <span className="absolute left-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#475467] shadow-sm">{p.type}</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        {p.brandName ? <p className="text-[11.5px] font-bold uppercase tracking-wide text-[#079455]">{p.brandName}</p> : null}
        <p className="line-clamp-2 text-[14px] font-bold leading-snug text-[#111111]" title={p.title}>
          {p.title || p.modelName || 'Product'}
        </p>
        {p.modelName && p.modelName !== p.title ? <p className="truncate text-[12px] text-[#666666]">{p.modelName}</p> : null}
        {meta.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {meta.map((m) => (
              <span key={m} className="rounded-md bg-[#F3F3F3] px-1.5 py-0.5 text-[11px] font-semibold text-[#475467]">
                {m}
              </span>
            ))}
          </div>
        ) : null}
        {seller || place ? (
          <p className="mt-2 flex items-center gap-1 truncate text-[12px] text-[#666666]">
            {seller ? <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            <span className="truncate">{[seller, place].filter(Boolean).join(' · ')}</span>
          </p>
        ) : null}
        <p className="mt-auto pt-3 text-[18px] font-extrabold text-[#067647]">₹{Number(p.price || 0).toLocaleString('en-IN')}</p>
      </div>
    </article>
  );
}

export default function MarketplacePage() {
  const [categories, setCategories] = useState(() => (Array.isArray(DEVICE_CATEGORIES) ? DEVICE_CATEGORIES : []));
  const [products, setProducts] = useState([]);
  const [catalog, setCatalog] = useState({ brands: new Map(), modelsById: new Map() });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState('ALL');
  const [query, setQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sort, setSort] = useState('relevance');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('category');
    if (code) setActive(code.toUpperCase());
  }, []);

  // Category cards = the BUY rows of the admin's Category Menu
  // (GET /master/category-menu: active only, by sortOrder, with their own
  // images). Each is matched to its device category by name ("Buy Mobile" ->
  // Mobile) so products still filter by category. null = not loaded / failed,
  // in which case the device categories themselves are the cards (as before).
  const [buyMenu, setBuyMenu] = useState(null);
  useEffect(() => {
    fetchMaster('/master/category-menu')
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setBuyMenu(
          rows
            .filter((r) => String(r.categoryType).toUpperCase() === 'BUY' && r.isActive !== false)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchMaster('/master/device-categories')
      .then((rows) => {
        if (!Array.isArray(rows) || !rows.length) return;
        const list = sortDeviceCategories(rows.filter((c) => c.isActive !== false));
        if (Array.isArray(list) && list.length) setCategories(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetchProducts()
      .then(async (rows) => {
        const live = rows.filter((p) => !p.status || String(p.status).toUpperCase() === 'ACTIVE');
        const cat = await loadCatalog(live.map((p) => p.brandId));
        if (!alive) return;
        setProducts(live);
        setCatalog(cat);
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load marketplace products.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  function selectCategory(code) {
    setActive(code);
    setBrandFilter('');
    const url = new URL(window.location.href);
    if (code === 'ALL') url.searchParams.delete('category');
    else url.searchParams.set('category', code);
    window.history.replaceState(null, '', url);
  }

  const rows = useMemo(
    () =>
      products.map((p) => {
        const model = p.modelId ? catalog.modelsById.get(String(p.modelId)) : null;
        const brand = p.brandId ? catalog.brands.get(String(p.brandId)) : null;
        const category = categories.find((c) => model?.categoryId && c.id === model.categoryId);
        return {
          ...p,
          modelName: model?.name,
          brandName: brand?.name,
          categoryCode: category?.code,
          image: resolveMediaUrl(p.imageUrl) || resolveMediaUrl(model?.imageUrl) || resolveMediaUrl(brand?.imageUrl),
        };
      }),
    [products, catalog, categories],
  );

  const counts = useMemo(() => {
    const c = { ALL: rows.length };
    rows.forEach((r) => {
      if (r.categoryCode) c[r.categoryCode] = (c[r.categoryCode] || 0) + 1;
    });
    return c;
  }, [rows]);

  const inCategory = useMemo(() => rows.filter((r) => active === 'ALL' || r.categoryCode === active), [rows, active]);

  // Brand/type options come from what's actually listed in this category.
  const brandOptions = useMemo(() => {
    const m = new Map();
    inCategory.forEach((r) => r.brandId && r.brandName && m.set(String(r.brandId), r.brandName));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [inCategory]);
  const typeOptions = useMemo(() => [...new Set(rows.map((r) => r.type).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = inCategory.filter((r) => {
      if (brandFilter && String(r.brandId) !== brandFilter) return false;
      if (typeFilter && r.type !== typeFilter) return false;
      if (!q) return true;
      return [r.title, r.modelName, r.brandName, r.type].some((v) => String(v || '').toLowerCase().includes(q));
    });
    if (sort === 'price-asc') return [...list].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === 'price-desc') return [...list].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sort === 'name') return [...list].sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    return list;
  }, [inCategory, query, brandFilter, typeFilter, sort]);

  const activeCategory = categories.find((c) => c.code === active);
  const sectionName = activeCategory?.name || 'All Items';
  const activeFilters = (brandFilter ? 1 : 0) + (typeFilter ? 1 : 0) + (sort !== 'relevance' ? 1 : 0);
  const menuTabs = useMemo(() => {
    if (!buyMenu) return null;
    const norm = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return buyMenu.map((m) => {
      const label = String(m.menuName || '').replace(/^\s*buy\s+/i, '').trim() || m.menuName;
      const device = categories.find((c) => norm(c.name) === norm(label) || norm(c.code) === norm(label).replace(/ /g, '_'));
      return { code: device?.code || `MENU_${m.id}`, name: label, imageUrl: m.imageUrl };
    });
  }, [buyMenu, categories]);
  const tabs = [{ code: 'ALL', name: 'All', imageUrl: null }, ...(menuTabs || categories)];

  // A ?category= link to a category that isn't on the Buy menu (e.g. a switched-off one) falls back to All.
  useEffect(() => {
    if (menuTabs && active !== 'ALL' && !menuTabs.some((t) => t.code === active)) setActive('ALL');
  }, [menuTabs, active]);

  function clearFilters() {
    setBrandFilter('');
    setTypeFilter('');
    setSort('relevance');
  }

  const selectCls = cx(CONTROL, 'h-11 px-3 text-[13.5px] font-semibold text-[#111111] focus:border-[#079455] focus:outline-none');

  return (
    <div className="-m-4 min-h-full space-y-5 bg-white p-4 sm:-m-6 sm:p-6">
      {/* ---- Header ------------------------------------------------------ */}
      <div className="rounded-[22px] border border-[#ECECEC] bg-[#F8F8F8] p-6 sm:p-7">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight text-[#111111] sm:text-[34px]">Buy</h1>
        <p className="mt-1 text-[14px] text-[#666666] sm:text-[15px]">Browse devices and products listed in the GGFIX marketplace.</p>
      </div>

      {/* ---- Search + Filters -------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <label className={cx(CONTROL, 'flex h-14 min-w-0 flex-1 items-center gap-3 px-4 transition focus-within:border-[#079455] focus-within:ring-4 focus-within:ring-[#079455]/10')}>
            <Search className="h-5 w-5 shrink-0 text-[#98A2B3]" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mobiles, spares, accessories..."
              aria-label="Search marketplace"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[#111111] outline-none placeholder:text-[#98A2B3]"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-[#98A2B3] hover:text-[#344054]">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className={cx(
              CONTROL,
              'inline-flex h-14 shrink-0 items-center gap-2 px-4 text-[14.5px] font-bold transition sm:px-5',
              filtersOpen || activeFilters ? 'border-[#079455] bg-[#F3F3F3] text-[#067647]' : 'text-[#111111] hover:border-[#079455]',
            )}
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters ? <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#079455] px-1 text-[11px] text-white">{activeFilters}</span> : null}
          </button>
        </div>

        {filtersOpen ? (
          <div className={cx(CONTROL, 'flex flex-wrap items-end gap-3 p-4')}>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[12px] font-bold uppercase tracking-wide text-[#666666]">
              Brand
              <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className={selectCls}>
                <option value="">All brands</option>
                {brandOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-[12px] font-bold uppercase tracking-wide text-[#666666]">
              Type
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
                <option value="">All types</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[12px] font-bold uppercase tracking-wide text-[#666666]">
              Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!activeFilters}
              className="h-11 rounded-[14px] px-4 text-[13.5px] font-bold text-[#067647] transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:text-[#98A2B3] disabled:hover:bg-transparent"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      {/* ---- Category cards ---------------------------------------------- */}
      <div role="tablist" aria-label="Categories" className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] lg:grid lg:overflow-visible [&::-webkit-scrollbar]:hidden"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((c, i) => {
          const selected = active === c.code;
          const Fallback = c.code === 'ALL' ? LayoutGrid : CATEGORY_ICONS[c.code] || Smartphone;
          const n = counts[c.code] || 0;
          return (
            <button
              key={c.code}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectCategory(c.code)}
              className={cx(
                'flex w-[150px] shrink-0 snap-start flex-col items-center rounded-[18px] border-2 p-3 text-center transition lg:w-auto',
                selected ? 'border-[#079455] bg-[#F3F3F3]' : 'border-transparent bg-white hover:border-[#ECECEC]',
              )}
            >
              <span className={cx('flex h-20 w-full items-center justify-center rounded-xl p-2', selected ? 'bg-white/70' : TINTS[i % TINTS.length])}>
                <Img src={resolveMediaUrl(c.imageUrl)} fallbackIcon={Fallback} iconClassName="h-9 w-9" />
              </span>
              <span className={cx('mt-2 text-[14px] font-bold', selected ? 'text-[#067647]' : 'text-[#111111]')}>{c.name}</span>
              <span className="text-[12px] text-[#666666]">{loading ? '…' : `${n} item${n === 1 ? '' : 's'}`}</span>
            </button>
          );
        })}
      </div>

      <Hero />
      <Benefits />

      {/* ---- Section header + products ------------------------------------ */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[22px] font-extrabold tracking-tight text-[#111111]">{sectionName}</h2>
          <span className="rounded-full bg-[#F3F3F3] px-2.5 py-0.5 text-[12.5px] font-bold text-[#067647]">
            {loading ? '…' : `${filtered.length} item${filtered.length === 1 ? '' : 's'}`}
          </span>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            aria-label="Filter by brand"
            disabled={!brandOptions.length}
            className={cx(selectCls, 'ml-auto h-10 min-w-[150px] disabled:cursor-not-allowed disabled:text-[#98A2B3]')}
          >
            <option value="">Brand</option>
            {brandOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} /> : null}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="h-[292px] animate-pulse rounded-[18px] border border-[#ECECEC] bg-[#F8F8F8]" />
            ))}
          </div>
        ) : error ? null : filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-[20px] border border-[#ECECEC] bg-[#F8F8F8] px-4 py-14 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3F3F3] text-[#079455]">
              <Store className="h-8 w-8" aria-hidden="true" />
            </span>
            <p className="mt-4 text-[16px] font-extrabold text-[#111111]">
              {query || activeFilters
                ? 'No items match your search'
                : `No ${activeCategory ? activeCategory.name.toLowerCase() : 'marketplace'} items yet`}
            </p>
            <p className="mt-1 max-w-md text-[13.5px] text-[#666666]">
              {query || activeFilters
                ? 'Try a different search term, brand or filter.'
                : 'Listings from customers, shops and shop catalogue will appear here.'}
            </p>
            {query || activeFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  clearFilters();
                }}
                className="mt-4 rounded-xl border border-[#ECECEC] bg-white px-4 py-2 text-[13.5px] font-bold text-[#067647] transition hover:bg-[#F3F3F3]"
              >
                Clear search &amp; filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
