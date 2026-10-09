'use client';

/**
 * /shop-home/services/model-compatibility — "will this part fit?", the web
 * counterpart of the Partner app's OwnerModelCompatibilityScreen.
 *
 * Three part-type tabs, labels from the admin's model-compatibility types:
 *   Mobile Model Number  the manufacturer part-number index built from the
 *                        whole model catalogue (lib/modelCompatibility.js).
 *                        A row opens that model's detail: its part numbers
 *                        and every model sharing one.
 *   Tempered Glass /     one card per shelf box from
 *   UV Glass             GET /master/model-compatibility?type=<slug>, its
 *                        models grouped by brand. Search filters to the boxes
 *                        that fit and highlights the matching models.
 *
 * Read-only; boxes are maintained in the admin panel (Master Data → Model
 * Compatibility). ?tab= keeps the selected tab across refresh/back.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Barcode, Boxes, ChevronRight, Info, Loader2, Puzzle, Search, Smartphone, X } from 'lucide-react';

import { cx } from '@/components/site/ui';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { resolveMediaUrl } from '@/lib/deviceImage';
import { readQueryParam, writeQueryParam } from '@/lib/orderStages';
import {
  boxMatches,
  boxModelLabel,
  brandCount,
  buildCompatIndex,
  findByCode,
  findInterchangeable,
  getAllModels,
  getBrands,
  getCompatibilityBoxes,
  getCompatibilityTypes,
  getDeviceCategories,
  groupModelsByBrand,
  looksLikeCode,
  normalizeCode,
  searchModels,
  modelsWithCrossFit,
} from '@/lib/modelCompatibility';

const INDEX_SLUG = 'mobile-model-number';
// The three tabs this page shows, in order; names come from the admin's types when present.
const TAB_DEFS = [
  { slug: INDEX_SLUG, key: 'all', name: 'Mobile Model Number' },
  { slug: 'tempered-glass', key: 'tempered-glass', name: 'Tempered Glass' },
  { slug: 'uv-glass', key: 'uv-glass', name: 'UV Glass' },
];
const TAB_KEYS = TAB_DEFS.map((t) => t.key);
const PAGE = 60;

const CARD = 'rounded-[20px] border border-[#ECECEC] bg-[#F8F8F8]';
const plural = (n, one, many = `${one}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;

export default function ModelCompatibilityPage() {
  const router = useRouter();
  const [tabKey, setTabKey] = useState('all');
  const [types, setTypes] = useState([]);
  const [query, setQuery] = useState('');

  // Catalogue (Mobile Model Number)
  const [index, setIndex] = useState(null);
  const [mobileCategoryId, setMobileCategoryId] = useState(null);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState('');
  const [catReload, setCatReload] = useState(0);
  const [selected, setSelected] = useState(null);

  // Boxes (glass tabs), cached per slug
  const [boxesBySlug, setBoxesBySlug] = useState({});
  const [boxError, setBoxError] = useState('');
  const [boxReload, setBoxReload] = useState(0);

  useEffect(() => {
    setTabKey(readQueryParam('tab', TAB_KEYS));
    getCompatibilityTypes().then(setTypes).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setCatLoading(true);
    setCatError('');
    Promise.all([getAllModels({ force: catReload > 0 }), getBrands().catch(() => []), getDeviceCategories().catch(() => [])])
      .then(([models, brands, categories]) => {
        if (!alive) return;
        const active = categories.filter((c) => c?.isActive !== false);
        const mobile =
          active.find((c) => String(c.code || '').toUpperCase() === 'MOBILE') || active.find((c) => String(c.name || '').trim().toLowerCase() === 'mobile');
        setMobileCategoryId(mobile?.id || null);
        setIndex(buildCompatIndex(models, { brands, categories: active }));
      })
      .catch((err) => alive && setCatError(err.message || 'Could not load the model catalogue.'))
      .finally(() => alive && setCatLoading(false));
    return () => {
      alive = false;
    };
  }, [catReload]);

  const tabs = useMemo(
    () => TAB_DEFS.map((t) => ({ ...t, name: types.find((x) => x.slug === t.slug)?.name || t.name })),
    [types],
  );
  const tab = tabs.find((t) => t.key === tabKey) || tabs[0];
  const isIndex = tab.slug === INDEX_SLUG;
  const boxes = boxesBySlug[tab.slug];

  useEffect(() => {
    if (isIndex) return undefined;
    let alive = true;
    setBoxError('');
    getCompatibilityBoxes(tab.slug)
      .then((rows) => alive && setBoxesBySlug((prev) => ({ ...prev, [tab.slug]: rows })))
      .catch((err) => {
        if (!alive) return;
        setBoxError(err.message || 'Could not load boxes for this type.');
        setBoxesBySlug((prev) => ({ ...prev, [tab.slug]: prev[tab.slug] || [] }));
      });
    return () => {
      alive = false;
    };
  }, [tab.slug, isIndex, boxReload]);

  function selectTab(key) {
    setTabKey(key);
    setQuery('');
    setSelected(null);
    writeQueryParam('tab', key);
  }

  const back = useCallback(() => {
    if (selected) setSelected(null);
    else if (window.history.length > 1) router.back();
    else router.push('/shop-home');
  }, [router, selected]);

  const trimmed = query.trim();
  const visibleBoxes = useMemo(() => (boxes || []).filter((b) => boxMatches(b, trimmed)), [boxes, trimmed]);

  const subtitle = isIndex
    ? index
      ? `${plural(index.entries.length, 'model')} · ${plural(index.byCode.size, 'part number')}`
      : ''
    : boxes
      ? plural(visibleBoxes.length, 'box', 'boxes')
      : '';

  return (
    <div className="-m-4 min-h-full bg-white p-4 sm:-m-6 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={back}
            aria-label="Back"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ECECEC] bg-white text-[#111111] transition hover:border-[#079455] hover:text-[#079455]"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-extrabold leading-tight tracking-tight text-[#111111] sm:text-[26px]">
              {selected ? selected.name : 'Model Compatibility'}
            </h1>
            <p className="truncate text-[13px] text-[#666666]">{selected ? selected.brandName || ' ' : subtitle || ' '}</p>
          </div>
        </header>

        {selected ? (
          <CompatibilityDetail
            index={index}
            model={selected}
            onOpenModel={setSelected}
            onLookupCode={(code) => {
              setSelected(null);
              setQuery(code);
            }}
          />
        ) : (
          <>
            <CompatibilityTabs tabs={tabs} value={tab.key} onChange={selectTab} />
            <CompatibilitySearch
              value={query}
              onChange={setQuery}
              placeholder={isIndex ? 'Model name or part number (e.g. SM-A127F)' : 'Box number, brand or model'}
            />

            {isIndex ? (
              <ModelIndexView
                index={index}
                loading={catLoading}
                error={catError}
                onRetry={() => setCatReload((k) => k + 1)}
                query={trimmed}
                mobileCategoryId={mobileCategoryId}
                onOpenModel={setSelected}
              />
            ) : (
              <BoxListView
                boxes={boxes}
                visible={visibleBoxes}
                error={boxError}
                onRetry={() => setBoxReload((k) => k + 1)}
                query={trimmed}
                typeName={tab.name}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared pieces                                                               */
/* -------------------------------------------------------------------------- */

function CompatibilityTabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" aria-label="Part types" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cx(
              'shrink-0 rounded-full border px-5 py-2.5 text-[14px] font-bold transition',
              active ? 'border-[#0B6B3A] bg-[#0B6B3A] text-white' : 'border-[#ECECEC] bg-white text-[#475467] hover:border-[#ECECEC]',
            )}
          >
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

function CompatibilitySearch({ value, onChange, placeholder }) {
  return (
    <label className="flex h-14 items-center gap-3 rounded-[18px] border border-[#ECECEC] bg-[#F8F8F8] px-4 transition focus-within:border-[#079455] focus-within:ring-4 focus-within:ring-[#079455]/10">
      <Search className="h-5 w-5 shrink-0 text-[#98A2B3]" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-[#111111] outline-none placeholder:text-[#98A2B3] [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="-m-1.5 shrink-0 p-1.5 text-[#98A2B3] hover:text-[#344054]">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </label>
  );
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <p className="flex items-center gap-2 text-[15px] font-extrabold text-[#111111]">
      <Icon className="h-[18px] w-[18px] text-[#0B6B3A]" aria-hidden="true" />
      {children}
    </p>
  );
}

function CompatibilityEmptyState({ icon: Icon = Boxes, title, text }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[#F3F3F3] text-[#0B6B3A]">
        <Icon className="h-10 w-10" aria-hidden="true" />
      </span>
      <p className="mt-4 text-[18px] font-extrabold text-[#111111]">{title}</p>
      <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-[#666666]">{text}</p>
    </div>
  );
}

function Loading({ label }) {
  return (
    <div className="flex flex-col items-center py-16 text-[#666666]">
      <Loader2 className="h-6 w-6 animate-spin text-[#079455]" aria-hidden="true" />
      <p className="mt-2 text-[13px]">{label}</p>
    </div>
  );
}

function ModelThumb({ url, size = 'h-12 w-12' }) {
  const [broken, setBroken] = useState(false);
  const src = resolveMediaUrl(url);
  useEffect(() => setBroken(false), [src]);
  return (
    <span className={cx('flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F3F3F3] p-1', size)}>
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- catalog images are arbitrary media URLs.
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-contain" />
      ) : (
        <Smartphone className="h-5 w-5 text-[#98A2B3]" aria-hidden="true" />
      )}
    </span>
  );
}

function ModelCompatibilityRow({ model, badge, onClick }) {
  return (
    <button type="button" onClick={onClick} className={cx(CARD, 'flex w-full items-center gap-3 p-3 text-left transition hover:border-[#ECECEC]')}>
      <ModelThumb url={model.imageUrl} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-bold text-[#111111]">{model.name}</span>
        <span className="block truncate text-[12.5px] text-[#666666]">{[model.brandName, model.codes?.[0]].filter(Boolean).join(' · ') || '—'}</span>
      </span>
      {badge ? <span className="max-w-[40%] shrink-0 truncate rounded-full bg-[#F3F3F3] px-2.5 py-1 text-[11px] font-extrabold text-[#0B6B3A]">{badge}</span> : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-[#98A2B3]" aria-hidden="true" />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile Model Number                                                         */
/* -------------------------------------------------------------------------- */

function ModelIndexView({ index, loading, error, onRetry, query, mobileCategoryId, onOpenModel }) {
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [query]);

  const results = useMemo(() => (index && query ? searchModels(index, query) : []), [index, query]);
  const suggestions = useMemo(() => (index && !query ? modelsWithCrossFit(index, mobileCategoryId ? { categoryId: mobileCategoryId } : {}) : []), [index, query, mobileCategoryId]);
  const codeHits = useMemo(() => {
    if (!index || !query || !looksLikeCode(query)) return null;
    const hits = findByCode(index, query);
    return hits.length ? { code: normalizeCode(query), hits } : null;
  }, [index, query]);

  if (loading && !index) return <Loading label="Loading model catalogue…" />;
  if (error && !index) return <ErrorBanner message={error} onRetry={onRetry} />;

  const list = query ? results : suggestions;

  return (
    <section className="space-y-3">
      {error ? <ErrorBanner message={`Couldn’t refresh the catalogue — showing the last copy. ${error}`} onRetry={onRetry} /> : null}
      {codeHits ? <CodeBanner code={codeHits.code} hits={codeHits.hits} onOpenModel={onOpenModel} /> : null}

      <div>
        <SectionLabel icon={query ? Search : Puzzle}>
          {query ? plural(results.length, 'match', 'matches') : `${mobileCategoryId ? 'Mobile devices' : 'Devices'} with a known cross-fit · ${suggestions.length.toLocaleString('en-IN')}`}
        </SectionLabel>
        {!query ? (
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-[#666666]">
            These share a manufacturer part number with at least one other device. Search above to look up any model — including laptops and other categories — or
            type the code printed on a part.
          </p>
        ) : null}
      </div>

      {list.length ? (
        <>
          <div className="grid gap-2.5 md:grid-cols-2">
            {list.slice(0, limit).map((m) => (
              <ModelCompatibilityRow key={m.id} model={m} onClick={() => onOpenModel(m)} />
            ))}
          </div>
          {list.length > limit ? (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setLimit((n) => n + PAGE)}
                className="rounded-full border border-[#ECECEC] bg-white px-5 py-2.5 text-[13.5px] font-bold text-[#067647] transition hover:bg-[#F3F3F3]"
              >
                Show more · {(list.length - limit).toLocaleString('en-IN')} left
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <CompatibilityEmptyState
          icon={Search}
          title={query ? 'No model matched' : 'Nothing to show'}
          text={
            query
              ? `Nothing in the catalogue is named or numbered “${query}”. Check the spelling.`
              : 'No mobile device in the catalogue shares a part number with another yet. Search above to look up any model.'
          }
        />
      )}
    </section>
  );
}

function CodeBanner({ code, hits, onOpenModel }) {
  return (
    <div className="rounded-[18px] border border-[#ECECEC] bg-[#F3F3F3] p-4">
      <p className="flex items-center gap-2 break-all text-[13.5px] font-extrabold tracking-wide text-[#0B6B3A]">
        <Barcode className="h-4 w-4 shrink-0" aria-hidden="true" />
        {code}
      </p>
      <p className="mt-1 text-[13px] text-[#344054]">
        {hits.length === 1 ? 'This part number belongs to one model:' : `This part number is shared by ${hits.length} models — a part for any one of them fits the rest:`}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-4">
        {hits.map((m) => (
          <button key={m.id} type="button" onClick={() => onOpenModel(m)} className="flex items-center gap-1 py-1 text-[13.5px] font-bold text-[#0B6B3A] hover:underline">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            {m.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function CompatibilityDetail({ index, model, onOpenModel, onLookupCode }) {
  const entry = index?.byId.get(model.id) || model;
  const matches = useMemo(() => findInterchangeable(index, entry), [index, entry]);
  const codes = entry.codes || [];
  const specs = Array.isArray(entry.ramStorage) ? entry.ramStorage : [];
  const colors = Array.isArray(entry.colors) ? entry.colors : [];

  // Braces on purpose: the effect must return nothing. A one-liner returned
  // whatever window.scrollTo returns — and when a browser extension wraps
  // scrollTo to return a value, React called that value as the cleanup and
  // threw "TypeError: destroy is not a function" on every model click.
  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [entry.id]);

  return (
    <div className="space-y-5">
      <div className={cx(CARD, 'flex items-center gap-4 p-4')}>
        <ModelThumb url={entry.imageUrl} size="h-16 w-16" />
        <div className="min-w-0">
          <p className="truncate text-[17px] font-extrabold text-[#111111]">{entry.name}</p>
          <p className="truncate text-[13px] text-[#666666]">{[entry.brandName, entry.categoryName].filter(Boolean).join(' · ') || 'Device'}</p>
        </div>
      </div>

      <section className="space-y-2">
        <SectionLabel icon={Barcode}>Part numbers on this device</SectionLabel>
        {codes.length ? (
          <div className="flex flex-wrap gap-2">
            {codes.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onLookupCode(code)}
                title="Find every model with this part number"
                className="inline-flex max-w-full items-center gap-1.5 break-all rounded-full border border-[#ECECEC] bg-[#F3F3F3] px-3.5 py-2 text-[13px] font-extrabold tracking-wide text-[#0B6B3A] transition hover:bg-[#F3F3F3]"
              >
                {code}
                <Search className="h-3 w-3" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <Notice warn>No part number recorded for this model, so compatibility can&apos;t be confirmed from the catalogue. Add it in the admin Models screen.</Notice>
        )}
      </section>

      <section className="space-y-2">
        <SectionLabel icon={Puzzle}>Interchangeable · {matches.length}</SectionLabel>
        {matches.length ? (
          <>
            <p className="text-[13px] text-[#666666]">Same manufacturer part number — parts for these are the same hardware.</p>
            <div className="grid gap-2.5 md:grid-cols-2">
              {matches.map(({ model: m, sharedCodes }) => (
                <ModelCompatibilityRow key={m.id} model={m} badge={sharedCodes.join(' · ')} onClick={() => onOpenModel(m)} />
              ))}
            </div>
          </>
        ) : (
          <Notice>
            {codes.length
              ? 'No other model in the catalogue shares a part number with this device. Treat its parts as model-specific.'
              : 'Nothing to compare against until this model has a part number.'}
          </Notice>
        )}
      </section>

      {specs.length || colors.length ? (
        <section className="space-y-2">
          <SectionLabel icon={Boxes}>Variants on record</SectionLabel>
          <div className={cx(CARD, 'space-y-3 p-4')}>
            {[
              ['RAM / Storage', specs],
              ['Colours', colors],
            ]
              .filter(([, list]) => list.length)
              .map(([label, list]) => (
                <div key={label}>
                  <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#98A2B3]">{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((v) => (
                      <ModelChip key={v} label={v} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Notice({ children, warn }) {
  return (
    <p className={cx('flex gap-2.5 rounded-2xl p-3.5 text-[13px] leading-relaxed', warn ? 'border border-[#FEDF89] bg-[#FFFAEB] text-[#93370D]' : cx(CARD, 'text-[#666666]'))}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Glass boxes                                                                 */
/* -------------------------------------------------------------------------- */

function BoxListView({ boxes, visible, error, onRetry, query, typeName }) {
  if (!boxes) return error ? <ErrorBanner message={error} onRetry={onRetry} /> : <Loading label={`Loading ${typeName}…`} />;

  return (
    <section className="space-y-3">
      {error ? <ErrorBanner message={`Couldn’t refresh — showing the last copy. ${error}`} onRetry={onRetry} /> : null}
      {boxes.length ? (
        <div>
          <SectionLabel icon={Boxes}>{query ? plural(visible.length, 'match', 'matches') : `${typeName} · ${boxes.length.toLocaleString('en-IN')}`}</SectionLabel>
          {!query ? <p className="mt-1 text-[13px] text-[#666666]">Each card is one box on the shelf and the models its part fits. Search a model to find which box to open.</p> : null}
        </div>
      ) : null}

      {visible.length ? (
        <div className="space-y-3">
          {visible.map((box) => (
            <GlassBoxCard key={box.id} box={box} query={query} />
          ))}
        </div>
      ) : boxes.length ? (
        <CompatibilityEmptyState title="No box matched" text={`Nothing under ${typeName} is numbered “${query}” or lists a matching model.`} />
      ) : (
        <CompatibilityEmptyState
          title="No boxes yet"
          text={`No ${typeName} boxes have been set up yet. Add them in the admin panel under Master Data → Model Compatibility.`}
        />
      )}
    </section>
  );
}

function GlassBoxCard({ box, query }) {
  const [pickedId, setPickedId] = useState(null);
  const models = useMemo(() => box.models || [], [box.models]);
  const brands = brandCount(models);
  const groups = useMemo(() => groupModelsByBrand(models), [models]);
  const needle = query.toLowerCase();
  const isMatch = (m) => Boolean(needle) && boxModelLabel(m).toLowerCase().includes(needle);
  const matchCount = needle ? models.filter(isMatch).length : 0;

  return (
    <article className={cx(CARD, 'p-4 sm:p-5')}>
      <div className="flex items-start gap-3">
        {box.referenceImageUrl ? <ModelThumb url={box.referenceImageUrl} size="h-11 w-11" /> : null}
        <p className="min-w-0 flex-1 break-words text-[16px] font-extrabold text-[#111111]">
          {box.boxName}
          <span className="font-bold text-[#666666]">{`  -  ${box.boxNo}`}</span>
        </p>
        <div className="shrink-0 text-right text-[12px] leading-snug text-[#666666]">
          {matchCount ? <p className="font-extrabold text-[#0B6B3A]">{plural(matchCount, 'match', 'matches')}</p> : null}
          <p>{plural(models.length, 'model')}</p>
          {brands ? <p>{plural(brands, 'brand')}</p> : null}
        </div>
      </div>

      {models.length ? (
        <div className="mt-3 divide-y divide-[#ECECEC] border-t border-[#ECECEC]">
          {groups.map((g) => (
            <div key={g.key} className="flex flex-wrap gap-1.5 py-2.5 last:pb-0">
              {g.models.map((m) => (
                <ModelChip
                  key={m.modelId}
                  label={boxModelLabel(m)}
                  picked={isMatch(m) || pickedId === m.modelId}
                  onClick={() => setPickedId((id) => (id === m.modelId ? null : m.modelId))}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-[#666666]">No models mapped to this box yet.</p>
      )}

      {box.notes ? (
        <p className="mt-3 flex gap-2 border-t border-[#ECECEC] pt-2.5 text-[12.5px] text-[#666666]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {box.notes}
        </p>
      ) : null}
    </article>
  );
}

function ModelChip({ label, picked, onClick }) {
  const cls = cx(
    'max-w-full break-words rounded-full border px-3 py-1 text-[12.5px] transition',
    picked ? 'border-[#16A34A] bg-[#F3F3F3] font-extrabold text-[#0B6B3A]' : 'border-transparent bg-[#F3F3F3] font-semibold text-[#344054]',
    onClick && !picked && 'hover:bg-[#F3F3F3]',
  );
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={Boolean(picked)} className={cls}>
      {label}
    </button>
  ) : (
    <span className={cls}>{label}</span>
  );
}
