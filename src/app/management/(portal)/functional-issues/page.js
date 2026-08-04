'use client';

import { useEffect, useState } from 'react';
import { masterApi } from '@/lib/api';
import DataTable from '@/components/DataTable';

// Issue names are short labels — split typed/pasted input on commas or new lines.
const splitNames = (s) => (s || '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

export default function MasterFunctionalIssuesPage() {
  const [categories, setCategories] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(null); // { type: 'create' | 'edit', group? }
  const [deviceCategoryId, setDeviceCategoryId] = useState('');
  const [input, setInput] = useState('');
  const [chips, setChips] = useState([]);          // [{ id?, name }]
  const [removedIds, setRemovedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await masterApi.get('/master/functional-issues');
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
    masterApi.get('/master/device-categories')
      .then((d) => setCategories(Array.isArray(d) ? d : d?.content ?? []))
      .catch(() => {});
  }, []);

  const catName = (id) => categories.find((c) => c.id === id)?.name || 'All categories (shared)';
  const filtered = filterCategory ? list.filter((r) => r.deviceCategoryId === filterCategory) : list;

  const grouped = Object.values(filtered.reduce((acc, it) => {
    const k = it.deviceCategoryId || '__shared__';
    (acc[k] ||= { id: k, deviceCategoryId: it.deviceCategoryId || null, items: [] }).items.push(it);
    return acc;
  }, {}));

  const openCreate = () => {
    setModal({ type: 'create' });
    setDeviceCategoryId(filterCategory || '');
    setInput('');
    setChips([]);
    setRemovedIds([]);
  };
  const openEdit = (group) => {
    setModal({ type: 'edit', group });
    setDeviceCategoryId(group.deviceCategoryId || '');
    setInput('');
    setChips(group.items.map((it) => ({ id: it.id, name: it.name })));
    setRemovedIds([]);
  };
  const closeModal = () => setModal(null);

  const addChips = () => {
    const parts = splitNames(input);
    if (!parts.length) return;
    setChips((prev) => {
      const next = [...prev];
      for (const p of parts) if (!next.some((c) => c.name.toLowerCase() === p.toLowerCase())) next.push({ name: p });
      return next;
    });
    setInput('');
  };
  const removeChip = (c) => {
    if (c.id) setRemovedIds((prev) => [...prev, c.id]);
    setChips((prev) => prev.filter((x) => x !== c));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deviceCategoryId) { setError('Select a device category.'); return; }
    const all = [...chips];
    for (const p of splitNames(input)) {
      if (!all.some((c) => c.name.toLowerCase() === p.toLowerCase())) all.push({ name: p });
    }
    if (!all.length && !removedIds.length) { closeModal(); return; }
    setSubmitting(true);
    try {
      for (const id of removedIds) {
        await masterApi.delete(`/master/functional-issues/${id}`).catch(() => {});
      }
      let sort = 0;
      for (const c of all) {
        if (c.id) { sort++; continue; }
        await masterApi.post('/master/functional-issues', {
          name: c.name, deviceCategoryId: deviceCategoryId || null, sortOrder: sort++, isActive: true, priceImpact: 0,
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

  const handleDelete = async (group) => {
    if (!confirm(`Delete all ${group.items.length} issue(s) for ${catName(group.deviceCategoryId)}?`)) return;
    try {
      for (const it of group.items) {
        await masterApi.delete(`/master/functional-issues/${it.id}`).catch(() => {});
      }
      load();
    } catch (e) {
      setError(e.body?.message || e.message || 'Delete failed');
    }
  };

  const columns = [
    { key: 'deviceCategoryId', label: 'Device category', render: (r) => catName(r.deviceCategoryId) },
    {
      key: 'items',
      label: 'Functionality Issues',
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          {r.items.map((it) => (
            <span key={it.id} className="rounded-full bg-admin-dark border border-admin-border px-2.5 py-1 text-xs text-slate-800">{it.name}</span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Functional Issues</h1>
        <div className="flex items-center gap-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg bg-admin-card border border-admin-border px-3 py-2 text-slate-800 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-admin-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add issues
          </button>
        </div>
      </div>
      <p className="text-admin-muted text-sm mb-4">
        Internal functionality issues per device category — left is the category, right are its issues.
        Edit a row to add/remove issues.
      </p>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-admin-muted">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={grouped}
          onEdit={openEdit}
          onDelete={handleDelete}
          emptyMessage="No functional issues. Pick a category and add some."
        />
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-admin-card border border-admin-border p-6">
            <h2 className="text-lg font-medium text-slate-900 mb-4">
              {modal.type === 'create' ? 'Add functional issues' : `Edit issues — ${catName(deviceCategoryId)}`}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-admin-muted mb-1">Device category</label>
                <select
                  value={deviceCategoryId}
                  onChange={(e) => setDeviceCategoryId(e.target.value)}
                  className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900 disabled:opacity-60"
                  disabled={modal.type === 'edit'}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-admin-muted mb-1">Functionality issues</label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChips(); } }}
                  className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                  placeholder="Battery Issue, Speaker Not Working — comma-separated, press Enter"
                />
                {chips.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {chips.map((c, i) => (
                      <span key={c.id || `new-${i}`} className="inline-flex items-center gap-1 rounded-full bg-admin-accent/20 text-admin-accent px-3 py-1 text-xs">
                        {c.name}
                        <button type="button" onClick={() => removeChip(c)} className="text-admin-accent/80 hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-admin-muted mt-2">
                  Add or remove issues, then Save. Existing ones are kept; removed ones are deleted.
                </p>
              </div>
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
