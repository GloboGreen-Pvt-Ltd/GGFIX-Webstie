'use client';

import { useEffect, useState } from 'react';
import { masterApi } from '@/lib/api';
import DataTable from '@/components/DataTable';

export default function MasterScreeningQuestionsPage() {
  const [categories, setCategories] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(null);
  const [deviceCategoryId, setDeviceCategoryId] = useState('');
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState(''); // stored as helperText
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await masterApi.get('/master/screening-questions');
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

  const catName = (id) => categories.find((c) => c.id === id)?.name || '—';
  const filtered = filterCategory ? list.filter((r) => r.deviceCategoryId === filterCategory) : list;

  const openCreate = () => {
    setModal({ type: 'create' });
    setDeviceCategoryId(filterCategory || '');
    setQuestion('');
    setDescription('');
    setIsActive(true);
  };
  const openEdit = (item) => {
    setModal({ type: 'edit', item });
    setDeviceCategoryId(item.deviceCategoryId || '');
    setQuestion(item.question || '');
    setDescription(item.helperText || '');
    setIsActive(item.isActive ?? true);
  };
  const closeModal = () => setModal(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deviceCategoryId) { setError('Select a device category.'); return; }
    if (!question.trim()) return;
    setSubmitting(true);
    try {
      const body = {
        question: question.trim(),
        helperText: description.trim() || null,
        deviceCategoryId,
        isActive,
      };
      if (modal.type === 'create') {
        await masterApi.post('/master/screening-questions', { ...body, sortOrder: list.length });
      } else {
        await masterApi.put(`/master/screening-questions/${modal.item.id}`, body);
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
    if (!confirm('Delete this question?')) return;
    try {
      await masterApi.delete(`/master/screening-questions/${row.id}`);
      load();
    } catch (e) {
      setError(e.body?.message || e.message || 'Delete failed');
    }
  };

  const columns = [
    { key: 'deviceCategoryId', label: 'Category', render: (r) => catName(r.deviceCategoryId) },
    { key: 'question', label: 'Question' },
    { key: 'helperText', label: 'Description', render: (r) => r.helperText || '—' },
    { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? 'Yes' : 'No') },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Screening Questions</h1>
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
            Add question
          </button>
        </div>
      </div>
      <p className="text-admin-muted text-sm mb-4">
        Basic Yes/No screening questions per device category — each with an optional description shown to the customer.
      </p>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-admin-muted">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          onEdit={openEdit}
          onDelete={handleDelete}
          emptyMessage="No questions. Pick a category and add one."
        />
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-admin-card border border-admin-border p-6">
            <h2 className="text-lg font-medium text-slate-900 mb-4">
              {modal.type === 'create' ? 'New question' : 'Edit question'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-admin-muted mb-1">Device category</label>
                <select
                  value={deviceCategoryId}
                  onChange={(e) => setDeviceCategoryId(e.target.value)}
                  className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-admin-muted mb-1">Question</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                  rows={2}
                  placeholder="e.g. Is your phone working properly?"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-admin-muted mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                  rows={2}
                  placeholder="Optional helper text shown under the question"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
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
