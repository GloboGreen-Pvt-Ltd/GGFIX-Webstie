'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Bell } from 'lucide-react';
import { getToken, setToken, setRole } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

// Higher-level section label for the topbar (breadcrumbs/title live in-page).
// Routes are flat under /management/, so the old startsWith('/admin/master')
// style grouping is gone — the section is keyed off the first path segment.
const SECTION_BY_SLUG = {
  // Master Data
  'device-categories': 'Master Admin',
  brands: 'Master Admin',
  'category-brand-mapping': 'Master Admin',
  series: 'Master Admin',
  models: 'Master Admin',
  'repair-services': 'Master Admin',
  'repair-categories': 'Master Admin',
  'technician-work-statuses': 'Master Admin',
  // Sell Flow Master Data
  'screening-questions': 'Master Admin',
  'condition-categories': 'Master Admin',
  'condition-groups': 'Master Admin',
  'functional-issues': 'Master Admin',
  'device-configuration': 'Master Admin',
  // Customer App Directory
  banners: 'Customer App Directory',
  'support-contacts': 'Customer App Directory',
  'faq-items': 'Customer App Directory',
  'app-content': 'Customer App Directory',
  'shop-directory': 'Customer App Directory',
  // Marketplace
  items: 'Marketplace',
  // Standalone sections
  shops: 'Shop Management',
  'user-management': 'User Management',
  users: 'Shop Staff',
  subscriptions: 'Subscriptions',
};

function deriveSection(pathname) {
  if (!pathname) return 'Admin';
  const slug = pathname.split('/').filter(Boolean)[1]; // ['management', <slug>, …]
  return SECTION_BY_SLUG[slug] || 'Dashboard';
}

// Avatar initial from the JWT email/sub claim (no user endpoint needed).
function initialFromToken() {
  try {
    const t = getToken();
    const payload = JSON.parse(atob(t.split('.')[1]));
    const s = payload.email || payload.sub || 'A';
    return String(s).charAt(0).toUpperCase();
  } catch {
    return 'A';
  }
}

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!getToken()) {
      router.replace('/management');
    }
  }, [mounted, router, pathname]);

  const handleLogout = () => {
    setToken(null);
    setRole(null);
    router.replace('/management');
  };

  const section = useMemo(() => deriveSection(pathname), [pathname]);
  const initial = mounted ? initialFromToken() : 'A';

  if (!mounted || !getToken()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-admin-dark">
        <p className="text-admin-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-admin-dark">
      <Sidebar onLogout={handleLogout} />
      <div className="flex flex-1 min-w-0 flex-col">
        <header className="h-16 shrink-0 flex items-center justify-between gap-4 border-b border-admin-border bg-white px-6">
          <h1 className="text-lg font-semibold text-slate-900">{section}</h1>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search…"
                className="w-56 rounded-lg border border-admin-border bg-admin-dark py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
              />
            </div>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-admin-border text-slate-500 hover:bg-admin-dark hover:text-slate-700"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">3</span>
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-admin-accent text-sm font-semibold text-white" title="Account">
              {initial}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
