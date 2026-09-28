'use client';

/**
 * /shop-home/reports/service-report — shop-wide service/repair activity.
 *
 * The all-technicians aggregate version of
 * employee/service-report/ServiceReportClient.js — same real
 * GET {TICKET_BASE}/tickets feed via fetchTicketsPaged(), same id-OR-name
 * defensive join rationale (see that file's header comment), just without
 * the `?employeeId=` single-person scope, plus a "By Technician"
 * breakdown table (a real group-by over the same rows — jobs/completed
 * per technician, the same join teamActivity() already does in
 * src/lib/shopDashboard.js) and a "Download PDF" export. "Average repair
 * time" is deliberately not shown — createdAt→updatedAt on a DELIVERED
 * ticket is only a coarse proxy for actual repair duration, not a
 * tracked per-stage timestamp, so it isn't presented as a real metric.
 *
 * 2026-09: page-local hero/KPI-card/section redesign matching a reference
 * design, replacing the shared PageHeader/StatCard/MonthSwitcher usage
 * (each used by many other pages, unaffected) with bespoke markup. The
 * hero's decorative artwork is the real public/service -report.png asset
 * (note: actual filename has a space before the hyphen), cropped to its
 * technician/gear/checklist/toolbox cluster only — that source file also
 * has a fake baked "Refresh"/month-pill overlapping the illustration
 * (same file used by employee/service-report's hero), so the crop here is
 * deliberately biased below that row to exclude it, and the real
 * Refresh/Download PDF/month-selector controls render as actual HTML on
 * top, not baked pixels. All data/logic below is unchanged.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, Download, Inbox, Loader2, RefreshCw, TriangleAlert, Users, Wrench } from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import FilterChips from '@/components/shop-dashboard/FilterChips';
import EmptyState from '@/components/shop-dashboard/EmptyState';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { SkeletonRows, SkeletonStatCards } from '@/components/shop-dashboard/SkeletonBlocks';
import { MONTHS, shiftMonth } from '@/components/shop-dashboard/MonthSwitcher';
import { fetchTicketsPaged } from '@/lib/shopDashboard';
import { TICKET_STAGE_BADGE, ticketStageLabel } from '@/lib/ticketStatus';
import { downloadReportPdf } from '@/lib/reportPdf';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0BA65A] focus-visible:ring-offset-2';
const FULL_LIST_FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'Completed', label: 'Completed' },
  { value: 'In Progress', label: 'In Process' },
  { value: 'Pending', label: 'Pending' },
];

function taskBucket(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'CANCELLED') return 'Cancelled';
  if (['CREATED', 'QUOTED'].includes(s)) return 'Pending';
  if (['DELIVERED', 'READY', 'INVOICE_GENERATED', 'INVOICE_READY', 'DELIVERED_PROCESSING'].includes(s)) return 'Completed';
  return 'In Progress';
}

// Icon + tint + watermark per KPI card — four distinct identities, matching
// this page's own "service operations" look (separate from the employee
// Service Report page's card styling, which uses a different palette).
const SR_STAT_STYLES = {
  blue: { card: 'bg-gradient-to-br from-[#EEF7FF] to-[#DFEFFE]', chip: 'bg-gradient-to-br from-[#5EB6FA] to-[#2196F3]', watermark: 'text-[#2196F3]' },
  orange: { card: 'bg-gradient-to-br from-[#FFF3E4] to-[#FEE4C4]', chip: 'bg-gradient-to-br from-[#FFB35C] to-[#FF8F2C]', watermark: 'text-[#FF8F2C]' },
  green: { card: 'bg-gradient-to-br from-[#EAFBF3] to-[#DAF5E7]', chip: 'bg-gradient-to-br from-[#22C55E] to-[#0BA65A]', watermark: 'text-[#0BA65A]' },
  violet: { card: 'bg-gradient-to-br from-[#F5F0FE] to-[#EBE1FD]', chip: 'bg-gradient-to-br from-[#A78BFA] to-[#8B5CF6]', watermark: 'text-[#8B5CF6]' },
};

function SrStatCard({ icon: Icon, watermark: Watermark, label, value, helper, tone }) {
  const s = SR_STAT_STYLES[tone] || SR_STAT_STYLES.green;
  return (
    <div className={cx('relative flex min-h-[130px] flex-col overflow-hidden rounded-[20px] border border-[rgba(15,80,60,0.06)] p-4 shadow-[0_8px_24px_rgba(20,70,55,0.06)]', s.card)}>
      <Watermark className={cx('pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 opacity-15', s.watermark)} aria-hidden="true" />
      <span className={cx('relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_6px_14px_rgba(0,0,0,0.1)]', s.chip)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="relative mt-2.5 text-[26px] font-extrabold leading-none text-[#10233F]">{value}</p>
      <p className="relative mt-1 text-sm font-semibold text-[#10233F]">{label}</p>
      {helper ? <p className="relative mt-1 text-xs font-semibold text-[#6D7E94]">{helper}</p> : null}
    </div>
  );
}

export default function ServiceReportOverviewPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [exporting, setExporting] = useState(false);
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

  const rows = useMemo(
    () =>
      tickets
        .map((t) => ({ ...t, bucket: taskBucket(t.status), stageLabel: ticketStageLabel(t.status) }))
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)),
    [tickets],
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

  const byTechnician = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const name = r.assignedTechnicianName || 'Unassigned';
      if (!map.has(name)) map.set(name, { name, total: 0, completed: 0 });
      const entry = map.get(name);
      entry.total += 1;
      if (r.bucket === 'Completed') entry.completed += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  const completionRate = counts.All > 0 ? Math.round((counts.Completed / counts.All) * 100) : 0;
  const pct = (n) => (monthCounts.total > 0 ? `${Math.round((n / monthCounts.total) * 100)}% of total` : null);

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
    { label: 'In Process', value: monthCounts['In Progress'], helper: pct(monthCounts['In Progress']), icon: Clock, watermark: Clock, tone: 'blue' },
    { label: 'Pending', value: monthCounts.Pending, helper: pct(monthCounts.Pending), icon: TriangleAlert, watermark: TriangleAlert, tone: 'orange' },
    { label: 'Completed', value: monthCounts.Completed, helper: pct(monthCounts.Completed), icon: CheckCircle2, watermark: CheckCircle2, tone: 'green' },
    { label: 'Total', value: monthCounts.total, helper: 'Service reports', icon: Wrench, watermark: Wrench, tone: 'violet' },
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadReportPdf({
        title: 'Service Report',
        subtitle: `Shop-wide completion rate: ${completionRate}% — GGFIX Partner Dashboard`,
        stats: monthStats.map((s) => ({ label: s.label, value: s.value })),
        columns: [
          { header: 'Technician', key: 'name' },
          { header: 'Total Jobs', key: 'total' },
          { header: 'Completed', key: 'completed' },
        ],
        rows: byTechnician,
        filename: 'service-report.pdf',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5" style={{ background: 'linear-gradient(180deg, #F7FBFA 0%, #F4FAF8 55%, #EDF8F3 100%)' }}>
      {/* Hero — page-local, not the shared PageHeader (used by ~15+ other
          pages, unaffected). Title/subtitle/Refresh/Download PDF/month
          navigation are the exact same content/handlers this page always
          had. */}
      <div
        className="relative min-h-[150px] overflow-hidden rounded-[22px] p-6 shadow-[0_8px_24px_rgba(20,70,55,0.06)] sm:p-7"
        style={{ background: 'linear-gradient(110deg, #ffffff 0%, #f6fcf9 45%, #e7faf1 100%)', border: '1px solid rgba(15, 140, 90, 0.14)' }}
      >
        <span className="pointer-events-none absolute -right-10 -top-14 h-56 w-56 rounded-full bg-[#6EE7B7]/15 blur-3xl" aria-hidden="true" />

        {/* public/images/service-report-illustration.png — cropped from the
            real public/service -report.png asset, biased below that
            source's baked-in fake Refresh/month-pill row so only the
            technician/gear/checklist/toolbox cluster shows. */}
        <div className="pointer-events-none absolute bottom-4 right-4 hidden h-[100px] w-[500px] lg:block xl:w-[600px]">
          <Image src="/images/service-report-illustration.png" alt="" fill sizes="600px" className="object-contain object-right" />
        </div>

        <div className="relative z-[1] flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#10233F] sm:text-[34px]">
              Service <span className="text-[#0BA65A]">Report</span>
            </h1>
            <p className="mt-1 max-w-[440px] text-[14px] text-[#6D7E94] sm:text-[15px]">Service status, technician performance, and completion rate across your shop.</p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2.5">
            <div className="flex items-center gap-2">
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
              <button
                type="button"
                onClick={handleExport}
                disabled={loading || exporting || byTechnician.length === 0}
                className={cx(
                  'inline-flex h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#22C55E] to-[#0BA65A] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(11,166,90,0.28)] transition hover:from-[#16A34A] hover:to-[#087A46] disabled:cursor-not-allowed disabled:opacity-60',
                  FOCUS_RING,
                )}
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                Download PDF
              </button>
            </div>
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
        </div>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} /> : null}

      {loading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {monthStats.map((s) => (
            <SrStatCard key={s.label} icon={s.icon} watermark={s.watermark} label={s.label} value={s.value} helper={s.helper} tone={s.tone} />
          ))}
        </div>
      )}

      {/* ---- Overall Completion Rate ------------------------------------ */}
      <section
        className="rounded-[20px] bg-white p-5 shadow-[0_8px_26px_rgba(20,70,55,0.05)] sm:p-6"
        style={{ border: '1px solid rgba(15, 80, 60, 0.06)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Icon3D icon={CheckCircle2} tone="green" size="sm" />
            <div>
              <p className="text-[16px] font-bold text-[#10233F]">Overall Completion Rate</p>
              <p className="text-xs text-[#6D7E94]">Percentage of completed services this month.</p>
            </div>
          </div>
          <p className="text-[26px] font-extrabold text-[#0BA65A]">{loading ? '—' : `${completionRate}%`}</p>
        </div>
        <div className="mt-4 h-3.5 w-full overflow-hidden rounded-full bg-[#EDF3F1]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${loading ? 0 : completionRate}%`, background: 'linear-gradient(90deg, #22C55E, #0BA65A)' }}
          />
        </div>
      </section>

      {/* ---- By Technician ----------------------------------------------- */}
      <section
        className="rounded-[20px] bg-white p-5 shadow-[0_8px_26px_rgba(20,70,55,0.05)] sm:p-6"
        style={{ border: '1px solid rgba(15, 80, 60, 0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <Icon3D icon={Users} tone="green" size="sm" />
          <div>
            <p className="text-[16px] font-bold text-[#10233F]">By Technician</p>
            <p className="text-xs text-[#6D7E94]">Service reports grouped by technician.</p>
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <SkeletonRows rows={3} />
          ) : byTechnician.length === 0 ? (
            <EmptyState icon={Users} title="No service activity yet" description="Technician job counts will show up here." />
          ) : (
            <div className="flex flex-col gap-2">
              {byTechnician.map((t) => (
                <div key={t.name} className="flex min-h-[58px] items-center justify-between gap-3 rounded-[14px] bg-[#F9FDFB] px-4 py-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAFBF3] text-[#0BA65A]">
                      <Users className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="truncate text-sm font-bold text-[#10233F]">{t.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-4 text-right text-xs">
                    <span className="text-[#6D7E94]">
                      Total: <span className="font-bold text-[#10233F]">{t.total}</span>
                    </span>
                    <span className="text-[#6D7E94]">
                      Completed: <span className="font-bold text-[#0BA65A]">{t.completed}</span>
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---- Recent Pending ------------------------------------------------ */}
      <section
        className="rounded-[20px] bg-white p-5 shadow-[0_8px_26px_rgba(20,70,55,0.05)] sm:p-6"
        style={{ border: '1px solid rgba(15, 80, 60, 0.06)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Icon3D icon={TriangleAlert} tone="orange" size="sm" />
            <div>
              <p className="text-[16px] font-bold text-[#10233F]">Recent Pending</p>
              <p className="text-xs text-[#6D7E94]">Latest service reports that are pending.</p>
            </div>
          </div>
          {recentPending.length > 0 ? (
            <button type="button" onClick={() => goToFilter('Pending')} className="flex items-center gap-1 text-xs font-bold text-[#0BA65A] hover:underline">
              View all
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="mt-3">
          {loading ? (
            <SkeletonRows rows={2} />
          ) : recentPending.length === 0 ? (
            <EmptyState icon={Inbox} title="No pending tasks." description="You're all caught up!" />
          ) : (
            <div className="divide-y divide-[#EEF3F0] rounded-[16px] border border-[rgba(15,80,60,0.06)]">
              {recentPending.map((t) => (
                <TaskRow key={t.id} ticket={t} expanded={expandedId === t.id} onToggle={() => toggleExpanded(t.id)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---- In Process ----------------------------------------------------- */}
      <section
        className="rounded-[20px] bg-white p-5 shadow-[0_8px_26px_rgba(20,70,55,0.05)] sm:p-6"
        style={{ border: '1px solid rgba(15, 80, 60, 0.06)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Icon3D icon={Clock} tone="blue" size="sm" />
            <div>
              <p className="text-[16px] font-bold text-[#10233F]">In Process</p>
              <p className="text-xs text-[#6D7E94]">Service reports currently being worked on.</p>
            </div>
          </div>
          {inProcess.length > 0 ? (
            <button type="button" onClick={() => goToFilter('In Progress')} className="flex items-center gap-1 text-xs font-bold text-[#0BA65A] hover:underline">
              View all
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="mt-3">
          {loading ? (
            <SkeletonRows rows={2} />
          ) : inProcess.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No tasks in progress." description="Nothing being worked on right now." />
          ) : (
            <div className="divide-y divide-[#EEF3F0] rounded-[16px] border border-[rgba(15,80,60,0.06)]">
              {inProcess.map((t) => (
                <TaskRow key={t.id} ticket={t} expanded={expandedId === t.id} onToggle={() => toggleExpanded(t.id)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---- All Service Tasks ---------------------------------------------- */}
      <section ref={fullListRef} className="rounded-[20px] bg-white shadow-[0_8px_26px_rgba(20,70,55,0.05)]" style={{ border: '1px solid rgba(15, 80, 60, 0.06)' }}>
        <div className="border-b border-[#EEF3F0] px-5 py-4">
          <p className="mb-3 text-[16px] font-bold text-[#10233F]">All Service Tasks</p>
          <FilterChips options={FULL_LIST_FILTERS} value={filter} onChange={setFilter} counts={counts} />
        </div>

        {loading ? (
          <SkeletonRows rows={5} />
        ) : filtered.length === 0 ? (
          rows.length === 0 ? (
            <EmptyState icon={Wrench} title="No service tasks yet" description="Repair tickets assigned to technicians will show up here." />
          ) : (
            <EmptyState icon={Wrench} tone="muted" title="No tasks found." description="Try a different status." />
          )
        ) : (
          <div className="divide-y divide-[#EEF3F0]">
            {filtered.map((t) => (
              <TaskRow key={t.id} ticket={t} expanded={expandedId === t.id} onToggle={() => toggleExpanded(t.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// BOOKING RECEIVED / DIAGNOSIS / IN PROGRESS / PENDING / COMPLETED — pill
// colors per the spec; falls back to TICKET_STAGE_BADGE's own mapping for
// any stage label not explicitly listed here (the underlying status→label
// mapping itself, ticketStageLabel(), is untouched).
const STAGE_PILL = {
  'Booking Received': 'bg-[#E5F2FC] text-[#0875B7]',
  Diagnosis: 'bg-[#F0E7FE] text-[#7C3AED]',
  'In Progress': 'bg-[#E0FBFF] text-[#0E7BAE]',
  Pending: 'bg-[#FEF3D6] text-[#B7791F]',
  Completed: 'bg-[#DCFCE7] text-[#15803D]',
};

function TaskRow({ ticket, expanded, onToggle }) {
  const badge = STAGE_PILL[ticket.stageLabel] || TICKET_STAGE_BADGE[ticket.stageLabel] || 'bg-[#F0FDF4] text-[#667085]';
  return (
    <div>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#F9FDFB] sm:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAFBF3]">
          <Wrench className="h-4 w-4 text-[#0BA65A]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#101828]">{ticket.customerName || ticket.deviceDisplayName || 'Ticket'}</p>
          <p className="truncate text-xs text-[#667085]">
            #{ticket.trackingId || ticket.id} {ticket.deviceDisplayName ? `· ${ticket.deviceDisplayName}` : ''} · {ticket.assignedTechnicianName || 'Unassigned'}
          </p>
        </div>
        <span className={cx('hidden shrink-0 rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wide sm:inline-block', badge)}>{ticket.stageLabel}</span>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-[#98A2B3] transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
      </button>

      {expanded ? (
        <div className="space-y-2 border-t border-dashed border-[#EAECF0] bg-[#F9FAFB] px-4 py-4 text-sm text-[#344054] sm:px-5">
          {ticket.issueDescription ? <p>{ticket.issueDescription}</p> : <p className="text-[#98A2B3]">No issue description available.</p>}
          <p className="text-xs text-[#667085]">Assigned Technician: <span className="font-semibold text-[#101828]">{ticket.assignedTechnicianName || 'Unassigned'}</span></p>
          <p className="text-xs text-[#667085]">
            Created: <span className="font-semibold text-[#101828]">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Not available'}</span>
            {' · '}Last Updated: <span className="font-semibold text-[#101828]">{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available'}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
