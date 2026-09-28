'use client';

/**
 * /shop-home/services/bookings/[id] — Service History for one booking.
 *
 * This is what the Bookings list's "History" action navigates to (it used
 * to just send everyone to the generic /services/service-status list, which
 * isn't scoped to the booking you clicked). Reads GET
 * {ORDER_BASE}/repair-bookings/shop/{id} via fetchShopBookingDetail()
 * (src/lib/shopDashboard.js) for the fields the list endpoint doesn't carry:
 * `events` (the real per-status timeline), `brandName`, `color`,
 * `ramStorage` — all plain fields the booking already stores (see the
 * create-booking payload in book-service/page.js). Re-polls that same
 * endpoint every 15s while this page is open, same idea as the customer
 * app's own booking-history screen ("Live progress is refreshed every 10
 * seconds", OrdersExperience.js) — so "Live Updates" below is a real claim,
 * not decoration.
 *
 * Step labels/ordering/phase grouping come from src/lib/serviceTimeline.js.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Clock, Copy, Phone, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import EmptyState from '@/components/shop-dashboard/EmptyState';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { fetchShopBookingDetail } from '@/lib/shopDashboard';
import { bookingEstimatedAmount } from '@/lib/bookingFormat';
import { buildTimelineGroups, eventCount, latestEvent } from '@/lib/serviceTimeline';
import { guessColorHex } from '@/lib/colorSwatch';

const POLL_MS = 15000;

function humanizeStatus(status) {
  const s = String(status || '').trim();
  if (!s) return 'Status not available';
  return s
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function GroupBadge({ status }) {
  if (status === 'active') {
    return <span className="rounded-full bg-[#15803D] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">Started</span>;
  }
  if (status === 'done') {
    return <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-[#15803D]">Done</span>;
  }
  return null;
}

export default function BookingHistoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    setLoading(true);
    setError('');
    fetchShopBookingDetail(id)
      .then((data) => {
        if (!alive) return;
        setBooking(data);
        setLastSyncedAt(new Date());
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load this booking’s history.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, reloadKey]);

  // Silent background poll — no skeleton, no error banner, just a quiet
  // refresh so "Live Updates" is true. A fetch already in flight (the
  // initial load, or a manual Refresh) is left alone rather than overlapped.
  useEffect(() => {
    if (!id) return undefined;
    const timer = setInterval(() => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      fetchShopBookingDetail(id)
        .then((data) => {
          setBooking(data);
          setLastSyncedAt(new Date());
        })
        .catch(() => {})
        .finally(() => {
          fetchingRef.current = false;
        });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [id]);

  const groups = useMemo(() => (booking ? buildTimelineGroups(booking) : []), [booking]);
  const flatSteps = useMemo(() => groups.flatMap((g) => g.steps), [groups]);
  const completed = flatSteps.filter((s) => s.done).length;
  const percent = flatSteps.length ? Math.round((completed / flatSteps.length) * 100) : 0;
  const currentStep = [...flatSteps].reverse().find((s) => s.done);
  const currentLabel = currentStep?.label || humanizeStatus(booking?.status);
  const trackingId = booking?.bookingNumber || booking?.id || id;
  const deviceName = [booking?.brandName, booking?.deviceDisplayName || booking?.modelName].filter(Boolean).join(' ') || 'Device not specified';
  const amount = booking ? bookingEstimatedAmount(booking) : null;
  const latest = booking ? latestEvent(booking) : null;
  const totalEvents = booking ? eventCount(booking) : 0;
  const colorHex = booking?.color ? guessColorHex(booking.color) : null;

  function copyTrackingId() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(String(trackingId))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EAECF0] bg-white text-[#344054] transition hover:border-[#15803D] hover:text-[#15803D]"
        >
          <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#101828] sm:text-[28px]">Service History</h1>
          <p className="mt-1 text-sm text-[#667085]">Track the complete journey of this device.</p>
        </div>
        <button
          type="button"
          onClick={copyTrackingId}
          className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#F0FDF4] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#15803D] transition hover:bg-[#DCFCE7]"
        >
          #{trackingId}
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          {copied ? 'Copied' : ''}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-3xl border border-[#EAECF0] bg-[#F9FAFB]" />
          <div className="h-24 animate-pulse rounded-3xl border border-[#EAECF0] bg-[#F9FAFB]" />
          <div className="h-96 animate-pulse rounded-3xl border border-[#EAECF0] bg-[#F9FAFB]" />
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : !booking ? (
        <EmptyState
          icon={AlertTriangle}
          tone="muted"
          title="Booking not found"
          description="We couldn't find history for this booking."
        />
      ) : (
        <>
          <section className="rounded-3xl border border-[#EAECF0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
            <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Device</p>
            <div className="flex items-start gap-4">
              <DeviceThumb url={booking.deviceImageUrl} />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-[#101828]">
                  {deviceName}
                  {booking.ramStorage ? <span className="font-semibold text-[#667085]"> · {booking.ramStorage}</span> : null}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {booking.color ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D0D5DD] bg-white px-2.5 py-1 text-xs font-semibold text-[#344054]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: colorHex }} aria-hidden="true" />
                      {booking.color}
                    </span>
                  ) : null}
                  {booking.brandName ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D0D5DD] bg-white px-2.5 py-1 text-xs font-semibold text-[#344054]">
                      <Smartphone className="h-3.5 w-3.5 text-[#98A2B3]" aria-hidden="true" />
                      {booking.brandName}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-dashed border-[#EAECF0] pt-4 text-xs font-semibold text-[#344054]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#15803D]" aria-hidden="true" />
                Genuine Device
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" aria-hidden="true" />
                {currentLabel}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 border-t border-dashed border-[#EAECF0] pt-3 text-xs text-[#667085] sm:grid-cols-2">
              <p>Customer: <span className="font-semibold text-[#344054]">{booking.customerName || 'Not available'}</span></p>
              {booking.customerMobile ? (
                <a href={`tel:${booking.customerMobile}`} className="flex items-center gap-1.5 font-semibold text-[#15803D]">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {booking.customerMobile}
                </a>
              ) : (
                <p>Mobile: <span className="font-semibold text-[#344054]">Not available</span></p>
              )}
              {amount != null ? (
                <p>Estimated Amount: <span className="font-semibold text-[#344054]">₹{Number(amount).toLocaleString('en-IN')}</span></p>
              ) : null}
            </div>
          </section>

          <section className="flex items-center gap-4 rounded-3xl border border-[#EAECF0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4]">
              <Clock className="h-6 w-6 text-[#15803D]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Current Status</p>
              <p className="truncate text-lg font-bold text-[#15803D]">{currentLabel}</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#EAECF0]">
                <div className="h-full rounded-full bg-[#15803D]" style={{ width: `${percent}%` }} />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">Step</p>
              <p className="text-sm font-bold text-[#101828]">{completed} / {flatSteps.length}</p>
              <p className="text-xs text-[#667085]">{percent}% complete</p>
            </div>
          </section>

          {latest ? (
            <section className="rounded-3xl border border-[#EAECF0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
              <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Latest Update</p>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#15803D] text-white">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#101828]">{currentStep?.label || humanizeStatus(latest.status)}</p>
                  {latest.createdAt ? (
                    <p className="mt-0.5 text-xs text-[#667085]">
                      {new Date(latest.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  ) : null}
                  {latest.note ? <p className="mt-1 text-sm text-[#344054]">{latest.note}</p> : null}
                </div>
              </div>
            </section>
          ) : null}

          <div className="-mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[#667085]">
            <span>
              {totalEvents} event{totalEvents === 1 ? '' : 's'}
              {lastSyncedAt ? ` · Synced ${lastSyncedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : ''}
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#15803D]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#15803D]" aria-hidden="true" />
              Live Updates
            </span>
          </div>

          <section className="rounded-3xl border border-[#EAECF0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#101828]">Service Timeline</p>
                <p className="text-xs text-[#667085]">Track each step of your device repair.</p>
              </div>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAECF0] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] transition hover:border-[#15803D] hover:text-[#15803D]"
              >
                <RefreshCw className={cx('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden="true" />
                Refresh
              </button>
            </div>

            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.key}>
                  <div
                    className={cx(
                      'mb-2 flex items-center justify-between rounded-xl px-3 py-2',
                      group.status === 'upcoming' ? 'bg-[#F9FAFB]' : 'bg-[#F0FDF4]',
                    )}
                  >
                    <p className={cx('text-sm font-bold', group.status === 'upcoming' ? 'text-[#98A2B3]' : 'text-[#15803D]')}>{group.label}</p>
                    <GroupBadge status={group.status} />
                  </div>

                  <ol className="space-y-0 pl-1">
                    {group.steps.map((step, i) => {
                      const last = i === group.steps.length - 1;
                      return (
                        <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
                          {!last ? (
                            <span
                              className={cx('absolute left-[11px] top-6 h-full w-[2px]', step.done ? 'bg-[#15803D]' : 'bg-[#EAECF0]')}
                              aria-hidden="true"
                            />
                          ) : null}
                          <span
                            className={cx(
                              'relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                              step.done ? 'bg-[#15803D] text-white' : 'bg-white text-[#98A2B3] ring-1 ring-[#D0D5DD]',
                            )}
                          >
                            {step.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className={cx('text-sm', step.done ? 'font-bold text-[#101828]' : 'font-semibold text-[#98A2B3]')}>{step.label}</p>
                              {step.current ? (
                                <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-[#15803D]">Now</span>
                              ) : !step.done ? (
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-sky-700">Upcoming</span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-xs text-[#98A2B3]">
                              {step.event?.createdAt
                                ? new Date(step.event.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                                : '--'}
                            </p>
                            {step.event?.note ? <p className="mt-1 text-sm text-[#344054]">{step.event.note}</p> : null}
                            {Array.isArray(step.event?.imageUrls) && step.event.imageUrls.length ? (
                              <div className="mt-2 grid grid-cols-3 gap-2 sm:max-w-xs">
                                {step.event.imageUrls.map((url, imgIndex) => (
                                  // eslint-disable-next-line @next/next/no-img-element -- technician-uploaded attachment URLs, not app assets.
                                  <img key={url || imgIndex} src={url} alt={`${step.label} attachment ${imgIndex + 1}`} className="aspect-square rounded-lg object-cover" />
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function DeviceThumb({ url }) {
  const [broken, setBroken] = useState(false);
  if (url && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- device photos are arbitrary shop-catalog URLs, not app assets Next can optimize.
      <img
        src={url}
        alt=""
        onError={() => setBroken(true)}
        className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-[#EAECF0]"
      />
    );
  }
  return <Icon3D icon={Smartphone} tone="green" size="xxl" />;
}
