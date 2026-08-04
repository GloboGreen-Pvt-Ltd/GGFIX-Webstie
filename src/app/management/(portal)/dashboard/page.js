'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Store, CheckCircle2, XCircle, Tag, Briefcase, Boxes } from 'lucide-react';
import { masterApi, authApi } from '@/lib/api';
import { mapPool } from '@/lib/concurrency';
import PageHeader from '@/components/PageHeader';

const asArray = (d) => (Array.isArray(d) ? d : d?.content ?? []);

function StatCard({ title, value, href, icon: Icon, iconBg, iconText, action }) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-card p-5 shadow-sm transition-all hover:border-admin-accent/50 hover:shadow-md">
      <div className="flex items-center gap-3">
        <Link href={href} className="flex flex-1 items-center gap-3 min-w-0">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconText}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-admin-muted">{title}</p>
            <p className="text-2xl font-semibold text-slate-900">{value}</p>
          </div>
        </Link>
        {action}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    shopsTotal: 0,
    shopsActive: 0,
    shopsInactive: 0,
    categories: 0,
    brands: 0,
    models: null, // null = not counted yet; see countModels below
    error: null,
  });
  const [countingModels, setCountingModels] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const [shopsR, catsR, brandsR] = await Promise.allSettled([
          authApi.get('/auth/shops'), // has isActive/status (shop-service /shops does not)
          masterApi.get('/master/device-categories'),
          masterApi.get('/master/brands'),
        ]);

        const shops = shopsR.status === 'fulfilled' ? asArray(shopsR.value) : [];
        const cats = catsR.status === 'fulfilled' ? asArray(catsR.value) : [];
        const brands = brandsR.status === 'fulfilled' ? asArray(brandsR.value) : [];

        const total = shops.length;
        const active = shops.filter(
          (s) => s.isActive === true || s.active === true || s.status === 'ACTIVE'
        ).length;

        setStats((s) => ({
          ...s,
          shopsTotal: total,
          shopsActive: active,
          shopsInactive: total - active,
          categories: cats.length,
          brands: brands.length,
          error: null,
        }));
      } catch (e) {
        setStats((s) => ({ ...s, error: e.message }));
      }
    };
    run();
  }, []);

  // master-data has no count endpoint for models, so a total means pulling every
  // brand's FULL model list. That used to run eagerly here as a Promise.all over
  // all ~55 brands — ~54 MB of JSON fired at once, which exhausted the service's
  // 384 MB heap and took it down on every dashboard visit. It is opt-in now, and
  // walks a few brands at a time. It gets cheap again once the base64 image_url
  // rows are backfilled to Cloudinary URLs.
  const countModels = async () => {
    setCountingModels(true);
    try {
      const brands = asArray(await masterApi.get('/master/brands'));
      let total = 0;
      await mapPool(brands, 3, async (b) => {
        const id = b.id ?? b.brandId;
        if (!id) return;
        const rows = await masterApi.get(`/master/brands/${id}/models`).catch(() => null);
        if (rows) total += asArray(rows).length;
      });
      setStats((s) => ({ ...s, models: total }));
    } catch (e) {
      setStats((s) => ({ ...s, error: e.message }));
    } finally {
      setCountingModels(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <PageHeader breadcrumb={['Dashboard']} title="Dashboard" subtitle="Overview of your platform." />

      {stats.error && (
        <p className="mb-4 text-sm text-red-600">
          Some data could not be loaded. Check backend URLs in .env.local. {stats.error}
        </p>
      )}

      {/* Shops */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-admin-muted">Shops</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Shops" value={stats.shopsTotal} href="/management/shops" icon={Store} iconBg="bg-sky-100" iconText="text-sky-600" />
          <StatCard title="Active Shops" value={stats.shopsActive} href="/management/shops" icon={CheckCircle2} iconBg="bg-emerald-100" iconText="text-emerald-600" />
          <StatCard title="Inactive Shops" value={stats.shopsInactive} href="/management/shops" icon={XCircle} iconBg="bg-rose-100" iconText="text-rose-600" />
        </div>
      </section>

      {/* Master Data */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-admin-muted">Master Data</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Categories" value={stats.categories} href="/management/device-categories" icon={Tag} iconBg="bg-violet-100" iconText="text-violet-600" />
          <StatCard title="Brands" value={stats.brands} href="/management/brands" icon={Briefcase} iconBg="bg-amber-100" iconText="text-amber-600" />
          <StatCard
            title="Models"
            value={stats.models ?? '—'}
            href="/management/models"
            icon={Boxes}
            iconBg="bg-indigo-100"
            iconText="text-indigo-600"
            action={stats.models === null ? (
              <button
                type="button"
                onClick={countModels}
                disabled={countingModels}
                title="Counting models downloads every brand's model list — run it only when you need the number."
                className="shrink-0 rounded-lg border border-admin-border px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-admin-dark disabled:opacity-50"
              >
                {countingModels ? 'Counting…' : 'Count'}
              </button>
            ) : null}
          />
        </div>
      </section>
    </div>
  );
}
