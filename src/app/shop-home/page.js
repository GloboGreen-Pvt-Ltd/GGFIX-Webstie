'use client';

/**
 * /shop-home — the GGFIX shop-owner home dashboard (web), matched to the mobile
 * shop app's Home screen. "Design first": every data block is a SAMPLE constant
 * so the real backend can be wired in later without touching layout:
 *   stats/summary   -> order-service dashboard counts + revenue
 *   latest bookings -> GET /repair-bookings/shop (shop token) + master-data images
 *   marketplace/sell-> master-data categories
 *
 * Section order mirrors the app: header · search · hero · stats · today's summary
 * · quick actions · latest bookings · marketplace · sell by category, over an
 * app-style bottom tab bar. It lives OUTSIDE the (site) group so it gets its own
 * app chrome, not the marketing SiteHeader/SiteFooter.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Bell,
  Box,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Grid2x2,
  Headphones,
  IndianRupee,
  Laptop,
  MessageSquare,
  Mic,
  Package,
  Plus,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Tag,
  Truck,
  Users,
} from 'lucide-react';

import { cx } from '@/components/site/ui';

/* -------------------------------------------------------------------------- */
/* Sample data (replace each block with a live fetch later)                    */
/* -------------------------------------------------------------------------- */

const SHOP = { name: 'Globo Green', initials: 'GG', verified: true, greeting: 'Good afternoon' };

const STATS = [
  { label: 'Bookings', sub: 'All time', value: '7', icon: ClipboardList, tone: 'green', trend: [0.3, 0.5, 0.4, 0.7, 0.6, 0.9] },
  { label: 'Active', sub: 'In pipeline', value: '8', icon: Clock, tone: 'blue', trend: [0.4, 0.35, 0.5, 0.45, 0.7, 0.8] },
  { label: 'Delivered', sub: 'Completed', value: '0', icon: Package, tone: 'orange', trend: [0.2, 0.3, 0.25, 0.4, 0.5, 0.6] },
  { label: 'Revenue', sub: 'This month', value: '₹12,450', icon: IndianRupee, tone: 'violet', trend: [0.3, 0.45, 0.4, 0.6, 0.75, 0.95] },
  { label: 'Pickup', sub: 'Scheduled', value: '3', icon: Truck, tone: 'teal', trend: [0.25, 0.4, 0.35, 0.55, 0.5, 0.7] },
];

const TODAY_SUMMARY = [
  { label: 'Total Bookings', value: '12', icon: Users, tone: 'green' },
  { label: 'New Customers', value: '8', icon: Users, tone: 'blue' },
  { label: "Today's Revenue", value: '₹5,760', icon: IndianRupee, tone: 'orange' },
  { label: 'Conversion Rate', value: '18%', icon: BarChart3, tone: 'violet' },
];

const QUICK_ACTIONS = [
  { label: 'New Booking', icon: PlusCircle },
  { label: 'Pickup', icon: Truck },
  { label: 'All Bookings', icon: ClipboardList },
  { label: 'Invoices', icon: FileText },
  { label: 'Customers', icon: Users },
  { label: 'Enquiry', icon: MessageSquare },
  { label: 'Inventory', icon: Box },
  { label: 'Reports', icon: BarChart3 },
];

const LATEST_BOOKINGS = [
  { id: 'CSPEN7627519', device: 'Vivo T1', customer: 'Nandhakumar S', when: 'Today, 10:30 AM', status: 'Created' },
  { id: 'CSPEN7626488', device: 'iPhone 13', customer: 'Karthik R', when: 'Today, 09:45 AM', status: 'In Progress' },
  { id: 'CSPEN7625310', device: 'Samsung S23', customer: 'Praveen K', when: 'Today, 09:15 AM', status: 'Pickup' },
  { id: 'CSPEN7624901', device: 'OnePlus Nord', customer: 'Vignesh V', when: 'Yesterday, 06:30 PM', status: 'Completed' },
];

const MARKETPLACE = [
  { label: 'Mobiles', icon: Smartphone },
  { label: 'Laptops', icon: Laptop },
  { label: 'Tablets', icon: Tablet },
  { label: 'Accessories', icon: Package },
  { label: 'Audio', icon: Headphones },
  { label: 'More', icon: Grid2x2 },
];

const SELL_CATEGORIES = [
  { label: 'Mobiles', icon: Smartphone },
  { label: 'Laptops', icon: Laptop },
  { label: 'Tablets', icon: Tablet },
  { label: 'Audio', icon: Headphones },
  { label: 'Accessories', icon: Package },
  { label: 'More', icon: Grid2x2 },
];

const TABS = [
  { label: 'Home', icon: Grid2x2, active: true },
  { label: 'Bookings', icon: FileText },
  { label: 'Buy', icon: ShoppingBag },
  { label: 'Sell', icon: Tag },
  { label: 'Settings', icon: Settings },
];

/* -------------------------------------------------------------------------- */
/* Tone maps                                                                   */
/* -------------------------------------------------------------------------- */

const TONE_CHIP = {
  green: 'bg-brand-soft text-brand-700',
  blue: 'bg-sky-100 text-sky-600',
  orange: 'bg-orange-100 text-orange-600',
  violet: 'bg-violet-100 text-violet-600',
  teal: 'bg-teal-100 text-teal-600',
};
const TONE_LINE = {
  green: '#16A34A',
  blue: '#0EA5E9',
  orange: '#F97316',
  violet: '#8B5CF6',
  teal: '#14B8A6',
};
const STATUS_BADGE = {
  Created: 'bg-brand-soft text-brand-700',
  New: 'bg-brand-soft text-brand-700',
  'In Progress': 'bg-sky-100 text-sky-700',
  Pickup: 'bg-orange-100 text-orange-700',
  Completed: 'bg-violet-100 text-violet-700',
};

/* -------------------------------------------------------------------------- */
/* Small pieces                                                                */
/* -------------------------------------------------------------------------- */

function Sparkline({ color, data }) {
  const w = 52;
  const h = 20;
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((p, i) => `${(i * step).toFixed(1)},${(h - p * h).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true">
      <polyline points={pts} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ stat }) {
  const Icon = stat.icon;
  return (
    <div className="h-full rounded-2xl border border-brand-line bg-white p-3.5 shadow-soft">
      <div className="flex items-start justify-between gap-1">
        <span className={cx('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONE_CHIP[stat.tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-xl font-extrabold leading-none tracking-tight text-brand-ink">{stat.value}</span>
      </div>
      <p className="mt-2.5 text-sm font-bold text-brand-ink">{stat.label}</p>
      <div className="mt-0.5 flex items-end justify-between gap-1">
        <p className="text-xs text-brand-muted">{stat.sub}</p>
        <Sparkline color={TONE_LINE[stat.tone]} data={stat.trend} />
      </div>
    </div>
  );
}

function QuickAction({ action }) {
  const Icon = action.icon;
  return (
    <button type="button" className="group flex flex-col items-center gap-2 text-center focus-visible:outline-none">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-line bg-white text-brand-600 shadow-soft transition group-hover:border-brand-300 group-hover:shadow-lift group-focus-visible:ring-2 group-focus-visible:ring-brand-700 group-focus-visible:ring-offset-2">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="text-[0.7rem] font-semibold leading-tight text-brand-ink">{action.label}</span>
    </button>
  );
}

function BookingCard({ booking }) {
  return (
    <article className="w-44 shrink-0 overflow-hidden rounded-2xl border border-brand-line bg-white shadow-soft">
      <div className="px-3 pt-3">
        <span className={cx('inline-block rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide', STATUS_BADGE[booking.status] || 'bg-brand-soften text-brand-muted')}>
          {booking.status}
        </span>
      </div>
      <div className="mx-3 mt-2 flex h-28 items-center justify-center rounded-xl bg-brand-50">
        <Smartphone className="h-12 w-12 text-brand-600/50" aria-hidden="true" />
      </div>
      <div className="p-3">
        <p className="text-xs font-bold text-brand-muted">#{booking.id}</p>
        <p className="mt-0.5 truncate text-sm font-bold text-brand-ink">{booking.device}</p>
        <p className="truncate text-xs text-brand-muted">{booking.customer}</p>
        <p className="mt-0.5 text-[0.68rem] text-brand-subtle">{booking.when}</p>
      </div>
    </article>
  );
}

function SectionHead({ title, subtitle, action }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-extrabold tracking-tight text-brand-ink">{title}</h2>
        {subtitle ? <p className="text-xs text-brand-muted">{subtitle}</p> : null}
      </div>
      {action ? (
        <button type="button" className="inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-brand-700">
          {action}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/** A category tile used by Marketplace + Sell by category. */
function CategoryTile({ item }) {
  const Icon = item.icon;
  return (
    <button type="button" className="flex flex-col items-center gap-1.5">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-line bg-white text-brand-ink shadow-soft">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="text-[0.68rem] font-medium text-brand-muted">{item.label}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function ShopHomePage() {
  const [query, setQuery] = useState('');

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 sm:px-6">
        {/* ---- Header ---------------------------------------------------- */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-extrabold text-white">
              {SHOP.initials}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-brand-muted">{SHOP.greeting},</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-extrabold leading-tight text-brand-ink">{SHOP.name}</p>
                {SHOP.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-brand-700">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    Verified
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <button type="button" aria-label="Notifications" className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-ink shadow-soft">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* ---- Search ---------------------------------------------------- */}
        <div className="mt-4 flex items-center gap-2 rounded-full border border-brand-line bg-white px-4 py-3 shadow-soft">
          <Search className="h-5 w-5 shrink-0 text-brand-subtle" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookings, customers, devices…"
            className="min-w-0 flex-1 bg-transparent text-sm text-brand-ink outline-none placeholder:text-brand-subtle"
          />
          <Mic className="h-5 w-5 shrink-0 text-brand-subtle" aria-hidden="true" />
        </div>

        {/* ---- Promo banner (real GGFIX hero art) ------------------------ */}
        <button
          type="button"
          aria-label="Grow your business with GGFIX — Repair, Buy, Sell"
          className="mt-4 block w-full overflow-hidden rounded-3xl shadow-soft transition hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://res.cloudinary.com/dg6c0g4gi/image/upload/f_auto,q_auto,w_1200/v1784700061/hero_z8j4sg.png"
            alt="Grow your business with GGFIX — one platform for Repair, Buy and Sell"
            className="block w-full"
            loading="eager"
            decoding="async"
          />
        </button>

        {/* ---- Stat cards (scroll on mobile, 5-up on desktop) ------------ */}
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
          {STATS.map((s) => (
            <div key={s.label} className="w-32 shrink-0 sm:w-auto">
              <StatCard stat={s} />
            </div>
          ))}
        </div>

        {/* ---- Today's Summary (moved before Quick Actions) -------------- */}
        <section className="mt-5 rounded-3xl border border-brand-line bg-white p-4 shadow-soft">
          <SectionHead title="Today's Summary" action="View report" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {TODAY_SUMMARY.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.label} className="flex items-center gap-2.5">
                  <span className={cx('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full', TONE_CHIP[t.tone])}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-brand-ink">{t.value}</p>
                    <p className="truncate text-[0.68rem] text-brand-muted">{t.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---- Quick Actions (grid-5, light-bordered icons) -------------- */}
        <section className="mt-5 rounded-3xl border border-brand-line bg-white p-4 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold tracking-tight text-brand-ink">Quick Actions</h2>
            <button type="button" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700">
              Customise
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-x-2 gap-y-4">
            {QUICK_ACTIONS.map((a) => (
              <QuickAction key={a.label} action={a} />
            ))}
          </div>
        </section>

        {/* ---- Latest Bookings (four) ------------------------------------ */}
        <section className="mt-6">
          <SectionHead title="Latest Bookings" action="View all" />
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {LATEST_BOOKINGS.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </section>

        {/* ---- Marketplace ----------------------------------------------- */}
        <section className="mt-6 rounded-3xl border border-brand-line bg-white p-4 shadow-soft">
          <SectionHead title="Marketplace" subtitle="Browse devices and accessories by category" action="View all" />
          <div className="grid grid-cols-6 gap-2">
            {MARKETPLACE.map((c) => (
              <CategoryTile key={c.label} item={c} />
            ))}
          </div>
        </section>

        {/* ---- Sell by category ------------------------------------------ */}
        <section className="mt-6 rounded-3xl border border-brand-line bg-white p-4 shadow-soft">
          <SectionHead title="Sell by category" subtitle="Create a listing for the device category you have" action="See all" />
          <div className="grid grid-cols-6 gap-2">
            {SELL_CATEGORIES.map((c) => (
              <CategoryTile key={c.label} item={c} />
            ))}
          </div>
        </section>
      </div>

      {/* ---- Floating New Booking ---------------------------------------- */}
      <button
        type="button"
        aria-label="New Booking"
        className="fixed bottom-24 right-4 z-40 inline-flex flex-col items-center justify-center rounded-full bg-brand-600 px-4 py-3 text-white shadow-lift transition hover:bg-brand-700"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
        <span className="text-[0.6rem] font-bold">New Booking</span>
      </button>

      {/* ---- Bottom tab bar ---------------------------------------------- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-line bg-white">
        <ul className="mx-auto flex max-w-3xl items-stretch justify-between px-4 py-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.label} className="flex-1">
                <Link
                  href="#"
                  className={cx(
                    'flex flex-col items-center gap-1 rounded-xl py-1 text-[0.68rem] font-semibold transition',
                    t.active ? 'text-brand-700' : 'text-brand-subtle hover:text-brand-ink',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {t.label}
                  {t.active ? <span className="mt-0.5 h-0.5 w-5 rounded-full bg-brand-600" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
