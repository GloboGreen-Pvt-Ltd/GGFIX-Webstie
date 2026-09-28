'use client';

/**
 * /shop-home/services/warranty — warranty claims & rework requests.
 *
 * There is no backend concept of a warranty claim or rework request
 * anywhere in this codebase — no ticket/booking field, no status value, no
 * endpoint (confirmed by a full-tree search; the only "warranty" hits
 * anywhere are marketing copy and the unrelated Sell/marketplace device
 * warranty term). This is a genuine data gap, not a missing UI: there is
 * nothing to filter, list, or approve/reject yet.
 *
 * Per the brief's own rule ("do not use mock data in production pages" /
 * "show real read-only tracking data rather than fake buttons"), this page
 * is an honest, properly designed empty state — real header, real (dashed)
 * stat tiles, real filter chips that are simply inert because there is
 * nothing behind them, and a Refresh button that's honestly disabled (with
 * an explanatory tooltip) rather than a no-op that pretends to reload
 * something — rather than either a generic "Coming soon" stub or an
 * invented list of fake claims.
 *
 * 2026-09: UI-only redesign to match the premium soft-3D GGFIX visual
 * language used across the other redesigned Partner Dashboard pages — the
 * "no data yet" logic above, the STATS/FILTERS content, and every value
 * shown ("—") are unchanged.
 */

import { RefreshCw, Repeat, ShieldCheck, ClipboardCheck } from 'lucide-react';

import { cx } from '@/components/site/ui';
import FilterChips from '@/components/shop-dashboard/FilterChips';

const STATS = [
  { label: 'Total Requests', icon: ShieldCheck, bgIcon: ShieldCheck, tone: 'green' },
  { label: 'Warranty Claims', icon: ShieldCheck, bgIcon: ShieldCheck, tone: 'blue' },
  { label: 'Rework Requests', icon: Repeat, bgIcon: Repeat, tone: 'orange' },
  { label: 'Completed', icon: ClipboardCheck, bgIcon: ClipboardCheck, tone: 'purple' },
];

const FILTERS = ['All', 'Warranty', 'Rework', 'Pending', 'Approved', 'Rejected', 'Completed'];

/**
 * WarrantyIllustration — small decorative graphic for the hero's right side
 * (a "WARRANTY" clipboard, a shield with a checkmark, a phone, a wrench, a
 * gear and package boxes), matching a reference design. Hand-drawn inline
 * SVG with layered gradients/filter-based drop shadows for a soft-3D feel,
 * purely decorative — no data — same technique as the other redesigned
 * Partner Dashboard pages' hero illustrations.
 */
function WarrantyIllustration() {
  return (
    <svg viewBox="0 0 300 190" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="wrClip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EAF9EF" />
        </linearGradient>
        <linearGradient id="wrShield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#0A934D" />
        </linearGradient>
        <linearGradient id="wrPhone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22C55E" />
          <stop offset="1" stopColor="#0A934D" />
        </linearGradient>
        <linearGradient id="wrBox" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EBD3A8" />
          <stop offset="1" stopColor="#C69B5F" />
        </linearGradient>
        <filter id="wrShadow" x="-40%" y="-40%" width="180%" height="180%">
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

      {/* package boxes, right */}
      <g filter="url(#wrShadow)">
        <rect x="238" y="128" width="34" height="30" rx="3" fill="url(#wrBox)" />
        <rect x="238" y="128" width="34" height="8" fill="#B99568" opacity="0.8" />
        <rect x="262" y="140" width="28" height="26" rx="3" fill="#E4C79D" />
        <rect x="262" y="140" width="28" height="7" fill="#C7A575" opacity="0.8" />
      </g>

      {/* gear */}
      <g filter="url(#wrShadow)" transform="translate(258,96)">
        <circle r="16" fill="url(#wrShield)" />
        <circle r="6" fill="white" opacity="0.9" />
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <rect key={deg} x="-3" y="-21" width="6" height="9" rx="2" fill="url(#wrShield)" transform={`rotate(${deg})`} />
        ))}
      </g>

      {/* main WARRANTY clipboard */}
      <g filter="url(#wrShadow)">
        <rect x="148" y="30" width="80" height="118" rx="10" fill="url(#wrClip)" stroke="#DCFCE7" strokeWidth="2" />
        <rect x="172" y="22" width="32" height="16" rx="6" fill="#0A934D" />
        <rect x="158" y="52" width="60" height="15" rx="4" fill="#FFFFFF" stroke="#DFF8EB" strokeWidth="1.5" />
        <text x="188" y="63" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#0C6636">WARRANTY</text>

        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(158,${78 + i * 17})`}>
            <circle cx="6" cy="6" r="6" fill="#0A934D" />
            <path d="M3 6 l2 2 l4 -4" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="18" y="3" width="48" height="6" rx="3" fill="#DCFCE7" />
          </g>
        ))}

        {/* shield with checkmark, overlapping the clipboard */}
        <g transform="translate(196,116)">
          <path d="M0 -20 c11 0 20 5 20 5 v16 c0 14 -20 24 -20 24 s-20 -10 -20 -24 v-16 s9 -5 20 -5 z" fill="url(#wrShield)" />
          <path d="M-8 0 l6 6 l12 -14" stroke="white" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>

      {/* phone, left */}
      <g filter="url(#wrShadow)">
        <rect x="98" y="88" width="30" height="52" rx="8" fill="url(#wrPhone)" />
        <rect x="102" y="94" width="22" height="34" rx="2" fill="#EAF5FF" />
        <circle cx="113" cy="134" r="1.6" fill="white" opacity="0.85" />
      </g>

      {/* wrench, floating near the phone */}
      <g filter="url(#wrShadow)" transform="translate(86,138) rotate(-28)">
        <rect x="0" y="0" width="36" height="8" rx="4" fill="#0A934D" />
        <circle cx="0" cy="4" r="8" fill="none" stroke="#0A934D" strokeWidth="6" />
      </g>

      <circle cx="126" cy="46" r="3.5" fill="#86EFAC" />
      <circle cx="94" cy="70" r="3" fill="#86EFAC" />
    </svg>
  );
}

/** Small decorative empty-state graphic — a document + shield/check badge with a soft mint circle behind it, matching a reference design. Purely decorative. */
function WarrantyEmptyIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="h-32 w-32" aria-hidden="true">
      <defs>
        <linearGradient id="wrEmptyDoc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="wrEmptyBadge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="80" r="66" fill="#DFF8EB" opacity="0.55" />
      <circle cx="100" cy="80" r="40" fill="#EAF5FF" opacity="0.6" />
      <ellipse cx="100" cy="138" rx="42" ry="8" fill="#0C6636" opacity="0.08" />
      <circle cx="36" cy="44" r="4" fill="#86EFAC" />
      <circle cx="162" cy="102" r="3.5" fill="#86EFAC" />
      <ellipse cx="164" cy="46" rx="16" ry="9" fill="#BFE8FF" opacity="0.7" />

      <g transform="translate(64,42) rotate(-6)">
        <rect x="0" y="0" width="60" height="76" rx="8" fill="url(#wrEmptyDoc)" stroke="#CBD5E1" strokeWidth="1.5" />
        <rect x="12" y="14" width="36" height="4" rx="2" fill="#CBD5E1" />
        <rect x="12" y="24" width="28" height="4" rx="2" fill="#CBD5E1" />
        <rect x="12" y="34" width="32" height="4" rx="2" fill="#CBD5E1" />
      </g>

      <g transform="translate(90,66)">
        <path d="M0 -22 c12 0 22 6 22 6 v18 c0 15 -22 26 -22 26 s-22 -11 -22 -26 v-18 s10 -6 22 -6 z" fill="url(#wrEmptyBadge)" />
        <path d="M-9 0 l7 7 l13 -15" stroke="white" strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// Page-local pastel KPI-card styling — not the shared StatCard (used by ~10
// other pages, unaffected): matches a reference design's pastel-gradient +
// glossy circular icon chip + large translucent background-glyph treatment,
// same approach as the redesigned Delivery/Pickups/Requote/Bookings pages.
const WARRANTY_STAT_STYLES = {
  green: {
    card: 'bg-gradient-to-br from-[#F3FBF7] to-[#E4F8EC]',
    chip: 'bg-gradient-to-br from-[#22C55E] to-[#0A934D]',
    value: 'text-[#10213D]',
    label: 'text-[#066B39]',
    wave: 'text-[#BBF7D0]',
    glow: 'bg-[#86EFAC]',
  },
  blue: {
    card: 'bg-gradient-to-br from-[#EFF9FF] to-[#D9F0FE]',
    chip: 'bg-gradient-to-br from-[#38BDF8] to-[#1DA8E8]',
    value: 'text-[#10213D]',
    label: 'text-[#1D6FA0]',
    wave: 'text-[#93D6F7]',
    glow: 'bg-[#93D6F7]',
  },
  orange: {
    card: 'bg-gradient-to-br from-[#FFF7ED] to-[#FDE7CB]',
    chip: 'bg-gradient-to-br from-[#FB923C] to-[#FF7A1A]',
    value: 'text-[#10213D]',
    label: 'text-[#9A5B27]',
    wave: 'text-[#FDBA74]',
    glow: 'bg-[#FDBA74]',
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

function WarrantyStatCard({ icon: Icon, bgIcon: BgIcon, label, tone }) {
  const s = WARRANTY_STAT_STYLES[tone] || WARRANTY_STAT_STYLES.green;
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

      {/* "—" (unavailable) — same as before, never a fabricated count */}
      <p className={cx('relative mt-4 text-[30px] font-extrabold leading-none tracking-tight sm:text-[32px]', s.value)}>—</p>
      <p className={cx('relative mt-1.5 text-sm font-semibold', s.label)}>{label}</p>
    </div>
  );
}

export default function WarrantyReworkPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Hero — soft mint gradient banner with layered abstract waves + a
          decorative "WARRANTY" clipboard/shield/phone/wrench/gear/boxes
          illustration on the far right, matching the same premium design
          system as the other redesigned Partner Dashboard pages.
          Title/subtitle are the exact same content this page always had. */}
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
            <h1 className="text-[32px] font-extrabold tracking-tight text-[#10213D] sm:text-[38px]">Warranty / Rework</h1>
            <p className="mt-1.5 text-[15px] text-[#667085] sm:text-base">Manage warranty claims and rework repair requests.</p>
          </div>
          <button
            type="button"
            disabled
            title="No warranty or rework data source exists yet to refresh"
            aria-label="Refresh — not yet available"
            className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-full border border-[#E4ECE8] bg-white px-4 py-2.5 text-sm font-semibold text-[#98A2B3] shadow-sm"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-0 right-2 hidden h-[160px] w-[240px] md:block lg:right-4 lg:h-[190px] lg:w-[290px]">
          <WarrantyIllustration />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((s) => (
          <WarrantyStatCard key={s.label} icon={s.icon} bgIcon={s.bgIcon} label={s.label} tone={s.tone} />
        ))}
      </div>

      <section className="flex min-h-[340px] flex-col overflow-hidden rounded-[22px] border border-[#E4ECE8] bg-white/96 shadow-[0_12px_30px_rgba(20,80,55,0.06),0_2px_8px_rgba(20,80,55,0.03)]">
        <div className="border-b border-[#EEF3F0] px-5 py-5 opacity-60 sm:px-6">
          <FilterChips options={FILTERS} value="All" onChange={() => {}} />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <WarrantyEmptyIllustration />
          <p className="mt-4 max-w-[560px] text-lg font-bold text-[#10213D]">Warranty and rework tracking isn&apos;t available yet</p>
          <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-[#667085]">
            This backend has not started providing warranty or rework request data yet, so details may not be available. Nothing is being hidden or
            filtered; there&apos;s simply nothing to show until that&apos;s active.
          </p>
        </div>
      </section>
    </div>
  );
}
