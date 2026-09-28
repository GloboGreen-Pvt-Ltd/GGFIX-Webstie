/**
 * PageHeader — the title/subtitle/action row shared by ~15+ pages. The
 * blurred light-green shape behind the title is the same soft-3D decoration
 * technique the Dashboard's own greeting hero uses (shop-home/page.js) —
 * added here once so every page using PageHeader picks it up automatically.
 * No prop changed, so no call site needs an edit.
 */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="relative flex flex-wrap items-start justify-between gap-4">
      <span className="pointer-events-none absolute -left-6 -top-10 h-28 w-28 rounded-full bg-[#DCFCE7]/50 blur-2xl" aria-hidden="true" />
      <div className="relative min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-[#101828] sm:text-[28px]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[#667085]">{subtitle}</p> : null}
      </div>
      {action ? <div className="relative shrink-0">{action}</div> : null}
    </div>
  );
}
