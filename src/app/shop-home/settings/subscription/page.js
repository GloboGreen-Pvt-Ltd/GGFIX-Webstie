'use client';

/**
 * /shop-home/settings/subscription — plan cards + multi-shop price
 * calculator, rebuilt to match a reference mobile screenshot closely (its
 * own page-local header, exact badge/icon treatment) rather than this
 * dashboard's usual PageHeader + responsive-grid layout — a deliberate,
 * scoped exception per explicit request; every other page in this
 * dashboard is untouched. Below `lg`, it's still the original single
 * stacked column capped to a phone-width max-w-md, matching that mobile
 * reference exactly. At `lg` and up (2026-09, per a later request "not one
 * long vertical stack on desktop"), the page widens to a ~1320px container
 * and splits into two columns — Current Plan on the left, Available Plans
 * (Free Trial + Basic side by side) and the Multiple Shops calculator on
 * the right — same components, same data, just a wider grid instead of one
 * flex column.
 *
 * Real data: GET {AUTH_BASE}/auth/me (fetchMyProfile, for the owner id) +
 * GET {SUBSCRIPTION_BASE}/subscriptions/owner/{ownerId} (fetchMySubscription)
 * + GET {SUBSCRIPTION_BASE}/subscriptions/plans (fetchSubscriptionPlans) —
 * the exact same three calls Account Settings' own Subscription tab
 * already uses (src/app/shop-home/account/settings/page.js's
 * SubscriptionTab). Every plan's price and shop/employee limits come
 * straight from `plan.price`/`plan.shopLimit`/`plan.employeeLimit` — the
 * same fields the admin portal's own Plans tab renders
 * (src/app/management/(portal)/subscriptions/page.js's PlanCard).
 *
 * The multi-shop formula (1 shop = the Basic plan's own price; 2+ shops =
 * shop count × ₹2,500) mirrors the admin portal's own hardcoded
 * PricingTable exactly (same file, `multiShopRows()`) — a real, existing
 * business rule in this codebase, not a new one made up for this page.
 *
 * The Basic card's light-green/dark-green highlight and "Popular" badge
 * are tied to it being the featured plan, not to whether the signed-in
 * shop's real subscription happens to BE Basic — that's shown separately
 * and honestly via the "Current" badge, computed from the real
 * subscription record.
 *
 * FREE_TRIAL_FEATURES/BASIC_FEATURES are an exact-wording fallback for
 * the two plans' checklists, matching agreed copy byte-for-byte — real
 * `plan.features` from the API is still preferred and rendered as-is when
 * present; these only fill in if that array comes back empty.
 *
 * There is no purchase/checkout endpoint anywhere in this client — the
 * existing Subscription tab's only "upgrade" action is a `mailto:` link,
 * so this page's "Request Upgrade" does the same rather than pretending
 * to be a working checkout button.
 *
 * 2026-09: added a "Current Plan" detail card above Available Plans, per a
 * reference design. Every row is real: Plan/Status/Started on/Valid till/
 * Days remaining/Amount come straight off the subscription record
 * (activeDate/inactiveDate/daysRemaining/priceAmount — the same fields the
 * admin portal's own Subscriptions table lists,
 * src/app/management/(portal)/subscriptions/page.js's subColumns). "Shops
 * covered" is the subscription's real shopCount against the matched plan's
 * real shopLimit. "Pickup service" is the plan's real pickupServiceEnabled
 * flag. "Employees" is a real headcount via fetchTechnicians() (the same
 * call employee/team already uses) — the subscription record itself has no
 * employee-count field, only a limit. "Sell orders" has no backing
 * anywhere in this codebase (confirmed: no shop-scoped Buy/Sell order
 * count exists — see reports/sales-report's own header comment for the
 * same gap) — shown as "Not tracked" rather than a fabricated number.
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, CreditCard, Crown, Gift, Loader2, Minus, Plus, Store } from 'lucide-react';

import { cx } from '@/components/site/ui';
import PageHeader from '@/components/shop-dashboard/PageHeader';
import { fetchMyProfile } from '@/lib/shopProfile';
import { fetchMySubscription, fetchSubscriptionPlans } from '@/lib/shopSubscription';
import { fetchTechnicians } from '@/lib/shopDashboard';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D] focus-visible:ring-offset-2';
const MULTI_SHOP_UNIT_PRICE = 2500;

const FREE_TRIAL_FEATURES = [
  'New Service Booking',
  'Up to 2 Shops',
  'Buy Products — Unlimited',
  'Sell Products — up to 5 orders',
  'Up to 3 Employees per Shop',
  'Pickup Service',
];
const BASIC_FEATURES = [
  'New Service Booking',
  'Pickup Service',
  'Buy Products — Unlimited',
  'Sell Products — Unlimited',
  'Unlimited Employees',
  'Multiple Shops',
];

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function planPrice(plan) {
  if (!plan) return '—';
  if (plan.code === 'FREE_TRIAL') {
    const days = plan.durationDays || 15;
    return `Free · ${days} days`;
  }
  if (plan.price != null) return `₹${Number(plan.price).toLocaleString('en-IN')} / year`;
  return '—';
}

function PlanCard({ plan, current, popular, highlighted }) {
  const Icon = plan.code === 'BASIC' ? Crown : Gift;
  const fallback = plan.code === 'FREE_TRIAL' ? FREE_TRIAL_FEATURES : plan.code === 'BASIC' ? BASIC_FEATURES : [];
  const features = Array.isArray(plan.features) && plan.features.length > 0 ? plan.features : fallback;

  return (
    <div
      className={cx(
        'w-full rounded-[28px] p-5',
        highlighted
          ? 'border-2 border-[#15803D] bg-[#F8F8F8]'
          : 'border border-[#ECECEC] bg-white',
      )}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={cx(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
            highlighted ? 'bg-[#F3F3F3] text-[#15803D]' : 'bg-[#FEF3C7] text-[#B45309]',
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[1.05rem] font-extrabold text-[#111111]">{plan.name || plan.code}</p>
            {popular ? (
              <span className="rounded-full bg-[#14532D] px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-white">Popular</span>
            ) : null}
            {current ? (
              <span className="rounded-full bg-[#F3F3F3] px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-[#666666]">Current</span>
            ) : null}
          </div>
          <p className="mt-1 text-[0.95rem] font-bold text-[#15803D]">{planPrice(plan)}</p>
          {plan.code === 'BASIC' ? <p className="mt-0.5 text-xs text-[#98A2B3]">₹{MULTI_SHOP_UNIT_PRICE.toLocaleString('en-IN')}/shop for 2+ shops</p> : null}
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-[0.9rem] text-[#111111]">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F3F3F3] text-[#15803D]">
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetailRow({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <p className="text-sm text-[#666666]">{label}</p>
      <p className={cx('text-sm font-bold', tone === 'green' ? 'text-[#15803D]' : 'text-[#111111]')}>{value}</p>
    </div>
  );
}

function CurrentPlanCard({ sub, plan, planLabel, daysRemaining, employeeCount, employeeCountLoading }) {
  const statusLabel = (sub.status || (daysRemaining > 0 ? 'ACTIVE' : '—')).toString().toUpperCase();
  const amount = sub.priceAmount ?? plan?.price;

  const rows = [
    { label: 'Plan', value: planLabel },
    { label: 'Status', value: statusLabel, tone: 'green' },
    { label: 'Started on', value: formatDate(sub.activeDate) || '—' },
    { label: 'Valid till', value: formatDate(sub.inactiveDate) || '—' },
    { label: 'Days remaining', value: daysRemaining > 0 ? `${daysRemaining} days` : '—' },
    { label: 'Shops covered', value: sub.shopCount != null ? `${sub.shopCount} of ${plan?.shopLimit ?? 'Unlimited'}` : '—' },
    { label: 'Employees', value: employeeCountLoading ? '…' : employeeCount },
    { label: 'Sell orders', value: 'Not tracked' },
    { label: 'Pickup service', value: plan?.pickupServiceEnabled ? 'Enabled' : 'Disabled' },
    { label: 'Amount', value: amount != null ? `₹${Number(amount).toLocaleString('en-IN')}` : '—' },
  ];

  return (
    <div className="w-full rounded-[28px] border border-[#ECECEC] bg-[#F8F8F8] p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3F3F3] text-[#15803D]">
          <Crown className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#666666]">Current Plan</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <p className="text-lg font-extrabold text-[#111111]">{planLabel}</p>
            <span className="rounded-full bg-[#F3F3F3] px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-[#15803D]">{statusLabel}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#F8F8F8] px-4 py-3.5">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#15803D]">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {sub.inactiveDate ? `Active until ${formatDate(sub.inactiveDate)}` : 'Active'}
          </span>
        </span>
        <span className="shrink-0 text-base font-extrabold text-[#111111]">
          {amount != null ? `₹${Number(amount).toLocaleString('en-IN')}` : '—'}
        </span>
      </div>

      <div className="my-4 border-t border-[#ECECEC]" />

      <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#666666]">Plan Details</p>
      <div className="divide-y divide-[#ECECEC]">
        {rows.map((r) => (
          <DetailRow key={r.label} label={r.label} value={r.value} tone={r.tone} />
        ))}
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const [profile, setProfile] = useState(null);
  const [sub, setSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shopCount, setShopCount] = useState(1);
  const [technicianCount, setTechnicianCount] = useState(0);
  const [technicianCountLoading, setTechnicianCountLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchMyProfile()
      .then((p) => alive && setProfile(p))
      .catch((err) => alive && setError(err.message || 'Could not load your account.'));
    return () => {
      alive = false;
    };
  }, []);

  const ownerId = profile?.id;

  useEffect(() => {
    let alive = true;
    fetchTechnicians()
      .then((rows) => alive && setTechnicianCount(Array.isArray(rows) ? rows.length : 0))
      .catch(() => {})
      .finally(() => alive && setTechnicianCountLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ownerId) return undefined;
    let alive = true;
    Promise.allSettled([fetchMySubscription(ownerId), fetchSubscriptionPlans()]).then(([subRes, plansRes]) => {
      if (!alive) return;
      if (subRes.status === 'fulfilled') setSub(subRes.value);
      else setError((e) => e || 'Could not load your subscription right now.');
      if (plansRes.status === 'fulfilled') setPlans(Array.isArray(plansRes.value) ? plansRes.value : []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [ownerId]);

  const isTrial = sub?.subscriptionType === 'TRIAL' || sub?.status === 'TRIAL' || sub?.planCode === 'FREE_TRIAL';
  const currentPlanCode = isTrial ? 'FREE_TRIAL' : sub?.planCode;
  const daysRemaining = sub?.daysRemaining ?? 0;

  const trialPlan = plans.find((p) => p.code === 'FREE_TRIAL');
  const basicPlan = plans.find((p) => p.code === 'BASIC');

  const basicUnitPrice = Number(basicPlan?.price) || 3000;
  const totalPrice = useMemo(() => {
    if (shopCount <= 1) return basicUnitPrice;
    return shopCount * MULTI_SHOP_UNIT_PRICE;
  }, [shopCount, basicUnitPrice]);

  const decShops = () => setShopCount((n) => Math.max(1, n - 1));
  const incShops = () => setShopCount((n) => Math.min(20, n + 1));

  const upgradeHref = `mailto:support@ggfix.in?subject=${encodeURIComponent('Upgrade to BASIC plan')}&body=${encodeURIComponent(
    `Please upgrade my account to the Basic plan for ${shopCount} shop${shopCount === 1 ? '' : 's'} (₹${totalPrice.toLocaleString('en-IN')}/year).`,
  )}`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Subscription & Plan" subtitle="Your current plan, available plans and billing." />

      <div className="w-full">
        {error ? (
          <div role="alert" className="mb-6 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Mobile/tablet: single stacked column (unchanged). Desktop (lg+):
            Current Plan on the left, Available Plans + Multiple Shops on
            the right, both starting at the same top edge — per request,
            not one long vertical stack any more on wide screens. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(600px,1.6fr)] lg:items-start lg:gap-6">
          <div className="flex flex-col gap-6">
            {loading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-[#666666]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your subscription…
              </div>
            ) : sub ? (
              <CurrentPlanCard
                sub={sub}
                plan={plans.find((p) => p.code === currentPlanCode)}
                planLabel={isTrial ? 'Free Trial' : plans.find((p) => p.code === sub.planCode)?.name || sub.planCode || 'No active plan'}
                daysRemaining={daysRemaining}
                employeeCount={technicianCount}
                employeeCountLoading={technicianCountLoading}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-[#ECECEC] bg-[#F8F8F8] px-4 py-5 text-center text-sm text-[#666666]">
                No subscription record found for this account yet.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.08em] text-[#666666]">Available Plans</p>
              {loading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-[#666666]">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading plans…
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {trialPlan ? <PlanCard plan={trialPlan} current={currentPlanCode === 'FREE_TRIAL'} /> : null}
                  {basicPlan ? <PlanCard plan={basicPlan} current={currentPlanCode === 'BASIC'} popular highlighted /> : null}
                </div>
              )}
            </div>

            {basicPlan ? (
              <div>
                <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.08em] text-[#666666]">Basic · Multiple Shops</p>
                <div className="w-full rounded-[28px] border border-[#ECECEC] bg-[#F8F8F8] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F8F8F8] text-[#15803D]">
                        <Store className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <p className="text-sm font-bold text-[#111111]">How many shops?</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={decShops}
                        disabled={shopCount <= 1}
                        aria-label="Fewer shops"
                        className={cx(
                          'flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F3F3] text-[#111111] transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-40',
                          FOCUS_RING,
                        )}
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="w-6 text-center text-lg font-extrabold text-[#111111]">{shopCount}</span>
                      <button
                        type="button"
                        onClick={incShops}
                        aria-label="More shops"
                        className={cx('flex h-9 w-9 items-center justify-center rounded-full bg-[#F8F8F8] text-[#15803D] transition hover:bg-[#F3F3F3]', FOCUS_RING)}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#F8F8F8] px-4 py-3.5">
                    <p className="text-sm font-bold text-[#111111]">{shopCount}× Basic subscription</p>
                    <p className="text-lg font-extrabold text-[#111111]">₹{totalPrice.toLocaleString('en-IN')}</p>
                  </div>
                  <p className="mt-2.5 text-xs text-[#98A2B3]">
                    1 shop = ₹{basicUnitPrice.toLocaleString('en-IN')} · 2 or more = ₹{MULTI_SHOP_UNIT_PRICE.toLocaleString('en-IN')} per shop / year.
                  </p>

                  <a
                    href={upgradeHref}
                    className={cx(
                      'mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#F3BF23] px-4 py-3 text-sm font-bold text-[#1E1E1E] transition hover:bg-[#E5B11A]',
                      FOCUS_RING,
                    )}
                  >
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    Request Upgrade
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
