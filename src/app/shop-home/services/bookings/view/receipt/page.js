'use client';

/**
 * /shop-home/services/bookings/view/receipt/?id=… — Booking Receipt for one
 * booking, laid out like the Partner app's "Share image" receipt card:
 * green GGFix header, tracking-ID card (date · time), Shop Information,
 * Customer Details, Device Details (model, variant, color, services,
 * status) and the Estimated Total.
 *
 * Every value is live:
 *   - booking   GET {ORDER_BASE}/repair-bookings/shop/{id}; it identifies the
 *               device only by ids, so the model name and variant label are
 *               resolved from master data (enrichWithCatalog +
 *               loadVariantOptions — the same lookups the Details page does).
 *   - shop      GET {AUTH_BASE}/auth/shops/{shopId}/public for the signed-in
 *               shop (name, mobile, front photo).
 *   - status    the Service History timeline's current step
 *               (src/lib/serviceTimeline.js), so both pages agree.
 *   - total     finalAmount ?? estimateAmount ?? bookingEstimatedAmount() —
 *               the same figure the Bookings card and Details page show.
 * Share to WhatsApp opens wa.me with the receipt as text to the customer's
 * number.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Hash,
  Layers,
  Palette,
  Phone,
  Smartphone,
  Store,
  User,
  Wrench,
} from 'lucide-react';

import EmptyState from '@/components/shop-dashboard/EmptyState';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { withHash } from '@/components/shop-dashboard/OrdersList';
import { fetchShopBookingDetail } from '@/lib/shopDashboard';
import { bookingEstimatedAmount } from '@/lib/bookingFormat';
import { buildTimelineGroups } from '@/lib/serviceTimeline';
import { enrichWithCatalog, loadVariantOptions, resolveMediaUrl, variantLabel } from '@/lib/deviceImage';
import { readShopOwner } from '@/lib/shopAuth';
import { getShopPublic } from '@/lib/repairBooking';

function humanizeStatus(status) {
  const s = String(status || '').trim();
  if (!s) return 'Status not available';
  return s
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function fmtDate(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
}
function fmtTime(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
}

/** "#CSPEN8858687" -> ["#CSPEN", "8858687"]: the letters print dark, the number green (as in the app). */
function splitTracking(ref) {
  const m = String(ref || '').match(/^(#?[A-Za-z]*)(.*)$/);
  return m ? [m[1], m[2]] : [String(ref || ''), ''];
}

function SectionLabel({ children }) {
  return <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#0F9D2E]">{children}</p>;
}

function DetailRow({ icon: Icon, label, value, accent, last }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 ${last ? '' : 'border-b border-[#ECECEC]'}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF8EC] text-[#0F9D2E]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="shrink-0 text-[13.5px] text-[#666666]">{label}</span>
      <span className={`ml-auto min-w-0 break-words text-right text-[14px] font-bold ${accent ? 'text-[#0F9D2E]' : 'text-[#111111]'}`}>{value}</span>
    </div>
  );
}

export default function BookingReceiptPage() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [variant, setVariant] = useState('');
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shopPhotoBroken, setShopPhotoBroken] = useState(false);

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    setLoading(true);
    setError('');
    fetchShopBookingDetail(id)
      .then(async (data) => {
        if (!data) return;
        const [[enriched], options] = await Promise.all([enrichWithCatalog([data]), loadVariantOptions()]);
        if (!alive) return;
        setBooking(enriched);
        setVariant(variantLabel(data, options));
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

  // The signed-in shop's public record — Shop Information on the receipt.
  useEffect(() => {
    const shopId = readShopOwner()?.shopId;
    if (!shopId) return undefined;
    let alive = true;
    getShopPublic(shopId).then((data) => alive && data && setShop(data));
    return () => {
      alive = false;
    };
  }, []);

  const trackingId = withHash(booking?.bookingNumber || booking?.id || id);
  const [trackPrefix, trackNumber] = splitTracking(trackingId);
  const services = Array.isArray(booking?.services) ? booking.services : [];
  const servicesText = services.map((s) => s.serviceName || s.serviceCode).filter(Boolean).join(', ') || booking?.issueSummary || 'Not listed';
  const servicesSum = services.reduce((sum, s) => sum + Number(s.estimatedPrice || 0), 0);
  const total = booking ? booking.finalAmount ?? booking.estimateAmount ?? bookingEstimatedAmount(booking) ?? servicesSum : 0;

  const brand = booking?.brandName || '';
  const rawModel = booking?.deviceDisplayName || booking?.modelName || '';
  // deviceDisplayName may already carry the variant ("Model · 8GB + 128GB"); keep just the model.
  const modelOnly = rawModel.split(' · ')[0];
  const modelName = brand && modelOnly && !modelOnly.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${modelOnly}` : modelOnly;

  const shopName = shop?.shopName || shop?.name || 'Your shop';
  const shopPhone = shop?.mobile || shop?.phone || shop?.contactNumber || '';
  const shopPhoto = resolveMediaUrl(shop?.frontImageUrl || shop?.bannerImageUrl || shop?.logoUrl || shop?.imageUrl);

  const currentLabel = useMemo(() => {
    if (!booking) return '';
    const flatSteps = buildTimelineGroups(booking).flatMap((g) => g.steps);
    const current = [...flatSteps].reverse().find((s) => s.done);
    return current?.label || humanizeStatus(booking.status);
  }, [booking]);

  const deviceRows = booking
    ? [
        { icon: Smartphone, label: 'Model', value: modelName || 'Not specified' },
        variant ? { icon: Layers, label: 'Variant', value: variant } : null,
        booking.color ? { icon: Palette, label: 'Color', value: booking.color } : null,
        { icon: Wrench, label: 'Services', value: servicesText },
        { icon: CheckCircle2, label: 'Status', value: currentLabel, accent: true },
      ].filter(Boolean)
    : [];

  function copyTrackingId() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(trackingId)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  }

  function receiptText() {
    return [
      `*GGFix — Booking Receipt*`,
      `Tracking ID: ${trackingId}`,
      `Date: ${fmtDate(booking.createdAt)} ${fmtTime(booking.createdAt)}`,
      '',
      `*Shop:* ${shopName}${shopPhone ? ` (${shopPhone})` : ''}`,
      `*Customer:* ${booking.customerName || '—'} · ${booking.customerMobile || '—'}`,
      `*Device:* ${[modelName, variant, booking.color].filter(Boolean).join(' · ') || 'Not specified'}`,
      `*Services:* ${servicesText}`,
      `*Status:* ${currentLabel}`,
      '',
      `*Estimated Total:* ${money(total)}`,
    ].join('\n');
  }

  function shareWhatsApp() {
    if (!booking) return;
    const digits = String(booking.customerMobile || '').replace(/\D/g, '');
    const to = digits.length === 10 ? `91${digits}` : digits;
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(receiptText())}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ECECEC] bg-white text-[#344054] transition hover:border-[#0F9D2E] hover:text-[#0F9D2E]"
        >
          <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#111111]">Receipt</h1>
          <p className="mt-0.5 text-sm text-[#666666]">Share this booking receipt with the customer.</p>
        </div>
        <button
          type="button"
          onClick={copyTrackingId}
          className="mt-1 inline-flex min-w-0 max-w-[45%] shrink-0 items-center gap-1.5 rounded-full sm:max-w-none bg-[#F8F8F8] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#0F9D2E] transition hover:bg-[#F3F3F3]"
        >
          <span className="truncate">{trackingId}</span>
          <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {copied ? 'Copied' : ''}
        </button>
      </div>

      {loading ? (
        <div className="mx-auto w-full max-w-[460px] space-y-4">
          <div className="h-40 animate-pulse rounded-[28px] border border-[#ECECEC] bg-[#F8F8F8]" />
          <div className="h-96 animate-pulse rounded-[28px] border border-[#ECECEC] bg-[#F8F8F8]" />
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : !booking ? (
        <EmptyState icon={AlertTriangle} tone="muted" title="Booking not found" description="We couldn't find this booking." />
      ) : (
        <div className="mx-auto w-full max-w-[460px]">
          <article className="overflow-hidden rounded-[28px] border border-[#ECECEC] bg-white shadow-[0_12px_32px_rgba(16,24,40,0.10)]">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#16A34A] to-[#0F8A2A] px-6 pb-16 pt-6 text-white">
              <span className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border-[18px] border-white/10" aria-hidden="true" />
              <span className="pointer-events-none absolute -bottom-10 right-20 h-24 w-24 rounded-full bg-white/10" aria-hidden="true" />
              <div className="relative flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 ring-4 ring-white/25">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static brand logo. */}
                  <img src="/logo.png" alt="GGFix" className="h-full w-full rounded-full object-contain" />
                </span>
                <div>
                  <p className="text-[26px] font-extrabold leading-tight">GGFix</p>
                  <p className="text-[14px] text-white/90">Booking Receipt</p>
                </div>
              </div>
            </div>

            <div className="relative -mt-12 px-5">
              {/* Tracking card */}
              <div className="rounded-2xl border border-[#ECECEC] bg-white px-4 py-4 text-center shadow-sm">
                <p className="flex items-center justify-center gap-1 text-[11.5px] font-bold uppercase tracking-[0.18em] text-[#666666]">
                  <Hash className="h-3.5 w-3.5" aria-hidden="true" />
                  Tracking ID
                </p>
                <p className="mt-1 break-all text-[24px] font-extrabold tracking-tight text-[#111111]">
                  {trackPrefix}
                  <span className="text-[#0F9D2E]">{trackNumber}</span>
                </p>
                <p className="mt-1 flex flex-wrap items-center justify-center gap-3 text-[13.5px] font-semibold text-[#344054]">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-[#0F9D2E]" aria-hidden="true" />
                    {fmtDate(booking.createdAt) || '—'}
                  </span>
                  <span className="h-4 w-px bg-[#ECECEC]" aria-hidden="true" />
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#0F9D2E]" aria-hidden="true" />
                    {fmtTime(booking.createdAt) || '—'}
                  </span>
                </p>
              </div>

              {/* Shop */}
              <div className="mt-6">
                <SectionLabel>Shop Information</SectionLabel>
                <div className="mt-3 flex items-center gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EAF8EC] text-[#0F9D2E] ring-2 ring-[#ECECEC]">
                    {shopPhoto && !shopPhotoBroken ? (
                      // eslint-disable-next-line @next/next/no-img-element -- shop photo from the media service.
                      <img src={shopPhoto} alt="" onError={() => setShopPhotoBroken(true)} className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-6 w-6" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-extrabold text-[#111111]">{shopName}</p>
                    {shopPhone ? (
                      <p className="mt-0.5 flex items-center gap-1.5 text-[14px] font-semibold text-[#475467]">
                        <Phone className="h-4 w-4 text-[#0F9D2E]" aria-hidden="true" />
                        {shopPhone}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div className="mt-6">
                <SectionLabel>Customer Details</SectionLabel>
                <div className="mt-1">
                  <DetailRow icon={User} label="Name" value={booking.customerName || 'Not available'} />
                  <DetailRow icon={Phone} label="Mobile" value={booking.customerMobile || 'Not available'} last />
                </div>
              </div>

              {/* Device */}
              <div className="mt-5">
                <SectionLabel>Device Details</SectionLabel>
                <div className="mt-1">
                  {deviceRows.map((r, i) => (
                    <DetailRow key={r.label} icon={r.icon} label={r.label} value={r.value} accent={r.accent} last={i === deviceRows.length - 1} />
                  ))}
                </div>
              </div>

              <div className="my-4 border-t-2 border-dashed border-[#ECECEC]" aria-hidden="true" />

              {/* Total */}
              <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-[#BFE5C8] bg-[#EAF8EC] px-5 py-4">
                <div>
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#475467]">Estimated Total</p>
                  <p className="text-[16px] font-extrabold text-[#111111]">Repair Estimate</p>
                </div>
                <p className="shrink-0 text-[26px] font-extrabold text-[#0F9D2E]">{money(total)}</p>
              </div>
            </div>
            <div className="h-1.5 bg-[#0F9D2E]" aria-hidden="true" />
          </article>

          <div className="mt-4">
            <button
              type="button"
              onClick={shareWhatsApp}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-5 text-[14.5px] font-bold text-white transition hover:bg-[#15803D]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.75-.71 2-1.4.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.44 9.43m8.03-17.46A11.3 11.3 0 0 0 12.05.7C5.8.7.7 5.79.7 12.05c0 2 .52 3.95 1.52 5.67L.6 23.3l5.72-1.5a11.3 11.3 0 0 0 5.72 1.46h.01c6.25 0 11.35-5.1 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02" />
              </svg>
              Share to WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
