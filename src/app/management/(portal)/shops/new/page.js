'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { required, validateForm } from '@/lib/formValidation';
import { focusField, registerField } from '@/lib/formFocus';

export default function NewShopPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const fieldRefs = useRef({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors, firstErrorField, isValid } = validateForm(
      {
        name: required('Shop name is required.'),
        slug: required('Slug is required.'),
      },
      { name, slug },
    );
    if (!isValid) {
      setFieldErrors(errors);
      focusField(fieldRefs, firstErrorField);
      return;
    }
    setFieldErrors({});
    setError('');
    setSubmitting(true);
    try {
      await authApi.post('/auth/shops', {
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
        address: address.trim() || undefined,
      });
      router.push('/management/shops');
    } catch (e) {
      setError(e.body?.message || e.message || 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/management/shops" className="text-admin-muted hover:text-slate-900 text-sm">
          ← Shops
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Create shop</h1>
      </div>
      <div className="max-w-lg rounded-xl border border-admin-border bg-admin-card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div ref={registerField(fieldRefs, 'name')}>
            <label className="block text-sm text-admin-muted mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.name)}
              className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
              required
            />
            {fieldErrors.name ? <p className="mt-1.5 text-xs text-red-600">{fieldErrors.name}</p> : null}
          </div>
          <div ref={registerField(fieldRefs, 'slug')}>
            <label className="block text-sm text-admin-muted mb-1">Slug (unique URL id)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                if (fieldErrors.slug) setFieldErrors((prev) => ({ ...prev, slug: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.slug)}
              placeholder="e.g. my-repair-shop"
              className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
              required
            />
            {fieldErrors.slug ? <p className="mt-1.5 text-xs text-red-600">{fieldErrors.slug}</p> : null}
          </div>
          <div>
            <label className="block text-sm text-admin-muted mb-1">Address (optional)</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Link
              href="/management/shops"
              className="rounded-lg px-4 py-2 text-slate-600 hover:bg-admin-dark"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-admin-accent px-4 py-2 text-white disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create shop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
