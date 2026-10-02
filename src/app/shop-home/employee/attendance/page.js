'use client';

/**
 * /shop-home/employee/attendance — real employee roster (the same
 * GET {TICKET_BASE}/technicians data employee/team already uses, via
 * fetchTechnicians()) with a month navigator and a Present/Late/Perm/Leave
 * stat row per employee, per a reference design.
 *
 * There is still no attendance/check-in backend anywhere in this codebase
 * (confirmed when this page previously rendered NotYetAvailablePage, and
 * again in team/page.js's "Work Information" note) — so every stat here is
 * honestly 0 for every employee, for every month, same as the reference
 * design itself shows before any real attendance exists. The month
 * navigator is local UI only; switching months doesn't fetch anything,
 * since there is nothing yet to fetch. The roster (names/roles) is real.
 */

import { useEffect, useState } from 'react';
import { CalendarCheck, ChevronRight, Clock, FileText, Info, Leaf, User, Users } from 'lucide-react';

import { cx } from '@/components/site/ui';
import PageHeader from '@/components/shop-dashboard/PageHeader';
import { MonthPicker, SummaryPill } from '@/components/shop-dashboard/HeaderControls';
import { fetchTechnicians } from '@/lib/shopDashboard';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Icon + tint per metric column — same 4 real columns this page has always
// shown (Present/Late/Perm/Leave, all honestly "0" since no check-in/out
// backend exists yet, per the file header comment), styled as wider
// icon-left/number-right tiles per a reference design — deliberately not
// the same tile shape as the Permission page's, so the two pages don't
// read as reskins of each other.
const ATTENDANCE_COLS = [
  { label: 'Present', icon: User, tint: 'bg-[#F3F3F3]', iconColor: 'text-[#09A75A]', glow: 'bg-[#09A75A]/20' },
  { label: 'Late', icon: Clock, tint: 'bg-[#F3F3F3]', iconColor: 'text-[#2498F3]', glow: 'bg-[#2498F3]/20' },
  { label: 'Perm', icon: FileText, tint: 'bg-[#FFF3DF]', iconColor: 'text-[#FF9C1A]', glow: 'bg-[#FF9C1A]/20' },
  { label: 'Leave', icon: Leaf, tint: 'bg-[#F2ECFE]', iconColor: 'text-[#8B5CF6]', glow: 'bg-[#8B5CF6]/20' },
];

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function AttendancePage() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    let alive = true;
    fetchTechnicians()
      .then((rows) => alive && setTechnicians(Array.isArray(rows) ? rows : []))
      .catch((err) => alive && setError(err.message || 'Could not load your team.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const goPrevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Attendance"
        subtitle="Track employee attendance and monthly working records."
        action={<SummaryPill icon={Users} label="Total Attendance" value="0 days" />}
      >
        <MonthPicker
          label={`${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
          onPrev={goPrevMonth}
          onNext={goNextMonth}
        />
      </PageHeader>

      {/* Info banner — full width, thin mint border + a subtle inner
          highlight ring, distinct from the Permission page's plain-border
          version. */}
      <div className="relative flex items-start gap-2.5 rounded-2xl border border-[#ECECEC] bg-[#F8F8F8] px-4 py-3.5 sm:px-[18px]">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#09A75A] text-white">
          <Info className="h-3 w-3" aria-hidden="true" />
        </span>
        <p className="text-[13px] leading-relaxed text-[#6D7E95] sm:text-[14px]">
          Attendance isn&apos;t backed by real check-in/check-out data yet, so every count below is 0 — your roster is real, the numbers aren&apos;t.
        </p>
      </div>

      <div className="divide-y divide-[#ECECEC] overflow-hidden rounded-[22px] border border-[#ECECEC] bg-[#F8F8F8]">
        {loading ? (
          <p className="px-5 py-6 text-center text-sm text-[#98A2B3]">Loading your team…</p>
        ) : error ? (
          <p className="px-5 py-6 text-center text-sm text-red-600">{error}</p>
        ) : technicians.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F3F3]">
              <CalendarCheck className="h-6 w-6 text-[#09A75A]" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#111111]">No employees yet</p>
            <p className="mt-1 max-w-xs text-sm text-[#666666]">Technicians and pickup staff added to your shop will show up here.</p>
          </div>
        ) : (
          technicians.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:flex-nowrap sm:px-6 sm:py-[26px]">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F3F3F3] text-lg font-bold text-[#09A75A]">
                  {initials(t.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[18px] font-bold text-[#10233F]">{t.name || 'Unnamed'}</p>
                  <p className="truncate text-sm text-[#6D7E95]">{t.roleLabel || 'Technician'}</p>
                </div>
                <span className="hidden h-10 w-px shrink-0 bg-[#F3F3F3] sm:block" aria-hidden="true" />
              </div>

              <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:flex-nowrap">
                {ATTENDANCE_COLS.map((col) => (
                  <div
                    key={col.label}
                    className={cx('relative flex h-[72px] w-[184px] shrink-0 items-center gap-3 overflow-hidden rounded-[17px] px-4', col.tint)}
                  >
                    <span className={cx('relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70', col.iconColor)}>
                      <col.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <div className="relative">
                      <p className="text-[20px] font-extrabold leading-none text-[#10233F]">0</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#6D7E95]">{col.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <span className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ECECEC] bg-white text-[#6D7E95] transition hover:text-[#09A75A] sm:ml-0">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
