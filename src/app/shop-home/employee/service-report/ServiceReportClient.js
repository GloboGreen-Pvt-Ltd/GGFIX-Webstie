'use client';

/**
 * Service Report — technician-assigned repair tickets.
 *
 * Reads GET {TICKET_BASE}/tickets via fetchTicketsPaged() (src/lib/shopDashboard.js).
 * `?employeeId=&name=` (both optional, passed from Employee Management's Quick
 * Access) switches this into single-technician mode. The join is
 * deliberately id-OR-name, not id-only: shopDashboard.js's own teamActivity()
 * has to fall back to a name match because "technician-id joins have
 * drifted from the id in other parts of this codebase" — the same risk
 * applies here, so this page inherits the same defensive join rather than
 * trusting assignedTechnicianId alone.
 *
 * 2026-09: restructured per a reference design —
 *   - "This Month" stat tiles are now scoped to a month switcher. The
 *     ticket API has no server-side month filter, so this filters the
 *     already-fetched `rows` client-side by each ticket's createdAt, the
 *     same "compute it in the browser" approach shopDashboard.js's own
 *     isToday()/isYesterday() already use for the dashboard's tiles.
 *   - "Recent Pending" / "In Process" are small previews (most-recently-
 *     updated few) of the same real Pending/In-Progress buckets this page
 *     always computed; "View all" jumps to the full list below with that
 *     bucket pre-selected.
 *   - The page's original single filtered list (previously the whole
 *     page) is now titled "Previous Completed" and lives at the bottom —
 *     same real data, same FilterChips, same TaskRow, just re-labeled and
 *     re-homed under the new sections above it.
 * No new data source and nothing fabricated — every number here is a real
 * filter/reduce over the same ticket rows this page already fetched.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  BarChart3,
  CalendarDays,
  ChartPie,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cog,
  FileClock,
  Inbox,
  RefreshCw,
  TriangleAlert,
  Wrench,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import FilterChips from '@/components/shop-dashboard/FilterChips';
import EmptyState from '@/components/shop-dashboard/EmptyState';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { SkeletonRows, SkeletonStatCards } from '@/components/shop-dashboard/SkeletonBlocks';
import { MONTHS, shiftMonth } from '@/components/shop-dashboard/MonthSwitcher';
import { fetchTicketsPaged } from '@/lib/shopDashboard';
import { TICKET_STAGE_BADGE, ticketStageLabel } from '@/lib/ticketStatus';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D] focus-visible:ring-offset-2';
const FULL_LIST_FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'Completed', label: 'Completed' },
  { value: 'In Progress', label: 'In Process' },
  { value: 'Pending', label: 'Pending' },
];

// Page-local KPI-card styling — not the shared StatCard (used by ~10 other
// pages, unaffected): four distinct identities (blue/orange/green/violet)
// each with its own icon + translucent watermark, matching a reference
// design's "repair operations dashboard" look, deliberately different from
// Attendance/Shift-Management/Permission's own card treatments.
const SERVICE_STAT_STYLES = {
  blue: {
    card: 'bg-gradient-to-br from-[#EEF7FF] to-[#DFEFFE]',
    chip: 'bg-gradient-to-br from-[#5EB6FA] to-[#2196F3]',
    value: 'text-[#10233F]',
    watermark: 'text-[#2196F3]',
  },
  orange: {
    card: 'bg-gradient-to-br from-[#FFF3E4] to-[#FEE4C4]',
    chip: 'bg-gradient-to-br from-[#FFB35C] to-[#F97316]',
    value: 'text-[#10233F]',
    watermark: 'text-[#F97316]',
  },
  green: {
    card: 'bg-gradient-to-br from-[#EAFBF3] to-[#DAF5E7]',
    chip: 'bg-gradient-to-br from-[#22C55E] to-[#0BA65A]',
    value: 'text-[#10233F]',
    watermark: 'text-[#0BA65A]',
  },
  violet: {
    card: 'bg-gradient-to-br from-[#F5F0FE] to-[#EBE1FD]',
    chip: 'bg-gradient-to-br from-[#A78BFA] to-[#8B5CF6]',
    value: 'text-[#10233F]',
    watermark: 'text-[#8B5CF6]',
  },
};

function ServiceReportStatCard({ icon: Icon, watermark: Watermark, label, value, helper, tone }) {
  const s = SERVICE_STAT_STYLES[tone] || SERVICE_STAT_STYLES.blue;
  return (
    <div className={cx('relative flex h-[135px] flex-col overflow-hidden rounded-[20px] border border-[rgba(15,80,60,0.06)] p-5 shadow-[0_8px_24px_rgba(20,70,55,0.06)]', s.card)}>
      <Watermark className={cx('pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 opacity-15', s.watermark)} aria-hidden="true" />
      <div className="relative flex items-start gap-3">
        <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_6px_14px_rgba(0,0,0,0.1)]', s.chip)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 pt-1">
          <p className={cx('text-[28px] font-extrabold leading-none', s.value)}>{value}</p>
          <p className="mt-1.5 text-sm font-bold text-[#10233F]">{label}</p>
        </div>
      </div>
      <p className="relative mt-auto pt-2 text-xs text-[#6D7D94]">{helper}</p>
    </div>
  );
}

function taskBucket(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'CANCELLED') return 'Cancelled';
  if (['CREATED', 'QUOTED'].includes(s)) return 'Pending';
  if (['DELIVERED', 'READY', 'INVOICE_GENERATED', 'INVOICE_READY', 'DELIVERED_PROCESSING'].includes(s)) return 'Completed';
  return 'In Progress';
}

export default function ServiceReportClient() {
  const params = useSearchParams();
  const employeeId = params.get('employeeId') || '';
  const employeeName = params.get('name') || '';
  const singleMode = Boolean(employeeId || employeeName);

  const [tickets, setTickets] = useState([]);
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
    fetchTicketsPaged()
      .then((list) => {
        if (alive) setTickets(list);
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load the service report.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const scoped = useMemo(() => {
    if (!singleMode) return tickets;
    return tickets.filter((t) => (employeeId && t.assignedTechnicianId === employeeId) || (employeeName && t.assignedTechnicianName === employeeName));
  }, [tickets, singleMode, employeeId, employeeName]);

  const rows = useMemo(
    () =>
      scoped
        .map((t) => ({ ...t, bucket: taskBucket(t.status), stageLabel: ticketStageLabel(t.status) }))
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)),
    [scoped],
  );

  const counts = useMemo(() => {
    const c = { All: rows.length, Pending: 0, 'In Progress': 0, Completed: 0, Cancelled: 0 };
    rows.forEach((r) => {
      c[r.bucket] = (c[r.bucket] || 0) + 1;
    });
    return c;
  }, [rows]);

  const monthCounts = useMemo(() => {
    const c = { Pending: 0, 'In Progress': 0, Completed: 0, total: 0 };
    rows.forEach((r) => {
      const d = new Date(r.createdAt || r.updatedAt || 0);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() !== viewDate.getFullYear() || d.getMonth() !== viewDate.getMonth()) return;
      c.total += 1;
      if (r.bucket !== 'Cancelled') c[r.bucket] = (c[r.bucket] || 0) + 1;
    });
    return c;
  }, [rows, viewDate]);

  const recentPending = useMemo(() => rows.filter((r) => r.bucket === 'Pending').slice(0, 3), [rows]);
  const inProcess = useMemo(() => rows.filter((r) => r.bucket === 'In Progress').slice(0, 3), [rows]);
  const filtered = useMemo(() => (filter === 'All' ? rows : rows.filter((r) => r.bucket === filter)), [rows, filter]);

  const goPrevMonth = () => shiftMonth(setViewDate, -1);
  const goNextMonth = () => shiftMonth(setViewDate, 1);
  const goToFilter = (f) => {
    setFilter(f);
    fullListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const toggleExpanded = (id) => setExpandedId((cur) => (cur === id ? null : id));

  const monthStats = [
    { label: 'In Process', value: monthCounts['In Progress'], icon: Clock, watermark: Cog, tone: 'blue', helper: 'Jobs currently being worked on' },
    { label: 'Pending', value: monthCounts.Pending, icon: TriangleAlert, watermark: FileClock, tone: 'orange', helper: 'Waiting for technician action' },
    { label: 'Completed', value: monthCounts.Completed, icon: CheckCircle2, watermark: BarChart3, tone: 'green', helper: 'Successfully completed services' },
    { label: 'Total', value: monthCounts.total, icon: Wrench, watermark: ChartPie, tone: 'violet', helper: 'Total service requests this month' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero — ONE complete banner image. public/service -report.png (note:
          the actual filename on disk has a space before the hyphen), same
          crop/height as before (object-fit: cover, object-position nudged
          to frame the real title/technician/clipboard band and crop out
          the asset's own large blank margins) — unchanged, per this fix
          being layout-only. The Refresh/month controls previously overlaid
          on top of this image (right on top of its own baked "Refresh"/
          "September 2026" pills) now live in their own toolbar row below
          instead — no more overlap with the artwork. */}
      <div
        className="relative h-[108px] w-full overflow-hidden rounded-[20px] shadow-[0_6px_20px_rgba(20,70,55,0.05)] sm:h-[116px] lg:h-[124px]"
        style={{ border: '1px solid rgba(15, 140, 90, 0.14)', background: '#F5FCF8', isolation: 'isolate' }}
      >
        <Image
          src="/service%20-report.png"
          alt="Service Report — Track technician service assignments and repair work."
          fill
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: 'center 46%', borderRadius: 'inherit' }}
          priority
        />
      </div>

      {/* Toolbar — Refresh (left) / month selector with prev-next arrows
          (right), same setReloadKey/goPrevMonth/goNextMonth handlers as
          before, just relocated out of the banner into their own compact
          row so they never sit on top of the artwork. */}
      <div className="-mt-2 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className={cx(
            'inline-flex h-10 items-center gap-1.5 rounded-full border border-[#E4ECE8] bg-white px-4 text-sm font-semibold text-[#10233F] shadow-sm transition hover:border-[#0BA65A] hover:text-[#0BA65A]',
            FOCUS_RING,
          )}
        >
          <RefreshCw className={cx('h-4 w-4 text-[#0BA65A]', loading && 'animate-spin')} aria-hidden="true" />
          Refresh
        </button>
        <div className="inline-flex h-10 items-center gap-0.5 rounded-full bg-gradient-to-r from-[#22C55E] to-[#0BA65A] p-1 shadow-[0_4px_12px_rgba(11,166,90,0.28)]">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Previous month"
            className={cx('flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/15', FOCUS_RING)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="flex items-center gap-1.5 px-2 text-sm font-bold text-white">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
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

      {singleMode ? (
        <p className="-mt-3 text-[13px] text-[#6D7D94]">Repair tickets assigned to {employeeName || 'this technician'}.</p>
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} /> : null}

      {/* "This Month" summary card — one wrapping card with the month title
          on the left, a month-selector pill on the right (same
          viewDate/goPrevMonth/goNextMonth state as the hero's own month
          pill above, so both always agree), and the 4 stat boxes inside it
          in one row, per the reference layout. The hero's own Refresh/month
          pill are left exactly as they were. */}
      <section className="rounded-[20px] border border-[rgba(15,80,60,0.06)] bg-gradient-to-br from-[#F6FFFA] to-[#E9F9EF] p-4 shadow-[0_8px_24px_rgba(20,70,55,0.06)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Icon3D icon={BarChart3} tone="green" size="sm" />
            <span className="text-[15px] font-bold text-[#10233F]">This Month</span>
          </span>
          <div className="inline-flex h-9 items-center gap-0.5 rounded-full bg-gradient-to-r from-[#22C55E] to-[#0BA65A] p-1 shadow-[0_4px_12px_rgba(11,166,90,0.28)]">
            <button
              type="button"
              onClick={goPrevMonth}
              aria-label="Previous month"
              className={cx('flex h-7 w-7 items-center justify-center rounded-full text-white transition hover:bg-white/15', FOCUS_RING)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="px-2 text-sm font-bold text-white">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Next month"
              className={cx('flex h-7 w-7 items-center justify-center rounded-full text-white transition hover:bg-white/15', FOCUS_RING)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        {loading ? (
          <SkeletonStatCards count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {monthStats.map((s) => (
              <ServiceReportStatCard key={s.label} icon={s.icon} watermark={s.watermark} label={s.label} value={s.value} helper={s.helper} tone={s.tone} />
            ))}
          </div>
        )}
      </section>

      <div>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Icon3D icon={TriangleAlert} tone="orange" size="sm" />
            <span className="text-[15px] font-bold text-[#10233F]">Recent Pending</span>
            {recentPending.length > 0 ? (
              <span className="rounded-full bg-[#FFF3E4] px-2 py-0.5 text-xs font-bold text-[#F97316]">{recentPending.length}</span>
            ) : null}
          </span>
          {recentPending.length > 0 ? (
            <button type="button" onClick={() => goToFilter('Pending')} className="flex items-center gap-1 text-xs font-bold text-[#0BA65A] hover:underline">
              View all
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {loading ? (
          <SkeletonRows rows={2} />
        ) : recentPending.length === 0 ? (
          <EmptyState icon={Inbox} title="No pending tasks." description="You're all caught up!" />
        ) : (
          <div className="divide-y divide-[#EEF3F0] rounded-[20px] border border-[rgba(15,80,60,0.06)] bg-white shadow-[0_8px_26px_rgba(18,65,50,0.05)]">
            {recentPending.map((t) => (
              <TaskRow key={t.id} ticket={t} showAssignee={!singleMode} expanded={expandedId === t.id} onToggle={() => toggleExpanded(t.id)} tone="orange" />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Icon3D icon={Cog} tone="blue" size="sm" />
            <span className="text-[15px] font-bold text-[#10233F]">In Process</span>
            {inProcess.length > 0 ? (
              <span className="rounded-full bg-[#EEF7FF] px-2 py-0.5 text-xs font-bold text-[#2196F3]">{inProcess.length}</span>
            ) : null}
          </span>
          {inProcess.length > 0 ? (
            <button type="button" onClick={() => goToFilter('In Progress')} className="flex items-center gap-1 text-xs font-bold text-[#0BA65A] hover:underline">
              View all
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {loading ? (
          <SkeletonRows rows={2} />
        ) : inProcess.length === 0 ? (
          <EmptyState icon={CheckCheck} title="No tasks in progress." description="Nothing being worked on right now." />
        ) : (
          <div className="divide-y divide-[#EEF3F0] rounded-[20px] border border-[rgba(15,80,60,0.06)] bg-white shadow-[0_8px_26px_rgba(18,65,50,0.05)]">
            {inProcess.map((t) => (
              <TaskRow key={t.id} ticket={t} showAssignee={!singleMode} expanded={expandedId === t.id} onToggle={() => toggleExpanded(t.id)} tone="blue" />
            ))}
          </div>
        )}
      </div>

      <div ref={fullListRef}>
        <span className="mb-2.5 flex items-center gap-2">
          <Icon3D icon={CheckCircle2} tone="green" size="sm" />
          <span className="text-[15px] font-bold text-[#10233F]">Previous Completed</span>
        </span>
        <section className="rounded-[20px] border border-[rgba(15,80,60,0.06)] bg-white shadow-[0_8px_26px_rgba(18,65,50,0.05)]">
          <div className="border-b border-[#EEF3F0] px-4 py-4 sm:px-5">
            <FilterChips options={FULL_LIST_FILTERS} value={filter} onChange={setFilter} counts={counts} />
          </div>

          {loading ? (
            <SkeletonRows rows={5} />
          ) : filtered.length === 0 ? (
            rows.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="No service tasks yet"
                description={singleMode ? 'No repair tickets are assigned to this technician yet.' : 'Repair tickets assigned to technicians will show up here.'}
              />
            ) : (
              <EmptyState icon={Wrench} tone="muted" title="No tasks found." description="Try a different status." />
            )
          ) : (
            <div className="divide-y divide-[#EEF3F0]">
              {filtered.map((t) => (
                <TaskRow key={t.id} ticket={t} showAssignee={!singleMode} expanded={expandedId === t.id} onToggle={() => toggleExpanded(t.id)} tone="green" />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const TASK_ROW_TONE = {
  orange: { bg: 'bg-[#FFF3E4]', text: 'text-[#F97316]' },
  blue: { bg: 'bg-[#EEF7FF]', text: 'text-[#2196F3]' },
  green: { bg: 'bg-[#EAFBF3]', text: 'text-[#0BA65A]' },
};

function TaskRow({ ticket, showAssignee, expanded, onToggle, tone = 'green' }) {
  const t = TASK_ROW_TONE[tone] || TASK_ROW_TONE.green;
  return (
    <div>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-[15px] text-left transition hover:bg-[#F9FAFB] sm:px-5">
        <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', t.bg)}>
          <Wrench className={cx('h-5 w-5', t.text)} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#101828]">{ticket.customerName || ticket.deviceDisplayName || 'Ticket'}</p>
          <p className="truncate text-xs text-[#667085]">
            #{ticket.trackingId || ticket.id} {ticket.deviceDisplayName ? `· ${ticket.deviceDisplayName}` : ''}
            {showAssignee ? ` · ${ticket.assignedTechnicianName || 'Unassigned'}` : ''}
          </p>
        </div>
        <span className={cx('hidden shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide sm:inline-block', TICKET_STAGE_BADGE[ticket.stageLabel] || 'bg-[#F0FDF4] text-[#667085]')}>
          {ticket.stageLabel}
        </span>
        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E5ECE8] bg-white text-[#98A2B3] shadow-sm sm:flex">
          <ChevronDown className={cx('h-4 w-4 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
        </span>
      </button>

      {expanded ? (
        <div className="space-y-2 border-t border-dashed border-[#EAECF0] bg-[#F9FAFB] px-4 py-4 text-sm text-[#344054] sm:px-5">
          {ticket.issueDescription ? <p>{ticket.issueDescription}</p> : <p className="text-[#98A2B3]">No issue description available.</p>}
          {showAssignee ? <p className="text-xs text-[#667085]">Assigned Technician: <span className="font-semibold text-[#101828]">{ticket.assignedTechnicianName || 'Unassigned'}</span></p> : null}
          <p className="text-xs text-[#667085]">
            Created: <span className="font-semibold text-[#101828]">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Not available'}</span>
            {' · '}Last Updated: <span className="font-semibold text-[#101828]">{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available'}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
