'use client';

/**
 * Shared chrome for the Sell a Device steps (src/app/shop-home/sell/*):
 * SellStepHeader — back arrow · centered title · search icon that expands a
 * client-side filter field; SellTile — the equal-size logo/photo card.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, X } from 'lucide-react';

import { cx } from '@/components/site/ui';

export function SellStepHeader({ title, subtitle, query, onQueryChange, searchPlaceholder = 'Search' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function toggleSearch() {
    if (open) onQueryChange('');
    setOpen((v) => !v);
  }

  return (
    <div className="border-b border-[#ECECEC] bg-white">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#111111] transition hover:bg-[#F3F3F3] hover:text-[#079455]"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-[20px] font-extrabold tracking-tight text-[#111111]">{title}</h1>
          {subtitle ? <p className="truncate text-[12.5px] text-[#666666]">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={toggleSearch}
          aria-label={open ? 'Close search' : 'Search'}
          aria-expanded={open}
          className={cx(
            'inline-flex h-10 w-10 items-center justify-center rounded-full transition',
            open ? 'bg-[#F3F3F3] text-[#079455]' : 'text-[#111111] hover:bg-[#F3F3F3] hover:text-[#079455]',
          )}
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Search className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
      {open ? (
        <div className="px-4 pb-3.5 sm:px-6">
          <div className="mx-auto flex max-w-xl items-center gap-2 rounded-xl border border-[#ECECEC] bg-[#F8F8F8] px-3.5 py-2.5 focus-within:border-[#079455] focus-within:bg-white">
            <Search className="h-4 w-4 shrink-0 text-[#98A2B3]" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && toggleSearch()}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-[#111111] outline-none placeholder:text-[#98A2B3]"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Equal-size card: centered logo/photo (object-contain) over a centered name. */
export function SellTile({ href, imageUrl, name, fallbackIcon: Fallback, imageClassName = 'h-14', onClick, title }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [imageUrl]);
  const inner = (
    <>
      <span className={cx('flex w-full items-center justify-center', imageClassName)}>
        {imageUrl && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote master-data logo/photo, not an app asset Next can optimize.
          <img src={imageUrl} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-contain object-center" />
        ) : Fallback ? (
          <Fallback className="h-8 w-8 text-[#079455]/60" aria-hidden="true" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F3F3] text-[18px] font-extrabold text-[#079455]">
            {String(name || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <span className="mt-2.5 line-clamp-2 w-full text-center text-[13px] font-semibold leading-snug text-[#111111]">{name}</span>
    </>
  );
  const cls =
    'group flex h-full flex-col items-center rounded-[18px] border border-[#ECECEC] bg-[#F8F8F8] p-3.5 transition';
  if (href) {
    return (
      <Link href={href} title={title} className={cx(cls, 'hover:-translate-y-0.5 hover:border-[#ECECEC]')}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} title={title} className={cx(cls, 'text-left hover:border-[#ECECEC]')}>
      {inner}
    </button>
  );
}
