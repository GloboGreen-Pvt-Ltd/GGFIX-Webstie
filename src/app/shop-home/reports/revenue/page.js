'use client';

/**
 * /shop-home/reports/revenue — daily, weekly and monthly revenue.
 *
 * Real data: ticket rows' `paymentAmount`/`paymentPaidAt`
 * (GET {TICKET_BASE}/tickets via fetchTicketsPaged(), the exact fields
 * src/lib/shopDashboard.js's todaysRevenue()/yesterdaysRevenue() already
 * reduce for the Dashboard). There's no server-side date filter, so "this
 * month" is computed client-side over the full fetched list, same as the
 * rest of these report pages. There is no payment-method field anywhere
 * in this backend (confirmed by a full-tree grep) — this page shows
 * amount + date only, with an explicit note about that gap, never a
 * fabricated method breakdown.
 */

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, IndianRupee, Info, Loader2, Receipt, RefreshCw, TrendingUp } from 'lucide-react';

import { cx } from '@/components/site/ui';
import PageHeader from '@/components/shop-dashboard/PageHeader';
import { HEADER_BUTTON, MonthPicker } from '@/components/shop-dashboard/HeaderControls';
import EmptyState from '@/components/shop-dashboard/EmptyState';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { SkeletonRows, SkeletonStatCards } from '@/components/shop-dashboard/SkeletonBlocks';
import { MONTHS, shiftMonth } from '@/components/shop-dashboard/MonthSwitcher';
import { fetchTicketsPaged, isToday } from '@/lib/shopDashboard';
import { downloadReportPdf } from '@/lib/reportPdf';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D] focus-visible:ring-offset-2';

// Page-local KPI card — same look as the other Reports pages' stat cards.
const REVENUE_CHIP = {
  green: 'bg-gradient-to-br from-[#22C55E] to-[#0BA65A]',
  blue: 'bg-gradient-to-br from-[#5EB6FA] to-[#2196F3]',
  orange: 'bg-gradient-to-br from-[#FFB35C] to-[#FF8F2C]',
  violet: 'bg-gradient-to-br from-[#A78BFA] to-[#8B5CF6]',
};

function RevenueStatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-[18px] border border-[#ECECEC] bg-[#F8F8F8] p-5">
      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', REVENUE_CHIP[tone] || REVENUE_CHIP.green)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-4 text-[28px] font-extrabold leading-none text-[#111111]">{value}</p>
      <p className="mt-1.5 text-[14px] font-medium text-[#666666]">{label}</p>
    </div>
  );
}

function money(n) {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}

export default function RevenueReportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetchTicketsPaged()
      .then((list) => {
        if (alive) setTickets(list);
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load the revenue report.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const paid = useMemo(
    () =>
      tickets
        .filter((t) => t.paymentPaidAt && Number(t.paymentAmount) > 0)
        .sort((a, b) => new Date(b.paymentPaidAt) - new Date(a.paymentPaidAt)),
    [tickets],
  );

  const monthPaid = useMemo(
    () =>
      paid.filter((t) => {
        const d = new Date(t.paymentPaidAt);
        return d.getFullYear() === viewDate.getFullYear() && d.getMonth() === viewDate.getMonth();
      }),
    [paid, viewDate],
  );

  const monthRevenue = useMemo(() => monthPaid.reduce((sum, t) => sum + Number(t.paymentAmount || 0), 0), [monthPaid]);
  const todayRevenue = useMemo(() => paid.filter((t) => isToday(t.paymentPaidAt)).reduce((sum, t) => sum + Number(t.paymentAmount || 0), 0), [paid]);

  const daysWithPayments = useMemo(() => new Set(monthPaid.map((t) => new Date(t.paymentPaidAt).toDateString())).size, [monthPaid]);
  const avgPerDay = daysWithPayments > 0 ? monthRevenue / daysWithPayments : 0;

  const monthStats = [
    { label: 'This Month', value: money(monthRevenue), icon: IndianRupee, tone: 'green' },
    { label: "Today's Revenue", value: money(todayRevenue), icon: TrendingUp, tone: 'blue' },
    { label: 'Avg / Active Day', value: money(avgPerDay), icon: CalendarDays, tone: 'orange' },
    { label: 'Transactions', value: monthPaid.length, icon: Receipt, tone: 'violet' },
  ];

  const goPrevMonth = () => shiftMonth(setViewDate, -1);
  const goNextMonth = () => shiftMonth(setViewDate, 1);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadReportPdf({
        title: 'Revenue Report',
        subtitle: `${new Date(viewDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} — GGFIX Partner Dashboard`,
        stats: monthStats.map((s) => ({ label: s.label, value: s.value })),
        notes: ['Payment-method breakdown is not tracked by this backend — amounts and dates only.'],
        columns: [
          { header: 'Date', value: (t) => new Date(t.paymentPaidAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) },
          { header: 'Customer', value: (t) => t.customerName || 'Not available' },
          { header: 'Device / Issue', value: (t) => t.deviceDisplayName || t.issueDescription || '—' },
          { header: 'Amount', value: (t) => money(t.paymentAmount) },
        ],
        rows: monthPaid,
        filename: 'revenue-report.pdf',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Revenue Report"
        subtitle="Daily, weekly and monthly revenue."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className={HEADER_BUTTON}>
              <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading || exporting || monthPaid.length === 0}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-xl bg-[#F3BF23] px-4 py-2.5 text-sm font-semibold text-[#1E1E1E] transition hover:bg-[#E5B11A] disabled:cursor-not-allowed disabled:opacity-60',
                FOCUS_RING,
              )}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
              Download PDF
            </button>
          </div>
        }
      >
        <MonthPicker
          label={`${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
          onPrev={goPrevMonth}
          onNext={goNextMonth}
        />
      </PageHeader>

      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} /> : null}

      <div>
        <p className="mb-3 text-sm font-bold text-[#111111]">This Month</p>
        {loading ? (
          <SkeletonStatCards count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {monthStats.map((s) => (
              <RevenueStatCard key={s.label} icon={s.icon} label={s.label} value={s.value} tone={s.tone} />
            ))}
          </div>
        )}
      </div>

      <p className="flex items-start gap-1.5 rounded-xl bg-[#F8F8F8] px-3.5 py-2.5 text-xs text-[#15803D]">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Payment-method breakdown isn&apos;t tracked by this backend — amounts and dates only.
      </p>

      <div>
        <p className="mb-2.5 text-sm font-bold text-[#111111]">Transactions This Month</p>
        <section className="rounded-3xl border border-[#ECECEC] bg-[#F8F8F8]">
          {loading ? (
            <SkeletonRows rows={5} />
          ) : monthPaid.length === 0 ? (
            <EmptyState icon={Receipt} title="No revenue this month yet" description="Paid tickets will show up here as amount + date." />
          ) : (
            <div className="divide-y divide-[#ECECEC]">
              {monthPaid.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F8F8F8]">
                    <IndianRupee className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#111111]">{t.customerName || t.deviceDisplayName || 'Ticket'}</p>
                    <p className="truncate text-xs text-[#666666]">
                      {new Date(t.paymentPaidAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-extrabold text-[#111111]">{money(t.paymentAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
