'use client';

/**
 * /shop-home/reports/service-report — Booking Status, the web counterpart of
 * the Partner app's BookingStatusScreen (+ its BookingStatusReport drill-down
 * and BookingPreviousReport screens), with the same status mapping:
 *
 *   Total Booking              every ticket                (counts.total)
 *   Total Processed            READY
 *   Total Delivered            DELIVERED
 *   Out for Delivery           DELIVERED_PROCESSING
 *   Total In Process           IN_DIAGNOSIS + IN_REPAIR
 *   Stalled bookings           APPROVED + QUOTED
 *     1. Spare parts pending   APPROVED (customer said go, repair not started)
 *     2. Customer approval     QUOTED   (quote not answered yet)
 *
 * Counts: GET {TICKET_BASE}/tickets/counts (fetchTicketCounts) — all-time,
 * like the app. ?view=<bucket key> opens that bucket's bookings (the shared
 * Bookings-page cards over bookings joined to tickets, filtered by ticket
 * status, with the app's Today/Yesterday/Week/Month/All period chips);
 * ?view=previous shows the app's month-by-month snapshot, derived from the
 * /tickets feed (no monthly endpoint exists).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  History,
  Package,
  PackageCheck,
  RefreshCw,
  Truck,
  UserCheck,
  Wrench,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import PageHeader from '@/components/shop-dashboard/PageHeader';
import { HEADER_BUTTON } from '@/components/shop-dashboard/HeaderControls';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import AssignTechnicianModal from '@/components/shop-dashboard/AssignTechnicianModal';
import { OrderCard, OrdersEmpty, OrdersSkeleton, useOrderRows, withHash } from '@/components/shop-dashboard/OrdersList';
import { fetchTicketCounts, fetchTicketsPaged } from '@/lib/shopDashboard';
import { variantLabel } from '@/lib/deviceImage';
import { buildOrderRows } from '@/lib/orderStages';

/* -------------------------------------------------------------------------- */
/* Buckets (the app's tile config)                                             */
/* -------------------------------------------------------------------------- */

const TOTAL = { key: 'total', label: 'Total Booking', statusList: [], countKey: 'total', icon: ClipboardList };
const TILES = [
  { key: 'processed', label: 'Total Processed', statusList: ['READY'], icon: CheckCircle2, tone: 'green' },
  { key: 'delivered', label: 'Total Delivered', statusList: ['DELIVERED'], icon: PackageCheck, tone: 'teal' },
  { key: 'out-for-delivery', label: 'Out for Delivery', statusList: ['DELIVERED_PROCESSING'], icon: Truck, tone: 'cyan' },
  { key: 'in-process', label: 'Total In Process', statusList: ['IN_DIAGNOSIS', 'IN_REPAIR'], icon: Wrench, tone: 'indigo' },
];
const STALLED = { key: 'stalled', label: 'Stalled bookings', statusList: ['APPROVED', 'QUOTED'], icon: AlertTriangle, tone: 'red' };
const PENDING = [
  { key: 'spare-parts', label: 'Spare parts pending', statusList: ['APPROVED'], icon: Package, tone: 'orange' },
  { key: 'customer-approval', label: 'Customer approval pending', statusList: ['QUOTED'], icon: UserCheck, tone: 'green' },
];
// Every bucket the page can drill into — the "N statuses" in the header, as the app counts them.
const ALL_BUCKETS = [TOTAL, ...TILES, STALLED, ...PENDING];
const STATUS_COUNT = ALL_BUCKETS.length;
const BUCKET_BY_KEY = Object.fromEntries(ALL_BUCKETS.map((b) => [b.key, b]));

// `chip` = the pale chip the Working Pending list uses; `solid` = the filled
// icon chip the KPI cards use (same look as the other Reports pages).
const TONE = {
  green: { chip: 'bg-[#F3F3F3] text-[#087A0A]', solid: 'bg-[#087A0A]', mark: 'text-[#087A0A]' },
  teal: { chip: 'bg-[#F3F3F3] text-[#0F766E]', solid: 'bg-[#0F766E]', mark: 'text-[#0F766E]' },
  cyan: { chip: 'bg-[#DBF1F8] text-[#0E7490]', solid: 'bg-[#0E7490]', mark: 'text-[#0E7490]' },
  indigo: { chip: 'bg-[#E4E7FB] text-[#4338CA]', solid: 'bg-[#4338CA]', mark: 'text-[#4338CA]' },
  red: { chip: 'bg-[#B42318] text-white', mark: 'text-[#B42318]' },
  orange: { chip: 'bg-[#F79009] text-white', mark: 'text-[#F79009]' },
};

const pad2 = (n) => String(n).padStart(2, '0');
const countFor = (counts, b) => (b.countKey ? Number(counts?.[b.countKey] || 0) : b.statusList.reduce((s, k) => s + Number(counts?.[k] || 0), 0));

function readView() {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('view');
  return v === 'previous' || BUCKET_BY_KEY[v] ? v : null;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function BookingStatusPage() {
  const router = useRouter();
  const [view, setView] = useState(null);
  const pushed = useRef(0); // drill-downs opened from this page (so Back can pop them)

  useEffect(() => {
    setView(readView());
    const onPop = () => setView(readView());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Drill-downs are pushed onto history so Back (browser or ours) returns to the overview.
  function open(next) {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('view', next);
    else url.searchParams.delete('view');
    window.history.pushState(null, '', url);
    pushed.current += 1;
    setView(next);
    window.scrollTo?.({ top: 0 });
  }

  function back() {
    if (view && pushed.current > 0) {
      pushed.current -= 1;
      window.history.back();
    } else if (view) {
      // Opened straight on a drill-down link: go to the overview instead of leaving.
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      window.history.replaceState(null, '', url);
      setView(null);
    } else if (window.history.length > 1) router.back();
    else router.push('/shop-home');
  }

  return (
    <div className="-m-4 min-h-full bg-white p-4 sm:-m-6 sm:p-6">
      {view === 'previous' ? (
        <PreviousReports onBack={back} />
      ) : view ? (
        <BucketReport bucket={BUCKET_BY_KEY[view]} onBack={back} />
      ) : (
        <Overview onOpen={open} />
      )}
    </div>
  );
}

// Shared PageHeader banner. The overview has no back control; the drill-down
// views (opened from it) keep a "Back" pill so they can return to it.
function Header({ onBack, title, subtitle, action }) {
  return (
    <div className="mb-5">
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          onBack || action ? (
            <>
              {onBack ? (
                <button type="button" onClick={onBack} className={HEADER_BUTTON}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>
              ) : null}
              {action}
            </>
          ) : null
        }
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Overview                                                                    */
/* -------------------------------------------------------------------------- */

function Overview({ onOpen }) {
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setError('');
    fetchTicketCounts()
      .then((c) => alive && setCounts(c))
      .catch((err) => alive && setError(err.message || 'Could not load booking status.'));
    return () => {
      alive = false;
    };
  }, [reload]);

  const loading = !counts && !error;
  const n = (b) => (counts ? pad2(countFor(counts, b)) : '—');

  return (
    <>
      <Header
        title="Booking Status"
        subtitle={`All Time · ${STATUS_COUNT} statuses`}
        action={
          <>
            <button type="button" onClick={() => setReload((k) => k + 1)} className={HEADER_BUTTON}>
              <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
              Refresh
            </button>
            <button type="button" onClick={() => onOpen('previous')} className={HEADER_BUTTON}>
              <History className="h-4 w-4" aria-hidden="true" />
              Previous
            </button>
          </>
        }
      />

      {error ? <ErrorBanner message={error} onRetry={() => setReload((k) => k + 1)} /> : null}

      <div className="space-y-5">
        {/* Total Booking */}
        <button
          type="button"
          onClick={() => onOpen(TOTAL.key)}
          className="flex w-full items-center gap-4 rounded-[18px] border border-[#ECECEC] bg-[#F8F8F8] p-5 text-left text-[#111111] transition hover:bg-[#F3F3F3] sm:p-6"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#09AD2A] text-white">
            <ClipboardList className="h-7 w-7" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[18px] font-extrabold">{TOTAL.label}</span>
            <span className="block text-[13.5px] text-[#666666]">Every booking in the shop</span>
          </span>
          <span className="text-[40px] font-extrabold leading-none tracking-tight sm:text-[46px]">{n(TOTAL)}</span>
          <ChevronRight className="h-6 w-6 shrink-0 text-[#666666]" aria-hidden="true" />
        </button>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TILES.map((t) => {
            const tone = TONE[t.tone];
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onOpen(t.key)}
                className="relative flex flex-col overflow-hidden rounded-[18px] border border-[#ECECEC] bg-[#F8F8F8] p-5 text-left transition hover:border-[#09AD2A]"
              >
                <Icon className={cx('pointer-events-none absolute -bottom-5 -right-5 h-24 w-24 opacity-[0.07]', tone.mark)} aria-hidden="true" />
                <span className={cx('relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', tone.solid)}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="relative mt-4 text-[28px] font-extrabold leading-none text-[#111111]">{n(t)}</span>
                <span className="relative mt-1.5 text-[14px] font-medium text-[#666666]">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Working Pending */}
        <section>
          <h2 className="text-[18px] font-extrabold text-[#0B2E22]">Working Pending</h2>
          <p className="mb-2.5 text-[13px] text-[#666666]">Waiting on a part or on the customer</p>
          <div className="divide-y divide-[#ECECEC] overflow-hidden rounded-[20px] border border-[#ECECEC] bg-[#F8F8F8]">
            {[STALLED, ...PENDING].map((b, i) => {
              const Icon = b.icon;
              return (
                <button key={b.key} type="button" onClick={() => onOpen(b.key)} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-[#F8F8F8] sm:px-5">
                  <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONE[b.tone].chip)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className={cx('min-w-0 flex-1 truncate text-[15px]', i === 0 ? 'font-semibold text-[#475467]' : 'font-bold text-[#111111]')}>
                    {i === 0 ? b.label : `${i}. ${b.label}`}
                  </span>
                  <span className="text-[22px] font-extrabold leading-none text-[#0B2E22]">{n(b)}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#98A2B3]" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Drill-down                                                                  */
/* -------------------------------------------------------------------------- */

const PERIODS = [
  { value: 'TODAY', label: 'Today' },
  { value: 'YESTERDAY', label: 'Yesterday' },
  { value: 'WEEK', label: 'This Week' },
  { value: 'MONTH', label: 'This Month' },
  { value: 'ALL', label: 'All Time' },
];

function periodRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'TODAY') return [today, null];
  if (period === 'YESTERDAY') return [new Date(today.getTime() - 86400000), today];
  if (period === 'WEEK') return [new Date(today.getTime() - 7 * 86400000), null];
  if (period === 'MONTH') return [new Date(now.getFullYear(), now.getMonth(), 1), null];
  return [null, null];
}

function BucketReport({ bucket, onBack }) {
  const { bookings, tickets, options, loading, error, reload, mergeTicket } = useOrderRows();
  // All Time by default, so the list matches the all-time count on the tile that opened it.
  const [period, setPeriod] = useState('ALL');
  const [assigning, setAssigning] = useState(null);

  const inBucket = useMemo(() => {
    const statuses = new Set(bucket.statusList);
    return buildOrderRows(bookings, tickets).filter((r) => r.ticketRef && (statuses.size === 0 || statuses.has(String(r.ticketStatus || '').toUpperCase())));
  }, [bookings, tickets, bucket]);

  const rows = useMemo(() => {
    const [from, to] = periodRange(period);
    if (!from) return inBucket;
    return inBucket.filter((r) => {
      const d = r.createdAt ? new Date(r.createdAt) : null;
      return d && d >= from && (!to || d < to);
    });
  }, [inBucket, period]);

  return (
    <>
      <Header
        onBack={onBack}
        title={bucket.label}
        subtitle={loading ? 'Loading…' : `${rows.length} ${rows.length === 1 ? 'booking' : 'bookings'} · ${PERIODS.find((p) => p.value === period).label}`}
        action={
          <button type="button" onClick={reload} className={HEADER_BUTTON}>
            <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
            Refresh
          </button>
        }
      />

      <div role="tablist" aria-label="Period" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="tab"
            aria-selected={period === p.value}
            onClick={() => setPeriod(p.value)}
            className={cx(
              'shrink-0 rounded-full border px-4 py-2 text-[13.5px] font-bold transition',
              period === p.value ? 'border-[#087A0A] bg-[#087A0A] text-white' : 'border-[#ECECEC] bg-white text-[#475467] hover:border-[#ECECEC]',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      {loading ? (
        <OrdersSkeleton />
      ) : error ? null : rows.length ? (
        <div className="space-y-3">
          {rows.map((r) => (
            <OrderCard key={r.id} row={r} variant={variantLabel(r, options)} onAssign={() => setAssigning(r)} />
          ))}
        </div>
      ) : (
        <OrdersEmpty
          icon={bucket.icon}
          title="No bookings here"
          text={period === 'ALL' ? `No booking is currently in “${bucket.label}”.` : 'Nothing in this period — try All Time.'}
        />
      )}

      <AssignTechnicianModal
        open={Boolean(assigning)}
        ticketId={assigning?.ticketRef}
        currentTechnicianId={assigning?.assignedTechnicianId}
        bookingLabel={assigning ? [withHash(assigning.bookingNumber || assigning.id), assigning.deviceDisplayName || assigning.modelName].filter(Boolean).join(' · ') : ''}
        onClose={() => setAssigning(null)}
        onAssigned={mergeTicket}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Previous Reports (month-by-month, the app's BookingPreviousReport)          */
/* -------------------------------------------------------------------------- */

const MONTHS_TO_SHOW = 6;
const SNAPSHOT_BUCKETS = [
  { key: 'CREATED', label: 'Accepted' },
  { key: 'IN_PROGRESS', label: 'In Service' },
  { key: 'READY', label: 'Ready' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'PENDING', label: 'Pending' },
];
const STATUS_TO_BUCKET = {
  CREATED: 'CREATED',
  ASSIGNED: 'CREATED',
  IN_DIAGNOSIS: 'IN_PROGRESS',
  IN_REPAIR: 'IN_PROGRESS',
  QUOTED: 'PENDING',
  APPROVED: 'PENDING',
  READY: 'READY',
  INVOICE_GENERATED: 'READY',
  INVOICE_READY: 'READY',
  DELIVERED_PROCESSING: 'READY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'PENDING',
};

function monthlySnapshots(tickets) {
  const now = new Date();
  const months = [];
  for (let i = 0; i < MONTHS_TO_SHOW; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      total: 0,
      buckets: Object.fromEntries(SNAPSHOT_BUCKETS.map((b) => [b.key, 0])),
    });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  (tickets || []).forEach((t) => {
    const d = t.createdAt ? new Date(t.createdAt) : null;
    if (!d || Number.isNaN(d.getTime())) return;
    const m = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (!m) return;
    m.total += 1;
    const b = STATUS_TO_BUCKET[String(t.status || '').toUpperCase()];
    if (b) m.buckets[b] += 1;
  });
  return months; // newest first
}

function PreviousReports({ onBack }) {
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setError('');
    fetchTicketsPaged()
      .then((list) => alive && setTickets(list))
      .catch((err) => alive && setError(err.message || 'Could not load previous reports.'));
    return () => {
      alive = false;
    };
  }, [reload]);

  const months = useMemo(() => monthlySnapshots(tickets), [tickets]);
  const grandTotal = months.reduce((s, m) => s + m.total, 0);

  return (
    <>
      <Header onBack={onBack} title="Previous Reports" subtitle={tickets ? `Last ${MONTHS_TO_SHOW} months · ${grandTotal} bookings` : `Last ${MONTHS_TO_SHOW} months`} />
      {error ? <ErrorBanner message={error} onRetry={() => setReload((k) => k + 1)} /> : null}
      {!tickets && !error ? (
        <OrdersSkeleton />
      ) : tickets ? (
        <div className="grid gap-3 md:grid-cols-2">
          {months.map((m) => (
            <section key={m.key} className="rounded-[20px] border border-[#ECECEC] bg-[#F8F8F8] p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[16px] font-extrabold text-[#0B2E22]">{m.label}</h2>
                <p className="text-[13px] text-[#666666]">
                  <span className="text-[20px] font-extrabold text-[#0B2E22]">{pad2(m.total)}</span> bookings
                </p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-3 xl:grid-cols-5">
                {SNAPSHOT_BUCKETS.map((b) => (
                  <div key={b.key} className={cx('rounded-xl px-2 py-2.5 text-center', b.key === 'PENDING' ? 'bg-[#FEF3F2]' : 'bg-[#F3F3F3]')}>
                    <p className={cx('text-[18px] font-extrabold leading-none', b.key === 'PENDING' ? 'text-[#B42318]' : 'text-[#087A0A]')}>{m.buckets[b.key]}</p>
                    <p className="mt-1 truncate text-[11px] font-semibold text-[#666666]">{b.label}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </>
  );
}
