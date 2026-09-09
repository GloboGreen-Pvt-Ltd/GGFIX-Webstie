/**
 * shopProfile.js — the shop owner's own profile (/shop-home/account/profile).
 *
 * Backed by auth-service's existing "me" self-service routes:
 *   GET  {AUTH_BASE}/auth/me                        -> ShopOwnerView (live profile)
 *   POST {AUTH_BASE}/auth/me/kyc-documents/upload    -> { url }  (type=avatar)
 *   PUT  {AUTH_BASE}/auth/me/avatar                  -> ShopOwnerView (persists it)
 *
 * AUTH_BASE() already ends in "/auth" (see src/lib/api.js) — nginx strips that
 * prefix before proxying, and the Spring controller is @RequestMapping("/auth"),
 * so every path below repeats "/auth/..." same as shopAuth.js's login() does.
 *
 * Upload and save are two separate calls (mirrors the existing KYC document
 * flow) rather than one endpoint, so a failed save after a successful upload
 * can be retried without re-uploading the file.
 */

import { AUTH_BASE } from '@/lib/api';
import { shopRequest } from '@/lib/shopApi';
import { SHOP_TOKEN_KEY } from '@/lib/shopAuth';

function base() {
  return String(AUTH_BASE() || '').replace(/\/$/, '');
}

/** The authenticated owner's live profile — avatarUrl, name, shop list, etc. */
export async function fetchMyProfile() {
  return shopRequest(base(), '/auth/me');
}

/** Uploads an image to S3 and returns its public URL. Does not persist it — call saveMyAvatar() next. */
export async function uploadMyAvatar(file) {
  const fd = new FormData();
  fd.append('type', 'avatar');
  fd.append('file', file);
  const token = typeof window !== 'undefined' ? window.localStorage.getItem(SHOP_TOKEN_KEY) : null;
  const res = await fetch(`${base()}/auth/me/kyc-documents/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const data = await res.json().catch(() => ({}));
  if (!data?.url) throw new Error('Upload succeeded but no URL was returned.');
  return data.url;
}

/** Persists a previously-uploaded avatar URL onto the owner's account. Returns the refreshed profile. */
export async function saveMyAvatar(avatarUrl) {
  return shopRequest(base(), '/auth/me/avatar', {
    method: 'PUT',
    body: JSON.stringify({ avatarUrl }),
  });
}
