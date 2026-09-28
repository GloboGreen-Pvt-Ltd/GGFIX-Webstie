'use client';

/**
 * /shop-home/services/service-status — active repair-ticket progress
 * tracker, with a per-ticket stage timeline.
 *
 * Reads GET {TICKET_BASE}/tickets via fetchTicketsPaged() (src/lib/shopDashboard.js).
 * The timeline stages come from src/lib/ticketStatus.js — see that file's
 * header for why "Device Received" and "Quality Check" (both requested in
 * the original design brief) are intentionally not shown: no backend
 * ticket status represents either one, so a step for them could never
 * actually light up.
 */

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Clock, FileClock, Package, RefreshCw, Wrench } from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import FilterChips from '@/components/shop-dashboard/FilterChips';
import SearchField, { FOCUS_RING } from '@/components/shop-dashboard/SearchField';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { SkeletonRows, SkeletonStatCards } from '@/components/shop-dashboard/SkeletonBlocks';
import { fetchTicketsPaged } from '@/lib/shopDashboard';
import { TICKET_STAGES, TICKET_STAGE_BADGE, ticketStageLabel, ticketStageProgress } from '@/lib/ticketStatus';

const FILTERS = ['All', ...TICKET_STAGES.map((s) => s.label), 'Cancelled'];

/**
 * ServiceStatusIllustration — small decorative graphic for the hero's right
 * side (a "SERVICE STATUS" clipboard with a checklist, a gear, a phone, a
 * wrench, a package and a clock), matching a reference design. Hand-drawn
 * inline SVG with layered gradients/filter-based drop shadows for a soft-3D
 * feel, purely decorative — no data — same technique as the other
 * redesigned Partner Dashboard pages' hero illustrations.
 */
function ServiceStatusIllustration() {
  return (
    <svg viewBox="0 0 300 190" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="ssClip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EAF9EF" />
        </linearGradient>
        <linearGradient id="ssGear" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#0A934D" />
        </linearGradient>
        <linearGradient id="ssPhone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22C55E" />
          <stop offset="1" stopColor="#0A934D" />
        </linearGradient>
        <linearGradient id="ssBox" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EBD3A8" />
          <stop offset="1" stopColor="#C69B5F" />
        </linearGradient>
        <filter id="ssShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0C6636" floodOpacity="0.2" />
        </filter>
      </defs>

      <ellipse cx="170" cy="178" rx="120" ry="9" fill="#0C6636" opacity="0.08" />

      <g fill="#BFE8FF" opacity="0.55">
        <ellipse cx="56" cy="28" rx="18" ry="10" />
        <ellipse cx="40" cy="22" rx="12" ry="8" />
        <ellipse cx="272" cy="38" rx="14" ry="8" />
      </g>
      <g>
        <path d="M118 190 q-6 -30 18 -40 q4 22 -18 40" fill="#4ADE80" opacity="0.8" />
        <path d="M236 188 q6 -26 -14 -36 q-4 20 14 36" fill="#22C55E" opacity="0.8" />
      </g>

      {/* package box, left */}
      <g filter="url(#ssShadow)">
        <rect x="112" y="128" width="42" height="38" rx="3" fill="url(#ssBox)" />
        <rect x="112" y="128" width="42" height="10" fill="#B99568" opacity="0.8" />
        <rect x="130" y="138" width="6" height="28" fill="#8A6238" opacity="0.5" />
      </g>

      {/* clock, floating above the box */}
      <g filter="url(#ssShadow)">
        <circle cx="126" cy="104" r="16" fill="#FDE68A" />
        <circle cx="126" cy="104" r="12" fill="white" />
        <path d="M126 96 v9 l6 5" stroke="#B45309" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </g>

      {/* gear */}
      <g filter="url(#ssShadow)" transform="translate(232,150)">
        <circle r="18" fill="url(#ssGear)" />
        <circle r="7" fill="white" opacity="0.9" />
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <rect key={deg} x="-3" y="-24" width="6" height="10" rx="2" fill="url(#ssGear)" transform={`rotate(${deg})`} />
        ))}
      </g>

      {/* wrench, floating */}
      <g filter="url(#ssShadow)" transform="translate(252,108) rotate(-30)">
        <rect x="0" y="0" width="38" height="8" rx="4" fill="#0A934D" />
        <circle cx="0" cy="4" r="8" fill="none" stroke="#0A934D" strokeWidth="6" />
      </g>

      {/* main SERVICE STATUS clipboard */}
      <g filter="url(#ssShadow)">
        <rect x="148" y="30" width="80" height="118" rx="10" fill="url(#ssClip)" stroke="#DCFCE7" strokeWidth="2" />
        <rect x="172" y="22" width="32" height="16" rx="6" fill="#0A934D" />
        <rect x="158" y="52" width="60" height="15" rx="4" fill="#FFFFFF" stroke="#DFF8EB" strokeWidth="1.5" />
        <text x="188" y="63" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#0C6636">SERVICE STATUS</text>

        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(158,${78 + i * 17})`}>
            <circle cx="6" cy="6" r="6" fill="#0A934D" />
            <path d="M3 6 l2 2 l4 -4" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="18" y="3" width="48" height="6" rx="3" fill="#DCFCE7" />
          </g>
        ))}
      </g>

      {/* phone, right */}
      <g filter="url(#ssShadow)">
        <rect x="248" y="56" width="34" height="56" rx="9" fill="url(#ssPhone)" />
        <rect x="252" y="62" width="26" height="38" rx="2" fill="#EAF5FF" />
        <circle cx="265" cy="105" r="1.8" fill="white" opacity="0.85" />
      </g>

      <circle cx="126" cy="46" r="3.5" fill="#86EFAC" />
      <circle cx="272" cy="150" r="3" fill="#86EFAC" />
    </svg>
  );
}

/** Small decorative empty-state graphic — a wrench + gear over a checklist, matching a reference design. Purely decorative. */
function ServiceStatusEmptyIllustration() {
  return (
    <svg viewBox="0 0 160 140" className="h-28 w-28" aria-hidden="true">
      <defs>
        <linearGradient id="ssEmptyGear" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#0A934D" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="70" r="54" fill="#DFF8EB" opacity="0.6" />
      <ellipse cx="80" cy="118" rx="34" ry="7" fill="#0C6636" opacity="0.1" />
      <circle cx="34" cy="40" r="4" fill="#86EFAC" />
      <circle cx="128" cy="96" r="3.5" fill="#86EFAC" />
      <rect x="50" y="44" width="44" height="56" rx="8" fill="white" stroke="#DCFCE7" strokeWidth="2" />
      <rect x="58" y="54" width="28" height="4" rx="2" fill="#DCFCE7" />
      <rect x="58" y="64" width="22" height="4" rx="2" fill="#DCFCE7" />
      <rect x="58" y="74" width="26" height="4" rx="2" fill="#DCFCE7" />
      <circle cx="100" cy="92" r="20" fill="url(#ssEmptyGear)" />
      <circle cx="100" cy="92" r="8" fill="white" opacity="0.9" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <rect key={deg} x={97} y={92 - 26} width="6" height="10" rx="2" fill="url(#ssEmptyGear)" transform={`rotate(${deg} 100 92)`} />
      ))}
    </svg>
  );
}

// Page-local pastel KPI-card styling — not the shared StatCard (used by ~10
// other pages, unaffected): matches a reference design's pastel-gradient +
// glossy circular icon chip + large translucent background-glyph treatment,
// same approach as the redesigned Delivery/Pickups/Requote/Bookings pages.
const SERVICE_STATUS_STYLES = {
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
  purple: {
    card: 'bg-gradient-to-br from-[#F5F3FF] to-[#E8E1FC]',
    chip: 'bg-gradient-to-br from-[#A78BFA] to-[#8B5CF6]',
    value: 'text-[#10213D]',
    label: 'text-[#6D5A9E]',
    wave: 'text-[#C4B5FD]',
    glow: 'bg-[#C4B5FD]',
  },
};

function ServiceStatusStatCard({ icon: Icon, bgIcon: BgIcon, label, value, tone }) {
  const s = SERVICE_STATUS_STYLES[tone] || SERVICE_STATUS_STYLES.green;
  return (
    <div
      className={cx(
        'relative flex h-[178px] flex-col overflow-hidden rounded-[22px] border border-[#E4ECE8] p-5 shadow-[0_12px_30px_rgba(20,80,55,0.07),0_2px_8px_rgba(20,80,55,0.03)]',
        s.card,
      )}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[22px] bg-gradient-to-b from-white/55 to-transparent" aria-hidden="true" />
      <BgIcon className={cx('pointer-events-none absolute -bottom-7 -right-7 h-32 w-32 rotate-[-10deg] opacity-[0.28]', s.wave)} aria-hidden="true" />
      <span className={cx('pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-40', s.glow)} aria-hidden="true" />

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

      <p className={cx('relative mt-4 text-[30px] font-extrabold leading-none tracking-tight sm:text-[32px]', s.value)}>{value}</p>
      <p className={cx('relative mt-1.5 text-sm font-semibold', s.label)}>{label}</p>
    </div>
  );
}

export default function ServiceStatusPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
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
        if (alive) setError(err.message || 'Could not load service status.');
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
        .filter((t) => String(t.status || '').toUpperCase() !== 'DELIVERED')
        .map((t) => ({ ...t, stageLabel: ticketStageLabel(t.status) }))
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)),
    [tickets],
  );

  const counts = useMemo(() => {
    const c = { All: rows.length };
    FILTERS.forEach((f) => {
      if (f !== 'All') c[f] = 0;
    });
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
    { label: 'Active Services', value: rows.length, icon: Clock, bgIcon: Clock, tone: 'green' },
    { label: 'Awaiting Approval', value: counts['Quote Pending'] || 0, icon: Clock, bgIcon: FileClock, tone: 'orange' },
    { label: 'In Repair', value: counts['Repair In Progress'] || 0, icon: Clock, bgIcon: Wrench, tone: 'blue' },
    { label: 'Ready for Delivery', value: counts['Ready for Delivery'] || 0, icon: Clock, bgIcon: Package, tone: 'purple' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero — soft mint gradient banner with layered abstract waves + a
          decorative "SERVICE STATUS" clipboard/gear/wrench/phone/package
          illustration on the far right, matching the same premium design
          system as the other redesigned Partner Dashboard pages.
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
            <h1 className="text-[32px] font-extrabold tracking-tight text-[#10213D] sm:text-[38px]">Service Status</h1>
            <p className="mt-1.5 text-[15px] text-[#667085] sm:text-base">Track the current progress and status of active repair services.</p>
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
          <ServiceStatusIllustration />
        </div>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} /> : null}

      {loading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <ServiceStatusStatCard key={s.label} icon={s.icon} bgIcon={s.bgIcon} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
      )}

      <section className="overflow-hidden rounded-[22px] border border-[#E4ECE8] bg-gradient-to-b from-white to-[#FBFEFC]/96 shadow-[0_12px_30px_rgba(20,80,55,0.07),0_2px_8px_rgba(20,80,55,0.03)]">
        <div className="flex flex-col gap-3.5 border-b border-[#EEF3F0] px-5 py-5 sm:px-6">
          <FilterChips options={FILTERS} value={filter} onChange={setFilter} counts={counts} />
          <SearchField value={query} onChange={setQuery} placeholder="Search by tracking ID, customer, or device" />
        </div>

        {loading ? (
          <SkeletonRows rows={5} />
        ) : filtered.length === 0 ? (
          rows.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
              <ServiceStatusEmptyIllustration />
              <p className="mt-3 text-base font-bold text-[#10213D]">No service records found</p>
              <p className="mt-1 max-w-sm text-sm text-[#667085]">Active repair service updates will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
              <Icon3D icon={Clock} tone="gray" size="lg" />
              <p className="mt-3 text-sm font-bold text-[#10213D]">No services match your filters</p>
              <p className="mt-1 text-sm text-[#667085]">Try a different stage or search term.</p>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-2.5 p-3 sm:p-4">
            {filtered.map((t) => (
              <ServiceStatusRow key={t.id} ticket={t} expanded={expandedId === t.id} onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ServiceStatusRow({ ticket, expanded, onToggle }) {
  const progress = ticketStageProgress(ticket.status);
  const cancelled = String(ticket.status || '').toUpperCase() === 'CANCELLED';

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E7EFEB] bg-white shadow-[0_5px_16px_rgba(20,80,55,0.04)] transition duration-200 ease-out hover:-translate-y-px hover:shadow-[0_8px_22px_rgba(20,80,55,0.07)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cx(
          'group flex w-full items-center gap-3.5 px-4 py-4 text-left transition duration-200 ease-out hover:bg-gradient-to-r hover:from-[#E7F9EF]/55 hover:to-white sm:px-5',
          FOCUS_RING,
        )}
      >
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <span className="absolute inset-0 -m-1 rounded-full bg-[#86EFAC] opacity-40 blur-md" aria-hidden="true" />
          <Icon3D icon={Clock} tone="green" size="lg" className="relative shadow-[0_5px_14px_rgba(8,145,75,0.16),inset_0_1.5px_0_rgba(255,255,255,0.5)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-[#10213D]">{ticket.customerName || ticket.deviceDisplayName || 'Ticket'}</p>
          <p className="truncate text-[13px] text-[#667085]">
            #{ticket.trackingId || ticket.id} {ticket.deviceDisplayName ? `· ${ticket.deviceDisplayName}` : ''}
          </p>
        </div>
        <span
          className={cx(
            'hidden shrink-0 items-center rounded-full px-3.5 py-2 text-[0.68rem] font-bold uppercase tracking-wide sm:inline-flex',
            TICKET_STAGE_BADGE[ticket.stageLabel] || 'bg-[#F0FDF4] text-[#667085]',
          )}
        >
          {ticket.stageLabel}
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E4ECE8] bg-white text-[#10213D] shadow-sm transition group-hover:shadow-[0_2px_10px_rgba(6,122,61,0.14)]">
          <ChevronDown className={cx('h-4 w-4 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-dashed border-[#EAECF0] bg-[#F3FBF7] px-4 py-4 sm:px-5">
          <span
            className={cx(
              'mb-3 inline-block rounded-full px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wide sm:hidden',
              TICKET_STAGE_BADGE[ticket.stageLabel] || 'bg-[#F0FDF4] text-[#667085]',
            )}
          >
            {ticket.stageLabel}
          </span>
          {ticket.updatedAt ? (
            <p className="mb-3 text-xs text-[#667085]">Last updated {new Date(ticket.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
          ) : null}

          {cancelled ? (
            <p className="text-sm font-semibold text-red-600">This service was cancelled.</p>
          ) : (
            <ol className="space-y-0">
              {TICKET_STAGES.map((stage, i) => {
                const done = progress >= 0 && i < progress;
                const current = progress >= 0 && i === progress;
                const upcoming = !done && !current;
                return (
                  <li key={stage.key} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < TICKET_STAGES.length - 1 ? (
                      <span
                        className={cx('absolute left-[11px] top-6 h-full w-[2px]', done || current ? 'bg-[#15803D]' : 'bg-[#EAECF0]')}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span
                      className={cx(
                        'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                        done ? 'bg-[#15803D] text-white' : current ? 'bg-[#15803D] text-white ring-4 ring-[#DCFCE7]' : 'bg-white text-[#98A2B3] ring-1 ring-[#D0D5DD]',
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                    <span className={cx('text-sm', current ? 'font-bold text-[#101828]' : done ? 'font-semibold text-[#344054]' : 'text-[#98A2B3]', upcoming && 'opacity-80')}>
                      {stage.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}
