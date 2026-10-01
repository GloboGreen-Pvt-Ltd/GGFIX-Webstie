'use client';

/**
 * /shop-home/services/bookings — all repair/service bookings (every
 * serviceMode), the general-purpose sibling of the Pickups tracker.
 *
 * Same data source as Pickups (GET {ORDER_BASE}/repair-bookings/shop via
 * fetchShopBookings()), unfiltered by serviceMode, sharing the exact same
 * status buckets/badge colors (src/lib/bookingFormat.js) so a booking never
 * shows a different color here than it would on the Pickups page.
 *
 * The card layout mirrors the shop owner mobile app's Bookings screen
 * (device thumbnail, tracking-number pill, status pill, customer/mobile,
 * action row). "Ready for Delivery" in the stat row is real data from
 * GET {TICKET_BASE}/tickets/counts (fetchTicketCounts + sumReadyForDelivery,
 * the same helpers the Partner Dashboard uses) — repair-bookings themselves
 * have no such status. The mobile app's "Invoice" count has no backing
 * endpoint anywhere in this client, so it's intentionally left off rather
 * than showing a number that can never be real.
 *
 * Read-only, like Pickups: there is no shop-side mutation endpoint for
 * bookings in this client yet, so Assign renders as a disabled button
 * (present for layout parity with the app, not a fake action). The other
 * four actions are all real per-booking pages needing no mutation endpoint,
 * only the booking's own data: "History" -> .../[id] (event timeline),
 * "Receipt" -> .../[id]/receipt, "Barcode" -> .../[id]/qr, and "Details" ->
 * .../[id]/details (device/price/schedule — replaces the old inline toggle).
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calculator,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FileX,
  History,
  Package,
  PackageCheck,
  QrCode,
  Receipt,
  RefreshCw,
  Smartphone,
  UserCog,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import FilterChips from '@/components/shop-dashboard/FilterChips';
import SearchField, { FOCUS_RING } from '@/components/shop-dashboard/SearchField';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { SkeletonRows, SkeletonStatCards } from '@/components/shop-dashboard/SkeletonBlocks';
import { fetchShopBookings, fetchTicketCounts, friendlyBookingStatus, sumReadyForDelivery } from '@/lib/shopDashboard';
import {
  BOOKING_STATUS_BADGE,
  BOOKING_STATUS_FILTERS,
  bookingEstimatedAmount,
  formatBookingDate,
} from '@/lib/bookingFormat';

// Booking TIME (not just date) for the card's top row — createdAt is a full
// timestamp already (formatBookingDate above only ever reads its date
// portion), so this reads the same real field, just the time-of-day part.
function formatBookingTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * BookingsIllustration — small decorative graphic for the hero's right side
 * (a "BOOKINGS" clipboard with a checklist, a calendar, a phone and a
 * wrench), matching a reference design. Hand-drawn inline SVG with layered
 * gradients/filter-based drop shadows for a soft-3D feel, purely decorative —
 * no data — same technique as the Delivery/Requote/Pickups hero illustrations.
 */
function BookingsIllustration() {
  return (
    <svg viewBox="0 0 300 190" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="bkClip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EAF9EF" />
        </linearGradient>
        <linearGradient id="bkPhone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#0A934D" />
        </linearGradient>
        <filter id="bkShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0C6636" floodOpacity="0.2" />
        </filter>
      </defs>

      <ellipse cx="170" cy="178" rx="120" ry="9" fill="#0C6636" opacity="0.08" />

      {/* clouds + leaves */}
      <g fill="#BFE8FF" opacity="0.55">
        <ellipse cx="56" cy="30" rx="18" ry="10" />
        <ellipse cx="40" cy="24" rx="12" ry="8" />
        <ellipse cx="266" cy="40" rx="14" ry="8" />
      </g>
      <g>
        <path d="M118 190 q-6 -30 18 -40 q4 22 -18 40" fill="#4ADE80" opacity="0.8" />
        <path d="M236 188 q6 -26 -14 -36 q-4 20 14 36" fill="#22C55E" opacity="0.8" />
      </g>

      {/* calendar, left */}
      <g filter="url(#bkShadow)">
        <rect x="112" y="122" width="46" height="46" rx="7" fill="#FFFFFF" stroke="#DCFCE7" strokeWidth="2" />
        <rect x="112" y="122" width="46" height="13" rx="6" fill="#0A934D" />
        <rect x="121" y="112" width="5" height="16" rx="2" fill="#0A934D" />
        <rect x="144" y="112" width="5" height="16" rx="2" fill="#0A934D" />
        {[0, 1].map((row) =>
          [0, 1, 2].map((col) => (
            <rect key={`${row}-${col}`} x={120 + col * 12} y={142 + row * 11} width="8" height="8" rx="2" fill="#BBF7D0" />
          )),
        )}
      </g>

      {/* wrench, floating */}
      <g filter="url(#bkShadow)" transform="translate(232,150) rotate(-30)">
        <rect x="0" y="0" width="42" height="9" rx="4.5" fill="#0A934D" />
        <circle cx="0" cy="4.5" r="9" fill="none" stroke="#0A934D" strokeWidth="7" />
      </g>

      {/* main BOOKINGS clipboard */}
      <g filter="url(#bkShadow)">
        <rect x="148" y="30" width="80" height="118" rx="10" fill="url(#bkClip)" stroke="#DCFCE7" strokeWidth="2" />
        <rect x="172" y="22" width="32" height="16" rx="6" fill="#0A934D" />
        <rect x="158" y="52" width="60" height="15" rx="4" fill="#FFFFFF" stroke="#DFF8EB" strokeWidth="1.5" />
        <text x="188" y="63" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#0C6636">BOOKINGS</text>

        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(158,${78 + i * 17})`}>
            <circle cx="6" cy="6" r="6" fill="#0A934D" />
            <path d="M3 6 l2 2 l4 -4" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="18" y="3" width="48" height="6" rx="3" fill="#DCFCE7" />
          </g>
        ))}
      </g>

      {/* phone, right */}
      <g filter="url(#bkShadow)">
        <rect x="248" y="88" width="34" height="60" rx="9" fill="url(#bkPhone)" />
        <rect x="252" y="94" width="26" height="42" rx="3" fill="#DFF6FF" />
        <circle cx="265" cy="141" r="1.8" fill="white" opacity="0.85" />
      </g>

      <circle cx="126" cy="46" r="3.5" fill="#86EFAC" />
      <circle cx="272" cy="150" r="3" fill="#86EFAC" />
    </svg>
  );
}

// Page-local pastel KPI-card styling — not the shared StatCard (used by ~10
// other pages, unaffected): matches a reference design's pastel-gradient +
// glossy circular icon chip + large translucent background-glyph treatment,
// same approach as the redesigned Delivery/Pickups/Requote pages.
const BOOKINGS_STAT_STYLES = {
  green: {
    card: 'bg-gradient-to-br from-[#F3FBF7] to-[#E4F8EC]',
    chip: 'bg-gradient-to-br from-[#22C55E] to-[#0A934D]',
    value: 'text-[#10213D]',
    label: 'text-[#066B39]',
    wave: 'text-[#BBF7D0]',
    glow: 'bg-[#86EFAC]',
  },
  blue: {
    card: 'bg-gradient-to-br from-[#EFF9FF] to-[#D9F0FE]',
    chip: 'bg-gradient-to-br from-[#38BDF8] to-[#1DA8E8]',
    value: 'text-[#10213D]',
    label: 'text-[#1D6FA0]',
    wave: 'text-[#93D6F7]',
    glow: 'bg-[#93D6F7]',
  },
  orange: {
    card: 'bg-gradient-to-br from-[#FFF7ED] to-[#FDE7CB]',
    chip: 'bg-gradient-to-br from-[#FB923C] to-[#FF7A1A]',
    value: 'text-[#10213D]',
    label: 'text-[#9A5B27]',
    wave: 'text-[#FDBA74]',
    glow: 'bg-[#FDBA74]',
  },
  purple: {
    card: 'bg-gradient-to-br from-[#F5F3FF] to-[#E8E1FC]',
    chip: 'bg-gradient-to-br from-[#A78BFA] to-[#8B5CF6]',
    value: 'text-[#10213D]',
    label: 'text-[#6D5A9E]',
    wave: 'text-[#C4B5FD]',
    glow: 'bg-[#C4B5FD]',
  },
  red: {
    card: 'bg-gradient-to-br from-[#FFF1F2] to-[#FCE1E4]',
    chip: 'bg-gradient-to-br from-[#FB7185] to-[#F43F5E]',
    value: 'text-[#10213D]',
    label: 'text-[#9F5361]',
    wave: 'text-[#FDA4AF]',
    glow: 'bg-[#FDA4AF]',
  },
};

function BookingsStatCard({ icon: Icon, bgIcon: BgIcon, label, value, tone }) {
  const s = BOOKINGS_STAT_STYLES[tone] || BOOKINGS_STAT_STYLES.green;
  return (
    <div
      className={cx(
        'relative flex h-[178px] flex-col overflow-hidden rounded-[22px] border border-[#E4ECE8] p-5 shadow-[0_12px_30px_rgba(20,80,55,0.07),0_2px_8px_rgba(20,80,55,0.03)]',
        s.card,
      )}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[22px] bg-gradient-to-b from-white/55 to-transparent" aria-hidden="true" />
      <BgIcon className={cx('pointer-events-none absolute -bottom-7 -right-7 h-32 w-32 rotate-[-10deg] opacity-[0.28]', s.wave)} aria-hidden="true" />
      <span className={cx('pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-40', s.glow)} aria-hidden="true" />

      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
        <span className={cx('absolute inset-0 -m-1.5 rounded-full blur-md opacity-50', s.glow)} aria-hidden="true" />
        <span
          className={cx(
            'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_18px_rgba(0,0,0,0.12),inset_0_1.5px_0_rgba(255,255,255,0.5),inset_0_-4px_8px_rgba(0,0,0,0.12)]',
            s.chip,
          )}
        >
          <Icon className="h-6 w-6 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]" aria-hidden="true" />
        </span>
      </span>

      <p className={cx('relative mt-4 text-[30px] font-extrabold leading-none tracking-tight sm:text-[32px]', s.value)}>{value}</p>
      <p className={cx('relative mt-1.5 text-sm font-semibold', s.label)}>{label}</p>
    </div>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [readyForDelivery, setReadyForDelivery] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    Promise.all([fetchShopBookings(), fetchTicketCounts().catch(() => ({}))])
      .then(([list, counts]) => {
        if (!alive) return;
        setBookings(list);
        setReadyForDelivery(sumReadyForDelivery(counts));
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load bookings.');
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
      bookings
        .map((b) => ({ ...b, ...friendlyBookingStatus(b.status) }))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [bookings],
  );

  const counts = useMemo(() => {
    const c = { All: rows.length, Created: 0, Pickup: 0, 'In Progress': 0, Completed: 0, Cancelled: 0 };
    rows.forEach((r) => {
      c[r.statusLabel] = (c[r.statusLabel] || 0) + 1;
    });
    return c;
  }, [rows]);

  const activeCount = counts.Created + counts.Pickup + counts['In Progress'];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'All' && r.statusLabel !== filter) return false;
      if (!q) return true;
      return (
        (r.customerName || '').toLowerCase().includes(q) ||
        (r.customerMobile || '').toLowerCase().includes(q) ||
        (r.bookingNumber || '').toLowerCase().includes(q) ||
        (r.deviceDisplayName || r.modelName || '').toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const stats = [
    { label: 'Total Bookings', value: rows.length, icon: ClipboardList, bgIcon: FileText, tone: 'green' },
    { label: 'Active', value: activeCount, icon: RefreshCw, bgIcon: RefreshCw, tone: 'blue' },
    { label: 'Ready for Delivery', value: readyForDelivery, icon: PackageCheck, bgIcon: Package, tone: 'orange' },
    { label: 'Completed', value: counts.Completed, icon: ClipboardCheck, bgIcon: ClipboardCheck, tone: 'purple' },
    { label: 'Cancelled', value: counts.Cancelled, icon: FileX, bgIcon: FileX, tone: 'red' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero — soft mint gradient banner with layered abstract waves + a
          decorative "BOOKINGS" clipboard/calendar/phone/wrench illustration
          on the far right, matching the same premium design system as the
          other redesigned Partner Dashboard pages. Title/subtitle/Refresh
          are the exact same content/handler this page always had. */}
      <div className="relative min-h-[200px] overflow-hidden rounded-3xl border border-[#E4ECE8] bg-gradient-to-br from-[#F3FBF7] via-white to-[#EAF5FF] p-6 shadow-[0_12px_32px_rgba(20,80,55,0.07),0_3px_10px_rgba(20,80,55,0.04)] sm:p-8">
        <span className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-[#86EFAC]/25 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-16 right-32 h-40 w-40 rounded-full bg-[#93C5FD]/20 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -left-10 top-10 h-36 w-36 rounded-full bg-[#BFE8FF]/15 blur-3xl" aria-hidden="true" />
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-[#DFF8EB]/55"
          viewBox="0 0 500 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,50 C120,110 280,0 500,60 L500,100 L0,100 Z" />
        </svg>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full text-[#BFE8FF]/35"
          viewBox="0 0 500 70"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,35 C150,65 320,10 500,40 L500,70 L0,70 Z" />
        </svg>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full text-white/70"
          viewBox="0 0 500 45"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,22 C170,45 300,5 500,25 L500,45 L0,45 Z" />
        </svg>

        <div className="relative flex flex-wrap items-start justify-between gap-4 md:pr-[280px]">
          <div className="min-w-0">
            <h1 className="text-[32px] font-extrabold tracking-tight text-[#10213D] sm:text-[38px]">Bookings</h1>
            <p className="mt-1.5 text-[15px] text-[#667085] sm:text-base">View and manage all repair and service bookings.</p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className={cx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E4ECE8] bg-white px-4 py-2.5 text-sm font-semibold text-[#10213D] shadow-sm transition hover:border-[#079447] hover:text-[#079447]',
              FOCUS_RING,
            )}
          >
            <RefreshCw className={cx('h-4 w-4 text-[#079447]', loading && 'animate-spin')} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-0 right-2 hidden h-[160px] w-[240px] md:block lg:right-4 lg:h-[190px] lg:w-[290px]">
          <BookingsIllustration />
        </div>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} /> : null}

      {loading ? (
        <SkeletonStatCards count={5} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => (
            <BookingsStatCard key={s.label} icon={s.icon} bgIcon={s.bgIcon} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
      )}

      <section className="overflow-hidden rounded-[22px] border border-[#E4ECE8] bg-gradient-to-b from-white to-[#FBFEFC]/96 shadow-[0_12px_30px_rgba(20,80,55,0.07),0_2px_8px_rgba(20,80,55,0.03)]">
        <div className="flex flex-col gap-3.5 border-b border-[#EEF3F0] px-5 py-5 sm:px-6">
          <FilterChips options={BOOKING_STATUS_FILTERS} value={filter} onChange={setFilter} counts={counts} />
          <SearchField value={query} onChange={setQuery} placeholder="Search by booking number, customer, phone, or device" />
        </div>

        {loading ? (
          <SkeletonRows rows={5} />
        ) : filtered.length === 0 ? (
          rows.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
              <Icon3D icon={ClipboardList} tone="green" size="lg" />
              <p className="mt-3 text-sm font-bold text-[#10213D]">No bookings yet</p>
              <p className="mt-1 text-sm text-[#667085]">Every repair or service booking your customers create will show up here.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
              <Icon3D icon={ClipboardList} tone="gray" size="lg" />
              <p className="mt-3 text-sm font-bold text-[#10213D]">No bookings match your filters</p>
              <p className="mt-1 text-sm text-[#667085]">Try a different status or search term.</p>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-3 p-3 sm:p-4">
            {filtered.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DeviceThumb({ url }) {
  const [broken, setBroken] = useState(false);
  if (url && !broken) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-[#EAECF0]">
        {/* eslint-disable-next-line @next/next/no-img-element -- device photos are arbitrary shop-catalog URLs, not app assets Next can optimize. */}
        <img
          src={url}
          alt=""
          onError={() => {
            // eslint-disable-next-line no-console -- deliberate: surfaces exactly which device image URL failed to load.
            console.error('[BookingCard] device image failed:', url);
            setBroken(true);
          }}
          className="h-full w-full rounded-2xl object-contain"
        />
      </span>
    );
  }
  return <Icon3D icon={Smartphone} tone="green" size="lg" />;
}

function ActionButton({ icon: Icon, label, href, onClick, disabled, title }) {
  const className = cx(
    'inline-flex h-8 items-center gap-1 rounded-xl border px-2.5 text-[0.71rem] font-bold transition',
    disabled
      ? 'cursor-not-allowed border-[#EAECF0] bg-[#F9FAFB] text-[#98A2B3]'
      : 'border-[#DDE5E1] bg-white text-[#10213D] hover:border-[#079447] hover:bg-[#F3FBF7] hover:text-[#079447] hover:shadow-[0_2px_8px_rgba(20,80,55,0.08)]',
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className} title={title}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled} aria-disabled={disabled} title={title} className={className}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

// Compact "Label   Value" row for the always-visible Customer/Mobile/
// Services block — a fixed label column width keeps all three rows aligned
// like the reference's table-ish layout, without needing an actual table.
function DetailRow({ label, children }) {
  return (
    <p className="flex items-start gap-2">
      <span className="w-[70px] shrink-0 text-xs font-semibold text-[#98A2B3]">{label}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#10213D]">{children}</span>
    </p>
  );
}

function BookingRow({ booking }) {
  const amount = bookingEstimatedAmount(booking);
  const services = Array.isArray(booking.services) ? booking.services : [];
  const deviceName = booking.deviceDisplayName || booking.modelName || 'Device not specified';
  const dateLabel = formatBookingDate(booking.createdAt ? String(booking.createdAt).slice(0, 10) : null);
  const timeLabel = formatBookingTime(booking.createdAt);
  // "Variant / storage / color" in one line — ramStorage IS the real
  // variant/storage field this backend stores (see bookings/[id]/page.js),
  // not a new/guessed field.
  const variantLine = [booking.ramStorage, booking.color].filter(Boolean).join(' · ');
  const servicesText = services.length
    ? services.map((s) => s.serviceName || s.serviceCode).filter(Boolean).join(', ')
    : booking.issueSummary || null;

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#DDEDE5] bg-white/96 shadow-[0_7px_20px_rgba(20,80,55,0.045)] transition duration-200 ease-out hover:shadow-[0_10px_26px_rgba(20,80,55,0.08)]">
      <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <span className="absolute inset-0 -m-1 rounded-full bg-[#86EFAC] opacity-40 blur-md" aria-hidden="true" />
          <DeviceThumb url={booking.deviceImageUrl} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[#EAF9EF] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-[#079447]">
              #{booking.bookingNumber || booking.id}
            </span>
            <span
              className={cx(
                'rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide',
                BOOKING_STATUS_BADGE[booking.statusLabel] || 'bg-[#F0FDF4] text-[#667085]',
              )}
            >
              {booking.statusLabel}
            </span>
          </div>
          <p className="mt-1.5 truncate text-sm font-bold text-[#10213D]">{deviceName}</p>
          {variantLine ? <p className="truncate text-xs text-[#667085]">{variantLine}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <span className="text-xs text-[#667085]">
            {dateLabel}
            {timeLabel ? ` · ${timeLabel}` : ''}
          </span>
          {amount != null ? <span className="text-sm font-bold text-[#10213D]">₹{Number(amount).toLocaleString('en-IN')}</span> : null}
        </div>
      </div>

      {/* Customer/Mobile/Services — always visible now (previously behind a
          click-to-expand toggle), matching the reference's card content. */}
      <div className="border-t border-dashed border-[#EAECF0] bg-[#F3FBF7] px-4 py-3.5 sm:px-5">
        <div className="space-y-1.5">
          <DetailRow label="Customer">{booking.customerName || 'Not available'}</DetailRow>
          <DetailRow label="Mobile">
            {booking.customerMobile ? (
              <a href={`tel:${booking.customerMobile}`} className="text-[#079447]">
                {booking.customerMobile}
              </a>
            ) : (
              <span className="text-[#98A2B3]">Not available</span>
            )}
          </DetailRow>
          {servicesText ? <DetailRow label="Services">{servicesText}</DetailRow> : null}
        </div>

        <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-dashed border-[#DDEDE5] pt-3.5">
          <ActionButton icon={Calculator} label="Re-Est" href="/shop-home/services/requote" />
          <ActionButton icon={UserCog} label="Assign" disabled title="Technician assignment isn't available in the shop portal yet" />
          <ActionButton icon={History} label="History" href={`/shop-home/services/bookings/${booking.id}`} />
          <ActionButton icon={Receipt} label="Receipt" href={`/shop-home/services/bookings/${booking.id}/receipt`} />
          <ActionButton icon={QrCode} label="Barcode" href={`/shop-home/services/bookings/${booking.id}/qr`} />
          <ActionButton icon={FileText} label="Details" href={`/shop-home/services/bookings/${booking.id}/details`} />
        </div>
      </div>
    </div>
  );
}
