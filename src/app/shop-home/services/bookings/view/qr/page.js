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
 * for. Print is real — a real print window sized to the label — not a
 * decorative button.
 *
 * Data: the booking (GET repair-bookings/shop/{id}) filled from master data
 * (enrichWithCatalog: brand, model name, model photo), then its repair
 * ticket (GET /tickets/{id}) only to fill gaps — tracking no., device name,
 * customer, security value, created date. The label follows the Partner
 * app's (BarcodePrintScreen / LabelPreview): service number on top, QR left
 * with brand+model / customer / security right, booking date + time at the
 * bottom. Page Setup offers the app's two label stocks (BarCode 38 x 25 mm,
 * BarCode1 50 x 25 mm); each option previews that same markup and CSS at its
 * own size, and the picked one is what prints.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
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
import ImagePreviewModal from '@/components/shop-dashboard/ImagePreviewModal';
import { DeviceThumb } from '@/components/shop-dashboard/OrdersList';
import { enrichWithCatalog, resolveMediaUrl } from '@/lib/deviceImage';
import { fetchShopBookingDetail, fetchTicket } from '@/lib/shopDashboard';
import { notifyError } from '@/lib/toast';

// Page Setup presets — the Partner app's services/printer/labelPresets.js.
// Names and sizes mirror the TVS LP-46 Dlite driver's own stock list
// ("BarCode (38.0mm x 25.0mm)", "BarCode1 (50.0mm x 25.0mm)"). The shop picks
// the stock loaded in the printer; the pick is remembered in this browser,
// as the app remembers it on the device.
const LABEL_PRESETS = [
  { id: 'barcode', name: 'BarCode', widthMm: 38, heightMm: 25 },
  { id: 'barcode1', name: 'BarCode1', widthMm: 50, heightMm: 25 },
];
const DEFAULT_PRESET = LABEL_PRESETS[0];
const PRESET_STORAGE_KEY = 'ggfix.labelPreset';
const getPreset = (id) => LABEL_PRESETS.find((p) => p.id === id) || DEFAULT_PRESET;
/** "38.0 mm × 25.0 mm" */
const presetSizeText = (p) => `${p.widthMm.toFixed(1)} mm × ${p.heightMm.toFixed(1)} mm`;

// Minimal monochrome pictograms drawn as raw SVG markup (not React
// components — this string is written into a separate print window's
// document, not rendered through React) so the printed label needs no
// external icon font or asset: pure black fill/stroke, no gradients or
// gray, per the thermal-printer requirements below.
const PRINT_ICON_PERSON = '<svg viewBox="0 0 24 24" width="8" height="8"><circle cx="12" cy="8" r="4" fill="#000"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="#000"/></svg>';
const PRINT_ICON_LOCK = '<svg viewBox="0 0 24 24" width="8" height="8"><rect x="5" y="11" width="14" height="10" rx="2" fill="#000"/><path d="M8 11V7a4 4 0 018 0v4" stroke="#000" stroke-width="2" fill="none"/></svg>';
const PRINT_ICON_SMARTPHONE = '<svg viewBox="0 0 24 24" width="8" height="8"><rect x="6" y="2" width="12" height="20" rx="2" fill="#000"/><rect x="9.5" y="18" width="5" height="1.4" rx="0.7" fill="#fff"/></svg>';

// One stylesheet for the printed label and the on-screen preview, so the
// preview is the label itself, not an approximation of it. Three fixed
// zones: service number (top), QR + three detail rows (body), booking date
// + time (bottom) — no headings, pure black, everything on one line except
// a long brand + model, which may take two. The size comes from the preset
// (--ggl-w / --ggl-h, set on each label by labelMarkup).
const LABEL_CSS = `
  .ggl { width: var(--ggl-w); height: var(--ggl-h); padding: 1mm 1.4mm; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5mm; overflow: hidden; box-sizing: border-box; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ggl * { box-sizing: border-box; }
  .ggl p { margin: 0; color: #000; }
  .ggl-no { text-align: center; font-size: 9px; font-weight: 800; letter-spacing: 0.2px; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ggl-body { display: flex; align-items: center; gap: 1.2mm; flex: 1; min-height: 0; }
  .ggl-body img { display: block; width: 15mm; height: 15mm; flex-shrink: 0; image-rendering: pixelated; }
  .ggl-rows { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.7mm; }
  .ggl-row { display: flex; align-items: center; gap: 0.9mm; font-size: 6.5px; font-weight: 700; line-height: 1.15; }
  .ggl-row svg { flex-shrink: 0; }
  .ggl-row span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ggl-row.ggl-device { font-weight: 800; }
  .ggl-row.ggl-device span { white-space: normal; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .ggl-date { text-align: center; font-size: 6.5px; font-weight: 700; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

// On-screen preview: the real-size label scaled up, ratio kept exactly to the
// preset (the wrapper carries the same --ggl-w / --ggl-h as the label).
const PREVIEW_CSS = `
  .ggl-preview { --ggl-scale: 1.25; width: calc(var(--ggl-w) * var(--ggl-scale)); height: calc(var(--ggl-h) * var(--ggl-scale)); overflow: hidden; }
  .ggl-preview > .ggl { transform: scale(var(--ggl-scale)); transform-origin: top left; }
  @media (min-width: 1024px) { .ggl-preview { --ggl-scale: 1.5; } }
`;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** One label's markup at the preset's size — every value escaped; shared by print and preview. */
function labelMarkup({ preset, qrSrc, trackingNo, brandModel, customerName, security, createdOn }) {
  return `<div class="ggl" style="--ggl-w:${preset.widthMm}mm;--ggl-h:${preset.heightMm}mm">
    <p class="ggl-no">${escapeHtml(trackingNo)}</p>
    <div class="ggl-body">
      <img src="${escapeHtml(qrSrc)}" alt="QR code" />
      <div class="ggl-rows">
        <p class="ggl-row ggl-device">${PRINT_ICON_SMARTPHONE}<span>${escapeHtml(brandModel)}</span></p>
        <p class="ggl-row">${PRINT_ICON_PERSON}<span>${escapeHtml(customerName)}</span></p>
        <p class="ggl-row">${PRINT_ICON_LOCK}<span>${escapeHtml(security)}</span></p>
      </div>
    </div>
    <p class="ggl-date">${createdOn ? `${escapeHtml(createdOn.date)}&nbsp;&nbsp;${escapeHtml(createdOn.time)}` : ''}</p>
  </div>`;
}

// Same as the Partner app's BarcodePrintScreen: "PIN · 1234", "Password · x",
// "Pattern · 1,2,3,6" (kept as stored so it can be redrawn), else "None".
function formatSecurity(type, value) {
  const t = String(type || 'NONE').toUpperCase();
  if (t === 'NONE') return 'None';
  const label = t === 'PIN' ? 'PIN' : t === 'PASSWORD' ? 'Password' : t === 'PATTERN' ? 'Pattern' : t.charAt(0) + t.slice(1).toLowerCase();
  const v = value == null ? '' : String(value).trim();
  return v ? `${label} · ${v}` : label;
}

// Booking's created-on stamp, as the app prints it: { date: "Fri, 2 Oct 2026", time: "4:07 PM" }.
function fmtCreatedOn(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const wd = d.toLocaleDateString('en-US', { weekday: 'short' });
  const mo = d.toLocaleDateString('en-US', { month: 'short' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return { date: `${wd}, ${d.getDate()} ${mo} ${d.getFullYear()}`, time };
}

/** "Brand Model", without repeating a brand the model name already starts with. */
function joinBrandModel(brand, model) {
  const b = String(brand || '').trim();
  const m = String(model || '').trim();
  if (!m) return b;
  return b && !m.toLowerCase().startsWith(b.toLowerCase()) ? `${b} ${m}` : m;
}

export default function BookingQrPage() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [printQrDataUrl, setPrintQrDataUrl] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const closePreview = useCallback(() => setPreviewing(false), []);
  const [presetId, setPresetId] = useState(DEFAULT_PRESET.id);
  const preset = getPreset(presetId);

  // Read after mount (not in the initializer) so the server render and the
  // first client render agree; storage may be blocked, which just means 38 x 25.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (saved) setPresetId(getPreset(saved).id);
    } catch {}
  }, []);

  function choosePreset(id) {
    setPresetId(id);
    try {
      window.localStorage.setItem(PRESET_STORAGE_KEY, id);
    } catch {}
  }

  useEffect(() => {
    setBooking(null);
    setTicket(null);
    setPreviewing(false);
    setError('');
    if (!id) {
      setLoading(false);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    fetchShopBookingDetail(id)
      .then(async (data) => {
        if (!data) return;
        const [enriched] = await enrichWithCatalog([data]).catch(() => [data]);
        // The ticket only fills gaps, so a failed read never hides the slip.
        const tk = enriched.ticketId ? await fetchTicket(enriched.ticketId).catch(() => null) : null;
        if (!alive) return;
        setBooking(enriched);
        setTicket(tk);
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

  // What the QR encodes — unchanged: the booking number as stored, else its id.
  const qrValue = booking?.bookingNumber || booking?.id || id;
  // Shown/printed text: one tracking number, never "##…".
  const trackingNo = String(booking?.bookingNumber || ticket?.trackingId || booking?.id || id || '')
    .trim()
    .replace(/^#+/, '');
  const services = Array.isArray(booking?.services) ? booking.services : [];
  const servicesText = services.map((s) => s.serviceName || s.serviceCode).filter(Boolean).join(', ') || 'Not specified';
  const ticketModel = String(ticket?.deviceDisplayName || '').split(' · ')[0].trim();
  const brandModel = joinBrandModel(booking?.brandName, booking?.deviceDisplayName || booking?.modelName || ticketModel) || 'Device not specified';
  const customerName = booking?.customerName || ticket?.customerName || 'Not available';
  const security = formatSecurity(booking?.deviceSecurityType || ticket?.deviceSecurityType, booking?.devicePin || ticket?.deviceSecurityValue);
  const createdOn = fmtCreatedOn(booking?.createdAt || ticket?.createdAt);
  const createdOnText = createdOn ? `${createdOn.date} ${createdOn.time}` : 'Not available';
  const deviceImage = resolveMediaUrl(booking?.deviceImageUrl) || resolveMediaUrl(ticket?.deviceImageUrl) || resolveMediaUrl(booking?.brandImageUrl);
  const label = { trackingNo, brandModel, customerName, security, createdOn };

  useEffect(() => {
    setQrDataUrl('');
    setPrintQrDataUrl('');
    if (!qrValue) return undefined;
    let cancelled = false;
    QRCode.toDataURL(String(qrValue), { width: 320, margin: 1, color: { dark: '#14532D', light: '#FFFFFF' } })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {});
    // A second, pure-black rendering for the printed label only — the
    // on-screen preview keeps the brand-green QR above, but a thermal
    // printer needs true black modules (no dark-green-as-gray dithering)
    // with a generous quiet zone, per the label's print-quality requirements.
    QRCode.toDataURL(String(qrValue), { width: 320, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
      .then((url) => {
        if (!cancelled) setPrintQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [qrValue]);

  function copyTrackingId() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(trackingNo)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  }

  function printSlip() {
    if (!printQrDataUrl) return;
    const slip = labelMarkup({ ...label, preset, qrSrc: printQrDataUrl });
    const win = window.open('', '_blank', 'width=420,height=320');
    if (!win) {
      notifyError('Allow pop-ups to print this slip.');
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>Service Slip — ${escapeHtml(trackingNo)}</title>
      <style>
        @page { size: ${preset.widthMm}mm ${preset.heightMm}mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; width: ${preset.widthMm}mm; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .ggl { page-break-after: always; }
        .ggl:last-child { page-break-after: auto; }
        ${LABEL_CSS}
      </style></head><body>${slip}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ECECEC] bg-white text-[#344054] transition hover:border-[#15803D] hover:text-[#15803D]"
        >
          <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] sm:text-[28px]">QR E-Print</h1>
          <p className="mt-1 text-sm text-[#666666]">Generate and print a QR slip for this booking.</p>
        </div>
        {trackingNo ? (
          <button
            type="button"
            onClick={copyTrackingId}
            className="mt-1 inline-flex min-w-0 max-w-[45%] shrink-0 items-center gap-1.5 rounded-full sm:max-w-none bg-[#F8F8F8] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#15803D] transition hover:bg-[#F3F3F3]"
          >
            <span className="truncate">#{trackingNo}</span>
            <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {copied ? 'Copied' : ''}
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-3xl border border-[#ECECEC] bg-[#F8F8F8]" />
          <div className="h-24 animate-pulse rounded-3xl border border-[#ECECEC] bg-[#F8F8F8]" />
          <div className="h-[420px] animate-pulse rounded-3xl border border-[#ECECEC] bg-[#F8F8F8]" />
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : !booking ? (
        <EmptyState icon={AlertTriangle} tone="muted" title="Booking not found" description="We couldn't find this booking." />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* Left: summary + booking. Right: the QR slip and print setup. */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-4">
            <section className="rounded-3xl border border-[#ECECEC] bg-[#F8F8F8] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-[#111111]">One Scan.<br />Complete Service Details.</p>
                  <p className="mt-1 text-sm text-[#666666]">Faster service. Better tomorrow.</p>
                </div>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#14532D] text-white">
                  <ScanLine className="h-6 w-6" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#ECECEC] pt-4 text-xs font-bold text-[#15803D]">
                {['Repair', 'Track', 'Resolve'].map((item) => (
                  <span key={item} className="flex items-center gap-1.5 uppercase tracking-wide">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </section>

            <section className="flex items-center gap-4 rounded-3xl border border-[#ECECEC] bg-[#F8F8F8] p-5">
              <DeviceThumb url={deviceImage} sizeClass="h-14 w-14 p-1.5" onPreview={() => setPreviewing(true)} />
              <div className="min-w-0 flex-1">
                <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Booking</p>
                <p className="truncate text-lg font-bold text-[#111111]" title={brandModel}>
                  {brandModel}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="max-w-full truncate rounded-full bg-[#F8F8F8] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-[#15803D]">#{trackingNo}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F8F8] px-2.5 py-1 text-[0.68rem] font-bold text-[#15803D]">
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
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <section className="overflow-hidden rounded-3xl border border-[#ECECEC] bg-[#F8F8F8]">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#14532D] px-5 py-4 text-white">
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
                <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#ECECEC] bg-[#F8F8F8] p-5">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- generated data: URL, not a static asset.
                    <img src={qrDataUrl} alt={`QR code for booking ${trackingNo}`} className="h-48 w-48" />
                  ) : (
                    <div className="flex h-48 w-48 items-center justify-center text-xs text-[#98A2B3]">Generating…</div>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F8F8F8] px-3 py-1.5 text-xs font-bold text-[#15803D]">
                    <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
                    Scan to identify this booking
                  </span>
                  <p className="text-center text-xs text-[#98A2B3]">Present this QR code at the service counter for quick processing.</p>
                </div>

                <dl className="space-y-4">
                  <DetailRow icon={ClipboardList} label="Service No." value={`#${trackingNo}`} />
                  <DetailRow icon={Smartphone} label="Device" value={brandModel} />
                  <DetailRow icon={User} label="Customer" value={customerName} />
                  <DetailRow icon={Wrench} label="Repair Services" value={servicesText} />
                  <DetailRow icon={ShieldCheck} label="Device Security" value={security} />
                  <DetailRow icon={Calendar} label="Created On" value={createdOnText} />
                </dl>
              </div>

              <p className="border-t border-dashed border-[#ECECEC] py-3 text-center text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">
                Service Today · A Better Tomorrow
              </p>
            </section>

            <section className="flex flex-col gap-5 rounded-3xl border border-[#ECECEC] bg-[#F8F8F8] p-4 sm:p-5 2xl:flex-row 2xl:items-center 2xl:gap-6">
              <style dangerouslySetInnerHTML={{ __html: LABEL_CSS + PREVIEW_CSS }} />
              <div role="radiogroup" aria-label="Page setup — label size" className="grid gap-3 sm:grid-cols-2 2xl:shrink-0">
                {LABEL_PRESETS.map((p) => (
                  <PresetCard
                    key={p.id}
                    preset={p}
                    selected={p.id === preset.id}
                    onSelect={() => choosePreset(p.id)}
                    markup={printQrDataUrl ? labelMarkup({ ...label, preset: p, qrSrc: printQrDataUrl }) : ''}
                    trackingNo={trackingNo}
                  />
                ))}
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-center text-center sm:items-start sm:text-left">
                <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[#98A2B3]">Page Setup · TVS LP-46 Dlite</p>
                <p className="text-base font-bold text-[#111111]">
                  {preset.name} · {preset.widthMm} × {preset.heightMm} mm thermal label
                </p>
                <p className="mt-1 text-xs text-[#666666]">
                  Pick the label size loaded in the printer. The selected preview is exactly what prints — service number, QR, device, customer, security and booking date.
                </p>
                <button
                  type="button"
                  onClick={printSlip}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F3BF23] px-5 py-3 text-sm font-bold text-[#1E1E1E] transition hover:bg-[#E5B11A]"
                >
                  <Printer className="h-4.5 w-4.5" aria-hidden="true" />
                  Print QR Slip
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      <ImagePreviewModal
        open={previewing}
        src={deviceImage}
        title={brandModel}
        subtitle={[trackingNo ? `#${trackingNo}` : '', booking?.color].filter(Boolean).join(' • ')}
        onClose={closePreview}
      />
    </div>
  );
}

// One Page Setup option, as in the app's Print QR Label sheet: name, size,
// a check when picked, and that preset's own label preview.
function PresetCard({ preset, selected, onSelect, markup, trackingNo }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${preset.name}, ${presetSizeText(preset)}`}
      onClick={onSelect}
      className={cx(
        'flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border-2 bg-white p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#15803D]/15',
        selected ? 'border-[#15803D]' : 'border-[#ECECEC] hover:border-[#D0D5DD]',
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-[15px] font-extrabold text-[#111111]">{preset.name}</span>
          <span className="block text-[12.5px] text-[#666666]">{presetSizeText(preset)}</span>
        </span>
        {selected ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#15803D] text-white">
            <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          </span>
        ) : (
          <span className="h-6 w-6 shrink-0 rounded-full border-2 border-[#D0D5DD]" aria-hidden="true" />
        )}
      </span>
      <span className="flex justify-center">
        <LabelPreview preset={preset} markup={markup} trackingNo={trackingNo} />
      </span>
    </button>
  );
}

// The printed label's own markup + CSS (escaped values and the generated
// data: QR only), scaled up — so the preview can't drift from the print.
// LABEL_CSS + PREVIEW_CSS are injected once by the Page Setup section.
function LabelPreview({ preset, markup, trackingNo }) {
  const size = { '--ggl-w': `${preset.widthMm}mm`, '--ggl-h': `${preset.heightMm}mm` };
  return markup ? (
    <span
      role="img"
      aria-label={`${preset.name} label preview for ${trackingNo}`}
      style={size}
      className="ggl-preview block shrink-0 rounded-md bg-white ring-[1.5px] ring-[#111111]"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  ) : (
    <span style={size} className="ggl-preview flex shrink-0 items-center justify-center rounded-md bg-white text-xs text-[#98A2B3] ring-[1.5px] ring-[#ECECEC]">
      Generating…
    </span>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F8F8F8]">
        <Icon className="h-4 w-4 text-[#15803D]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#98A2B3]">{label}</p>
        <p className="break-words text-sm font-bold text-[#111111]">{value}</p>
      </div>
    </div>
  );
}
