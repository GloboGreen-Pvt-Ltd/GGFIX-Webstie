'use client';

/**
 * /shop-home/services/bookings/view/receipt/?id=… — Booking Receipt for one
 * booking.
 *
 * What the Bookings list's "Receipt" action opens (previously a disabled
 * placeholder — there's no invoice/receipt-generation endpoint on the
 * backend, but a receipt of the booking's own data needs no backend call
 * beyond the same GET {ORDER_BASE}/repair-bookings/shop/{id} the Service
 * History and QR E-Print pages already use). "Estimated Total" is exactly
 * bookingEstimatedAmount() — pricing.estimatedAmount/finalAmount if set,
 * else the sum of each service's own estimatedPrice — never a fabricated
 * figure. "Status" reuses the same real event-timeline label the Service
 * History page computes (src/lib/serviceTimeline.js), so the two pages never
 * disagree about where a booking stands. Print is a real print window, same
 * approach as the QR E-Print page.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Copy, Printer } from 'lucide-react';

import EmptyState from '@/components/shop-dashboard/EmptyState';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { fetchShopBookingDetail } from '@/lib/shopDashboard';
import { bookingEstimatedAmount } from '@/lib/bookingFormat';
import { buildTimelineGroups } from '@/lib/serviceTimeline';

function humanizeStatus(status) {
  const s = String(status || '').trim();
  if (!s) return 'Status not available';
  return s
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export default function BookingReceiptPage() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [generatedAt] = useState(() => new Date());

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

  const currentLabel = useMemo(() => {
    if (!booking) return '';
    const flatSteps = buildTimelineGroups(booking).flatMap((g) => g.steps);
    const current = [...flatSteps].reverse().find((s) => s.done);
    return current?.label || humanizeStatus(booking.status);
  }, [booking]);

  const deviceLine = [booking?.brandName, booking?.deviceDisplayName || booking?.modelName].filter(Boolean).join(' ')
    + (booking?.ramStorage ? ` · ${booking.ramStorage}` : '');

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

  function printReceipt() {
    if (!booking) return;
    const servicesRows = services.length
      ? services
          .map(
            (s, i) => `<tr><td>${i + 1}. ${escapeHtml(s.serviceName || s.serviceCode || 'Service')}</td><td class="amt">${money(s.estimatedPrice)}</td></tr>`,
          )
          .join('')
      : `<tr><td>No services listed</td><td class="amt">—</td></tr>`;
    const win = window.open('', '_blank', 'width=460,height=680');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt — ${escapeHtml(trackingId)}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; width: 80mm; color: #101828; }
        .header { background: #15803D; color: #fff; padding: 14px; }
        .header h1 { margin: 0; font-size: 18px; }
        .header p { margin: 2px 0 0; font-size: 11px; opacity: .9; }
        .section { padding: 10px 14px; }
        .label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #15803D; letter-spacing: .04em; }
        .tracking { font-size: 16px; font-weight: 800; margin: 3px 0; }
        .status { font-size: 11px; }
        .status strong { color: #15803D; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        table td { padding: 3px 0; }
        .amt { text-align: right; }
        .row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
        .row span:first-child { color: #667085; }
        .row strong { font-weight: 700; }
        hr { border: none; border-top: 1px solid #EAECF0; margin: 8px 0; }
        .total { background: #15803D; color: #fff; padding: 10px 14px; display: flex; justify-content: space-between; font-weight: 800; font-size: 14px; }
        .footer { padding: 10px 14px; font-size: 9.5px; color: #98A2B3; }
      </style></head><body>
        <div class="header"><h1>GGFix</h1><p>Booking Receipt</p></div>
        <div class="section">
          <p class="label">Tracking ID</p>
          <p class="tracking">#${escapeHtml(trackingId)}</p>
          <p class="status">Status: <strong>${escapeHtml(currentLabel)}</strong></p>
        </div>
        <hr />
        <div class="section">
          <p class="label">Customer</p>
          <div class="row"><span>Name</span><strong>${escapeHtml(booking.customerName || 'Not available')}</strong></div>
          <div class="row"><span>Mobile</span><strong>${escapeHtml(booking.customerMobile || 'Not available')}</strong></div>
        </div>
        <hr />
        <div class="section">
          <p class="label">Device</p>
          <div class="row"><span>Model</span><strong>${escapeHtml(deviceLine || 'Not specified')}</strong></div>
          ${booking.color ? `<div class="row"><span>Variant</span><strong>${escapeHtml(booking.color)}</strong></div>` : ''}
        </div>
        <hr />
        <div class="section">
          <p class="label">Services</p>
          <table>${servicesRows}</table>
        </div>
        <div class="total"><span>Estimated Total</span><span>${money(total)}</span></div>
        <div class="footer">
          <p>Generated ${generatedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
          <p>Track your repair in the GGFix app.</p>
        </div>
      </body></html>`);
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
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] sm:text-[28px]">Receipt</h1>
          <p className="mt-1 text-sm text-[#666666]">Booking receipt for this service.</p>
        </div>
        <button
          type="button"
          onClick={copyTrackingId}
          className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#F8F8F8] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#15803D] transition hover:bg-[#F3F3F3]"
        >
          #{trackingId}
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          {copied ? 'Copied' : ''}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-3xl border border-[#ECECEC] bg-[#F8F8F8]" />
          <div className="h-96 animate-pulse rounded-3xl border border-[#ECECEC] bg-[#F8F8F8]" />
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : !booking ? (
        <EmptyState icon={AlertTriangle} tone="muted" title="Booking not found" description="We couldn't find this booking." />
      ) : (
        <>
          <section className="overflow-hidden rounded-3xl border border-[#ECECEC] bg-[#F8F8F8]">
            <div className="bg-[#15803D] px-6 py-6 text-white">
              <p className="text-2xl font-extrabold">GGFix</p>
              <p className="mt-1 text-sm text-white/85">Booking Receipt</p>
            </div>

            <div className="p-6">
              <div className="rounded-2xl border border-[#ECECEC] bg-[#F8F8F8] p-4">
                <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[#15803D]">Tracking ID</p>
                <p className="mt-1 text-xl font-extrabold text-[#111111]">#{trackingId}</p>
                <p className="mt-1 text-sm text-[#666666]">Status: <span className="font-bold text-[#15803D]">{currentLabel}</span></p>
              </div>

              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#15803D]">Customer</p>
                <div className="mt-2 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Name</span>
                    <span className="font-bold text-[#111111]">{booking.customerName || 'Not available'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Mobile</span>
                    <span className="font-bold text-[#111111]">{booking.customerMobile || 'Not available'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-[#ECECEC] pt-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#15803D]">Device</p>
                <div className="mt-2 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Model</span>
                    <span className="font-bold text-[#111111]">{deviceLine || 'Not specified'}</span>
                  </div>
                  {booking.color ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[#666666]">Variant</span>
                      <span className="font-bold text-[#111111]">{booking.color}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 border-t border-[#ECECEC] pt-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#15803D]">Services</p>
                <div className="mt-2 space-y-1.5 text-sm">
                  {services.length ? (
                    services.map((s, i) => (
                      <div key={s.repairServiceId || i} className="flex items-center justify-between">
                        <span className="text-[#344054]">{i + 1}. {s.serviceName || s.serviceCode || 'Service'}</span>
                        <span className="font-bold text-[#111111]">{money(s.estimatedPrice)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#98A2B3]">No services listed</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#15803D] px-6 py-4 text-white">
              <span className="text-base font-bold">Estimated Total</span>
              <span className="text-lg font-extrabold">{money(total)}</span>
            </div>

            <div className="px-6 py-4 text-xs text-[#98A2B3]">
              <p>Generated {generatedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
              <p>Track your repair in the GGFix app.</p>
            </div>
          </section>

          <button
            type="button"
            onClick={printReceipt}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F3BF23] px-5 py-3 text-sm font-bold text-[#1E1E1E] transition hover:bg-[#E5B11A]"
          >
            <Printer className="h-4.5 w-4.5" aria-hidden="true" />
            Print Receipt
          </button>
        </>
      )}
    </div>
  );
}
