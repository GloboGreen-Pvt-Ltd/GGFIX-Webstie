'use client';

/**
 * /shop-home/employee/leave — "Leave Requests": review and manage the team's
 * leave, as in the Partner app. A Pending count chip, Pending / Approved /
 * Rejected tabs, and one card per request (employee, type, dates, days,
 * reason) — pending ones with Approve / Reject. Empty state offers Add
 * Employee, as in the app.
 *
 * Data (ticket-service, helpers in src/lib/shopDashboard.js):
 *   - GET   /technicians/leaves                 — every employee's requests
 *   - PATCH /technicians/{id}/leaves/{leaveId}/approve | /reject
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Check, CheckCircle2, ChevronLeft, ClipboardList, Clock, UserPlus, X, XCircle } from 'lucide-react';

import { cx } from '@/components/site/ui';
import { decideLeave, fetchAllLeaves } from '@/lib/shopDashboard';
import { notifyError, notifySuccess } from '@/lib/toast';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2';
const TABS = [
  { key: 'PENDING', label: 'Pending', icon: Clock, on: 'bg-[#FFF6D6] text-[#8A6100]' },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle2, on: 'bg-[#EAF8EC] text-[#067647]' },
  { key: 'REJECTED', label: 'Rejected', icon: XCircle, on: 'bg-[#FEF2F2] text-[#B42318]' },
];
const EMPTY = {
  PENDING: { title: 'No pending leaves', text: 'New leave requests from your team will appear here.' },
  APPROVED: { title: 'No approved leaves', text: 'Leave you approve will appear here.' },
  REJECTED: { title: 'No rejected leaves', text: 'Leave you reject will appear here.' },
};

const upper = (v) => String(v || '').toUpperCase();
const humanize = (v) =>
  String(v || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
const fmtDate = (v) => {
  const d = v ? new Date(`${String(v).slice(0, 10)}T00:00:00`) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
};

export default function LeaveRequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('PENDING');
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let alive = true;
    setError('');
    fetchAllLeaves()
      .then((list) => alive && setRows(list))
      .catch((err) => {
        if (!alive) return;
        setRows([]);
        setError(err.message || 'Could not load leave requests.');
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const counts = useMemo(() => {
    const c = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    (rows || []).forEach((r) => {
      const s = upper(r.status);
      if (s in c) c[s] += 1;
    });
    return c;
  }, [rows]);
  const visible = useMemo(
    () => (rows || []).filter((r) => upper(r.status) === tab).sort((a, b) => new Date(b.requestedAt || b.startDate || 0) - new Date(a.requestedAt || a.startDate || 0)),
    [rows, tab],
  );

  async function decide(leave, approve) {
    let rejectionReason = null;
    if (!approve) {
      rejectionReason = window.prompt(`Reason for rejecting ${leave.technicianName || 'this'} leave? (optional)`) ?? null;
      if (rejectionReason === null) return;
    }
    setBusyId(leave.id);
    try {
      await decideLeave(leave.technicianId, leave.id, approve, { rejectionReason });
      notifySuccess(approve ? 'Leave approved' : 'Leave rejected');
      reload();
    } catch (e) {
      notifyError(e, 'Could not update this leave request.');
    } finally {
      setBusyId(null);
    }
  }

  const empty = EMPTY[tab];

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECECEC] pb-4">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#ECECEC] bg-white text-[#111111] transition hover:border-[#16A34A]', FOCUS_RING)}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-[24px] font-extrabold text-[#111111]">Leave Requests</h1>
            <p className="text-[14.5px] text-[#667085]">Review and manage your team&apos;s leave</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF6D6] px-4 py-2 text-[15px] font-extrabold text-[#8A6100]">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {rows === null ? '…' : counts.PENDING} Pending
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-[#ECECEC] bg-white p-1.5" role="tablist" aria-label="Leave status">
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.key)}
              className={cx('inline-flex h-12 min-w-0 items-center justify-center gap-1 rounded-xl px-1 text-[14px] font-bold transition sm:gap-2 sm:px-0 sm:text-[15.5px]', FOCUS_RING, on ? t.on : 'text-[#667085] hover:bg-[#F8F8F8]')}
            >
              <t.icon className="hidden h-5 w-5 shrink-0 sm:block" aria-hidden="true" />
              {t.label}
              {rows && counts[t.key] ? <span className="text-[12.5px] opacity-80">({counts[t.key]})</span> : null}
            </button>
          );
        })}
      </div>

      {error ? <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13.5px] font-semibold text-[#B42318]">{error}</p> : null}

      {rows === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-[22px] bg-[#F3F3F3]" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="mx-auto mt-6 flex w-full max-w-xl flex-col items-center rounded-[28px] border border-[#ECECEC] bg-white px-6 py-10 text-center shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
          <span className="relative flex h-24 w-24 items-center justify-center rounded-[26px] bg-[#EAF8EC] text-[#16A34A]">
            <ClipboardList className="h-11 w-11" aria-hidden="true" />
            <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#FFF6D6] text-[#E8B400]">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </span>
          </span>
          <p className="mt-6 text-[22px] font-extrabold text-[#111111]">{empty.title}</p>
          <p className="mt-1.5 text-[15px] text-[#667085]">{empty.text}</p>
          <Link
            href="/shop-home/employee/team/new"
            className={cx('mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-[#16A34A] px-6 text-[16px] font-extrabold text-white transition hover:bg-[#15803D]', FOCUS_RING)}
          >
            <UserPlus className="h-5 w-5" aria-hidden="true" />
            Add Employee
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((l) => (
            <li key={l.id} className="rounded-[22px] border border-[#ECECEC] bg-white p-4 shadow-[0_4px_14px_rgba(16,24,40,0.05)] sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF8EC] text-[19px] font-extrabold text-[#15803D]">
                    {String(l.technicianName || '?').trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <Link href={`/shop-home/employee/leave/view/?id=${encodeURIComponent(l.technicianId || '')}`} className="block truncate text-[17px] font-extrabold text-[#111111] hover:underline">
                      {l.technicianName || 'Employee'}
                    </Link>
                    <p className="text-[13.5px] font-semibold text-[#16A34A]">{humanize(l.leaveType) || 'Leave'}</p>
                  </div>
                </div>
                <div className="text-right text-[13px] text-[#667085]">
                  <p className="flex items-center justify-end gap-1.5 font-semibold text-[#344054]">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {fmtDate(l.startDate)}
                    {l.endDate && l.endDate !== l.startDate ? ` – ${fmtDate(l.endDate)}` : ''}
                  </p>
                  <p>{l.appliedDaysLabel || (l.totalDays ? `${l.totalDays} day${Number(l.totalDays) === 1 ? '' : 's'}` : '')}</p>
                </div>
              </div>
              {l.reason ? <p className="mt-3 break-words rounded-xl bg-[#F8F8F8] px-3 py-2 text-[13.5px] text-[#344054]">{l.reason}</p> : null}
              {tab === 'REJECTED' && l.rejectionReason ? <p className="mt-2 text-[13px] text-[#B42318]">Reason: {l.rejectionReason}</p> : null}
              {tab === 'PENDING' ? (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => decide(l, true)}
                    disabled={busyId === l.id}
                    className={cx('inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#16A34A] text-[14px] font-bold text-white transition hover:bg-[#15803D] disabled:opacity-60 sm:flex-none sm:px-5', FOCUS_RING)}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(l, false)}
                    disabled={busyId === l.id}
                    className={cx('inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#FDA29B] bg-white text-[14px] font-bold text-[#B42318] transition hover:bg-[#FEF2F2] disabled:opacity-60 sm:flex-none sm:px-5', FOCUS_RING)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Reject
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
