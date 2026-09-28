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
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, Clock, FileText, Info, Leaf, User, Users } from 'lucide-react';

import { cx } from '@/components/site/ui';
import { fetchTechnicians } from '@/lib/shopDashboard';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D] focus-visible:ring-offset-2';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Icon + tint per metric column — same 4 real columns this page has always
// shown (Present/Late/Perm/Leave, all honestly "0" since no check-in/out
// backend exists yet, per the file header comment), styled as wider
// icon-left/number-right tiles per a reference design — deliberately not
// the same tile shape as the Permission page's, so the two pages don't
// read as reskins of each other.
const ATTENDANCE_COLS = [
  { label: 'Present', icon: User, tint: 'bg-[#E8FAF1]', iconColor: 'text-[#09A75A]', glow: 'bg-[#09A75A]/20' },
  { label: 'Late', icon: Clock, tint: 'bg-[#E8F9F8]', iconColor: 'text-[#2498F3]', glow: 'bg-[#2498F3]/20' },
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
      {/* One unified hero band — deliberately different structure from the
          Permission page (which stacks icon/title, month-pill, and a
          separate summary card as their own rows): here everything lives
          inside ONE bordered/shadowed gradient card — title block, illustration,
          and summary card side by side, with the month pill nested inside
          the same card, lower-left. Not the shared PageHeader (used by
          ~15+ other pages, unaffected). */}
      <div
        className="relative overflow-hidden rounded-[26px] border border-[rgba(15,80,60,0.08)] p-6 shadow-[0_10px_30px_rgba(18,70,55,0.06)] sm:p-7"
        style={{ background: 'linear-gradient(110deg, #ffffff 0%, #f6fcfa 42%, #e5faf1 100%)' }}
      >
        <span className="pointer-events-none absolute -right-16 -top-16 z-0 h-56 w-56 rounded-full bg-[#6EE7B7]/20 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute left-1/3 top-1/4 z-0 h-2 w-2 rounded-full bg-[#2498F3]/50" aria-hidden="true" />
        <span className="pointer-events-none absolute right-1/3 bottom-8 z-0 h-1.5 w-1.5 rounded-full bg-[#09A75A]/50" aria-hidden="true" />
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-20 w-full text-[#DFF8EC]/60"
          viewBox="0 0 500 90"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,45 C130,100 290,5 500,55 L500,90 L0,90 Z" />
        </svg>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-10 w-full text-[#E8F9F8]/70"
          viewBox="0 0 500 45"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,22 C160,45 310,4 500,24 L500,45 L0,45 Z" />
        </svg>

        <div className="relative z-[1] flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#16B86A] to-[#09A75A] text-white shadow-[0_6px_14px_rgba(9,167,90,0.3)]">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-[#10233F] sm:text-[34px]">Attendance</h1>
                <p className="mt-0.5 text-[14px] text-[#6D7E95] sm:text-[15px]">Track employee attendance and monthly working records.</p>
              </div>
            </div>

            {/* Month selector — a wider, stronger-green pill than the
                Permission page's compact one, with large touch-friendly
                arrow hit areas, per this page's own "attendance control"
                identity. Same goPrevMonth/goNextMonth handlers. */}
            <div className="mt-5 inline-flex h-[56px] w-full max-w-[350px] items-center gap-1 rounded-full border border-[#DCEFE4] bg-white pl-1.5 pr-2.5 shadow-[0_8px_20px_rgba(18,70,55,0.08)]">
              <button
                type="button"
                onClick={goPrevMonth}
                aria-label="Previous month"
                className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#344054] transition hover:bg-[#E8FAF1]', FOCUS_RING)}
              >
                <ChevronLeft className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
              <span className="flex flex-1 items-center justify-center gap-2 text-[15px] font-bold text-[#10233F]">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#16B86A] to-[#09A75A] text-white">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                onClick={goNextMonth}
                aria-label="Next month"
                className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#344054] transition hover:bg-[#E8FAF1]', FOCUS_RING)}
              >
                <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* public/attendance.png, windowed to its check-in/calendar/clock/
              employee/ID-card cluster only (original asset is 2172x724;
              that cluster sits roughly at x:1014-1951, y:33-283 in that
              image) — background-size scales the whole image up,
              background-position shifts it so only that region falls
              inside this box. Centered between the text and the summary
              card, inline in the flex flow (not absolutely floated) so it
              can never overlap either. */}
          <div
            className="hidden h-[160px] w-[597px] shrink-0 self-center lg:block"
            style={{
              backgroundImage: "url('/attendance.png')",
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1385px 462px',
              backgroundPosition: '-646px -21px',
            }}
            aria-hidden="true"
          />

          {/* Total Attendance summary — more visually prominent than the
              Permission page's inline pill: its own translucent card with a
              soft mint glow and a large green count. */}
          <div className="relative shrink-0 overflow-hidden rounded-[20px] border border-[#DCEFE4] bg-white/90 px-5 py-4 shadow-[0_10px_26px_rgba(18,70,55,0.09)]">
            <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#6EE7B7]/25 blur-2xl" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#16B86A] to-[#09A75A] text-white shadow-[0_6px_14px_rgba(9,167,90,0.28)]">
                <Users className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-[#10233F]">Total Attendance</p>
                <p className="text-[22px] font-extrabold leading-none text-[#09A75A]">0 days</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info banner — full width, thin mint border + a subtle inner
          highlight ring, distinct from the Permission page's plain-border
          version. */}
      <div className="relative flex items-start gap-2.5 rounded-2xl border border-[#DCEFE4] bg-white px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:px-[18px]">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#09A75A] text-white">
          <Info className="h-3 w-3" aria-hidden="true" />
        </span>
        <p className="text-[13px] leading-relaxed text-[#6D7E95] sm:text-[14px]">
          Attendance isn&apos;t backed by real check-in/check-out data yet, so every count below is 0 — your roster is real, the numbers aren&apos;t.
        </p>
      </div>

      <div className="divide-y divide-[#EEF3F0] overflow-hidden rounded-[22px] border border-[rgba(15,80,60,0.06)] bg-white shadow-[0_10px_30px_rgba(18,70,55,0.06)]">
        {loading ? (
          <p className="px-5 py-6 text-center text-sm text-[#98A2B3]">Loading your team…</p>
        ) : error ? (
          <p className="px-5 py-6 text-center text-sm text-red-600">{error}</p>
        ) : technicians.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8FAF1]">
              <CalendarCheck className="h-6 w-6 text-[#09A75A]" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#101828]">No employees yet</p>
            <p className="mt-1 max-w-xs text-sm text-[#667085]">Technicians and pickup staff added to your shop will show up here.</p>
          </div>
        ) : (
          technicians.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:flex-nowrap sm:px-6 sm:py-[26px]">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E8FAF1] text-lg font-bold text-[#09A75A]">
                  {initials(t.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[18px] font-bold text-[#10233F]">{t.name || 'Unnamed'}</p>
                  <p className="truncate text-sm text-[#6D7E95]">{t.roleLabel || 'Technician'}</p>
                </div>
                <span className="hidden h-10 w-px shrink-0 bg-[#EEF3F0] sm:block" aria-hidden="true" />
              </div>

              <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:flex-nowrap">
                {ATTENDANCE_COLS.map((col) => (
                  <div
                    key={col.label}
                    className={cx('relative flex h-[72px] w-[184px] shrink-0 items-center gap-3 overflow-hidden rounded-[17px] px-4', col.tint)}
                  >
                    <span className={cx('pointer-events-none absolute -left-3 -top-3 h-10 w-10 rounded-full blur-md', col.glow)} aria-hidden="true" />
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

              <span className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5ECE8] bg-white text-[#6D7E95] shadow-sm transition hover:text-[#09A75A] sm:ml-0">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
