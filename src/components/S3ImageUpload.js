'use client';

import { useEffect, useMemo, useState } from 'react';

import { ACCEPTED_IMAGE_TYPES } from '@/lib/modelMedia';

/**
 * Picks an image file for an S3-backed upload.
 *
 * Deliberately different from ImageUpload, which uploads immediately and hands back
 * a URL — and, with Cloudinary unconfigured, silently fell back to inlining the whole
 * file as a base64 data URI into the row. That is what produced
 * "stored as: inline (data URI)" on the Edit category screen.
 *
 * The S3 endpoints are id-scoped, because the object key is derived from the record's
 * stored name. So this component does NOT upload: it only holds the chosen File and
 * shows a preview, and the form uploads after the record is saved and has an id.
 *
 * @param {string}   props.value         existing image URL, for the preview
 * @param {Function} props.onFileChange  called with the File, or null when cleared
 * @param {string}   props.label
 * @param {string}   props.caption
 */
export default function S3ImageUpload({ value, onFileChange, label, caption }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  // Object URLs are leaked unless revoked, and a long admin session can pick many
  // images; useMemo + the cleanup below keeps exactly one alive at a time.
  const localPreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);

  const preview = localPreview || value || null;
  const isInline = typeof value === 'string' && value.startsWith('data:');

  const pick = (event) => {
    const picked = event.target.files && event.target.files[0];
    setError('');
    if (!picked) {
      setFile(null);
      onFileChange(null);
      return;
    }
    // Mirrors the server's allow-list so an obviously wrong file is rejected before
    // a round trip. The server still validates by magic bytes — this is convenience,
    // not a security control, since any client can skip it.
    if (!ACCEPTED_IMAGE_TYPES.split(',').includes(picked.type)) {
      setError('Please choose a JPEG, PNG or WebP image.');
      setFile(null);
      onFileChange(null);
      return;
    }
    setFile(picked);
    onFileChange(picked);
  };

  const clear = () => {
    setFile(null);
    setError('');
    onFileChange(null);
  };

  return (
    <div className="rounded-xl border border-admin-border p-4">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      {caption ? <p className="mt-0.5 text-xs text-slate-500">{caption}</p> : null}

      <div className="mt-3 flex min-h-[140px] items-center justify-center rounded-lg border border-dashed border-admin-border bg-slate-50 p-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="max-h-32 object-contain" />
        ) : (
          <span className="text-xs text-slate-400">No image yet</span>
        )}
      </div>

      <label className="mt-3 block">
        <span className="sr-only">{label}</span>
        <input
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          onChange={pick}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-admin-panel file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:opacity-90"
        />
      </label>

      {file ? (
        <button type="button" onClick={clear} className="mt-2 text-xs font-semibold text-red-600">
          Clear selection
        </button>
      ) : null}

      {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}

      <p className="mt-2 text-[11px] text-slate-500">
        {file
          ? 'Will upload to media.ggfix.in when you save.'
          : isInline
            ? 'stored as: inline (data URI) — re-upload to move it to media.ggfix.in'
            : value
              ? 'stored on media.ggfix.in'
              : 'JPEG, PNG or WebP, up to 5 MB.'}
      </p>
    </div>
  );
}
