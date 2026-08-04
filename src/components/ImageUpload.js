'use client';

import { useRef, useState } from 'react';
import { MASTER_BASE } from '@/lib/api';

/**
 * Image upload card. Matches the "Avatar / Upload Avatar" pattern.
 *
 * Strategy: tries POST /media/upload (Cloudinary-backed) FIRST, and falls
 * back to a fully client-side FileReader -> base64 data URI if the backend
 * isn't reachable or returns any error. The fallback means the admin can
 * always save an image even before the master-data-service is rebuilt with
 * the /media endpoint live.
 *
 * Props:
 *  - value         current image URL (preview)
 *  - onChange(url) called with the uploaded image URL (cloudinary or base64)
 *  - label         card title  (default "Avatar")
 *  - caption       small caption (default "Profile image")
 *  - folder        Cloudinary folder override (e.g. "ggfix/categories")
 *  - buttonText    upload button label (default "Upload Image")
 *  - aspect        "square" | "wide"
 *  - maxMB         max file size (default 5)
 *  - clientOnly    skip the backend attempt and go straight to base64
 *  - allowBase64Fallback
 *                  when false, a failed backend upload surfaces the error
 *                  instead of quietly storing a data URI. Set this on any
 *                  screen whose column cannot hold a multi-MB string, or where
 *                  an inline image would be served to the mobile app on every
 *                  list fetch. Defaults true so existing callers are unchanged.
 */
export default function ImageUpload({
  value,
  onChange,
  label = 'Avatar',
  caption = 'Profile image',
  folder = '',
  buttonText = 'Upload Image',
  aspect = 'square',
  maxMB = 5,
  clientOnly = false,
  allowBase64Fallback = true,
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [source, setSource] = useState(''); // 'cloudinary' | 'base64' | ''

  const pick = () => fileRef.current?.click();

  // ---- Client-side base64 conversion (always works, no network) ----
  const readAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      reader.readAsDataURL(file);
    });

  // ---- Backend upload (Cloudinary-backed when configured) ----
  const uploadToBackend = (file) =>
    new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', file);
      if (folder) fd.append('folder', folder);
      const url = `${MASTER_BASE().replace(/\/$/, '')}/media/upload`;
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { reject(new Error('Bad response')); }
        } else {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('network'));
      xhr.send(fd);
    });

  const upload = async (file) => {
    if (!file) return;
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Image is larger than ${maxMB}MB.`);
      return;
    }
    setError('');
    setUploading(true);
    setProgress(0);
    try {
      // 1) Try backend so we get a Cloudinary URL when the service is up.
      if (!clientOnly) {
        let failure = null;
        try {
          const r = await uploadToBackend(file);
          if (r?.url) {
            onChange?.(r.url);
            setSource(r.source || 'backend');
            return;
          }
          failure = new Error('Upload returned no URL');
        } catch (e) {
          failure = e;
        }
        if (!allowBase64Fallback) {
          // Callers that opt out would rather see the upload fail than end up
          // holding a data URI they cannot persist.
          setError(
            `${failure.message}. Image hosting must be reachable — check /media/ping on master-data-service.`
          );
          return;
        }
        // Otherwise fall through to client-side base64.
      }
      // 2) Client-side base64 fallback — always succeeds.
      setProgress(0);
      const dataUrl = await readAsDataUrl(file);
      onChange?.(dataUrl);
      setSource('base64');
    } catch (e) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
  };
  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  const previewHeight = aspect === 'wide' ? 'h-32' : 'h-36';

  return (
    <div className="rounded-xl border border-admin-border bg-admin-card p-4">
      <div className="mb-2">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {caption ? <p className="text-xs text-admin-muted">{caption}</p> : null}
      </div>

      <button
        type="button"
        onClick={pick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`w-full ${previewHeight} rounded-lg border-2 border-dashed border-admin-border bg-admin-dark flex items-center justify-center overflow-hidden hover:border-admin-accent transition-colors`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="preview" className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center justify-center text-admin-muted">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-5-5L5 21" />
              <path d="M16 5h4M18 3v4" />
            </svg>
            <span className="mt-2 text-xs">Click or drop image here</span>
          </div>
        )}
      </button>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {uploading ? (
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-admin-dark overflow-hidden">
            <div className="h-full bg-admin-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-admin-muted mt-1">Processing… {progress}%</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          className="mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          style={{ backgroundColor: '#00008B' }}
        >
          {value ? 'Replace image' : buttonText}
        </button>
      )}

      {value ? (
        <button
          type="button"
          onClick={() => { onChange?.(''); setSource(''); }}
          className="mt-2 w-full text-xs text-red-600 hover:text-red-500"
        >
          Remove image
        </button>
      ) : null}

      {source ? (
        <p className="mt-2 text-[10px] text-admin-muted">
          stored as: {source === 'base64' ? 'inline (data URI)' : source}
        </p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
