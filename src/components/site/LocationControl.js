'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Info, LoaderCircle, MapPin } from 'lucide-react';

import { cx } from '@/components/site/ui';
import {
  clearGeo,
  formatGeo,
  lookupPlaceName,
  readGeo,
  subscribe,
  writeGeo,
} from '@/components/site/geo';

/* -------------------------------------------------------------------------- */
/* Messages                                                                    */
/* -------------------------------------------------------------------------- */
/* Every one of these is written to be read by a visitor who did nothing wrong.
 * We never surface `error.message` from the browser — those strings are written
 * for developers ("User denied Geolocation"), vary by engine, and are not
 * translated. Each message also says what to do next, because a dead end in the
 * navbar just makes people leave. */

const MESSAGES = {
  denied:
    'Location is blocked for this site. Allow it in your browser’s address-bar settings, or open Near Shops to browse every shop.',
  unavailable: 'Couldn’t work out where you are just now. Try again in a moment.',
  timeout: 'That took too long. Check your connection and try again.',
  failed: 'Couldn’t get your location. Try again in a moment.',
  unsupported: 'This browser can’t share a location. You can still browse every shop on Near Shops.',
  insecure:
    'Location sharing needs a secure (https) connection. On this address you can still browse every shop on Near Shops.',
};

/**
 * Map a GeolocationPositionError onto one of our own message keys.
 *
 * The numeric codes are checked BEFORE the named constants because the error
 * object handed to the callback is not always a real GeolocationPositionError
 * (some in-app webviews pass a plain object with just `code`), so
 * `err.PERMISSION_DENIED` can be undefined.
 */
function messageKeyFor(error) {
  const code = error && typeof error.code === 'number' ? error.code : null;
  if (code === 1) return 'denied';
  if (code === 2) return 'unavailable';
  if (code === 3) return 'timeout';
  return 'failed';
}

/* -------------------------------------------------------------------------- */
/* Availability                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Why the API might be unusable, or null if it should work.
 *
 * `isSecureContext` matters here in a way that is easy to miss: this site is
 * intended to be reachable over plain HTTP on a bare IP, and every modern
 * browser silently refuses geolocation on an insecure origin. Chrome does not
 * even prompt — it invokes the error callback with PERMISSION_DENIED, which
 * would otherwise make us tell the visitor to "allow it in settings" for a
 * permission no setting can grant. localhost is exempt (treated as secure), so
 * this never trips in development, which is exactly why it must be handled
 * explicitly rather than discovered in production.
 */
function detectUnavailable() {
  if (typeof window === 'undefined') return null;
  if (!('geolocation' in navigator) || !navigator.geolocation) return 'unsupported';
  if (window.isSecureContext === false) return 'insecure';
  return null;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * LocationControl — the navbar location affordance.
 *
 * Unset: a compact "Set location" button that asks the browser for coordinates.
 * Set:   a chip showing the reverse-geocoded place name ("Cuddalore"), which
 *        opens a small panel with the coordinates plus Update / Clear.
 *
 * The place name comes from lookupPlaceName() in geo.js, which calls a THIRD
 * PARTY (BigDataCloud) with the visitor's coordinates — disclosed in /privacy.
 * That call is fire-and-forget and deliberately runs AFTER the coordinates are
 * stored: it is presentation only, so when it fails, is blocked by a tracker
 * blocker, or times out, the chip falls back to "Near you" and everything that
 * actually depends on position keeps working.
 *
 * The value is written through geo.js, which the /nearby-shops page subscribes
 * to — so setting a location in the navbar updates that page live, and this
 * control updates itself if the location is changed from there.
 *
 * @param {object} props
 * @param {string} [props.className] Applied to the positioning wrapper.
 */
export default function LocationControl({ className }) {
  const [geo, setGeo] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'locating'
  const [messageKey, setMessageKey] = useState(null);
  const [unavailable, setUnavailable] = useState(null);
  const [open, setOpen] = useState(false);

  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  // Guards the async geolocation callbacks against firing setState after the
  // control has unmounted (route change mid-prompt — the browser permission
  // dialog can sit open for a long time).
  const aliveRef = useRef(true);

  /* -- hydrate ------------------------------------------------------------ */
  /* Read AFTER mount, never as a useState initialiser: the server prerender has
   * no localStorage, so seeding from storage during render makes the first
   * client render disagree with the HTML and React throws out the tree. */
  useEffect(() => {
    aliveRef.current = true;
    setGeo(readGeo());
    setUnavailable(detectUnavailable());

    // Stay in sync with the /nearby-shops page and with other tabs.
    const unsubscribe = subscribe((entry) => {
      setGeo(entry);
      if (entry) setMessageKey(null);
    });

    return () => {
      aliveRef.current = false;
      unsubscribe();
    };
  }, []);

  /* -- dismissal ---------------------------------------------------------- */

  useEffect(() => {
    if (!open) return undefined;

    // pointerdown, not click: it fires before focus moves, so the panel is
    // already closed by the time a click lands on whatever is underneath.
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      // Mark the key consumed. Below lg this control renders INSIDE the header's
      // mobile menu panel, which has its own document-level Escape handler; that
      // handler skips a defaultPrevented event, so one press closes this popover
      // instead of collapsing the whole menu around it.
      event.preventDefault();
      setOpen(false);
      // Focus must come back to the trigger, or a keyboard user is dumped at
      // the top of the document (WCAG 2.4.3).
      if (triggerRef.current) triggerRef.current.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    // Capture phase, deliberately. The menu panel's Escape listener is
    // registered when the panel opens — i.e. BEFORE this one, since the popover
    // can only be opened from inside an already-open panel — so in the bubble
    // phase it would run first and close the menu before this ran at all.
    // Capture puts this ahead of every bubble-phase listener regardless of
    // registration order, which is what makes the guard above reliable.
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  /* -- request ------------------------------------------------------------ */

  const requestLocation = useCallback(() => {
    const blocked = detectUnavailable();
    if (blocked) {
      setUnavailable(blocked);
      setOpen(false);
      return;
    }

    setStatus('locating');
    setMessageKey(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!aliveRef.current) return;
        const entry = writeGeo(position && position.coords);
        setStatus('idle');
        if (entry) {
          // writeGeo broadcasts, and our own subscription sets state — but set
          // it here too so the UI is correct even if the CustomEvent
          // constructor was unavailable and the broadcast was swallowed.
          setGeo(entry);
          setOpen(false);

          // Reverse-geocode SECOND, and never block on it. The coordinates are
          // already stored and /nearby-shops can already query with them; the
          // place name is presentation only. Resolving '' (offline, blocked,
          // timed out) simply leaves the chip reading "Near you".
          lookupPlaceName(entry.lat, entry.lng).then((label) => {
            if (!aliveRef.current || !label) return;
            setGeo(writeGeo({ ...entry, label }) || entry);
          });
        } else {
          setMessageKey('failed');
        }
      },
      (error) => {
        if (!aliveRef.current) return;
        setStatus('idle');
        setMessageKey(messageKeyFor(error));
      },
      {
        // Coarse position is plenty: the shop search runs on a 20 km radius, so
        // high accuracy would only spend battery and time for no visible gain.
        enableHighAccuracy: false,
        timeout: 10000,
        // A fix from the last 5 minutes is fine and answers instantly.
        maximumAge: 300000,
      },
    );
  }, []);

  const handleClear = useCallback(() => {
    clearGeo();
    setGeo(null);
    setMessageKey(null);
    setOpen(false);
    if (triggerRef.current) triggerRef.current.focus();
  }, []);

  /* -- shared classes ----------------------------------------------------- */

  // ring-brand-700, not brand-500: #22C55E measures ~2.3:1 on white and fails
  // the 3:1 non-text contrast floor (WCAG 1.4.11) that a focus indicator has to
  // clear. #15803D clears it on every light surface in the header.
  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

  const chipBase = cx(
    'inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition',
    focusRing,
  );

  /* -- unavailable: no button at all -------------------------------------- */
  /* An insecure origin or a browser without the API can never succeed, so we do
   * not render a button that is guaranteed to fail. A short static note takes
   * its place; the full explanation rides along as the title/aria-label so the
   * navbar stays narrow. */

  if (unavailable) {
    return (
      <div className={cx('flex min-w-0 items-center', className)}>
        <span
          className="inline-flex max-w-[13rem] items-center gap-1.5 rounded-full border border-brand-line bg-brand-soften px-3 py-2 text-sm font-medium text-brand-muted"
          title={MESSAGES[unavailable]}
        >
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {unavailable === 'insecure' ? 'Location needs https' : 'Location unavailable'}
          </span>
          {/* The visible label is clipped for space; screen readers get all of it. */}
          <span className="sr-only">{MESSAGES[unavailable]}</span>
        </span>
      </div>
    );
  }

  /* -- normal ------------------------------------------------------------- */

  const locating = status === 'locating';

  return (
    <div ref={wrapRef} className={cx('relative flex min-w-0 items-center', className)}>
      {geo ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className={cx(chipBase, 'border-brand-200 bg-brand-soft text-brand-700 hover:bg-brand-100')}
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{geo && geo.label ? geo.label : 'Near you'}</span>
          <ChevronDown
            className={cx('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={requestLocation}
          disabled={locating}
          className={cx(
            chipBase,
            'border-brand-line bg-white text-brand-ink hover:border-brand-600 hover:text-brand-700',
            'disabled:cursor-not-allowed disabled:opacity-70',
          )}
        >
          {locating ? (
            // motion-safe: a perpetual spin is exactly what prefers-reduced-motion
            // is for. Without motion the icon still reads as "busy" beside the
            // changed label.
            <LoaderCircle
              className="h-4 w-4 shrink-0 motion-safe:animate-spin"
              aria-hidden="true"
            />
          ) : (
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">{locating ? 'Locating…' : 'Set location'}</span>
        </button>
      )}

      {/* Status + errors.
          role="status" (aria-live="polite") so the outcome of a button press is
          announced — a sighted user sees the chip change, a screen-reader user
          would otherwise get nothing at all. The node is always mounted, empty
          when idle: live regions only announce changes to a region that already
          existed, so mounting it on demand can go unread.
          Absolutely positioned so a two-line error can never reflow the header. */}
      <div
        role="status"
        aria-live="polite"
        className={cx(
          'absolute right-0 top-full z-40 mt-2 w-[min(17rem,calc(100vw-2rem))]',
          !messageKey && 'pointer-events-none',
        )}
      >
        {messageKey ? (
          <div className="rounded-2xl border border-brand-line bg-white p-3 text-xs leading-relaxed text-brand-muted shadow-lift">
            <p>{MESSAGES[messageKey]}</p>
            {messageKey !== 'denied' ? (
              <button
                type="button"
                onClick={requestLocation}
                className={cx(
                  'mt-2 rounded-full px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-soft',
                  focusRing,
                )}
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Detail panel — only reachable once a location is set. */}
      {geo && open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(17rem,calc(100vw-2rem))] rounded-2xl border border-brand-line bg-white p-4 shadow-lift">
          <p className="text-sm font-semibold text-brand-ink">Using your location</p>
          {/* Coordinates, and only coordinates. We cannot name this place — see
              the component doc. Rendered muted and monospaced so it reads as
              raw numbers rather than as an address. */}
          <p className="mt-1 font-mono text-xs text-brand-subtle">{formatGeo(geo)}</p>
          <p className="mt-2 text-xs leading-relaxed text-brand-muted">
            Shops are matched by distance from this point. It stays on this device.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={requestLocation}
              disabled={locating}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700',
                'disabled:cursor-not-allowed disabled:opacity-70',
                focusRing,
              )}
            >
              {locating ? (
                <LoaderCircle className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {locating ? 'Updating…' : 'Update'}
            </button>

            <button
              type="button"
              onClick={handleClear}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border border-brand-line px-3 py-1.5 text-xs font-semibold text-brand-muted transition hover:border-brand-strong hover:text-brand-ink',
                focusRing,
              )}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
