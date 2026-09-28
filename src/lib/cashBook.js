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
 * No create/write endpoint (add party, post a Received/Given entry) has been
 * confirmed yet — only these two GET routes. Uses shopRequest (the shop-
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
