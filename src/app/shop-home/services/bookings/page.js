'use client';

/**
 * /shop-home/services/bookings/?stage=<all|active|ready|delivered|invoice>
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
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, PackageCheck, Receipt, Wrench } from 'lucide-react';

import FilterChips from '@/components/shop-dashboard/FilterChips';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import AssignTechnicianModal from '@/components/shop-dashboard/AssignTechnicianModal';
import {
  OrderCard,
  OrdersEmpty,
  OrdersHeader,
  OrdersSearch,
  OrdersShell,
  OrdersSkeleton,
  StageTabs,
  matchesQuery,
  useOrderRows,
  withHash,
} from '@/components/shop-dashboard/OrdersList';
import { BOOKING_STATUS_FILTERS } from '@/lib/bookingFormat';
import { variantLabel } from '@/lib/deviceImage';
import { BOOKING_STAGE_TABS, buildOrderRows, countByStage, readQueryParam, writeQueryParam } from '@/lib/orderStages';

const TAB_ICONS = { all: ClipboardList, active: Wrench, ready: PackageCheck, delivered: CheckCircle2, invoice: Receipt };
const TABS = BOOKING_STAGE_TABS.map((t) => ({ ...t, icon: TAB_ICONS[t.key] }));
const STAGE_KEYS = TABS.map((t) => t.key);

export default function BookingsPage() {
  const { bookings, tickets, options, loading, error, reload, mergeTicket } = useOrderRows();
  const [stage, setStage] = useState('all');
  const [filter, setFilter] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    setStage(readQueryParam('stage', STAGE_KEYS));
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setQuery(q);
  }, []);

  function selectStage(key) {
    setStage(key);
    writeQueryParam('stage', key);
  }

  const rows = useMemo(() => buildOrderRows(bookings, tickets), [bookings, tickets]);
  const stageCounts = useMemo(() => countByStage(rows), [rows]);

  const inStage = useMemo(() => (stage === 'all' ? rows : rows.filter((r) => r.stage === stage)), [rows, stage]);

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

  const tab = TABS.find((t) => t.key === stage) || TABS[0];
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
      <StageTabs tabs={TABS} value={stage} onChange={selectStage} counts={stageCounts} loading={loading} ariaLabel="Booking stages" />

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
            <OrderCard key={r.id} row={r} variant={variantLabel(r, options)} onAssign={() => setAssigning(r)} />
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
    </OrdersShell>
  );
}
