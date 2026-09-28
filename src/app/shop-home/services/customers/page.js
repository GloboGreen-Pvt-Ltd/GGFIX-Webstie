'use client';

/**
 * /shop-home/services/customers — customer roster, derived client-side.
 *
 * There is no dedicated shop-scoped customer-roster endpoint anywhere in
 * this backend (confirmed by a full-tree search) — this page derives one
 * customer per unique phone number (falling back to name when a booking has
 * no phone) out of GET {ORDER_BASE}/repair-bookings/shop (fetchShopBookings()).
 * That means "Total Bookings" per customer counts bookings this dashboard
 * can see, not literally every repair job ever done for them (a walk-in
 * ticket created without a matching booking wouldn't be counted) — an
 * honest limitation of there being no real customer API, not a bug.
 *
 * The base derivation (name/phone/email/address dedup) lives in
 * src/lib/customerDirectory.js and is shared with Book Service's "previous
 * customers" type-ahead — this file only adds the page-specific enrichment
 * (active/totalSpent/history) on top, so the two pages can never disagree
 * about who a customer is.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Clock, Mail, MapPin, Phone, PlusCircle, Repeat, Smartphone, User, UserCheck, UserPlus, Users } from 'lucide-react';

import { cx } from '@/components/site/ui';
import Icon3D from '@/components/shop-dashboard/Icon3D';
import SearchField, { FOCUS_RING } from '@/components/shop-dashboard/SearchField';
import ErrorBanner from '@/components/shop-dashboard/ErrorBanner';
import { SkeletonRows, SkeletonStatCards } from '@/components/shop-dashboard/SkeletonBlocks';
import { fetchShopBookings, friendlyBookingStatus } from '@/lib/shopDashboard';
import { deriveCustomers as deriveCustomerDirectory } from '@/lib/customerDirectory';

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

// Same status buckets friendlyBookingStatus() has always produced — only the
// pill's color/shape is new here, matching the palette already used by the
// redesigned Dashboard's Recent Bookings card.
const STATUS_BADGE = {
  Created: 'bg-[#DFF8EB] text-[#067A3D]',
  'In Progress': 'bg-[#E5F2FC] text-[#0875B7]',
  Pickup: 'bg-[#FEF3D6] text-[#B7791F]',
  Completed: 'bg-[#EAF9EF] text-[#15803D]',
  Cancelled: 'bg-[#FDE8EA] text-[#DC2626]',
};

// Page-local pastel KPI-card styling — not the shared StatCard (used by
// ~10 other pages, unaffected): a reference design for this page wants a
// distinct pastel-gradient + Icon3D + translucent-glyph treatment per card,
// same idea as the Dashboard's DashboardKpiCard and Pickups' PickupStatCard.
const CUSTOMER_STAT_STYLES = {
  green: { card: 'bg-gradient-to-br from-[#F3FBF7] to-[#E4F8EC]', value: 'text-[#10213D]', label: 'text-[#066B39]', wave: 'text-[#BBF7D0]' },
  blue: { card: 'bg-gradient-to-br from-[#EFF9FF] to-[#D9F0FE]', value: 'text-[#10213D]', label: 'text-[#1D6FA0]', wave: 'text-[#93D6F7]' },
  orange: { card: 'bg-gradient-to-br from-[#FFF7ED] to-[#FDE7CB]', value: 'text-[#10213D]', label: 'text-[#9A5B27]', wave: 'text-[#FDBA74]' },
  violet: { card: 'bg-gradient-to-br from-[#F5F3FF] to-[#E8E1FC]', value: 'text-[#10213D]', label: 'text-[#6D5A9E]', wave: 'text-[#C4B5FD]' },
};

function CustomerStatCard({ icon: Icon, bgIcon: BgIcon, label, value, tone }) {
  const s = CUSTOMER_STAT_STYLES[tone] || CUSTOMER_STAT_STYLES.green;
  return (
    <div
      className={cx(
        'relative flex h-full flex-col overflow-hidden rounded-[22px] border border-[#E3ECE8] p-5 shadow-[0_12px_30px_rgba(20,80,55,0.08),0_3px_10px_rgba(20,80,55,0.05)]',
        s.card,
      )}
    >
      <BgIcon className={cx('pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 opacity-25', s.wave)} aria-hidden="true" />
      <Icon3D icon={Icon} tone={tone} size="md" className="relative" />
      <p className={cx('relative mt-4 text-[30px] font-extrabold leading-none tracking-tight', s.value)}>{value}</p>
      <p className={cx('relative mt-1.5 text-sm font-semibold', s.label)}>{label}</p>
    </div>
  );
}

/**
 * This page's own enrichment (active/totalSpent/history) layered on top of
 * the shared base directory (src/lib/customerDirectory.js) — the same base
 * Book Service's "previous customers" type-ahead uses, so both agree on who
 * a customer is and what their saved address/last booking was.
 */
function deriveCustomers(bookings) {
  return deriveCustomerDirectory(bookings).map((c) => {
    const withStatus = c.bookings.map((b) => ({ ...b, ...friendlyBookingStatus(b.status) }));
    const active = withStatus.some((b) => ['Created', 'Pickup', 'In Progress'].includes(b.statusLabel));
    const totalSpent = c.bookings.reduce((sum, b) => sum + Number(b.pricing?.finalAmount ?? b.pricing?.estimatedAmount ?? 0), 0);
    return {
      ...c,
      active,
      totalSpent,
      history: withStatus.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    };
  });
}

export default function CustomersPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [expandedKey, setExpandedKey] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetchShopBookings()
      .then((list) => {
        if (alive) setBookings(list);
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load customers.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const customers = useMemo(() => deriveCustomers(bookings), [bookings]);

  const now = new Date();
  const newThisMonth = customers.filter((c) => {
    if (!c.firstServiceAt) return false;
    const d = new Date(c.firstServiceAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const activeCount = customers.filter((c) => c.active).length;
  const repeatCount = customers.filter((c) => c.totalBookings > 1).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [customers, query]);

  const stats = [
    { label: 'Total Customers', value: customers.length, icon: Users, bgIcon: Users, tone: 'green' },
    { label: 'New This Month', value: newThisMonth, icon: UserPlus, bgIcon: UserPlus, tone: 'blue' },
    { label: 'Active Customers', value: activeCount, icon: UserCheck, bgIcon: UserCheck, tone: 'orange' },
    { label: 'Repeat Customers', value: repeatCount, icon: Repeat, bgIcon: Repeat, tone: 'violet' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero — soft mint gradient banner with abstract waves + a decorative
          customer-group illustration on the far right, matching the same
          premium design system as the Dashboard/Book Service/Pickups pages.
          Title/subtitle are the exact same content this page always had. */}
      {/* Hero — compact premium banner, matching a reference design's
          "white -> mint" spec. The right-side artwork is the real
          public/customer.png asset (a people/contact-card illustration
          cluster), CSS-cropped via background-position to show only that
          cluster — the same file also has a full mockup of this banner
          (title/subtitle/accent line) baked into its left side, so only the
          illustration portion is windowed in; the title/subtitle below are
          real, unchanged text. */}
      <div
        className="relative overflow-hidden rounded-[20px] p-5 shadow-[0_8px_24px_rgba(35,84,68,0.07)] sm:p-6"
        style={{
          background: 'linear-gradient(110deg, #ffffff 0%, #f8fcfb 45%, #ecfaf4 100%)',
          border: '1px solid rgba(20, 140, 90, 0.10)',
        }}
      >
        <span className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#86EFAC]/20 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute left-1/3 top-2 h-2 w-2 rounded-full bg-[#93C5FD]/50" aria-hidden="true" />
        <span className="pointer-events-none absolute left-1/2 bottom-6 h-1.5 w-1.5 rounded-full bg-[#4ADE80]/50" aria-hidden="true" />
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full text-[#E4F8EC]/60"
          viewBox="0 0 500 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,40 C120,90 280,0 500,50 L500,80 L0,80 Z" />
        </svg>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-9 w-full text-[#D9F3E9]/70"
          viewBox="0 0 500 50"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,22 C150,45 320,4 500,26 L500,50 L0,50 Z" />
        </svg>

        <div className="relative flex flex-wrap items-center gap-4 py-2 md:pr-[230px] md:pl-2">
          <span className="h-10 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#22C55E] to-[#0A934D]" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-[30px] font-extrabold leading-tight tracking-tight text-[#10213D] sm:text-[34px]">Customers</h1>
            <p className="mt-1.5 text-[15px] text-[#5B7085] sm:text-base">Manage your customer relationships and service history.</p>
          </div>
        </div>

        {/* public/customer.png, windowed to its right-side illustration
            cluster only (original asset is 2171x724; the people + contact
            card cluster sits roughly at x:1515-2169, y:240-480 in that
            image) — background-size scales the whole image up,
            background-position shifts it so only that region falls inside
            this box. */}
        <div
          className="pointer-events-none absolute bottom-0 right-6 hidden h-[140px] w-[382px] md:block lg:right-8 lg:h-[150px] lg:w-[409px]"
          style={{
            backgroundImage: "url('/customer.png')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1267px 422px',
            backgroundPosition: '-884px -140px',
          }}
          aria-hidden="true"
        />
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} /> : null}

      {loading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <CustomerStatCard key={s.label} icon={s.icon} bgIcon={s.bgIcon} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
      )}

      <section className="rounded-[22px] border border-[#E3ECE8] bg-white/96 shadow-[0_10px_28px_rgba(20,80,55,0.06),0_2px_8px_rgba(20,80,55,0.03)]">
        <div className="border-b border-[#EEF3F0] px-4 py-4 sm:px-5">
          <div className="relative">
            <SearchField value={query} onChange={setQuery} placeholder="Search by name, phone, or email" />
          </div>
        </div>

        {loading ? (
          <SkeletonRows rows={5} />
        ) : filtered.length === 0 ? (
          customers.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
              <Icon3D icon={Users} tone="green" size="lg" />
              <p className="mt-3 text-sm font-bold text-[#10213D]">No customers yet</p>
              <p className="mt-1 text-sm text-[#667085]">Customers will appear here once service bookings are created.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
              <Icon3D icon={Users} tone="gray" size="lg" />
              <p className="mt-3 text-sm font-bold text-[#10213D]">No customers match your search</p>
              <p className="mt-1 text-sm text-[#667085]">Try a different name, phone, or email.</p>
            </div>
          )
        ) : (
          <div className="divide-y divide-[#EEF3F0]">
            {filtered.map((c) => (
              <CustomerRow key={c.key} customer={c} expanded={expandedKey === c.key} onToggle={() => setExpandedKey(expandedKey === c.key ? null : c.key)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CustomerRow({ customer, expanded, onToggle }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cx(
          'group flex w-full items-center gap-3 px-4 py-3.5 text-left transition duration-200 ease-out hover:translate-x-0.5 hover:bg-gradient-to-r hover:from-[#E7F9EF]/65 hover:to-white sm:px-5',
          FOCUS_RING,
        )}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#DFF8EB] to-[#BBF7D0] text-sm font-bold text-[#066B39] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_10px_rgba(8,145,75,0.14)]">
          {initials(customer.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-[#10213D]">{customer.name}</p>
          <p className="truncate text-xs text-[#667085]">
            {customer.phone || 'No phone'} {customer.email ? `· ${customer.email}` : ''}
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-[#EAF9EF] px-3 py-1.5 text-xs font-semibold text-[#067A3D] sm:inline-flex">
          {customer.totalBookings} booking{customer.totalBookings === 1 ? '' : 's'}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF9EF] text-[#067A3D] transition group-hover:bg-[#DFF8EB] group-hover:shadow-[0_2px_10px_rgba(6,122,61,0.18)]">
          <ChevronDown className={cx('h-4 w-4 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-dashed border-[#EAECF0] bg-[#F3FBF7] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap gap-2">
            {customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-bold text-[#344054] transition hover:border-[#15803D] hover:text-[#15803D]"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                Call Customer
              </a>
            ) : null}
            <Link
              href="/shop-home/services/book-service"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#16B45F] to-[#087A3E] px-3 py-1.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(8,122,62,0.28)] transition hover:brightness-105"
            >
              <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Create Booking
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Customer Information — same phone/email/address fields this
                panel has always shown ("Customer Profile"), just relabeled
                and restyled to match a reference design's card. */}
            <div className="rounded-2xl border border-[#E3ECE8] bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Icon3D icon={User} tone="green" size="sm" />
                <h3 className="text-sm font-bold text-[#10213D]">Customer Information</h3>
              </div>
              <div className="space-y-2.5 text-sm">
                <p className="flex items-center gap-2 text-[#344054]">
                  <User className="h-3.5 w-3.5 shrink-0 text-[#98A2B3]" aria-hidden="true" />
                  {customer.name}
                </p>
                <p className="flex items-center gap-2 text-[#344054]">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#98A2B3]" aria-hidden="true" />
                  {customer.phone || '—'}
                </p>
                <p className="flex items-center gap-2 text-[#344054]">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#98A2B3]" aria-hidden="true" />
                  {customer.email || '—'}
                </p>
                {customer.address ? (
                  <p className="flex items-start gap-2 text-[#344054]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#98A2B3]" aria-hidden="true" />
                    {customer.address}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#EEF3F0] pt-3">
                <div>
                  <p className="text-xs text-[#667085]">Total Spent</p>
                  <p className="text-sm font-bold text-[#10213D]">₹{customer.totalSpent.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-[#667085]">Pending Payments</p>
                  <p className="text-sm font-bold text-[#98A2B3]">— <span className="text-[0.65rem] font-normal">not tracked yet</span></p>
                </div>
              </div>
            </div>

            {/* Recent Bookings — same customer.history this panel has always
                shown ("Service History"), now with a device icon, status
                pill and a real link to that booking's detail page. */}
            <div className="rounded-2xl border border-[#E3ECE8] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Icon3D icon={Clock} tone="green" size="sm" />
                  <h3 className="text-sm font-bold text-[#10213D]">Recent Bookings ({customer.history.length})</h3>
                </span>
                <Link
                  href="/shop-home/services/bookings"
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#EAF9EF] px-2.5 py-1 text-xs font-bold text-[#067A3D] transition hover:bg-[#DFF8EB]"
                >
                  View all
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
              {customer.history.length === 0 ? (
                <p className="py-4 text-center text-xs text-[#98A2B3]">No bookings yet.</p>
              ) : (
                <div className="divide-y divide-[#EEF3F0]">
                  {customer.history.slice(0, 6).map((b) => (
                    <Link
                      key={b.id}
                      href={`/shop-home/services/bookings/view/?id=${encodeURIComponent(b.id)}`}
                      className="group/row flex items-center gap-2.5 py-2.5 transition hover:bg-[#F3FBF7]"
                    >
                      <Icon3D icon={Smartphone} tone="green" size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[#10213D]">#{b.bookingNumber || b.id}</p>
                        <p className="truncate text-[11px] text-[#667085]">{b.issueSummary || 'Service booking'}</p>
                      </div>
                      <span className="hidden shrink-0 text-[11px] text-[#98A2B3] sm:block">
                        {b.createdAt ? new Date(b.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''}
                      </span>
                      <span
                        className={cx(
                          'shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide',
                          STATUS_BADGE[b.statusLabel] || 'bg-[#F0FDF4] text-[#667085]',
                        )}
                      >
                        {b.statusLabel}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#98A2B3] transition group-hover/row:text-[#067A3D]" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
