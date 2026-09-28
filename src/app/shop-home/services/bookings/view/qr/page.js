'use client';

/**
 * /shop-home/services/bookings/view/qr/?id=… — QR E-Print for one booking.
 *
 * This is what the Bookings list's "Barcode" action opens (previously a
 * disabled placeholder — there's no barcode/label-printing endpoint on the
 * backend, but a QR slip needs no backend at all: it's a client-side render
 * of data this page already has, same as the shop's own "My QR Code" tab in
 * account/settings/page.js, which already uses the same `qrcode` package
 * this file uses.
 *
 * The QR encodes the booking's tracking number as plain text (there's no
 * public, unauthenticated "scan to view" URL for a booking anywhere in this
 * backend) — scanning it just hands a counter clerk the tracking number, the
 * same thing the "Present this QR code at the service counter" copy asks
 * for. Print is real — a real print window sized to the chosen label width —
 * not a decorative button.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Copy,
  Printer,
  ScanLine,
  ShieldCheck,
  Smartphone,
  User,
  Wrench,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import EmptyState from '@/components/shop-dashboard/EmptyState';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { fetchShopBookingDetail } from '@/lib/shopDashboard';

// Fixed physical label size — this is a real 38mm x 25mm thermal label
// (TVS LP 46 DLite Plus), not a user-selectable print size.
const LABEL_WIDTH = '38mm';
const LABEL_HEIGHT = '25mm';

// Minimal monochrome pictograms drawn as raw SVG markup (not React
// components — this string is written into a separate print window's
// document, not rendered through React) so the printed label needs no
// external icon font or asset: pure black fill/stroke, no gradients or
// gray, per the thermal-printer requirements below.
const PRINT_ICON_PERSON = '<svg viewBox="0 0 24 24" width="8" height="8"><circle cx="12" cy="8" r="4" fill="#000"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="#000"/></svg>';
const PRINT_ICON_PHONE = '<svg viewBox="0 0 24 24" width="8" height="8"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1.1.5 1.1 1.1V20c0 .6-.5 1.1-1.1 1.1C10.9 21.1 3 13.2 3 3.1 3 2.5 3.5 2 4.1 2h3.4C8.1 2 8.6 2.5 8.6 3.1c0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z" fill="#000"/></svg>';
const PRINT_ICON_LOCK = '<svg viewBox="0 0 24 24" width="8" height="8"><rect x="5" y="11" width="14" height="10" rx="2" fill="#000"/><path d="M8 11V7a4 4 0 018 0v4" stroke="#000" stroke-width="2" fill="none"/></svg>';
const PRINT_ICON_SMARTPHONE = '<svg viewBox="0 0 24 24" width="8" height="8"><rect x="6" y="2" width="12" height="20" rx="2" fill="#000"/><rect x="9.5" y="18" width="5" height="1.4" rx="0.7" fill="#fff"/></svg>';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Matches the "Thu, 24 Sep 2026 12:00 PM" format the printed label uses —
// compact enough for a 38mm x 25mm thermal label, unlike toLocaleString's
// longer localized forms.
function formatSlipDate(value) {
  if (!value) return 'Not available';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not available';
  const datePart = d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} ${timePart}`;
}

export default function BookingQrPage() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [printQrDataUrl, setPrintQrDataUrl] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

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
  const servicesText = services.map((s) => s.serviceName || s.serviceCode).filter(Boolean).join(', ') || 'Not specified';

  useEffect(() => {
    if (!trackingId) return undefined;
    let cancelled = false;
    QRCode.toDataURL(String(trackingId), { width: 320, margin: 1, color: { dark: '#14532D', light: '#FFFFFF' } })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {});
    // A second, pure-black rendering for the printed label only — the
    // on-screen preview keeps the brand-green QR above, but a thermal
    // printer needs true black modules (no dark-green-as-gray dithering)
    // with a generous quiet zone, per the label's print-quality requirements.
    QRCode.toDataURL(String(trackingId), { width: 320, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
      .then((url) => {
        if (!cancelled) setPrintQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [trackingId]);

  function showToast(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }

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

  function printSlip() {
    if (!printQrDataUrl) return;
    // The label shows the current date/time — when the slip is actually
    // printed — not the booking's original created-on date.
    const createdOn = formatSlipDate(new Date());
    const deviceLine = [booking?.brandName, booking?.deviceDisplayName || booking?.modelName].filter(Boolean).join(' ')
      || 'Device not specified';
    // Fixed 38mm x 25mm thermal label (TVS LP 46 DLite Plus) in 3 fixed
    // zones: service number + created date on top, QR (left) with
    // customer/phone/security (right) in the middle, device line on the
    // bottom — no headings, just values and pure-black icons, since the
    // counter clerk only needs to glance and scan.
    const slip = `
      <div class="slip">
        <div class="top">
          <p class="svc-no">${escapeHtml(trackingId)}</p>
          <p class="created">${escapeHtml(createdOn)}</p>
        </div>
        <div class="slip-body">
          <img src="${printQrDataUrl}" alt="QR code" />
          <div class="slip-details">
            <p class="row">${PRINT_ICON_PERSON}<span>${escapeHtml(booking?.customerName || 'Not available')}</span></p>
            <p class="row">${PRINT_ICON_PHONE}<span>${escapeHtml(booking?.customerMobile || 'Not available')}</span></p>
            <p class="row">${PRINT_ICON_LOCK}<span>${escapeHtml(booking?.deviceSecurityType || 'None')}</span></p>
          </div>
        </div>
        <div class="device-line">${PRINT_ICON_SMARTPHONE}<span>${escapeHtml(deviceLine)}</span></div>
      </div>`;
    const win = window.open('', '_blank', 'width=420,height=320');
    if (!win) {
      showToast('Allow pop-ups to print this slip.');
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>Service Slip — ${escapeHtml(trackingId)}</title>
      <style>
        @page { size: ${LABEL_WIDTH} ${LABEL_HEIGHT}; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; width: ${LABEL_WIDTH}; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .slip { width: ${LABEL_WIDTH}; height: ${LABEL_HEIGHT}; padding: 1mm 1.4mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; overflow: hidden; }
        .slip:last-child { page-break-after: auto; }
        .top { text-align: center; }
        .svc-no { margin: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.2px; line-height: 1.15; color: #000; }
        .created { margin: 0.4mm 0 0; font-size: 6.5px; font-weight: 700; line-height: 1.1; color: #000; }
        .slip-body { display: flex; align-items: center; gap: 1.2mm; flex: 1; min-height: 0; }
        .slip-body img { display: block; width: 13mm; height: 13mm; flex-shrink: 0; image-rendering: pixelated; }
        .slip-details { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.6mm; }
        .slip-details .row { margin: 0; display: flex; align-items: center; gap: 0.9mm; font-size: 6.5px; font-weight: 700; line-height: 1.15; color: #000; }
        .slip-details .row svg { flex-shrink: 0; }
        .slip-details .row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .device-line { margin: 0; display: flex; align-items: center; justify-content: center; gap: 1mm; font-size: 6.5px; font-weight: 800; line-height: 1.1; border-top: 0.3mm solid #000; padding-top: 0.6mm; color: #000; overflow: hidden; }
        .device-line span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      </style></head><body>${slip}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  return (
    <div className="flex flex-col gap-6">
      {toast ? (
        <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-xl bg-[#15803D] px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

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
          <h1 className="text-2xl font-bold tracking-tight text-[#101828] sm:text-[28px]">QR E-Print</h1>
          <p className="mt-1 text-sm text-[#667085]">Generate and print a QR slip for this booking.</p>
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
          <div className="h-28 animate-pulse rounded-3xl border border-[#EAECF0] bg-[#F9FAFB]" />
          <div className="h-24 animate-pulse rounded-3xl border border-[#EAECF0] bg-[#F9FAFB]" />
          <div className="h-[420px] animate-pulse rounded-3xl border border-[#EAECF0] bg-[#F9FAFB]" />
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : !booking ? (
        <EmptyState icon={AlertTriangle} tone="muted" title="Booking not found" description="We couldn't find this booking." />
      ) : (
        <>
          <section className="rounded-3xl border border-[#EAECF0] bg-[#F0FDF4] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-bold text-[#101828]">One Scan.<br />Complete Service Details.</p>
                <p className="mt-1 text-sm text-[#667085]">Faster service. Better tomorrow.</p>
              </div>
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#14532D] text-white">
                <ScanLine className="h-6 w-6" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#DCFCE7] pt-4 text-xs font-bold text-[#15803D]">
              {['Repair', 'Track', 'Resolve'].map((label) => (
                <span key={label} className="flex items-center gap-1.5 uppercase tracking-wide">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </section>

          <section className="flex items-center gap-4 rounded-3xl border border-[#EAECF0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0FDF4]">
              <Smartphone className="h-5 w-5 text-[#15803D]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Booking</p>
              <p className="text-lg font-bold text-[#101828]">Device</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-[#15803D]">#{trackingId}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[0.68rem] font-bold text-[#15803D]">
                  <Wrench className="h-3 w-3" aria-hidden="true" />
                  {services.length} service{services.length === 1 ? '' : 's'} added
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={copyTrackingId}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-bold text-[#344054] transition hover:border-[#15803D] hover:text-[#15803D]"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </section>

          <section className="overflow-hidden rounded-3xl border border-[#EAECF0] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
            <div className="flex items-center justify-between gap-3 bg-[#14532D] px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <ScanLine className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-base font-bold">QR Slip</p>
                  <p className="text-xs text-white/75">Scan to view service details</p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-wide text-white/90">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Authentic Service Slip
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2">
              <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#A7F3D0] bg-[#F9FDFB] p-5">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- generated data: URL, not a static asset.
                  <img src={qrDataUrl} alt={`QR code for booking ${trackingId}`} className="h-48 w-48" />
                ) : (
                  <div className="flex h-48 w-48 items-center justify-center text-xs text-[#98A2B3]">Generating…</div>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-3 py-1.5 text-xs font-bold text-[#15803D]">
                  <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
                  Scan to identify this booking
                </span>
                <p className="text-center text-xs text-[#98A2B3]">Present this QR code at the service counter for quick processing.</p>
              </div>

              <dl className="space-y-4">
                <DetailRow icon={ClipboardList} label="Service No." value={trackingId} />
                <DetailRow icon={User} label="Customer" value={booking.customerName || 'Not available'} />
                <DetailRow icon={Wrench} label="Repair Services" value={servicesText} />
                <DetailRow icon={ShieldCheck} label="Device Security" value={booking.deviceSecurityType || 'None'} />
                <DetailRow
                  icon={Calendar}
                  label="Created On"
                  value={booking.createdAt ? new Date(booking.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available'}
                />
              </dl>
            </div>

            <p className="border-t border-dashed border-[#EAECF0] py-3 text-center text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">
              Service Today · A Better Tomorrow
            </p>
          </section>

          <button
            type="button"
            onClick={printSlip}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#14532D] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#166534]"
          >
            <Printer className="h-4.5 w-4.5" aria-hidden="true" />
            Print QR Slip
          </button>
        </>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4]">
        <Icon className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">{label}</p>
        <p className="break-words text-sm font-bold text-[#101828]">{value}</p>
      </div>
    </div>
  );
}
