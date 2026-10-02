'use client';

/**
 * /shop-home/sell/select-model/?category=<CODE>&brand=<brandId> — Sell a
 * Device, step 3: the brand's sellable models in the chosen category (GET
 * /master/brands/{id}/models narrowed by model.categoryId, sellActive only —
 * see sellFlow.js), each with its real catalog photo.
 *
 * This is the last step the web can offer today. The steps after it
 * (condition, price, listing) need a shop-side listing endpoint that the
 * backend doesn't expose yet, so picking a model highlights it and says so
 * rather than opening an invented form.
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Info, Smartphone } from 'lucide-react';

import { cx } from '@/components/site/ui';
import EmptyState from '@/components/shop-dashboard/EmptyState';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { SellStepHeader, SellTile } from '@/components/shop-dashboard/SellStep';
import { resolveMediaUrl } from '@/lib/deviceImage';
import { fetchBrand, fetchSellModels, findCategory } from '@/lib/sellFlow';

export default function SelectModelPage() {
  const [params, setParams] = useState(null);
  const [category, setCategory] = useState(null);
  const [brand, setBrand] = useState(null);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setParams({ code: (sp.get('category') || '').toUpperCase(), brandId: sp.get('brand') || '' });
  }, []);

  useEffect(() => {
    if (!params) return undefined;
    if (!params.brandId) {
      setLoading(false);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    setError('');
    Promise.all([findCategory(params.code), fetchBrand(params.brandId)])
      .then(async ([cat, br]) => {
        const list = await fetchSellModels(params.brandId, cat?.id);
        if (!alive) return;
        setCategory(cat);
        setBrand(br);
        setModels(list);
      })
      .catch((err) => alive && setError(err.message || 'Could not load models.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [params, reloadKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? models.filter((m) => String(m.name || '').toLowerCase().includes(q)) : models;
  }, [models, query]);

  const subtitle = [brand?.name, category?.name].filter(Boolean).join(' · ');

  return (
    <div className="-m-4 min-h-full bg-white sm:-m-6">
      <SellStepHeader title="Select Model" subtitle={subtitle} query={query} onQueryChange={setQuery} searchPlaceholder="Search models" />

      <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-5 sm:px-6 sm:py-6">
        {selected ? (
          <div className="flex items-start gap-3 rounded-2xl border border-[#FEDF89] bg-[#F8F8F8] p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#DC6803]" aria-hidden="true" />
            <div className="min-w-0 text-[13.5px] text-[#7A2E0E]">
              <p className="font-bold">
                {selected.name} selected
              </p>
              <p className="mt-0.5">
                The next steps — device condition, price and listing — aren&apos;t available on the web yet: the backend has no shop listing endpoint. Use the GGFIX Partner app to finish selling this device.
              </p>
            </div>
          </div>
        ) : null}

        {!params?.brandId && params ? (
          <EmptyState icon={Smartphone} tone="muted" title="No brand selected" description="Start from Sell a Device and pick a category and brand." />
        ) : error ? (
          <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="h-[196px] animate-pulse rounded-[18px] border border-[#ECECEC] bg-[#F8F8F8]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Smartphone}
            tone="muted"
            title={query ? 'No matches' : 'No sellable models yet'}
            description={query ? `Nothing matches “${query}”.` : `No ${[brand?.name, category?.name?.toLowerCase()].filter(Boolean).join(' ')} models are enabled for selling in master data.`}
          />
        ) : (
          <>
            <p className="text-[12.5px] font-semibold text-[#666666]">
              {filtered.length} model{filtered.length === 1 ? '' : 's'}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((m) => (
                <div key={m.id} className={cx('relative rounded-[18px]', selected?.id === m.id && 'ring-2 ring-[#079455]')}>
                  <SellTile
                    imageUrl={resolveMediaUrl(m.imageUrl) || (m.imageBase64 ? `data:image/png;base64,${m.imageBase64}` : null)}
                    name={m.name}
                    fallbackIcon={Smartphone}
                    imageClassName="h-28"
                    onClick={() => setSelected(m)}
                  />
                  {selected?.id === m.id ? (
                    <CheckCircle2 className="absolute right-2.5 top-2.5 h-5 w-5 text-[#079455]" aria-hidden="true" />
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
