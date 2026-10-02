'use client';

/**
 * /shop-home/services/customers — search-first customer screen, the web
 * counterpart of the Partner app's OwnerSearchScreen ("Device, ticket or
 * customer").
 *
 * Data: the same joined booking + ticket rows as the Bookings page
 * (useOrderRows -> GET {ORDER_BASE}/repair-bookings/shop + GET /tickets),
 * matched locally by tracking ID, customer name, mobile or device — with '#'
 * and spaces ignored, as the app does, so "#CSPEN 1386390" finds CSPEN1386390.
 * A result opens the booking's existing Device Details page.
 *
 * Recent searches live in this browser only (localStorage, the app's
 * `owner.search.recents` key and 6-item cap); a term is saved on Enter or
 * when a result is opened. Clear removes only that list.
 *
 * Mic uses the browser's Web Speech API and Scan the browser's
 * BarcodeDetector on the camera (booking QR codes encode the tracking ID as
 * plain text — see bookings/view/qr). Both are feature-detected: where the
 * browser lacks one, its button is disabled with an explanation instead of
 * pretending to work.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Clock, Loader2, Mic, Phone, Search, Smartphone, User, X } from 'lucide-react';

import { cx } from '@/components/site/ui';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { useOrderRows, withHash } from '@/components/shop-dashboard/OrdersList';
import { getDeviceImage, resolveMediaUrl } from '@/lib/deviceImage';
import { buildOrderRows } from '@/lib/orderStages';
import { readShopOwner } from '@/lib/shopAuth';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 350;
// Per shop, so one shop's searched names/numbers never show in another shop's session.
const RECENTS_PREFIX = 'owner.search.recents';
const recentsKey = () => `${RECENTS_PREFIX}:${readShopOwner()?.shopId || 'none'}`;
const MAX_RECENTS = 6;

const norm = (v) => String(v ?? '').toLowerCase().replace(/[#\s]/g, '');

// Ticket status -> label, as the Partner app's booking cards read them.
const STATUS_LABEL = {
  CREATED: 'Service Accepted',
  ASSIGNED: 'Technician Assigned',
  IN_DIAGNOSIS: 'In Diagnosis',
  IN_REPAIR: 'In Service Process',
  QUOTED: 'Re-Estimated',
  APPROVED: 'Customer Approved',
  READY: 'Ready for Delivery',
  INVOICE_GENERATED: 'Invoice Generated',
  INVOICE_READY: 'Invoice Ready',
  DELIVERED_PROCESSING: 'Delivered Processing',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};

function readRecents() {
  try {
    const list = JSON.parse(window.localStorage.getItem(recentsKey()) || '[]');
    return Array.isArray(list) ? list.filter((t) => typeof t === 'string') : [];
  } catch {
    return [];
  }
}
function writeRecents(list) {
  try {
    if (list.length) window.localStorage.setItem(recentsKey(), JSON.stringify(list));
    else window.localStorage.removeItem(recentsKey());
  } catch {
    // Storage blocked — recents just won't persist.
  }
}

function deviceNameOf(row) {
  const model = row.deviceDisplayName || row.modelName || '';
  const brand = row.brandName || '';
  if (!model) return 'Device not specified';
  return brand && !model.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${model}` : model;
}

function rowMatches(row, needle) {
  return [row.bookingNumber, row.customerName, row.customerMobile, row.deviceDisplayName, row.modelName, row.brandName, deviceNameOf(row), row.id]
    .filter(Boolean)
    .some((v) => norm(v).includes(needle));
}

export default function CustomersSearchPage() {
  const router = useRouter();
  const { bookings, tickets, loading, error, reload } = useOrderRows();
  const [query, setQuery] = useState('');
  const [needle, setNeedle] = useState('');
  const [recents, setRecents] = useState([]);
  const [scanOpen, setScanOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => setRecents(readRecents()), []);

  useEffect(() => {
    const t = setTimeout(() => setNeedle(norm(query)), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const pushRecent = useCallback((term) => {
    const t = String(term || '').trim();
    if (norm(t).length < MIN_QUERY) return;
    setRecents((prev) => {
      const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENTS);
      writeRecents(next);
      return next;
    });
  }, []);

  function clearRecents() {
    setRecents([]);
    writeRecents([]);
  }

  // Put a term in the box and search it now (recent tap, voice, scan).
  const searchFor = useCallback((term) => {
    setQuery(term);
    setNeedle(norm(term));
  }, []);

  const rows = useMemo(() => buildOrderRows(bookings, tickets), [bookings, tickets]);
  const results = useMemo(() => (needle.length >= MIN_QUERY ? rows.filter((r) => rowMatches(r, needle)) : []), [rows, needle]);

  const typed = norm(query);
  const pending = typed !== needle;
  const tooShort = typed.length > 0 && typed.length < MIN_QUERY;
  const searching = typed.length >= MIN_QUERY;

  return (
    <div className="-m-4 min-h-full bg-white sm:-m-6">
      <div className="sticky top-0 z-10 border-b border-[#ECECEC] bg-white px-4 py-3.5 sm:px-6">
        <div className="mx-auto flex max-w-[900px] items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3F3F3] text-[#111111] transition hover:bg-[#F3F3F3]"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              pushRecent(query);
              setNeedle(norm(query));
            }}
            className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#ECECEC] bg-white pl-4 pr-1.5 transition focus-within:border-[#079455]"
          >
            <Search className="h-[18px] w-[18px] shrink-0 text-[#087A0A]" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Device, ticket or customer"
              aria-label="Search by device, ticket or customer"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[#111111] outline-none placeholder:text-[#8FA08F] [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  searchFor('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3F3F3] text-[#666666]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
            <VoiceButton onResult={(text) => { searchFor(text); pushRecent(text); }} />
            <ScanButton onOpen={() => setScanOpen(true)} />
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-4 py-5 sm:px-6">
        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

        {!searching ? (
          tooShort ? (
            <p className="pt-8 text-center text-[13px] text-[#666666]">Keep typing — at least {MIN_QUERY} characters.</p>
          ) : (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11.5px] font-extrabold tracking-[0.08em] text-[#666666]">RECENT</p>
                {recents.length ? (
                  <button type="button" onClick={clearRecents} className="text-[12px] font-extrabold text-[#087A0A] hover:underline">
                    Clear
                  </button>
                ) : null}
              </div>
              {recents.length ? (
                <ul className="space-y-2">
                  {recents.map((t) => (
                    <li key={t}>
                      <button
                        type="button"
                        onClick={() => searchFor(t)}
                        className="flex w-full items-center gap-2.5 rounded-xl border border-[#ECECEC] bg-white px-3.5 py-3 text-left transition hover:border-[#ECECEC] hover:bg-[#F8F8F8]"
                      >
                        <Clock className="h-4 w-4 shrink-0 text-[#8FA08F]" aria-hidden="true" />
                        <span className="truncate text-[14px] text-[#344054]">{t}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pt-6 text-center text-[13px] text-[#98A2B3]">No recent searches</p>
              )}
            </section>
          )
        ) : loading || pending ? (
          <div className="flex justify-center pt-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#087A0A]" aria-hidden="true" />
          </div>
        ) : results.length ? (
          <section>
            <p className="mb-2 text-[11.5px] font-extrabold tracking-[0.08em] text-[#666666]">BOOKINGS · {results.length}</p>
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={r.id}>
                  <ResultCard row={r} onOpen={() => pushRecent(query)} />
                </li>
              ))}
            </ul>
          </section>
        ) : error ? null : (
          <div className="px-6 pt-10 text-center">
            <p className="text-[15px] font-extrabold text-[#344054]">No matches</p>
            <p className="mt-1 text-[13px] text-[#666666]">
              Nothing found for “{query.trim()}”. Try a tracking ID, customer name, mobile number or device.
            </p>
          </div>
        )}
      </div>

      {scanOpen ? (
        <ScanDialog
          onClose={() => setScanOpen(false)}
          onCode={(code) => {
            setScanOpen(false);
            searchFor(code);
            pushRecent(code);
          }}
        />
      ) : null}
    </div>
  );
}

function Thumb({ url }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  return (
    <span className="flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F8F8F8] p-1">
      {url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- device photos are arbitrary catalog URLs.
        <img src={url} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-contain" />
      ) : (
        <Smartphone className="h-5 w-5 text-[#8FA08F]" aria-hidden="true" />
      )}
    </span>
  );
}

function ResultCard({ row, onOpen }) {
  const status = STATUS_LABEL[String(row.ticketStatus || '').toUpperCase()] || row.statusLabel || String(row.status || '').replace(/_/g, ' ');
  const image = resolveMediaUrl(row.deviceImageUrl) || resolveMediaUrl(row.frontImageUrl) || getDeviceImage(row);
  return (
    <Link
      href={`/shop-home/services/bookings/view/details/?id=${encodeURIComponent(row.id)}`}
      onClick={onOpen}
      className="flex items-center gap-3 rounded-2xl border border-[#ECECEC] bg-[#F8F8F8] p-3 transition hover:border-[#ECECEC]"
    >
      <Thumb url={image} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[12px] font-extrabold text-[#087A0A]">{withHash(row.bookingNumber || row.id)}</span>
          {status ? (
            <span className="shrink-0 rounded-full bg-[#F3F3F3] px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide text-[#067647]">{status}</span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[15px] font-extrabold text-[#111111]">{deviceNameOf(row)}</p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[12.5px] text-[#666666]">
          <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{row.customerName || 'Customer'}</span>
          {row.customerMobile ? (
            <>
              <Phone className="ml-2 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="shrink-0">{row.customerMobile}</span>
            </>
          ) : null}
        </p>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Voice + scan                                                                */
/* -------------------------------------------------------------------------- */

const ICON_BTN = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F3F3] text-[#087A0A] transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-40';

function VoiceButton({ onResult }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => recRef.current?.abort();
  }, []);

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) return;
    const rec = new Rec();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript?.trim();
      if (text) onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!supported}
      aria-label={listening ? 'Stop listening' : 'Search by voice'}
      title={supported ? (listening ? 'Listening… tap to stop' : 'Search by voice') : 'Voice search isn’t supported in this browser'}
      className={cx(ICON_BTN, listening && 'animate-pulse bg-[#087A0A] text-white hover:bg-[#087A0A]')}
    >
      <Mic className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function ScanButton({ onOpen }) {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(Boolean(window.BarcodeDetector && navigator.mediaDevices?.getUserMedia));
  }, []);
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!supported}
      aria-label="Scan a booking QR or barcode"
      title={supported ? 'Scan a booking QR or barcode' : 'Camera scanning isn’t supported in this browser'}
      className={ICON_BTN}
    >
      <Camera className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function ScanDialog({ onClose, onCode }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  // Latest callbacks without restarting the camera on every parent render.
  const handlers = useRef({ onClose, onCode });
  handlers.current = { onClose, onCode };

  useEffect(() => {
    let stream;
    let timer;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped) return;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        const detector = new window.BarcodeDetector();
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video);
            const value = codes?.[0]?.rawValue?.trim();
            if (value) {
              handlers.current.onCode(value);
              return;
            }
          } catch {
            // Frame not ready — try the next one.
          }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch (err) {
        if (!stopped) setError(err?.name === 'NotAllowedError' ? 'Camera access was blocked. Allow the camera for this site and try again.' : 'Could not start the camera.');
      }
    })();
    const onKey = (e) => e.key === 'Escape' && handlers.current.onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#0B1739]/60 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scan booking code"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full overflow-hidden rounded-t-[28px] bg-white sm:max-w-[480px] sm:rounded-[24px]"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-[16px] font-extrabold text-[#111111]">Scan booking code</p>
            <p className="text-[12.5px] text-[#666666]">Point the camera at the booking’s QR or barcode.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-[#98A2B3] hover:bg-[#F3F3F3] hover:text-[#344054]">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="relative aspect-square bg-black sm:aspect-[4/3]">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- live camera preview, no audio track. */}
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          {error ? (
            <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-xl bg-white/95 px-4 py-3 text-center text-[13px] font-semibold text-[#B42318]">{error}</p>
          ) : (
            <span className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/80" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}
