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
 * inventing a task list, the same "don't fake it" rule the Shift Timer
 * below already followed.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  IndianRupee,
  ListChecks,
  MessageSquare,
  Package,
  Pause,
  Play,
  PlusCircle,
  RotateCcw,
  Smartphone,
  Truck,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import { readShopOwner, subscribe } from '@/lib/shopAuth';
import PageHeader from '@/components/shop-dashboard/PageHeader';
import CardShell from '@/components/shop-dashboard/CardShell';
import StatCard from '@/components/shop-dashboard/StatCard';
import QuickAction from '@/components/shop-dashboard/QuickAction';
import { deriveDisplayName } from '@/components/shop-dashboard/ProfileDropdown';
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

const QUICK_ACTIONS = [
  { label: 'Book Service', href: '/shop-home/services/book-service', icon: PlusCircle },
  { label: 'Create Pickup', href: '/shop-home/services/pickups', icon: Truck },
  { label: 'Add Customer', href: '/shop-home/services/customers', icon: Users },
  { label: 'New Enquiry', href: '/shop-home/services/enquiries', icon: MessageSquare },
  { label: 'View Deliveries', href: '/shop-home/services/delivery', icon: Package },
  { label: 'Assign Task', href: '/shop-home/employee/tasks', icon: ListChecks },
];

const STATUS_BADGE = {
  Created: 'bg-[#DCFCE7] text-[#15803D]',
  'In Progress': 'bg-sky-100 text-sky-700',
  Pickup: 'bg-orange-100 text-orange-700',
  Completed: 'bg-violet-100 text-violet-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const TEAM_STATUS_BADGE = {
  'In Progress': 'bg-sky-100 text-sky-700',
  Pending: 'bg-orange-100 text-orange-700',
};

const DASH = '—';

function formatCurrency(amount) {
  return `₹${Math.round(amount || 0).toLocaleString('en-IN')}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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

function WeeklyBookingsChart({ data, loading }) {
  return (
    <CardShell title="Weekly Bookings">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#98A2B3]">Loading…</div>
      ) : (
        <div className="flex h-40 items-end justify-between gap-2.5">
          {data.map((bar, index) => (
            <div key={`${bar.day}-${index}`} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end justify-center" title={`${bar.count} booking${bar.count === 1 ? '' : 's'}`}>
                <div
                  className={cx('w-full max-w-[26px] rounded-full transition-all', bar.today ? 'bg-[#15803D]' : 'bg-[#DCFCE7]')}
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
    <CardShell title="Reminders">
      {loading ? (
        <p className="text-sm text-[#98A2B3]">Loading…</p>
      ) : pickup ? (
        <>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#101828]">{pickup.title}</p>
              <p className="mt-0.5 text-xs text-[#667085]">{pickup.subtitle}</p>
              <p className="mt-1 text-xs font-semibold text-[#15803D]">{pickup.time}</p>
            </div>
          </div>
          <Link
            href="/shop-home/services/pickups"
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#15803D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#166534]"
          >
            View Pickup
          </Link>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F0FDF4] text-[#98A2B3]">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-[#101828]">No pickups scheduled</p>
          <p className="mt-0.5 text-xs text-[#667085]">You&apos;re all caught up.</p>
        </div>
      )}
    </CardShell>
  );
}

/** No backend concept for a personal task list exists yet — honest empty state, not sample tasks. */
function TaskListCard() {
  return (
    <CardShell
      title="Today's Tasks"
      action={
        <Link
          href="/shop-home/employee/tasks"
          className="inline-flex items-center gap-1 rounded-full bg-[#F0FDF4] px-2.5 py-1 text-xs font-bold text-[#15803D] transition hover:bg-[#DCFCE7]"
        >
          <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
          New
        </Link>
      }
    >
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#EAECF0] py-8 text-center">
        <ListChecks className="h-6 w-6 text-[#98A2B3]" aria-hidden="true" />
        <p className="mt-2 text-sm font-semibold text-[#101828]">Task tracking isn&apos;t set up yet</p>
        <p className="mt-0.5 max-w-[220px] text-xs text-[#667085]">This card will list real tasks once task management is wired up.</p>
      </div>
    </CardShell>
  );
}

function TeamActivityCard({ team, loading }) {
  return (
    <CardShell
      title="Team Activity"
      action={
        <Link href="/shop-home/employee/team" className="text-xs font-bold text-[#15803D] hover:underline">
          View Team
        </Link>
      }
    >
      {loading ? (
        <p className="text-sm text-[#98A2B3]">Loading…</p>
      ) : team.length === 0 ? (
        <p className="py-4 text-center text-sm text-[#667085]">No active jobs right now.</p>
      ) : (
        <ul className="space-y-3.5">
          {team.map((member) => (
            <li key={member.name} className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {initialsOf(member.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#101828]">{member.name}</p>
                <p className="truncate text-xs text-[#667085]">{member.task}</p>
              </div>
              <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide', TEAM_STATUS_BADGE[member.status])}>
                {member.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

function CompletionGauge({ rate, loading }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (loading ? 0 : rate) / 100);

  return (
    <CardShell title="Completion Rate">
      <div className="flex flex-col items-center py-1">
        <div className="relative h-[130px] w-[130px]">
          <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
            <circle cx="65" cy="65" r={radius} fill="none" stroke="#F0FDF4" strokeWidth="12" />
            <circle
              cx="65"
              cy="65"
              r={radius}
              fill="none"
              stroke="#15803D"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[#101828]">{loading ? DASH : `${rate}%`}</span>
            <span className="text-[10px] font-medium text-[#667085]">Completed</span>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-[#667085]">
            <span className="h-2 w-2 rounded-full bg-[#15803D]" /> Completed
          </span>
          <span className="flex items-center gap-1.5 text-[#667085]">
            <span className="h-2 w-2 rounded-full bg-[#DCFCE7]" /> Remaining
          </span>
        </div>
      </div>
    </CardShell>
  );
}

/**
 * ShiftTimer — the one genuinely live thing on this page even before this
 * rewrite. It counts real elapsed seconds since this dashboard was opened,
 * via a real setInterval, with a real working pause/resume — it does not
 * claim to track an actual clock-in/clock-out shift record (there is no
 * backend for that), so the label says exactly what it is.
 */
function ShiftTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const format = (total) => {
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <section className="rounded-3xl bg-gradient-to-br from-[#166534] to-[#14532D] p-5 text-white shadow-[0_4px_16px_rgba(20,83,45,0.25)]">
      <p className="text-sm font-bold text-white/90">Shift Timer</p>
      <p className="mt-0.5 text-xs text-white/60">Time since you opened the dashboard</p>
      <p className="mt-5 text-3xl font-bold tabular-nums tracking-wide">{format(seconds)}</p>
      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRunning((v) => !v)}
          aria-label={running ? 'Pause timer' : 'Resume timer'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        >
          {running ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={() => {
            setSeconds(0);
            setRunning(true);
          }}
          aria-label="Reset timer"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
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
      featured: true,
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
      tone: 'green',
      href: '/shop-home/reports/revenue',
    },
    {
      key: 'enquiries',
      label: 'Open Enquiries',
      value: loading ? DASH : String(enquiries.length),
      trend: loading ? null : enquiries.length > 0 ? 'Needs response' : 'All caught up',
      icon: MessageSquare,
      tone: 'red',
      href: '/shop-home/services/enquiries',
    },
  ];

  const weekly = weeklyBookings(bookings);
  const pickupReminder = nextPickup(bookings);
  const team = teamActivity(technicians, tickets);
  const rate = completionRate(counts);
  const recent = recentBookings(bookings);

  return (
    <div className="space-y-6">
      <PageHeader title={`${getGreeting()}, ${name}`} subtitle="Here's what's happening with your business today." />

      {/* ---- KPI cards ---------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpiCards.map((card) => (
          <StatCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={card.value}
            trend={card.trend}
            tone={card.tone}
            href={card.href}
            featured={card.featured}
          />
        ))}
      </div>

      {/* ---- Weekly Bookings / Reminders / Today's Tasks ------------------ */}
      <div className="grid gap-4 lg:grid-cols-3">
        <WeeklyBookingsChart data={weekly} loading={loading} />
        <ReminderCard pickup={pickupReminder} loading={loading} />
        <TaskListCard />
      </div>

      {/* ---- Team Activity / Completion Rate / Shift Timer ----------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <TeamActivityCard team={team} loading={loading} />
        <CompletionGauge rate={rate} loading={loading} />
        <ShiftTimer />
      </div>

      {/* ---- Quick Actions --------------------------------------------- */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <h2 className="text-base font-bold text-[#101828]">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIONS.map((action) => (
            <QuickAction key={action.label} icon={action.icon} label={action.label} href={action.href} />
          ))}
        </div>
      </section>

      {/* ---- Recent Bookings --------------------------------------------- */}
      <section className="rounded-3xl border border-[#EAECF0] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
        <div className="flex items-center justify-between border-b border-[#EAECF0] px-4 py-4 sm:px-5">
          <h2 className="text-base font-bold text-[#101828]">Recent Bookings</h2>
          <Link
            href="/shop-home/services/bookings"
            className="inline-flex items-center gap-1 rounded-full bg-[#F0FDF4] px-3 py-1.5 text-xs font-bold text-[#15803D] transition hover:bg-[#DCFCE7]"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="divide-y divide-[#EAECF0]">
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-[#98A2B3] sm:px-5">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-10 text-center sm:px-5">
              <CheckCircle2 className="h-6 w-6 text-[#98A2B3]" aria-hidden="true" />
              <p className="mt-2 text-sm text-[#667085]">No bookings yet.</p>
            </div>
          ) : (
            recent.map((booking) => (
              <div key={booking.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4]">
                  <Smartphone className="h-5 w-5 text-[#15803D]" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#101828]">{booking.issueSummary || 'Service booking'}</p>
                  <p className="truncate text-xs text-[#667085]">
                    {booking.customerName || 'Customer'} · #{booking.bookingNumber}
                  </p>
                </div>
                <div className="hidden shrink-0 text-right text-xs text-[#667085] sm:block">
                  {booking.createdAt ? new Date(booking.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                </div>
                <span
                  className={cx(
                    'shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide',
                    STATUS_BADGE[booking.statusLabel] || 'bg-[#F0FDF4] text-[#667085]',
                  )}
                >
                  {booking.statusLabel}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
