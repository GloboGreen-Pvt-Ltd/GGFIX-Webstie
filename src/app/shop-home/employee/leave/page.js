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
import PageHeader from '@/components/shop-dashboard/PageHeader';

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
    card: 'bg-[#F8F8F8]',
    chip: 'bg-gradient-to-br from-[#22C55E] to-[#0A934D]',
    value: 'text-[#10213D]',
    label: 'text-[#066B39]',
    wave: 'text-[#BBF7D0]',
    glow: 'bg-[#F3F3F3]',
  },
  blue: {
    card: 'bg-[#F8F8F8]',
    chip: 'bg-gradient-to-br from-[#38BDF8] to-[#1DA8E8]',
    value: 'text-[#10213D]',
    label: 'text-[#1D6FA0]',
    wave: 'text-[#93D6F7]',
    glow: 'bg-[#93D6F7]',
  },
  orange: {
    card: 'bg-[#F8F8F8]',
    chip: 'bg-gradient-to-br from-[#FB923C] to-[#FF7A1A]',
    value: 'text-[#10213D]',
    label: 'text-[#9A5B27]',
    wave: 'text-[#FDBA74]',
    glow: 'bg-[#FDBA74]',
  },
  pink: {
    card: 'bg-[#F8F8F8]',
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
        'relative flex h-[170px] flex-col overflow-hidden rounded-[22px] border border-[#ECECEC] p-5',
        s.card,
      )}
    >
      <BgIcon className={cx('pointer-events-none absolute -bottom-7 -right-7 h-32 w-32 rotate-[-10deg] opacity-[0.28]', s.wave)} aria-hidden="true" />

      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
        <span
          className={cx(
            'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white',
            s.chip,
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      </span>

      {/* "—" (unavailable) — no leave-request backend exists, so this is
          never replaced with a fabricated count. */}
      <p className={cx('relative mt-3 text-[30px] font-extrabold leading-none tracking-tight sm:text-[32px]', s.value)}>—</p>
      <p className={cx('relative mt-1.5 text-sm font-semibold', s.label)}>{label}</p>
    </div>
  );
}

/**
 * Empty-state graphic, matching the Partner app's Leave Requests screen: a
 * mint rounded tile holding a teal clipboard, a pale-yellow badge with an
 * amber check, plus sparkle and magnifier accents. Purely decorative.
 */
function LeaveEmptyIllustration() {
  return (
    <svg viewBox="0 0 200 180" className="h-36 w-40" aria-hidden="true">
      {/* sparkles */}
      <path d="M36 18 q2 9 11 11 q-9 2 -11 11 q-2 -9 -11 -11 q9 -2 11 -11 z" fill="none" stroke="#7FB8A6" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M50 12 v7 M46.5 15.5 h7" stroke="#7FB8A6" strokeWidth="2" strokeLinecap="round" />
      <circle cx="27" cy="38" r="2.6" fill="none" stroke="#7FB8A6" strokeWidth="1.8" />
      <path d="M166 44 q1 4 5 5 q-4 1 -5 5 q-1 -4 -5 -5 q4 -1 5 -5 z" fill="#CDEBD9" />

      {/* mint tile */}
      <rect x="44" y="24" width="112" height="112" rx="30" fill="#EEF7EF" />

      {/* magnifier, peeking from behind the tile */}
      <circle cx="160" cy="112" r="11" fill="none" stroke="#DCEFE3" strokeWidth="3" />
      <path d="M168 120 l8 8" stroke="#DCEFE3" strokeWidth="3.5" strokeLinecap="round" />

      {/* clipboard */}
      <rect x="75" y="52" width="46" height="58" rx="8" fill="none" stroke="#6FAE9F" strokeWidth="4.5" />
      <rect x="86" y="44" width="24" height="13" rx="5" fill="#EEF7EF" stroke="#6FAE9F" strokeWidth="4.5" />
      <circle cx="87" cy="75" r="2.8" fill="#6FAE9F" />
      <path d="M95 75 h14" stroke="#6FAE9F" strokeWidth="4.5" strokeLinecap="round" />

      {/* check badge */}
      <circle cx="98" cy="113" r="31" fill="#FDF3C8" />
      <circle cx="98" cy="113" r="21" fill="none" stroke="#C2570C" strokeWidth="4" />
      <path d="M89 113.5 l6.5 6.5 l12 -13" fill="none" stroke="#C2570C" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LeaveManagementPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Leave Management" subtitle="Manage employee leave requests and approvals." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((s) => (
          <LeaveStatCard key={s.label} icon={s.icon} bgIcon={s.bgIcon} label={s.label} tone={s.tone} />
        ))}
      </div>

      <section className="flex min-h-[300px] flex-col overflow-hidden rounded-[22px] border border-[#ECECEC] bg-[#F8F8F8]">
        <div className="border-b border-[#ECECEC] px-5 py-5 opacity-60 sm:px-6">
          <FilterChips options={FILTERS} value="All" onChange={() => {}} />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <LeaveEmptyIllustration />
          <p className="mt-4 text-lg font-bold text-[#10213D]">Not available yet</p>
          <p className="mt-2 max-w-[520px] text-sm leading-relaxed text-[#666666]">
            Leave request tracking isn&apos;t available yet — the backend has no leave request data or endpoint for employees.
          </p>
        </div>
      </section>
    </div>
  );
}
