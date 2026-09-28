'use client';

/**
 * /shop-home/services/enquiries — customer message threads.
 *
 * Reads GET {MARKETPLACE_BASE}/shop/chats via fetchShopChats() (src/lib/shopDashboard.js).
 * Read this carefully before extending it: every existing consumer of this
 * endpoint in the whole codebase (openEnquiries() and the dashboard's
 * "Enquiries" badge) only ever reads ONE field — `unreadCount`. No code
 * anywhere confirms this endpoint carries a customer name, device, message
 * text, or a status field, and `/shop/chats` is the same marketplace-service
 * base used by the Buy/Sell chat flows described in siteContent.js — it may
 * be generic marketplace chat, not repair-specific enquiries at all.
 *
 * So this page reads every display field defensively (falls back to a
 * plain dash rather than assuming a field name exists) and derives its
 * ONLY real status signal — New vs. Read — from `unreadCount`, instead of
 * the New/Contacted/In Progress/Converted/Closed vocabulary the original
 * design brief asked for, which this data has no field to support. "Update
 * Status" is not offered — there is no write endpoint for it. "Convert to
 * Booking" is a real link to Book Service; it does not pre-fill the form,
 * since book-service/page.js has no query-param prefill support today.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, Clock, Info, MessageSquare, MessageSquarePlus, Phone, PlusCircle, RefreshCw } from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import FilterChips from '@/components/shop-dashboard/FilterChips';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { SkeletonRows, SkeletonStatCards } from '@/components/shop-dashboard/SkeletonBlocks';
import { fetchShopChats } from '@/lib/shopDashboard';
import SearchField, { FOCUS_RING } from '@/components/shop-dashboard/SearchField';

const FILTERS = ['All', 'New', 'Read'];

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== '') return obj[k];
  }
  return '';
}

/**
 * EnquiriesIllustration — small decorative graphic for the hero's right side
 * (an "ENQUIRIES" clipboard, chat bubbles, a phone and a support headset),
 * matching a reference design. Hand-drawn inline SVG with layered
 * gradients/filter-based drop shadows for a soft-3D feel, purely decorative —
 * no data — same technique as the other redesigned Partner Dashboard pages'
 * hero illustrations.
 */
function EnquiriesIllustration() {
  return (
    <svg viewBox="0 0 300 190" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="eqClip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EAF9EF" />
        </linearGradient>
        <linearGradient id="eqPhone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#0A934D" />
        </linearGradient>
        <linearGradient id="eqHeadset" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E2E8F0" />
          <stop offset="1" stopColor="#94A3B8" />
        </linearGradient>
        <filter id="eqShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0C6636" floodOpacity="0.2" />
        </filter>
      </defs>

      <ellipse cx="170" cy="178" rx="120" ry="9" fill="#0C6636" opacity="0.08" />

      <g fill="#BFE8FF" opacity="0.55">
        <ellipse cx="56" cy="28" rx="18" ry="10" />
        <ellipse cx="40" cy="22" rx="12" ry="8" />
        <ellipse cx="270" cy="36" rx="14" ry="8" />
      </g>
      <g>
        <rect x="118" y="160" width="8" height="14" fill="#94A3B8" />
        <path d="M108 160 q10 -34 18 -0" fill="#4ADE80" opacity="0.85" />
        <rect x="242" y="164" width="8" height="14" fill="#94A3B8" />
        <path d="M232 164 q10 -30 18 0" fill="#22C55E" opacity="0.85" />
      </g>

      {/* headset, right */}
      <g filter="url(#eqShadow)">
        <path d="M244 108 a26 26 0 0 1 52 0" fill="none" stroke="url(#eqHeadset)" strokeWidth="7" strokeLinecap="round" />
        <rect x="238" y="104" width="12" height="20" rx="5" fill="url(#eqHeadset)" />
        <rect x="290" y="104" width="12" height="20" rx="5" fill="url(#eqHeadset)" />
      </g>

      {/* speech bubble, left */}
      <g filter="url(#eqShadow)">
        <path d="M118 112 h44 a8 8 0 0 1 8 8 v22 a8 8 0 0 1 -8 8 h-30 l-10 10 v-10 h-4 a8 8 0 0 1 -8 -8 v-22 a8 8 0 0 1 8 -8 z" fill="#4ADE80" />
        <circle cx="132" cy="132" r="3" fill="white" />
        <circle cx="142" cy="132" r="3" fill="white" />
        <circle cx="152" cy="132" r="3" fill="white" />
      </g>

      {/* main ENQUIRIES clipboard */}
      <g filter="url(#eqShadow)">
        <rect x="148" y="30" width="80" height="118" rx="10" fill="url(#eqClip)" stroke="#DCFCE7" strokeWidth="2" />
        <rect x="172" y="22" width="32" height="16" rx="6" fill="#0A934D" />
        <rect x="158" y="52" width="60" height="15" rx="4" fill="#FFFFFF" stroke="#DFF8EB" strokeWidth="1.5" />
        <text x="188" y="63" textAnchor="middle" fontSize="8" fontWeight="800" fill="#0C6636">ENQUIRIES</text>
        <rect x="158" y="78" width="46" height="4" rx="2" fill="#BBF7D0" />
        <rect x="158" y="88" width="52" height="4" rx="2" fill="#DCFCE7" />
        <rect x="158" y="98" width="38" height="4" rx="2" fill="#DCFCE7" />
        <rect x="158" y="112" width="44" height="4" rx="2" fill="#DCFCE7" />
        <rect x="158" y="122" width="30" height="4" rx="2" fill="#DCFCE7" />

        {/* small chat bubble accent */}
        <circle cx="204" cy="126" r="16" fill="#38BDF8" />
        <circle cx="198" cy="126" r="2" fill="white" />
        <circle cx="204" cy="126" r="2" fill="white" />
        <circle cx="210" cy="126" r="2" fill="white" />
      </g>

      {/* phone, right */}
      <g filter="url(#eqShadow)">
        <rect x="248" y="128" width="34" height="54" rx="8" fill="url(#eqPhone)" />
        <rect x="252" y="134" width="26" height="38" rx="2" fill="#EAF5FF" />
        <circle cx="265" cy="176" r="1.8" fill="white" opacity="0.85" />
      </g>

      <circle cx="126" cy="46" r="3.5" fill="#86EFAC" />
      <circle cx="270" cy="150" r="3" fill="#86EFAC" />
    </svg>
  );
}

/** Small decorative empty-state graphic — a chat bubble with a soft mint circle behind it, matching a reference design. Purely decorative. */
function EnquiriesEmptyIllustration() {
  return (
    <svg viewBox="0 0 160 140" className="h-28 w-28" aria-hidden="true">
      <defs>
        <linearGradient id="eqEmptyBubble" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#0A934D" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="70" r="54" fill="#DFF8EB" opacity="0.6" />
      <ellipse cx="80" cy="118" rx="34" ry="7" fill="#0C6636" opacity="0.1" />
      <circle cx="34" cy="40" r="4" fill="#86EFAC" />
      <circle cx="128" cy="96" r="3.5" fill="#86EFAC" />
      <path
        d="M44 48 h60 a10 10 0 0 1 10 10 v26 a10 10 0 0 1 -10 10 h-38 l-14 14 v-14 h-8 a10 10 0 0 1 -10 -10 v-26 a10 10 0 0 1 10 -10 z"
        fill="url(#eqEmptyBubble)"
      />
      <circle cx="64" cy="72" r="4" fill="white" />
      <circle cx="80" cy="72" r="4" fill="white" />
      <circle cx="96" cy="72" r="4" fill="white" />
    </svg>
  );
}

// Page-local pastel KPI-card styling — not the shared StatCard (used by ~10
// other pages, unaffected): matches a reference design's pastel-gradient +
// glossy circular icon chip + large translucent background-glyph treatment,
// same approach as the redesigned Delivery/Pickups/Requote/Bookings pages.
const ENQUIRY_STAT_STYLES = {
  green: {
    card: 'bg-gradient-to-br from-[#F3FBF7] to-[#E4F8EC]',
    chip: 'bg-gradient-to-br from-[#22C55E] to-[#0A934D]',
    value: 'text-[#10213D]',
    label: 'text-[#066B39]',
    wave: 'text-[#BBF7D0]',
    glow: 'bg-[#86EFAC]',
  },
  orange: {
    card: 'bg-gradient-to-br from-[#FFF7ED] to-[#FDE7CB]',
    chip: 'bg-gradient-to-br from-[#FB923C] to-[#FF7A1A]',
    value: 'text-[#10213D]',
    label: 'text-[#9A5B27]',
    wave: 'text-[#FDBA74]',
    glow: 'bg-[#FDBA74]',
  },
  blue: {
    card: 'bg-gradient-to-br from-[#EFF9FF] to-[#D9F0FE]',
    chip: 'bg-gradient-to-br from-[#38BDF8] to-[#1DA8E8]',
    value: 'text-[#10213D]',
    label: 'text-[#1D6FA0]',
    wave: 'text-[#93D6F7]',
    glow: 'bg-[#93D6F7]',
  },
  purple: {
    card: 'bg-gradient-to-br from-[#F5F3FF] to-[#E8E1FC]',
    chip: 'bg-gradient-to-br from-[#A78BFA] to-[#8B5CF6]',
    value: 'text-[#10213D]',
    label: 'text-[#6D5A9E]',
    wave: 'text-[#C4B5FD]',
    glow: 'bg-[#C4B5FD]',
  },
};

function EnquiryStatCard({ icon: Icon, bgIcon: BgIcon, label, value, tone }) {
  const s = ENQUIRY_STAT_STYLES[tone] || ENQUIRY_STAT_STYLES.green;
  return (
    <div
      className={cx(
        'relative flex h-[178px] flex-col overflow-hidden rounded-[22px] border border-[#E4ECE8] p-5 shadow-[0_12px_30px_rgba(20,80,55,0.07),0_2px_8px_rgba(20,80,55,0.03)]',
        s.card,
      )}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[22px] bg-gradient-to-b from-white/55 to-transparent" aria-hidden="true" />
      <BgIcon className={cx('pointer-events-none absolute -bottom-7 -right-7 h-32 w-32 rotate-[-10deg] opacity-[0.28]', s.wave)} aria-hidden="true" />
      <span className={cx('pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-40', s.glow)} aria-hidden="true" />

      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
        <span className={cx('absolute inset-0 -m-1.5 rounded-full blur-md opacity-50', s.glow)} aria-hidden="true" />
        <span
          className={cx(
            'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_18px_rgba(0,0,0,0.12),inset_0_1.5px_0_rgba(255,255,255,0.5),inset_0_-4px_8px_rgba(0,0,0,0.12)]',
            s.chip,
          )}
        >
          <Icon className="h-6 w-6 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]" aria-hidden="true" />
        </span>
      </span>

      <p className={cx('relative mt-4 text-[30px] font-extrabold leading-none tracking-tight sm:text-[32px]', s.value)}>{value}</p>
      <p className={cx('relative mt-1.5 text-sm font-semibold', s.label)}>{label}</p>
    </div>
  );
}

export default function EnquiriesPage() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetchShopChats()
      .then((list) => {
        if (alive) setChats(list);
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load enquiries.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const rows = useMemo(
    () =>
      chats.map((c) => ({
        raw: c,
        id: pick(c, ['id', 'chatId', 'threadId']) || Math.random(),
        name: pick(c, ['customerName', 'name', 'userName', 'buyerName']) || 'Customer',
        phone: pick(c, ['customerMobile', 'phone', 'mobile', 'customerPhone']),
        device: pick(c, ['deviceName', 'productName', 'itemName', 'subject']),
        message: pick(c, ['lastMessage', 'message', 'preview', 'problem']),
        date: pick(c, ['updatedAt', 'lastMessageAt', 'createdAt', 'timestamp']),
        unread: Number(c.unreadCount || 0),
      })),
    [chats],
  );

  const counts = useMemo(() => {
    const newCount = rows.filter((r) => r.unread > 0).length;
    return { All: rows.length, New: newCount, Read: rows.length - newCount };
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === 'New') list = list.filter((r) => r.unread > 0);
    else if (filter === 'Read') list = list.filter((r) => r.unread === 0);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.device.toLowerCase().includes(q) ||
        r.message.toLowerCase().includes(q),
    );
  }, [rows, filter, query]);

  const stats = [
    { label: 'Total Enquiries', value: rows.length, icon: MessageSquare, bgIcon: MessageSquare, tone: 'green' },
    { label: 'New', value: counts.New, icon: MessageSquarePlus, bgIcon: MessageSquarePlus, tone: 'orange' },
    { label: 'In Progress', value: '—', icon: MessageSquare, bgIcon: Clock, tone: 'blue' },
    { label: 'Converted', value: '—', icon: MessageSquare, bgIcon: CheckCircle2, tone: 'purple' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero — soft mint gradient banner with layered abstract waves + a
          decorative "ENQUIRIES" clipboard/chat-bubble/headset illustration on
          the far right, matching the same premium design system as the other
          redesigned Partner Dashboard pages. Title/subtitle/Refresh are the
          exact same content/handler this page always had. */}
      <div className="relative min-h-[200px] overflow-hidden rounded-3xl border border-[#E4ECE8] bg-gradient-to-br from-[#F3FBF7] via-white to-[#EAF5FF] p-6 shadow-[0_12px_32px_rgba(20,80,55,0.07),0_3px_10px_rgba(20,80,55,0.04)] sm:p-8">
        <span className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-[#86EFAC]/25 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-16 right-32 h-40 w-40 rounded-full bg-[#93C5FD]/20 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -left-10 top-10 h-36 w-36 rounded-full bg-[#BFE8FF]/15 blur-3xl" aria-hidden="true" />
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-[#DFF8EB]/55"
          viewBox="0 0 500 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,50 C120,110 280,0 500,60 L500,100 L0,100 Z" />
        </svg>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full text-[#BFE8FF]/35"
          viewBox="0 0 500 70"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,35 C150,65 320,10 500,40 L500,70 L0,70 Z" />
        </svg>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full text-white/70"
          viewBox="0 0 500 45"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,22 C170,45 300,5 500,25 L500,45 L0,45 Z" />
        </svg>

        <div className="relative flex flex-wrap items-start justify-between gap-4 md:pr-[280px]">
          <div className="min-w-0">
            <h1 className="text-[32px] font-extrabold tracking-tight text-[#10213D] sm:text-[38px]">Enquiries</h1>
            <p className="mt-1.5 text-[15px] text-[#667085] sm:text-base">Manage customer queries and convert them into service bookings.</p>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-[#98A2B3]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Sourced from your shop&apos;s message threads. &ldquo;In Progress&rdquo; and &ldquo;Converted&rdquo; aren&apos;t tracked by this backend yet, so they show as &ldquo;—&rdquo;.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className={cx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E4ECE8] bg-white px-4 py-2.5 text-sm font-semibold text-[#10213D] shadow-sm transition hover:border-[#079447] hover:text-[#079447]',
              FOCUS_RING,
            )}
          >
            <RefreshCw className={cx('h-4 w-4 text-[#079447]', loading && 'animate-spin')} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-0 right-2 hidden h-[160px] w-[240px] md:block lg:right-4 lg:h-[190px] lg:w-[290px]">
          <EnquiriesIllustration />
        </div>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} /> : null}

      {loading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <EnquiryStatCard key={s.label} icon={s.icon} bgIcon={s.bgIcon} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
      )}

      <section className="overflow-hidden rounded-[22px] border border-[#E4ECE8] bg-gradient-to-b from-white to-[#FBFEFC]/96 shadow-[0_12px_30px_rgba(20,80,55,0.07),0_2px_8px_rgba(20,80,55,0.03)]">
        <div className="flex flex-col gap-3.5 border-b border-[#EEF3F0] px-5 py-5 sm:px-6">
          <FilterChips options={FILTERS} value={filter} onChange={setFilter} counts={counts} />
          <SearchField value={query} onChange={setQuery} placeholder="Search by name, phone, email, or enquiry source" />
        </div>

        {loading ? (
          <SkeletonRows rows={4} />
        ) : filtered.length === 0 ? (
          rows.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
              <EnquiriesEmptyIllustration />
              <p className="mt-3 text-base font-bold text-[#10213D]">No enquiries yet</p>
              <p className="mt-1 max-w-sm text-sm text-[#667085]">Customer enquiries will appear here when new messages or requests are received.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
              <Icon3D icon={MessageSquare} tone="gray" size="lg" />
              <p className="mt-3 text-sm font-bold text-[#10213D]">No enquiries match this filter</p>
              <p className="mt-1 text-sm text-[#667085]">Try a different filter or search term.</p>
            </div>
          )
        ) : (
          <div className="divide-y divide-[#EEF3F0]">
            {filtered.map((r) => (
              <EnquiryRow key={r.id} row={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EnquiryRow({ row }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cx(
          'group flex w-full items-center gap-3.5 px-4 py-5 text-left transition duration-200 ease-out hover:translate-x-0.5 hover:bg-gradient-to-r hover:from-[#E7F9EF]/65 hover:to-white sm:px-5',
          FOCUS_RING,
        )}
      >
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <span className="absolute inset-0 -m-1 rounded-full bg-[#86EFAC] opacity-40 blur-md" aria-hidden="true" />
          <Icon3D icon={MessageSquare} tone="green" size="lg" className="relative shadow-[0_5px_14px_rgba(8,145,75,0.16),inset_0_1.5px_0_rgba(255,255,255,0.5)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-[#10213D]">{row.name}</p>
          <p className="truncate text-[13px] text-[#667085]">{row.message || row.device || 'No preview available'}</p>
        </div>
        <span
          className={cx(
            'hidden shrink-0 items-center rounded-full px-3.5 py-2 text-[0.68rem] font-bold uppercase tracking-wide sm:inline-flex',
            row.unread > 0
              ? 'bg-[#FEF3D6] text-[#B7791F] shadow-[0_2px_10px_rgba(183,121,31,0.14)]'
              : 'bg-[#DFF8EB] text-[#066B39] shadow-[0_2px_10px_rgba(6,107,57,0.1)]',
          )}
        >
          {row.unread > 0 ? 'New' : 'Read'}
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E4ECE8] bg-white text-[#10213D] shadow-sm transition group-hover:shadow-[0_2px_10px_rgba(6,122,61,0.14)]">
          <ChevronDown className={cx('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-dashed border-[#EAECF0] bg-[#F3FBF7] px-4 py-4 sm:px-5">
          <span
            className={cx(
              'inline-flex items-center rounded-full px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wide sm:hidden',
              row.unread > 0 ? 'bg-[#FEF3D6] text-[#B7791F]' : 'bg-[#DFF8EB] text-[#066B39]',
            )}
          >
            {row.unread > 0 ? 'New' : 'Read'}
          </span>
          {row.device ? <p className="text-sm text-[#344054]">Device: {row.device}</p> : null}
          {row.message ? <p className="text-sm text-[#344054]">{row.message}</p> : null}
          {row.date ? <p className="text-xs text-[#667085]">{new Date(row.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p> : null}

          <div className="flex flex-wrap gap-2 pt-1">
            {row.phone ? (
              <a
                href={`tel:${row.phone}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDE5E1] bg-white px-3.5 py-2 text-xs font-bold text-[#10213D] transition hover:border-[#079447] hover:bg-[#F3FBF7] hover:text-[#079447]"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                Call Customer
              </a>
            ) : null}
            <Link
              href="/shop-home/services/book-service"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#16B45F] to-[#087A3E] px-3.5 py-2 text-xs font-bold text-white shadow-[0_4px_12px_rgba(8,122,62,0.28)] transition hover:brightness-105"
            >
              <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Convert to Booking
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
