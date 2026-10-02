'use client';

/**
 * /shop-home/services/pickups/?tab=<all|requested|accepted|ready>
 *
 * Doorstep pickups (repair bookings with serviceMode === 'PICKUP'),
 * mirroring the shop-owner app's pickups screens. Opened from the nav, and
 * from the dashboard's Business Overview:
 *   Pickup Queue -> all · Pickup Requests -> requested · Pickup Confirmed -> accepted
 * The selected tab drives the header ("ACCEPTED PICKUPS / 3 Accepted
 * Pickups"), the list and the empty state; it's kept in the URL.
 *
 * Rows, tab membership and counts come from lib/orderStages.js — the same
 * functions the dashboard cards count with. Data loading, cards and chrome
 * are shared with the Bookings page (components/shop-dashboard/OrdersList.js).
 *
 * Filters opens the two filters this page has always had: the display
 * status chips (Created reads as "Pending"; Pickup + In Progress read as "In
 * Progress" — display-only regrouping of friendlyBookingStatus) and the
 * pickup-date picker. src/lib/pickupWorkflow.js's accept/start/complete
 * calls stay unused here: those endpoints aren't confirmed to exist.
 */

import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, ClipboardList, PackageCheck, Truck } from 'lucide-react';

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
import { variantLabel } from '@/lib/deviceImage';
import { PICKUP_TABS, buildOrderRows, countPickups, readQueryParam, writeQueryParam } from '@/lib/orderStages';

const TAB_ICONS = { all: Truck, requested: ClipboardList, accepted: ClipboardCheck, ready: PackageCheck };
const TABS = PICKUP_TABS.map((t) => ({ ...t, icon: TAB_ICONS[t.key] }));
const TAB_KEYS = TABS.map((t) => t.key);

const DISPLAY_FILTERS = ['All', 'Pending', 'In Progress', 'Completed', 'Cancelled'];
function displayBucket(statusLabel) {
  if (statusLabel === 'Created') return 'Pending';
  if (statusLabel === 'Pickup' || statusLabel === 'In Progress') return 'In Progress';
  return statusLabel;
}

export default function PickupsPage() {
  const { bookings, tickets, options, loading, error, reload, mergeTicket } = useOrderRows();
  const [tab, setTab] = useState('all');
  const [filter, setFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    setTab(readQueryParam('tab', TAB_KEYS));
  }, []);

  function selectTab(key) {
    setTab(key);
    writeQueryParam('tab', key);
  }

  const rows = useMemo(() => buildOrderRows(bookings, tickets), [bookings, tickets]);
  const counts = useMemo(() => countPickups(rows), [rows]);

  const inTab = useMemo(() => rows.filter((r) => r.isPickup && (tab === 'all' || r.pickupTabs.includes(tab))), [rows, tab]);

  const statusCounts = useMemo(() => {
    const c = { All: inTab.length, Pending: 0, 'In Progress': 0, Completed: 0, Cancelled: 0 };
    inTab.forEach((r) => {
      const k = displayBucket(r.statusLabel);
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [inTab]);

  const filtered = useMemo(
    () =>
      inTab.filter(
        (r) =>
          (filter === 'All' || displayBucket(r.statusLabel) === filter) &&
          (!dateFilter || r.pickupDate === dateFilter) &&
          matchesQuery(r, query),
      ),
    [inTab, filter, dateFilter, query],
  );

  const current = TABS.find((t) => t.key === tab) || TABS[0];
  const filtersActive = filter !== 'All' || dateFilter !== '';
  const narrowed = filtersActive || query.trim() !== '';
  const count = narrowed ? filtered.length : inTab.length;

  function clearAll() {
    setFilter('All');
    setDateFilter('');
    setQuery('');
  }

  return (
    <OrdersShell>
      <OrdersHeader
        eyebrow={current.eyebrow}
        title={loading ? current.eyebrow : current.title(count)}
        loading={loading}
        onRefresh={reload}
        filtersOpen={filtersOpen}
        filtersActive={filtersActive}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
      />

      {filtersOpen ? (
        <div className="flex flex-wrap items-end gap-4 rounded-[16px] border border-[#ECECEC] bg-[#F8F8F8] p-4">
          <div className="min-w-0 flex-1">
            <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#666666]">Status</p>
            <FilterChips options={DISPLAY_FILTERS} value={filter} onChange={setFilter} counts={statusCounts} />
          </div>
          <label className="flex flex-col gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-[#666666]">
            Pickup date
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 rounded-xl border border-[#ECECEC] bg-white px-3 text-[13.5px] font-semibold normal-case tracking-normal text-[#111111] focus:border-[#079455] focus:outline-none"
            />
          </label>
          {filtersActive ? (
            <button type="button" onClick={() => { setFilter('All'); setDateFilter(''); }} className="h-10 rounded-xl px-3 text-[13.5px] font-bold text-[#067647] hover:bg-[#F3F3F3]">
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      <OrdersSearch value={query} onChange={setQuery} />
      <StageTabs tabs={TABS} value={tab} onChange={selectTab} counts={counts} loading={loading} ariaLabel="Pickup stages" />

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      {loading ? (
        <OrdersSkeleton />
      ) : error ? null : filtered.length === 0 ? (
        narrowed && inTab.length ? (
          <OrdersEmpty
            icon={TAB_ICONS[tab]}
            title="No pickups match"
            text="Try a different search term, status or date."
            action={
              <button
                type="button"
                onClick={clearAll}
                className="rounded-xl border border-[#ECECEC] bg-white px-4 py-2 text-[13.5px] font-bold text-[#067647] transition hover:bg-[#F3F3F3]"
              >
                Clear search &amp; filters
              </button>
            }
          />
        ) : (
          <OrdersEmpty icon={TAB_ICONS[tab]} title={current.emptyTitle} text={current.emptyText} />
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
