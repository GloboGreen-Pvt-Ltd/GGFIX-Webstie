'use client';

/**
 * /shop-home/services/invoice/report/?ticketId=… — Deliver Invoice, the
 * Partner app's DeliveryInvoiceReportScreen on the web, plus its Billing &
 * Handover checklist (DeliveryInvoiceScreen):
 *
 *   - Header: invoice total, delivery date, Download / Print (A4 print
 *     window — "Save as PDF") and Share (WhatsApp).
 *   - Letterhead + meta, To / From, (A) Service, (B) Spares, Tax Summary,
 *     Total Payable Summary with Payment & Credit, signatures, declaration.
 *   - Billing & Handover: Invoice Ready → Delivered Processing → Delivered,
 *     each POST /tickets/{id}/progress-events, in order.
 *
 * Data: GET /tickets/{id}, GET /tickets/{id}/invoice, GET /tickets/{id}/events,
 * the shop's public card (GET /auth/shops/{shopId}/public) and, when the
 * ticket has no address, GET /customers/lookup?mobile=.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ListChecks, Loader2, Pencil, Printer, Share2 } from 'lucide-react';

import { cx } from '@/components/site/ui';
import { fetchTicket } from '@/lib/shopDashboard';
import { getShopPublic } from '@/lib/repairBooking';
import { readShopOwner } from '@/lib/shopAuth';
import {
  HANDOFF_STEPS,
  buildInvoiceHtml,
  fetchEvents,
  fetchInvoice,
  fmt,
  formatDateTime,
  handoffDone,
  invoiceBreakdown,
  invoicePayment,
  lookupCustomer,
  recordProgress,
} from '@/lib/invoice';
import { notifyError, notifySuccess } from '@/lib/toast';

const GREEN = '#09AD2A';
const GREEN_DARK = '#08961F';
const AMBER = '#B45309';
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#09AD2A] focus-visible:ring-offset-2';
const CARD = 'rounded-2xl border border-[#ECECEC] bg-white p-5 shadow-[0_4px_14px_rgba(16,24,40,0.05)]';

function SectionLabel({ children }) {
  return (
    <p className="mb-2.5 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wide" style={{ color: GREEN_DARK }}>
      <span className="h-3.5 w-1 rounded" style={{ backgroundColor: GREEN }} aria-hidden="true" />
      {children}
    </p>
  );
}

function Meta({ label, value }) {
  return (
    <p className="flex gap-1 text-[12px]">
      <span className="w-24 shrink-0 text-[#667085]">{label}</span>
      <span className="text-[#667085]">:</span>
      <span className="min-w-0 break-words font-bold text-[#111111]">{value || '—'}</span>
    </p>
  );
}

/** One GST table — header labels, rows (array of cell arrays), total row. */
function GstTable({ heads, rows, total, minWidth = 640 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]" style={{ minWidth }}>
        <thead>
          <tr className="bg-[#F7FAF7] text-[10.5px] font-extrabold uppercase tracking-wide text-[#475467]">
            {heads.map((h, i) => (
              <th key={h} className={cx('px-2.5 py-2', i > 1 && h !== 'Warranty' ? 'text-right' : 'text-left')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={heads.length} className="px-2.5 py-3 text-[#98A2B3]">
                —
              </td>
            </tr>
          ) : (
            rows.map((cells, r) => (
              <tr key={r} className="border-t border-[#EFF5EE]">
                {cells.map((c, i) => (
                  <td key={i} className={cx('px-2.5 py-2', i > 1 && heads[i] !== 'Warranty' ? 'text-right' : 'text-left', i >= cells.length - 2 && 'font-extrabold text-[#111111]')}>
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
          <tr className="border-t border-[#E2E8E2] bg-[#F2FBF4] font-extrabold text-[#111111]">
            {total.map((c, i) => (
              <td key={i} className={cx('px-2.5 py-2', i > 1 && heads[i] !== 'Warranty' ? 'text-right' : 'text-left')}>
                {c}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function DeliverInvoicePage() {
  const ticketId = useSearchParams().get('ticketId');
  const router = useRouter();
  const [ticket, setTicket] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [events, setEvents] = useState([]);
  const [shop, setShop] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyStep, setBusyStep] = useState(null);

  const load = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError('');
    try {
      const [t, inv, ev] = await Promise.all([fetchTicket(ticketId), fetchInvoice(ticketId), fetchEvents(ticketId).catch(() => [])]);
      setTicket(t || {});
      setInvoice(inv || null);
      setEvents(ev);
      if (t?.shopId) getShopPublic(t.shopId).then((s) => setShop(s || null));
      if (t?.customerPhone && !t?.customerAddress) {
        lookupCustomer(t.customerPhone)
          .then((c) => setCustomer(c || null))
          .catch(() => {});
      }
    } catch (err) {
      setError(err.message || 'Could not load the invoice.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const owner = useMemo(() => readShopOwner() || {}, []);
  const shopName = shop?.name || shop?.shopName || ticket?.shopName || 'GGFix Service Center';
  const shopMobile = shop?.mobile || owner?.phone || '';
  const shopAddress = shop?.address || ticket?.shopAddress || '';
  const shopGst = shop?.gstNumber || invoice?.gstNo || '';
  const ownerName = owner?.name || owner?.ownerName || '';
  const customerName = ticket?.customerName || '';
  const trackingId = ticket?.trackingId || invoice?.invoiceNo || ticketId;
  const composedAddr = customer
    ? [customer.addressLine, customer.area || customer.locality, customer.district || customer.city, customer.state, customer.pincode].filter((p) => p && String(p).trim()).join(', ')
    : '';
  const customerAddress = ticket?.customerAddress || customer?.address || composedAddr || '';

  const b = useMemo(() => (invoice ? invoiceBreakdown(invoice) : null), [invoice]);
  const p = useMemo(() => (invoice ? invoicePayment(invoice) : null), [invoice]);
  const done = useMemo(() => handoffDone(events), [events]);

  const html = () => buildInvoiceHtml({ invoice, ticket, shopName, shopMobile, shopAddress, shopGst, ownerName, customerName, customerAddress, trackingId });

  function printInvoice() {
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) {
      notifyError('Allow pop-ups to print or save the invoice.');
      return;
    }
    win.document.write(html());
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  function shareInvoice() {
    const digits = String(ticket?.customerPhone || '').replace(/\D/g, '').slice(-10);
    const lines = [
      `🧾 *Invoice ${invoice.invoiceNo}* — ${shopName}`,
      `Tracking ID: ${trackingId}`,
      `Invoice Total: ₹${fmt(invoice.finalPayableAmount)}`,
      p.shown ? `Balance Payable: ₹${fmt(p.creditAmount)}` : null,
      invoice.amountInWords || null,
    ].filter(Boolean);
    window.open(`https://wa.me/${digits.length === 10 ? `91${digits}` : ''}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer');
  }

  async function submitStep(step) {
    const idx = HANDOFF_STEPS.findIndex((s) => s.key === step.key);
    const prev = HANDOFF_STEPS[idx - 1];
    if (prev && !done[prev.key]) {
      notifyError(`Mark "${prev.label}" before recording "${step.label}".`);
      return;
    }
    if (!window.confirm(step.confirm || `Record "${step.label}" for this booking?`)) return;
    setBusyStep(step.key);
    try {
      await recordProgress(ticketId, step.key);
      notifySuccess(`"${step.label}" recorded.`);
      setEvents(await fetchEvents(ticketId).catch(() => events));
    } catch (err) {
      notifyError(err, 'Could not save this step.');
    } finally {
      setBusyStep(null);
    }
  }

  const heads = { service: ['Sl', 'Description', 'Rate (₹)', 'Taxable Value', 'CGST', 'SGST', 'Total GST', 'Total'] };

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4">
      {/* Header */}
      <div className="border-b border-[#ECECEC] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3F3F3] text-[#111111] transition hover:bg-[#ECECEC]', FOCUS_RING)}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-[19px] font-extrabold text-[#111111]">Deliver Invoice</h1>
          {invoice ? (
            <>
              <span className="hidden rounded-full bg-[#F3F3F3] px-3 py-1 text-[12px] font-extrabold text-[#111111] sm:inline">#{invoice.invoiceNo}</span>
              <button type="button" onClick={printInvoice} aria-label="Download or print invoice" title="Download / Print (Save as PDF)" className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3F3F3] transition hover:bg-[#EAF8EC]', FOCUS_RING)} style={{ color: GREEN_DARK }}>
                <Printer className="h-5 w-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={shareInvoice} aria-label="Share invoice on WhatsApp" title="Share on WhatsApp" className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3F3F3] transition hover:bg-[#EAF8EC]', FOCUS_RING)} style={{ color: GREEN_DARK }}>
                <Share2 className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
        {invoice ? (
          <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div>
              <p className="text-[10.5px] font-bold tracking-[0.1em] text-[#98A2B3]">INVOICE TOTAL</p>
              <p className="text-[26px] font-extrabold leading-tight text-[#111111]">₹{fmt(invoice.finalPayableAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[#98A2B3]">Delivery date</p>
              <p className="text-[12.5px] font-bold text-[#111111]">{formatDateTime(invoice.generatedAt || invoice.deliveryDate)}</p>
            </div>
          </div>
        ) : null}
      </div>

      {!ticketId ? (
        <p className="text-[14px] text-[#667085]">Open an invoice from a booking.</p>
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-[#F3F3F3]" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13.5px] font-semibold text-[#B42318]">{error}</p>
      ) : !invoice ? (
        <div className="flex flex-col items-center rounded-2xl border border-[#E2E8E2] bg-[#F2FBF4] px-6 py-12 text-center">
          <p className="text-[16px] font-extrabold text-[#111111]">No invoice generated yet</p>
          <p className="mt-1 text-[13.5px] text-[#667085]">Create one with the Invoice Generator.</p>
          <Link
            href={`/shop-home/services/invoice/generate/?ticketId=${encodeURIComponent(ticketId)}`}
            className={cx('mt-5 inline-flex h-11 items-center gap-2 rounded-2xl px-6 text-[14px] font-extrabold text-white', FOCUS_RING)}
            style={{ backgroundColor: GREEN_DARK }}
          >
            Open Invoice Generator
          </Link>
        </div>
      ) : (
        <>
          {/* Letterhead */}
          <section className={CARD}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="break-words text-[19px] font-extrabold" style={{ color: GREEN_DARK }}>
                  {shopName}
                </p>
                {ownerName ? <p className="text-[12.5px] font-semibold text-[#475467]">{ownerName}</p> : null}
                {shopMobile ? <p className="mt-1 text-[12px] text-[#667085]">Mobile : {shopMobile}</p> : null}
              </div>
              <div>
                <p className="mb-1 text-right text-[11px] font-extrabold text-[#98A2B3]">Original for Deliver Receipt</p>
                <Meta label="Invoice No" value={invoice.invoiceNo} />
                <Meta label="Ticket Date" value={formatDateTime(invoice.ticketDate)} />
                <Meta label="Delivery Date" value={formatDateTime(invoice.generatedAt || invoice.deliveryDate)} />
                {shopGst ? <Meta label="GST No" value={shopGst} /> : null}
              </div>
            </div>
            <div className="my-4 border-t border-[#E2E8E2]" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-extrabold tracking-wide text-[#98A2B3]">TO:</p>
                <p className="mt-1 text-[15px] font-extrabold text-[#111111]">{customerName || '—'}</p>
                {customerAddress ? <p className="mt-1 break-words text-[12.5px] text-[#475467]">{customerAddress}</p> : null}
                {ticket?.customerPhone ? <p className="mt-1.5 text-[12.5px] font-semibold text-[#344054]">Mobile : {ticket.customerPhone}</p> : null}
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] font-extrabold tracking-wide text-[#98A2B3]">FROM:</p>
                <p className="mt-1 text-[15px] font-extrabold text-[#111111]">{shopName}</p>
                {shopMobile ? <p className="mt-1 text-[12.5px] font-semibold text-[#344054]">Mobile : {shopMobile}</p> : null}
                {shopAddress ? <p className="mt-1 break-words text-[12.5px] text-[#475467]">{shopAddress}</p> : null}
                {shopGst ? <p className="mt-1 text-[12.5px] font-semibold text-[#344054]">GSTIN : {shopGst}</p> : null}
              </div>
            </div>
          </section>

          <section className={CARD}>
            <SectionLabel>(A) Service</SectionLabel>
            <GstTable
              heads={heads.service}
              rows={b.serviceLines.map((r, i) => {
                const br = b.serviceBreaks[i];
                return [r.slNo || i + 1, r.description, fmt(r.rate), fmt(br.base), fmt(br.cgst), fmt(br.sgst), fmt(br.totalGst), fmt(br.total)];
              })}
              total={['', 'Total Amount (₹)', fmt(b.serviceGross), fmt(b.service.base), fmt(b.service.cgst), fmt(b.service.sgst), fmt(b.service.totalGst), fmt(b.service.total)]}
            />
          </section>

          <section className={CARD}>
            <SectionLabel>(B) Spares</SectionLabel>
            <GstTable
              minWidth={760}
              heads={['Sl', 'Description', 'Warranty', 'Qty', 'Rate', 'Taxable Value', 'CGST', 'SGST', 'Total GST', 'Total']}
              rows={b.spareLines.map((r, i) => {
                const br = b.spareBreaks[i];
                return [r.slNo || i + 1, r.description, r.warranty || '—', Number(r.qty || 1).toFixed(2), fmt(r.rate), fmt(br.base), fmt(br.cgst), fmt(br.sgst), fmt(br.totalGst), fmt(br.total)];
              })}
              total={['', 'Total Amount (₹)', '', '', fmt(b.spareGross), fmt(b.spares.base), fmt(b.spares.cgst), fmt(b.spares.sgst), fmt(b.spares.totalGst), fmt(b.spares.total)]}
            />
          </section>

          <section className={CARD}>
            <SectionLabel>Tax Summary</SectionLabel>
            <GstTable
              heads={['Sl', 'Description', 'Taxable Value', 'CGST', 'SGST', 'Total GST', 'Total']}
              rows={[
                [1, 'Service', fmt(b.service.base), fmt(b.service.cgst), fmt(b.service.sgst), fmt(b.service.totalGst), fmt(b.service.total)],
                [2, 'Spares', fmt(b.spares.base), fmt(b.spares.cgst), fmt(b.spares.sgst), fmt(b.spares.totalGst), fmt(b.spares.total)],
              ]}
              total={['', 'Total payable by customer (₹)', fmt(b.grand.base), fmt(b.grand.cgst), fmt(b.grand.sgst), fmt(b.grand.totalGst), fmt(b.grand.total)]}
            />
          </section>

          {/* Total payable summary + payment & credit */}
          <section className={CARD}>
            <SectionLabel>Total Payable Summary</SectionLabel>
            <div className="flex justify-between py-1 text-[13px]">
              <span className="text-[#475467]">Taxable Amount</span>
              <b>₹{fmt(b.grand.base)}</b>
            </div>
            <div className="flex justify-between py-1 text-[13px]">
              <span className="text-[#475467]">Total GST Tax (₹)</span>
              <b>₹{fmt(b.grand.totalGst)}</b>
            </div>
            <div className="flex justify-between border-t border-dashed border-[#EFF5EE] py-1 text-[13px]">
              <span className="text-[#475467]">Discount</span>
              <b style={{ color: AMBER }}>− ₹{fmt(invoice.discount)}</b>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl px-4 py-3 text-white" style={{ backgroundColor: GREEN_DARK }}>
              <span className="text-[14px] font-extrabold">Invoice Total</span>
              <span className="text-[19px] font-extrabold">₹{fmt(invoice.finalPayableAmount)}</span>
            </div>
            {invoice.amountInWords ? <p className="mt-2 text-[12px] italic text-[#667085]">In words: {invoice.amountInWords}</p> : null}
            {p.shown ? (
              <div className="mt-3 border-t border-[#EFF5EE] pt-3 text-[13px]">
                {p.advancePaid > 0 ? (
                  <div className="flex justify-between py-1">
                    <span className="text-[#475467]">Advance Already Paid</span>
                    <b style={{ color: AMBER }}>− ₹{fmt(p.advancePaid)}</b>
                  </div>
                ) : null}
                <div className="flex justify-between py-1">
                  <span className="text-[#475467]">Net Payable</span>
                  <b>₹{fmt(p.netPayable)}</b>
                </div>
                {p.amountPaid > 0 ? (
                  <div className="flex justify-between py-1">
                    <span className="text-[#475467]">Amount Paid</span>
                    <b style={{ color: AMBER }}>− ₹{fmt(p.amountPaid)}</b>
                  </div>
                ) : null}
                <div
                  className="mt-2 flex items-center justify-between rounded-2xl px-4 py-3 font-extrabold"
                  style={{ backgroundColor: p.creditAmount > 0 ? '#FEF3C7' : '#EAF8EC', color: p.creditAmount > 0 ? AMBER : GREEN_DARK }}
                >
                  <span className="text-[13px]">{p.creditAmount > 0 ? 'Credit / Balance Payable' : 'Balance Payable'}</span>
                  <span className="text-[16px]">₹{fmt(p.creditAmount)}</span>
                </div>
                {p.creditAmount > 0 && invoice.paymentNote ? <p className="mt-2 text-[12px] italic text-[#667085]">Note: {invoice.paymentNote}</p> : null}
              </div>
            ) : null}
          </section>

          {/* Signatures */}
          <section className={CARD}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[12px] text-[#475467]">Customer Signature :</p>
                {customerName ? <p className="mt-1 text-[13px] font-extrabold text-[#111111]">{customerName}</p> : null}
              </div>
              <div className="rounded-xl bg-[#F2FBF4] p-3 text-center">
                <p className="text-[13px] font-extrabold text-[#111111]">{shopName}</p>
                {ownerName ? <p className="text-[12px] font-semibold text-[#475467]">{ownerName}</p> : null}
                <p className="mt-1 text-[11px] text-[#98A2B3]">Authorised Signatory</p>
              </div>
            </div>
            <p className="mt-4 text-[12px] font-extrabold text-[#344054]">Declaration</p>
            <p className="mt-1 text-[12px] text-[#667085]">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
          </section>

          {/* Billing & handover */}
          <section className={CARD}>
            <p className="mb-2 flex items-center gap-2 text-[11.5px] font-extrabold uppercase tracking-[0.12em]" style={{ color: GREEN_DARK }}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAF8EC]">
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              Billing &amp; Handover
            </p>
            <p className="mb-3 text-[12px] text-[#667085]">Record each step as it happens: Invoice Generated → Invoice Ready → Delivered Processing → Delivered to Customer.</p>
            <div className="space-y-2">
              {HANDOFF_STEPS.map((step) => {
                const isDone = !!done[step.key];
                const busy = busyStep === step.key;
                const auto = step.key === 'INVOICE_GENERATED';
                return (
                  <button
                    key={step.key}
                    type="button"
                    disabled={isDone || busy || auto}
                    onClick={() => submitStep(step)}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-2xl border-[1.5px] p-3 text-left transition',
                      FOCUS_RING,
                      isDone ? 'border-[#09AD2A] bg-[#F2FBF4]' : 'border-[#E2E8E2] bg-white hover:border-[#09AD2A]',
                      auto && !isDone && 'cursor-default opacity-70',
                    )}
                  >
                    <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', isDone ? 'bg-[#09AD2A] text-white' : 'bg-[#F2FBF4]')} style={isDone ? undefined : { color: GREEN_DARK }}>
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-extrabold" style={{ color: isDone ? GREEN_DARK : '#111111' }}>
                        {step.label}
                      </span>
                      <span className="block text-[12px] text-[#667085]">{step.hint}</span>
                    </span>
                    <span
                      className={cx('flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide', isDone ? 'bg-[#09AD2A] text-white' : 'bg-[#EAF8EC]')}
                      style={isDone ? undefined : { color: GREEN_DARK }}
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
                      {isDone ? 'DONE' : busy ? 'SAVING' : auto ? 'AUTO' : 'SUBMIT'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <Link
            href={`/shop-home/services/invoice/generate/?ticketId=${encodeURIComponent(ticketId)}`}
            className={cx('inline-flex h-11 items-center justify-center gap-2 self-start rounded-2xl border-2 px-5 text-[13.5px] font-extrabold transition hover:bg-[#F2FBF4]', FOCUS_RING)}
            style={{ borderColor: GREEN, color: GREEN_DARK }}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit / Re-generate invoice
          </Link>
        </>
      )}
    </div>
  );
}
