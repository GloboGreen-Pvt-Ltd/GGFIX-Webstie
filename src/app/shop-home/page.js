'use client';

/**
 * /shop-home — the GGFIX Partner Dashboard home page.
 *
 * The auth guard and chrome (header nav) live in src/app/shop-home/layout.js
 * -> DashboardShell, shared across every /shop-home/* route — this file is
 * just the Dashboard's own content:
 *
 *   Banner carousel (admin banners from /master/banners, auto-scrolling)
 *   Business Overview — 7 status cards
 *
 * Every number is real data, fetched with the shop-owner's own token
 * (src/lib/shopApi.js) — see shopDashboard.js for the endpoints.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowRight, ArrowUp, Bike, Box, CalendarDays, ChevronDown, ClipboardCheck, ClipboardList, Clock, ShoppingCart, Tag, Truck, Wrench } from 'lucide-react';

import { cx } from '@/components/site/ui';
import HeroCarousel from '@/components/site/HeroCarousel';
import { BUY_HREF, awaitingQuote, formatRupees, loadBuyFeed, priceOf, rememberBuyItem, sellerLabel } from '@/lib/buyFlow';
import { loadCatalog, resolveMediaUrl } from '@/lib/deviceImage';
import { sellBrandHref } from '@/lib/sellFlow';
import { bookingsHref, buildOrderRows, countByStage, countPickups, pickupsHref } from '@/lib/orderStages';
import { fetchShopBookings, fetchTicketsPaged, isToday, isYesterday } from '@/lib/shopDashboard';

/* -------------------------------------------------------------------------- */
/* Shared bits                                                                 */
/* -------------------------------------------------------------------------- */

const DASH = '—';

/** "12%" up/down badge from today-vs-yesterday counts, or null when there's nothing to compare. */
function dayOverDay(today, yesterday) {
  if (!yesterday) return null;
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  return { up: pct >= 0, text: `${Math.abs(pct)}%` };
}

function formatDate(iso) {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

/* -------------------------------------------------------------------------- */
/* Repair / Buy / Sell                                                         */
/* -------------------------------------------------------------------------- */

// Each card opens an existing flow: Repair -> Book Service (its first step is
// Customer Details), Buy -> Marketplace, Sell -> the Sell flow's first step.
// Photos are transparent cut-outs: public/images/card-repair.png, card-buy.png, card-sell.png.
const QUICK_ACTIONS = [
  {
    key: 'repair',
    title: 'Repair',
    subtitle: 'Fix Your Device',
    href: '/shop-home/services/book-service/',
    icon: Wrench,
    image: '/images/card-repair.png',
    card: 'bg-[#ECFDF3] border-[#D1FADF]',
    chip: 'bg-[#0BA65A] text-white',
    arrow: 'text-[#0B7A43]',
  },
  {
    key: 'buy',
    title: 'Buy',
    subtitle: 'New & Used',
    href: '/shop-home/services/marketplace/',
    icon: ShoppingCart,
    image: '/images/card-buy.png',
    card: 'bg-[#EFF8FF] border-[#D1E9FF]',
    chip: 'bg-[#2E90FA] text-white',
    arrow: 'text-[#1570EF]',
  },
  {
    key: 'sell',
    title: 'Sell',
    subtitle: 'Get Best Price',
    href: sellBrandHref(),
    icon: Tag,
    image: '/images/card-sell.png',
    card: 'bg-[#FFF6ED] border-[#FEDFB8]',
    chip: 'bg-[#F79009] text-white',
    arrow: 'text-[#DC6803]',
  },
];

/* -------------------------------------------------------------------------- */
/* Buying                                                                      */
/* -------------------------------------------------------------------------- */

// Buying shows the first listings of the Marketplace's buy feed
// (lib/buyFlow.js loadBuyFeed — nearby peer listings, then catalogue
// products).
// An item is { key, title, subtitle?, price?, image, href? | onClick? };
// with no items (or while loading) the section shows grey placeholder slots.
const PLACEHOLDER_SLOTS = 5;

function ShowcaseSection({ title, subtitle, items = [], viewAllHref, emptyText }) {
  const slots = items.length ? items : Array.from({ length: PLACEHOLDER_SLOTS }, (_, i) => ({ key: `slot-${i}` }));
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-extrabold tracking-tight text-[#111111]">{title}</h2>
          <p className="text-[13.5px] text-[#666666]">{subtitle}</p>
        </div>
        {viewAllHref ? (
          <Link href={viewAllHref} className="inline-flex shrink-0 items-center gap-1 text-[13.5px] font-bold text-[#079455] hover:underline">
            View all
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {emptyText ? (
        <p className="rounded-[16px] border border-[#ECECEC] bg-white px-4 py-8 text-center text-[13.5px] text-[#666666]">{emptyText}</p>
      ) : (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {slots.map((item) => {
          const card = (
            <div className="flex h-full flex-col overflow-hidden rounded-[16px] border border-[#ECECEC] bg-[#F8F8F8] transition hover:-translate-y-0.5">
              <div className="flex aspect-[4/3] items-center justify-center bg-[#F3F3F3]">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote listing/catalogue photo.
                  <img src={item.image} alt="" loading="lazy" className="h-full w-full object-contain p-3" />
                ) : item.title ? (
                  <ShoppingCart className="h-9 w-9 text-[#079455]/40" aria-hidden="true" />
                ) : (
                  <span className="flex h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] items-center justify-center rounded-xl border-2 border-dashed border-[#ECECEC] text-[12.5px] font-semibold text-[#98A2B3]">
                    Image
                  </span>
                )}
              </div>
              <div className="px-3.5 py-3">
                {item.title ? (
                  <>
                    <p className="truncate text-[14.5px] font-bold text-[#111111]">{item.title}</p>
                    {item.subtitle ? <p className="truncate text-[12.5px] text-[#666666]">{item.subtitle}</p> : null}
                    {item.price ? <p className={cx('mt-1 text-[15px] font-extrabold', item.priceTone || 'text-[#067647]')}>{item.price}</p> : null}
                  </>
                ) : (
                  <>
                    <span className="block h-3 w-2/3 rounded bg-[#F3F3F3]" />
                    <span className="mt-2 block h-2.5 w-1/2 rounded bg-[#F3F3F3]" />
                  </>
                )}
              </div>
            </div>
          );
          if (item.href) {
            return (
              <Link key={item.key} href={item.href}>
                {card}
              </Link>
            );
          }
          if (item.onClick) {
            return (
              <button key={item.key} type="button" onClick={item.onClick} aria-label={`View details of ${item.title}`} className="text-left">
                {card}
              </button>
            );
          }
          return <div key={item.key}>{card}</div>;
        })}
      </div>
      )}
    </section>
  );
}

function QuickActionCards() {
  return (
    <section aria-label="Quick actions" className="grid grid-cols-3 gap-2.5 sm:gap-4">
      {QUICK_ACTIONS.map(({ key, title, subtitle, href, icon: Icon, image, card, chip, arrow }) => (
        <Link
          key={key}
          href={href}
          className={cx(
            'group relative flex h-[170px] flex-col overflow-hidden rounded-[16px] border p-3 transition hover:-translate-y-0.5 sm:h-[170px] sm:rounded-[18px] sm:p-4 lg:h-[180px]',
            card,
          )}
        >
          {/* Transparent cut-out photo (public/images/card-*.png), whole and uncropped, bottom-right. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- static public photo. */}
          <img
            src={image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="pointer-events-none absolute bottom-0 right-2 h-[46%] w-[62%] origin-bottom object-contain object-right-bottom drop-shadow-[0_8px_14px_rgba(16,24,40,0.18)] transition group-hover:scale-[1.04] sm:right-3 sm:h-[64%] sm:w-[52%]"
          />
          <div className="relative flex items-start justify-between">
            <span className={cx('flex h-9 w-9 items-center justify-center rounded-xl sm:h-11 sm:w-11', chip)}>
              <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden="true" />
            </span>
            <span className={cx('flex h-7 w-7 items-center justify-center rounded-full bg-white transition group-hover:translate-x-0.5 sm:h-8 sm:w-8', arrow)}>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </span>
          </div>
          <div className="relative mt-2 sm:mt-3">
            <p className="text-[15px] font-extrabold leading-tight text-[#0B2E22] sm:text-[18px]">{title}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-[#5B6B63] sm:text-[13px]">{subtitle}</p>
          </div>
        </Link>
      ))}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Business Overview                                                           */
/* -------------------------------------------------------------------------- */

const KPI_TONES = {
  mint: { card: 'bg-[#F8F8F8] border-[#ECECEC]', icon: 'bg-gradient-to-br from-[#12B76A] to-[#079455]', arrow: 'text-[#079455]' },
  blue: { card: 'bg-[#F8F8F8] border-[#ECECEC]', icon: 'bg-gradient-to-br from-[#2E90FA] to-[#1570EF]', arrow: 'text-[#1570EF]' },
  violet: { card: 'bg-[#F8F8F8] border-[#ECECEC]', icon: 'bg-gradient-to-br from-[#9E77ED] to-[#7F56D9]', arrow: 'text-[#7F56D9]' },
  red: { card: 'bg-[#FFF0F2] border-[#FBDDE2]', icon: 'bg-gradient-to-br from-[#F63D68] to-[#E31B54]', arrow: 'text-[#E31B54]' },
  orange: { card: 'bg-[#F8F8F8] border-[#ECECEC]', icon: 'bg-gradient-to-br from-[#FDB022] to-[#F79009]', arrow: 'text-[#F79009]' },
};

function KpiCard({ icon: Icon, label, value, trend, trendTitle, tone, href }) {
  const t = KPI_TONES[tone] || KPI_TONES.mint;
  return (
    <Link
      href={href}
      className={cx(
        'group relative flex h-[138px] flex-col rounded-[14px] border p-4 transition hover:-translate-y-0.5',
        t.card,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white', t.icon)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {trend ? (
          <span
            title={trendTitle}
            className={cx(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11.5px] font-bold',
              trend.up ? 'bg-[#F3F3F3] text-[#067647]' : 'bg-[#FFE4E8] text-[#C01048]',
            )}
          >
            {trend.up ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />}
            {trend.text}
          </span>
        ) : null}
      </div>
      <div className="mt-auto flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[28px] font-extrabold leading-none tracking-tight text-[#111111]">{value}</p>
          <p className="mt-1.5 truncate text-[14px] font-semibold text-[#344054]">{label}</p>
        </div>
        <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white transition group-hover:translate-x-0.5', t.arrow)}>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const EMPTY_DATA = { bookings: [], tickets: [] };

export default function ShopHomePage() {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  // Set after mount: the page is prerendered, so "today" must come from the
  // viewer's clock, not the build machine's.
  const [todayLabel, setTodayLabel] = useState('');

  useEffect(() => {
    setTodayLabel(`Today, ${formatDate(new Date().toISOString())}`);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [bookingsRes, ticketsRes] = await Promise.allSettled([fetchShopBookings(), fetchTicketsPaged()]);
      if (cancelled) return;
      setData({
        bookings: bookingsRes.status === 'fulfilled' ? bookingsRes.value : [],
        tickets: ticketsRes.status === 'fulfilled' ? ticketsRes.value : [],
      });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Buying: the first few rows of the Marketplace feed, given brand/model
  // names and a photo from the catalogue exactly as the Marketplace page does,
  // so the details page it hands off to has the same fields.
  // null = still loading.
  const router = useRouter();
  const [buyRows, setBuyRows] = useState(null);

  useEffect(() => {
    let alive = true;
    loadBuyFeed()
      .then(async (feed) => {
        const top = feed.items.slice(0, PLACEHOLDER_SLOTS);
        const cat = await loadCatalog(top.map((it) => it.brandId).filter(Boolean)).catch(() => null);
        if (!alive) return;
        setBuyRows(
          top.map((it) => {
            const model = it.modelId ? cat?.modelsById.get(String(it.modelId)) : null;
            const brandId = it.brandId || model?.brandId || null;
            const brand = brandId ? cat?.brands.get(String(brandId)) : null;
            return {
              ...it,
              brandId,
              brandName: brand?.name || null,
              modelName: model?.name || null,
              image: it.productImage || resolveMediaUrl(model?.imageUrl) || null,
            };
          }),
        );
      })
      .catch(() => alive && setBuyRows([]));
    return () => {
      alive = false;
    };
  }, []);

  const buyItems = (buyRows || []).map((it) => ({
    key: it._key,
    title: it.productName || 'Untitled',
    subtitle: [it.brandName, sellerLabel(it), it.distanceKm != null ? `${it.distanceKm} km` : null].filter(Boolean).join(' · '),
    price: awaitingQuote(it) ? 'Awaiting quote' : priceOf(it) > 0 ? formatRupees(priceOf(it)) : null,
    priceTone: awaitingQuote(it) ? 'text-[#B54708]' : undefined,
    image: it.image,
    onClick: () => {
      rememberBuyItem(it);
      router.push(BUY_HREF.details);
    },
  }));

  const { bookings, tickets } = data;

  // Every card counts with lib/orderStages.js over the same bookings+tickets
  // join the Bookings/Pickups pages use, and links to the matching tab — so
  // the number on a card is exactly the number of rows it opens.
  const orderRows = buildOrderRows(bookings, tickets);
  const stageCounts = countByStage(orderRows);
  const pickupCounts = countPickups(orderRows);
  const pickupRows = orderRows.filter((r) => r.isPickup);
  const deliveredRows = orderRows.filter((r) => r.stage === 'delivered');

  // Day-over-day badges only where the rows carry the date that makes the
  // comparison real; stage-only counts have no history, so they show no
  // badge rather than an invented one.
  const ordersTrend = dayOverDay(orderRows.filter((b) => isToday(b.createdAt)).length, orderRows.filter((b) => isYesterday(b.createdAt)).length);
  const requestsTrend = dayOverDay(pickupRows.filter((b) => isToday(b.createdAt)).length, pickupRows.filter((b) => isYesterday(b.createdAt)).length);
  const deliveredTrend = dayOverDay(deliveredRows.filter((b) => isToday(b.updatedAt)).length, deliveredRows.filter((b) => isYesterday(b.updatedAt)).length);

  const v = (n) => (loading ? DASH : String(n));
  const kpis = [
    { key: 'orders', label: 'Service Orders', value: v(stageCounts.all), icon: ClipboardList, tone: 'mint', href: bookingsHref('all'), trend: ordersTrend, trendTitle: 'Bookings created today vs yesterday' },
    { key: 'active', label: 'Active Jobs', value: v(stageCounts.active), icon: Clock, tone: 'blue', href: bookingsHref('active') },
    { key: 'queue', label: 'Pickup Queue', value: v(pickupCounts.all), icon: Truck, tone: 'violet', href: pickupsHref('all') },
    { key: 'requests', label: 'Pickup Requests', value: v(pickupCounts.requested), icon: Box, tone: 'red', href: pickupsHref('requested'), trend: requestsTrend, trendTitle: 'Pickup bookings created today vs yesterday' },
    { key: 'confirmed', label: 'Pickup Confirmed', value: v(pickupCounts.accepted), icon: ClipboardCheck, tone: 'mint', href: pickupsHref('accepted') },
    { key: 'delivery-requests', label: 'Delivery Requests', value: v(stageCounts.ready), icon: Bike, tone: 'orange', href: bookingsHref('ready') },
    { key: 'delivered', label: 'Delivery Completed', value: v(stageCounts.delivered), icon: Truck, tone: 'blue', href: bookingsHref('delivered'), trend: deliveredTrend, trendTitle: 'Bookings delivered today vs yesterday' },
  ];

  return (
    <div className="-m-4 space-y-4 bg-[#F8F8F8] p-4 sm:-m-6 sm:p-6">
      {/* Admin-managed banners (GET /master/banners), auto-scrolling — the same HeroCarousel as the public home page. */}
      <HeroCarousel height="short" className="mx-auto w-full max-w-[1100px]" />

      <QuickActionCards />

      {/* ---- Business Overview ------------------------------------------- */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-extrabold tracking-tight text-[#111111]">Business Overview</h2>
            <p className="text-[13.5px] text-[#666666]">Real-time snapshot of your operations.</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              title="Figures shown are for today"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ECECEC] bg-white px-3.5 text-[13.5px] font-semibold text-[#111111]"
            >
              <CalendarDays className="h-4 w-4 text-[#475467]" aria-hidden="true" />
              {todayLabel || 'Today'}
              <ChevronDown className="h-4 w-4 text-[#98A2B3]" aria-hidden="true" />
            </span>
            <Link
              href="/shop-home/reports"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F3BF23] px-4 text-[13.5px] font-bold text-[#1E1E1E] transition hover:bg-[#E5B11A]"
            >
              View Reports
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 min-[1600px]:grid-cols-7">
          {kpis.map((k) => (
            <KpiCard key={k.key} {...k} />
          ))}
        </div>
      </section>

      {/* ---- Buying (Marketplace feed) ----------------------------------- */}
      <ShowcaseSection
        title="Buying"
        subtitle="Devices and products to buy."
        items={buyItems}
        viewAllHref={BUY_HREF.list}
        emptyText={buyRows && !buyRows.length ? 'No listings to buy near you yet.' : undefined}
      />
    </div>
  );
}
