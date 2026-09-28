'use client';

/**
 * /shop-home/employee/salary — no backing endpoint exists anywhere in this
 * codebase (no salary/wage/payslip/advance field or API for employees). This
 * is a genuine data gap, not a missing UI — there is nothing to compute,
 * list, or pay out yet.
 *
 * This page used to render the shared NotYetAvailablePage component (still
 * used, unchanged, by attendance/tasks/shift-schedule/leave and 3 report
 * pages). 2026-09: given its own bespoke UI here, matching a reference
 * design specific to Salary & Payslips, without touching NotYetAvailablePage
 * or any of its other consumers. The underlying honesty is unchanged: every
 * KPI value is a literal "—" (never "0" — a real zero would claim "we
 * checked and nobody was paid," which isn't a fact this codebase has), there
 * is no invented month-over-month trend line since no such data exists, the
 * "This Month" filter is inert (nothing else to filter by), and the empty
 * state explains exactly why, in the same words as before.
 */

import { BarChart3, CalendarDays, ChevronDown, Clock, Download, Receipt, RefreshCw, Wallet } from 'lucide-react';

import { cx } from '@/components/site/ui';

/** Tiny 4-bar decorative sparkline for a KPI card's bottom-right corner — purely stylistic texture (the "faint mini growth chart" the reference asks for), never labeled with or implying a specific real value. */
function MicroBars({ className }) {
  const heights = [7, 12, 9, 16];
  return (
    <svg viewBox="0 0 40 20" className={className} aria-hidden="true">
      {heights.map((h, i) => (
        <rect key={i} x={i * 10 + 2} y={20 - h} width="6" height={h} rx="2" fill="currentColor" />
      ))}
    </svg>
  );
}

/** Small decorative empty-state graphic — a document with a rupee symbol and a soft mint circle behind it, matching a reference design. Purely decorative. */
function SalaryEmptyIllustration({ className = 'h-28 w-28' }) {
  return (
    <svg viewBox="0 0 160 140" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="slEmptyDoc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="70" r="54" fill="#EEF2F1" opacity="0.7" />
      <ellipse cx="80" cy="118" rx="34" ry="7" fill="#334155" opacity="0.08" />
      <circle cx="34" cy="40" r="4" fill="#93C5FD" />
      <circle cx="128" cy="96" r="3.5" fill="#93C5FD" />
      <g transform="translate(52,40) rotate(-4)">
        <rect x="0" y="0" width="58" height="72" rx="7" fill="url(#slEmptyDoc)" stroke="#CBD5E1" strokeWidth="1.5" />
        <rect x="10" y="12" width="38" height="4" rx="2" fill="#CBD5E1" />
        <rect x="10" y="21" width="28" height="4" rx="2" fill="#CBD5E1" />
        <rect x="10" y="30" width="32" height="4" rx="2" fill="#CBD5E1" />
      </g>
      <circle cx="103" cy="88" r="18" fill="#94A3B8" />
      <text x="103" y="93" textAnchor="middle" fontSize="15" fontWeight="800" fill="white">₹</text>
      <rect x="93" y="88" width="20" height="4" rx="2" fill="#64748B" />
    </svg>
  );
}

// Page-local pastel KPI-card styling — deliberately laid out differently
// from Leave Management's stacked (icon-above-value) cards: this page uses a
// horizontal icon-left / text-right layout with a bigger, more finance-
// specific icon, per the reference's own note that this page shouldn't look
// identical to the other employee modules.
const SALARY_STAT_STYLES = {
  green: {
    card: 'bg-gradient-to-br from-[#F5FFF9] to-[#E5F9EF]',
    chip: 'bg-gradient-to-br from-[#22C55E] to-[#0A934D]',
    accent: 'from-[#4ADE80] to-[#0A934D]',
    value: 'text-[#10213D]',
    label: 'text-[#066B39]',
    wave: 'text-[#BBF7D0]',
    glow: 'bg-[#86EFAC]',
  },
  blue: {
    card: 'bg-gradient-to-br from-[#F7FBFF] to-[#E4F3FF]',
    chip: 'bg-gradient-to-br from-[#38BDF8] to-[#1DA8E8]',
    accent: 'from-[#7DD3FC] to-[#1DA8E8]',
    value: 'text-[#10213D]',
    label: 'text-[#1D6FA0]',
    wave: 'text-[#93D6F7]',
    glow: 'bg-[#93D6F7]',
  },
  orange: {
    card: 'bg-gradient-to-br from-[#FFFBF5] to-[#FFF0D9]',
    chip: 'bg-gradient-to-br from-[#FBBF54] to-[#FF9A19]',
    accent: 'from-[#FDBA74] to-[#FF9A19]',
    value: 'text-[#10213D]',
    label: 'text-[#9A6A27]',
    wave: 'text-[#FDD08A]',
    glow: 'bg-[#FDD08A]',
  },
  pink: {
    card: 'bg-gradient-to-br from-[#FFF8FA] to-[#FFE7ED]',
    chip: 'bg-gradient-to-br from-[#FB7185] to-[#F43F5E]',
    accent: 'from-[#FDA4AF] to-[#F43F5E]',
    value: 'text-[#10213D]',
    label: 'text-[#9F5361]',
    wave: 'text-[#FDA4AF]',
    glow: 'bg-[#FDA4AF]',
  },
};

function CoinsGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <ellipse cx="12" cy="17" rx="8" ry="3" fill="currentColor" opacity="0.9" />
      <ellipse cx="12" cy="13" rx="8" ry="3" fill="currentColor" opacity="0.9" />
      <ellipse cx="12" cy="9" rx="8" ry="3" fill="currentColor" />
    </svg>
  );
}

function PeopleGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="8" cy="8" r="3.2" fill="currentColor" />
      <circle cx="16" cy="8" r="3.2" fill="currentColor" opacity="0.75" />
      <path d="M2 20 c0 -4.5 2.8 -7 6 -7 s6 2.5 6 7 z" fill="currentColor" />
      <path d="M12 20 c0.3 -4 3 -6.2 6 -6.2 s5.7 2.2 6 6.2 z" fill="currentColor" opacity="0.75" />
    </svg>
  );
}

const STATS = [
  { label: 'Total Monthly Payroll', icon: CoinsGlyph, bgIcon: Receipt, tone: 'green' },
  { label: 'Employees Paid', icon: PeopleGlyph, bgIcon: PeopleGlyph, tone: 'blue' },
  { label: 'Pending Payments', icon: Clock, bgIcon: Clock, tone: 'orange' },
  { label: 'Salary Advances', icon: Wallet, bgIcon: BarChart3, tone: 'pink' },
];

function SalaryStatCard({ icon: Icon, bgIcon: BgIcon, label, tone }) {
  const s = SALARY_STAT_STYLES[tone] || SALARY_STAT_STYLES.green;

  return (
    <div
      className={cx(
        'group relative flex h-[170px] flex-col justify-between overflow-hidden rounded-[22px] border border-[#E4ECE8] p-5 shadow-[0_8px_22px_rgba(20,40,60,0.06)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_14px_30px_rgba(20,40,60,0.1)]',
        s.card,
      )}
    >
      {/* thin colored accent bar along the top edge — a small but real
          "premium dashboard" tell that this card belongs to its own tone,
          beyond just the pastel background. */}
      <span className={cx('absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r', s.accent)} aria-hidden="true" />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[22px] bg-gradient-to-b from-white/60 to-transparent" aria-hidden="true" />
      <BgIcon className={cx('pointer-events-none absolute -bottom-5 -right-5 h-[88px] w-[88px] rotate-[-8deg] opacity-[0.15] transition-transform duration-300 group-hover:scale-105', s.wave)} aria-hidden="true" />

      {/* icon + title, in a row (not stacked) — a large colored square icon
          tile beside the label, per the reference's "strong colored icon
          tile on left, title beside icon" card structure. */}
      <div className="relative flex items-center gap-2.5">
        <span
          className={cx(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_9px_22px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.5)]',
            s.chip,
          )}
        >
          <Icon className="h-8 w-8" aria-hidden="true" />
        </span>
        <p className={cx('min-w-0 truncate text-sm font-bold', s.label)}>{label}</p>
      </div>

      {/* value bottom-left, micro sparkline bottom-right — "—" (unavailable)
          since no salary/payroll backend exists, never a fabricated count;
          the sparkline is purely decorative texture, not a real chart. */}
      <div className="relative flex items-end justify-between gap-2">
        <p className={cx('text-[34px] font-extrabold leading-none tracking-tight', s.value)}>—</p>
        <MicroBars className={cx('h-5 w-10 shrink-0 opacity-50', s.wave)} />
      </div>
    </div>
  );
}

export default function SalaryPayslipsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Hero — compact premium banner, matching a reference design's
          "white -> mint" spec. The right-side artwork is the real
          public/salary-payslip.png asset (a calendar/payslip-card/coins/
          money-bag illustration cluster), CSS-cropped via
          background-position to show only that cluster — the same file
          also has a full mockup of this banner (eyebrow/title/subtitle)
          baked into its left side with slightly different wording, so only
          the illustration portion is windowed in; the eyebrow/title/
          subtitle below are this page's real, unchanged copy, not the
          mockup's baked pixels. No white image box: the illustration is a
          plain background-image directly on the mint hero background, not
          wrapped in its own card/frame. */}
      <div
        className="relative min-h-[150px] overflow-hidden rounded-[22px] p-6 shadow-[0_10px_30px_rgba(18,73,55,0.07)] md:p-[30px_36px]"
        style={{
          background: 'linear-gradient(110deg, #ffffff 0%, #f4fcf8 45%, #e5f9ef 100%)',
          border: '1px solid rgba(17, 150, 95, 0.10)',
        }}
      >
        <span className="pointer-events-none absolute -right-10 -top-16 z-0 h-64 w-64 rounded-full bg-[#86EFAC]/20 blur-3xl" aria-hidden="true" />
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-16 w-full text-[#DFF8EB]/70"
          viewBox="0 0 500 70"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,35 C150,70 320,5 500,40 L500,70 L0,70 Z" />
        </svg>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-8 w-full text-white/80"
          viewBox="0 0 500 35"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,18 C170,35 300,2 500,20 L500,35 L0,35 Z" />
        </svg>
        <span className="pointer-events-none absolute right-[8%] top-[18%] z-0 h-2 w-2 rounded-full bg-[#0A934D]/60" aria-hidden="true" />
        <span className="pointer-events-none absolute right-[26%] top-[14%] z-0 h-1.5 w-1.5 rounded-full bg-[#F5B93D]/60" aria-hidden="true" />
        <span className="pointer-events-none absolute right-[4%] bottom-[38%] z-0 h-1.5 w-1.5 rounded-full bg-[#38BDF8]/50" aria-hidden="true" />

        <div className="relative z-20 min-w-0 md:pr-[300px] lg:pr-[330px]">
          <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.115em] text-[#0A934D]">
            <span className="h-1.5 w-4 rounded-full bg-gradient-to-r from-[#22C55E] to-[#0A934D]" aria-hidden="true" />
            Employee Management
          </span>
          <h1 className="mt-2.5 text-[28px] font-extrabold leading-[1.05] tracking-tight text-[#0C1E3C] sm:text-[34px] md:text-[36px]">
            Salary &amp; <span className="text-[#0A934D]">Payslips</span>
          </h1>
          <p className="mt-3 max-w-[520px] text-[15px] leading-[1.55] text-[#597084] sm:text-[16px]">
            Manage employee salary, advances, and monthly payslips.
          </p>
        </div>

        {/* public/salary-payslip.png, windowed to its right-side
            illustration cluster only (original asset is 2160x728; the
            calendar/payslip-card/coins/money-bag cluster sits roughly at
            x:1328-2063, y:205-475 in that image) — background-size scales
            the whole image up, background-position shifts it so only that
            region falls inside this box. No wrapper card/border/background
            around it, so it blends straight into the hero. */}
        <div
          className="pointer-events-none absolute bottom-0 right-5 z-[5] hidden h-[155px] w-[422px] md:block lg:right-7 lg:h-[170px] lg:w-[463px]"
          style={{
            backgroundImage: "url('/salary-payslip.png')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1240px 418px',
            backgroundPosition: '-762px -118px',
          }}
          aria-hidden="true"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((s) => (
          <SalaryStatCard key={s.label} icon={s.icon} bgIcon={s.bgIcon} label={s.label} tone={s.tone} />
        ))}
      </div>

      <section className="relative flex min-h-[300px] flex-col overflow-hidden rounded-[22px] border border-[#E8EEF0] bg-white shadow-[0_10px_28px_rgba(21,44,58,0.06)]">
        {/* A faint echo of the hero's wave/glow language along the very top
            edge of the panel, so the page reads as one connected system
            instead of "colorful hero, then a plain white box." */}
        <span className="pointer-events-none absolute -right-16 -top-16 z-0 h-48 w-48 rounded-full bg-[#DFF8EC]/60 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -left-10 -top-10 z-0 h-32 w-32 rounded-full bg-[#EAF5FF]/50 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 flex h-[72px] items-center justify-between gap-3 border-b border-[#ECF1F3] px-5 py-3.5 sm:px-6">
          {/* "This Month" is the only real option — there's no salary data
              to filter across other months, so this stays a single inert
              pill (same honest "nothing behind it yet" treatment the filter
              chips on Leave Management / Warranty use), not a working
              dropdown with nothing real to select. */}
          <button
            type="button"
            disabled
            title="There's no salary data yet to filter by month."
            className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-[14px] bg-gradient-to-br from-[#17B868] to-[#10884F] px-[18px] text-sm font-bold text-white opacity-90 shadow-[0_4px_12px_rgba(16,136,79,0.28)]"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            This Month
            <ChevronDown className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
          </button>

          {/* Refresh/Export — understated but visibly boxed icon buttons,
              honestly disabled: there is nothing to re-fetch (no API call
              exists on this page at all) and nothing to export (no rows
              exist), so these stay real-but-inert rather than looking
              clickable with nothing behind them. */}
          <div className="flex shrink-0 items-center gap-[10px]">
            <button
              type="button"
              disabled
              title="There's no salary data yet to refresh."
              aria-label="Refresh (not available yet)"
              className="inline-flex h-[42px] w-[42px] cursor-not-allowed items-center justify-center rounded-xl border border-[#E4ECE8] bg-white text-[#3F5468] shadow-sm"
            >
              <RefreshCw className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled
              title="There's no salary data yet to export."
              aria-label="Export (not available yet)"
              className="inline-flex h-[42px] w-[42px] cursor-not-allowed items-center justify-center rounded-xl border border-[#E4ECE8] bg-white text-[#3F5468] shadow-sm"
            >
              <Download className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="relative z-10 flex min-h-[230px] flex-1 flex-col items-center justify-center px-6 pb-5 text-center">
          <SalaryEmptyIllustration className="h-[92px] w-[92px]" />
          <p className="mt-2.5 text-xl font-extrabold text-[#0E1C35]">Not available yet</p>
          <p className="mt-1.5 max-w-[640px] text-sm leading-relaxed text-[#6A7C91]">
            Salary and payslip tracking isn&apos;t available yet — the backend has no salary, wage, or advance data for employees.
          </p>
        </div>
      </section>
    </div>
  );
}
