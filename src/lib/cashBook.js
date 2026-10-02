/**
 * cashBook.js — real Cash Book ledger endpoints, ticket-service.
 *
 * Confirmed real (2026-09-28, live responses supplied directly):
 *   GET {TICKET_BASE}/ledger-parties?partyType=CUSTOMER|SUPPLIER
 *     -> [{ id, partyType, name, phone, balance, createdAt, updatedAt,
 *           lastEntryAmount, lastEntryDate, lastEntryDirection: 'GIVEN'|'RECEIVED',
 *           totalGiven, totalReceived }, ...]
 *   GET {TICKET_BASE}/ledger-entries/party/{partyId}
 *     -> { balance, party: {...same shape as above}, entries: [
 *           { id, partyId, partyName, amount, direction: 'GIVEN'|'RECEIVED',
 *             entryDate, createdAt, runningBalance, billUrls }, ...] }
 *
 *   POST {TICKET_BASE}/ledger-parties { partyType, name, phone } -> party
 *     (add an account; confirmed in ticket-service ShopLedgerPartyController)
 *
 * Posting a Received/Given entry is not wired here yet. Uses shopRequest (the shop-
 * owner session token, src/lib/shopApi.js), the same auth every other real
 * shop-dashboard fetch in this codebase uses — not a separate auth path.
 */

import { shopRequest } from './shopApi';
import { TICKET_BASE } from './api';

export async function fetchLedgerParties(partyType) {
  const list = await shopRequest(TICKET_BASE(), `/ledger-parties?partyType=${encodeURIComponent(partyType)}`);
  return Array.isArray(list) ? list : [];
}

export async function fetchLedgerPartyStatement(partyId) {
  return shopRequest(TICKET_BASE(), `/ledger-entries/party/${encodeURIComponent(partyId)}`);
}

/** 10-digit Indian mobile from "+91 98765 43210" / "098765 43210" / "9876543210" (same rule as the Partner app). */
export function normalizeLedgerPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

/**
 * Add a customer/supplier account — POST {TICKET_BASE}/ledger-parties
 * { partyType, name, phone } (ShopLedgerPartyController.create, owner only).
 * The server upserts on (shop, type, phone): an existing number keeps its
 * account and just takes the new name; a blank name falls back to the number.
 */
export async function createLedgerParty({ partyType, name, phone }) {
  return shopRequest(TICKET_BASE(), '/ledger-parties', {
    method: 'POST',
    body: JSON.stringify({ partyType, name: String(name || '').trim(), phone: normalizeLedgerPhone(phone) }),
  });
}
