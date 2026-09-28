'use client';

/**
 * Pickup Report — pickup-person-assigned device pickup bookings.
 *
 * Reads GET {ORDER_BASE}/repair-bookings/shop via fetchShopBookings(),
 * filtered to serviceMode === 'PICKUP'. `?employeeId=&name=` (from Employee
 * Management's Quick Access) switches into single-pickup-person mode.
 *
 * The join against a specific pickup person is id-OR-name, same defensive
 * pattern as Service Report — and per this session's own investigation,
 * `assignedPickupPersonId` has WEAKER in-repo evidence of reliability than
 * the ticket side's `assignedTechnicianId` (nothing in this codebase
 * currently reads it back successfully), so the name fallback here matters
 * at least as much, probing a couple of plausible field names defensively
 * rather than assuming one exact shape.
 *
 * 2026-09: restructured per a reference design, mirroring Service Report's
 * own restructuring (see that file's header comment for the full
 * rationale) —
 *   - "This Month" stat tiles (Assigned/In Progress/Completed/Total) are
 *     now scoped to a month switcher, filtering the already-fetched `rows`
 *     client-side by each booking's createdAt.
 *   - "Recent Assigned" / "In Progress" are small previews of the same
 *     real Pending("Assigned")/In-Progress buckets this page always
 *     computed; "View all" jumps to the full list below with that bucket
 *     pre-selected.
 *   - The page's original single filtered list is now titled "Previous
 *     Pickups" and lives at the bottom, its "Pending" filter chip relabeled
 *     "Assigned" to match — same real data and bucket underneath, just a
 *     different label (the booking-status bucket itself is still
 *     internally "Pending", same value displayBucket() always produced).
 * No new data source and nothing fabricated — every number is a real
 * filter/reduce over the same booking rows this page already fetched.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart3, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Flag, RefreshCw, Truck } from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import FilterChips from '@/components/shop-dashboard/FilterChips';
import EmptyState from '@/components/shop-dashboard/EmptyState';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { SkeletonRows, SkeletonStatCards } from '@/components/shop-dashboard/SkeletonBlocks';
import { MONTHS, shiftMonth } from '@/components/shop-dashboard/MonthSwitcher';
import { fetchShopBookings, friendlyBookingStatus } from '@/lib/shopDashboard';
import { BOOKING_STATUS_BADGE, bookingEstimatedAmount, formatBookingDate, formatPickupAddress } from '@/lib/bookingFormat';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D] focus-visible:ring-offset-2';
const FULL_LIST_FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'Completed', label: 'Completed' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Pending', label: 'Assigned' },
];

/** Small decorative empty-state graphic — a clipboard with an orange flag and a small parcel, matching a reference design. Purely decorative. */
function RecentAssignedEmptyIllustration() {
  return (
    <svg viewBox="0 0 160 140" className="h-24 w-24" aria-hidden="true">
      <defs>
        <linearGradient id="raEmptyBoard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F0FDF4" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="70" r="54" fill="#DFF8EB" opacity="0.65" />
      <ellipse cx="80" cy="118" rx="34" ry="7" fill="#0C6636" opacity="0.08" />
      <path d="M40 118 q-4 -22 14 -28 q4 16 -14 28" fill="#4ADE80" opacity="0.8" />
      <path d="M124 116 q6 -18 -10 -26 q-4 14 10 26" fill="#22C55E" opacity="0.75" />
      <g transform="translate(52,36) rotate(-4)">
        <rect x="0" y="0" width="56" height="70" rx="7" fill="url(#raEmptyBoard)" stroke="#DCFCE7" strokeWidth="2" />
        <rect x="18" y="-6" width="20" height="10" rx="3" fill="#0A934D" />
        <rect x="10" y="14" width="36" height="4" rx="2" fill="#DCFCE7" />
        <rect x="10" y="23" width="28" height="4" rx="2" fill="#DCFCE7" />
        <rect x="10" y="32" width="32" height="4" rx="2" fill="#DCFCE7" />
      </g>
      <g filter="none" transform="translate(30,84)">
        <path d="M0 0 v26 l10 4 l10 -4 v-26 l-10 4 z" fill="#FF9A19" />
        <path d="M0 0 l10 4 l10 -4" fill="none" stroke="#C2410C" strokeWidth="1.2" />
      </g>
      <g transform="translate(88,90)">
        <rect x="0" y="6" width="26" height="22" rx="2" fill="#D6B98C" />
        <rect x="0" y="6" width="26" height="6" fill="#B99568" opacity="0.85" />
        <path d="M-6 -2 l3 -16 h6 l2 16 z" fill="#FF7A1A" />
      </g>
    </svg>
  );
}

/** Small decorative empty-state graphic — a pickup truck with a dashed route and a location pin, matching a reference design. Purely decorative. */
function InProgressEmptyIllustration() {
  return (
    <svg viewBox="0 0 160 140" className="h-24 w-24" aria-hidden="true">
      <defs>
        <linearGradient id="ipEmptyTruck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#0A934D" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="70" r="54" fill="#DFF0FB" opacity="0.65" />
      <ellipse cx="80" cy="112" rx="36" ry="7" fill="#0C6636" opacity="0.08" />
      <path d="M38 112 q-4 -20 12 -26 q4 14 -12 26" fill="#4ADE80" opacity="0.8" />
      <path d="M124 110 q6 -16 -8 -24 q-4 12 8 24" fill="#22C55E" opacity="0.75" />
      <path d="M40 60 C60 30, 90 50, 112 34" fill="none" stroke="#38BDF8" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="4 5" />
      <path d="M112 34 c9 0 16 7 16 16 0 10 -16 24 -16 24 s-16 -14 -16 -24 c0 -9 7 -16 16 -16 z" fill="#FF7A1A" />
      <circle cx="112" cy="50" r="6" fill="white" />
      <g transform="translate(30,72)">
        <rect x="0" y="0" width="42" height="26" rx="4" fill="url(#ipEmptyTruck)" />
        <path d="M42 8 h14 l8 8 v10 h-22 z" fill="url(#ipEmptyTruck)" />
        <rect x="47" y="12" width="9" height="7" rx="1.5" fill="#DFF6FF" />
        <rect x="6" y="4" width="18" height="10" rx="2" fill="white" opacity="0.9" />
        <circle cx="12" cy="30" r="5" fill="#10213D" />
        <circle cx="48" cy="30" r="5" fill="#10213D" />
      </g>
    </svg>
  );
}

// Page-local pastel KPI-card styling — not the shared StatCard (used by ~10
// other pages, unaffected): matches a reference design's pastel-gradient +
// glossy circular icon chip + large translucent background-glyph treatment,
// same approach as the redesigned Delivery/Pickups/Requote/Bookings pages.
const PICKUP_REPORT_STAT_STYLES = {
  orange: {
    card: 'bg-gradient-to-br from-[#FFFBF5] to-[#FFF0D9]',
    chip: 'bg-gradient-to-br from-[#FBBF54] to-[#FF7A1A]',
    value: 'text-[#10213D]',
    label: 'text-[#9A5B27]',
    wave: 'text-[#FDD08A]',
    glow: 'bg-[#FDD08A]',
  },
  blue: {
    card: 'bg-gradient-to-br from-[#F7FBFF] to-[#E4F3FF]',
    chip: 'bg-gradient-to-br from-[#38BDF8] to-[#199DE8]',
    value: 'text-[#10213D]',
    label: 'text-[#1D6FA0]',
    wave: 'text-[#93D6F7]',
    glow: 'bg-[#93D6F7]',
  },
  green: {
    card: 'bg-gradient-to-br from-[#F5FFF9] to-[#DFF9EC]',
    chip: 'bg-gradient-to-br from-[#22C55E] to-[#0FA958]',
    value: 'text-[#10213D]',
    label: 'text-[#066B39]',
    wave: 'text-[#BBF7D0]',
    glow: 'bg-[#86EFAC]',
  },
  violet: {
    card: 'bg-gradient-to-br from-[#FAF8FF] to-[#EDE6FE]',
    chip: 'bg-gradient-to-br from-[#A78BFA] to-[#8247F5]',
    value: 'text-[#10213D]',
    label: 'text-[#6D5A9E]',
    wave: 'text-[#C4B5FD]',
    glow: 'bg-[#C4B5FD]',
  },
};

function PickupReportStatCard({ icon: Icon, label, value, tone }) {
  const s = PICKUP_REPORT_STAT_STYLES[tone] || PICKUP_REPORT_STAT_STYLES.green;
  return (
    <div
      className={cx(
        'group relative flex h-[150px] flex-col justify-between overflow-hidden rounded-[20px] border border-[#E6ECE9] p-5 shadow-[0_8px_22px_rgba(20,40,60,0.06)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_14px_30px_rgba(20,40,60,0.1)]',
        s.card,
      )}
    >
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 rounded-b-[20px] bg-gradient-to-t from-white/40 to-transparent" aria-hidden="true" />
      <Icon className={cx('pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 opacity-[0.1]', s.wave)} aria-hidden="true" />

      <span
        className={cx(
          'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_9px_22px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.5)]',
          s.chip,
        )}
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>

      <div className="relative">
        <p className={cx('text-[15px] font-bold', s.label)}>{label}</p>
        <p className={cx('mt-1 text-[32px] font-extrabold leading-none tracking-tight', s.value)}>{value}</p>
      </div>
    </div>
  );
}

function assigneeName(booking) {
  return booking.assignedPickupPersonName || booking.pickupPersonName || '';
}

function displayBucket(statusLabel) {
  if (statusLabel === 'Created') return 'Pending';
  if (statusLabel === 'Pickup' || statusLabel === 'In Progress') return 'In Progress';
  return statusLabel;
}

export default function PickupReportClient() {
  const params = useSearchParams();
  const employeeId = params.get('employeeId') || '';
  const employeeName = params.get('name') || '';
  const singleMode = Boolean(employeeId || employeeName);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const fullListRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetchShopBookings()
      .then((list) => {
        if (alive) setBookings(list);
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load the pickup report.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const scoped = useMemo(() => {
    const pickupOnly = bookings.filter((b) => b.serviceMode === 'PICKUP');
    if (!singleMode) return pickupOnly;
    return pickupOnly.filter(
      (b) => (employeeId && b.assignedPickupPersonId === employeeId) || (employeeName && assigneeName(b) === employeeName),
    );
  }, [bookings, singleMode, employeeId, employeeName]);

  const rows = useMemo(
    () =>
      scoped
        .map((b) => {
          const { statusLabel } = friendlyBookingStatus(b.status);
          return { ...b, statusLabel, displayStatus: displayBucket(statusLabel) };
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [scoped],
  );

  const counts = useMemo(() => {
    const c = { All: rows.length, Pending: 0, 'In Progress': 0, Completed: 0, Cancelled: 0 };
    rows.forEach((r) => {
      c[r.displayStatus] = (c[r.displayStatus] || 0) + 1;
    });
    return c;
  }, [rows]);

  const monthCounts = useMemo(() => {
    const c = { Pending: 0, 'In Progress': 0, Completed: 0, total: 0 };
    rows.forEach((r) => {
      const d = new Date(r.createdAt || 0);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() !== viewDate.getFullYear() || d.getMonth() !== viewDate.getMonth()) return;
      c.total += 1;
      if (r.displayStatus !== 'Cancelled') c[r.displayStatus] = (c[r.displayStatus] || 0) + 1;
    });
    return c;
  }, [rows, viewDate]);

  const recentAssigned = useMemo(() => rows.filter((r) => r.displayStatus === 'Pending').slice(0, 3), [rows]);
  const inProgressList = useMemo(() => rows.filter((r) => r.displayStatus === 'In Progress').slice(0, 3), [rows]);
  const filtered = useMemo(() => (filter === 'All' ? rows : rows.filter((r) => r.displayStatus === filter)), [rows, filter]);

  const goPrevMonth = () => shiftMonth(setViewDate, -1);
  const goNextMonth = () => shiftMonth(setViewDate, 1);
  const goToFilter = (f) => {
    setFilter(f);
    fullListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const toggleExpanded = (id) => setExpandedId((cur) => (cur === id ? null : id));

  const monthStats = [
    { label: 'Assigned', value: monthCounts.Pending, icon: Flag, tone: 'orange' },
    { label: 'In Progress', value: monthCounts['In Progress'], icon: Truck, tone: 'blue' },
    { label: 'Completed', value: monthCounts.Completed, icon: CheckCircle2, tone: 'green' },
    { label: 'Total', value: monthCounts.total, icon: BarChart3, tone: 'violet' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Hero — uses the real existing /public/pickup-bg.png asset as the
          background (not a generated illustration): plain CSS
          background-image, referenced by its public root path exactly as
          Next.js serves anything under /public. A left-to-transparent white
          overlay sits between the image and the text so the title/subtitle
          stay readable regardless of what's under them in the photo, without
          hiding the image itself (the overlay fades to fully transparent by
          the image's right half). Title/subtitle copy and the Refresh
          handler are unchanged in behavior — only the hero's visual chrome
          changed. */}
      <div
        className="relative min-h-[200px] overflow-hidden rounded-[24px] border border-[#E6ECE9] shadow-[0_12px_32px_rgba(20,80,55,0.07),0_3px_10px_rgba(20,80,55,0.04)]"
        style={{ backgroundImage: "url('/pickup-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center right', backgroundRepeat: 'no-repeat' }}
      >
        <span
          className="pointer-events-none absolute inset-0 z-0"
          style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.75) 32%, rgba(255,255,255,0.15) 58%, rgba(255,255,255,0) 72%)' }}
          aria-hidden="true"
        />

        <div className="relative z-[4] p-6 md:p-7">
          <div className="max-w-[560px]">
            <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.13em] text-[#0A6E39]">
              <span className="h-1.5 w-4 rounded-full bg-gradient-to-r from-[#22C55E] to-[#0A934D]" aria-hidden="true" />
              Reports
            </span>
            <h1 className="mt-2 text-[30px] font-extrabold leading-[1.05] tracking-tight text-[#071B3B] sm:text-[36px] md:text-[44px]">
              Pickup Report
            </h1>
            <p className="mt-3 max-w-[520px] text-base leading-6 text-[#3F5A6E]">
              {singleMode
                ? `Pickups assigned to ${employeeName || 'this pickup person'}.`
                : 'Track pickup requests, assignments, status, and completion details.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className={cx(
            'absolute right-6 top-6 z-10 inline-flex items-center gap-1.5 rounded-full border border-[#E6ECE9] bg-white px-4 py-2.5 text-sm font-semibold text-[#10213D] shadow-sm transition hover:border-[#0FA958] hover:text-[#0FA958] md:right-7 md:top-7',
            FOCUS_RING,
          )}
        >
          <RefreshCw className={cx('h-4 w-4 text-[#0FA958]', loading && 'animate-spin')} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} /> : null}

      {/* "This Month" + month navigator — page-local styling only; the
          underlying viewDate/goPrevMonth/goNextMonth state and handlers are
          the exact same ones the shared MonthSwitcher used, untouched. Not
          switched to a bespoke shared-component change since MonthSwitcher
          is used by 11 other report pages. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[17px] font-extrabold text-[#071B3B]">
          <Icon3D icon={BarChart3} tone="green" size="sm" />
          This Month
        </span>
        <div className="inline-flex h-[46px] w-[250px] items-center justify-between rounded-full bg-gradient-to-r from-[#22C55E] to-[#0FA958] px-2 shadow-[0_4px_12px_rgba(15,169,88,0.28)]">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Previous month"
            className={cx('flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/15', FOCUS_RING)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="text-sm font-bold text-white">
            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="Next month"
            className={cx('flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/15', FOCUS_RING)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {monthStats.map((s) => (
            <PickupReportStatCard key={s.label} icon={s.icon} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
      )}

      {/* Recent Assigned / In Progress — side-by-side on desktop. */}
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        <section className="flex min-h-[370px] flex-col rounded-[20px] border border-[#E7ECEA] bg-white p-6 shadow-[0_10px_28px_rgba(21,44,58,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Icon3D icon={Flag} tone="orange" size="md" />
              <div>
                <p className="text-[20px] font-bold text-[#071B3B]">Recent Assigned</p>
                <p className="text-[13px] text-[#64748B]">Latest pickup assignments for the selected month.</p>
              </div>
            </div>
            {recentAssigned.length > 0 ? (
              <button type="button" onClick={() => goToFilter('Pending')} className="shrink-0 text-xs font-bold text-[#0FA958] hover:underline">
                View all
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-1 flex-col">
            {loading ? (
              <SkeletonRows rows={2} />
            ) : recentAssigned.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                <RecentAssignedEmptyIllustration />
                <p className="mt-3 text-base font-bold text-[#071B3B]">No new pickup assignments.</p>
                <p className="mt-1 max-w-xs text-sm text-[#64748B]">New pickup assignments for this month will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#EEF3F0] overflow-hidden rounded-2xl border border-[#EEF3F0]">
                {recentAssigned.map((b) => (
                  <PickupReportRow key={b.id} booking={b} showAssignee={!singleMode} expanded={expandedId === b.id} onToggle={() => toggleExpanded(b.id)} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-[370px] flex-col rounded-[20px] border border-[#E7ECEA] bg-white p-6 shadow-[0_10px_28px_rgba(21,44,58,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Icon3D icon={Truck} tone="blue" size="md" />
              <div>
                <p className="text-[20px] font-bold text-[#071B3B]">In Progress</p>
                <p className="text-[13px] text-[#64748B]">Pickups currently being handled by employees.</p>
              </div>
            </div>
            {inProgressList.length > 0 ? (
              <button type="button" onClick={() => goToFilter('In Progress')} className="shrink-0 text-xs font-bold text-[#0FA958] hover:underline">
                View all
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-1 flex-col">
            {loading ? (
              <SkeletonRows rows={2} />
            ) : inProgressList.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                <InProgressEmptyIllustration />
                <p className="mt-3 text-base font-bold text-[#071B3B]">No pickups in progress.</p>
                <p className="mt-1 max-w-xs text-sm text-[#64748B]">Active pickup jobs will appear here once an assignment starts.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#EEF3F0] overflow-hidden rounded-2xl border border-[#EEF3F0]">
                {inProgressList.map((b) => (
                  <PickupReportRow key={b.id} booking={b} showAssignee={!singleMode} expanded={expandedId === b.id} onToggle={() => toggleExpanded(b.id)} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <div ref={fullListRef}>
        <p className="mb-2.5 text-sm font-bold text-[#071B3B]">Previous Pickups</p>
        <section className="overflow-hidden rounded-[20px] border border-[#E7ECEA] bg-white shadow-[0_10px_28px_rgba(21,44,58,0.05)]">
          <div className="border-b border-[#EEF3F0] px-4 py-4 sm:px-5">
            <FilterChips options={FULL_LIST_FILTERS} value={filter} onChange={setFilter} counts={counts} />
          </div>

          {loading ? (
            <SkeletonRows rows={5} />
          ) : filtered.length === 0 ? (
            rows.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No pickups yet"
                description={singleMode ? 'No pickups are assigned to this pickup person yet.' : 'Pickup bookings assigned to your pickup staff will show up here.'}
              />
            ) : (
              <EmptyState icon={Truck} tone="muted" title="No pickups found." description="Try a different status." />
            )
          ) : (
            <div className="divide-y divide-[#EEF3F0]">
              {filtered.map((b) => (
                <PickupReportRow key={b.id} booking={b} showAssignee={!singleMode} expanded={expandedId === b.id} onToggle={() => toggleExpanded(b.id)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PickupReportRow({ booking, showAssignee, expanded, onToggle }) {
  const assignee = assigneeName(booking);
  const amount = bookingEstimatedAmount(booking);
  const services = Array.isArray(booking.services) ? booking.services : [];

  return (
    <div>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#F9FAFB] sm:px-5">
        <Icon3D icon={Truck} tone="green" size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#101828]">{booking.customerName || 'Not available'}</p>
          <p className="truncate text-xs text-[#667085]">
            #{booking.bookingNumber || booking.id} · {formatBookingDate(booking.pickupDate)}
            {showAssignee ? ` · ${assignee || 'Unassigned'}` : ''}
          </p>
        </div>
        <span className={cx('hidden shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide sm:inline-block', BOOKING_STATUS_BADGE[booking.statusLabel] || 'bg-[#F0FDF4] text-[#667085]')}>
          {booking.displayStatus}
        </span>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-[#98A2B3] transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-dashed border-[#EAECF0] bg-[#F9FAFB] px-4 py-4 sm:px-5">
          <div>
            <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Customer</p>
            <p className="text-sm text-[#344054]">{booking.customerName || 'Not available'} · {booking.customerMobile || 'Not available'}</p>
          </div>
          <div>
            <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Pickup</p>
            <p className="text-sm text-[#344054]">{formatPickupAddress(booking)}</p>
          </div>
          <div>
            <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Assignment</p>
            <p className="text-sm text-[#344054]">{assignee || 'Not yet assigned'}</p>
          </div>
          {services.length ? (
            <div>
              <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Services</p>
              <ul className="space-y-1">
                {services.map((s, i) => (
                  <li key={s.repairServiceId || i} className="flex items-center justify-between text-xs text-[#667085]">
                    <span>{s.serviceName || s.serviceCode}</span>
                    {s.estimatedPrice != null ? <span className="font-semibold text-[#101828]">₹{Number(s.estimatedPrice).toLocaleString('en-IN')}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-sm font-bold text-[#101828]">{amount != null ? `₹${Number(amount).toLocaleString('en-IN')} estimated` : 'Amount not available'}</p>
        </div>
      ) : null}
    </div>
  );
}
