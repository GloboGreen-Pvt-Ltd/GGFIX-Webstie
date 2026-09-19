'use client';

import { CheckCircle2, Eye, MapPin, Pencil, Phone, Store, Trash2 } from 'lucide-react';

import { cx } from '@/components/site/ui';
import SafeImage from '@/components/SafeImage';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D] focus-visible:ring-offset-2';

function DocDot({ ok, label }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', ok ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F2F4F7] text-[#98A2B3]')}>
      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

export default function BusinessLocationCard({ location, isMain, onView, onEdit, onDelete }) {
  const addr = [location.area, location.district, location.state].filter(Boolean).join(', ') || location.address || 'Address not added yet';
  const progress = location.progressPercent ?? 0;
  const progressColor = progress >= 100 ? 'bg-[#15803D]' : progress >= 60 ? 'bg-amber-500' : 'bg-red-400';
  // Shop front photo is the recognisable "what does this place look like"
  // shot, so it's what the card header shows; banner/visiting-card is the
  // fallback when only that was uploaded.
  const headerImageUrl = location.frontImageUrl || location.bannerImageUrl;

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-[#EAECF0] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.08)] transition hover:shadow-[0_4px_16px_rgba(16,24,40,0.10)]">
      <div className="relative h-28 w-full bg-gradient-to-br from-[#DCFCE7] via-[#F0FDF4] to-white">
        {headerImageUrl ? (
          <SafeImage
            src={headerImageUrl}
            alt={`${location.name} shop front`}
            className="h-full w-full object-cover"
            placeholderClassName="flex h-full w-full items-center justify-center"
            fallback={<span className="flex h-full w-full items-center justify-center"><Store className="h-8 w-8 text-[#86EFAC]" aria-hidden="true" /></span>}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Store className="h-8 w-8 text-[#86EFAC]" aria-hidden="true" />
          </span>
        )}
        {isMain ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#15803D] shadow-sm">
            Main Location
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-[#101828]">{location.name || 'Untitled location'}</p>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-[#667085]">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {addr}
          </p>
          {location.mobile ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#667085]">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {location.mobile}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <DocDot ok={!!location.frontImageUrl} label="Front" />
          <DocDot ok={!!location.bannerImageUrl} label="Banner" />
          <DocDot ok={!!location.gstCertificateUrl} label="GST" />
          <DocDot ok={!!location.udyamCertificateUrl} label="Udyam" />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-[#475467]">Profile completeness</span>
            <span className="font-bold text-[#101828]">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F2F4F7]">
            <div className={cx('h-full rounded-full transition-all', progressColor)} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onView}
            className={cx('inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#D0D5DD] bg-white px-3 py-2 text-xs font-semibold text-[#344054] transition hover:bg-[#F9FAFB]', FOCUS_RING)}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            View
          </button>
          <button
            type="button"
            onClick={onEdit}
            className={cx('inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#15803D] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#166534]', FOCUS_RING)}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${location.name || 'location'}`}
            className={cx('inline-flex shrink-0 items-center justify-center rounded-xl border border-[#D0D5DD] bg-white p-2 text-[#98A2B3] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600', FOCUS_RING)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
