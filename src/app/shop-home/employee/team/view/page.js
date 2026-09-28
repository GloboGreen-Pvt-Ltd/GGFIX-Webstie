'use client';

/**
 * /shop-home/employee/team/view/?id=… — Employee Details dashboard for one
 * technician/pickup-person, opened from the Employee Management roster
 * (team/page.js's EmployeeRow links here via its Quick Access grid). A
 * single dedicated page — nothing here auto-navigates anywhere; the Quick
 * Access links below are ordinary, explicit `<Link>`s a person clicks, not
 * a redirect, and none of this content is duplicated onto Attendance,
 * Leave, Shift, Salary, or Service Report — those pages are untouched.
 *
 * Full content restored (2026-09) after a prior pass had trimmed this down
 * to a shorter subset — back to the complete profile card / Check-In-Out /
 * Quick Access / This Month / Recent Salary Advance / Recent Leave Request
 * / Employee Information structure.
 *
 * Same real data source as the roster itself: GET {TICKET_BASE}/technicians
 * via fetchTechnicians() (src/lib/shopDashboard.js) — there is no
 * single-technician endpoint anywhere in this backend, so like Service/
 * Pickup Report's own "singleMode", this page fetches the full list and
 * finds the one matching `id` client-side. Real fields available on that
 * record (confirmed against team/page.js's own `normalize()`): name,
 * roleLabel, phone, email, isAvailable. Nothing else — no avatar,
 * department, join date, or attendance/leave/salary fields exist anywhere.
 *   - Profile card, Employee Information: real values; Department and a
 *     formatted Employee ID (beyond the raw id) have no real source, so
 *     they stay "—".
 *   - Check-in/Check-out, Monthly Summary tiles, Recent Salary Advance,
 *     Recent Leave Request: all literal "—"/empty-state — no attendance,
 *     leave, or salary-advance backend exists anywhere in this client.
 *   - "This Month" month switcher is real and functional — the days-in-
 *     month count is a real calendar fact, just the attendance count
 *     itself has nothing to compute from.
 *   - Quick Access: Daily Shift Schedule/Leave Report/Salary Report link to
 *     their real existing pages (unscoped — those pages don't accept a
 *     per-employee filter yet). "Monthly Summary" links to Attendance (the
 *     closest existing per-technician monthly breakdown page). "Edit
 *     Profile" stays honestly disabled — no edit-employee endpoint exists
 *     anywhere.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  IndianRupee,
  LogIn,
  LogOut,
  Mail,
  MoreVertical,
  Phone,
  PlusCircle,
  UserCircle,
  UserCog,
  Users,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import EmptyState from '@/components/shop-dashboard/EmptyState';
import { MONTHS, shiftMonth } from '@/components/shop-dashboard/MonthSwitcher';
import { fetchTechnicians } from '@/lib/shopDashboard';

const DASH = '—';
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D] focus-visible:ring-offset-2';

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

// Real profile photo when the technician record has one (the real
// shop-owner record already carries a real `avatarUrl` field — confirmed
// live earlier this session — so the same name is tried first here;
// photoUrl/profileImageUrl/imageUrl are tried as fallbacks in case the
// technician record uses different naming). Falls back to the plain
// initials circle — silently, via onError — when there's no photo or the
// URL fails to load, exactly like DeviceThumb elsewhere in this app.
function Avatar({ name, url, size = 'h-16 w-16 text-lg' }) {
  const [broken, setBroken] = useState(false);
  if (url && !broken) {
    return (
      <span className={cx('relative shrink-0 overflow-hidden rounded-full ring-1 ring-[#E4ECE8]', size)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- employee profile photos are arbitrary shop-catalog URLs, not app assets Next can optimize. */}
        <img src={url} alt="" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className={cx(
        'relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#DFF8EB] to-[#BBF7D0] font-bold text-[#066B39] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_10px_rgba(8,145,75,0.14)]',
        size,
      )}
    >
      {initials(name)}
    </span>
  );
}

function roleBadgeTone(roleLabel) {
  const r = String(roleLabel || '').toLowerCase();
  if (r === 'pickup person') return 'bg-[#FFF1E0] text-[#B45A00]';
  if (r === 'technician') return 'bg-[#DFF8EB] text-[#066B39]';
  return 'bg-[#E6FBF7] text-[#0F766E]';
}

function normalize(tech) {
  return {
    id: tech.id,
    name: tech.name || 'Unnamed',
    roleLabel: tech.roleLabel || 'Technician',
    phone: tech.phone || tech.mobile || '',
    email: tech.email || '',
    active: tech.isAvailable !== false,
    avatarUrl: tech.avatarUrl || tech.photoUrl || tech.profileImageUrl || tech.imageUrl || '',
  };
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

// Compact time-of-day tile — Check In / Check Out. Real time when
// attendance data exists (never does yet, hence the "—" default).
function TimeTile({ icon: Icon, label, value, tone }) {
  const toneCls =
    tone === 'orange'
      ? { chip: 'bg-gradient-to-br from-[#FB923C] to-[#EA580C]', value: 'text-[#9A3412]' }
      : { chip: 'bg-gradient-to-br from-[#22C55E] to-[#0A934D]', value: 'text-[#066B39]' };
  return (
    <div className="flex h-[104px] flex-1 flex-col justify-between rounded-2xl border border-[#E4ECE8] bg-white p-4 shadow-[0_8px_20px_rgba(20,80,55,0.05)]">
      <span className={cx('flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm', toneCls.chip)}>
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <div>
        <p className={cx('text-xl font-extrabold leading-none', toneCls.value)}>{value}</p>
        <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-wide text-[#98A2B3]">{label}</p>
      </div>
    </div>
  );
}

const SUMMARY_TILE_STYLES = {
  green: { card: 'bg-gradient-to-br from-[#F3FBF7] to-[#E4F8EC]', value: 'text-[#066B39]' },
  blue: { card: 'bg-gradient-to-br from-[#EFF9FF] to-[#D9F0FE]', value: 'text-[#1D6FA0]' },
  orange: { card: 'bg-gradient-to-br from-[#FFF7ED] to-[#FDE7CB]', value: 'text-[#9A5B27]' },
  red: { card: 'bg-gradient-to-br from-[#FFF1F2] to-[#FCE1E4]', value: 'text-[#9F5361]' },
};

function SummaryTile({ label, value, tone }) {
  const s = SUMMARY_TILE_STYLES[tone] || SUMMARY_TILE_STYLES.green;
  return (
    <div className={cx('flex h-[84px] flex-col justify-center rounded-2xl border border-[rgba(15,80,60,0.06)] p-3.5 text-center', s.card)}>
      <p className={cx('text-2xl font-extrabold leading-none', s.value)}>{value}</p>
      <p className="mt-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-[#6D7E94]">{label}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 border-b border-[#EEF3F0] px-4 py-3 last:border-b-0 sm:px-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.68rem] font-bold uppercase tracking-wide text-[#98A2B3]">{label}</span>
        <span className={cx('block truncate text-sm font-semibold', value === DASH || value === 'Not available' ? 'text-[#98A2B3]' : 'text-[#10213D]')}>{value}</span>
      </span>
    </div>
  );
}

export default function EmployeeDetailsPage() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetchTechnicians()
      .then((rows) => {
        if (!alive) return;
        const match = rows.map(normalize).find((t) => t.id === id);
        setEmployee(match || null);
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load this employee.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const employeeCode = useMemo(() => (employee?.id ? `EM-${employee.id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : DASH), [employee]);
  const totalDays = daysInMonth(viewDate);

  const quickLinks = [
    { label: 'Daily Shift Schedule', href: '/shop-home/employee/shift-schedule', icon: Clock },
    { label: 'Monthly Summary', href: '/shop-home/employee/attendance', icon: CalendarCheck },
    { label: 'Leave Report', href: '/shop-home/employee/leave', icon: Calendar },
    { label: 'Salary Report', href: '/shop-home/employee/salary', icon: IndianRupee },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5">
      {/* Header — back / title / 3-dot menu, compact per spec. The 3-dot
          menu stays honestly disabled: there's no additional employee
          action (edit, deactivate, remove) backed by a real endpoint here,
          same reasoning team/page.js's own header comment gives for
          omitting row-level Edit/Deactivate entirely. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E4ECE8] bg-white text-[#344054] transition hover:border-[#15803D] hover:text-[#15803D]', FOCUS_RING)}
          >
            <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
          <h1 className="truncate text-xl font-extrabold tracking-tight text-[#10213D]">Employee Details</h1>
        </div>
        <button
          type="button"
          disabled
          title="No additional employee actions are available here yet."
          aria-label="More actions (not available yet)"
          className="flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-[#EAECF0] bg-[#F9FAFB] text-[#98A2B3]"
        >
          <MoreVertical className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      </div>

      {error ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <div className="h-[110px] animate-pulse rounded-[22px] border border-[#EAECF0] bg-[#F9FAFB]" />
          <div className="h-[104px] animate-pulse rounded-2xl border border-[#EAECF0] bg-[#F9FAFB]" />
        </div>
      ) : !employee ? (
        <EmptyState icon={Users} title="Employee not found" description="This employee may have been removed from your team." />
      ) : (
        <>
          {/* Profile summary card */}
          <div className="flex items-center gap-4 rounded-[22px] border border-[#E4ECE8] bg-white p-5 shadow-[0_8px_24px_rgba(20,80,55,0.06)]">
            <Avatar name={employee.name} url={employee.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-extrabold text-[#10213D]">{employee.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide', roleBadgeTone(employee.roleLabel))}>
                  {employee.roleLabel}
                </span>
                <span className="text-xs text-[#98A2B3]">ID: {employeeCode}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="mb-1 flex items-center justify-end gap-1.5 text-xs font-semibold">
                <span className={cx('h-1.5 w-1.5 rounded-full', employee.active ? 'bg-[#15803D]' : 'bg-[#98A2B3]')} aria-hidden="true" />
                <span className={employee.active ? 'text-[#15803D]' : 'text-[#98A2B3]'}>{employee.active ? 'Active' : 'Inactive'}</span>
              </span>
            </div>
          </div>

          {/* Check-in / Check-out — real tile chrome, honest "—" values:
              no attendance backend exists anywhere in this client. */}
          <div className="flex gap-3">
            <TimeTile icon={LogIn} label="Check In" value={DASH} tone="green" />
            <TimeTile icon={LogOut} label="Check Out" value={DASH} tone="orange" />
          </div>
          <p className="-mt-3 text-xs text-[#98A2B3]">Attendance check-in/check-out tracking isn&apos;t available yet.</p>

          {/* Quick Access */}
          <div>
            <p className="mb-2.5 text-sm font-bold text-[#10213D]">Quick Access</p>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {quickLinks.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#DDE5E1] bg-white px-2 py-3.5 text-center text-[0.68rem] font-semibold text-[#10213D] transition hover:border-[#079447] hover:bg-[#F3FBF7] hover:text-[#079447]"
                >
                  <Icon3D icon={l.icon} tone="green" size="sm" />
                  {l.label}
                </Link>
              ))}
              <button
                type="button"
                disabled
                title="Editing employee profiles isn't available yet — there's no edit-employee endpoint."
                className="flex cursor-not-allowed flex-col items-center gap-1.5 rounded-2xl border border-[#EAECF0] bg-[#F9FAFB] px-2 py-3.5 text-center text-[0.68rem] font-semibold text-[#98A2B3]"
              >
                <Icon3D icon={UserCog} tone="gray" size="sm" />
                Edit Profile
              </button>
            </div>
          </div>

          {/* This Month — real month switcher, real days-in-month count;
              attendance count itself has nothing to compute from yet. */}
          <section className="rounded-[22px] border border-[#E4ECE8] bg-white p-4 shadow-[0_8px_24px_rgba(20,80,55,0.05)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#10213D]">This Month</p>
              <div className="flex items-center gap-2.5">
                <div className="inline-flex h-8 items-center gap-0.5 rounded-full bg-gradient-to-r from-[#22C55E] to-[#0BA65A] p-1 shadow-[0_4px_12px_rgba(11,166,90,0.28)]">
                  <button
                    type="button"
                    onClick={() => shiftMonth(setViewDate, -1)}
                    aria-label="Previous month"
                    className={cx('flex h-6 w-6 items-center justify-center rounded-full text-white transition hover:bg-white/15', FOCUS_RING)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="px-1.5 text-xs font-bold text-white">
                    {MONTHS[viewDate.getMonth()].slice(0, 3)} {viewDate.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={() => shiftMonth(setViewDate, 1)}
                    aria-label="Next month"
                    className={cx('flex h-6 w-6 items-center justify-center rounded-full text-white transition hover:bg-white/15', FOCUS_RING)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <span className="text-xs font-bold text-[#98A2B3]">{DASH} / {totalDays}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <SummaryTile label="Present" value={DASH} tone="green" />
              <SummaryTile label="Leave" value={DASH} tone="blue" />
              <SummaryTile label="Permission" value={DASH} tone="orange" />
              <SummaryTile label="Late Hrs" value={DASH} tone="red" />
            </div>
          </section>

          {/* Recent Salary Advance */}
          <section className="rounded-[22px] border border-[#E4ECE8] bg-white shadow-[0_8px_24px_rgba(20,80,55,0.05)]">
            <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <p className="text-sm font-bold text-[#10213D]">Recent Salary Advance</p>
              <button
                type="button"
                disabled
                title="Recording a salary advance isn't available yet — there's no salary-advance backend."
                className="inline-flex cursor-not-allowed items-center gap-1 rounded-full bg-[#F9FAFB] px-3 py-1.5 text-xs font-bold text-[#98A2B3]"
              >
                <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Add
              </button>
            </div>
            <div className="border-t border-dashed border-[#EAECF0]">
              <EmptyState icon={IndianRupee} tone="muted" title="No advances" description="You haven't requested any advance yet." />
            </div>
          </section>

          {/* Recent Leave Request */}
          <section className="rounded-[22px] border border-[#E4ECE8] bg-white shadow-[0_8px_24px_rgba(20,80,55,0.05)]">
            <p className="px-4 py-4 text-sm font-bold text-[#10213D] sm:px-5">Recent Leave Request</p>
            <div className="border-t border-dashed border-[#EAECF0]">
              <EmptyState icon={Calendar} tone="muted" title="No leave requests" description="You have no leave requests." />
            </div>
          </section>

          {/* Employee Information */}
          <section className="overflow-hidden rounded-[22px] border border-[#E4ECE8] bg-white shadow-[0_8px_24px_rgba(20,80,55,0.05)]">
            <p className="px-4 pt-4 text-sm font-bold text-[#10213D] sm:px-5">Employee Information</p>
            <div className="mt-2">
              <InfoRow icon={UserCircle} label="Role" value={employee.roleLabel} />
              <InfoRow icon={Mail} label="Email" value={employee.email || 'Not available'} />
              <InfoRow icon={Phone} label="Phone" value={employee.phone || 'Not available'} />
              <InfoRow icon={Briefcase} label="Department" value={DASH} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
