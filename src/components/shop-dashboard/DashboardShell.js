'use client';

/**
 * DashboardShell — the Partner Dashboard's layout chrome (header nav +
 * mobile drawer) plus its auth guard, shared across every route under
 * /shop-home/* via src/app/shop-home/layout.js.
 *
 * 2026-09: header-only navigation (HeaderNav.js, mega-menu dropdowns) —
 * explicitly no left sidebar (one was added and then explicitly reverted
 * the same day). MobileNavDrawer.js covers the narrow-viewport case, since
 * a mega-menu doesn't fit a phone screen.
 *
 * The guard is the exact same check src/app/shop-home/page.js used to do
 * itself (isLoggedIn() from src/lib/shopAuth.js, redirect to
 * /shopmanagement if absent) — moved up to the layout so it protects every
 * dashboard route once, instead of being duplicated across ~30 pages.
 *
 * Nav badges (Pickups / Bookings / Enquiries) are fetched once here — not
 * per-page — since the header persists across navigation. Each of the
 * three calls is independently caught so one failing endpoint doesn't
 * blank every badge. Leave Management and Notifications intentionally never
 * get a badge: there is no backend endpoint in this web client to compute
 * either count for real, and a fabricated number is worse than none.
 */

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { isLoggedIn, readShopOwner, subscribe } from '@/lib/shopAuth';
import { fetchShopBookings, fetchShopChats, fetchTicketCounts, openEnquiries, pendingPickups, sumActiveRepairs } from '@/lib/shopDashboard';
import HeaderNav from './HeaderNav';
import MobileNavDrawer from './MobileNavDrawer';

export default function DashboardShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [shopOwner, setShopOwner] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState({});

  useEffect(() => {
    setMounted(true);
    setShopOwner(readShopOwner());
    const unsub = subscribe((session) => setShopOwner(session));
    return unsub;
  }, []);

  useEffect(() => {
    if (!mounted || !isLoggedIn()) return;
    let alive = true;

    fetchShopBookings()
      .then((bookings) => {
        if (!alive) return;
        setBadges((b) => ({ ...b, pickups: pendingPickups(bookings).length }));
      })
      .catch(() => {});

    fetchTicketCounts()
      .then((counts) => {
        if (!alive) return;
        setBadges((b) => ({ ...b, bookings: sumActiveRepairs(counts) }));
      })
      .catch(() => {});

    fetchShopChats()
      .then((chats) => {
        if (!alive) return;
        setBadges((b) => ({ ...b, enquiries: openEnquiries(chats).length }));
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (!isLoggedIn()) router.replace('/shopmanagement');
  }, [mounted, router]);

  /* Close the mobile drawer on route change. */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!mounted || !isLoggedIn()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7FBF9]">
        <Loader2 className="h-7 w-7 animate-spin text-brand-600" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FBF9]">
      <HeaderNav pathname={pathname} shopOwner={shopOwner} badges={badges} onOpenMobileMenu={() => setMobileOpen(true)} />

      <MobileNavDrawer mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} shopOwner={shopOwner} badges={badges} />

      <main className="min-w-0 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}
