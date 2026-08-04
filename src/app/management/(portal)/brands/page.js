'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { masterApi } from '@/lib/api';
import DataTable, { StatusPill } from '@/components/DataTable';
import PageHeader, { Button } from '@/components/PageHeader';
import ImageUpload from '@/components/ImageUpload';

export default function MasterBrandsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { type: 'create' | 'edit', item?: {} }
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await masterApi.get('/master/brands');
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
  };
  const openEdit = (item) => {
    setModal({ type: 'edit', item });
    setName(item.name || '');
    setImageUrl(item.imageUrl || '');
  };
  const closeModal = () => setModal(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (modal.type === 'create') {
        await masterApi.post('/master/brands', { name: name.trim(), imageUrl: imageUrl.trim() || null });
      } else {
        await masterApi.put(`/master/brands/${modal.item.id}`, {
          name: name.trim(),
          imageUrl: imageUrl.trim() || null,
        });
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
    if (!confirm('Delete this brand? Models under it may need to be removed first.')) return;
    try {
      await masterApi.delete(`/master/brands/${row.id}`);
      load();
    } catch (e) {
      setError(e.body?.message || e.message || 'Delete failed');
    }
  };

  const columns = [
    {
      key: 'imageUrl',
      label: 'Logo',
      render: (r) =>
        r.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.imageUrl}
            alt={r.name || 'brand'}
            className="h-10 w-10 rounded-md object-contain bg-white p-0.5 border border-admin-border"
          />
        ) : (
          <div className="h-10 w-10 rounded-md bg-admin-dark border border-admin-border flex items-center justify-center text-[10px] text-admin-muted">
            no logo
          </div>
        ),
    },
    { key: 'name', label: 'Name' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusPill active={r.isActive !== false} />,
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        breadcrumb={['Master', 'Brands']}
        title="Brands"
        subtitle="Manage manufacturer and product brands. These drive the mobile app dropdowns."
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={load}>Refresh</Button>
            <Button variant="primary" icon={Plus} onClick={openCreate}>Add New</Button>
          </>
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="rounded-xl border border-admin-border bg-admin-card p-10 text-center text-admin-muted shadow-sm">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          rows={list}
          onEdit={openEdit}
          onDelete={handleDelete}
          emptyMessage="No brands. Add one to show in mobile app dropdowns."
        />
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-admin-card border border-admin-border p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {modal.type === 'create' ? 'New brand' : 'Edit brand'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-admin-muted mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-white border border-admin-border px-3 py-2 text-slate-900 focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
                  required
                />
              </div>
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                label="Brand logo"
                caption="Shown in customer brand picker (e.g. Apple, Vivo, Samsung)"
                folder="brands"
                buttonText="Upload Brand Logo"
              />
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
