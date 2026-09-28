'use client';

/**
 * /shop-home/reports/cash-book
 *
 * 2026-09-28: the Customer/Supplier ledger IS real — src/lib/cashBook.js
 * calls the two confirmed live ticket-service endpoints:
 *   GET {TICKET_BASE}/ledger-parties?partyType=CUSTOMER|SUPPLIER
 *   GET {TICKET_BASE}/ledger-entries/party/{partyId}
 * (found by hitting the live API directly with real data — not something a
 * repo-only search could have found, since nothing in this frontend
 * referenced them before). Account list, Net Balance, and each row's
 * expandable statement below are all real, fetched data.
 *
 * Still NOT confirmed to exist: any create/write endpoint (add a
 * customer/supplier party, post a Received/Given entry), or a
 * date-filtered variant of either endpoint. So "Add Customer"/"Add
 * Supplier" stay honestly disabled with a tooltip, and the Today/This
 * Week/Month pills stay inert — inventing a POST call with no confirmed
 * endpoint would be fabricating functionality, not fixing it.
 *
 * The top 4 KPI cards (Cash In/Cash Out/Balance/Today's Entries) are a
 * DIFFERENT, still-unconfirmed aggregate — computing them for real would
 * mean fetching every party's full entry history just to sum them (no
 * dedicated summary endpoint has been confirmed), so those keep their
 * original "—" placeholders unchanged.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  BookOpen,
  ChevronDown,
  FileClock,
  Loader2,
  Phone,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

import { cx } from '@/components/site/ui';
import EmptyState from '@/components/shop-dashboard/EmptyState';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { readShopOwner, subscribe } from '@/lib/shopAuth';
import { fetchLedgerParties, fetchLedgerPartyStatement } from '@/lib/cashBook';

const DASH = '—';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatShortDate(value) {
  if (!value) return 'Not available';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not available';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${d.getFullYear()}`;
}
function inr(amount) {
  return `₹${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
}
function directionLabel(direction) {
  return direction === 'RECEIVED' ? 'Received' : 'Given';
}

// Icon + tint + watermark per summary card — four distinct identities
// (green/orange/blue/violet), matching a reference design's "cash flow"
// look, deliberately different from Profit & Loss/Service Report's own
// card treatments.
const CASH_CARD_STYLES = {
  green: { card: 'bg-gradient-to-br from-[#EAFBF3] to-[#DAF5E7]', chip: 'bg-gradient-to-br from-[#22C55E] to-[#0BA65A]', watermark: 'text-[#0BA65A]' },
  orange: { card: 'bg-gradient-to-br from-[#FFF3E4] to-[#FEE4C4]', chip: 'bg-gradient-to-br from-[#FFB35C] to-[#FF8F2C]', watermark: 'text-[#FF8F2C]' },
  blue: { card: 'bg-gradient-to-br from-[#EEF7FF] to-[#DFEFFE]', chip: 'bg-gradient-to-br from-[#5EB6FA] to-[#2196F3]', watermark: 'text-[#2196F3]' },
  violet: { card: 'bg-gradient-to-br from-[#F5F0FE] to-[#EBE1FD]', chip: 'bg-gradient-to-br from-[#A78BFA] to-[#8B5CF6]', watermark: 'text-[#8B5CF6]' },
};

const CASH_CARDS = [
  { key: 'in', label: 'Cash In', icon: TrendingUp, watermark: Wallet, tone: 'green' },
  { key: 'out', label: 'Cash Out', icon: TrendingDown, watermark: Wallet, tone: 'orange' },
  { key: 'balance', label: 'Balance', icon: Wallet, watermark: Wallet, tone: 'blue' },
  { key: 'entries', label: "Today's Entries", icon: FileClock, watermark: FileClock, tone: 'violet' },
];

function CashCard({ icon: Icon, watermark: Watermark, label, tone }) {
  const s = CASH_CARD_STYLES[tone] || CASH_CARD_STYLES.green;
  return (
    <div className={cx('relative flex min-h-[135px] flex-col overflow-hidden rounded-[20px] border border-[rgba(15,80,60,0.06)] p-4 shadow-[0_8px_24px_rgba(20,70,55,0.06)]', s.card)}>
      <Watermark className={cx('pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 opacity-15', s.watermark)} aria-hidden="true" />
      <span className={cx('relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_6px_14px_rgba(0,0,0,0.1)]', s.chip)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="relative mt-2.5 text-[26px] font-extrabold leading-none text-[#10233F]">{DASH}</p>
      <p className="relative mt-1 text-sm font-semibold text-[#10233F]">{label}</p>
    </div>
  );
}

// One customer/supplier account row — real data from GET /ledger-parties.
// Clicking it lazy-loads that party's real statement (GET
// /ledger-entries/party/{id}) and expands it inline, same expand/toggle
// pattern already used elsewhere in this app (e.g. ServiceReportClient's
// TaskRow) rather than a new routed screen.
function PartyRow({ party, expanded, onToggle, statement, statementLoading, statementError }) {
  const initial = (party.name || '?').trim().charAt(0).toUpperCase() || '?';
  const hasLastEntry = party.lastEntryAmount != null && party.lastEntryDirection;
  const activityLine = hasLastEntry
    ? `${inr(party.lastEntryAmount)} ${directionLabel(party.lastEntryDirection)} on ${formatShortDate(party.lastEntryDate)}`
    : `Added On ${formatShortDate(party.createdAt)}`;
  const due = Number(party.balance || 0) !== 0;

  return (
    <div>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#F9FDFB] sm:px-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#22C55E] to-[#0BA65A] text-sm font-extrabold text-white">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#10233F]">{party.name}</p>
          <p className="truncate text-xs text-[#667085]">{activityLine}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-extrabold text-[#10233F]">{inr(party.balance)}</p>
          <p className={cx('text-xs font-bold', due ? 'text-[#DC6803]' : 'text-[#0BA65A]')}>{due ? 'Due' : 'Settled'}</p>
        </div>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-[#98A2B3] transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
      </button>

      {expanded ? (
        <div className="border-t border-dashed border-[#EAECF0] bg-[#F9FAFB] px-4 py-4 sm:px-5">
          {party.phone ? (
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-[#667085]">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {party.phone}
            </p>
          ) : null}
          {statementLoading ? (
            <p className="flex items-center gap-2 text-xs text-[#667085]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Loading statement…
            </p>
          ) : statementError ? (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {statementError}
            </p>
          ) : !statement || statement.entries.length === 0 ? (
            <p className="text-xs text-[#98A2B3]">No entries recorded for this account yet.</p>
          ) : (
            <div className="space-y-2">
              {statement.entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#10233F]">{directionLabel(entry.direction)}</p>
                    <p className="text-[0.68rem] text-[#98A2B3]">{formatShortDate(entry.entryDate)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cx('text-xs font-extrabold', entry.direction === 'RECEIVED' ? 'text-[#0BA65A]' : 'text-[#DC2626]')}>
                      {inr(entry.amount)}
                    </p>
                    <p className="text-[0.68rem] text-[#98A2B3]">Bal. {inr(entry.runningBalance)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function CashBookReportPage() {
  const router = useRouter();
  // loginScope comes straight from the real session (src/lib/shopAuth.js,
  // set at login by src/lib/shopMobileAuth.js): 'OWNER' for a personal-
  // number login vs 'SHOP' for the shop's own shared-number login (e.g. a
  // counter clerk). The cash book is gated on that real field — same
  // read/subscribe pattern src/app/shop-home/account/profile/page.js
  // already uses — not a fabricated permission check.
  const [shopOwner, setShopOwner] = useState(null);
  useEffect(() => {
    setShopOwner(readShopOwner());
    const unsub = subscribe((session) => setShopOwner(session));
    return unsub;
  }, []);
  const ownerOnlyRestricted = shopOwner?.loginScope === 'SHOP';

  // Real Customer/Supplier ledger state. Each tab fetches its own party list
  // independently (partyType=CUSTOMER vs partyType=SUPPLIER) — never mixed.
  const [tab, setTab] = useState('CUSTOMER');
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [statements, setStatements] = useState({});
  const [statementLoadingId, setStatementLoadingId] = useState(null);
  const [statementErrors, setStatementErrors] = useState({});

  useEffect(() => {
    if (ownerOnlyRestricted) return undefined;
    let alive = true;
    setLoading(true);
    setError('');
    setExpandedId(null);
    fetchLedgerParties(tab)
      .then((list) => {
        if (alive) setParties(list);
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load the cash book.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tab, reloadKey, ownerOnlyRestricted]);

  const netBalance = useMemo(() => parties.reduce((sum, p) => sum + (Number(p.balance) || 0), 0), [parties]);
  const accountCount = parties.length;

  function toggleParty(party) {
    const nextId = expandedId === party.id ? null : party.id;
    setExpandedId(nextId);
    if (nextId && !statements[nextId] && statementLoadingId !== nextId) {
      setStatementLoadingId(nextId);
      setStatementErrors((prev) => ({ ...prev, [nextId]: '' }));
      fetchLedgerPartyStatement(nextId)
        .then((data) => {
          setStatements((prev) => ({ ...prev, [nextId]: data }));
        })
        .catch((err) => {
          setStatementErrors((prev) => ({ ...prev, [nextId]: err.message || 'Could not load the statement.' }));
        })
        .finally(() => {
          setStatementLoadingId((cur) => (cur === nextId ? null : cur));
        });
    }
  }

  return (
    <div className="flex flex-col gap-5" style={{ background: 'linear-gradient(180deg, #F7FBFA 0%, #F4FAF8 55%, #EDF8F3 100%)' }}>
      {/* Banner — the real public/cashbook.png asset (which already renders
          its own "Cash Book" title, subtitle, wallet icon, and shop
          illustration as one finished scene), used directly with no
          surrounding hero card/border/padding. The source file itself has
          ~244px of solid blank canvas above the real illustration and
          ~242px below it (out of 760px total height, verified by a pixel
          bounding-box scan) — showing it at a compact height, uncropped,
          would mean showing mostly blank space, and cropping to remove that
          via object-fit:cover would risk cutting into the real artwork
          instead. So this is public/images/cashbook-banner.png: the exact
          same pixels, trimmed only to that verified-blank margin (not the
          illustration) — same non-destructive-crop technique already used
          for this page's previous banner asset. Width 100% / height auto
          keeps the image's own aspect ratio with zero crop and zero
          stretch at any width; max-h caps it at a compact height on wide
          desktops per spec (well inside 180–220px), naturally growing
          shorter on narrower viewports — no fixed box, so no empty
          letterboxed area either. */}
      <Image
        src="/images/cashbook-banner.png"
        alt="Cash Book — Manage cash-in and cash-out records."
        width={1905}
        height={304}
        sizes="100vw"
        className="h-auto w-full max-h-[200px] rounded-[20px]"
        priority
      />

      {/* ---- Summary cards -------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CASH_CARDS.map((c) => (
          <CashCard key={c.key} icon={c.icon} watermark={c.watermark} label={c.label} tone={c.tone} />
        ))}
      </div>

      {/* ---- Content panel ---------------------------------------------- */}
      <section
        className="rounded-[22px] bg-white p-5 shadow-[0_8px_26px_rgba(20,70,55,0.05)] sm:p-6"
        style={{ border: '1px solid rgba(15, 80, 60, 0.06)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E4ECE8] bg-white text-[#344054] transition hover:border-[#0BA65A] hover:text-[#0BA65A]"
            >
              <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
            <p className="truncate text-[16px] font-bold text-[#10233F]">Cash Book</p>
          </div>
          {/* Real disabled control, not a fake live button — there's no
              cash-book ledger data source anywhere to actually open/export. */}
          <button
            type="button"
            disabled
            title="Cash book ledger export isn't available yet."
            aria-label="Ledger (not available yet)"
            className="flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-gradient-to-br from-[#22C55E] to-[#0BA65A] text-white opacity-60 shadow-[0_4px_12px_rgba(11,166,90,0.28)]"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Customer/Supplier are now both real, independently-fetched tabs
            (see the effect above — switching tab re-fetches that party
            type, never mixing the two arrays). Today/This Week/Month stay
            plain, non-interactive labels — no date-filtered variant of
            /ledger-parties has been confirmed to exist. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[
            { value: 'CUSTOMER', label: 'Customer' },
            { value: 'SUPPLIER', label: 'Supplier' },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-pressed={tab === t.value}
              className={cx(
                'rounded-full px-4 py-2 text-xs font-bold transition',
                tab === t.value
                  ? 'bg-gradient-to-r from-[#22C55E] to-[#15803D] text-white shadow-[0_4px_12px_rgba(21,128,61,0.32)]'
                  : 'bg-[#F3FBF7] text-[#344054] hover:bg-[#EAF9EF] hover:text-[#15803D]',
              )}
            >
              {t.label}
            </button>
          ))}
          {['Today', 'This Week', 'Month'].map((label) => (
            <span key={label} className="rounded-full bg-[#F3FBF7] px-4 py-2 text-xs font-bold text-[#344054]">
              {label}
            </span>
          ))}
        </div>

        {ownerOnlyRestricted ? (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
            <p className="text-sm font-semibold text-red-700">The cash book is available to the shop owner only.</p>
          </div>
        ) : (
          <>
            {/* Net Balance card — real values: sum of every loaded party's
                real `balance`, and a real account count. Filter/sort icon
                stays honestly disabled — no sort/filter param has been
                confirmed on GET /ledger-parties. */}
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-[#EAFBF3] to-[#DDF7EA] px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#10233F]">Net Balance</p>
                <p className="mt-0.5 text-xs font-semibold text-[#5C7A6D]">
                  {accountCount} {accountCount === 1 ? 'Account' : 'Accounts'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-extrabold leading-none text-[#10233F]">{inr(netBalance)}</p>
                  <p className="mt-1 text-xs font-semibold text-[#5C7A6D]">{netBalance === 0 ? 'Settled' : 'Due'}</p>
                </div>
                <button
                  type="button"
                  disabled
                  title="Filtering or sorting accounts isn't available yet."
                  aria-label="Filter or sort (not available yet)"
                  className="flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-[rgba(15,80,60,0.12)] bg-white text-[#5C7A6D]"
                >
                  <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#10233F]">Accounts</p>
              {/* Real disabled control — no create-party endpoint has been
                  confirmed to exist yet (only the two GET routes above). */}
              <button
                type="button"
                disabled
                title={`Adding a new ${tab === 'SUPPLIER' ? 'supplier' : 'customer'} isn't available yet — no create endpoint exists for this ledger yet.`}
                className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-full bg-gradient-to-br from-[#22C55E] to-[#0BA65A] px-3.5 py-2 text-xs font-bold text-white opacity-60 shadow-[0_4px_12px_rgba(11,166,90,0.24)]"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Add {tab === 'SUPPLIER' ? 'Supplier' : 'Customer'}
              </button>
            </div>

            {/* Loading / error / empty / real-list — four genuinely distinct
                states, not "every problem collapses into the empty state":
                a fetch failure shows ErrorBanner (with Retry re-running the
                effect via reloadKey), and "No customers/suppliers yet" only
                renders once loading is false, error is empty, AND the real
                response array is actually empty. */}
            {loading ? (
              <div className="mt-4 space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[64px] animate-pulse rounded-2xl bg-[#F3FBF7]" />
                ))}
              </div>
            ) : error ? (
              <div className="mt-4">
                <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
              </div>
            ) : parties.length === 0 ? (
              <EmptyState
                icon={Users}
                title={tab === 'SUPPLIER' ? 'No suppliers yet' : 'No customers yet'}
                description={`${tab === 'SUPPLIER' ? 'Supplier' : 'Customer'} cash-book entries will show up here once available.`}
              />
            ) : (
              <div className="mt-4 divide-y divide-[#EEF3F0] rounded-[16px] border border-[rgba(15,80,60,0.06)]">
                {parties.map((party) => (
                  <PartyRow
                    key={party.id}
                    party={party}
                    expanded={expandedId === party.id}
                    onToggle={() => toggleParty(party)}
                    statement={statements[party.id]}
                    statementLoading={statementLoadingId === party.id}
                    statementError={statementErrors[party.id]}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
