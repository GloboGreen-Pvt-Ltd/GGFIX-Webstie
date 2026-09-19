'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  CircleHelp,
  Headset,
  Home,
  Info,
  Mail,
  MapPin,
  Menu,
  Package,
  Search,
  ShieldCheck,
  Smartphone,
  Store,
  Tag,
  X,
} from 'lucide-react';

import { BRAND, SITE_NAV, CTA } from '@/lib/siteContent';
import { Button, cx } from './ui';
import SiteSearch from './SiteSearch';
import LocationControl from './LocationControl';
import HeaderAccount from './HeaderAccount';
import HeaderCart from './HeaderCart';
import RepairNavMenu from './RepairNavMenu';

/**
 * Icon shown before each primary-nav label. Keyed by href — '/repair' is
 * deliberately absent, since RepairNavMenu owns its own trigger and icon.
 */
const NAV_ICONS = {
  '/': Home,
  '/#sell': Tag,
  '/#buy': Smartphone,
  '/nearby-shops': Store,
  '/about': Info,
  '/faq': CircleHelp,
  '/contact': Mail,
};

/* -------------------------------------------------------------------------- */
/* Active route                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Exactly one nav item may render as active.
 *
 * Four of the eight items are in-page anchors on the home page ('/', '/#repair',
 * '/#sell', '/#buy'). usePathname() returns '/' for all four and never includes
 * the hash, so any naive normalise-and-compare lights up all four at once.
 *
 * The deliberate rule: an item is only ever active if its href has NO hash.
 * Hash items are section jumps, not destinations, so on the home page only
 * "Home" is highlighted. Tracking which section is on screen would need scroll
 * observation and is explicitly out of scope — this is the honest fallback, and
 * it is structurally incapable of marking two items at once.
 */
function isActive(pathname, href) {
  if (!pathname || !href) return false;
  if (href.includes('#')) return false;

  // trailingSlash: true means pathname can arrive as '/about/' or '/about'.
  const current = pathname !== '/' ? pathname.replace(/\/+$/, '') : '/';
  const target = href !== '/' ? href.replace(/\/+$/, '') : '/';

  if (target === '/') return current === '/';
  return current === target || current.startsWith(`${target}/`);
}

/* -------------------------------------------------------------------------- */
/* Shared classes                                                              */
/* -------------------------------------------------------------------------- */

/* ring-brand-700, not the ring-brand-500 baked into ui.js's BUTTON_BASE:
 * brand-500 measures ~2.3:1 against white and misses the 3:1 non-text contrast
 * floor (WCAG 1.4.11) that a focus indicator has to clear. Matches SiteSearch,
 * LocationControl and CategoryRail. */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

const ICON_BUTTON = cx(
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-line',
  'text-brand-ink transition hover:bg-brand-soften',
  FOCUS_RING,
);

/* -------------------------------------------------------------------------- */
/* Header                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * SiteHeader — sticky, translucent public-site header.
 *
 * Three bands on lg+: a slim trust/utility bar, the primary row (identity +
 * tools), and the eight-item menu row. One row cannot hold all of it — logo +
 * a usefully wide search + the tool cluster + eight links crowds badly below
 * ~1400px and wraps raggedly, so the split is the layout that holds from
 * 360px to 1920px rather than a stylistic choice.
 *
 * The utility bar collapses (max-height + opacity) once the page has been
 * scrolled past a few pixels, and the header gains a soft shadow — a compact,
 * still-sticky state rather than the taller first-paint one. Purely visual:
 * it does not remount anything, so no state (search query, open menu, login
 * modal) is lost when it happens.
 *
 * Below lg the second row is dropped entirely: the menu, the location control
 * and the account/business controls move into the disclosure panel, and
 * search collapses to an icon that reveals a full-width field. A compact
 * quick-access cluster (account icon, business icon) stays visible in row 1
 * even below lg, duplicating what's in the panel — the same trade already
 * made for "Get the app" (visible from sm up AND repeated in the panel for
 * <360px), because a hamburger alone would hide account access an extra tap
 * deep on a screen where it is used constantly.
 *
 * Cart and Orders are real routes (see HeaderCart / /account/orders) —
 * compact icon shortcuts here, in addition to their full entries inside the
 * account dropdown / panel.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const panelId = useId();
  const searchRowId = useId();

  const menuButtonRef = useRef(null);
  const searchButtonRef = useRef(null);
  const firstPanelLinkRef = useRef(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  /* The two disclosures are mutually exclusive: both are full-width bands under
   * the same header, and opening one on top of the other reads as a glitch. */
  const toggleMenu = useCallback(() => {
    setMenuOpen((value) => {
      if (!value) setSearchOpen(false);
      return !value;
    });
  }, []);

  const toggleSearch = useCallback(() => {
    setSearchOpen((value) => {
      if (!value) setMenuOpen(false);
      return !value;
    });
  }, []);

  /* -- close on navigation ------------------------------------------------- */
  /* Route changes close both. Note this fires on pathname only, so a jump from
   * /about to /#repair closes correctly, but tapping "Repair" while already on
   * the home page does NOT change the pathname — the onClick handlers on the
   * panel links cover that case. Both paths are needed; neither alone is
   * sufficient. */
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  /* -- scroll: collapse the utility bar, compact the header ---------------- */
  /* Purely presentational — a threshold flip, not a scroll-linked animation,
   * so there is nothing here to throttle beyond the browser's own passive
   * scroll batching. */
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* -- Escape + scroll lock ------------------------------------------------ */
  useEffect(() => {
    if (!menuOpen) return undefined;

    function onKeyDown(event) {
      if (event.key !== 'Escape') return;
      // Same one-level-at-a-time rule as the search row. LocationControl lives
      // INSIDE this panel and marks Escape handled while its own popover is
      // open, so a single press closes the popover without also tearing down
      // the menu around it.
      if (event.defaultPrevented) return;
      setMenuOpen(false);
      // Return focus to the trigger, or a keyboard user is stranded at the top
      // of the document (WCAG 2.4.3).
      if (menuButtonRef.current) menuButtonRef.current.focus();
    }

    document.addEventListener('keydown', onKeyDown);

    /* The panel itself scrolls (max-h + overflow-y-auto below), so locking the
     * body is safe: a tall menu on a short phone is still fully reachable, and
     * the page behind cannot scroll away underneath it. */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  /* Move focus into the panel when it opens, so the next Tab continues from
   * inside it rather than from the top of the page. */
  useEffect(() => {
    if (!menuOpen) return;
    if (firstPanelLinkRef.current) firstPanelLinkRef.current.focus();
  }, [menuOpen]);

  /* Escape also closes the collapsed search row — but only once SiteSearch has
   * nothing left to consume. It marks the event handled (preventDefault) while
   * its dropdown is open or its field has text, and the guard below honours
   * that, so Escape steps out one level at a time: dropdown, then query, then
   * the row. It never does two of those at once. */
  useEffect(() => {
    if (!searchOpen) return undefined;

    function onKeyDown(event) {
      if (event.key !== 'Escape') return;
      // SiteSearch calls preventDefault() when it consumes Escape (closing its
      // own dropdown, or clearing the field). Without this guard one press did
      // BOTH — the dropdown closed and the entire search row collapsed, taking
      // the query with it. Checked rather than relying on stopPropagation:
      // React's delegated listener and this one are both on `document`, and
      // stopPropagation does not stop other listeners on the same node.
      if (event.defaultPrevented) return;
      setSearchOpen(false);
      if (searchButtonRef.current) searchButtonRef.current.focus();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [searchOpen]);

  const navLinkClass = (active, size) => {
    if (size === 'lg') {
      // Mobile panel — a pill still reads well as a full-width tap target.
      // flex (not block): callers put an icon beside the label inside it.
      return cx(
        'flex items-center gap-2.5 rounded-full px-4 py-3 text-base font-semibold transition',
        FOCUS_RING,
        active
          ? 'bg-brand-soft text-brand-700'
          : 'text-brand-muted hover:bg-brand-soften hover:text-brand-ink',
      );
    }
    // Desktop row — a filled pill, matching the mobile panel's active state.
    // The icon has no colour class of its own, so it inherits text-brand-700
    // (active) or text-brand-muted (inactive) from this same className via
    // currentColor — one toggle drives both the label and the icon.
    return cx(
      'rounded-full px-3.5 py-2 text-sm font-semibold transition',
      FOCUS_RING,
      active
        ? 'bg-brand-soft text-brand-700'
        : 'text-brand-muted hover:bg-brand-soften hover:text-brand-ink',
    );
  };

  return (
    /* No overflow clipping anywhere on the header: the search listbox, the
     * location popover and the Repair mega-menu are absolutely positioned
     * children and must be allowed to spill below it. The header sits at
     * z-50 so they land above the page. */
    <header
      className={cx(
        'sticky top-0 z-50 border-b border-brand-line bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70',
        'transition-shadow duration-200',
        scrolled && 'shadow-soft',
      )}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Level 1 — utility / trust bar                                       */}
      {/* ------------------------------------------------------------------ */}
      {/* Light, compact and deliberately non-dominant — every link here is a
          real route (no invented "24/7" or language-switch claims the rest of
          the site does not back up). Same taglineShort BRAND already ships. */}
      <div
        className={cx(
          'hidden overflow-hidden border-b border-brand-line bg-brand-50 transition-[max-height,opacity] duration-200 sm:block',
          scrolled ? 'max-h-0 opacity-0' : 'max-h-9 opacity-100',
        )}
      >
        <div className="mx-auto flex h-9 w-full max-w-[1440px] items-center justify-between gap-6 px-4 text-xs sm:px-5 lg:px-6">
          <p className="flex min-w-0 items-center gap-1.5 truncate font-semibold text-brand-800">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
            <span className="truncate">{BRAND.taglineShort}</span>
          </p>
          <ul className="flex shrink-0 items-center divide-x divide-brand-line font-medium text-brand-muted">
            <li className="pr-4">
              <Link
                href="/nearby-shops"
                className={cx('flex items-center gap-1.5 rounded transition hover:text-brand-700', FOCUS_RING)}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                Find nearby shops
              </Link>
            </li>
            <li className="px-4">
              <Link
                href="/account/orders"
                className={cx('flex items-center gap-1.5 rounded transition hover:text-brand-700', FOCUS_RING)}
              >
                <Package className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                Track Order
              </Link>
            </li>
            <li className="px-4">
              <Link
                href="/faq"
                className={cx('flex items-center gap-1.5 rounded transition hover:text-brand-700', FOCUS_RING)}
              >
                <CircleHelp className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                Help
              </Link>
            </li>
            <li className="pl-4">
              <Link
                href="/contact"
                className={cx('flex items-center gap-1.5 rounded transition hover:text-brand-700', FOCUS_RING)}
              >
                <Headset className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                Support
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <nav aria-label="Primary" className="mx-auto w-full max-w-[1440px] px-4 sm:px-5 lg:px-6">
        {/* ---------------------------------------------------------------- */}
        {/* Level 2 — identity + tools                                        */}
        {/* ---------------------------------------------------------------- */}
        <div
          className={cx(
            'flex items-center gap-3 transition-[height] duration-200 sm:gap-4',
            scrolled ? 'h-16' : 'h-16 sm:h-20',
          )}
        >
          <Link
            href="/"
            className={cx('flex shrink-0 items-center gap-2.5 rounded-xl py-1', FOCUS_RING)}
            aria-label={`${BRAND.name} home`}
          >
            <Image
              src={BRAND.logo}
              alt={BRAND.logoAlt}
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-xl object-contain"
            />
            <span className="text-xl font-extrabold tracking-tight text-brand-ink sm:text-2xl">
              {BRAND.name}
            </span>
          </Link>

          {/* Search — the flexible, dominant element. min-w-0 lets it actually
              shrink inside the flex row instead of forcing the row wider than
              the viewport (a flex item's default min-width is auto, not 0). */}
          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <SiteSearch className="max-w-2xl" />
          </div>

          {/* Spacer for the breakpoints where search is collapsed, so the
              controls stay hard right instead of hugging the wordmark. */}
          <div className="min-w-0 flex-1 md:hidden" aria-hidden="true" />

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Collapsed-search trigger. Below md only. */}
            <button
              ref={searchButtonRef}
              type="button"
              onClick={toggleSearch}
              aria-expanded={searchOpen}
              aria-controls={searchRowId}
              aria-label={searchOpen ? 'Close search' : 'Search'}
              className={cx(ICON_BUTTON, 'md:hidden')}
            >
              {searchOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Search className="h-5 w-5" aria-hidden="true" />
              )}
            </button>

            <LocationControl className="hidden lg:flex" />

            {/* Orders + Cart — compact shortcuts to real, already-gated routes
                (see /account/orders and HeaderCart's doc comment). Desktop
                only: below lg both are still reachable inside the panel via
                HeaderAccount's mobile menu links. */}
            <Link
              href="/account/orders"
              aria-label="Orders"
              className={cx(ICON_BUTTON, 'hidden lg:inline-flex')}
            >
              <Package className="h-5 w-5" aria-hidden="true" />
            </Link>
            <HeaderCart className="hidden lg:inline-flex" />

            {/* Mobile/tablet quick-access icons — visible whenever the
                hamburger is (below lg), same duplication trade as the mobile
                "Get the app" button below. */}
            <HeaderAccount variant="icon" className="lg:hidden" />
            <Link
              href={CTA.businessLogin.href}
              aria-label="Sell with Us"
              className={cx(ICON_BUTTON, 'lg:hidden')}
            >
              <Store className="h-5 w-5" aria-hidden="true" />
            </Link>

            {/* Customer sign-in / account control (opens the OTP modal, or shows
                the account menu when signed in). The admin portal is a separate
                door in the footer — this is the customer's. */}
            <HeaderAccount />

            {/* Business / shop-owner door — /shopmanagement, a real sign-in
                against the same /auth/login endpoint the staff portal uses,
                gated to SHOP_OWNER / SHOP_LOGIN accounts (see
                src/lib/shopAuth.js). Deliberately a separate control from
                HeaderAccount, never merged into one dropdown with it. */}
            <Button
              href={CTA.businessLogin.href}
              variant="outline"
              size="sm"
              icon="Store"
              iconPosition="left"
              className="hidden lg:inline-flex"
            >
              Sell with Us
            </Button>

            {/* Persistent CTA from sm up; at 360px it lives in the panel. */}
            <Button
              href={CTA.getApp.href}
              variant="primary"
              size="sm"
              icon="ArrowRight"
              className="hidden sm:inline-flex"
            >
              {CTA.getApp.label}
            </Button>

            <button
              ref={menuButtonRef}
              type="button"
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              aria-controls={panelId}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className={cx(ICON_BUTTON, 'lg:hidden')}
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Collapsed search row (below md)                                   */}
        {/* ---------------------------------------------------------------- */}
        <div id={searchRowId} hidden={!searchOpen} className="border-t border-brand-line py-3 md:hidden">
          {/* Keyed on searchOpen so the field remounts each time it is
              revealed: autoFocus only fires on mount, and a stale query from a
              previous open would otherwise reappear with its dropdown shut. */}
          {searchOpen ? <SiteSearch key="collapsed-search" autoFocus /> : null}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Level 3 — category / main navigation (lg+)                       */}
        {/* ---------------------------------------------------------------- */}
        {/* A distinct rounded card rather than a plain border-top row — reads as
            its own floating surface against the translucent header behind it. */}
        <div className="hidden pb-3 pt-2 lg:block">
          <div className="rounded-2xl border border-brand-line bg-white px-2 py-1.5 shadow-soft">
            <ul className="flex flex-wrap items-center gap-1">
              {SITE_NAV.map((item) => {
                const active = isActive(pathname, item.href);
                if (item.href === '/repair') {
                  return (
                    <li key={`d-${item.href}-${item.label}`}>
                      <RepairNavMenu active={active} />
                    </li>
                  );
                }
                const Icon = NAV_ICONS[item.href];
                return (
                  <li key={`d-${item.href}-${item.label}`}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cx('inline-flex items-center gap-1.5', navLinkClass(active))}
                    >
                      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Mobile / tablet panel (below lg)                                  */}
        {/* ---------------------------------------------------------------- */}
        {/* Scrolls internally rather than growing past the viewport — with the
            body locked, a panel taller than the screen would otherwise hide its
            own last items with no way to reach them. */}
        <div
          id={panelId}
          hidden={!menuOpen}
          className="max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain border-t border-brand-line pb-6 pt-4 sm:max-h-[calc(100vh-5rem)] lg:hidden"
        >
          {/* Account — Customer Login + Business Login, kept visibly separate
              per the brief, never merged into one dropdown. */}
          <div>
            <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-brand-subtle">
              Account
            </p>
            <div className="flex flex-col gap-2">
              <HeaderAccount variant="mobile" onNavigate={closeMenu} />
              <Button
                href={CTA.businessLogin.href}
                variant="outline"
                size="md"
                icon="Store"
                iconPosition="left"
                onClick={closeMenu}
                className="w-full"
              >
                Sell with Us
              </Button>
            </div>
          </div>

          <div className="mt-5 border-t border-brand-line pt-5">
            <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-brand-subtle">
              Navigation
            </p>
            <ul className="flex flex-col gap-1">
              {SITE_NAV.map((item, index) => {
                const active = isActive(pathname, item.href);
                if (item.href === '/repair') {
                  return (
                    <li key={`m-${item.href}-${item.label}`}>
                      <RepairNavMenu active={active} variant="mobile" onNavigate={closeMenu} />
                    </li>
                  );
                }
                const Icon = NAV_ICONS[item.href];
                return (
                  <li key={`m-${item.href}-${item.label}`}>
                    <Link
                      ref={index === 0 ? firstPanelLinkRef : undefined}
                      href={item.href}
                      onClick={closeMenu}
                      aria-current={active ? 'page' : undefined}
                      className={navLinkClass(active, 'lg')}
                    >
                      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-5 border-t border-brand-line pt-5">
            <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-brand-subtle">
              Actions
            </p>
            {/* Location lives here on small screens. It is left-aligned and
                given room because its own popover is anchored right and would
                otherwise sit half off-screen. */}
            <LocationControl className="justify-start" />

            <div className="mt-4 flex flex-col gap-2">
              {/* Duplicated from row 1 on purpose: row 1 hides it below sm,
                  and this is the only place it exists at 360px. */}
              <Button
                href={CTA.getApp.href}
                variant="primary"
                size="md"
                icon="ArrowRight"
                onClick={closeMenu}
                className="sm:hidden"
              >
                {CTA.getApp.label}
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
