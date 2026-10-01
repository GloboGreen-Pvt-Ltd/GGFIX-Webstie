'use client';

/**
 * /shop-home — the GGFIX Partner Dashboard home page.
 *
 * The auth guard and chrome (sidebar, top navbar) live in
 * src/app/shop-home/layout.js -> DashboardShell now, shared across every
 * /shop-home/* route — this file is just the Dashboard's own content.
 *
 * Every Overview count below is real data, fetched with the shop-owner's
 * own token (src/lib/shopApi.js) and aggregated in src/lib/shopDashboard.js
 * — see that file's header comment for exactly which endpoints back which
 * tile. The promo banner's copy is authored marketing content (not user
 * business data), and its two slides genuinely cycle via the prev/next
 * controls and dot indicators — it isn't backed by a CMS/banner API,
 * because no such endpoint exists for this shop-owner surface (the one
 * real `/marketplace/products` list is admin-only, unreachable from a shop
 * token). Marketplace / Sell a Device are, for the same reason, an honest
 * "coming soon" preview — real category icons/labels, but intentionally
 * non-interactive, rather than a fake working storefront.
 */

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Headphones,
  Inbox,
  Package,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Truck,
  User,
  Wrench,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import { BRAND } from '@/lib/siteContent';
import { masterApi } from '@/lib/api';
import { readShopOwner, subscribe } from '@/lib/shopAuth';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import { deriveDisplayName } from '@/components/shop-dashboard/ProfileDropdown';
import {
  fetchShopBookings,
  fetchTicketCounts,
  pendingPickups,
  sumActiveRepairs,
  sumReadyForDelivery,
  recentBookings,
} from '@/lib/shopDashboard';

function unwrapList(res) {
  const list = Array.isArray(res) ? res : res?.content ?? res?.data ?? [];
  return Array.isArray(list) ? list : [];
}

const DASH = '—';

// Same status buckets this page has always used (see friendlyBookingStatus
// in shopDashboard.js) — only the pill's own color/shape here, not what
// each status means.
const STATUS_BADGE = {
  Created: 'bg-[#DFF8EB] text-[#067A3D]',
  'In Progress': 'bg-[#E5F2FC] text-[#0875B7]',
  Pickup: 'bg-[#FEF3D6] text-[#B7791F]',
  Completed: 'bg-[#EAF9EF] text-[#15803D]',
  Cancelled: 'bg-[#FDE8EA] text-[#DC2626]',
};

const STATUS_DOT = {
  Created: 'bg-[#22C55E]',
  'In Progress': 'bg-[#0EA5E9]',
  Pickup: 'bg-[#F59E0B]',
  Completed: 'bg-[#15803D]',
  Cancelled: 'bg-[#EF4444]',
};

function initialsOf(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/* -------------------------------------------------------------------------- */
/* Promo banner — authored marketing copy (not business data), 2 real slides  */
/* with genuinely working prev/next + dot navigation.                        */
/* -------------------------------------------------------------------------- */

const PROMO_SLIDES = [
  {
    key: 'grow',
    artwork: '/buy.png',
    headline: [
      { text: 'REPAIR, ', color: '#101828' },
      { text: 'SELL, ', color: '#EA580C' },
      { text: 'BUY', color: '#0284C7' },
    ],
    subhead: 'All Your Tech Needs, Covered',
    trust: [
      { label: 'Trusted Service Center', icon: ShieldCheck },
      { label: 'Best Value For Your Device', icon: Award },
      { label: 'Expert Support Whenever You Need', icon: Headphones },
    ],
    panelTitle: 'Grow Your Business',
    panelText: 'Manage pickups, deliveries, customers and devices in one place.',
    ctaHref: '/shop-home/reports',
  },
  {
    key: 'sell',
    artwork: '/sell.png',
    headline: [
      { text: 'SELL. ', color: '#101828' },
      { text: 'TRADE. ', color: '#0D9488' },
      { text: 'UPGRADE.', color: '#7C3AED' },
    ],
    subhead: 'Get the best value for every device.',
    trust: [
      { label: 'Trusted Service Center', icon: ShieldCheck },
      { label: 'Best Value For Your Device', icon: Award },
      { label: 'Expert Support Whenever You Need', icon: Headphones },
    ],
    panelTitle: 'Boost Your Revenue',
    panelText: 'Turn trade-ins and upgrades into new business, tracked in real time.',
    ctaHref: '/shop-home/reports/sales-report',
  },
];

function PromoBanner() {
  const [index, setIndex] = useState(0);
  const slide = PROMO_SLIDES[index];
  const go = (delta) => setIndex((i) => (i + delta + PROMO_SLIDES.length) % PROMO_SLIDES.length);

  return (
    <section
      className="relative overflow-hidden rounded-[24px] border border-[#DCEFE4] shadow-[0_10px_28px_rgba(21,80,56,0.07)]"
      style={{ background: 'linear-gradient(120deg, #EAFBF3 0%, #F3FDF8 55%, #FFFFFF 100%)' }}
    >
      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.9fr_1fr] lg:items-center lg:gap-6">
        <div>
          <div className="flex items-center gap-2">
            <Image src={BRAND.logo} alt="" width={36} height={36} className="h-9 w-9 rounded-xl object-contain" />
            <span className="text-xs font-bold uppercase tracking-wide text-[#079447]">GGFIX Partner</span>
          </div>
          <h2 className="mt-3 text-[26px] font-extrabold leading-tight tracking-tight sm:text-[30px]">
            {slide.headline.map((part) => (
              <span key={part.text} style={{ color: part.color }}>
                {part.text}
              </span>
            ))}
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#5B7085]">{slide.subhead}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
            {slide.trust.map((t) => (
              <span key={t.label} className="flex max-w-[160px] items-center gap-2 text-xs font-semibold leading-tight text-[#344054]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF9EF] text-[#079447]">
                  <t.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {t.label}
              </span>
            ))}
          </div>
        </div>

        <div className="hidden items-center justify-center sm:flex">
          <Image src={slide.artwork} alt="" width={340} height={340} className="h-[190px] w-auto object-contain drop-shadow-[0_18px_28px_rgba(20,80,55,0.18)] lg:h-[220px]" />
        </div>

        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#0C8B55] to-[#0A5B3A] p-5 text-white sm:p-6">
          <span className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-md" aria-hidden="true" />
          <h3 className="relative text-lg font-extrabold">{slide.panelTitle}</h3>
          <p className="relative mt-1.5 text-sm text-white/85">{slide.panelText}</p>
          <Link
            href={slide.ctaHref}
            className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#0A5B3A] transition hover:bg-white/90"
          >
            Learn More
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-[#DCEFE4]/70 py-3">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DCEFE4] bg-white text-[#344054] transition hover:bg-[#F0FDF4]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-1.5">
          {PROMO_SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cx('h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-[#0C8B55]' : 'w-1.5 bg-[#D0D5DD]')}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DCEFE4] bg-white text-[#344054] transition hover:bg-[#F0FDF4]"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Overview cards                                                             */
/* -------------------------------------------------------------------------- */

const TONE_STYLES = {
  violet: { bg: 'bg-[#F3EEFE]', border: 'border-[#E4D9FC]', fg: 'text-[#7C3AED]' },
  red: { bg: 'bg-[#FDECEE]', border: 'border-[#F9D6DA]', fg: 'text-[#E11D48]' },
  teal: { bg: 'bg-[#E7FBF3]', border: 'border-[#CFF3E4]', fg: 'text-[#0D9488]' },
  orange: { bg: 'bg-[#FFF2E5]', border: 'border-[#FFE0BF]', fg: 'text-[#EA580C]' },
  blue: { bg: 'bg-[#EAF4FF]', border: 'border-[#D3E9FF]', fg: 'text-[#0284C7]' },
  indigo: { bg: 'bg-[#ECEEFF]', border: 'border-[#D9DDFF]', fg: 'text-[#4F46E5]' },
  green: { bg: 'bg-[#E9FBF0]', border: 'border-[#CFF3DC]', fg: 'text-[#15803D]' },
};

function OverviewCard({ icon: Icon, label, value, tone, href }) {
  const t = TONE_STYLES[tone] || TONE_STYLES.green;
  return (
    <Link
      href={href}
      className={cx(
        'group relative flex min-h-[128px] flex-col overflow-hidden rounded-2xl border p-3.5 shadow-[0_4px_14px_rgba(20,80,55,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(20,80,55,0.1)]',
        t.bg,
        t.border,
      )}
    >
      <Icon className={cx('pointer-events-none absolute -bottom-3 -right-3 h-20 w-20 opacity-[0.08]', t.fg)} aria-hidden="true" />
      <div className="relative flex items-center gap-2.5">
        <Icon3D icon={Icon} tone={tone} size="md" />
        <span className="text-2xl font-extrabold leading-none text-[#101828]">{value}</span>
      </div>
      <p className="relative mt-2.5 text-[13px] font-semibold leading-snug text-[#344054]">{label}</p>
      <span
        className={cx(
          'absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm transition group-hover:scale-105',
          t.fg,
        )}
      >
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Recent Bookings                                                            */
/* -------------------------------------------------------------------------- */

function RecentDeviceThumb({ url }) {
  const [broken, setBroken] = useState(false);
  if (url && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- device photos are arbitrary shop-catalog URLs, not app assets Next can optimize.
      <img
        src={url}
        alt=""
        onError={() => setBroken(true)}
        className="h-full w-full object-contain"
      />
    );
  }
  return (
    <span className="flex h-full w-full items-center justify-center text-[#98A2B3]">
      <Smartphone className="h-8 w-8" aria-hidden="true" />
    </span>
  );
}

function RecentBookingCard({ booking }) {
  const created = booking.createdAt ? new Date(booking.createdAt) : null;
  const deviceName = booking.deviceDisplayName || booking.modelName || 'Device not specified';

  return (
    <Link
      href={`/shop-home/services/bookings/${booking.id}/details`}
      className="group flex items-center gap-3 rounded-2xl border border-[#E3ECE8] bg-white p-3 shadow-[0_4px_14px_rgba(20,80,55,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(20,80,55,0.1)]"
    >
      <span className="flex h-[84px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#F7FAF8]">
        <RecentDeviceThumb url={booking.deviceImageUrl} />
      </span>
      <div className="min-w-0 flex-1">
        <span
          className={cx(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide',
            STATUS_BADGE[booking.statusLabel] || 'bg-[#F0FDF4] text-[#667085]',
          )}
        >
          <span className={cx('h-1.5 w-1.5 rounded-full', STATUS_DOT[booking.statusLabel] || 'bg-[#98A2B3]')} aria-hidden="true" />
          {booking.statusLabel}
        </span>
        <p className="mt-1.5 truncate text-sm font-bold text-[#101828]">{deviceName}</p>
        <p className="truncate text-xs font-semibold text-[#079447]">#{booking.bookingNumber || booking.id}</p>
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-[#667085]">
          <User className="h-3.5 w-3.5 shrink-0 text-[#98A2B3]" aria-hidden="true" />
          {booking.customerName || 'Customer'}
        </p>
        {created ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#98A2B3]">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {created.toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </p>
        ) : null}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#98A2B3] transition group-hover:text-[#15803D]" aria-hidden="true" />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Marketplace / Sell a Device — no real shop-facing backend for either       */
/* (the one real /marketplace/products list is admin-only, unreachable from  */
/* a shop-owner token), so these render as an honest, clearly-labeled        */
/* "coming soon" preview. The tile photos ARE real though: GET               */
/* /master/device-categories is a live, unauthenticated master-data endpoint */
/* (the same one Book Service's category picker uses) and returns exactly 5  */
/* real categories with real product photos — Mobile, Laptop, Tablet, Audio  */
/* Device, Smartwatch. There is no real "Gaming"/"Accessories" category in   */
/* the backend, so this deliberately doesn't invent those two just to match  */
/* the reference's 7-tile count.                                            */
/* -------------------------------------------------------------------------- */

const TILE_BG = ['#EAF4FF', '#F3EEFE', '#FFF3E7', '#E9FBF0', '#FDECEE'];

function CategoryTile({ label, imageUrl, bg }) {
  return (
    <div title="Coming soon" className="flex w-[100px] shrink-0 cursor-not-allowed flex-col items-center gap-2 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-sm" style={{ background: bg }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- real master-data category photo, arbitrary CDN URL.
          <img src={imageUrl} alt="" className="h-14 w-14 object-contain" />
        ) : (
          <Smartphone className="h-7 w-7 text-[#5B7085]" aria-hidden="true" />
        )}
      </span>
      <span className="text-[0.72rem] font-semibold leading-tight text-[#344054]">{label}</span>
    </div>
  );
}

function ComingSoonRow({ title, categories, loading }) {
  return (
    <section className="flex h-full flex-col rounded-[22px] border border-[#E3ECE8] bg-white/96 p-4 shadow-[0_10px_28px_rgba(21,80,56,0.06),0_2px_8px_rgba(21,80,56,0.03)] sm:p-5">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <span className="text-base font-bold text-[#10213D]">{title}</span>
        <span
          title="Not available yet"
          className="flex cursor-not-allowed items-center gap-1 rounded-xl bg-[#F2F4F3] px-3 py-1.5 text-xs font-bold text-[#98A2B3]"
        >
          See All
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
      {loading ? (
        <p className="py-4 text-center text-sm text-[#98A2B3]">Loading…</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c, i) => (
            <CategoryTile key={c.id} label={c.name} imageUrl={c.imageUrl} bg={TILE_BG[i % TILE_BG.length]} />
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-[#98A2B3]">Coming soon — not available yet.</p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const EMPTY_DATA = { bookings: [], counts: {} };

export default function ShopHomePage() {
  const [shopOwner, setShopOwner] = useState(null);
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    setShopOwner(readShopOwner());
    const unsub = subscribe((session) => setShopOwner(session));
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    masterApi
      .get('/master/device-categories')
      .then(unwrapList)
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [bookingsRes, countsRes] = await Promise.allSettled([fetchShopBookings(), fetchTicketCounts()]);
      if (cancelled) return;
      setData({
        bookings: bookingsRes.status === 'fulfilled' ? bookingsRes.value : [],
        counts: countsRes.status === 'fulfilled' ? countsRes.value : {},
      });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const name = shopOwner ? deriveDisplayName(shopOwner) : 'Partner';
  const todayLabel = useMemo(() => new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }), []);

  const { bookings, counts } = data;
  const pending = pendingPickups(bookings);
  const pickupRequests = pending.filter((b) => b.status === 'PICKUP_REQUESTED');
  const CONFIRMED_PICKUP_STATUSES = ['PICKUP_ACCEPTED', 'PICKUP_PERSON_ASSIGNED', 'PICKUP_ASSIGNED', 'PICKUP_REASSIGNED'];
  const pickupConfirmed = pending.filter((b) => CONFIRMED_PICKUP_STATUSES.includes(b.status));
  const deliveredCount = Number(counts.DELIVERED || 0);

  const overviewCards = [
    { key: 'pickup-queue', label: 'Pickup Queue', value: loading ? DASH : String(pending.length), icon: Truck, tone: 'violet', href: '/shop-home/services/pickups' },
    { key: 'pickup-requests', label: 'Pickup Requests', value: loading ? DASH : String(pickupRequests.length), icon: Inbox, tone: 'red', href: '/shop-home/services/pickups' },
    { key: 'pickup-confirmed', label: 'Pickup Confirmed', value: loading ? DASH : String(pickupConfirmed.length), icon: CheckCircle2, tone: 'teal', href: '/shop-home/services/pickups' },
    { key: 'delivery-requests', label: 'Delivery Requests', value: loading ? DASH : String(sumReadyForDelivery(counts)), icon: Package, tone: 'orange', href: '/shop-home/services/delivery' },
    { key: 'delivery-completed', label: 'Delivery Completed', value: loading ? DASH : String(deliveredCount), icon: PackageCheck, tone: 'blue', href: '/shop-home/services/delivery' },
    { key: 'active-jobs', label: 'Active Jobs', value: loading ? DASH : String(sumActiveRepairs(counts)), icon: Wrench, tone: 'indigo', href: '/shop-home/services/service-status' },
    { key: 'service-orders', label: 'Service Orders', value: loading ? DASH : String(bookings.length), icon: ClipboardList, tone: 'green', href: '/shop-home/services/bookings' },
  ];

  const recent = recentBookings(bookings);

  return (
    <div
      className="relative -m-4 rounded-none p-4 sm:-m-6 sm:p-6 lg:px-10 lg:py-8"
      style={{ background: 'linear-gradient(180deg, #F2FAF7 0%, #ECF8F3 45%, #F7FBFA 100%)' }}
    >
      <div className="relative z-10 mx-auto w-full max-w-[1760px] space-y-5">
        {/* ---- Greeting hero -------------------------------------------- */}
        <div className="flex items-center gap-3 px-1">
          {shopOwner?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- shop-owner profile photo is an arbitrary uploaded URL, not an app asset.
            <img src={shopOwner.avatarUrl} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover shadow-[0_4px_12px_rgba(20,80,55,0.15)]" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#22C55E] to-[#066B39] text-lg font-bold text-white shadow-[0_4px_12px_rgba(20,80,55,0.15)]">
              {initialsOf(name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#5B7085]">{getGreeting()},</p>
            <p className="truncate text-xl font-extrabold text-[#10223D] sm:text-[26px]">{name}</p>
            <p className="mt-0.5 text-sm text-[#5B7085]">Let&apos;s keep your business growing!</p>
          </div>
        </div>

        {/* ---- Promotional banner ----------------------------------------- */}
        <PromoBanner />

        {/* ---- Overview header --------------------------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <h2 className="text-lg font-bold text-[#10213D]">Overview</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/shop-home/reports"
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#0C8B55] to-[#086F45] px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(12,139,85,0.3)] transition hover:from-[#0A7A49] hover:to-[#065C39]"
            >
              Today&apos;s Summary
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5ECE8] bg-white px-3.5 py-1.5 text-xs font-bold text-[#344054]">
              <CalendarDays className="h-3.5 w-3.5 text-[#0B8A54]" aria-hidden="true" />
              {todayLabel}
            </span>
          </div>
        </div>

        {/* ---- 7 Overview cards ---------------------------------------------- */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {overviewCards.map((card) => (
            <OverviewCard key={card.key} icon={card.icon} label={card.label} value={card.value} tone={card.tone} href={card.href} />
          ))}
        </div>

        {/* ---- Recent Bookings --------------------------------------------- */}
        <section className="rounded-[22px] border border-[#E3ECE8] bg-white/96 p-4 shadow-[0_10px_28px_rgba(21,80,56,0.06),0_2px_8px_rgba(21,80,56,0.03)] sm:p-5">
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <span className="text-base font-bold text-[#10213D]">Recent Bookings</span>
            <Link
              href="/shop-home/services/bookings"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#EAF9EF] px-3 py-1.5 text-xs font-bold text-[#067A3D] transition hover:bg-[#DFF8EB] hover:shadow-[0_2px_10px_rgba(6,122,61,0.18)]"
            >
              See All
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <p className="py-6 text-center text-sm text-[#98A2B3]">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <ClipboardList className="h-10 w-10 text-[#D0D5DD]" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-[#10213D]">No recent bookings</p>
              <p className="mt-1 text-sm text-[#667085]">New customer service bookings will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((booking) => (
                <RecentBookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </section>

        {/* ---- Marketplace / Sell a Device ----------------------------------- */}
        <div className="grid gap-3 lg:grid-cols-2">
          <ComingSoonRow title="Marketplace" categories={categories} loading={categoriesLoading} />
          <ComingSoonRow title="Sell a Device" categories={categories} loading={categoriesLoading} />
        </div>
      </div>
    </div>
  );
}
