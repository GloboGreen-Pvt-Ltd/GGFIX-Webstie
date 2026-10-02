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
import { ChevronRight, Clock, FileText, Hand, Info, Leaf, User, Users } from 'lucide-react';

import { cx } from '@/components/site/ui';
import PageHeader from '@/components/shop-dashboard/PageHeader';
import { MonthPicker, SummaryPill } from '@/components/shop-dashboard/HeaderControls';
import { fetchTechnicians } from '@/lib/shopDashboard';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Icon + light-tint styling per metric column — purely visual, same 4
// columns (Present/Late/Perm/Leave) this page has always shown, still all
// real "0" (no attendance/permission backend exists yet, per the file
// header comment) — just given a colored icon pill instead of a plain
// number, matching a reference design.
const ATTENDANCE_COLS = [
  { label: 'Present', icon: User, tint: 'bg-[#F8F8F8]', iconColor: 'text-[#0A9A59]' },
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
    <div className="relative flex flex-col gap-5">

      <PageHeader
        title="Permission"
        subtitle="Track short-time employee permission requests."
        action={<SummaryPill icon={Users} label="Total Permission" value={0} />}
      >
        <MonthPicker
          label={`${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
          onPrev={goPrevMonth}
          onNext={goNextMonth}
        />
      </PageHeader>

      <div className="relative z-[1] flex items-start gap-2.5 rounded-2xl border border-[#ECECEC] bg-[#F8F8F8] px-4 py-3.5 sm:px-[18px]">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0A9A59] text-white">
          <Info className="h-3 w-3" aria-hidden="true" />
        </span>
        <p className="text-[13px] leading-relaxed text-[#6B7C93]">
          Permission requests aren&apos;t backed by real data yet, so every count below is 0 — your roster is real, the numbers aren&apos;t.
        </p>
      </div>

      <div className="relative z-[1] divide-y divide-[#ECECEC] overflow-hidden rounded-[22px] border border-[#ECECEC] bg-[#F8F8F8] shadow-[0_8px_28px_rgba(17,17,17,0.06)]">
        {loading ? (
          <p className="px-5 py-6 text-center text-sm text-[#98A2B3]">Loading your team…</p>
        ) : error ? (
          <p className="px-5 py-6 text-center text-sm text-red-600">{error}</p>
        ) : technicians.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F8F8F8]">
              <Hand className="h-6 w-6 text-[#15803D]" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#111111]">No employees yet</p>
            <p className="mt-1 max-w-xs text-sm text-[#666666]">Technicians and pickup staff added to your shop will show up here.</p>
          </div>
        ) : (
          technicians.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:flex-nowrap sm:px-6 sm:py-[26px]">
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F3F3F3] text-lg font-bold text-[#0A9A59]">
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

              <span className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ECECEC] bg-white text-[#6B7C93] transition hover:text-[#0A9A59] sm:ml-0">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
