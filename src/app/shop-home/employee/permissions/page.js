'use client';

/**
 * /shop-home/employee/permissions — "Permission": short-time employee
 * permission requests (per this nav item's own description in
 * partnerNav.js), NOT role-based access control — a previous version of
 * this file rendered an RBAC-style page (roster + role/active badges, an
 * explanation that granular permission *categories* aren't backed by
 * anything), which didn't match what "Permissions" actually means here.
 *
 * Real employee roster (the same GET {TICKET_BASE}/technicians data
 * employee/team and employee/attendance already use, via
 * fetchTechnicians()), presented exactly like employee/attendance — a
 * month navigator and a Present/Late/Perm/Leave stat row per employee —
 * since a "permission" (a short-time leave request) is tracked alongside
 * attendance, per a reference design. This page just leads with the
 * "Perm" column instead of "Present".
 *
 * There is still no attendance/permission-request backend anywhere in
 * this codebase (same gap employee/attendance documents), so every stat
 * here is honestly 0 for every employee, for every month — the roster
 * (names/roles) is real, the counts aren't yet.
 */

import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, FileText, Hand, Info, Leaf, User, Users } from 'lucide-react';

import { cx } from '@/components/site/ui';
import { fetchTechnicians } from '@/lib/shopDashboard';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D] focus-visible:ring-offset-2';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Icon + light-tint styling per metric column — purely visual, same 4
// columns (Present/Late/Perm/Leave) this page has always shown, still all
// real "0" (no attendance/permission backend exists yet, per the file
// header comment) — just given a colored icon pill instead of a plain
// number, matching a reference design.
const ATTENDANCE_COLS = [
  { label: 'Present', icon: User, tint: 'bg-[#F1FFF7]', iconColor: 'text-[#0A9A59]' },
  { label: 'Late', icon: Clock, tint: 'bg-[#F2F8FF]', iconColor: 'text-[#2196F3]' },
  { label: 'Perm', icon: FileText, tint: 'bg-[#FFF8EC]', iconColor: 'text-[#FF9F1C]' },
  { label: 'Leave', icon: Leaf, tint: 'bg-[#F8F3FF]', iconColor: 'text-[#8B5CF6]' },
];

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function PermissionsPage() {
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
    <div
      className="relative flex flex-col gap-5 rounded-[24px] p-1"
      style={{ background: 'linear-gradient(180deg, #F7FBFA 0%, #F4FAF8 55%, #EEF8F4 100%)' }}
    >
      <span className="pointer-events-none absolute -right-16 -top-20 z-0 h-64 w-64 rounded-full bg-[#86EFAC]/15 blur-3xl" aria-hidden="true" />

      {/* Header — page-local, not the shared PageHeader (used by ~15+ other
          pages, unaffected). Calendar icon tile + title/subtitle on the
          left, a compact premium month-selector pill below it, a "Total
          Permission" summary card on the right, and — behind/between the
          two — a decorative crop of the real public/permissions.png asset
          (that file is a full reference mockup of this whole redesigned
          page; only its small calendar/clock/profile-card/plant cluster is
          windowed in here as the "top-right decorative illustration" the
          spec asks for, not the whole mockup). */}
      <div className="relative z-[1] flex flex-col gap-4">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#0A9A59] text-white shadow-[0_6px_14px_rgba(10,154,89,0.28)]">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#0F2440] sm:text-[30px]">Permission</h1>
              <p className="mt-0.5 text-[14px] text-[#6B7C93] sm:text-[15px]">Track short-time employee permission requests.</p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-2 rounded-[18px] border border-[#E5ECE8] bg-gradient-to-br from-white to-[#F4FBF8] px-4 py-3 shadow-[0_8px_24px_rgba(20,70,55,0.07)]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#22C55E] to-[#0A9A59] text-white">
              <Users className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-bold text-[#0F2440]">
              Total Permission: <span className="text-[#0A9A59]">0</span>
            </span>
          </span>
        </div>

        {/* Decorative — public/permissions.png, windowed to its small
            calendar/clock/profile-card/plant cluster only (original asset
            is 2172x724; that cluster sits roughly at x:1177-1766, y:60-251
            in that image). Hidden below lg so it never competes with the
            header text on narrower screens. */}
        <div
          className="pointer-events-none absolute right-[250px] top-1/2 z-0 hidden h-[130px] w-[432px] -translate-y-1/2 opacity-90 lg:block"
          style={{
            backgroundImage: "url('/permissions.png')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1592px 531px',
            backgroundPosition: '-863px -44px',
          }}
          aria-hidden="true"
        />

        <div className="inline-flex h-[54px] w-fit items-center gap-1 rounded-full border border-[#E5ECE8] bg-white px-1.5 shadow-[0_6px_16px_rgba(20,70,55,0.06)]">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Previous month"
            className={cx('flex h-10 w-10 items-center justify-center rounded-full text-[#344054] transition hover:bg-[#F0FDF4]', FOCUS_RING)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="flex items-center gap-1.5 px-1 text-sm font-bold text-[#0F2440]">
            <CalendarDays className="h-4 w-4 text-[#0A9A59]" aria-hidden="true" />
            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="Next month"
            className={cx('flex h-10 w-10 items-center justify-center rounded-full text-[#344054] transition hover:bg-[#F0FDF4]', FOCUS_RING)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative z-[1] flex items-start gap-2.5 rounded-2xl border border-[#E5ECE8] bg-gradient-to-br from-white to-[#F4FBF8] px-4 py-3.5 sm:px-[18px]">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0A9A59] text-white">
          <Info className="h-3 w-3" aria-hidden="true" />
        </span>
        <p className="text-[13px] leading-relaxed text-[#6B7C93]">
          Permission requests aren&apos;t backed by real data yet, so every count below is 0 — your roster is real, the numbers aren&apos;t.
        </p>
      </div>

      <div className="relative z-[1] divide-y divide-[#EEF3F0] overflow-hidden rounded-[22px] border border-[#E9EFEC] bg-white shadow-[0_8px_28px_rgba(20,70,55,0.07)]">
        {loading ? (
          <p className="px-5 py-6 text-center text-sm text-[#98A2B3]">Loading your team…</p>
        ) : error ? (
          <p className="px-5 py-6 text-center text-sm text-red-600">{error}</p>
        ) : technicians.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0FDF4]">
              <Hand className="h-6 w-6 text-[#15803D]" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#101828]">No employees yet</p>
            <p className="mt-1 max-w-xs text-sm text-[#667085]">Technicians and pickup staff added to your shop will show up here.</p>
          </div>
        ) : (
          technicians.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:flex-nowrap sm:px-6 sm:py-[26px]">
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#EAFBF3] text-lg font-bold text-[#0A9A59]">
                  {initials(t.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[18px] font-bold text-[#0F2440]">{t.name || 'Unnamed'}</p>
                  <p className="truncate text-sm text-[#6B7C93]">{t.roleLabel || 'Technician'}</p>
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:gap-2.5">
                {ATTENDANCE_COLS.map((col) => (
                  <div key={col.label} className={cx('flex h-[66px] w-[132px] shrink-0 items-center gap-2 rounded-2xl px-3', col.tint)}>
                    <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center', col.iconColor)}>
                      <col.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[19px] font-extrabold leading-none text-[#0F2440]">0</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#6B7C93]">{col.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <span className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5ECE8] bg-white text-[#6B7C93] shadow-sm transition hover:text-[#0A9A59] sm:ml-0">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
