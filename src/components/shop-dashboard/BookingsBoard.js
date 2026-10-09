'use client';

/**
 * BookingsBoard — the booking list behind two pages:
 *   /shop-home/services/bookings/?stage=<all|active|ready|delivered|returned>
 *   /shop-home/services/invoice/  (fixedStage="invoice": invoiced
 *     bookings only, no tabs, each with an Invoice button — the Bookings
 *     page cards have no invoice button)
 *
 * All repair/service bookings, mirroring the shop-owner app's Bookings
 * screen. Opened from the nav, and from the dashboard's Business Overview:
 *   Service Orders -> all · Active Jobs -> active · Delivery Requests -> ready
 *   · Delivery Completed -> delivered
 * The selected stage drives the header ("READY FOR DELIVERY / 2 Bookings
 * Ready for Delivery"), the list and the empty state; it's kept in the URL.
 *
 * Rows, stages and counts come from lib/orderStages.js — the same functions
 * the dashboard cards count with, so both always agree. Data loading, cards
 * and chrome are shared with the Pickups page (components/shop-dashboard/
 * OrdersList.js). Filters opens the booking-status chips this page has
 * always had. Assign opens AssignTechnicianModal (PATCH /tickets/{id}) once a
 * booking has a repair ticket; History / Receipt / Barcode / Details open
 * the per-booking pages under ./view; ?q= prefills the search.
 *
 * Tapping a card (bookings with a repair ticket) opens ServiceStatusSheet,
 * the same card-tap sheet as the Partner app. After a save only that
 * booking's ticket is re-read (GET /tickets/{id}) and merged in, so the badge
 * and stage move without reloading the whole list.
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, PackageCheck, Receipt, Undo2, Wrench } from 'lucide-react';

import FilterChips from '@/components/shop-dashboard/FilterChips';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import AssignTechnicianModal from '@/components/shop-dashboard/AssignTechnicianModal';
import ServiceStatusSheet from '@/components/shop-dashboard/ServiceStatusSheet';
import RescheduleModal from '@/components/shop-dashboard/RescheduleModal';
import {
  OrderCard,
  OrdersEmpty,
  OrdersHeader,
  OrdersSearch,
  OrdersShell,
  OrdersSkeleton,
  StageTabs,
  matchesQuery,
  orderBadgeText,
  useOrderRows,
  withHash,
} from '@/components/shop-dashboard/OrdersList';
import { BOOKING_STATUS_FILTERS } from '@/lib/bookingFormat';
import { variantLabel } from '@/lib/deviceImage';
import { BOOKING_STAGE_TABS, buildOrderRows, countByStage, readQueryParam, writeQueryParam } from '@/lib/orderStages';
import { fetchTicket } from '@/lib/shopDashboard';

const TAB_ICONS = { all: ClipboardList, active: Wrench, ready: PackageCheck, delivered: CheckCircle2, returned: Undo2, invoice: Receipt };
const ALL_TABS = BOOKING_STAGE_TABS.map((t) => ({ ...t, icon: TAB_ICONS[t.key] }));
// Invoice is its own page (fixedStage), so the Bookings page doesn't offer it as a tab.
const TABS = ALL_TABS.filter((t) => t.key !== 'invoice');
const STAGE_KEYS = TABS.map((t) => t.key);

// The Invoice page (fixedStage 'invoice'): invoiced bookings only, each
// with an Invoice button (the Bookings page has none). New invoices are raised
// from the Update Service Status sheet's Invoice Generated step.
const INVOICE_TABS = [
  { key: 'invoice', label: 'Invoice', icon: Receipt, eyebrow: 'Invoices', title: (n) => `${n} ${n === 1 ? 'Invoice' : 'Invoices'}`, emptyTitle: 'No invoices yet', emptyText: 'Bookings with an invoice generated will appear here.' },
];

export default function BookingsBoard({ fixedStage = null }) {
  const { bookings, tickets, options, loading, error, reload, mergeTicket } = useOrderRows();
  const invoiceMode = fixedStage === 'invoice';
  const tabs = invoiceMode ? INVOICE_TABS : TABS;
  const [stage, setStage] = useState(invoiceMode ? 'invoice' : fixedStage || 'all');
  const [filter, setFilter] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [assigning, setAssigning] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [rescheduling, setRescheduling] = useState(null);

  useEffect(() => {
    if (!fixedStage) setStage(readQueryParam('stage', STAGE_KEYS));
    if (invoiceMode) {
      const s = readQueryParam('stage', INVOICE_TABS.map((t) => t.key));
      if (s !== 'all') setStage(s);
    }
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectStage(key) {
    setStage(key);
    writeQueryParam('stage', key);
  }

  // Re-read just the updated ticket; if that read fails, reload everything.
  async function refreshTicket(ticketId) {
    try {
      const ticket = await fetchTicket(ticketId);
      if (ticket?.id) mergeTicket(ticket);
      else reload();
    } catch {
      reload();
    }
  }

  const rows = useMemo(() => buildOrderRows(bookings, tickets), [bookings, tickets]);
  const stageCounts = useMemo(() => countByStage(rows), [rows]);

  // Invoice page: every booking whose ticket has an invoice, whatever its status now.
  const invoiced = useMemo(() => rows.filter((r) => r.hasInvoice || r.stage === 'invoice'), [rows]);
  const inStage = useMemo(
    () => (invoiceMode ? invoiced : stage === 'all' ? rows : rows.filter((r) => r.stage === stage)),
    [invoiceMode, invoiced, rows, stage],
  );

  const statusCounts = useMemo(() => {
    const c = { All: inStage.length, Created: 0, Pickup: 0, 'In Progress': 0, Completed: 0, Cancelled: 0 };
    inStage.forEach((r) => {
      c[r.statusLabel] = (c[r.statusLabel] || 0) + 1;
    });
    return c;
  }, [inStage]);

  const filtered = useMemo(
    () => inStage.filter((r) => (filter === 'All' || r.statusLabel === filter) && matchesQuery(r, query)),
    [inStage, filter, query],
  );

  const tab = (invoiceMode ? INVOICE_TABS : ALL_TABS).find((t) => t.key === stage) || ALL_TABS[0];
  const narrowed = filter !== 'All' || query.trim() !== '';
  const count = narrowed ? filtered.length : inStage.length;

  return (
    <OrdersShell>
      <OrdersHeader
        eyebrow={tab.eyebrow}
        title={loading ? tab.eyebrow : tab.title(count)}
        loading={loading}
        onRefresh={reload}
        filtersOpen={filtersOpen}
        filtersActive={filter !== 'All'}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
      />

      {filtersOpen ? (
        <div className="rounded-[16px] border border-[#ECECEC] bg-[#F8F8F8] p-4">
          <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#666666]">Booking status</p>
          <FilterChips options={BOOKING_STATUS_FILTERS} value={filter} onChange={setFilter} counts={statusCounts} />
        </div>
      ) : null}

      <OrdersSearch value={query} onChange={setQuery} />
      {fixedStage && !invoiceMode ? null : (
        <StageTabs
          tabs={tabs}
          value={stage}
          onChange={selectStage}
          counts={invoiceMode ? { invoice: invoiced.length } : stageCounts}
          loading={loading}
          ariaLabel={invoiceMode ? 'Invoices' : 'Booking stages'}
        />
      )}

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      {loading ? (
        <OrdersSkeleton />
      ) : error ? null : filtered.length === 0 ? (
        narrowed && inStage.length ? (
          <OrdersEmpty
            title="No bookings match"
            text="Try a different search term or status filter."
            action={
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setFilter('All');
                }}
                className="rounded-xl border border-[#ECECEC] bg-white px-4 py-2 text-[13.5px] font-bold text-[#067647] transition hover:bg-[#F3F3F3]"
              >
                Clear search &amp; filters
              </button>
            }
          />
        ) : (
          <OrdersEmpty icon={TAB_ICONS[stage]} title={tab.emptyTitle} text={tab.emptyText} />
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <OrderCard
              key={r.id}
              row={r}
              variant={variantLabel(r, options)}
              onAssign={() => setAssigning(r)}
              onOpenStatus={() => setUpdating(r)}
              showReEstimate={false}
              invoiceView={invoiceMode}
              onReschedule={invoiceMode ? undefined : () => setRescheduling(r)}
            />
          ))}
        </div>
      )}

      <AssignTechnicianModal
        open={Boolean(assigning)}
        ticketId={assigning?.ticketRef}
        currentTechnicianId={assigning?.assignedTechnicianId}
        bookingLabel={assigning ? [withHash(assigning.bookingNumber || assigning.id), assigning.deviceDisplayName || assigning.modelName].filter(Boolean).join(' · ') : ''}
        onClose={() => setAssigning(null)}
        onAssigned={mergeTicket}
      />
      <RescheduleModal
        open={Boolean(rescheduling)}
        ticketId={rescheduling?.ticketRef}
        bookingLabel={rescheduling ? [withHash(rescheduling.bookingNumber || rescheduling.id), rescheduling.deviceDisplayName || rescheduling.modelName].filter(Boolean).join(' · ') : ''}
        bookedAt={rescheduling?.createdAt}
        durationHours={rescheduling?.estimatedDurationHours}
        onClose={() => setRescheduling(null)}
        onSaved={(ticket) => ticket?.id && mergeTicket(ticket)}
      />
      {/* Keyed per ticket so a newly opened booking never shows the previous one's steps. */}
      <ServiceStatusSheet
        key={updating?.ticketRef || 'closed'}
        open={Boolean(updating?.ticketRef)}
        ticketId={updating?.ticketRef}
        bookingRef={updating ? withHash(updating.bookingNumber || updating.id) : ''}
        lifecycleStatus={updating?.ticketStatus}
        statusLabel={updating ? orderBadgeText(updating) : ''}
        onClose={() => setUpdating(null)}
        onUpdated={() => updating?.ticketRef && refreshTicket(updating.ticketRef)}
      />
    </OrdersShell>
  );
}
