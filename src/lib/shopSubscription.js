/**
 * shopSubscription.js — the shop owner's own subscription status
 * (/shop-home/account/settings, "Subscription" tab).
 *
 * subscription-service has no per-owner auth check (same permitAll pattern
 * as the rest of these microservices), but is read-only here — we only ever
 * GET the owner's own status, never activate/cancel a plan from this screen.
 *
 * Unlike AUTH_BASE, SUBSCRIPTION_BASE() is NOT doubled: the edge special-cases
 * this service's routing the same way it does master-data (see the header
 * comment in src/lib/api.js), and the admin's own subscriptionApi calls
 * confirm the single-prefix shape (Client/src/app/management/(portal)/
 * subscriptions/page.js calls '/subscriptions', not '/subscription/subscriptions').
 */

import { SUBSCRIPTION_BASE } from '@/lib/api';
import { shopRequest } from '@/lib/shopApi';

/** The signed-in owner's subscription row, or null when none exists yet. */
export async function fetchMySubscription(ownerId) {
  return shopRequest(SUBSCRIPTION_BASE(), `/subscriptions/owner/${ownerId}`);
}

/** Static plan catalog (BASIC pricing, feature list) for the upgrade card. */
export async function fetchSubscriptionPlans() {
  const list = await shopRequest(SUBSCRIPTION_BASE(), '/subscriptions/plans');
  return Array.isArray(list) ? list : [];
}
