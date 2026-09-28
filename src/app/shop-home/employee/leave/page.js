'use client';

/**
 * /shop-home/employee/leave — no backing endpoint exists anywhere in this
 * codebase (no leave-request field, status, or API for employees). This is a
 * genuine data gap, not a missing UI — there is nothing to filter, list, or
 * approve/reject yet.
 *
 * This page used to render the shared NotYetAvailablePage component (still
 * used, unchanged, by the other 7 "no backend yet" pages — attendance,
 * tasks, salary, shift-schedule, and 3 report pages). 2026-09: given its own
 * bespoke UI here, matching a reference design specific to Leave Management,
 * without touching NotYetAvailablePage or any of its other consumers. The
 * underlying honesty is unchanged: every KPI value is a literal "—", the
 * filter pills are inert (opacity-reduced, no-op onChange), and the empty
 * state explains exactly why, in the same words as before — real page
 * chrome, no fabricated data.
 */

import { CalendarCheck, CalendarX, Clock, FileText } from 'lucide-react';

import { cx } from '@/components/site/ui';
import FilterChips from '@/components/shop-dashboard/FilterChips';

const STATS = [
  { label: 'Total Leave Requests', icon: FileText, bgIcon: FileText, tone: 'green' },
  { label: 'Pending Approval', icon: Clock, bgIcon: Clock, tone: 'blue' },
  { label: 'Approved', icon: CalendarCheck, bgIcon: CalendarCheck, tone: 'orange' },
  { label: 'Rejected', icon: CalendarX, bgIcon: CalendarX, tone: 'pink' },
];

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

// Page-local pastel KPI-card styling — not the shared StatCard (used by ~10
// other pages, unaffected): matches a reference design's pastel-gradient +
// glossy circular icon chip + large translucent background-glyph treatment,
// same approach as the redesigned Delivery/Pickups/Requote/Bookings pages.
const LEAVE_STAT_STYLES = {
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
  pink: {
    card: 'bg-gradient-to-br from-[#FFF1F2] to-[#FCE1E4]',
    chip: 'bg-gradient-to-br from-[#FB7185] to-[#F43F5E]',
    value: 'text-[#10213D]',
    label: 'text-[#9F5361]',
    wave: 'text-[#FDA4AF]',
    glow: 'bg-[#FDA4AF]',
  },
};

function LeaveStatCard({ icon: Icon, bgIcon: BgIcon, label, tone }) {
  const s = LEAVE_STAT_STYLES[tone] || LEAVE_STAT_STYLES.green;
  return (
    <div
      className={cx(
        'relative flex h-[170px] flex-col overflow-hidden rounded-[22px] border border-[#E4ECE8] p-5 shadow-[0_12px_30px_rgba(20,80,55,0.07),0_2px_8px_rgba(20,80,55,0.03)]',
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

      {/* "—" (unavailable) — no leave-request backend exists, so this is
          never replaced with a fabricated count. */}
      <p className={cx('relative mt-3 text-[30px] font-extrabold leading-none tracking-tight sm:text-[32px]', s.value)}>—</p>
      <p className={cx('relative mt-1.5 text-sm font-semibold', s.label)}>{label}</p>
    </div>
  );
}

/** Small decorative empty-state graphic — a calendar with a soft mint circle behind it, matching a reference design. Purely decorative. */
function LeaveEmptyIllustration() {
  return (
    <svg viewBox="0 0 160 140" className="h-28 w-28" aria-hidden="true">
      <defs>
        <linearGradient id="lvEmptyCal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#CBD5E1" />
          <stop offset="1" stopColor="#94A3B8" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="70" r="54" fill="#EEF2F1" opacity="0.7" />
      <ellipse cx="80" cy="118" rx="34" ry="7" fill="#334155" opacity="0.08" />
      <circle cx="34" cy="40" r="4" fill="#CBD5E1" />
      <circle cx="128" cy="96" r="3.5" fill="#CBD5E1" />
      <g transform="translate(46,44)">
        <rect x="0" y="6" width="68" height="60" rx="9" fill="url(#lvEmptyCal)" />
        <rect x="0" y="6" width="68" height="16" rx="9" fill="#64748B" opacity="0.5" />
        <rect x="16" y="0" width="6" height="14" rx="3" fill="#475569" />
        <rect x="46" y="0" width="6" height="14" rx="3" fill="#475569" />
        {[0, 1].map((row) =>
          [0, 1, 2].map((col) => (
            <rect key={`${row}-${col}`} x={9 + col * 20} y={30 + row * 18} width="12" height="12" rx="3" fill="white" opacity="0.85" />
          )),
        )}
      </g>
    </svg>
  );
}

export default function LeaveManagementPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Hero — compact premium banner, matching a reference design's
          "white -> mint" spec. The right-side artwork is the real
          public/leave management.png asset (a calendar/employee/
          approval-card/clock illustration cluster), CSS-cropped via
          background-position to show only that cluster — the same file also
          has a full mockup of this banner (title/subtitle/accent line)
          baked into its left side, so only the illustration portion is
          windowed in; the title/subtitle below are real, unchanged text. */}
      <div
        className="relative min-h-[150px] overflow-hidden rounded-[22px] p-6 shadow-[0_10px_30px_rgba(20,80,60,0.07)] sm:p-7"
        style={{
          background: 'linear-gradient(110deg, #ffffff 0%, #f7fcfa 40%, #e9faf3 100%)',
          border: '1px solid rgba(20, 140, 90, 0.10)',
        }}
      >
        <span className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-[#86EFAC]/20 blur-3xl" aria-hidden="true" />
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full text-[#DFF8EB]/55"
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

        <div className="relative z-[4] flex min-w-0 items-center gap-3 py-1 md:pr-[290px]">
          <span className="h-10 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#22C55E] to-[#0A934D]" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-[30px] font-extrabold leading-tight tracking-tight text-[#10213D] sm:text-[34px]">Leave Management</h1>
            <p className="mt-[7px] text-[14px] text-[#5B7085] sm:text-[15px]">Manage employee leave requests and approvals.</p>
          </div>
        </div>

        {/* public/leave management.png, windowed to its right-side
            illustration cluster only (original asset is 2161x728; the
            calendar/employee/clock/card cluster sits roughly at
            x:1372-2122, y:205-513 in that image) — background-size scales
            the whole image up, background-position shifts it so only that
            region falls inside this box. */}
        <div
          className="pointer-events-none absolute bottom-0 right-6 hidden h-[150px] w-[365px] md:block lg:right-7 lg:h-[165px] lg:w-[402px]"
          style={{
            backgroundImage: "url('/leave%20management.png')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1052px 355px',
            backgroundPosition: '-668px -100px',
          }}
          aria-hidden="true"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((s) => (
          <LeaveStatCard key={s.label} icon={s.icon} bgIcon={s.bgIcon} label={s.label} tone={s.tone} />
        ))}
      </div>

      <section className="flex min-h-[300px] flex-col overflow-hidden rounded-[22px] border border-[#E4ECE8] bg-white/96 shadow-[0_10px_28px_rgba(20,80,55,0.05)]">
        <div className="border-b border-[#EEF3F0] px-5 py-5 opacity-60 sm:px-6">
          <FilterChips options={FILTERS} value="All" onChange={() => {}} />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <LeaveEmptyIllustration />
          <p className="mt-4 text-lg font-bold text-[#10213D]">Not available yet</p>
          <p className="mt-2 max-w-[520px] text-sm leading-relaxed text-[#667085]">
            Leave request tracking isn&apos;t available yet — the backend has no leave request data or endpoint for employees.
          </p>
        </div>
      </section>
    </div>
  );
}
