import Link from 'next/link';

import { cx } from '@/components/site/ui';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

export default function QuickAction({ icon: Icon, label, href }) {
  return (
    <Link
      href={href}
      className={cx(
        'group flex items-center gap-3 rounded-xl border border-[#EAECF0] bg-white px-3.5 py-3 text-sm font-semibold text-[#101828] transition',
        'hover:border-brand-300 hover:bg-[#F0FDF4]',
        FOCUS_RING,
      )}
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#15803D] transition group-hover:scale-105">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
