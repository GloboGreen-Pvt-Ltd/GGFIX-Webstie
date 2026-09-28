'use client';

/**
 * /shop-home/services/bookings/view/details/?id=… — Device Details for one
 * booking.
 *
 * What the Bookings list's "Details" action opens now (it used to just
 * toggle a small metadata strip inline — this is the full page the mobile
 * app's own Device Details screen shows). Same GET
 * {ORDER_BASE}/repair-bookings/shop/{id} the History/QR/Receipt pages use.
 *
 * "Service Schedule"'s Approx Ready / Delivery times are NOT backend fields
 * — nothing in this codebase's repair-booking model tracks an estimated
 * completion or handover time (confirmed: no such field anywhere in
 * shopBooking.js/shopDashboard.js/pickupWorkflow.js). They're computed
 * client-side from createdAt + a duration you pick, exactly like the
 * "Estimated Delivery" widget elsewhere in this app, and labelled as an
 * estimate rather than presented as saved data. Edit / Update Schedule /
 * Add IMEI / Assign Technician are disabled — there's no shop-side mutation
 * endpoint for any of them yet (shopBooking.js's createShopBooking is
 * itself still a stub; nothing downstream of it exists either).
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  HardDrive,
  IndianRupee,
  Palette,
  Pencil,
  Printer,
  ScanLine,
  Smartphone,
  Tag,
  UserCog,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import EmptyState from '@/components/shop-dashboard/EmptyState';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { fetchShopBookingDetail } from '@/lib/shopDashboard';
import { bookingEstimatedAmount } from '@/lib/bookingFormat';
import { buildTimelineGroups } from '@/lib/serviceTimeline';
import { guessColorHex } from '@/lib/colorSwatch';

const DURATIONS = [
  { value: 1, label: '1 hr' },
  { value: 2, label: '2 hr' },
  { value: 4, label: '4 hr' },
  { value: 24, label: '1 day' },
  { value: 48, label: '2 days' },
];

function humanizeStatus(status) {
  const s = String(status || '').trim();
  if (!s) return 'Status not available';
  return s
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="flex-1 rounded-2xl border border-[#EAECF0] bg-[#F9FAFB] p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-[#98A2B3]" aria-hidden="true" />
      <p className="mt-1.5 truncate text-sm font-bold text-[#101828]">{value || '—'}</p>
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#98A2B3]">{label}</p>
    </div>
  );
}

function EditButton({ label, title }) {
  return (
    <span
      title={title}
      className="inline-flex cursor-not-allowed items-center gap-1 rounded-full bg-[#F9FAFB] px-2.5 py-1 text-xs font-bold text-[#98A2B3]"
    >
      <Pencil className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

export default function BookingDetailsPage() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [durationHrs, setDurationHrs] = useState(2);

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    setLoading(true);
    setError('');
    fetchShopBookingDetail(id)
      .then((data) => {
        if (alive) setBooking(data);
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load this booking.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, reloadKey]);

  const trackingId = booking?.bookingNumber || booking?.id || id;
  const services = Array.isArray(booking?.services) ? booking.services : [];
  const amount = booking ? bookingEstimatedAmount(booking) : null;
  const total = amount != null ? amount : services.reduce((sum, s) => sum + Number(s.estimatedPrice || 0), 0);
  const deviceName = [booking?.brandName, booking?.deviceDisplayName || booking?.modelName].filter(Boolean).join(' ') || 'Device not specified';
  const colorHex = booking?.color ? guessColorHex(booking.color) : null;

  const currentLabel = useMemo(() => {
    if (!booking) return '';
    const flatSteps = buildTimelineGroups(booking).flatMap((g) => g.steps);
    const current = [...flatSteps].reverse().find((s) => s.done);
    return current?.label || humanizeStatus(booking.status);
  }, [booking]);

  const approxReady = booking?.createdAt ? new Date(new Date(booking.createdAt).getTime() + durationHrs * 3600 * 1000) : null;
  const delivery = approxReady ? new Date(approxReady.getTime() + 2 * 3600 * 1000) : null;

  const approvalRaw = booking?.customerApproval;
  const approved = approvalRaw === true || String(approvalRaw || '').toUpperCase() === 'DONE' || String(approvalRaw || '').toUpperCase() === 'APPROVED';

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
          <h1 className="text-2xl font-bold tracking-tight text-[#101828] sm:text-[28px]">Device Details</h1>
          <p className="mt-1 text-sm text-[#667085]">View complete information about this booking.</p>
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
          <div className="h-64 animate-pulse rounded-3xl border border-[#EAECF0] bg-[#F9FAFB]" />
          <div className="h-40 animate-pulse rounded-3xl border border-[#EAECF0] bg-[#F9FAFB]" />
          <div className="h-64 animate-pulse rounded-3xl border border-[#EAECF0] bg-[#F9FAFB]" />
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : !booking ? (
        <EmptyState icon={AlertTriangle} tone="muted" title="Booking not found" description="We couldn't find this booking." />
      ) : (
        <>
          <section className="rounded-3xl border border-[#EAECF0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
            <div className="flex items-start gap-4">
              <DeviceThumb url={booking.deviceImageUrl} />
              <div className="min-w-0 flex-1">
                <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Device</p>
                <p className="mt-0.5 text-lg font-bold text-[#101828]">{deviceName}</p>
                {booking.color ? (
                  <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#344054]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: colorHex }} aria-hidden="true" />
                    {booking.color}
                  </span>
                ) : null}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#F0FDF4] px-3 py-1.5 text-xs font-bold text-[#15803D]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" aria-hidden="true" />
                {currentLabel}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <InfoTile icon={Smartphone} label="Model" value={deviceName} />
              <InfoTile icon={HardDrive} label="Storage" value={booking.ramStorage} />
              <InfoTile icon={Palette} label="Colour" value={booking.color} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-dashed border-[#EAECF0] pt-4 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-[#344054]">
                <Tag className="h-3.5 w-3.5 text-[#98A2B3]" aria-hidden="true" />
                Tracking ID: <span className="font-bold text-[#101828]">#{trackingId}</span>
                <button type="button" onClick={copyTrackingId} aria-label="Copy tracking ID" className="text-[#98A2B3] hover:text-[#15803D]">
                  <Copy className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-[#344054]">
                <Calendar className="h-3.5 w-3.5 text-[#98A2B3]" aria-hidden="true" />
                Booked on: <span className="font-bold text-[#101828]">{booking.createdAt ? new Date(booking.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available'}</span>
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-orange-700">
                Booking: {humanizeStatus(booking.status)}
              </span>
            </div>
          </section>

          <section className="rounded-3xl border border-[#EAECF0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4]">
                <IndianRupee className="h-4.5 w-4.5 text-[#15803D]" aria-hidden="true" />
              </span>
              <p className="text-sm font-bold text-[#101828]">Price Summary</p>
            </div>

            <div className="mt-4 space-y-2">
              {services.length ? (
                services.map((s, i) => (
                  <div key={s.repairServiceId || i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-[#344054]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[0.65rem] font-bold text-[#15803D]">{i + 1}</span>
                      {s.serviceName || s.serviceCode || 'Service'}
                    </span>
                    <span className="font-bold text-[#101828]">{money(s.estimatedPrice)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#98A2B3]">No services listed</p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#F0FDF4] p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#15803D]">Estimated Total</p>
                <p className="text-xs text-[#667085]">Inclusive of all services</p>
              </div>
              <p className="text-xl font-extrabold text-[#101828]">{money(total)}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-[#EAECF0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4]">
                  <FileText className="h-4.5 w-4.5 text-[#15803D]" aria-hidden="true" />
                </span>
                <p className="text-sm font-bold text-[#101828]">Complaint Issue</p>
              </div>
              <EditButton label="Edit" title="Editing the complaint issue isn't available in the shop portal yet" />
            </div>
            <p className="mt-3 rounded-2xl bg-[#F9FAFB] p-3 text-sm text-[#344054]">
              {booking.issueSummary || booking.issueDescription || 'Not provided'}
            </p>
          </section>

          <section className="rounded-3xl border border-[#EAECF0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4]">
                  <Calendar className="h-4.5 w-4.5 text-[#15803D]" aria-hidden="true" />
                </span>
                <p className="text-sm font-bold text-[#101828]">Service Schedule</p>
              </div>
              <EditButton label="Update Schedule" title="This estimate isn't saved with the booking — there's no schedule field to update yet" />
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-[#98A2B3]">
              <span>Duration:</span>
              <select
                value={durationHrs}
                onChange={(e) => setDurationHrs(Number(e.target.value))}
                className="rounded-lg border border-[#D0D5DD] bg-white px-2 py-1 text-xs font-semibold text-[#344054] focus:border-[#15803D] focus:outline-none"
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <ol className="mt-3 space-y-0">
              <ScheduleRow icon={Clock} label="Approx. Ready" value={approxReady ? approxReady.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available'} caption="Expected completion time (estimate only)" />
              <ScheduleRow icon={Calendar} label="Delivery" value={delivery ? delivery.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available'} caption="Estimated handover time (estimate only)" />
              <ScheduleRow
                icon={ScanLine}
                label="IMEI"
                value={booking.imei || 'Not captured yet'}
                caption="Scan or enter IMEI to track device"
                action={<EditButton label="Add IMEI" title="Adding an IMEI after booking isn't available in the shop portal yet" />}
              />
              <ScheduleRow
                icon={CheckCircle2}
                label="Customer Approval"
                value={approved ? 'Approved' : 'Not yet approved'}
                last
              />
            </ol>
            <p className="mt-2 text-[0.65rem] text-[#98A2B3]">Approx. Ready / Delivery are estimates only — not saved with this booking.</p>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href={`/shop-home/services/bookings/view/qr/?id=${encodeURIComponent(booking.id)}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#15803D] bg-white px-5 py-3 text-sm font-bold text-[#15803D] transition hover:bg-[#F0FDF4]"
            >
              <Printer className="h-4.5 w-4.5" aria-hidden="true" />
              Print QR
            </Link>
            <button
              type="button"
              disabled
              title="Technician assignment isn't available in the shop portal yet"
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-[#F9FAFB] px-5 py-3 text-sm font-bold text-[#98A2B3]"
            >
              <UserCog className="h-4.5 w-4.5" aria-hidden="true" />
              Assign Technician
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ScheduleRow({ icon: Icon, label, value, caption, action, last }) {
  return (
    <li className={cx('relative flex gap-3 pb-5', last && 'pb-0')}>
      {!last ? <span className="absolute left-[11px] top-6 h-full w-[2px] bg-[#EAECF0]" aria-hidden="true" /> : null}
      <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#15803D] text-white">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">{label}</p>
          {action}
        </div>
        <p className="text-sm font-bold text-[#101828]">{value}</p>
        {caption ? <p className="text-xs text-[#98A2B3]">{caption}</p> : null}
      </div>
    </li>
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
        className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-[#EAECF0]"
      />
    );
  }
  return <Icon3D icon={Smartphone} tone="green" size="xl" />;
}
