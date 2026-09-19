import Link from 'next/link';
import { ArrowUpRight, TrendingUp } from 'lucide-react';

import { cx } from '@/components/site/ui';

const TONE = {
  green: 'bg-[#DCFCE7] text-[#15803D]',
  blue: 'bg-sky-100 text-sky-600',
  orange: 'bg-orange-100 text-orange-600',
  violet: 'bg-violet-100 text-violet-600',
  teal: 'bg-teal-100 text-teal-600',
  red: 'bg-red-100 text-[#DC2626]',
};

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

/**
 * StatCard — a single KPI tile. `trend`, if given, is rendered as-is (e.g.
 * "+12% from yesterday") — purely presentational text supplied by the
 * caller, never computed here, so this component never invents a number.
 *
 * `featured` gives one card the deep-green filled treatment so the row has
 * a clear visual anchor instead of six equally-weighted tiles. `href`, when
 * given, makes the whole card a real link (to an existing sidebar route —
 * see shop-home/page.js) rather than a decorative arrow that goes nowhere.
 */
export default function StatCard({ icon: Icon, label, value, trend, tone = 'green', featured = false, href }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={cx(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            featured ? 'bg-white/15 text-white' : TONE[tone] || TONE.green,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {href ? (
          <span
            className={cx(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition',
              featured ? 'bg-white/15 text-white group-hover:bg-white/25' : 'bg-[#F9FAFB] text-[#98A2B3] group-hover:bg-[#F0FDF4] group-hover:text-[#15803D]',
            )}
          >
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>

      <p className={cx('mt-4 text-[26px] font-bold leading-none tracking-tight sm:text-[28px]', featured ? 'text-white' : 'text-[#101828]')}>
        {value}
      </p>
      <p className={cx('mt-1.5 text-sm font-medium', featured ? 'text-white/75' : 'text-[#667085]')}>{label}</p>

      {trend ? (
        <p className={cx('mt-2.5 flex items-center gap-1 text-xs font-semibold', featured ? 'text-white/90' : 'text-[#15803D]')}>
          <TrendingUp className="h-3 w-3 shrink-0" aria-hidden="true" />
          {trend}
        </p>
      ) : null}
    </>
  );

  const className = cx(
    'group block rounded-3xl p-5 transition',
    featured
      ? 'bg-gradient-to-br from-[#166534] to-[#14532D] shadow-[0_4px_16px_rgba(20,83,45,0.25)]'
      : 'border border-[#EAECF0] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.08)]',
    href && !featured && 'hover:border-brand-300 hover:shadow-[0_4px_16px_rgba(16,24,40,0.08)]',
    href && FOCUS_RING,
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
