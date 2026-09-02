'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, Search, X } from 'lucide-react';

import { BRAND, SITE_NAV, CTA } from '@/lib/siteContent';
import { Button, cx } from './ui';
import SiteSearch from './SiteSearch';
import LocationControl from './LocationControl';
import HeaderAccount from './HeaderAccount';

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
 * Two rows on lg+: row 1 carries the identity and the tools (logo, search,
 * location, Login, Get the app), row 2 carries the eight-item menu. One row
 * cannot hold all of it — logo + a usefully wide search + three controls +
 * eight links crowds badly below ~1400px and wraps raggedly, so the split is
 * the layout that holds from 360px to 1920px rather than a stylistic choice.
 *
 * Below lg the second row is dropped entirely: the menu, the location control
 * and Login move into the disclosure panel, and search collapses to an icon
 * that reveals a full-width field. "Get the app" survives as the one persistent
 * CTA from sm up; at 360px even that is folded into the panel, because a third
 * control alongside the logo, search toggle and hamburger overflows.
 *
 * There is no cart. The web has no cart — it exists only in the mobile app —
 * so it is omitted rather than rendered as a control that does nothing.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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

  const navLinkClass = (active, size) =>
    cx(
      'rounded-full font-semibold transition',
      size === 'lg' ? 'block px-4 py-3 text-base' : 'px-3.5 py-2 text-sm',
      FOCUS_RING,
      active
        ? 'bg-brand-soft text-brand-700'
        : 'text-brand-muted hover:bg-brand-soften hover:text-brand-ink',
    );

  return (
    /* No overflow clipping anywhere on the header: the search listbox and the
     * location popover are absolutely positioned children and must be allowed
     * to spill below it. The header sits at z-50 so they land above the page. */
    <header className="sticky top-0 z-50 border-b border-brand-line bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <nav aria-label="Primary" className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 — identity + tools                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex h-16 items-center gap-3 sm:h-20 sm:gap-4">
          <Link
            href="/"
            className={cx('flex shrink-0 items-center gap-2.5 rounded-xl py-1', FOCUS_RING)}
            aria-label={`${BRAND.name} home`}
          >
            <Image
              src={BRAND.logo}
              alt={BRAND.logoAlt}
              width={36}
              height={36}
              priority
              className="h-9 w-9 rounded-xl object-contain"
            />
            <span className="text-xl font-extrabold tracking-tight text-brand-ink sm:text-2xl">
              {BRAND.name}
            </span>
          </Link>

          {/* Search — the flexible element. min-w-0 lets it actually shrink
              inside the flex row instead of forcing the row wider than the
              viewport (a flex item's default min-width is auto, not 0). */}
          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <SiteSearch className="max-w-xl" />
          </div>

          {/* Spacer for the breakpoints where search is collapsed, so the
              controls stay hard right instead of hugging the wordmark. */}
          <div className="min-w-0 flex-1 md:hidden" aria-hidden="true" />

          <div className="flex shrink-0 items-center gap-2">
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

            {/* Customer sign-in / account control (opens the OTP modal, or shows
                the account menu when signed in). The admin portal is a separate
                door in the footer — this is the customer's. */}
            <HeaderAccount />

            {/* Persistent CTA from sm up; at 360px it lives in the panel. */}
            <Button
              href={CTA.getApp.href}
              variant="primary"
              size="sm"
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
        {/* Row 2 — the menu (lg+)                                            */}
        {/* ---------------------------------------------------------------- */}
        <div className="hidden border-t border-brand-line lg:block">
          <ul className="flex flex-wrap items-center gap-1 py-2">
            {SITE_NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={`d-${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={navLinkClass(active)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
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
          className="max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain border-t border-brand-line pb-6 pt-3 sm:max-h-[calc(100vh-5rem)] lg:hidden"
        >
          <ul className="flex flex-col gap-1">
            {SITE_NAV.map((item, index) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={`m-${item.href}-${item.label}`}>
                  <Link
                    ref={index === 0 ? firstPanelLinkRef : undefined}
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={active ? 'page' : undefined}
                    className={navLinkClass(active, 'lg')}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 border-t border-brand-line pt-5">
            {/* Location lives here on small screens. It is left-aligned and
                given room because its own popover is anchored right and would
                otherwise sit half off-screen. */}
            <LocationControl className="justify-start" />
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <HeaderAccount variant="mobile" onNavigate={closeMenu} />
            {/* Duplicated from row 1 on purpose: row 1 hides it below sm, and
                this is the only place it exists at 360px. */}
            <Button
              href={CTA.getApp.href}
              variant="primary"
              size="md"
              onClick={closeMenu}
              className="sm:hidden"
            >
              {CTA.getApp.label}
            </Button>
            <Button href={CTA.forShops.href} variant="ghost" size="md" onClick={closeMenu}>
              {CTA.forShops.label}
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}
