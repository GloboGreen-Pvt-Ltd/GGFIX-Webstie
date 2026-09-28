'use client';

/**
 * /shop-home/services/pickups — Pickup Tracking page.
 *
 * Reads GET {ORDER_BASE}/repair-bookings/shop via the existing
 * fetchShopBookings() (src/lib/shopDashboard.js) — the same call the
 * Partner Dashboard's Recent Bookings card and the Bookings page both use —
 * filtered client-side to serviceMode === 'PICKUP'. No separate API client,
 * no mock data.
 *
 * This is intentionally a READ-ONLY tracker: the backend only exposes a
 * read endpoint for shop pickup bookings today. src/lib/pickupWorkflow.js
 * (Accept/Assign/Start/Mark-picked-up/Complete/Cancel, all real fetch calls
 * against endpoints not yet confirmed to exist) is left in place, unused,
 * for exactly this reason — when those mutation endpoints ship, the
 * PickupRow component below is the one place a workflow-actions panel would
 * be re-added; nothing here should grow a fake button in the meantime.
 *
 * Status colors/buckets are the exact ones already used by the Partner
 * Dashboard's Recent Bookings card and the Bookings page
 * (src/lib/bookingFormat.js's friendlyBookingStatus()/BOOKING_STATUS_BADGE)
 * — not a new status system. The filter chips below group those same
 * buckets into the 5 the pickup-specific brief asked for (Pending/In
 * Progress/Completed/Cancelled) by relabeling for display only: "Created"
 * reads as "Pending" here, and "Pickup" + "In Progress" both read as "In
 * Progress" — the underlying bucket function itself is untouched.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Filter,
  IndianRupee,
  MapPin,
  Package,
  Phone,
  PlusCircle,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import FilterChips from '@/components/shop-dashboard/FilterChips';
import SearchField, { FIELD_INPUT_CLS, FOCUS_RING } from '@/components/shop-dashboard/SearchField';
import EmptyState from '@/components/shop-dashboard/EmptyState';
import { SkeletonRows, SkeletonStatCards } from '@/components/shop-dashboard/SkeletonBlocks';
import { fetchShopBookings, friendlyBookingStatus } from '@/lib/shopDashboard';
import { BOOKING_STATUS_BADGE, formatBookingDate, formatPickupAddress, formatSlotTime, bookingEstimatedAmount } from '@/lib/bookingFormat';

/**
 * PickupEmptyIllustration — decorative clipboard + small delivery-truck
 * badge for the "No pickup bookings yet" empty state, matching a reference
 * design. Purely decorative SVG, not a data element.
 */
function PickupEmptyIllustration() {
  return (
    <svg viewBox="0 0 160 140" className="h-32 w-32" aria-hidden="true">
      <circle cx="80" cy="70" r="62" fill="#DFF8EB" opacity="0.6" />
      <circle cx="30" cy="30" r="7" fill="#BFE8FF" opacity="0.7" />
      <circle cx="132" cy="28" r="5" fill="#BFE8FF" opacity="0.6" />
      <circle cx="128" cy="100" r="6" fill="#DCFCE7" opacity="0.8" />

      <rect x="46" y="26" width="68" height="92" rx="10" fill="white" stroke="#DCFCE7" strokeWidth="2" />
      <rect x="64" y="18" width="32" height="14" rx="4" fill="#15803D" />
      <rect x="58" y="44" width="44" height="5" rx="2.5" fill="#DCFCE7" />
      <rect x="58" y="56" width="34" height="5" rx="2.5" fill="#DCFCE7" />
      <rect x="58" y="68" width="40" height="5" rx="2.5" fill="#DCFCE7" />

      <circle cx="104" cy="104" r="22" fill="#15803D" />
      <path d="M94 104 h20 M104 94 v20" stroke="transparent" />
      <g transform="translate(90,94)">
        <rect x="0" y="6" width="20" height="10" rx="2" fill="white" />
        <rect x="14" y="9" width="8" height="7" rx="1.5" fill="white" />
        <circle cx="4" cy="17" r="2.4" fill="#15803D" stroke="white" strokeWidth="1.4" />
        <circle cx="17" cy="17" r="2.4" fill="#15803D" stroke="white" strokeWidth="1.4" />
      </g>
    </svg>
  );
}

const DISPLAY_FILTERS = ['All', 'Pending', 'In Progress', 'Completed', 'Cancelled'];

// Display-only regrouping for this page's filter chips/stat cards — see the
// file header comment. Colors are reused verbatim from BOOKING_STATUS_BADGE,
// not invented.
function displayBucket(statusLabel) {
  if (statusLabel === 'Created') return 'Pending';
  if (statusLabel === 'Pickup' || statusLabel === 'In Progress') return 'In Progress';
  return statusLabel;
}

const DISPLAY_BADGE = {
  Pending: BOOKING_STATUS_BADGE.Created,
  'In Progress': BOOKING_STATUS_BADGE.Pickup,
  Completed: BOOKING_STATUS_BADGE.Completed,
  Cancelled: BOOKING_STATUS_BADGE.Cancelled,
};

// Page-local pastel KPI-card styling — not the shared StatCard (used by
// ~10 other pages, unaffected): a reference design for this page wants a
// distinct pastel-gradient + Icon3D + background-glyph treatment per card,
// same idea as the Dashboard's own page-local DashboardKpiCard
// (src/app/shop-home/page.js) and Book Service's Section.
const PICKUP_STAT_STYLES = {
  green: {
    card: 'bg-gradient-to-br from-[#F0FBF5] to-[#DFF8EB]',
    value: 'text-[#10213D]',
    label: 'text-[#066B39]',
    wave: 'text-[#BBF7D0]',
  },
  orange: {
    card: 'bg-gradient-to-br from-[#FFF7ED] to-[#FDE7CB]',
    value: 'text-[#10213D]',
    label: 'text-[#9A5B27]',
    wave: 'text-[#FDBA74]',
  },
  violet: {
    card: 'bg-gradient-to-br from-[#F5F3FF] to-[#E8E1FC]',
    value: 'text-[#10213D]',
    label: 'text-[#6D5A9E]',
    wave: 'text-[#C4B5FD]',
  },
  red: {
    card: 'bg-gradient-to-br from-[#FFF1F2] to-[#FCE1E4]',
    value: 'text-[#10213D]',
    label: 'text-[#9F5361]',
    wave: 'text-[#FDA4AF]',
  },
};

function PickupStatCard({ icon: Icon, bgIcon: BgIcon, label, value, tone }) {
  const s = PICKUP_STAT_STYLES[tone] || PICKUP_STAT_STYLES.green;
  return (
    <div
      className={cx(
        'relative flex h-full flex-col overflow-hidden rounded-[22px] border border-[#E3ECE7] p-5 shadow-[0_12px_30px_rgba(20,80,55,0.08),0_3px_10px_rgba(20,80,55,0.05)]',
        s.card,
      )}
    >
      <BgIcon className={cx('pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 opacity-25', s.wave)} aria-hidden="true" />
      <Icon3D icon={Icon} tone={tone} size="md" className="relative" />
      <p className={cx('relative mt-4 text-[30px] font-extrabold leading-none tracking-tight', s.value)}>{value}</p>
      <p className={cx('relative mt-1.5 text-sm font-semibold', s.label)}>{label}</p>
    </div>
  );
}

export default function PickupsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState('');

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(''), 2200);
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    fetchShopBookings()
      .then((list) => {
        if (alive) setBookings(list);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const pickups = useMemo(
    () =>
      bookings
        .filter((b) => b.serviceMode === 'PICKUP')
        .map((b) => {
          const { statusLabel } = friendlyBookingStatus(b.status);
          return { ...b, statusLabel, displayStatus: displayBucket(statusLabel) };
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [bookings],
  );

  const counts = useMemo(() => {
    const c = { All: pickups.length, Pending: 0, 'In Progress': 0, Completed: 0, Cancelled: 0 };
    pickups.forEach((p) => {
      c[p.displayStatus] = (c[p.displayStatus] || 0) + 1;
    });
    return c;
  }, [pickups]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pickups.filter((p) => {
      if (filter !== 'All' && p.displayStatus !== filter) return false;
      if (dateFilter && p.pickupDate !== dateFilter) return false;
      if (!q) return true;
      return (
        (p.customerName || '').toLowerCase().includes(q) ||
        (p.customerMobile || '').toLowerCase().includes(q) ||
        (p.bookingNumber || '').toLowerCase().includes(q)
      );
    });
  }, [pickups, filter, query, dateFilter]);

  const isFiltered = filter !== 'All' || query.trim() !== '' || dateFilter !== '';

  function clearFilters() {
    setFilter('All');
    setQuery('');
    setDateFilter('');
  }

  const stats = [
    { label: 'Total Pickups', value: pickups.length, icon: Truck, bgIcon: Package, tone: 'green' },
    { label: 'In Progress', value: counts['In Progress'], icon: Clock, bgIcon: Clock, tone: 'orange' },
    { label: 'Completed', value: counts.Completed, icon: CheckCircle2, bgIcon: CheckCircle2, tone: 'violet' },
    { label: 'Cancelled', value: counts.Cancelled, icon: XCircle, bgIcon: XCircle, tone: 'red' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {toast ? (
        <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-xl bg-[#15803D] px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      {/* Hero — compact premium banner. Background gradient/waves match a
          reference design's "white -> mint" spec; the right-side artwork is
          the real public/pickup img.png asset (a truck/phone/parcels
          illustration cluster), CSS-cropped via background-position to show
          only that cluster — the same file also happens to have a full
          mockup of this banner (title/subtitle/Refresh) baked into its left
          side, which would freeze Refresh as a dead pixel button if shown
          whole, so only the illustration portion is windowed in; the title,
          subtitle and Refresh handler below are the real, still-functional
          ones this page always had. */}
      <div
        className="relative overflow-hidden rounded-[20px] border border-[#DDF1E8] p-5 shadow-[0_8px_24px_rgba(24,73,57,0.06)] sm:p-6"
        style={{ background: 'linear-gradient(110deg, #ffffff 0%, #f5fcf9 45%, #e8faf2 100%)' }}
      >
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full text-[#DFF8EB]/60"
          viewBox="0 0 500 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,40 C120,90 280,0 500,50 L500,80 L0,80 Z" />
        </svg>

        <div className="relative flex flex-wrap items-center justify-between gap-4 md:pr-[280px]">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#22C55E] to-[#0A934D]" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-[28px] font-extrabold tracking-tight text-[#10213D] sm:text-[32px]">Pickups</h1>
              <p className="mt-1 text-[14px] text-[#5B7085] sm:text-[15px]">Track and manage customer device pickup bookings.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            aria-label="Refresh pickup bookings"
            className={cx(
              'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#E3ECE7] bg-white px-4 text-sm font-semibold text-[#10213D] shadow-sm transition hover:border-[#079447] hover:text-[#079447] disabled:cursor-not-allowed disabled:opacity-60 md:-translate-x-4',
              FOCUS_RING,
            )}
          >
            <RefreshCw className={cx('h-4 w-4 text-[#079447]', loading && 'animate-spin')} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {/* public/pickup img.png, windowed to its right-side illustration
            cluster only (original asset is 2172x724; the cluster sits
            roughly at x:1720-2172, y:220-480 in that image) — background-size
            scales the whole image up, background-position shifts it so only
            that region falls inside this box. */}
        <div
          className="pointer-events-none absolute bottom-0 right-4 hidden h-[140px] w-[243px] md:block lg:right-6 lg:h-[150px] lg:w-[261px]"
          style={{
            backgroundImage: "url('/pickup%20img.png')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1170px 390px',
            backgroundPosition: '-926px -119px',
          }}
          aria-hidden="true"
        />
      </div>

      {loading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <PickupStatCard key={s.label} icon={s.icon} bgIcon={s.bgIcon} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
      )}

      <section className="rounded-[22px] border border-[#E3ECE7] bg-white shadow-[0_12px_32px_rgba(20,80,55,0.07),0_3px_10px_rgba(20,80,55,0.04)]">
        <div className="flex flex-col gap-4 border-b border-[#EAECF0] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterChips options={DISPLAY_FILTERS} value={filter} onChange={setFilter} counts={counts} />
            <Link
              href="/shop-home/services/book-service"
              className={cx(
                'inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-gradient-to-br from-[#16B45F] to-[#087A3E] px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(8,122,62,0.3)] transition hover:brightness-105',
                FOCUS_RING,
              )}
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              Create Pickup Request
            </Link>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="flex-1">
              <SearchField value={query} onChange={setQuery} placeholder="Search customer, phone or booking number..." />
            </div>
            <div className="relative shrink-0">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" aria-hidden="true" />
              <input
                type="date"
                aria-label="Filter by pickup date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={cx(FIELD_INPUT_CLS, 'w-full pl-9 sm:w-[170px]')}
              />
            </div>
            <button
              type="button"
              disabled
              title="Additional filters aren't available yet"
              aria-label="More filters — not yet available"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#D0D5DD] bg-white px-4 py-2.5 text-sm font-semibold text-[#98A2B3] shadow-sm disabled:cursor-not-allowed"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filter
            </button>
          </div>
        </div>

        {loading ? (
          <SkeletonRows rows={5} />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            tone="muted"
            title="Unable to load pickups"
            description="We couldn't retrieve your pickup bookings. Please try again."
            action={
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="rounded-xl bg-[#15803D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#166534]"
              >
                Retry
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          pickups.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
              <PickupEmptyIllustration />
              <p className="mt-3 text-base font-bold text-[#10213D]">No pickup bookings yet</p>
              <p className="mt-1 max-w-xs text-sm text-[#667085]">Pickup service bookings will appear here when customers request device collection.</p>
              <Link
                href="/shop-home/services/bookings"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#D0D5DD] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:border-[#079447] hover:text-[#079447]"
              >
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                View All Bookings
              </Link>
            </div>
          ) : (
            <EmptyState
              icon={Search}
              tone="muted"
              title="No matching pickups"
              description="Try changing your search or filter."
              action={
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-[#D0D5DD] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:border-[#15803D] hover:text-[#15803D]"
                >
                  Clear Filters
                </button>
              }
            />
          )
        ) : (
          <div className="divide-y divide-[#EAECF0]">
            {filtered.map((p) => (
              <PickupRow
                key={p.id}
                pickup={p}
                expanded={expandedId === p.id}
                onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                onCopied={() => showToast('Address copied to clipboard')}
              />
            ))}
          </div>
        )}
      </section>

      {!loading && !error && isFiltered && filtered.length > 0 ? (
        <p className="-mt-3 text-xs text-[#98A2B3]">Showing {filtered.length} of {pickups.length} pickups.</p>
      ) : null}
    </div>
  );
}

function PickupRow({ pickup, expanded, onToggle, onCopied }) {
  const [copied, setCopied] = useState(false);
  const address = formatPickupAddress(pickup);
  const hasAddress = Boolean(pickup.pickupAddress || pickup.pickupAddressText);
  const slot = pickup.pickupSlotStart
    ? [formatSlotTime(pickup.pickupSlotStart), formatSlotTime(pickup.pickupSlotEnd)].filter(Boolean).join(' – ')
    : null;
  const services = Array.isArray(pickup.services) ? pickup.services : [];
  const amount = bookingEstimatedAmount(pickup);
  const deviceName = pickup.deviceDisplayName || pickup.modelName || 'Not available';

  function copyAddress() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(address)
      .then(() => {
        setCopied(true);
        onCopied?.();
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#F9FAFB] sm:px-5"
      >
        <Icon3D icon={Truck} tone="green" size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#101828]">{pickup.customerName || 'Not available'}</p>
          <p className="truncate text-xs text-[#667085]">
            #{pickup.bookingNumber || pickup.id} · {pickup.customerMobile || 'Not available'} · {formatBookingDate(pickup.pickupDate)}
            {slot ? ` · ${slot}` : ''}
          </p>
          <p className="truncate text-xs text-[#98A2B3] sm:hidden">{deviceName}</p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-0.5 text-right sm:flex">
          <span className="text-xs text-[#667085]">{deviceName}</span>
          {amount != null ? <span className="text-sm font-bold text-[#101828]">₹{Number(amount).toLocaleString('en-IN')}</span> : null}
        </div>
        <span
          className={cx(
            'hidden shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide sm:inline-block',
            DISPLAY_BADGE[pickup.displayStatus] || 'bg-[#F0FDF4] text-[#667085]',
          )}
        >
          {pickup.displayStatus}
        </span>
        <span
          className={cx(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#EAECF0] text-[#98A2B3] transition',
            expanded && 'rotate-180',
          )}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-dashed border-[#EAECF0] bg-[#F9FAFB] px-4 py-4 sm:px-5">
          <span
            className={cx(
              'inline-block rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide sm:hidden',
              DISPLAY_BADGE[pickup.displayStatus] || 'bg-[#F0FDF4] text-[#667085]',
            )}
          >
            {pickup.displayStatus}
          </span>

          <div>
            <p className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Customer Information</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-[#101828]">{pickup.customerName || 'Not available'}</span>
              {pickup.customerMobile ? (
                <a href={`tel:${pickup.customerMobile}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-[#15803D] ring-1 ring-[#EAECF0] transition hover:ring-[#15803D]">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {pickup.customerMobile}
                </a>
              ) : (
                <span className="text-xs text-[#98A2B3]">No phone number available</span>
              )}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Pickup Address</p>
            {hasAddress ? (
              <div className="flex items-start gap-2 text-sm text-[#344054]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#98A2B3]" aria-hidden="true" />
                <span className="flex-1">{address}</span>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#15803D] ring-1 ring-[#EAECF0] transition hover:ring-[#15803D]"
                >
                  <Copy className="h-3 w-3" aria-hidden="true" />
                  {copied ? 'Copied' : 'Copy Address'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-[#98A2B3]">No address provided</p>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Requested Services</p>
            {services.length ? (
              <ul className="space-y-1">
                {services.map((s, i) => (
                  <li key={s.repairServiceId || i} className="flex items-center justify-between text-sm text-[#344054]">
                    <span>
                      {s.serviceName || s.serviceCode || 'Service'}
                      {s.quantity ? <span className="text-xs text-[#98A2B3]"> × {s.quantity}</span> : null}
                    </span>
                    <span className="font-semibold text-[#101828]">
                      {s.estimatedPrice != null ? `₹${Number(s.estimatedPrice).toLocaleString('en-IN')}` : 'Not available'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#98A2B3]">No services listed</p>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Amount Summary</p>
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-sm">
              <span className="flex items-center gap-1.5 text-[#344054]">
                <IndianRupee className="h-4 w-4 text-[#98A2B3]" aria-hidden="true" />
                Estimated Amount
              </span>
              <span className="font-bold text-[#101828]">{amount != null ? `₹${Number(amount).toLocaleString('en-IN')}` : 'Not available'}</span>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Booking Information</p>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-[#667085] sm:grid-cols-2">
              <p>Booking No: <span className="font-semibold text-[#344054]">{pickup.bookingNumber || pickup.id}</span></p>
              <p>Service Mode: <span className="font-semibold text-[#344054]">Pickup</span></p>
              <p>Current Status: <span className="font-semibold text-[#344054]">{pickup.displayStatus}</span></p>
              <p>Last Updated: <span className="font-semibold text-[#344054]">{pickup.updatedAt ? new Date(pickup.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available'}</span></p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
