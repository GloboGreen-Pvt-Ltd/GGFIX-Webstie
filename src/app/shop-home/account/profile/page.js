'use client';

/**
 * /shop-home/account/profile — "My Profile".
 *
 * Real data only: every field here comes from the signed-in shopAuth session
 * (see src/lib/shopAuth.js), refreshed on mount from GET /auth/me so the
 * photo and name are never stale. The avatar upload is a real two-step
 * flow against auth-service (src/lib/shopProfile.js):
 *   1. POST /auth/me/kyc-documents/upload (type=avatar) -> S3 URL
 *   2. PUT  /auth/me/avatar { avatarUrl }               -> persists it
 * mirroring the customer-facing avatar upload at src/app/(site)/account/profile.
 *
 * The "Edit Profile" action still links to Account Settings, which is still
 * a stub — there's no update-profile endpoint for name/email/mobile yet, so
 * those fields stay a read-only display, same as before this change.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Leaf, Loader2, Lock, Mail, Pencil, Phone, ShieldCheck, Store, User } from 'lucide-react';

import { cx } from '@/components/site/ui';
import { readShopOwner, subscribe, updateShopOwnerSession } from '@/lib/shopAuth';
import { fetchMyProfile, saveMyAvatar, uploadMyAvatar } from '@/lib/shopProfile';
import PageHeader from '@/components/shop-dashboard/PageHeader';
import { deriveDisplayName, initialsOf } from '@/components/shop-dashboard/ProfileDropdown';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

function formatMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return digits ? `+91 ${digits}` : null;
}

function Field({ label, icon: Icon, value }) {
  if (!value) return null;
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-[#344054]">{label}</label>
      <div className="flex items-center gap-2.5 rounded-xl border border-[#D0D5DD] bg-[#F9FAFB] px-3.5 py-2.5 text-sm font-medium text-[#101828]">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-[#667085]" aria-hidden="true" /> : null}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function AvatarWithUpload({ avatarUrl, name, uploading, onPick }) {
  const [failed, setFailed] = useState(false);
  const validImage = avatarUrl && !failed;

  useEffect(() => setFailed(false), [avatarUrl]);

  return (
    <span className="relative inline-flex shrink-0">
      <span className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-xl font-bold text-white ring-4 ring-white">
        {validImage ? (
          <img src={avatarUrl} alt={`${name || 'Owner'} avatar`} className="h-full w-full object-cover" onError={() => setFailed(true)} />
        ) : (
          initialsOf(name)
        )}
      </span>
      <button
        type="button"
        onClick={onPick}
        disabled={uploading}
        aria-label={avatarUrl ? 'Change profile photo' : 'Upload profile photo'}
        className={cx(
          'absolute -bottom-0.5 -right-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#15803D] shadow-[0_1px_4px_rgba(16,24,40,0.2)] ring-2 ring-white transition hover:bg-[#F0FDF4]',
          FOCUS_RING,
        )}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Camera className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
    </span>
  );
}

export default function ProfilePage() {
  const [shopOwner, setShopOwner] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setShopOwner(readShopOwner());
    const unsub = subscribe((session) => setShopOwner(session));
    return unsub;
  }, []);

  // Refresh from the live backend once on mount so the photo/name are never
  // stale relative to what another device or the admin panel last saved.
  useEffect(() => {
    fetchMyProfile()
      .then((profile) => updateShopOwnerSession(profile))
      .catch(() => {
        /* Session data still renders a useful page while the service is unreachable. */
      });
  }, []);

  const name = shopOwner ? deriveDisplayName(shopOwner) : '';
  const mobile = formatMobile(shopOwner?.mobile);

  const pickAvatar = () => {
    setAvatarError('');
    inputRef.current?.click();
  };

  const onAvatarFile = async (event) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = '';
    if (!file) return;

    const nameLooksAllowed = /\.(png|jpe?g)$/i.test(file.name || '');
    const typeLooksAllowed = ['image/png', 'image/jpeg'].includes(file.type);
    if (!nameLooksAllowed && !typeLooksAllowed) {
      setAvatarError('Choose a PNG or JPG image.');
      return;
    }
    if (file.size > 1024 * 1024) {
      setAvatarError('Choose an image smaller than 1 MB.');
      return;
    }

    setAvatarUploading(true);
    setAvatarError('');
    try {
      const url = await uploadMyAvatar(file);
      const profile = await saveMyAvatar(url);
      updateShopOwnerSession(profile);
    } catch (error) {
      setAvatarError(error?.message || 'Could not upload your photo.');
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" className="hidden" onChange={onAvatarFile} />

      <PageHeader
        title="My Profile"
        subtitle="Manage your personal information"
        action={
          <Link
            href="/shop-home/account/settings"
            className={cx(
              'inline-flex items-center gap-1.5 rounded-xl bg-[#101828] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D2939]',
              FOCUS_RING,
            )}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit Profile
          </Link>
        }
      />

      {/* ---- Banner + Personal Information card ---------------------------- */}
      <section className="overflow-hidden rounded-3xl border border-[#EAECF0] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
        {/* Gradient identity banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#DCFCE7] via-[#F0FDF4] to-white px-5 py-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <AvatarWithUpload avatarUrl={shopOwner?.avatarUrl} name={name} uploading={avatarUploading} onPick={pickAvatar} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-xl font-bold text-[#101828]">{name}</p>
                  {shopOwner?.roleLabel ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-[#15803D] shadow-[0_1px_2px_rgba(16,24,40,0.08)]">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {shopOwner.roleLabel}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#475467]">
                  {shopOwner?.email ? (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {shopOwner.email}
                    </span>
                  ) : null}
                  {shopOwner?.shopName ? (
                    <span className="flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {shopOwner.shopName}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-xs font-medium italic text-[#667085]">Reliable service. Greener tomorrow.</p>
                {avatarError ? <p className="mt-1.5 text-xs font-semibold text-red-600">{avatarError}</p> : null}
              </div>
            </div>

            {/* Decorative quote — hidden on narrow screens, purely visual */}
            <div className="relative hidden shrink-0 items-center gap-3 rounded-2xl bg-white/60 px-5 py-4 sm:flex">
              <Leaf className="h-8 w-8 shrink-0 text-[#15803D]/30" aria-hidden="true" />
              <p className="max-w-[180px] text-right text-sm font-semibold italic leading-snug text-[#166534]">
                &ldquo;Powering a Greener, More Sustainable World&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="border-t border-[#EAECF0] p-5 sm:p-8">
          <h2 className="mb-5 text-base font-bold text-[#101828]">Personal Information</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full Name" icon={User} value={name} />
            <Field label="Email Address" icon={Mail} value={shopOwner?.email} />
            <Field label="Mobile Number" icon={Phone} value={mobile} />
            <Field label="Business" icon={Store} value={shopOwner?.shopName} />
            <Field label="Role" icon={ShieldCheck} value={shopOwner?.roleLabel} />
          </div>
        </div>
      </section>

      {/* ---- Privacy note -------------------------------------------------- */}
      <div className="flex flex-col gap-4 rounded-2xl bg-[#DCFCE7] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#15803D]">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#101828]">Your information is safe with us</p>
            <p className="mt-0.5 text-sm text-[#166534]">
              Your contact details stay private and are only used for service updates.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[#166534]">
          <Leaf className="h-4 w-4" aria-hidden="true" />
          Secure today. A greener tomorrow.
        </div>
      </div>
    </div>
  );
}
