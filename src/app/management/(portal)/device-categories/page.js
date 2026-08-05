'use client';

import { useEffect, useState } from 'react';
import { masterApi } from '@/lib/api';
import DataTable from '@/components/DataTable';
import ImageUpload from '@/components/ImageUpload';

export default function MasterDeviceCategoriesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await masterApi.get('/master/device-categories');
      setList(Array.isArray(data) ? data : data?.content ?? []);
    } catch (e) {
      setError(e.message || 'Failed to load');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setModal({ type: 'create' });
    setName('');
    setImageUrl('');
    setIsActive(true);
  };
  const openEdit = (item) => {
    setModal({ type: 'edit', item });
    setName(item.name || '');
    setImageUrl(item.imageUrl || '');
    setIsActive(item.isActive ?? true);
  };
  const closeModal = () => setModal(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      // Backend auto-derives `code` from name when not supplied.
      const body = {
        name: name.trim(),
        imageUrl: imageUrl.trim() || null,
        isActive,
      };
      if (modal.type === 'create') {
        await masterApi.post('/master/device-categories', body);
      } else {
        await masterApi.put(`/master/device-categories/${modal.item.id}`, body);
      }
      closeModal();
      load();
    } catch (e) {
      setError(e.body?.message || e.message || 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    if (!confirm('Delete this category?')) return;
    try {
      await masterApi.delete(`/master/device-categories/${row.id}`);
      load();
    } catch (e) {
      setError(e.body?.message || e.message || 'Delete failed');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    {
      key: 'imageUrl',
      label: 'Image',
      render: (r) =>
        r.imageUrl ? (
          <img src={r.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
        ) : (
          '—'
        ),
    },
    {
      key: 'isActive',
      label: 'Active',
      render: (r) => (r.isActive ? 'Yes' : 'No'),
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Categories</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-admin-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add category
        </button>
      </div>
      <p className="text-admin-muted text-sm mb-4">
        Top-level categories — Mobile, Laptop, Tablet, etc. (GET /api/master/categories).
      </p>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-admin-muted">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={list}
          onEdit={openEdit}
          onDelete={handleDelete}
          emptyMessage="No categories yet."
        />
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-admin-card border border-admin-border p-6">
            <h2 className="text-lg font-medium text-slate-900 mb-4">
              {modal.type === 'create' ? 'New category' : 'Edit category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-admin-muted mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                  placeholder="e.g. Mobile, Laptop, Tablet"
                  required
                />
              </div>
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                label="Category image"
                caption="Shown on the customer Home tile (Mobile, Laptop, etc.)"
                folder="categories"
                buttonText="Upload Category Image"
              />
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Active
              </label>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeModal} className="rounded-lg px-4 py-2 text-slate-600 hover:bg-admin-dark">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-admin-accent px-4 py-2 text-white disabled:opacity-50">
                  {submitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
