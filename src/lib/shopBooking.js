/**
 * shopBooking.js — support for the shop-partner "Book Service" (Create
 * Booking) form at /shop-home/services/book-service.
 *
 * uploadShopDevicePhoto() hits the real media-upload service — the same one
 * the customer-facing /repair flow uses (uploadDevicePhoto in
 * src/components/site/RepairFlow.js) — but signs with the shop owner's own
 * bearer token instead of a customer's; /media/upload only requires *some*
 * authenticated caller, not a specific role.
 *
 * createShopBooking() saves the booking through the real ticket-service
 * endpoints (see its own doc comment below).
 */

import { MEDIA_UPLOAD_URL, ORDER_BASE, TICKET_BASE } from '@/lib/api';
import { shopRequest } from '@/lib/shopApi';
import { SHOP_TOKEN_KEY } from '@/lib/shopAuth';

function shopToken() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SHOP_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Uploads one device photo to media storage; returns the hosted URL. */
export async function uploadShopDevicePhoto(file, slot) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', 'repair-bookings');
  if (slot) fd.append('slot', slot);
  const token = shopToken();
  const res = await fetch(MEDIA_UPLOAD_URL(), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const data = await res.json().catch(() => ({}));
  if (!data?.url) throw new Error('Upload succeeded but no URL was returned.');
  return data.url;
}

/**
 * Subtotal/tax/total for the Estimated Price section. Every input is a plain
 * number; blank/non-numeric is treated as 0. There is no master pricing data
 * to prefill these from (repair-services carries no price field) — every
 * charge here is manual shop entry.
 */
export function estimateTotal({
  inspectionCharge,
  serviceCharge,
  partsCharge,
  pickupCharge,
  discount,
  taxPercent,
} = {}) {
  const num = (v) => Number(v) || 0;
  const subtotal = Math.max(
    num(inspectionCharge) + num(serviceCharge) + num(partsCharge) + num(pickupCharge) - num(discount),
    0,
  );
  const tax = (subtotal * num(taxPercent)) / 100;
  return { subtotal, tax, total: subtotal + tax };
}

const isDev = process.env.NODE_ENV !== 'production';
const log = (...args) => {
  if (isDev) console.log('[Booking]', ...args); // eslint-disable-line no-console
};

/**
 * Create a shop booking for real — the same two calls the GGFIX Partner app's
 * booking flow makes (CustomerDetailsScreen + ServiceBookingDevicesListScreen):
 *
 *   1. POST {TICKET_BASE}/customers   { name, phone, email?, address… }
 *        upserts the shop's customer by mobile and returns { id, … }.
 *   2. POST {TICKET_BASE}/tickets     TicketRequest (customerId required)
 *        creates the repair ticket (one DB transaction in ticket-service);
 *        the backend mirrors it into repair_bookings with this shop's id,
 *        which is what GET {ORDER_BASE}/repair-bookings/shop — the web
 *        Bookings page — reads.
 *   3. GET  {ORDER_BASE}/repair-bookings/shop
 *        confirms the booking is really listed, and gives its booking id
 *        (the View/Receipt/Barcode/Details pages key on that id).
 *
 * Success only when the ticket comes back with an id; any non-2xx throws with
 * the backend's own message (shopRequest), so the form is never cleared on a
 * failed save. `payload` is the Book Service form payload.
 */
export async function createShopBooking(payload) {
  // 1 — customer
  const customerBody = {
    name: payload.customerName,
    phone: payload.customerMobile,
    email: payload.customerEmail || null,
    addressLine: payload.pickupAddress?.addressLine || null,
    city: payload.pickupAddress?.district || payload.pickupAddress?.city || null,
    state: payload.pickupAddress?.state || null,
    pincode: payload.pickupAddress?.pincode || null,
    address: payload.pickupAddress
      ? [payload.pickupAddress.addressLine, payload.pickupAddress.landmark, payload.pickupAddress.city, payload.pickupAddress.state, payload.pickupAddress.pincode]
          .filter(Boolean)
          .join(', ')
      : null,
  };
  log('endpoint:', `${TICKET_BASE()}/customers`, '(POST)');
  const customer = await shopRequest(TICKET_BASE(), '/customers', { method: 'POST', body: JSON.stringify(customerBody) });
  if (!customer?.id) throw new Error('Could not save the customer — the server returned no customer id.');

  // 2 — ticket
  const pricing = payload.pricing || {};
  const priceItems = [
    ...(payload.services || []).map((s) => ({ id: s.repairServiceId || null, code: s.serviceCode || null, label: s.serviceName || 'Service', amount: 0 })),
    ...[
      ['Inspection Charge', pricing.inspectionCharge],
      ['Service Charge', pricing.serviceCharge],
      ['Parts Charge', pricing.partsCharge],
      ['Pickup Charge', pricing.pickupCharge],
    ]
      .filter(([, v]) => Number(v) > 0)
      .map(([label, v]) => ({ id: null, code: null, label, amount: Number(v) })),
  ];
  const photos = {
    front: payload.frontImageUrl || null,
    back: payload.backImageUrl || null,
    damage: payload.damageImageUrl || null,
    additional: payload.additionalImageUrls || [],
  };
  const hasPhotos = photos.front || photos.back || photos.damage || photos.additional.length;
  const ticketBody = {
    customerId: customer.id,
    customerName: payload.customerName,
    customerPhone: payload.customerMobile,
    brandId: payload.brandId || null,
    modelId: payload.modelId || null,
    color: payload.color || null,
    imei: payload.imei || null,
    issueDescription: payload.issueDescription || payload.issueSummary || null,
    estimatedPrice: Number(pricing.estimatedAmount) || 0,
    deviceDisplayName: [payload.modelName, payload.ramStorage].filter(Boolean).join(' · ') || null,
    repairServicesSummary: (payload.services || []).map((s) => s.serviceName).filter(Boolean).join(', ') || null,
    priceItemsJson: priceItems.length ? JSON.stringify(priceItems) : null,
    deviceSecurityType: payload.deviceSecurityType || 'NONE',
    deviceSecurityValue: payload.devicePin || null,
    missingPartsJson: payload.missingDamageParts ? JSON.stringify(String(payload.missingDamageParts).split(/,\s*/)) : null,
    devicePhotosJson: hasPhotos ? JSON.stringify(photos) : null,
    customerApproval: payload.customerApproval ?? null,
  };
  log('endpoint:', `${TICKET_BASE()}/tickets`, '(POST)');
  log('request payload:', { ...ticketBody, deviceSecurityValue: ticketBody.deviceSecurityValue ? '[hidden]' : null });
  log('identifiers:', { shopId: payload.shopId, customerId: customer.id });
  const ticket = await shopRequest(TICKET_BASE(), '/tickets', { method: 'POST', body: JSON.stringify(ticketBody) });
  log('response body:', ticket);
  if (!ticket?.id) throw new Error('The booking was not created — the server returned no ticket id.');
  log('created ticket id:', ticket.id, 'service number:', ticket.trackingId);

  // 3 — confirm it is in the shop's Bookings list (the mirror is written in the same request)
  let booking = null;
  try {
    const list = await shopRequest(ORDER_BASE(), '/repair-bookings/shop');
    booking = (Array.isArray(list) ? list : []).find((b) => String(b.ticketId) === String(ticket.id)) || null;
  } catch (err) {
    log('could not re-read bookings:', err.message);
  }
  if (!booking) log('WARNING: ticket saved but not yet listed in /repair-bookings/shop');

  return {
    ...payload,
    id: booking?.id || ticket.id,
    ticketId: ticket.id,
    bookingNumber: ticket.trackingId || booking?.bookingNumber,
    status: ticket.status || booking?.status,
    createdAt: ticket.createdAt,
    customerId: customer.id,
  };
}
