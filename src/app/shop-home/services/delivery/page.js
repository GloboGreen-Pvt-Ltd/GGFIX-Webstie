'use client';

/**
 * /shop-home/services/delivery — completed repairs ready for or already
 * handed back to the customer.
 *
 * Reads GET {TICKET_BASE}/tickets via fetchTicketsPaged(), filtered to the
 * READY-family statuses (READY/INVOICE_GENERATED/INVOICE_READY/
 * DELIVERED_PROCESSING, all folded onto "Ready for Delivery" — see
 * src/lib/ticketStatus.js) and DELIVERED.
 *
 * "Out for Delivery" and "Pending" (both requested in the original design
 * brief) have no corresponding ticket status anywhere in this backend —
 * there is no courier/dispatch concept, only "ready" and "delivered". Both
 * stat tiles are shown for layout consistency with the brief but read "—"
 * rather than a fabricated count. Likewise there is no delivery-status
 * mutation endpoint, so this is a tracking page only, per the brief's own
 * instruction not to simulate one.
 */

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Clock, Copy, Info, Package, Phone, RefreshCw, Truck } from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import FilterChips from '@/components/shop-dashboard/FilterChips';
import SearchField, { FOCUS_RING } from '@/components/shop-dashboard/SearchField';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { SkeletonRows, SkeletonStatCards } from '@/components/shop-dashboard/SkeletonBlocks';
import { fetchTicketsPaged } from '@/lib/shopDashboard';
import { ticketStageLabel } from '@/lib/ticketStatus';

const FILTERS = ['All', 'Ready for Delivery', 'Delivered'];
const RELEVANT_STAGES = new Set(['Ready for Delivery', 'Delivered']);

// Page-local badge tones for this page's own two real stage buckets — not
// the shared TICKET_STAGE_BADGE (used by other pages, unaffected). Matches a
// reference design's pastel lavender/green treatment for these two exact
// labels; anything else falls back to the shared map's own styling.
const DELIVERY_ROW_BADGE = {
  'Ready for Delivery': 'bg-[#F1EBFC] text-[#7C3AED] shadow-[0_2px_10px_rgba(124,58,237,0.14)]',
  Delivered: 'bg-[#DFF8EB] text-[#067A3D] shadow-[0_2px_10px_rgba(6,122,61,0.12)]',
};

/**
 * DeliveryIllustration — small decorative logistics graphic for the hero's
 * right side (delivery vehicle, phone/map route, location pin, packages,
 * a hint of city skyline), matching a reference design. Hand-drawn inline
 * SVG, purely decorative — no data — same treatment as the other redesigned
 * Partner Dashboard pages' hero illustrations (e.g. Pickups).
 */
function DeliveryIllustration() {
  return (
    <svg viewBox="0 0 300 190" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="dvCargo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6EE7B7" />
          <stop offset="0.5" stopColor="#34D399" />
          <stop offset="1" stopColor="#0F7A44" />
        </linearGradient>
        <linearGradient id="dvCab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22C55E" />
          <stop offset="1" stopColor="#0C6636" />
        </linearGradient>
        <radialGradient id="dvHubcap" cx="0.35" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#F1F5F9" />
          <stop offset="1" stopColor="#94A3B8" />
        </radialGradient>
        <linearGradient id="dvBox1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EBD3A8" />
          <stop offset="1" stopColor="#C69B5F" />
        </linearGradient>
        <linearGradient id="dvBox2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3E1BE" />
          <stop offset="1" stopColor="#D6B98C" />
        </linearGradient>
        <linearGradient id="dvPin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#0C6636" />
        </linearGradient>
        <filter id="dvShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0C6636" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx="150" cy="175" rx="130" ry="10" fill="#0C6636" opacity="0.08" />

      {/* faint city skyline */}
      <g opacity="0.3" fill="#86EFAC">
        <rect x="4" y="108" width="18" height="60" rx="2" />
        <rect x="26" y="86" width="16" height="82" rx="2" />
        <rect x="262" y="96" width="18" height="72" rx="2" />
        <rect x="282" y="118" width="16" height="50" rx="2" />
        {[[30, 96], [30, 114], [30, 132], [8, 120], [8, 138]].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="6" height="6" fill="#F0FDF4" opacity="0.7" />
        ))}
      </g>

      {/* clouds */}
      <g fill="#BFE8FF" opacity="0.55">
        <ellipse cx="252" cy="34" rx="20" ry="11" />
        <ellipse cx="270" cy="28" rx="14" ry="9" />
        <ellipse cx="46" cy="26" rx="16" ry="9" />
      </g>

      {/* trees */}
      <g>
        <rect x="228" y="132" width="5" height="20" rx="2" fill="#8A6238" />
        <circle cx="230.5" cy="122" r="15" fill="#4ADE80" />
        <circle cx="222" cy="130" r="10" fill="#22C55E" />
      </g>

      {/* stacked delivery boxes */}
      <g filter="url(#dvShadow)">
        <g transform="translate(224,118)">
          <rect x="0" y="0" width="36" height="32" rx="3" fill="url(#dvBox1)" />
          <rect x="0" y="0" width="36" height="9" fill="#B99568" opacity="0.8" />
          <rect x="16" y="9" width="4" height="23" fill="#8A6238" opacity="0.5" />
        </g>
        <g transform="translate(252,100)">
          <rect x="0" y="0" width="30" height="50" rx="3" fill="url(#dvBox2)" />
          <rect x="0" y="0" width="30" height="8" fill="#C7A575" opacity="0.8" />
          <rect x="13" y="8" width="4" height="42" fill="#B99568" opacity="0.5" />
        </g>
      </g>

      {/* delivery vehicle */}
      <g filter="url(#dvShadow)">
        {/* cargo body */}
        <rect x="14" y="96" width="104" height="52" rx="7" fill="url(#dvCargo)" />
        <rect x="14" y="96" width="104" height="10" rx="4" fill="white" opacity="0.22" />
        <rect x="26" y="112" width="52" height="26" rx="3" fill="white" opacity="0.94" />
        <text x="52" y="129" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0C6636">GGFIX</text>

        {/* cab */}
        <path d="M118 108 h30 a10 10 0 0 1 10 10 v30 h-40 z" fill="url(#dvCab)" />
        <path d="M124 114 h20 a6 6 0 0 1 6 6 v10 h-26 z" fill="#DFF6FF" />
        <path d="M126 114 l10 16 h-10 z" fill="white" opacity="0.35" />
        <rect x="118" y="140" width="40" height="4" fill="#0C6636" opacity="0.5" />
        <circle cx="152" cy="124" r="3" fill="#FDE68A" />

        {/* wheels */}
        <circle cx="46" cy="150" r="13" fill="#10213D" />
        <circle cx="46" cy="150" r="7" fill="url(#dvHubcap)" />
        <circle cx="132" cy="150" r="13" fill="#10213D" />
        <circle cx="132" cy="150" r="7" fill="url(#dvHubcap)" />
      </g>

      {/* phone with map route */}
      <g filter="url(#dvShadow)">
        <rect x="150" y="60" width="70" height="108" rx="14" fill="#FFFFFF" stroke="#DCFCE7" strokeWidth="2.5" />
        <rect x="159" y="70" width="52" height="80" rx="5" fill="#EAF5FF" />
        <path d="M164 145 L188 118" stroke="white" strokeWidth="10" strokeLinecap="round" opacity="0.25" />
        <path d="M167 142 C178 128, 186 138, 200 108" fill="none" stroke="#15803D" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="5 5" />
        <circle cx="200" cy="108" r="4.5" fill="#0C6636" />
        <circle cx="167" cy="142" r="4" fill="#22C55E" />
        <circle cx="185" cy="164" r="2.4" fill="#DCFCE7" />
      </g>

      {/* location pin above the phone */}
      <g filter="url(#dvShadow)">
        <path d="M192 22 c12 0 22 9 22 21 0 15 -22 36 -22 36 s-22 -21 -22 -36 c0 -12 10 -21 22 -21 z" fill="url(#dvPin)" />
        <circle cx="192" cy="43" r="8.5" fill="white" />
        <path d="M182 28 a20 20 0 0 0 -6 12" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      </g>
    </svg>
  );
}

// Page-local pastel KPI-card styling — not the shared StatCard (used by ~10
// other pages, unaffected): matches a reference design's pastel-gradient +
// solid circular icon chip + large translucent background-glyph treatment
// per card, same idea as Pickups' PickupStatCard/Customers' CustomerStatCard,
// but with a round (not rounded-square) icon chip since that's what this
// page's specific reference shows.
const DELIVERY_STAT_STYLES = {
  violet: {
    card: 'bg-gradient-to-br from-[#F5F3FF] to-[#E8E1FC]',
    chip: 'bg-gradient-to-br from-[#A78BFA] to-[#7C3AED]',
    value: 'text-[#10213D]',
    label: 'text-[#6D5A9E]',
    wave: 'text-[#C4B5FD]',
    glow: 'bg-[#C4B5FD]',
  },
  blue: {
    card: 'bg-gradient-to-br from-[#EFF9FF] to-[#D9F0FE]',
    chip: 'bg-gradient-to-br from-[#38BDF8] to-[#18A5E5]',
    value: 'text-[#10213D]',
    label: 'text-[#1D6FA0]',
    wave: 'text-[#93D6F7]',
    glow: 'bg-[#93D6F7]',
  },
  green: {
    card: 'bg-gradient-to-br from-[#F3FBF7] to-[#E4F8EC]',
    chip: 'bg-gradient-to-br from-[#22C55E] to-[#0A934D]',
    value: 'text-[#10213D]',
    label: 'text-[#066B39]',
    wave: 'text-[#BBF7D0]',
    glow: 'bg-[#86EFAC]',
  },
  orange: {
    card: 'bg-gradient-to-br from-[#FFF7ED] to-[#FDE7CB]',
    chip: 'bg-gradient-to-br from-[#FB923C] to-[#FF7B24]',
    value: 'text-[#10213D]',
    label: 'text-[#9A5B27]',
    wave: 'text-[#FDBA74]',
    glow: 'bg-[#FDBA74]',
  },
};

function DeliveryStatCard({ icon: Icon, bgIcon: BgIcon, label, value, tone }) {
  const s = DELIVERY_STAT_STYLES[tone] || DELIVERY_STAT_STYLES.green;
  return (
    <div
      className={cx(
        'relative flex h-[178px] flex-col overflow-hidden rounded-[22px] border border-[#E4ECE8] p-5 shadow-[0_12px_30px_rgba(20,80,55,0.07),0_2px_8px_rgba(20,80,55,0.03)]',
        s.card,
      )}
    >
      {/* glass highlight along the top edge */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[22px] bg-gradient-to-b from-white/55 to-transparent" aria-hidden="true" />
      {/* large translucent background glyph, matching the reference's oversized card art */}
      <BgIcon className={cx('pointer-events-none absolute -bottom-7 -right-7 h-36 w-36 rotate-[-10deg] opacity-[0.28]', s.wave)} aria-hidden="true" />
      <span className={cx('pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full blur-2xl opacity-40', s.glow)} aria-hidden="true" />

      {/* colored glow behind the icon chip, then the raised glossy chip itself */}
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
        <span className={cx('absolute inset-0 -m-1.5 rounded-full blur-md opacity-50', s.glow)} aria-hidden="true" />
        <span
          className={cx(
            'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_18px_rgba(0,0,0,0.12),inset_0_1.5px_0_rgba(255,255,255,0.5),inset_0_-4px_8px_rgba(0,0,0,0.12)]',
            s.chip,
          )}
        >
          <Icon className="h-6 w-6 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]" aria-hidden="true" />
        </span>
      </span>

      <p className={cx('relative mt-4 text-[34px] font-extrabold leading-none tracking-tight', s.value)}>{value}</p>
      <p className={cx('relative mt-1.5 text-[15px] font-semibold', s.label)}>{label}</p>
    </div>
  );
}

export default function DeliveryPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetchTicketsPaged()
      .then((list) => {
        if (alive) setTickets(list);
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load deliveries.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const rows = useMemo(
    () =>
      tickets
        .map((t) => ({ ...t, stageLabel: ticketStageLabel(t.status) }))
        .filter((t) => RELEVANT_STAGES.has(t.stageLabel))
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)),
    [tickets],
  );

  const counts = useMemo(() => {
    const c = { All: rows.length, 'Ready for Delivery': 0, Delivered: 0 };
    rows.forEach((r) => {
      c[r.stageLabel] = (c[r.stageLabel] || 0) + 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'All' && r.stageLabel !== filter) return false;
      if (!q) return true;
      return (
        (r.trackingId || '').toLowerCase().includes(q) ||
        (r.customerName || '').toLowerCase().includes(q) ||
        (r.deviceDisplayName || '').toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const stats = [
    { label: 'Ready for Delivery', value: counts['Ready for Delivery'], icon: Package, bgIcon: Package, tone: 'violet' },
    { label: 'Out for Delivery', value: '—', icon: Truck, bgIcon: Truck, tone: 'blue' },
    { label: 'Delivered', value: counts.Delivered, icon: Package, bgIcon: Package, tone: 'green' },
    { label: 'Pending', value: '—', icon: Clock, bgIcon: Clock, tone: 'orange' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero — soft mint gradient banner with abstract waves + a decorative
          logistics illustration on the far right, matching the same premium
          design system as the other redesigned Partner Dashboard pages.
          Title/subtitle/Refresh are the exact same content/handler this page
          always had. */}
      <div className="relative min-h-[200px] overflow-hidden rounded-3xl border border-[#E4ECE8] bg-gradient-to-br from-[#F3FBF7] via-white to-[#EAF5FF] p-6 shadow-[0_12px_32px_rgba(20,80,55,0.07),0_3px_10px_rgba(20,80,55,0.04)] sm:p-8">
        <span className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-[#86EFAC]/25 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-16 right-32 h-40 w-40 rounded-full bg-[#93C5FD]/20 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -left-10 top-10 h-36 w-36 rounded-full bg-[#BFE8FF]/15 blur-3xl" aria-hidden="true" />
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-[#DFF8EB]/55"
          viewBox="0 0 500 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,50 C120,110 280,0 500,60 L500,100 L0,100 Z" />
        </svg>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full text-[#BFE8FF]/35"
          viewBox="0 0 500 70"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,35 C150,65 320,10 500,40 L500,70 L0,70 Z" />
        </svg>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full text-white/70"
          viewBox="0 0 500 45"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,22 C170,45 300,5 500,25 L500,45 L0,45 Z" />
        </svg>

        <div className="relative flex flex-wrap items-start justify-between gap-4 md:pr-[280px]">
          <div className="min-w-0">
            <h1 className="text-[32px] font-extrabold tracking-tight text-[#10213D] sm:text-[38px]">Delivery</h1>
            <p className="mt-1.5 text-[15px] text-[#667085] sm:text-base">Manage completed repairs and customer deliveries.</p>
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

        <div className="pointer-events-none absolute bottom-0 right-2 hidden h-[160px] w-[240px] md:block lg:right-4 lg:h-[190px] lg:w-[290px]">
          <DeliveryIllustration />
        </div>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} /> : null}

      {loading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <DeliveryStatCard key={s.label} icon={s.icon} bgIcon={s.bgIcon} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
      )}
      {!loading ? (
        <p className="-mt-3 flex items-center gap-1.5 rounded-xl bg-[#F3FBF7] px-3 py-2 text-xs text-[#667085]">
          <Info className="h-3.5 w-3.5 shrink-0 text-[#98A2B3]" aria-hidden="true" />
          &ldquo;Out for Delivery&rdquo; and &ldquo;Pending&rdquo; aren&apos;t tracked by this backend yet, so they show as &ldquo;—&rdquo;.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-[#E4ECE8] bg-gradient-to-b from-white to-[#FBFEFC]/96 shadow-[0_12px_30px_rgba(20,80,55,0.07),0_2px_8px_rgba(20,80,55,0.03)]">
        <div className="flex flex-col gap-3.5 border-b border-[#EEF3F0] px-5 py-5 sm:px-6">
          <FilterChips options={FILTERS} value={filter} onChange={setFilter} counts={counts} />
          <SearchField value={query} onChange={setQuery} placeholder="Search by tracking ID, customer, or device" />
        </div>

        {loading ? (
          <SkeletonRows rows={4} />
        ) : filtered.length === 0 ? (
          rows.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
              <Icon3D icon={Package} tone="green" size="lg" />
              <p className="mt-3 text-sm font-bold text-[#10213D]">No deliveries yet</p>
              <p className="mt-1 text-sm text-[#667085]">Completed repairs ready for delivery will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
              <Icon3D icon={Package} tone="gray" size="lg" />
              <p className="mt-3 text-sm font-bold text-[#10213D]">No deliveries match your filters</p>
              <p className="mt-1 text-sm text-[#667085]">Try a different status or search term.</p>
            </div>
          )
        ) : (
          <div className="divide-y divide-[#EEF3F0]">
            {filtered.map((t) => (
              <DeliveryRow key={t.id} ticket={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DeliveryRow({ ticket }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const address = ticket.customerAddress || '';

  function copyAddress() {
    if (typeof navigator === 'undefined' || !navigator.clipboard || !address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cx(
          'group flex w-full items-center gap-3.5 px-4 py-5 text-left transition duration-200 ease-out hover:translate-x-0.5 hover:bg-gradient-to-r hover:from-[#E7F9EF]/65 hover:to-white sm:px-5',
          FOCUS_RING,
        )}
      >
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <span className="absolute inset-0 -m-1 rounded-full bg-[#86EFAC] opacity-40 blur-md" aria-hidden="true" />
          <Icon3D icon={Package} tone="green" size="lg" className="relative shadow-[0_5px_14px_rgba(8,145,75,0.16),inset_0_1.5px_0_rgba(255,255,255,0.5)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-[#10213D]">{ticket.customerName || ticket.deviceDisplayName || 'Ticket'}</p>
          <p className="truncate text-[13px] text-[#667085]">#{ticket.trackingId || ticket.id}</p>
        </div>
        <span
          className={cx(
            'hidden shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.68rem] font-bold uppercase tracking-wide sm:inline-flex',
            DELIVERY_ROW_BADGE[ticket.stageLabel] || 'bg-[#F0FDF4] text-[#667085]',
          )}
        >
          <Package className="h-3 w-3 shrink-0" aria-hidden="true" />
          {ticket.stageLabel}
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E4ECE8] bg-white text-[#10213D] shadow-sm transition group-hover:shadow-[0_2px_10px_rgba(6,122,61,0.14)]">
          <ChevronDown className={cx('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-dashed border-[#EAECF0] bg-[#F3FBF7] px-4 py-4 sm:px-5">
          <span
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wide sm:hidden',
              DELIVERY_ROW_BADGE[ticket.stageLabel] || 'bg-[#F0FDF4] text-[#667085]',
            )}
          >
            <Package className="h-3 w-3 shrink-0" aria-hidden="true" />
            {ticket.stageLabel}
          </span>

          {ticket.customerMobile ? (
            <a href={`tel:${ticket.customerMobile}`} className="flex w-fit items-center gap-2 text-sm font-semibold text-[#15803D]">
              <Phone className="h-4 w-4" aria-hidden="true" />
              {ticket.customerMobile}
            </a>
          ) : null}

          {address ? (
            <div className="flex items-start gap-2 rounded-xl bg-white px-3 py-2.5 text-sm text-[#344054]">
              <span className="flex-1">{address}</span>
              <button
                type="button"
                onClick={copyAddress}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EAF9EF] px-2.5 py-1 text-xs font-semibold text-[#067A3D] transition hover:bg-[#DFF8EB]"
              >
                <Copy className="h-3 w-3" aria-hidden="true" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-[#98A2B3]">No delivery address on file for this ticket.</p>
          )}

          <p className="flex items-center gap-1.5 text-[0.7rem] text-[#98A2B3]">
            <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
            Delivery-status updates aren&apos;t available yet — this backend has no write endpoint for it.
          </p>
        </div>
      ) : null}
    </div>
  );
}
