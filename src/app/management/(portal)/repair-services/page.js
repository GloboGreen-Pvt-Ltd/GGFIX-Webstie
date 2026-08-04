'use client';

import { useEffect, useMemo, useState } from 'react';
import { masterApi } from '@/lib/api';
import DataTable from '@/components/DataTable';

// Split a typed/pasted value into individual names on commas or new lines.
const splitNames = (s) => (s || '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
const mergeUnique = (prev, parts) => {
  const next = [...prev];
  for (const p of parts) if (!next.some((n) => n.toLowerCase() === p.toLowerCase())) next.push(p);
  return next;
};

export default function MasterRepairServicesPage() {
  const [categories, setCategories] = useState([]);   // device categories
  const [mainCats, setMainCats] = useState([]);       // repair (main) categories — all
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMain, setFilterMain] = useState('');

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(null);
  const [deviceCategoryId, setDeviceCategoryId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');            // edit mode (single issue)
  const [issueInput, setIssueInput] = useState(''); // create mode typing buffer
  const [issueNames, setIssueNames] = useState([]); // create mode bulk list
  const [submitting, setSubmitting] = useState(false);

  const loadRefData = async () => {
    try {
      const [cats, mains] = await Promise.all([
        masterApi.get('/master/device-categories').catch(() => []),
        masterApi.get('/master/repair-categories').catch(() => []),
      ]);
      setCategories(Array.isArray(cats) ? cats : cats?.content ?? []);
      setMainCats(Array.isArray(mains) ? mains : mains?.content ?? []);
    } catch (e) {
      setError(e.message || 'Failed to load reference data');
    }
  };
  useEffect(() => { loadRefData(); }, []);

  // Main categories available under the selected device category.
  const mainCatsForFilter = useMemo(() => (
    filterCategory ? mainCats.filter((m) => m.deviceCategoryId === filterCategory) : mainCats
  ), [filterCategory, mainCats]);
  const mainCatsForForm = useMemo(() => (
    deviceCategoryId ? mainCats.filter((m) => m.deviceCategoryId === deviceCategoryId) : []
  ), [deviceCategoryId, mainCats]);

  useEffect(() => {
    if (filterMain && !mainCatsForFilter.some((m) => m.id === filterMain)) setFilterMain('');
  }, [filterMain, mainCatsForFilter]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set('deviceCategoryId', filterCategory);
      if (filterMain) params.set('categoryId', filterMain);
      const qs = params.toString();
      const data = await masterApi.get(`/master/repair-services${qs ? `?${qs}` : ''}`);
      setList(Array.isArray(data) ? data : data?.content ?? []);
    } catch (e) {
      setError(e.message || 'Failed to load');
      setList([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [filterCategory, filterMain]);

  const deviceName = (id) => categories.find((c) => c.id === id)?.name || '—';
  const mainName = (id) => mainCats.find((m) => m.id === id)?.name || '—';

  const openCreate = () => {
    setModal({ type: 'create' });
    setDeviceCategoryId(filterCategory || categories[0]?.id || '');
    setCategoryId(filterMain || '');
    setName('');
    setIssueInput('');
    setIssueNames([]);
  };
  const openEdit = (item) => {
    setModal({ type: 'edit', item });
    setDeviceCategoryId(item.deviceCategoryId || '');
    setCategoryId(item.categoryId || '');
    setName(item.name || '');
  };
  const closeModal = () => setModal(null);

  // Add the typed issue(s) to the bulk list — splits on commas/new lines.
  const addIssue = () => {
    const parts = splitNames(issueInput);
    if (!parts.length) return;
    setIssueNames((prev) => mergeUnique(prev, parts));
    setIssueInput('');
  };
  const removeIssue = (n) => setIssueNames((prev) => prev.filter((x) => x !== n));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deviceCategoryId || !categoryId) return;
    setSubmitting(true);
    try {
      if (modal.type === 'create') {
        const names = [...issueNames, ...splitNames(issueInput)];
        const uniq = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
        if (!uniq.length) { setSubmitting(false); return; }
        // Store one-by-one via the single-create endpoint.
        for (const nm of uniq) {
          await masterApi.post('/master/repair-services', { deviceCategoryId, categoryId, name: nm });
        }
      } else {
        if (!name.trim()) { setSubmitting(false); return; }
        await masterApi.put(`/master/repair-services/${modal.item.id}`, {
          name: name.trim(), deviceCategoryId, categoryId,
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
    if (!confirm('Delete this issue?')) return;
    try {
      await masterApi.delete(`/master/repair-services/${row.id}`);
      load();
    } catch (e) {
      setError(e.body?.message || e.message || 'Delete failed');
    }
  };

  const columns = useMemo(() => [
    { key: 'deviceCategoryId', label: 'Category', render: (r) => deviceName(r.deviceCategoryId) },
    { key: 'categoryId', label: 'Main Category', render: (r) => mainName(r.categoryId) },
    { key: 'name', label: 'Issue' },
    { key: 'description', label: 'Description', render: (r) => r.description || '—' },
  ], [categories, mainCats]);

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Repair Services</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setFilterMain(''); }}
            className="rounded-lg bg-admin-card border border-admin-border px-3 py-2 text-slate-800 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <select
            value={filterMain}
            onChange={(e) => setFilterMain(e.target.value)}
            className="rounded-lg bg-admin-card border border-admin-border px-3 py-2 text-slate-800 text-sm"
          >
            <option value="">All main categories</option>
            {mainCatsForFilter.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
          <button
            type="button"
            onClick={openCreate}
            disabled={!categories.length}
            className="rounded-lg bg-admin-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Add issue
          </button>
        </div>
      </div>
      <p className="text-admin-muted text-sm mb-4">
        Issues live under a main category — e.g. <span className="text-slate-600">Mobile → Display &amp; Touch → "Screen Broken"</span>.
        Create the main category first in <span className="text-slate-600">Repair Categories</span>.
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
          emptyMessage="No issues. Pick a category + main category and add one."
        />
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-admin-card border border-admin-border p-6">
            <h2 className="text-lg font-medium text-slate-900 mb-4">
              {modal.type === 'create' ? 'Add issues' : 'Edit issue'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-admin-muted mb-1">Device category</label>
                <select
                  value={deviceCategoryId}
                  onChange={(e) => { setDeviceCategoryId(e.target.value); setCategoryId(''); }}
                  className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-admin-muted mb-1">Main category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                  required
                  disabled={!deviceCategoryId}
                >
                  <option value="">Select main category</option>
                  {mainCatsForForm.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                </select>
                {deviceCategoryId && mainCatsForForm.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">
                    No main categories for this device category yet. Add one in Repair Categories first.
                  </p>
                )}
              </div>
              {modal.type === 'create' ? (
                <div>
                  <label className="block text-sm text-admin-muted mb-1">Issue names</label>
                  <input
                    type="text"
                    value={issueInput}
                    onChange={(e) => setIssueInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIssue(); } }}
                    className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                    placeholder="Screen Broken, No Display, Touch Not Working — comma-separated, press Enter"
                  />
                  {issueNames.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {issueNames.map((n) => (
                        <span key={n} className="inline-flex items-center gap-1 rounded-full bg-admin-accent/20 text-admin-accent px-3 py-1 text-xs">
                          {n}
                          <button type="button" onClick={() => removeIssue(n)} className="text-admin-accent/80 hover:text-white">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-admin-muted mt-2">
                    Add several issues, then Save — all are created under the selected main category.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-admin-muted mb-1">Issue name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                    placeholder="e.g. Screen Broken"
                    required
                  />
                </div>
              )}
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
