'use client';

/**
 * /shop-home/services/bookings/view/details/?id=… — Device Details for one
 * booking. Opened by the Bookings list's "Details" action and by the
 * dashboard's Recent Bookings cards.
 *
 * Data: GET {ORDER_BASE}/repair-bookings/shop/{id} (RepairBookingResponse —
 * field names below are from the order-service's published OpenAPI spec).
 * That response identifies the device only by brandId/modelId and the
 * ram/storage option ids, so names, the model photo and the variant label
 * are resolved from public master data (enrichWithCatalog, plus
 * /master/ram-options and /master/storage-options — the same lookups the
 * customer My Orders screen does). Nothing is written.
 *
 * Price: the services' estimatedPrice rows plus the booking's own
 * finalAmount / estimateAmount — shown as the backend stored them, never
 * recomputed. Schedule: the repair ticket's estimatedReadyAt /
 * estimatedDeliveryAt (GET /tickets/{id} — set from the Bookings card's
 * Re-Schedule), else the booking's own copy, when the
 * backend has them; otherwise an estimate from createdAt + a duration you
 * pick, clearly labelled as not saved. The page has no bottom action row
 * (Share / History / Print QR / Assign / Return were removed on request —
 * Assign and the rest stay on the Bookings cards). Update Schedule / Add IMEI / Edit stay disabled: the
 * order-service exposes no shop-side endpoint for any of them.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Copy,
  FileText,
  IndianRupee,
  Pencil,
  ScanLine,
  Smartphone,
  Store,
  Tag,
  Truck,
  UserCog,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import EmptyState from '@/components/shop-dashboard/EmptyState';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { fetchShopBookingDetail, fetchTicket } from '@/lib/shopDashboard';
import { bookingEstimatedAmount } from '@/lib/bookingFormat';
import { buildTimelineGroups } from '@/lib/serviceTimeline';
import { guessColorHex } from '@/lib/colorSwatch';
import { enrichWithCatalog, getDeviceImage, loadVariantOptions, resolveMediaUrl, variantLabel } from '@/lib/deviceImage';

const CARD = 'rounded-[18px] border border-[#ECECEC] bg-[#F8F8F8]';

function humanize(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  return s
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Backend booking numbers already start with "#"; never show "##". */
function withHash(ref) {
  const s = String(ref ?? '').trim().replace(/^#+/, '');
  return s ? `#${s}` : '';
}

function dateParts(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

function SectionTitle({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F3F3] text-[#079455]">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[15px] font-bold text-[#111111]">{title}</p>
          {subtitle ? <p className="text-[12.5px] text-[#666666]">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function DisabledAction({ label, title }) {
  return (
    <span title={title} className="inline-flex shrink-0 cursor-not-allowed items-center gap-1 rounded-lg bg-[#F3F3F3] px-2.5 py-1 text-[12px] font-bold text-[#98A2B3]">
      <Pencil className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function InfoBlock({ icon: Icon, label, value, caption, action }) {
  return (
    <div className={cx(CARD, 'flex items-start gap-3 p-4')}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F3F3] text-[#079455]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#98A2B3]">{label}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[15px] font-bold text-[#111111]">
          <span className="truncate">{value || '—'}</span>
          {action}
        </p>
        {caption ? <p className="truncate text-[12.5px] text-[#666666]">{caption}</p> : null}
      </div>
    </div>
  );
}

function DeviceImage({ src }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return (
    <span className="flex h-40 w-full shrink-0 items-center justify-center rounded-2xl bg-[#F8F8F8] p-4 sm:h-44 sm:w-44">
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote catalog photo, not an app asset Next can optimize.
        <img src={src} alt="" onError={() => setBroken(true)} className="h-full w-full object-contain object-center" />
      ) : (
        <Smartphone className="h-14 w-14 text-[#079455]/50" aria-hidden="true" />
      )}
    </span>
  );
}

function ScheduleRow({ icon: Icon, label, value, caption, action, last }) {
  return (
    <li className={cx('relative flex gap-3 pb-5', last && 'pb-0')}>
      {!last ? <span className="absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-[2px] bg-[#F3F3F3]" aria-hidden="true" /> : null}
      <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#079455] text-white">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#98A2B3]">{label}</p>
          {action}
        </div>
        <p className="break-words text-[14px] font-bold text-[#111111]">{value}</p>
        {caption ? <p className="text-[12px] text-[#98A2B3]">{caption}</p> : null}
      </div>
    </li>
  );
}

export default function BookingDetailsPage() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [variant, setVariant] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState('');
  const [durationHrs, setDurationHrs] = useState(2);
  // Schedule saved on the repair ticket (the booking copy can lag behind it).
  const [ticketSchedule, setTicketSchedule] = useState({ readyAt: null, deliveryAt: null });

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    setLoading(true);
    setError('');
    fetchShopBookingDetail(id)
      .then(async (data) => {
        if (!data) return;
        // Fill device name/photo from the master catalog, and the variant
        // label from the ram/storage option ids — the booking has only ids.
        const [[enriched], options] = await Promise.all([enrichWithCatalog([data]), loadVariantOptions()]);
        if (!alive) return;
        setBooking(enriched);
        setVariant(variantLabel(data, options));
        if (data.estimatedDurationHours) setDurationHrs(Number(data.estimatedDurationHours));
        if (data.ticketId) {
          fetchTicket(data.ticketId)
            .then((t) => alive && setTicketSchedule({ readyAt: t?.estimatedReadyAt || null, deliveryAt: t?.estimatedDeliveryAt || null }))
            .catch(() => {});
        }
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

  const trackingId = withHash(booking?.bookingNumber || booking?.id || id);
  const technicianName = booking?.technicianName || '';
  const services = Array.isArray(booking?.services) ? booking.services : [];
  const servicesSum = services.reduce((sum, s) => sum + Number(s.estimatedPrice || 0), 0);
  const total = booking ? booking.finalAmount ?? booking.estimateAmount ?? bookingEstimatedAmount(booking) ?? servicesSum : 0;
  const totalCaption = booking?.finalAmount != null ? 'Final amount' : 'Inclusive of all services';

  const model = booking?.deviceDisplayName || booking?.modelName || '';
  const brand = booking?.brandName || '';
  const modelLine = brand && model.toLowerCase().startsWith(brand.toLowerCase()) ? model.slice(brand.length).trim() || model : model;
  // Model photo first, then this booking's own device photo, then brand/category art.
  const image = booking ? resolveMediaUrl(booking.deviceImageUrl) || resolveMediaUrl(booking.frontImageUrl) || getDeviceImage(booking) : null;
  const colorHex = booking?.color ? guessColorHex(booking.color) : null;

  const currentLabel = useMemo(() => {
    if (!booking) return '';
    const flatSteps = buildTimelineGroups(booking).flatMap((g) => g.steps);
    const current = [...flatSteps].reverse().find((s) => s.done);
    return current?.label || humanize(booking.status) || 'Status not available';
  }, [booking]);

  const booked = dateParts(booking?.createdAt);
  const readySrc = ticketSchedule.readyAt || booking?.estimatedReadyAt;
  const deliverySrc = ticketSchedule.deliveryAt || booking?.estimatedDeliveryAt;
  const savedReady = readySrc ? new Date(readySrc) : null;
  const savedDelivery = deliverySrc ? new Date(deliverySrc) : null;
  const hasSavedSchedule = Boolean(savedReady || savedDelivery);
  const estReady = booking?.createdAt ? new Date(new Date(booking.createdAt).getTime() + durationHrs * 3600 * 1000) : null;
  const estDelivery = estReady ? new Date(estReady.getTime() + 2 * 3600 * 1000) : null;
  const delivery = savedDelivery || (hasSavedSchedule ? null : estDelivery);
  const fmt = (d) => (d ? d.toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not set');

  const approvalRaw = String(booking?.customerApproval ?? '').toUpperCase();
  const approval =
    booking?.customerApproval === true || ['DONE', 'APPROVED'].includes(approvalRaw)
      ? 'Approved'
      : approvalRaw
        ? humanize(approvalRaw)
        : 'Pending';

  function copy(text, key) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(key);
        setTimeout(() => setCopied(''), 1600);
      })
      .catch(() => {});
  }

  return (
    <div className="-m-4 min-h-full space-y-4 bg-white p-4 sm:-m-6 sm:p-6">
      {/* ---- Header ---------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#ECECEC] bg-white px-3 text-[13.5px] font-semibold text-[#344054] transition hover:border-[#079455] hover:text-[#079455]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        <div className="min-w-0 flex-1 basis-48">
          <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-[#111111] sm:text-[28px]">Device Details</h1>
          <p className="text-[13.5px] text-[#666666]">View complete information about this service.</p>
        </div>
        {trackingId ? (
          <button
            type="button"
            onClick={() => copy(trackingId, 'badge')}
            title="Copy service number"
            className="inline-flex min-w-0 max-w-full shrink-0 items-center gap-1.5 rounded-xl bg-[#F3F3F3] px-3.5 py-2 text-[13px] font-bold tracking-wide text-[#067647] transition hover:bg-[#F3F3F3]"
          >
            <span className="truncate">{trackingId}</span>
            <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {copied === 'badge' ? <span className="text-[11px] font-semibold">Copied</span> : null}
          </button>
        ) : null}
      </div>

      {!id ? (
        <EmptyState icon={AlertTriangle} tone="muted" title="No booking selected" description="Open a booking from Recent Bookings or the Bookings list." />
      ) : loading ? (
        <div className="space-y-4">
          <div className={cx(CARD, 'h-52 animate-pulse bg-[#F8F8F8]')} />
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cx(CARD, 'h-20 animate-pulse bg-[#F8F8F8]')} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={cx(CARD, 'h-64 animate-pulse bg-[#F8F8F8]')} />
            <div className={cx(CARD, 'h-64 animate-pulse bg-[#F8F8F8]')} />
          </div>
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : !booking ? (
        <EmptyState icon={AlertTriangle} tone="muted" title="Booking not found" description="We couldn't find this booking." />
      ) : (
        <>
          {/* ---- Device card --------------------------------------------- */}
          <section className={cx(CARD, 'flex flex-col gap-5 p-5 sm:flex-row sm:items-center')}>
            <DeviceImage src={image} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">Device</p>
              {brand ? <p className="mt-1 text-[15px] font-semibold text-[#475467]">{brand}</p> : null}
              <p className="break-words text-[24px] font-extrabold leading-tight tracking-tight text-[#111111]">{modelLine || model || 'Device not specified'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {variant ? <span className="rounded-lg bg-[#F3F3F3] px-2.5 py-1 text-[12.5px] font-semibold text-[#344054]">{variant}</span> : null}
                {booking.color ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F3F3F3] px-2.5 py-1 text-[12.5px] font-semibold text-[#344054]">
                    <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: colorHex }} aria-hidden="true" />
                    {booking.color}
                  </span>
                ) : null}
                {technicianName ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF7FF] px-2.5 py-1 text-[12.5px] font-semibold text-[#175CD3]">
                    <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                    {technicianName}
                  </span>
                ) : null}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#FEF0C7] px-3.5 py-1.5 text-[13px] font-bold text-[#B54708]">
              <span className="h-2 w-2 rounded-full bg-[#F79009]" aria-hidden="true" />
              {currentLabel}
            </span>
          </section>

          {/* ---- Tracking info ------------------------------------------- */}
          <div className="grid gap-4 md:grid-cols-3">
            <InfoBlock
              icon={Tag}
              label="Tracking ID"
              value={trackingId}
              caption={copied === 'tracking' ? 'Copied' : 'Tap the icon to copy'}
              action={
                <button type="button" onClick={() => copy(trackingId, 'tracking')} aria-label="Copy tracking ID" className="-m-1.5 shrink-0 p-1.5 text-[#98A2B3] hover:text-[#079455]">
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              }
            />
            <InfoBlock icon={Calendar} label="Booked On" value={booked?.date || 'Not available'} caption={booked?.time} />
            <InfoBlock
              icon={booking.serviceMode === 'PICKUP' ? Truck : Store}
              label="Booking"
              value={booking.customerUserId ? 'Booked by Customer' : 'Created by Shop'}
              caption={[humanize(booking.serviceMode), humanize(booking.status)].filter(Boolean).join(' · ')}
            />
          </div>

          {/* ---- Two columns --------------------------------------------- */}
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <section className={cx(CARD, 'p-5')}>
                <SectionTitle icon={IndianRupee} title="Price Summary" subtitle="Breakdown of services and charges" />
                <div className="mt-4 divide-y divide-[#ECECEC]">
                  {services.length ? (
                    services.map((s, i) => (
                      <div key={s.repairServiceId || i} className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
                        <span className="flex min-w-0 items-center gap-2.5 text-[#344054]">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F3F3F3] text-[11px] font-bold text-[#079455]">{i + 1}</span>
                          <span className="truncate">{s.serviceName || s.serviceCode || 'Service'}</span>
                        </span>
                        <span className="shrink-0 font-bold text-[#111111]">{money(s.estimatedPrice)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-[13.5px] text-[#98A2B3]">No services listed</p>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#F3F3F3] p-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#067647]">Estimated Total</p>
                    <p className="text-[12.5px] text-[#666666]">{totalCaption}</p>
                  </div>
                  <p className="shrink-0 text-[22px] font-extrabold text-[#111111]">{money(total)}</p>
                </div>
              </section>

              <section className={cx(CARD, 'p-5')}>
                <SectionTitle
                  icon={FileText}
                  title="Complaint Issue"
                  subtitle="Customer reported issue for this device"
                  action={<DisabledAction label="Edit" title="Editing the complaint issue isn't available in the shop portal yet" />}
                />
                <p className="mt-4 whitespace-pre-line break-words rounded-2xl bg-[#F8F8F8] p-4 text-[14px] leading-relaxed text-[#344054]">
                  {booking.issueSummary || booking.issueDescription || 'Not provided'}
                </p>
                {booking.missingDamageParts ? (
                  <p className="mt-2 break-words text-[12.5px] text-[#666666]">
                    <span className="font-semibold text-[#344054]">Missing / damaged parts:</span> {booking.missingDamageParts}
                  </p>
                ) : null}
              </section>
            </div>

            <section className={cx(CARD, 'p-5')}>
              <SectionTitle
                icon={CalendarClock}
                title="Service Schedule"
                subtitle={hasSavedSchedule ? 'As saved with this booking' : 'Estimate — not saved with this booking'}
              />
              <ol className="mt-4">
                <ScheduleRow icon={Calendar} label="Delivery" value={fmt(delivery)} caption={hasSavedSchedule ? 'Estimated handover time' : 'Estimated handover time (estimate only)'} />
                <ScheduleRow
                  icon={ScanLine}
                  label="IMEI"
                  value={booking.imei || 'Not captured yet'}
                  caption="Scan or enter IMEI to track device"
                  action={<DisabledAction label="Add IMEI" title="Adding an IMEI after booking isn't available in the shop portal yet" />}
                />
                <ScheduleRow icon={CheckCircle2} label="Customer Approval" value={approval} last />
              </ol>
            </section>
          </div>

        </>
      )}
    </div>
  );
}
