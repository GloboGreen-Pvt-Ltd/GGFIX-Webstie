'use client';

/**
 * /shop-home/sell/select-brand/?category=<CODE> — Sell a Device, step 2:
 * the brands master data links to the chosen category (GET
 * /master/categories/by-code/{CODE}/brands — the same call Book Service
 * makes), each with its real logo. A brand opens step 3, Select Model, with
 * the category and brand carried in the URL.
 *
 * Without ?category= this shows step 1 instead (pick a category), which is
 * what the dashboard's Sell a Device "View All" opens.
 *
 * The category comes from window.location rather than useSearchParams so
 * the static export needs no Suspense boundary.
 */

import { useEffect, useMemo, useState } from 'react';
import { Headphones, Laptop, Smartphone, Tablet, Tag, Watch } from 'lucide-react';

import EmptyState from '@/components/shop-dashboard/EmptyState';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { SellStepHeader, SellTile } from '@/components/shop-dashboard/SellStep';
import { resolveMediaUrl } from '@/lib/deviceImage';
import { fetchCategoryBrands, fetchSellCategories, findCategory, sellBrandHref, sellModelHref } from '@/lib/sellFlow';

const CATEGORY_ICONS = { MOBILE: Smartphone, TABLET: Tablet, LAPTOP: Laptop, SMARTWATCHES: Watch, AUDIO_DEVICE: Headphones };

const GRID = 'grid grid-cols-4 gap-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8';

export default function SelectBrandPage() {
  const [code, setCode] = useState(undefined); // undefined = not read yet, '' = none given
  const [category, setCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setCode((new URLSearchParams(window.location.search).get('category') || '').toUpperCase());
  }, []);

  useEffect(() => {
    if (code === undefined) return undefined;
    let alive = true;
    setLoading(true);
    setError('');
    const work = code
      ? Promise.all([findCategory(code), fetchCategoryBrands(code)]).then(([cat, list]) => {
          if (!alive) return;
          setCategory(cat);
          setBrands(list);
        })
      : fetchSellCategories().then((list) => alive && setCategories(list));
    work
      .catch((err) => alive && setError(err.message || 'Could not load brands.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [code, reloadKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = code ? brands : categories;
    return q ? list.filter((b) => String(b.name || '').toLowerCase().includes(q)) : list;
  }, [brands, categories, code, query]);

  const choosingCategory = code === '';
  const title = choosingCategory ? 'Sell a Device' : 'Select Brand';
  const subtitle = choosingCategory
    ? 'Choose the type of device to sell'
    : category
      ? `${category.name} brands`
      : code
        ? 'Brands'
        : '';

  return (
    <div className="-m-4 min-h-full bg-white sm:-m-6">
      <SellStepHeader
        title={title}
        subtitle={subtitle}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={choosingCategory ? 'Search categories' : 'Search brands'}
      />

      <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6">
        {error ? (
          <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : loading || code === undefined ? (
          <div className={GRID}>
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} className="h-[112px] animate-pulse rounded-[18px] border border-[#ECECEC] bg-[#F8F8F8]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Tag}
            tone="muted"
            title={query ? 'No matches' : choosingCategory ? 'No categories available' : 'No brands for this category yet'}
            description={query ? `Nothing matches “${query}”.` : 'Brands linked to this category in master data will appear here.'}
          />
        ) : choosingCategory ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {filtered.map((c) => (
              <SellTile
                key={c.code}
                href={sellBrandHref(c.code)}
                imageUrl={resolveMediaUrl(c.imageUrl)}
                name={c.name}
                fallbackIcon={CATEGORY_ICONS[c.code] || Smartphone}
                imageClassName="h-24"
              />
            ))}
          </div>
        ) : (
          <div className={GRID}>
            {filtered.map((b) => (
              <SellTile
                key={b.id}
                href={sellModelHref(code, b.id)}
                imageUrl={resolveMediaUrl(b.imageUrl) || (b.imageBase64 ? `data:image/png;base64,${b.imageBase64}` : null)}
                name={b.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
