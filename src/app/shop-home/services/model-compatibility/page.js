'use client';

/**
 * /shop-home/services/model-compatibility — spare-parts box lookup.
 *
 * Reads GET {MASTER_BASE}/master/model-compatibility and
 * GET {MASTER_BASE}/master/model-compatibility-types via `masterApi`
 * (src/lib/api.js) — the same public, permitAll master-data endpoints the
 * admin portal's model-compatibility page already uses
 * (src/app/management/(portal)/model-compatibility/CompatibilityClient.js),
 * read-only here.
 *
 * Important scope note: this endpoint answers "which storage box holds the
 * spare part for this brand/model" — a warehouse-location lookup keyed by
 * PART TYPE (Tempered Glass, Back Panel, Charging Port, ...). It does NOT
 * answer "which repair services (Screen Replacement, Battery Replacement,
 * ...) are available for a model" — repair services in this backend are
 * defined per device CATEGORY, not restricted per specific model, and no
 * per-model service-availability data exists anywhere in this codebase. A
 * ✓/✕ compatible-services checklist (as the original design brief asked
 * for) would have to be fabricated, so this page is honestly a box/part
 * lookup instead, using "Part Type" where the brief asked for "Service
 * Type" since that's the real filter this data actually supports.
 */

import { useEffect, useMemo, useState } from 'react';
import { Package, RefreshCw, Smartphone } from 'lucide-react';

import { cx } from '@/components/site/ui';
import { masterApi } from '@/lib/api';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import FilterChips from '@/components/shop-dashboard/FilterChips';
import SearchField, { FOCUS_RING } from '@/components/shop-dashboard/SearchField';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { SkeletonRows } from '@/components/shop-dashboard/SkeletonBlocks';

function unwrap(res) {
  return Array.isArray(res) ? res : Array.isArray(res?.content) ? res.content : [];
}

/**
 * ModelCompatibilityIllustration — small decorative device/accessory graphic
 * for the hero's right side (phone, tempered-glass layer, case, charging
 * connector + cable, floating spheres), matching a reference design. Hand-
 * drawn inline SVG, purely decorative — no data — same treatment as the
 * other redesigned Partner Dashboard pages' hero illustrations.
 */
function ModelCompatibilityIllustration() {
  return (
    <svg viewBox="0 0 220 150" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="mcPhone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#15803D" />
        </linearGradient>
      </defs>

      <ellipse cx="120" cy="132" rx="70" ry="10" fill="#15803D" opacity="0.08" />
      <circle cx="34" cy="40" r="7" fill="#BFE8FF" opacity="0.7" />
      <circle cx="192" cy="30" r="5" fill="#BFE8FF" opacity="0.6" />
      <circle cx="200" cy="70" r="4" fill="#DCFCE7" opacity="0.9" />

      {/* transparent case, slightly behind/right */}
      <rect x="128" y="42" width="52" height="92" rx="14" fill="white" opacity="0.55" stroke="#BBF7D0" strokeWidth="2" />

      {/* phone */}
      <rect x="76" y="30" width="56" height="100" rx="13" fill="url(#mcPhone)" />
      <rect x="82" y="38" width="44" height="78" rx="4" fill="#EAF5FF" />
      <circle cx="104" cy="123" r="2.6" fill="white" opacity="0.85" />

      {/* tempered-glass layer, leaning in front */}
      <g transform="rotate(-8 60 90)">
        <rect x="40" y="52" width="40" height="76" rx="8" fill="white" opacity="0.75" stroke="#86EFAC" strokeWidth="2" />
        <rect x="46" y="58" width="28" height="4" rx="2" fill="#DCFCE7" />
      </g>

      {/* charging connector + cable */}
      <g>
        <rect x="150" y="18" width="14" height="20" rx="3" fill="#10213D" />
        <rect x="154" y="34" width="6" height="10" fill="#94A3B8" />
        <path d="M157 44 C150 60, 168 70, 160 90" fill="none" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* floating mint spheres */}
      <circle cx="46" cy="26" r="5" fill="#86EFAC" opacity="0.8" />
      <circle cx="188" cy="112" r="6" fill="#86EFAC" opacity="0.7" />
    </svg>
  );
}

// Best-guess pastel badge tone for a part-type name — same idea as
// iconForRepairCategory()/guessColorHex() elsewhere in this codebase (derive
// a visual from real text, not a hand-maintained per-id table), so it works
// for whatever part types the backend actually returns (types.map(t=>t.name)
// stays the only source of truth for category names/values).
const BADGE_TONES = {
  blue: 'bg-[#E5F2FC] text-[#0E7BCF]',
  orange: 'bg-[#FFF1E0] text-[#B45A00]',
  violet: 'bg-[#F1EBFC] text-[#6D28D9]',
  green: 'bg-[#DFF8EB] text-[#067A3D]',
  teal: 'bg-[#DDF6F3] text-[#0F766E]',
  amber: 'bg-[#FEF3D6] text-[#B7791F]',
  red: 'bg-[#FDE8EA] text-[#DC2626]',
  mint: 'bg-[#EAF9EF] text-[#15803D]',
};

function badgeToneForType(name) {
  const n = String(name || '').toLowerCase();
  if (/model number/.test(n)) return BADGE_TONES.blue;
  if (/tempered/.test(n)) return BADGE_TONES.orange;
  if (/\buv\b/.test(n)) return BADGE_TONES.violet;
  if (/flip/.test(n)) return BADGE_TONES.teal;
  if (/case/.test(n)) return BADGE_TONES.green;
  if (/display/.test(n)) return BADGE_TONES.blue;
  if (/charging/.test(n)) return BADGE_TONES.red;
  if (/connector/.test(n)) return BADGE_TONES.amber;
  return BADGE_TONES.mint;
}

export default function ModelCompatibilityPage() {
  const [boxes, setBoxes] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    Promise.all([masterApi.get('/master/model-compatibility'), masterApi.get('/master/model-compatibility-types')])
      .then(([boxRes, typeRes]) => {
        if (!alive) return;
        setBoxes(unwrap(boxRes));
        setTypes(unwrap(typeRes));
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load model compatibility data.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const typeNameById = useMemo(() => new Map(types.map((t) => [t.id, t.name])), [types]);

  const rows = useMemo(
    () =>
      boxes.map((b) => ({
        ...b,
        typeName: typeNameById.get(b.partTypeId) || 'Unassigned',
        brands: Array.from(
          (b.models || []).reduce((map, m) => {
            const list = map.get(m.brandName || 'Other') || [];
            list.push(m.modelName);
            map.set(m.brandName || 'Other', list);
            return map;
          }, new Map()),
        ),
      })),
    [boxes, typeNameById],
  );

  const typeFilters = ['All', ...types.map((t) => t.name)];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== 'All' && r.typeName !== typeFilter) return false;
      if (!q) return true;
      if ((r.boxName || '').toLowerCase().includes(q) || String(r.boxNo || '').toLowerCase().includes(q)) return true;
      return (r.models || []).some((m) => (m.modelName || '').toLowerCase().includes(q) || (m.brandName || '').toLowerCase().includes(q));
    });
  }, [rows, typeFilter, query]);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero — soft mint gradient banner with abstract waves + a decorative
          device/accessory illustration on the far right, matching the same
          premium design system as the Dashboard/Book Service/Pickups/
          Customers pages. Title/subtitle/Refresh are the exact same
          content/handler this page always had. */}
      <div className="relative overflow-hidden rounded-3xl border border-[#E4ECE8] bg-gradient-to-br from-[#F3FBF7] via-white to-[#EAF5FF] p-5 shadow-[0_12px_32px_rgba(20,80,55,0.07),0_3px_10px_rgba(20,80,55,0.04)] sm:p-7">
        <span className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#86EFAC]/25 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-16 right-24 h-36 w-36 rounded-full bg-[#93C5FD]/20 blur-3xl" aria-hidden="true" />
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full text-[#DFF8EB]/60"
          viewBox="0 0 500 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,40 C120,90 280,0 500,50 L500,80 L0,80 Z" />
        </svg>

        <div className="relative flex flex-wrap items-start justify-between gap-4 md:pr-[180px]">
          <div className="min-w-0">
            <h1 className="text-[28px] font-extrabold tracking-tight text-[#10213D] sm:text-[34px]">Model Compatibility</h1>
            <p className="mt-1 text-sm text-[#667085]">Look up which spare-parts box serves a given brand and model.</p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className={cx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E4ECE8] bg-white px-4 py-2.5 text-sm font-semibold text-[#10213D] shadow-sm transition hover:border-[#079447] hover:text-[#079447]',
              FOCUS_RING,
            )}
          >
            <RefreshCw className={cx('h-4 w-4 text-[#079447]', loading && 'animate-spin')} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-0 right-4 hidden h-[130px] w-[190px] md:block lg:right-8 lg:h-[150px] lg:w-[220px]">
          <ModelCompatibilityIllustration />
        </div>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} /> : null}

      <section className="rounded-[22px] border border-[#E4ECE8] bg-white/96 shadow-[0_12px_30px_rgba(20,80,55,0.06),0_2px_8px_rgba(20,80,55,0.03)]">
        <div className="flex flex-col gap-3 border-b border-[#EEF3F0] px-4 py-4 sm:px-5">
          {types.length ? <FilterChips options={typeFilters} value={typeFilter} onChange={setTypeFilter} /> : null}
          <SearchField value={query} onChange={setQuery} placeholder="Search by brand, model, or box name" />
        </div>

        <div className="p-3 sm:p-4">
          {loading ? (
            <SkeletonRows rows={5} />
          ) : filtered.length === 0 ? (
            boxes.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
                <Icon3D icon={Package} tone="green" size="lg" />
                <p className="mt-3 text-sm font-bold text-[#10213D]">No compatibility data yet</p>
                <p className="mt-1 text-sm text-[#667085]">Spare-parts boxes and their compatible models will show up here.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
                <Icon3D icon={Smartphone} tone="gray" size="lg" />
                <p className="mt-3 text-sm font-bold text-[#10213D]">No compatible parts found</p>
                <p className="mt-1 text-sm text-[#667085]">Try another brand, model, or category.</p>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-2.5">
              {filtered.map((box) => (
                <div
                  key={box.id}
                  className="group flex flex-col gap-3 rounded-2xl border border-[#EDF2EF] bg-white px-4 py-3.5 shadow-[0_5px_16px_rgba(20,80,55,0.035)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#D7EBE0] hover:bg-gradient-to-r hover:from-[#E8F9EF]/75 hover:to-white sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 shrink-0 items-center gap-3 sm:w-[220px]">
                    <Icon3D icon={Package} tone="green" size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-[#10213D]">{box.boxName || `Box ${box.boxNo}`}</p>
                      <p className="truncate text-xs text-[#667085]">Box No. {box.boxNo}</p>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {box.brands.map(([brandName, models]) => (
                      <span
                        key={brandName}
                        className="inline-flex items-center rounded-full border border-[#DFF8EB] bg-[#F3FBF7] px-3 py-1.5 text-xs text-[#344054]"
                      >
                        <span className="font-bold text-[#066B39]">{brandName}:</span>
                        <span className="ml-1">
                          {models.slice(0, 4).join(', ')}
                          {models.length > 4 ? ` +${models.length - 4} more` : ''}
                        </span>
                      </span>
                    ))}
                  </div>

                  <span
                    className={cx(
                      'inline-flex shrink-0 items-center self-start rounded-full px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wide sm:self-center',
                      badgeToneForType(box.typeName),
                    )}
                  >
                    {box.typeName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
