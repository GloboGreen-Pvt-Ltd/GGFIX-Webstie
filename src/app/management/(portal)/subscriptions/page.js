'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Crown, Gift, Zap, Check, Store } from 'lucide-react';
import { subscriptionApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import PageHeader, { Button } from '@/components/PageHeader';

const TABS = [
  { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { key: 'plans', label: 'Plans', icon: Crown },
  { key: 'payments', label: 'Payments', icon: Zap },
];

const asList = (d) => (Array.isArray(d) ? d : d?.content ?? d ?? []);
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : '—');
const shortId = (v) => (v ? String(v).slice(0, 8) : '—');
const money = (v) => (v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—');

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  const green = s === 'ACTIVE' || s === 'FREE_TRIAL';
  const red = s === 'EXPIRED' || s === 'CANCELLED';
  const cls = green
    ? 'bg-emerald-100 text-emerald-700'
    : red
      ? 'bg-red-100 text-red-600'
      : 'bg-slate-100 text-slate-500';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status || '—'}
    </span>
  );
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tab, setTab] = useState('subscriptions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [subs, plansRes, payRes] = await Promise.allSettled([
        subscriptionApi.get('/subscriptions'),
        subscriptionApi.get('/subscriptions/plans'),
        subscriptionApi.get('/subscriptions/payments'),
      ]);
      if (subs.status === 'fulfilled') setSubscriptions(asList(subs.value));
      if (plansRes.status === 'fulfilled') setPlans(asList(plansRes.value));
      if (payRes.status === 'fulfilled') setPayments(asList(payRes.value));
      const firstErr = [subs, plansRes, payRes].find((r) => r.status === 'rejected');
      if (firstErr) {
        setError(firstErr.reason?.body?.message || firstErr.reason?.message || 'Failed to load some data');
      }
    } catch (e) {
      setError(e.body?.message || e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const subColumns = [
    { key: 'ownerUserId', label: 'Owner', render: (r) => <span className="font-mono text-xs text-slate-600">{shortId(r.ownerUserId)}</span> },
    { key: 'shopId', label: 'Shop ID', render: (r) => <span className="font-mono text-xs text-slate-600">{shortId(r.shopId)}</span> },
    { key: 'subscriptionType', label: 'Type', render: (r) => r.subscriptionType || '—' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'activeDate', label: 'Active Date', render: (r) => fmtDate(r.activeDate) },
    { key: 'inactiveDate', label: 'Inactive Date', render: (r) => fmtDate(r.inactiveDate) },
    { key: 'daysRemaining', label: 'Days Left', render: (r) => (r.daysRemaining != null ? r.daysRemaining : '—') },
    { key: 'shopCount', label: 'Shops', render: (r) => (r.shopCount != null ? r.shopCount : '—') },
    { key: 'priceAmount', label: 'Amount', render: (r) => money(r.priceAmount) },
  ];

  const payColumns = [
    { key: 'id', label: 'Payment', render: (r) => <span className="font-mono text-xs text-slate-600">{shortId(r.id)}</span> },
    { key: 'ownerUserId', label: 'Owner', render: (r) => <span className="font-mono text-xs text-slate-600">{shortId(r.ownerUserId)}</span> },
    { key: 'amount', label: 'Amount', render: (r) => money(r.amount) },
    { key: 'status', label: 'Status', render: (r) => r.status || '—' },
    { key: 'paidAt', label: 'Paid', render: (r) => (r.paidAt ? new Date(r.paidAt).toLocaleString() : '—') },
  ];

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        breadcrumb={['Admin', 'Subscriptions']}
        title="Subscription Management"
        subtitle="Manage shop subscriptions, review plans and pricing, and activate the Basic plan for owners."
        actions={<Button variant="secondary" icon={CreditCard} onClick={load}>Refresh</Button>}
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-6 flex gap-2 border-b border-admin-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
                active ? 'text-admin-accent border-b-2 border-admin-accent' : 'text-admin-muted hover:text-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="rounded-xl border border-admin-border bg-admin-card p-10 text-center text-admin-muted shadow-sm">Loading…</div>
      ) : tab === 'subscriptions' ? (
        <DataTable columns={subColumns} rows={subscriptions} emptyMessage="No subscriptions yet." />
      ) : tab === 'plans' ? (
        <PlansTab plans={plans} onActivated={load} />
      ) : (
        <DataTable columns={payColumns} rows={payments} emptyMessage="No payments recorded." />
      )}
    </div>
  );
}

/* ------------------------------- Plans tab ------------------------------- */

function planPrice(plan) {
  if (!plan) return '—';
  if (plan.code === 'FREE_TRIAL') {
    const days = plan.durationDays || 15;
    return `Free · ${days} days`;
  }
  if (plan.code === 'BASIC') {
    return `₹${Number(plan.price ?? 3000).toLocaleString('en-IN')} / year`;
  }
  return plan.price != null ? money(plan.price) : '—';
}

function limitLabel(value, singular) {
  if (value == null) return `Unlimited ${singular}`;
  return `${value} ${singular}${value === 1 ? '' : 's'}`;
}

function PlanCard({ plan, highlight }) {
  const Icon = plan.code === 'BASIC' ? Crown : Gift;
  return (
    <div
      className={`flex flex-col rounded-xl border bg-admin-card p-6 shadow-sm ${
        highlight ? 'border-admin-accent ring-1 ring-admin-accent/20' : 'border-admin-border'
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${highlight ? 'bg-admin-accent/10 text-admin-accent' : 'bg-slate-100 text-slate-500'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{plan.name || plan.code}</h3>
          <p className="text-sm font-medium text-admin-accent">{planPrice(plan)}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs text-admin-muted">
        <span className="rounded-full bg-slate-100 px-2 py-0.5">{limitLabel(plan.shopLimit, 'shop')}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5">{limitLabel(plan.employeeLimit, 'employee')}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5">{limitLabel(plan.sellLimit, 'sell')}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5">
          Pickup {plan.pickupServiceEnabled ? 'enabled' : 'disabled'}
        </span>
      </div>

      <ul className="space-y-2">
        {(plan.features || []).map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Multi-shop pricing: 1 shop = ₹3,000; N >= 2 = N × ₹2,500. */
function multiShopRows() {
  const rows = [];
  for (let n = 1; n <= 5; n += 1) {
    if (n === 1) {
      rows.push({ shops: 1, calc: '₹3,000', total: 3000 });
    } else {
      rows.push({ shops: n, calc: `${n} × ₹2,500`, total: n * 2500 });
    }
  }
  return rows;
}

function PricingTable() {
  const rows = multiShopRows();
  return (
    <div className="rounded-xl border border-admin-border bg-admin-card shadow-sm overflow-hidden">
      <div className="border-b border-admin-border px-4 py-3">
        <h4 className="text-sm font-semibold text-slate-900">Basic — Multi-shop pricing</h4>
        <p className="text-xs text-admin-muted">Single shop ₹3,000/year. From two shops onward, ₹2,500 per shop.</p>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-admin-border text-xs uppercase tracking-wide text-admin-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Total Shops</th>
            <th className="px-4 py-3 font-semibold">Calculation</th>
            <th className="px-4 py-3 font-semibold text-right">Total Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-admin-border">
          {rows.map((r) => (
            <tr key={r.shops} className="hover:bg-slate-50/70">
              <td className="px-4 py-3 text-slate-700">{r.shops}</td>
              <td className="px-4 py-3 text-slate-600">{r.calc}</td>
              <td className="px-4 py-3 text-right font-medium text-slate-900">{money(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivateBasic({ onActivated }) {
  const [shopCount, setShopCount] = useState(1);
  const [ownerUserId, setOwnerUserId] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  // Live-preview total from the backend quote endpoint.
  useEffect(() => {
    const n = Number(shopCount);
    if (!n || n < 1) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    subscriptionApi
      .get(`/subscriptions/quote?shops=${n}`)
      .then((d) => {
        if (!cancelled) setQuote(d);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      })
      .finally(() => {
        if (!cancelled) setQuoting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shopCount]);

  const localTotal = useMemo(() => {
    const n = Number(shopCount);
    if (!n || n < 1) return null;
    return n === 1 ? 3000 : n * 2500;
  }, [shopCount]);

  const total = quote?.total ?? localTotal;

  const handleActivate = async () => {
    setErr('');
    setOk('');
    const n = Number(shopCount);
    if (!ownerUserId.trim()) {
      setErr('Enter an owner user ID.');
      return;
    }
    if (!n || n < 1) {
      setErr('Shop count must be at least 1.');
      return;
    }
    setSubmitting(true);
    try {
      await subscriptionApi.post('/subscriptions/activate', {
        ownerUserId: ownerUserId.trim(),
        shopCount: n,
      });
      setOk('Basic plan activated.');
      setOwnerUserId('');
      onActivated?.();
    } catch (e) {
      setErr(e.body?.message || e.message || 'Activation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-admin-border bg-admin-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5 text-admin-accent" />
        <h4 className="text-sm font-semibold text-slate-900">Activate Basic</h4>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-admin-muted">
            <span className="inline-flex items-center gap-1"><Store className="h-3.5 w-3.5" /> Shop count</span>
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={shopCount}
            onChange={(e) => setShopCount(e.target.value)}
            className="w-full rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-slate-900 focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-admin-muted">Owner user ID</label>
          <input
            type="text"
            value={ownerUserId}
            onChange={(e) => setOwnerUserId(e.target.value)}
            placeholder="ownerUserId (UUID)"
            className="w-full rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-700">
          <span className="text-admin-muted">Total: </span>
          <span className="text-lg font-semibold text-slate-900">
            {quoting ? '…' : total != null ? money(total) : '—'}
          </span>
          {quote?.discountApplied && (
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              discount applied
            </span>
          )}
        </div>
        <Button variant="primary" icon={Crown} onClick={handleActivate} disabled={submitting}>
          {submitting ? 'Activating…' : 'Activate'}
        </Button>
      </div>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      {ok && <p className="mt-3 text-sm text-emerald-600">{ok}</p>}
    </div>
  );
}

function PlansTab({ plans, onActivated }) {
  const freePlan = plans.find((p) => p.code === 'FREE_TRIAL');
  const basicPlan = plans.find((p) => p.code === 'BASIC');
  const otherPlans = plans.filter((p) => p.code !== 'FREE_TRIAL' && p.code !== 'BASIC');

  if (!plans.length) {
    return (
      <div className="rounded-xl border border-admin-border bg-admin-card p-10 text-center text-admin-muted shadow-sm">
        No plans defined.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {freePlan && <PlanCard plan={freePlan} />}
        {basicPlan && <PlanCard plan={basicPlan} highlight />}
        {otherPlans.map((p) => (
          <PlanCard key={p.code} plan={p} />
        ))}
      </div>

      <PricingTable />

      <ActivateBasic onActivated={onActivated} />
    </div>
  );
}
