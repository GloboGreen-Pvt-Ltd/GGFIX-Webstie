'use client';

/**
 * Sidebar — the GGFIX Partner Dashboard left navigation.
 *
 * Two renders share this one component rather than duplicating markup:
 *   - desktop: fixed, `collapsed` toggles icon-only mode
 *   - mobile: a slide-in drawer over a backdrop, controlled by `mobileOpen`
 * Both read the same PARTNER_NAV data and the same active-route logic, so
 * there is exactly one source of truth for "what's in the sidebar" and
 * "what's active right now".
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, X } from 'lucide-react';

import { cx } from '@/components/site/ui';
import { BRAND } from '@/lib/siteContent';
import { DASHBOARD_ITEM, PARTNER_NAV, resolveNavContext } from '@/lib/partnerNav';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

function SidebarBrand({ collapsed, shopOwner }) {
  return (
    <div className={cx('flex items-center gap-2.5 px-4 py-4', collapsed && 'justify-center px-2')}>
      <Image src={BRAND.logo} alt="" width={34} height={34} className="h-[34px] w-[34px] shrink-0 rounded-xl object-contain" />
      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold leading-tight text-[#101828]">GGFIX Partner</p>
          <p className="truncate text-xs text-[#667085]">Business Dashboard</p>
          {shopOwner?.shopName ? (
            <p className="mt-0.5 truncate text-[0.68rem] font-semibold text-[#15803D]">{shopOwner.shopName}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DashboardLink({ collapsed, active, onNavigate }) {
  const Icon = DASHBOARD_ITEM.icon;
  return (
    <Link
      href={DASHBOARD_ITEM.href}
      onClick={onNavigate}
      title={collapsed ? DASHBOARD_ITEM.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
        collapsed && 'justify-center px-0',
        FOCUS_RING,
        active
          ? cx(
              'bg-[#DCFCE7] text-[#15803D]',
              !collapsed && "before:absolute before:-left-2.5 before:top-1/2 before:h-6 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-[#15803D] before:content-['']",
            )
          : 'text-[#344054] hover:bg-[#F0FDF4]',
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {!collapsed ? <span className="truncate">{DASHBOARD_ITEM.label}</span> : null}
    </Link>
  );
}

function SidebarSection({ section, collapsed, open, onToggle, activeItemKey, onNavigate }) {
  const hasActive = section.items.some((item) => item.key === activeItemKey);
  const SectionIcon = section.icon;

  if (collapsed) {
    return (
      <div className="mt-1">
        <p className="px-0 pb-1 text-center text-[0.6rem] font-bold uppercase tracking-wide text-[#98A2B3]">
          {section.label[0]}
        </p>
        <ul className="space-y-1">
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = item.key === activeItemKey;
            return (
              <li key={item.key}>
                <Link
                  href={`/shop-home/${item.slug}`}
                  onClick={onNavigate}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'flex items-center justify-center rounded-lg py-2.5 transition',
                    FOCUS_RING,
                    active ? 'bg-[#DCFCE7] text-[#15803D]' : 'text-[#344054] hover:bg-[#F0FDF4]',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cx(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition',
          FOCUS_RING,
          hasActive && !open ? 'text-[#15803D]' : 'text-[#101828] hover:bg-[#F0FDF4]',
        )}
      >
        <SectionIcon className="h-[18px] w-[18px] shrink-0 text-[#667085]" aria-hidden="true" />
        <span className="flex-1 truncate uppercase tracking-wide text-xs">{section.label}</span>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-[#98A2B3] transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {/* Grid-rows accordion trick: animates height without measuring the
          content, and never clips focus outlines the way max-height + hidden
          overflow can. */}
      <div className={cx('grid transition-[grid-template-rows] duration-200 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <ul className="ml-[1.55rem] mt-0.5 space-y-0.5 border-l border-[#EAECF0] py-1 pl-3">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = item.key === activeItemKey;
              return (
                <li key={item.key}>
                  <Link
                    href={`/shop-home/${item.slug}`}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition',
                      FOCUS_RING,
                      active
                        ? "bg-[#DCFCE7] text-[#15803D] font-semibold before:absolute before:-left-3 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-[#15803D] before:content-['']"
                        : 'text-[#475467] hover:bg-[#F0FDF4] hover:text-[#101828]',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile, shopOwner }) {
  const pathname = usePathname();
  const { sectionKey: activeSectionKey } = resolveNavContext(pathname);
  const activeItem = PARTNER_NAV.flatMap((s) => s.items).find((item) => `/shop-home/${item.slug}` === (pathname || '').replace(/\/+$/, ''));

  const [openSection, setOpenSection] = useState(activeSectionKey);

  /* Keep the section containing the active route expanded when navigation
   * happens via a direct URL, refresh, or back/forward — not just clicks. */
  useEffect(() => {
    if (activeSectionKey) setOpenSection(activeSectionKey);
  }, [activeSectionKey]);

  /* Escape closes the mobile drawer; body scroll is locked while it's open
   * so the page behind it can't scroll away underneath it. */
  useEffect(() => {
    if (!mobileOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') onCloseMobile();
    }
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen, onCloseMobile]);

  const toggleSection = (key) => setOpenSection((current) => (current === key ? null : key));

  const content = (isCollapsed, onNavigate) => (
    <nav aria-label="Partner dashboard" className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[#EAECF0]">
        <SidebarBrand collapsed={isCollapsed} shopOwner={shopOwner} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3">
        <DashboardLink collapsed={isCollapsed} active={pathname === '/shop-home'} onNavigate={onNavigate} />

        {PARTNER_NAV.map((section) => (
          <SidebarSection
            key={section.key}
            section={section}
            collapsed={isCollapsed}
            open={!isCollapsed && openSection === section.key}
            onToggle={() => toggleSection(section.key)}
            activeItemKey={activeItem?.key}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop — fixed, collapsible */}
      <aside
        className={cx(
          'sticky top-0 hidden h-screen shrink-0 border-r border-[#EAECF0] bg-white transition-[width] duration-200 lg:block',
          collapsed ? 'w-[76px]' : 'w-[260px]',
        )}
      >
        {content(collapsed, undefined)}
      </aside>

      {/* Mobile — slide-in drawer over a backdrop */}
      <div className={cx('fixed inset-0 z-50 lg:hidden', !mobileOpen && 'pointer-events-none')} aria-hidden={!mobileOpen}>
        <div
          onClick={onCloseMobile}
          className={cx('absolute inset-0 bg-[#101828]/50 transition-opacity duration-200', mobileOpen ? 'opacity-100' : 'opacity-0')}
        />
        <div
          className={cx(
            'absolute inset-y-0 left-0 flex w-[82%] max-w-[300px] flex-col bg-white shadow-lift transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#EAECF0] px-2">
            <div className="min-w-0 flex-1">
              <SidebarBrand collapsed={false} shopOwner={shopOwner} />
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close menu"
              className={cx('mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#667085] hover:bg-[#F0FDF4]', FOCUS_RING)}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3">
            <DashboardLink collapsed={false} active={pathname === '/shop-home'} onNavigate={onCloseMobile} />
            {PARTNER_NAV.map((section) => (
              <SidebarSection
                key={section.key}
                section={section}
                collapsed={false}
                open={openSection === section.key}
                onToggle={() => toggleSection(section.key)}
                activeItemKey={activeItem?.key}
                onNavigate={onCloseMobile}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
