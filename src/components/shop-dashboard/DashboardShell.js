'use client';

/**
 * DashboardShell — the Partner Dashboard's layout chrome (sidebar +
 * top navbar) plus its auth guard, shared across every route under
 * /shop-home/* via src/app/shop-home/layout.js.
 *
 * The guard is the exact same check src/app/shop-home/page.js used to do
 * itself (isLoggedIn() from src/lib/shopAuth.js, redirect to
 * /shopmanagement if absent) — moved up to the layout so it protects every
 * dashboard route once, instead of being duplicated across ~30 pages.
 */

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { cx } from '@/components/site/ui';
import { isLoggedIn, readShopOwner, subscribe } from '@/lib/shopAuth';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

export default function DashboardShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [shopOwner, setShopOwner] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setShopOwner(readShopOwner());
    const unsub = subscribe((session) => setShopOwner(session));
    return unsub;
  }, []);

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
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="h-7 w-7 animate-spin text-brand-600" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        shopOwner={shopOwner}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar pathname={pathname} onOpenMobileMenu={() => setMobileOpen(true)} shopOwner={shopOwner} />

        {/* Collapse toggle — a small tab riding the edge between sidebar and
            content, desktop only, so it doesn't compete with the mobile
            hamburger inside TopNavbar. */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cx(
            'fixed top-20 z-20 hidden h-7 w-7 items-center justify-center rounded-full border border-[#EAECF0] bg-white text-[#667085] shadow-[0_1px_3px_rgba(16,24,40,0.08)] transition-[left] duration-200 hover:text-[#15803D] lg:flex',
            FOCUS_RING,
          )}
          style={{ left: collapsed ? '68px' : '252px' }}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
        </button>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
