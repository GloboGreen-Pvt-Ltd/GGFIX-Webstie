'use client';

/**
 * /shop-home — the GGFIX Partner Dashboard home page.
 *
 * The auth guard and chrome (sidebar, top navbar) live in
 * src/app/shop-home/layout.js -> DashboardShell now, shared across every
 * /shop-home/* route — this file is just the Dashboard's own content.
 *
 * Every KPI/list below is real data, fetched with the shop-owner's own
 * token (src/lib/shopApi.js) and aggregated in src/lib/shopDashboard.js —
 * see that file's header comment for exactly which endpoints back which
 * tile, and where the numbers are a client-side aggregate because no
 * single backend endpoint exists yet for it.
 *
 * "Today's Tasks" has no backing concept anywhere in the schema (bookings,
 * tickets, technicians, chat) — it stays an honest empty state rather than
 * inventing a task list.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  IndianRupee,
  ListChecks,
  MessageSquare,
  Package,
  PlusCircle,
  Smartphone,
  TrendingUp,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import { readShopOwner, subscribe } from '@/lib/shopAuth';
import CardShell from '@/components/shop-dashboard/CardShell';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import { deriveDisplayName } from '@/components/shop-dashboard/ProfileDropdown';
import { PARTNER_NAV } from '@/lib/partnerNav';
import {
  fetchShopBookings,
  fetchTicketCounts,
  fetchShopChats,
  fetchTechnicians,
  fetchTicketsPaged,
  pendingPickups,
  openEnquiries,
  sumActiveRepairs,
  sumReadyForDelivery,
  completionRate,
  weeklyBookings,
  nextPickup,
  recentBookings,
  teamActivity,
  todaysRevenue,
  yesterdaysRevenue,
  trendFromYesterday,
  isToday,
} from '@/lib/shopDashboard';

/**
 * KPI card styles for this page only — a page-local component, not a
 * change to the shared StatCard (used by ~10 other pages, unaffected). Per
 * a later revision of the same reference: only "Today's Bookings" (green)
 * is a full solid/gradient-filled card; the other five are light pastel
 * cards with a colorful Icon3D badge + a soft blurred "wave" shape in the
 * corner — matching the target's mix of one deep-green featured tile and
 * five airy tinted ones, not six equally-saturated solid tiles.
 */
const KPI_STYLES = {
  green: {
    card: 'bg-gradient-to-br from-[#22C55E] to-[#14532D]',
    value: 'text-white',
    label: 'text-white/85',
    trend: 'text-white/90',
    arrow: 'bg-white/15 text-white group-hover:bg-white/25',
    wave: 'bg-white/10',
  },
  orange: {
    card: 'bg-gradient-to-br from-[#FFF7ED] to-[#FDE7CB]',
    value: 'text-[#101828]',
    label: 'text-[#9A5B27]',
    trend: 'text-[#C2410C]',
    arrow: 'bg-white/80 text-[#EA580C] shadow-sm group-hover:bg-white',
    wave: 'bg-[#FDBA74]/40',
  },
  blue: {
    card: 'bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]',
    value: 'text-[#101828]',
    label: 'text-[#3B6798]',
    trend: 'text-[#0369A1]',
    arrow: 'bg-white/80 text-[#0284C7] shadow-sm group-hover:bg-white',
    wave: 'bg-[#93C5FD]/40',
  },
  violet: {
    card: 'bg-gradient-to-br from-[#F5F3FF] to-[#E8E1FC]',
    value: 'text-[#101828]',
    label: 'text-[#6D5A9E]',
    trend: 'text-[#6D28D9]',
    arrow: 'bg-white/80 text-[#7C3AED] shadow-sm group-hover:bg-white',
    wave: 'bg-[#C4B5FD]/40',
  },
  mint: {
    card: 'bg-gradient-to-br from-[#ECFDF5] to-[#D2F5E3]',
    value: 'text-[#101828]',
    label: 'text-[#3D7A5E]',
    trend: 'text-[#047857]',
    arrow: 'bg-white/80 text-[#059669] shadow-sm group-hover:bg-white',
    wave: 'bg-[#6EE7B7]/40',
  },
  pink: {
    card: 'bg-gradient-to-br from-[#FFF1F2] to-[#FCE1E4]',
    value: 'text-[#101828]',
    label: 'text-[#9F5361]',
    trend: 'text-[#BE123C]',
    arrow: 'bg-white/80 text-[#E11D48] shadow-sm group-hover:bg-white',
    wave: 'bg-[#FDA4AF]/40',
  },
};

// Icon3D tone per KPI tone — 'pink' maps to Icon3D's 'red' tone (same
// FB7185→E11D48 gradient Icon3D already defines under that name).
const ICON3D_TONE = { orange: 'orange', blue: 'blue', violet: 'violet', mint: 'mint', pink: 'red' };

function DashboardKpiCard({ icon: Icon, label, value, trend, tone, href }) {
  const s = KPI_STYLES[tone] || KPI_STYLES.mint;
  const isGreen = tone === 'green';
  const body = (
    <div
      className={cx(
        'group relative flex h-full min-h-[160px] flex-col overflow-hidden rounded-[20px] p-4 shadow-[0_8px_24px_rgba(24,73,57,0.08)] transition',
        s.card,
        href && 'hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(20,80,55,0.12)]',
      )}
    >
      {/* Decorative wave/blob pair, lower-right — the "abstract wave shape"
          every card in the reference has, not just the featured one. */}
      <span className={cx('pointer-events-none absolute -bottom-9 -right-8 h-28 w-28 rounded-full blur-md', s.wave)} aria-hidden="true" />
      <span className={cx('pointer-events-none absolute -bottom-3 right-9 h-16 w-16 rounded-full blur-sm', s.wave)} aria-hidden="true" />

      <div className="relative flex items-start justify-between gap-2">
        {isGreen ? (
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-white/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_rgba(0,0,0,0.12)]">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
        ) : (
          <Icon3D icon={Icon} tone={ICON3D_TONE[tone] || 'mint'} size="lg" />
        )}
        {href ? (
          <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition', s.arrow)}>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className={cx('relative mt-3 text-[28px] font-extrabold leading-none tracking-tight sm:text-[30px]', s.value)}>{value}</p>
      <p className={cx('relative mt-1.5 text-sm font-semibold', s.label)}>{label}</p>
      {trend ? (
        <p className={cx('relative mt-2 flex items-center gap-1 text-xs font-bold', s.trend)}>
          <TrendingUp className="h-3 w-3 shrink-0" aria-hidden="true" />
          {trend}
        </p>
      ) : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

// Same status buckets this page has always used (see friendlyBookingStatus
// in shopDashboard.js) — only the pill's own color/shape changed here to
// match the reference's pastel badge treatment, not what each status means.
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

const TEAM_STATUS_BADGE = {
  'In Progress': 'bg-[#E8F3FF] text-[#0E7BCF]',
  Pending: 'bg-[#FEF3D6] text-[#B7791F]',
};

const DASH = '—';

/* -------------------------------------------------------------------------- */
/* Quick Nav widget — Services / Employee / Reports pill switcher, per a      */
/* reference design's Dashboard/Home screen. Real PARTNER_NAV data only:      */
/* Reports' tab is curated to these 3 specific real items to match that       */
/* reference exactly; Services/Employee have no reference shot for this       */
/* widget specifically, so they default to each section's first 3 real       */
/* items rather than an invented subset. "See all" links to the fuller       */
/* destination for that section (Reports' own landing page at                */
/* /shop-home/reports; Services/Employee have no landing page yet, so those   */
/* point at their first real leaf item, same convention reports/page.js's     */
/* own pill switcher already uses).                                          */
/* -------------------------------------------------------------------------- */

const QUICK_NAV_SERVICES = PARTNER_NAV.find((s) => s.key === 'services');
const QUICK_NAV_EMPLOYEE = PARTNER_NAV.find((s) => s.key === 'employee');
const QUICK_NAV_REPORTS = PARTNER_NAV.find((s) => s.key === 'reports');
const QUICK_NAV_REPORTS_KEYS = ['revenue', 'reports-service-report', 'cash-book'];
// The reference design for this widget's Reports cards uses shorter titles
// than partnerNav.js's own labels for two of these three ("Revenue Report"
// -> "Revenue", "Service Report" -> "Service Status") — overridden ONLY
// here, for this dashboard widget's cards; the canonical labels (used in
// HeaderNav's dropdown, the mobile drawer, and /shop-home/reports itself)
// are untouched.
const QUICK_NAV_REPORTS_LABELS = { revenue: 'Revenue', 'reports-service-report': 'Service Status' };

const QUICK_NAV_TABS = [
  {
    key: 'services',
    label: 'Services',
    icon: QUICK_NAV_SERVICES.icon,
    items: QUICK_NAV_SERVICES.items.slice(0, 3),
    seeAllHref: `/shop-home/${QUICK_NAV_SERVICES.items[0].slug}`,
  },
  {
    key: 'employee',
    label: 'Employee',
    icon: QUICK_NAV_EMPLOYEE.icon,
    items: QUICK_NAV_EMPLOYEE.items.slice(0, 3),
    seeAllHref: `/shop-home/${QUICK_NAV_EMPLOYEE.items[0].slug}`,
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: QUICK_NAV_REPORTS.icon,
    items: QUICK_NAV_REPORTS_KEYS.map((k) => {
      const item = QUICK_NAV_REPORTS.items.find((i) => i.key === k);
      if (!item) return null;
      return QUICK_NAV_REPORTS_LABELS[k] ? { ...item, label: QUICK_NAV_REPORTS_LABELS[k] } : item;
    }).filter(Boolean),
    seeAllHref: '/shop-home/reports',
  },
];

// Cycled across a tab's 3 tiles for visual variety, matching the reference
// design's mint/blue/aqua tinted tile backgrounds — no meaning attached to
// position (Reports' own Revenue/Service Status/Cash Book happen to land on
// mint/blue/teal respectively, matching the reference 1:1, but the same
// cycle applies to Services/Employee's 3 items too).
const QUICK_NAV_TILE_STYLES = [
  { bg: 'bg-gradient-to-br from-[#ECFDF5] to-[#D2F5E3]', iconTone: 'mint', arrow: 'bg-white/80 text-[#059669] group-hover:bg-white' },
  { bg: 'bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]', iconTone: 'blue', arrow: 'bg-white/80 text-[#0284C7] group-hover:bg-white' },
  { bg: 'bg-gradient-to-br from-[#ECFEFF] to-[#CFFAFE]', iconTone: 'teal', arrow: 'bg-white/80 text-[#0D9488] group-hover:bg-white' },
];

function QuickNavWidget() {
  const [activeKey, setActiveKey] = useState('reports');
  const tab = QUICK_NAV_TABS.find((t) => t.key === activeKey) || QUICK_NAV_TABS[0];

  return (
    <section className="rounded-[20px] border border-[#E5ECE8] bg-white p-4 shadow-[0_8px_24px_rgba(24,73,57,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-full bg-[#F0F4F2] p-1">
          {QUICK_NAV_TABS.map((t) => {
            const Icon = t.icon;
            const active = t.key === activeKey;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveKey(t.key)}
                className={cx(
                  'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold transition',
                  active
                    ? 'bg-gradient-to-r from-[#0C8B55] to-[#086F45] text-white shadow-[0_4px_12px_rgba(12,139,85,0.3)]'
                    : 'text-[#344054] hover:bg-white',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </div>
        <Link href={tab.seeAllHref} className="flex items-center gap-1 text-xs font-bold text-[#0C8B55] hover:underline">
          See all
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tab.items.map((item, i) => {
          const Icon = item.icon;
          const style = QUICK_NAV_TILE_STYLES[i % QUICK_NAV_TILE_STYLES.length];
          return (
            <Link
              key={item.key}
              href={`/shop-home/${item.slug}`}
              title={item.description}
              className={cx(
                'group flex min-h-[76px] items-center gap-3 rounded-2xl border border-[#E5ECE8] p-3 shadow-[0_6px_18px_rgba(20,80,55,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(20,80,55,0.1)]',
                style.bg,
              )}
            >
              <Icon3D icon={Icon} tone={style.iconTone} size="lg" />
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#101828]">{item.label}</span>
              <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm transition', style.arrow)}>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function formatCurrency(amount) {
  return `₹${Math.round(amount || 0).toLocaleString('en-IN')}`;
}

function initialsOf(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Sub-sections                                                                */
/* -------------------------------------------------------------------------- */

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function CardTitle({ icon: Icon, tone, children }) {
  return (
    <span className="flex items-center gap-2">
      <Icon3D icon={Icon} tone={tone} size="sm" />
      {children}
    </span>
  );
}

function WeeklyBookingsChart({ data, loading }) {
  return (
    <CardShell
      title={<CardTitle icon={BarChart3} tone="green">Weekly Bookings</CardTitle>}
      action={<span className="rounded-full border border-[#E5ECE8] bg-[#F9FAFB] px-3 py-1 text-xs font-bold text-[#344054]">This week</span>}
    >
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#98A2B3]">Loading…</div>
      ) : (
        <div className="flex h-40 items-end justify-between gap-2.5">
          {data.map((bar, index) => (
            <div key={`${bar.day}-${index}`} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end justify-center" title={`${bar.count} booking${bar.count === 1 ? '' : 's'}`}>
                <div
                  className={cx(
                    'w-full max-w-[26px] rounded-full bg-gradient-to-b shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition-all',
                    bar.today ? 'from-[#22C55E] to-[#15803D]' : 'from-[#DCFCE7] to-[#BBF7D0]',
                  )}
                  style={{ height: `${Math.round(bar.value * 100)}%` }}
                />
              </div>
              <span className={cx('text-xs font-semibold', bar.today ? 'text-[#15803D]' : 'text-[#98A2B3]')}>{bar.day}</span>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

function ReminderCard({ pickup, loading }) {
  return (
    <CardShell title={<CardTitle icon={Bell} tone="orange">Reminders</CardTitle>}>
      {loading ? (
        <p className="text-sm text-[#98A2B3]">Loading…</p>
      ) : pickup ? (
        <>
          <div className="flex items-start gap-3">
            <Icon3D icon={Bell} tone="green" size="md" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#101828]">{pickup.title}</p>
              <p className="mt-0.5 text-xs text-[#667085]">{pickup.subtitle}</p>
              <p className="mt-1 text-xs font-semibold text-[#15803D]">{pickup.time}</p>
            </div>
          </div>
          <Link
            href="/shop-home/services/pickups"
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#15803D] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(21,128,61,0.25)] transition hover:from-[#16A34A] hover:to-[#166534]"
          >
            View Pickup
          </Link>
        </>
      ) : (
        <div className="relative flex flex-col items-center justify-center overflow-hidden py-4 text-center">
          <span className="pointer-events-none absolute bottom-0 h-10 w-32 rounded-full bg-[#FEF3C7]/50 blur-xl" aria-hidden="true" />
          <Icon3D icon={Bell} tone="orange" size="xl" className="relative" />
          <p className="relative mt-3 text-sm font-semibold text-[#101828]">No pickups scheduled</p>
          <p className="relative mt-0.5 text-xs text-[#667085]">You&apos;re all caught up.</p>
        </div>
      )}
    </CardShell>
  );
}

/** No backend concept for a personal task list exists yet — honest empty state, not sample tasks. */
function TaskListCard() {
  return (
    <CardShell
      title={<CardTitle icon={ListChecks} tone="green">Today&apos;s Tasks</CardTitle>}
      action={
        <Link
          href="/shop-home/employee/tasks"
          className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#22C55E] to-[#15803D] px-2.5 py-1 text-xs font-bold text-white shadow-[0_2px_8px_rgba(21,128,61,0.3)] transition hover:from-[#16A34A] hover:to-[#166534]"
        >
          <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
          New
        </Link>
      }
    >
      <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#D7E4DC] bg-[#FAFDFB] py-8 text-center">
        <span className="pointer-events-none absolute bottom-0 h-10 w-32 rounded-full bg-[#DCFCE7]/60 blur-xl" aria-hidden="true" />
        <Icon3D icon={ListChecks} tone="green" size="xl" className="relative" />
        <p className="relative mt-3 text-sm font-semibold text-[#101828]">Task tracking isn&apos;t set up yet</p>
        <p className="relative mt-0.5 max-w-[220px] text-xs text-[#667085]">This card will list real tasks once task management is wired up.</p>
      </div>
    </CardShell>
  );
}

// Both cards below bypass the shared CardShell (used by ~10 other pages,
// unaffected) for their own bordered/shadowed surface — same "page-local
// card wrapper" treatment already used by this page's Recent Bookings
// section, so the exact box-shadow/border/decoration values a reference
// design asked for don't ripple into every other CardShell-based page.
function TeamActivityCard({ team, loading }) {
  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-[22px] border border-[#E3ECE8] bg-white/96 p-5 shadow-[0_10px_28px_rgba(21,80,56,0.06),0_2px_8px_rgba(21,80,56,0.03)]">
      <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#E6F8EE] blur-2xl" aria-hidden="true" />

      <div className="relative mb-4 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <Icon3D icon={Users} tone="green" size="sm" />
          <span className="text-[19px] font-bold text-[#10213D]">Team Activity</span>
        </span>
        <Link
          href="/shop-home/employee/team"
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#EAF9EF] px-3 py-1.5 text-xs font-bold text-[#067A3D] transition hover:bg-[#DFF8EB] hover:shadow-[0_2px_10px_rgba(6,122,61,0.18)]"
        >
          View Team
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="relative flex flex-1 flex-col justify-center">
        {loading ? (
          <p className="text-sm text-[#98A2B3]">Loading…</p>
        ) : team.length === 0 ? (
          <div className="flex flex-col items-center py-4 text-center">
            <Icon3D icon={Users} tone="gray" size="lg" />
            <p className="mt-3 text-sm font-bold text-[#10213D]">No team activity yet</p>
            <p className="mt-1 text-sm text-[#667085]">Team assignments and work updates will appear here.</p>
            <Link
              href="/shop-home/employee/team"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#D0D5DD] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:border-[#15803D] hover:text-[#15803D]"
            >
              View Team
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#EEF3F0]">
            {team.map((member) => (
              <li
                key={member.name}
                className="group flex items-center gap-3 rounded-xl px-1.5 py-3 transition duration-200 ease-out hover:translate-x-0.5 hover:bg-[#F3FBF7]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#22C55E] to-[#066B39] text-sm font-bold text-white shadow-[0_5px_14px_rgba(8,145,75,0.18)]">
                  {initialsOf(member.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-[#10213D]">{member.name}</p>
                  <p className="truncate text-xs text-[#667085]">{member.task}</p>
                </div>
                <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide', TEAM_STATUS_BADGE[member.status])}>
                  {member.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CompletionGauge({ rate, loading, completed, remaining }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (loading ? 0 : rate) / 100);
  const hasTaskSummary = !loading && (completed > 0 || remaining > 0);

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-[22px] border border-[#E3ECE8] bg-white/96 p-5 shadow-[0_10px_28px_rgba(21,80,56,0.06),0_2px_8px_rgba(21,80,56,0.03)]">
      <span className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-[#F3FBF7] blur-2xl" aria-hidden="true" />

      <div className="relative flex items-center gap-2.5">
        <Icon3D icon={CheckCircle2} tone="green" size="sm" />
        <span className="text-[19px] font-bold text-[#10213D]">Completion Rate</span>
      </div>
      <p className="relative ml-[calc(2rem+0.625rem)] mt-0.5 text-xs text-[#667085]">Overall task completion summary</p>

      <div className="relative flex flex-1 flex-col items-center justify-center py-2">
        <div className="relative h-[150px] w-[150px]">
          <span className="absolute inset-4 rounded-full bg-[#F3FBF7]" aria-hidden="true" />
          <svg width="150" height="150" viewBox="0 0 150 150" className="relative -rotate-90">
            <defs>
              <linearGradient id="completionRateGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#4ADE80" />
                <stop offset="1" stopColor="#066B39" />
              </linearGradient>
            </defs>
            <circle cx="75" cy="75" r={radius} fill="none" stroke="#E6F8EE" strokeWidth="14" />
            <circle
              cx="75"
              cy="75"
              r={radius}
              fill="none"
              stroke="url(#completionRateGradient)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ filter: 'drop-shadow(0 4px 10px rgba(8,145,75,0.28))' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[36px] font-extrabold leading-none tracking-tight text-[#10213D]">{loading ? DASH : `${rate}%`}</span>
            <span className="mt-1.5 text-xs font-semibold text-[#667085]">Completed</span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-6 text-xs font-semibold text-[#344054]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#08914B]" aria-hidden="true" /> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#CFEEDD]" aria-hidden="true" /> Remaining
          </span>
        </div>

        {hasTaskSummary ? (
          <div className="relative mt-5 grid w-full grid-cols-2 gap-2 border-t border-[#EEF3F0] pt-4 text-center">
            <div>
              <p className="text-lg font-extrabold text-[#10213D]">{completed}</p>
              <p className="text-xs text-[#667085]">Completed Tasks</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-[#10213D]">{remaining}</p>
              <p className="text-xs text-[#667085]">Remaining Tasks</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const EMPTY_DATA = {
  bookings: [],
  counts: {},
  chats: [],
  tickets: [],
  technicians: [],
};

export default function ShopHomePage() {
  const [shopOwner, setShopOwner] = useState(null);
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setShopOwner(readShopOwner());
    const unsub = subscribe((session) => setShopOwner(session));
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [bookingsRes, countsRes, chatsRes, techniciansRes, ticketsRes] = await Promise.allSettled([
        fetchShopBookings(),
        fetchTicketCounts(),
        fetchShopChats(),
        fetchTechnicians(),
        fetchTicketsPaged(),
      ]);
      if (cancelled) return;
      setData({
        bookings: bookingsRes.status === 'fulfilled' ? bookingsRes.value : [],
        counts: countsRes.status === 'fulfilled' ? countsRes.value : {},
        chats: chatsRes.status === 'fulfilled' ? chatsRes.value : [],
        technicians: techniciansRes.status === 'fulfilled' ? techniciansRes.value : [],
        tickets: ticketsRes.status === 'fulfilled' ? ticketsRes.value : [],
      });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const name = shopOwner ? deriveDisplayName(shopOwner) : 'Partner';
  // Real, computed today — not a hardcoded date string.
  const todayLabel = useMemo(() => {
    const now = new Date();
    const datePart = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timePart = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${datePart}, ${timePart}`;
  }, []);

  const { bookings, counts, chats, technicians, tickets } = data;
  const bookingsToday = bookings.filter((b) => isToday(b.createdAt));
  const bookingsYesterday = bookings.filter((b) => {
    const d = new Date(b.createdAt || 0);
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return d.toDateString() === y.toDateString();
  });
  const pending = pendingPickups(bookings);
  const pendingToday = pending.filter((b) => b.pickupDate === new Date().toISOString().slice(0, 10));
  const revenueToday = todaysRevenue(tickets);
  const revenueYesterday = yesterdaysRevenue(tickets);
  const enquiries = openEnquiries(chats);

  const kpiCards = [
    {
      key: 'bookings',
      label: "Today's Bookings",
      value: loading ? DASH : String(bookingsToday.length),
      trend: loading ? null : trendFromYesterday(bookingsToday.length, bookingsYesterday.length),
      icon: ClipboardList,
      tone: 'green',
      href: '/shop-home/services/bookings',
    },
    {
      key: 'pickups',
      label: 'Pending Pickups',
      value: loading ? DASH : String(pending.length),
      trend: loading ? null : pendingToday.length > 0 ? `${pendingToday.length} scheduled today` : null,
      icon: Truck,
      tone: 'orange',
      href: '/shop-home/services/pickups',
    },
    {
      key: 'repairs',
      label: 'Active Repairs',
      value: loading ? DASH : String(sumActiveRepairs(counts)),
      trend: loading ? null : 'In progress',
      icon: Wrench,
      tone: 'blue',
      href: '/shop-home/services/service-status',
    },
    {
      key: 'delivery',
      label: 'Ready for Delivery',
      value: loading ? DASH : String(sumReadyForDelivery(counts)),
      trend: loading ? null : 'Awaiting pickup',
      icon: Package,
      tone: 'violet',
      href: '/shop-home/services/delivery',
    },
    {
      key: 'revenue',
      label: "Today's Revenue",
      value: loading ? DASH : formatCurrency(revenueToday),
      trend: loading ? null : trendFromYesterday(revenueToday, revenueYesterday),
      icon: IndianRupee,
      tone: 'mint',
      href: '/shop-home/reports/revenue',
    },
    {
      key: 'enquiries',
      label: 'Open Enquiries',
      value: loading ? DASH : String(enquiries.length),
      trend: loading ? null : enquiries.length > 0 ? 'Needs response' : 'All caught up',
      icon: MessageSquare,
      tone: 'pink',
      href: '/shop-home/services/enquiries',
    },
  ];

  const weekly = weeklyBookings(bookings);
  const pickupReminder = nextPickup(bookings);
  const team = teamActivity(technicians, tickets);
  const rate = completionRate(counts);
  // Same real counts/formula completionRate() already uses (counts.total
  // minus CANCELLED as the denominator, counts.DELIVERED as "done") — just
  // exposed as the two raw numbers too, for the Completion Rate card's
  // optional Completed/Remaining summary row. Not a new data source.
  const completionTotal = Math.max(0, Number(counts.total || 0) - Number(counts.CANCELLED || 0));
  const completedTasks = Number(counts.DELIVERED || 0);
  const remainingTasks = Math.max(0, completionTotal - completedTasks);
  const recent = recentBookings(bookings);

  return (
    <div
      className="relative -m-4 rounded-none p-4 sm:-m-6 sm:p-6"
      style={{ background: 'linear-gradient(180deg, #F2FAF7 0%, #ECF8F3 45%, #F7FBFA 100%)' }}
    >
      {/* dashboard.png as the page's own background, not just the hero
          card's — a compact fixed-height layer behind the hero band only
          (not stretching under the KPI row), faded out at its bottom edge
          via a mask so it blends into the soft mint page wash above instead
          of cutting off hard or bleeding a visible seam into the cards
          below. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[260px] sm:h-[280px]"
        style={{
          backgroundImage: "url('/dashboard.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 space-y-5">
        {/* Greeting hero — page-local, not the shared PageHeader (which
            every other page still uses unchanged): adds a real (not
            hardcoded) today's-date pill. Transparent card, no border/shadow
            of its own — the real background lives on the page-level layer
            above, so this box reads as part of that scene rather than a
            separately boxed banner. */}
        <div className="relative overflow-hidden rounded-3xl px-1 py-3 sm:px-2">
          <div className="relative flex flex-col items-start gap-3 md:pr-[170px] lg:pr-[200px]">
            <span className="inline-flex h-[44px] shrink-0 items-center gap-2 rounded-full border border-[#E5ECE8] bg-white/90 px-4 text-sm font-bold text-[#10223D] shadow-[0_6px_16px_rgba(20,80,55,0.08)]">
              <CalendarDays className="h-4 w-4 text-[#0B8A54]" aria-hidden="true" />
              {todayLabel}
            </span>
            <div className="min-w-0">
              <h1 className="text-[26px] font-extrabold tracking-tight text-[#10223D] sm:text-[30px]">
                {getGreeting()}, <span className="text-[#0B8A54]">{name}</span> <span aria-hidden="true">👋</span>
              </h1>
              <p className="mt-1 text-[15px] text-[#5B7085]">Here&apos;s what&apos;s happening with your business today.</p>
            </div>
          </div>
        </div>

        {/* ---- KPI cards -------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpiCards.map((card) => (
            <DashboardKpiCard
              key={card.key}
              icon={card.icon}
              label={card.label}
              value={card.value}
              trend={card.trend}
              tone={card.tone}
              href={card.href}
            />
          ))}
        </div>

        {/* ---- Quick Nav (Services / Employee / Reports switcher) ----------- */}
        <QuickNavWidget />

        {/* ---- Weekly Bookings / Reminders / Today's Tasks ------------------ */}
        <div className="grid gap-3 lg:grid-cols-3">
          <WeeklyBookingsChart data={weekly} loading={loading} />
          <ReminderCard pickup={pickupReminder} loading={loading} />
          <TaskListCard />
        </div>

        {/* ---- Team Activity / Completion Rate ------------------------------ */}
        <div className="grid gap-3 lg:grid-cols-2">
          <TeamActivityCard team={team} loading={loading} />
          <CompletionGauge rate={rate} loading={loading} completed={completedTasks} remaining={remainingTasks} />
        </div>

      {/* ---- Recent Bookings --------------------------------------------- */}
      <section className="overflow-hidden rounded-[22px] border border-[#E3ECE8] bg-white/96 shadow-[0_10px_28px_rgba(21,80,56,0.06),0_2px_8px_rgba(21,80,56,0.03)]">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <span className="flex items-center gap-2.5">
            <Icon3D icon={ClipboardList} tone="green" size="sm" />
            <span>
              <span className="block text-base font-bold text-[#10213D]">Recent Bookings</span>
              <span className="block text-xs text-[#667085]">Latest service bookings</span>
            </span>
          </span>
          <Link
            href="/shop-home/services/bookings"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#EAF9EF] px-3 py-1.5 text-xs font-bold text-[#067A3D] transition hover:bg-[#DFF8EB] hover:shadow-[0_2px_10px_rgba(6,122,61,0.18)]"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-[#98A2B3] sm:px-5">Loading…</p>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-10 text-center sm:px-5">
            <Icon3D icon={ClipboardList} tone="gray" size="lg" />
            <p className="mt-3 text-sm font-bold text-[#10213D]">No recent bookings</p>
            <p className="mt-1 text-sm text-[#667085]">New customer service bookings will appear here.</p>
            <Link
              href="/shop-home/services/bookings"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#D0D5DD] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:border-[#15803D] hover:text-[#15803D]"
            >
              View Bookings
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#EDF2EF]">
            {recent.map((booking, index) => {
              const created = booking.createdAt ? new Date(booking.createdAt) : null;
              return (
                <Link
                  key={booking.id}
                  href={`/shop-home/services/bookings/${booking.id}`}
                  className={cx(
                    'group flex items-center gap-3 px-3.5 py-3 transition duration-200 ease-out hover:translate-x-0.5 hover:bg-gradient-to-r hover:from-[#E7F9EF]/65 hover:to-white sm:px-5',
                    index === 0 && 'bg-gradient-to-r from-[#E8F9EF]/80 to-white/95',
                  )}
                >
                  <Icon3D icon={Smartphone} tone="green" size="md" className="shadow-[0_5px_14px_rgba(8,145,75,0.14)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#10213D]">{booking.issueSummary || 'Service booking'}</p>
                    <p className="truncate text-xs text-[#667085]">
                      {booking.customerName || 'Customer'} · <span className="font-semibold text-[#344054]">#{booking.bookingNumber}</span>
                    </p>
                    {created ? (
                      <p className="mt-0.5 truncate text-xs text-[#98A2B3] sm:hidden">
                        {created.toLocaleDateString(undefined, { dateStyle: 'medium' })} · {created.toLocaleTimeString(undefined, { timeStyle: 'short' })}
                      </p>
                    ) : null}
                  </div>
                  {created ? (
                    <div className="hidden shrink-0 text-right text-xs leading-tight text-[#667085] sm:block">
                      <p>{created.toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                      <p className="text-[#98A2B3]">{created.toLocaleTimeString(undefined, { timeStyle: 'short' })}</p>
                    </div>
                  ) : null}
                  <span
                    className={cx(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[0.68rem] font-bold uppercase tracking-wide',
                      STATUS_BADGE[booking.statusLabel] || 'bg-[#F0FDF4] text-[#667085]',
                    )}
                  >
                    <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[booking.statusLabel] || 'bg-[#98A2B3]')} aria-hidden="true" />
                    {booking.statusLabel}
                  </span>
                  <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF9EF] text-[#067A3D] transition group-hover:bg-[#DFF8EB] sm:inline-flex">
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
