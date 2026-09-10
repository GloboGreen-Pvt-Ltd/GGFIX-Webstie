'use client';

/**
 * ProfileDropdown — avatar + name/role trigger, opening the account menu.
 *
 * The shopAuth session can come from either real path: the original
 * email/password/OTP login() (carries { email, loginType }, never a name),
 * or the mobile Business Login flow (POST /auth/shop-login — carries
 * { mobile, name, shopName, roleLabel, loginType }, all real backend
 * fields). deriveDisplayName() prefers the real name when present, falling
 * back to something derived from email/mobile for the older path. Neither
 * path returns an avatarUrl yet, so this always falls back to initials —
 * per "do not hard-code," nothing here invents a name or picture. If
 * avatarUrl is ever added to the response, the `shopOwner?.avatarUrl`
 * branch below picks it up with no other change needed.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Settings, Store } from 'lucide-react';

import { cx } from '@/components/site/ui';
import { logout } from '@/lib/shopAuth';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

const LOGIN_TYPE_LABEL = {
  SHOP_OWNER: 'Business Owner',
  SHOP_LOGIN: 'Business Owner',
};

export function deriveDisplayName(shopOwner) {
  // Real name from POST /auth/shop-login (see shopMobileAuth.js) or the
  // legacy fullName field, in that order of preference.
  if (shopOwner?.name) return shopOwner.name;
  if (shopOwner?.fullName) return shopOwner.fullName;
  if (shopOwner?.email) {
    const local = String(shopOwner.email).split('@')[0];
    if (local) {
      return local
        .replace(/[._-]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ');
    }
  }
  if (shopOwner?.mobile) {
    const digits = String(shopOwner.mobile).replace(/\D/g, '');
    if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    if (digits) return `+91 ${digits}`;
  }
  return 'Partner';
}

export function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  // A phone-number-shaped name (from the mobile-OTP path) has no letters to
  // take initials from — fall back to the last two digits instead, so the
  // avatar never shows a stray "+9".
  const firstAlpha = parts.find((p) => /[a-zA-Z]/.test(p));
  if (!firstAlpha) {
    const digits = parts.join('').replace(/\D/g, '');
    return digits.slice(-2) || '?';
  }
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const lastAlpha = [...parts].reverse().find((p) => /[a-zA-Z]/.test(p)) || firstAlpha;
  return (firstAlpha[0] + lastAlpha[0]).toUpperCase();
}

const MENU_LINKS = [
  { href: '/shop-home/account/business-profile', label: 'Business Profile', icon: Store },
  { href: '/shop-home/account/settings', label: 'Account Settings', icon: Settings },
];

export default function ProfileDropdown({ shopOwner }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const displayName = deriveDisplayName(shopOwner);
  const roleLabel =
    shopOwner?.roleLabel || LOGIN_TYPE_LABEL[shopOwner?.loginType] || shopOwner?.loginType || 'Business Owner';
  const initials = initialsOf(displayName);
  const avatarUrl = shopOwner?.avatarUrl;

  useEffect(() => {
    if (!open) return undefined;
    function onDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function handleLogout() {
    setOpen(false);
    logout();
    router.replace('/shopmanagement');
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cx(
          'flex items-center gap-2 rounded-xl border border-transparent py-1 pl-1 pr-2 transition hover:border-[#EAECF0] hover:bg-[#F9FAFB]',
          FOCUS_RING,
        )}
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-bold text-white sm:h-11 sm:w-11">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-supplied remote avatar, not a local asset next/image can optimise reliably.
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[9rem] truncate text-sm font-bold text-[#101828]">{displayName}</span>
          <span className="block truncate text-xs text-[#667085]">{roleLabel}</span>
        </span>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-[#667085] transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 overflow-hidden rounded-2xl border border-[#EAECF0] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.08),0_12px_28px_rgba(16,24,40,0.08)]"
        >
          <div className="flex items-center gap-3 border-b border-[#EAECF0] bg-[#F9FAFB] px-4 py-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-bold text-white">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#101828]">{displayName}</p>
              <p className="truncate text-xs text-[#667085]">{roleLabel}</p>
            </div>
          </div>

          <ul className="py-1.5">
            {MENU_LINKS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={cx(
                    'flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#F0FDF4]',
                    FOCUS_RING,
                  )}
                >
                  <Icon className="h-4 w-4 text-[#667085]" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-t border-[#EAECF0] py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className={cx(
                'flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#DC2626] transition hover:bg-red-50',
                FOCUS_RING,
              )}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
