'use client';

/**
 * /shop-home/services/requote/?tab=<all|reestimated> — Requote / Re-Estimate
 * bookings, mirroring the Partner app's Re-Estimated menu (two tiles: the
 * bookings that can still be re-estimated, and the ones that have been).
 *
 * Rows are the same joined booking + ticket rows as the Bookings page
 * (useOrderRows / buildOrderRows). A booking can be re-estimated once it has
 * a repair ticket that hasn't reached Ready for Delivery or ended — the same
 * window the ticket-service's own re-estimate status move applies to
 * (TicketService.markReEstimated: up to IN_REPAIR, never CANCELLED/RETURNED).
 * "Re-Estimated" is the backend's QUOTED ticket status, the one the app
 * labels "Re-Estimated" — read from the re-fetched ticket, never local state.
 *
 * Re-Est opens ReEstimateModal (PUT /tickets/{id} + status QUOTED, the app's
 * edit flow); on save the rows are re-fetched. Tapping the device block or
 * the status/date opens ServiceStatusSheet (the app's card-tap sheet), then
 * re-fetches too. Assign / History / Receipt /
 * Barcode / Details are the Bookings page's own actions.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, History, Pencil, Phone, QrCode, Receipt, User, UserCog, Wrench } from 'lucide-react';

import { cx } from '@/components/site/ui';
import FilterChips from '@/components/shop-dashboard/FilterChips';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import AssignTechnicianModal from '@/components/shop-dashboard/AssignTechnicianModal';
import ServiceStatusSheet from '@/components/shop-dashboard/ServiceStatusSheet';
import ReEstimateModal from '@/components/shop-dashboard/ReEstimateModal';
import {
  DeviceThumb,
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
import { getDeviceImage, resolveMediaUrl, variantLabel } from '@/lib/deviceImage';
import { buildOrderRows, readQueryParam, writeQueryParam } from '@/lib/orderStages';

// Ticket statuses a re-estimate still applies to.
const RE_ESTIMABLE = ['CREATED', 'ASSIGNED', 'IN_DIAGNOSIS', 'QUOTED', 'APPROVED', 'IN_REPAIR'];
const RE_ESTIMATED = 'QUOTED';

const TABS = [
  { key: 'all', label: 'Bookings', icon: FileText },
  { key: 'reestimated', label: 'Re-Estimated', icon: Pencil },
];
const TAB_KEYS = TABS.map((t) => t.key);

// Ticket status -> badge, matching the Partner app's STATUS_VARIANT labels.
const TICKET_BADGE = {
  CREATED: ['Service Accepted', 'amber'],
  ASSIGNED: ['Technician Assigned', 'green'],
  IN_DIAGNOSIS: ['In Diagnosis', 'purple'],
  IN_REPAIR: ['In Service Process', 'purple'],
  QUOTED: ['Re-Estimated', 'amber'],
  APPROVED: ['Customer Approved', 'green'],
};
const TONE = {
  amber: 'bg-[#FEF0C7] text-[#B54708]',
  green: 'bg-[#F3F3F3] text-[#067647]',
  purple: 'bg-[#F4EBFF] text-[#6941C6]',
  gray: 'bg-[#F3F3F3] text-[#475467]',
};

const upper = (v) => String(v || '').toUpperCase();
const ticketBadge = (row) => TICKET_BADGE[upper(row.ticketStatus)] || [String(row.ticketStatus || row.status || '').replace(/_/g, ' '), 'gray'];

/** Props that make a card region open Update Service Status (mouse + keyboard). */
function openStatusProps(onOpen) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: (e) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen();
      }
    },
  };
}
const OPEN_STATUS_CLS = 'cursor-pointer rounded-2xl outline-none transition hover:bg-[#F8F8F8] focus-visible:ring-4 focus-visible:ring-[#079455]/15';
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function formatDay(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}
function formatTime(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
}

export default function RequotePage() {
  const { bookings, tickets, options, loading, error, reload, mergeTicket } = useOrderRows();
  const [tab, setTab] = useState('all');
  const [filter, setFilter] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [assigning, setAssigning] = useState(null);
  const [estimating, setEstimating] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    setTab(readQueryParam('tab', TAB_KEYS));
  }, []);

  function selectTab(key) {
    setTab(key);
    writeQueryParam('tab', key);
  }

  const eligible = useMemo(
    () => buildOrderRows(bookings, tickets).filter((r) => r.ticketRef && RE_ESTIMABLE.includes(upper(r.ticketStatus))),
    [bookings, tickets],
  );
  const counts = useMemo(
    () => ({ all: eligible.length, reestimated: eligible.filter((r) => upper(r.ticketStatus) === RE_ESTIMATED).length }),
    [eligible],
  );
  const inTab = useMemo(() => (tab === 'reestimated' ? eligible.filter((r) => upper(r.ticketStatus) === RE_ESTIMATED) : eligible), [eligible, tab]);

  const statusCounts = useMemo(() => {
    const c = { All: inTab.length };
    inTab.forEach((r) => {
      c[r.statusLabel] = (c[r.statusLabel] || 0) + 1;
    });
    return c;
  }, [inTab]);

  const filtered = useMemo(
    () => inTab.filter((r) => (filter === 'All' || r.statusLabel === filter) && matchesQuery(r, query)),
    [inTab, filter, query],
  );

  const narrowed = filter !== 'All' || query.trim() !== '';
  const count = narrowed ? filtered.length : inTab.length;
  const label = (r) => [withHash(r.bookingNumber || r.id), r.deviceDisplayName || r.modelName].filter(Boolean).join(' · ');

  return (
    <OrdersShell>
      <OrdersHeader
        eyebrow="Bookings"
        title={loading ? 'Bookings' : tab === 'reestimated' ? plural(count, 'Re-Estimated Booking', 'Re-Estimated Bookings') : plural(count, 'Booking', 'Bookings')}
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
      <StageTabs tabs={TABS} value={tab} onChange={selectTab} counts={counts} loading={loading} ariaLabel="Requote bookings" />

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      {loading ? (
        <OrdersSkeleton />
      ) : error ? null : filtered.length === 0 ? (
        narrowed && inTab.length ? (
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
        ) : tab === 'reestimated' ? (
          <OrdersEmpty icon={Pencil} title="No re-estimated bookings" text="Bookings that have been re-estimated will appear here." />
        ) : (
          <OrdersEmpty icon={FileText} title="No bookings to re-estimate" text="Bookings with a repair ticket that is still in progress will appear here." />
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RequoteCard
              key={r.id}
              row={r}
              variant={variantLabel(r, options)}
              onOpenStatus={() => setUpdating(r)}
              onReEstimate={() => setEstimating(r)}
              onAssign={() => setAssigning(r)}
            />
          ))}
        </div>
      )}

      <ServiceStatusSheet
        open={Boolean(updating)}
        ticketId={updating?.ticketRef}
        bookingRef={updating ? withHash(updating.bookingNumber || updating.id) : ''}
        lifecycleStatus={updating?.ticketStatus}
        statusLabel={updating ? ticketBadge(updating)[0] : ''}
        onClose={() => setUpdating(null)}
        onUpdated={reload}
      />
      <ReEstimateModal
        open={Boolean(estimating)}
        ticketId={estimating?.ticketRef}
        bookingLabel={estimating ? label(estimating) : ''}
        onClose={() => setEstimating(null)}
        onSaved={reload}
      />
      <AssignTechnicianModal
        open={Boolean(assigning)}
        ticketId={assigning?.ticketRef}
        currentTechnicianId={assigning?.assignedTechnicianId}
        bookingLabel={assigning ? label(assigning) : ''}
        onClose={() => setAssigning(null)}
        onAssigned={mergeTicket}
      />
    </OrdersShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

function CardAction({ icon: Icon, label, iconCls = 'text-[#079455]', href, onClick, title }) {
  const cls =
    'inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-[12.5px] font-bold text-[#111111] transition hover:bg-[#F8F8F8] hover:text-[#067647]';
  const body = (
    <>
      <Icon className={cx('h-[17px] w-[17px] shrink-0', iconCls)} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className={cls} title={title}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} title={title}>
      {body}
    </button>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <p className="flex min-w-0 items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0 text-[#079455]" aria-hidden="true" />
      <span className="w-[68px] shrink-0 text-[12.5px] font-semibold text-[#98A2B3]">{label}</span>
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-[#111111]">{children}</span>
    </p>
  );
}

function RequoteCard({ row, variant, onOpenStatus, onReEstimate, onAssign }) {
  const id = encodeURIComponent(row.id);
  const model = row.deviceDisplayName || row.modelName || '';
  const brand = row.brandName || '';
  const deviceName = model ? (brand && !model.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${model}` : model) : 'Device not specified';
  const sub = [row.modelNumber, variant].filter(Boolean).join(' · ');
  const services = Array.isArray(row.services) ? row.services : [];
  const servicesText = services.length ? services.map((s) => s.serviceName || s.serviceCode).filter(Boolean).join(', ') : row.issueSummary || '';
  const [badgeText, tone] = ticketBadge(row);
  const image = resolveMediaUrl(row.deviceImageUrl) || resolveMediaUrl(row.frontImageUrl) || getDeviceImage(row);

  return (
    <article className="overflow-hidden rounded-[20px] border border-[#ECECEC] bg-[#F8F8F8] transition">
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-6">
        <div
          {...openStatusProps(onOpenStatus)}
          aria-label={`Update service status for ${withHash(row.bookingNumber || row.id)}`}
          className={cx('-m-2 flex min-w-0 items-center gap-4 p-2', OPEN_STATUS_CLS)}
        >
          <DeviceThumb url={image} />
          <div className="min-w-0 flex-1">
            <span className="inline-block max-w-full truncate rounded-lg bg-[#F3F3F3] px-2 py-0.5 text-[12px] font-extrabold tracking-wide text-[#067647]">
              {withHash(row.bookingNumber || row.id)}
            </span>
            <p className="mt-1 truncate text-[16px] font-extrabold text-[#111111]" title={deviceName}>
              {deviceName}
            </p>
            {sub ? <p className="truncate text-[13px] text-[#475467]">{sub}</p> : null}
            {row.color ? (
              <p className="truncate text-[13px] text-[#666666]">
                Color: <span className="font-semibold text-[#344054]">{row.color}</span>
              </p>
            ) : null}
          </div>
          <StatusBlock className="flex lg:hidden" text={badgeText} tone={tone} at={row.createdAt} />
        </div>

        <div className="min-w-0 space-y-2 border-t border-[#ECECEC] pt-3.5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <InfoRow icon={User} label="Customer">
            {row.customerName || <span className="text-[#98A2B3]">Not available</span>}
          </InfoRow>
          <InfoRow icon={Phone} label="Mobile">
            {row.customerMobile ? (
              <a href={`tel:${row.customerMobile}`} className="text-[#079455] hover:underline">
                {row.customerMobile}
              </a>
            ) : (
              <span className="text-[#98A2B3]">Not available</span>
            )}
          </InfoRow>
          <InfoRow icon={Wrench} label="Services">
            {servicesText || <span className="text-[#98A2B3]">Not listed</span>}
          </InfoRow>
        </div>

        <div {...openStatusProps(onOpenStatus)} aria-label="Update service status" className={cx('-m-2 hidden p-2 lg:block', OPEN_STATUS_CLS)}>
          <StatusBlock className="flex" text={badgeText} tone={tone} at={row.createdAt} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 border-t border-[#ECECEC] bg-[#F8F8F8] px-2 py-1.5 sm:flex sm:px-3">
        <CardAction icon={Pencil} label="Re-Est" iconCls="text-[#16A34A]" onClick={onReEstimate} title="Revise this booking’s services and price" />
        <CardAction icon={UserCog} label={row.assignedTechnicianName ? 'Reassign' : 'Assign'} onClick={onAssign} title="Assign a technician to this repair" />
        <CardAction icon={History} label="History" href={`/shop-home/services/bookings/view/?id=${id}`} />
        <CardAction icon={Receipt} label="Receipt" href={`/shop-home/services/bookings/view/receipt/?id=${id}`} />
        <CardAction icon={QrCode} label="Barcode" iconCls="text-[#F97316]" href={`/shop-home/services/bookings/view/qr/?id=${id}`} />
        <CardAction icon={FileText} label="Details" href={`/shop-home/services/bookings/view/details/?id=${id}`} />
      </div>
    </article>
  );
}

function StatusBlock({ text, tone, at, className }) {
  return (
    <div className={cx('shrink-0 flex-col items-end gap-1 text-right', className)}>
      <span className={cx('max-w-[170px] truncate rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide', TONE[tone] || TONE.gray)} title={text}>
        {text}
      </span>
      <span className="text-[13px] font-semibold text-[#344054]">{formatDay(at)}</span>
      <span className="text-[12px] text-[#666666]">{formatTime(at)}</span>
    </div>
  );
}
