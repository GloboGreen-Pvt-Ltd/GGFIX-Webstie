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
 * createShopBooking() is a STUB. There is no backend endpoint yet for a shop
 * to create a booking on a walk-in customer's behalf — the only
 * POST /repair-bookings in this codebase (src/lib/repairBooking.js) requires
 * a CUSTOMER bearer token and is only ever called from the public /repair
 * site flow; the shop dashboard today only reads bookings
 * (GET {ORDER_BASE}/repair-bookings/shop, src/lib/shopDashboard.js). Once a
 * shop-scoped create endpoint exists, replace this stub's body with:
 *   import { ORDER_BASE } from '@/lib/api';
 *   import { shopRequest } from '@/lib/shopApi';
 *   return shopRequest(ORDER_BASE(), '/repair-bookings', { method: 'POST', body: JSON.stringify(payload) });
 * — the payload shape the new page builds already mirrors RepairBookingRequest
 * plus the extra walk-in customer/pricing fields this form collects.
 */

import { MEDIA_UPLOAD_URL } from '@/lib/api';
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

function randomBookingNumber() {
  return `GG${Math.floor(100000 + Math.random() * 900000)}`;
}

/**
 * STUB — see file doc comment. Simulates network latency and returns a
 * locally-generated booking so the UI can be built and reviewed end-to-end
 * ahead of the real backend contract.
 */
export async function createShopBooking(payload) {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    id: `local-${Date.now()}`,
    bookingNumber: randomBookingNumber(),
    status: 'CREATED',
    createdAt: new Date().toISOString(),
    ...payload,
  };
}
