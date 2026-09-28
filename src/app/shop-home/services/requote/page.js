'use client';

/**
 * /shop-home/services/requote — tickets awaiting or past a price quote.
 *
 * Reads GET {TICKET_BASE}/tickets (via fetchTicketsPaged(), src/lib/shopDashboard.js),
 * filtered to QUOTED/APPROVED/CANCELLED tickets.
 *
 * Two things this page deliberately does NOT do, because the data/endpoints
 * don't exist:
 *  - No "original quote vs. revised quote" columns. A ticket only carries
 *    one current price (`finalPrice ?? estimatedPrice`) plus a line-items
 *    snapshot (`priceItemsJson`) — there is no quote-history field anywhere
 *    in this backend, so only ONE "Quoted Amount" is shown, not two.
 *  - No Edit Quote / Send Revised Quote buttons. No PATCH/PUT endpoint for
 *    tickets is called anywhere in this codebase (ticketApi.patch exists in
 *    src/lib/api.js but nothing ever invokes it) — offering those actions
 *    here would be a button with nothing real behind it.
 * "Rejected"/"Expired" (from the original design brief) also have no real
 * status behind them — the closest honest signal is a ticket that ended in
 * CANCELLED, so that bucket is labeled "Cancelled" here, not "Rejected".
 *
 * Ticket rows aren't confirmed to carry customer name/phone anywhere else
 * in this codebase (every existing consumer is the *customer's own*
 * self-service view, which has no reason to show it back to them) — so
 * those fields are read defensively with a plain fallback, not assumed.
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Clock, FileStack, FileText, RefreshCw, XCircle } from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import FilterChips from '@/components/shop-dashboard/FilterChips';
import SearchField, { FOCUS_RING } from '@/components/shop-dashboard/SearchField';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { SkeletonRows, SkeletonStatCards } from '@/components/shop-dashboard/SkeletonBlocks';
import { fetchTicketsPaged } from '@/lib/shopDashboard';
import { ticketStageLabel } from '@/lib/ticketStatus';

const FILTERS = ['All', 'Quote Pending', 'Quote Approved', 'Cancelled'];
const RELEVANT_STATUSES = ['QUOTED', 'APPROVED', 'CANCELLED'];

// Page-local badge tones for this page's own three real stage buckets — not
// the shared TICKET_STAGE_BADGE (used by other pages, unaffected). Matches a
// reference design's pastel amber/blue/pink treatment for these exact
// labels; anything else falls back to the shared map's own styling.
const REQUOTE_ROW_BADGE = {
  'Quote Pending': 'bg-[#FEF3D6] text-[#B7791F] shadow-[0_2px_10px_rgba(183,121,31,0.14)]',
  'Quote Approved': 'bg-[#E5F2FC] text-[#0E7BCF] shadow-[0_2px_10px_rgba(14,123,207,0.14)]',
  Cancelled: 'bg-[#FDE4E8] text-[#E11D48] shadow-[0_2px_10px_rgba(225,29,72,0.12)]',
};

/**
 * RequoteIllustration — small decorative graphic for the hero's right side
 * (a "REQUOTE" clipboard, a calculator, a green refresh badge, a phone and a
 * coin), matching a reference design. Hand-drawn inline SVG with layered
 * gradients/filter-based drop shadows for a soft-3D feel, purely decorative —
 * no data — same technique as the Delivery/Pickups hero illustrations.
 */
function RequoteIllustration() {
  return (
    <svg viewBox="0 0 300 190" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="rqClip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EAF9EF" />
        </linearGradient>
        <linearGradient id="rqRefresh" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#0A934D" />
        </linearGradient>
        <radialGradient id="rqCoin" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FDE68A" />
          <stop offset="1" stopColor="#D97706" />
        </radialGradient>
        <filter id="rqShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0C6636" floodOpacity="0.2" />
        </filter>
      </defs>

      <ellipse cx="170" cy="178" rx="120" ry="9" fill="#0C6636" opacity="0.08" />

      {/* clouds + leaves */}
      <g fill="#BFE8FF" opacity="0.55">
        <ellipse cx="58" cy="30" rx="18" ry="10" />
        <ellipse cx="42" cy="24" rx="12" ry="8" />
      </g>
      <g fill="#BFE8FF" opacity="0.4">
        <ellipse cx="272" cy="42" rx="14" ry="8" />
      </g>
      <g>
        <path d="M120 190 q-6 -30 18 -40 q4 22 -18 40" fill="#4ADE80" opacity="0.8" />
        <path d="M232 188 q6 -26 -14 -36 q-4 20 14 36" fill="#22C55E" opacity="0.8" />
      </g>

      {/* calculator, left */}
      <g filter="url(#rqShadow)">
        <rect x="118" y="118" width="46" height="58" rx="7" fill="#FFFFFF" stroke="#DCFCE7" strokeWidth="2" />
        <rect x="124" y="124" width="34" height="14" rx="3" fill="#DFF6FF" />
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <rect key={`${row}-${col}`} x={124 + col * 12} y={144 + row * 11} width="8" height="8" rx="2" fill="#BBF7D0" />
          )),
        )}
      </g>

      {/* stacked quote papers, behind the clipboard */}
      <g filter="url(#rqShadow)">
        <rect x="196" y="112" width="52" height="66" rx="6" fill="#FFFFFF" stroke="#DCFCE7" strokeWidth="2" />
        <rect x="204" y="122" width="36" height="4" rx="2" fill="#DCFCE7" />
        <rect x="204" y="132" width="30" height="4" rx="2" fill="#DCFCE7" />
        <rect x="204" y="142" width="34" height="4" rx="2" fill="#DCFCE7" />
      </g>

      {/* main REQUOTE clipboard */}
      <g filter="url(#rqShadow)">
        <rect x="148" y="30" width="80" height="118" rx="10" fill="url(#rqClip)" stroke="#DCFCE7" strokeWidth="2" />
        <rect x="172" y="22" width="32" height="16" rx="6" fill="#0A934D" />
        <rect x="158" y="52" width="60" height="15" rx="4" fill="#FFFFFF" stroke="#DFF8EB" strokeWidth="1.5" />
        <text x="188" y="63" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0C6636">REQUOTE</text>
        <rect x="158" y="76" width="46" height="4" rx="2" fill="#BBF7D0" />
        <rect x="158" y="86" width="52" height="4" rx="2" fill="#DCFCE7" />
        <rect x="158" y="96" width="38" height="4" rx="2" fill="#DCFCE7" />

        {/* green refresh/requote badge */}
        <circle cx="196" cy="120" r="20" fill="url(#rqRefresh)" />
        <path
          d="M188 112 a11 11 0 1 1 -3 15"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M188 108 l0 6 l6 0 z" fill="white" />
      </g>

      {/* phone, right */}
      <g filter="url(#rqShadow)">
        <rect x="250" y="128" width="34" height="54" rx="8" fill="#10213D" />
        <rect x="254" y="134" width="26" height="38" rx="2" fill="#93C5FD" />
      </g>

      {/* coin */}
      <circle cx="252" cy="88" r="13" fill="url(#rqCoin)" filter="url(#rqShadow)" />
      <text x="252" y="92" textAnchor="middle" fontSize="12" fontWeight="800" fill="#92400E">₹</text>

      {/* small sparkle accents */}
      <circle cx="126" cy="46" r="3.5" fill="#86EFAC" />
      <circle cx="270" cy="150" r="3" fill="#86EFAC" />
    </svg>
  );
}

/** Small decorative empty-state graphic — a green document with a soft mint circle behind it, a ground shadow and a couple of sparkle accents, matching a reference design. Purely decorative. */
function RequoteEmptyIllustration() {
  return (
    <svg viewBox="0 0 160 140" className="h-28 w-28" aria-hidden="true">
      <defs>
        <linearGradient id="rqEmptyDoc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#0A934D" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="70" r="54" fill="#DFF8EB" opacity="0.6" />
      <ellipse cx="80" cy="118" rx="34" ry="7" fill="#0C6636" opacity="0.1" />
      <circle cx="34" cy="40" r="4" fill="#86EFAC" />
      <circle cx="128" cy="96" r="3.5" fill="#86EFAC" />
      <path d="M118 34 l4 4 -4 4 -4 -4 z" fill="#86EFAC" />
      <g transform="translate(56,44) rotate(-6)">
        <path d="M0 6 a6 6 0 0 1 6 -6 h30 l12 12 v52 a6 6 0 0 1 -6 6 h-36 a6 6 0 0 1 -6 -6 z" fill="url(#rqEmptyDoc)" />
        <path d="M36 0 v12 h12 z" fill="#0C6636" opacity="0.4" />
        <rect x="10" y="26" width="24" height="4" rx="2" fill="white" opacity="0.85" />
        <rect x="10" y="36" width="18" height="4" rx="2" fill="white" opacity="0.65" />
      </g>
    </svg>
  );
}

// Page-local pastel KPI-card styling — not the shared StatCard (used by ~10
// other pages, unaffected): matches a reference design's pastel-gradient +
// glossy circular icon chip + large translucent background-glyph treatment,
// same approach as the redesigned Delivery/Pickups/Customers pages.
const REQUOTE_STAT_STYLES = {
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
    chip: 'bg-gradient-to-br from-[#FB923C] to-[#FF7A1A]',
    value: 'text-[#10213D]',
    label: 'text-[#9A5B27]',
    wave: 'text-[#FDBA74]',
    glow: 'bg-[#FDBA74]',
  },
  blue: {
    card: 'bg-gradient-to-br from-[#EFF9FF] to-[#D9F0FE]',
    chip: 'bg-gradient-to-br from-[#38BDF8] to-[#1DA8E8]',
    value: 'text-[#10213D]',
    label: 'text-[#1D6FA0]',
    wave: 'text-[#93D6F7]',
    glow: 'bg-[#93D6F7]',
  },
  red: {
    card: 'bg-gradient-to-br from-[#FFF1F2] to-[#FCE1E4]',
    chip: 'bg-gradient-to-br from-[#FB7185] to-[#F43F5E]',
    value: 'text-[#10213D]',
    label: 'text-[#9F5361]',
    wave: 'text-[#FDA4AF]',
    glow: 'bg-[#FDA4AF]',
  },
};

function RequoteStatCard({ icon: Icon, bgIcon: BgIcon, label, value, tone }) {
  const s = REQUOTE_STAT_STYLES[tone] || REQUOTE_STAT_STYLES.green;
  return (
    <div
      className={cx(
        'relative flex h-[178px] flex-col overflow-hidden rounded-[22px] border border-[#E4ECE8] p-5 shadow-[0_12px_30px_rgba(20,80,55,0.07),0_2px_8px_rgba(20,80,55,0.03)]',
        s.card,
      )}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[22px] bg-gradient-to-b from-white/55 to-transparent" aria-hidden="true" />
      <BgIcon className={cx('pointer-events-none absolute -bottom-7 -right-7 h-36 w-36 rotate-[-10deg] opacity-[0.28]', s.wave)} aria-hidden="true" />
      <span className={cx('pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full blur-2xl opacity-40', s.glow)} aria-hidden="true" />

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

function parseLineItems(json) {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function RequotePage() {
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
        if (alive) setTickets(list.filter((t) => RELEVANT_STATUSES.includes(String(t.status || '').toUpperCase())));
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load requote requests.');
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
        .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0)),
    [tickets],
  );

  const counts = useMemo(() => {
    const c = { All: rows.length, 'Quote Pending': 0, 'Quote Approved': 0, Cancelled: 0 };
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
        (r.customerMobile || r.customerPhone || '').toLowerCase().includes(q) ||
        (r.deviceDisplayName || '').toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const stats = [
    { label: 'Total Requote Requests', value: rows.length, icon: FileText, bgIcon: FileStack, tone: 'green' },
    { label: 'Pending Customer Approval', value: counts['Quote Pending'], icon: FileText, bgIcon: Clock, tone: 'orange' },
    { label: 'Approved', value: counts['Quote Approved'], icon: FileText, bgIcon: CheckCircle2, tone: 'blue' },
    { label: 'Cancelled', value: counts.Cancelled, icon: FileText, bgIcon: XCircle, tone: 'red' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero — soft mint gradient banner with layered abstract waves + a
          decorative "REQUOTE" clipboard/calculator/coin illustration on the
          far right, matching the same premium design system as the other
          redesigned Partner Dashboard pages. Title/subtitle/Refresh are the
          exact same content/handler this page always had. */}
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
            <h1 className="text-[32px] font-extrabold tracking-tight text-[#10213D] sm:text-[38px]">Requote</h1>
            <p className="mt-1.5 text-[15px] text-[#667085] sm:text-base">Review bookings that require a revised quotation.</p>
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
          <RequoteIllustration />
        </div>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} /> : null}

      {loading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <RequoteStatCard key={s.label} icon={s.icon} bgIcon={s.bgIcon} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
      )}

      <section className="overflow-hidden rounded-[22px] border border-[#E4ECE8] bg-gradient-to-b from-white to-[#FBFEFC]/96 shadow-[0_12px_30px_rgba(20,80,55,0.07),0_2px_8px_rgba(20,80,55,0.03)]">
        <div className="flex flex-col gap-3.5 border-b border-[#EEF3F0] px-5 py-5 sm:px-6">
          <FilterChips options={FILTERS} value={filter} onChange={setFilter} counts={counts} />
          <SearchField value={query} onChange={setQuery} placeholder="Search by tracking ID, customer, or phone" />
        </div>

        {loading ? (
          <SkeletonRows rows={4} />
        ) : filtered.length === 0 ? (
          rows.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
              <RequoteEmptyIllustration />
              <p className="mt-3 text-base font-bold text-[#10213D]">No requote requests</p>
              <p className="mt-1 max-w-sm text-sm text-[#667085]">
                Tickets that reach Quote Pending, Quote Approved, or Cancelled will show up here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
              <Icon3D icon={FileText} tone="gray" size="lg" />
              <p className="mt-3 text-sm font-bold text-[#10213D]">No requests match your filters</p>
              <p className="mt-1 text-sm text-[#667085]">Try a different status or search term.</p>
            </div>
          )
        ) : (
          <div className="divide-y divide-[#EEF3F0]">
            {filtered.map((t) => (
              <RequoteRow key={t.id} ticket={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RequoteRow({ ticket }) {
  const [open, setOpen] = useState(false);
  const amount = ticket.finalPrice ?? ticket.estimatedPrice ?? null;
  const items = parseLineItems(ticket.priceItemsJson);

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
          <Icon3D icon={FileText} tone="green" size="lg" className="relative shadow-[0_5px_14px_rgba(8,145,75,0.16),inset_0_1.5px_0_rgba(255,255,255,0.5)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-[#10213D]">{ticket.customerName || ticket.deviceDisplayName || 'Ticket'}</p>
          <p className="truncate text-[13px] text-[#667085]">
            #{ticket.trackingId || ticket.id} {ticket.deviceDisplayName ? `· ${ticket.deviceDisplayName}` : ''}
          </p>
        </div>
        {amount != null ? (
          <span className="hidden shrink-0 text-sm font-bold text-[#10213D] sm:block">₹{Number(amount).toLocaleString('en-IN')}</span>
        ) : null}
        <span
          className={cx(
            'hidden shrink-0 items-center rounded-full px-3.5 py-2 text-[0.68rem] font-bold uppercase tracking-wide sm:inline-flex',
            REQUOTE_ROW_BADGE[ticket.stageLabel] || 'bg-[#F0FDF4] text-[#667085]',
          )}
        >
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
              'inline-block rounded-full px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wide sm:hidden',
              REQUOTE_ROW_BADGE[ticket.stageLabel] || 'bg-[#F0FDF4] text-[#667085]',
            )}
          >
            {ticket.stageLabel}
          </span>

          {ticket.issueDescription ? <p className="text-sm text-[#344054]">{ticket.issueDescription}</p> : null}

          {items.length ? (
            <ul className="space-y-1">
              {items.map((item, i) => {
                const name = item.serviceName || item.name || item.label || item.description || 'Service';
                const price = item.estimatedPrice ?? item.price ?? item.amount ?? item.total ?? null;
                return (
                  // eslint-disable-next-line react/no-array-index-key -- line items have no stable id in priceItemsJson.
                  <li key={i} className="flex items-center justify-between text-xs text-[#667085]">
                    <span>{name}</span>
                    {price != null ? <span className="font-semibold text-[#101828]">₹{Number(price).toLocaleString('en-IN')}</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {amount != null ? (
            <div className="text-sm font-bold text-[#101828] sm:hidden">₹{Number(amount).toLocaleString('en-IN')} quoted</div>
          ) : null}

          <p className="text-xs text-[#667085]">
            Customer approval:{' '}
            <span className="font-semibold text-[#101828]">{ticket.customerApproval === true ? 'Approved' : 'Not yet approved'}</span>
          </p>

          <p className="text-[0.7rem] text-[#98A2B3]">
            Editing or sending a revised quote isn&apos;t available yet — this backend has no update endpoint for tickets.
          </p>
        </div>
      ) : null}
    </div>
  );
}
