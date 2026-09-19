/**
 * shopMobileAuth.js — REAL mobile-number + OTP sign-in for GGFIX Business
 * Login, supporting all three real identifier types the backend recognises:
 *   1. a shop owner's own personal mobile number (users.phone)
 *   2. a shop's own registered mobile number (shops.mobile)
 *   3. (POST /auth/login also accepts email, unused by this mobile-only UI)
 *
 * Verified end-to-end against production (2026-09-09) for both #1 and #2:
 *
 *   POST {AUTH_BASE}/auth/shop-login/request-otp   { mobile } -> { sent, devOtp, ttlMinutes }
 *     Real, but SHOP-mobile only — 400 "No shop registered for that mobile
 *     number" for a number that's a real owner's phone rather than a shop's
 *     own number. See sendMobileOtp()'s handling of that specific case below.
 *
 *   POST {AUTH_BASE}/auth/login   { email: <mobile digits>, otp } -> LoginResponse
 *     The unified verify call. Despite the field name (unchanged from the
 *     email/password DTO), the backend's own AuthService.login() resolves a
 *     non-email identifier by trying users.phone first (any shop owner's
 *     personal number, e.g. the account's own login), then falling back to
 *     shops.mobile if no user matched (routing internally to the same logic
 *     as /auth/shop-login) — one real call handles all three identifier
 *     types server-side. Response:
 *       { accessToken, userId, shopId, shopName, name, email, roles,
 *         roleLabel, shops[], loginScope: 'OWNER'|'SHOP', loginType }
 *     loginScope is 'OWNER' for a personal-number login (session can later
 *     switch between the owner's shops via POST /auth/switch-shop — not
 *     wired here) or 'SHOP' for a shop-number login (locked to that one
 *     shop). Both are handled identically by this module and by
 *     src/lib/shopAuth.js's session storage.
 *
 * One real limitation worth knowing: OTP delivery is dev-mode on the
 * backend for every non-email identifier — it doesn't send a real SMS, the
 * OTP is a stored static value (defaults to "123456"). This file never
 * reads or surfaces that dev value from the send-otp response. Wiring a
 * real SMS gateway is backend work, not something this frontend module can
 * fix.
 */

import { AUTH_BASE } from '@/lib/api';

export function normalizeMobile(value) {
  return String(value || '').replace(/\D/g, '');
}

function base() {
  return String(AUTH_BASE() || '').replace(/\/$/, '');
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function messageFrom(body) {
  const msg = body && (body.message || body.error);
  return typeof msg === 'string' && msg.trim() ? msg.trim() : null;
}

/**
 * @param {string} mobile
 * @returns {Promise<{ok:boolean, message?:string}>} Never throws.
 *
 * Only shop numbers get a real "OTP requested" confirmation from this call
 * (the only non-destructive send-otp endpoint that exists for a mobile
 * identifier). A number that turns out to be an owner's personal phone
 * fails this specific call with a real, expected 400 — there's no
 * equivalent standalone "send" endpoint for that identifier type that
 * doesn't also force a password reset (POST /auth/otp/send does, so this
 * deliberately doesn't call it). Rather than block on that expected
 * failure, this treats "no shop registered for that mobile number" as a
 * soft pass: the real, single source of truth is verifyMobileOtp() below,
 * which authenticates for real regardless of which identifier type it
 * turns out to be. Any OTHER failure (network error, malformed number)
 * still fails here for real.
 */
export async function sendMobileOtp(mobile) {
  const digits = normalizeMobile(mobile);
  if (digits.length !== 10) {
    return { ok: false, message: 'Enter a valid 10-digit mobile number.' };
  }
  try {
    const res = await fetch(`${base()}/auth/shop-login/request-otp`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ mobile: digits }),
    });
    if (!res.ok) {
      const body = await readJson(res);
      const message = messageFrom(body);
      if (res.status === 400 && message && /no shop registered/i.test(message)) {
        // Not a shop's own number — may still be a real owner's phone.
        // verifyMobileOtp() is the actual gate; proceed to the OTP step.
        return { ok: true };
      }
      return { ok: false, message: message || "We couldn't send an OTP. Please try again." };
    }
    // devOtp is intentionally never read from this response — see module
    // doc comment. Nothing here surfaces it to the UI.
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Couldn't reach the login service. Check your connection and try again.",
    };
  }
}

/**
 * @param {string} mobile
 * @param {string} otp
 * @returns {Promise<{ok:boolean, session?:object, message?:string}>} Never throws.
 */
export async function verifyMobileOtp(mobile, otp) {
  const digits = normalizeMobile(mobile);
  const code = String(otp || '').replace(/\D/g, '');
  if (digits.length !== 10) return { ok: false, message: 'Enter a valid 10-digit mobile number.' };
  if (code.length !== 6) return { ok: false, message: 'Enter the complete 6-digit OTP.' };

  try {
    const res = await fetch(`${base()}/auth/login`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      // Field name is "email" per the shared LoginRequest DTO, but the
      // backend accepts a bare mobile number here — see module doc comment.
      body: JSON.stringify({ email: digits, otp: code }),
    });
    if (!res.ok) {
      const body = await readJson(res);
      const message = messageFrom(body);
      return { ok: false, message: message || 'The OTP you entered is incorrect. Please try again.' };
    }
    const data = await res.json().catch(() => ({}));
    const token = data && data.accessToken;
    if (!token) return { ok: false, message: 'Login failed — no token returned.' };

    return {
      ok: true,
      session: {
        token,
        mobile: digits,
        userId: data.userId,
        shopId: data.shopId,
        shopName: data.shopName,
        name: data.name,
        email: data.email,
        roles: data.roles,
        roleLabel: data.roleLabel,
        loginScope: data.loginScope,
        loginType: data.loginType || 'SHOP_LOGIN',
        shops: data.shops,
      },
    };
  } catch {
    return {
      ok: false,
      message: "Couldn't reach the login service. Check your connection and try again.",
    };
  }
}
