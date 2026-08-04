'use client';

import { useEffect, useState } from 'react';
import { masterApi } from '@/lib/api';
import DataTable from '@/components/DataTable';

const splitNames = (s) => (s || '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

export default function MasterConditionGroupsPage() {
  const [categories, setCategories] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [conds, setConds] = useState([]);
  const [optionsByCond, setOptionsByCond] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Condition Categories modal (manage names per device category)
  const [catModal, setCatModal] = useState(null); // { type, group? }
  const [cCategory, setCCategory] = useState('');
  const [cInput, setCInput] = useState('');
  const [cChips, setCChips] = useState([]);        // [{ id?, name }]
  const [cRemoved, setCRemoved] = useState([]);
  const [cSubmitting, setCSubmitting] = useState(false);

  // Condition Groups (options) modal
  const [optModal, setOptModal] = useState(null); // { type: 'add' | 'edit', cond? }
  const [oDeviceCat, setODeviceCat] = useState('');
  const [oCondId, setOCondId] = useState('');
  const [oInput, setOInput] = useState('');
  const [oChips, setOChips] = useState([]);        // [{ id?, label }]
  const [oRemoved, setORemoved] = useState([]);
  const [oSubmitting, setOSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await masterApi.get('/master/condition-groups');
      const groups = Array.isArray(data) ? data : data?.content ?? [];
      setConds(groups);
      const map = {};
      await Promise.all(groups.map(async (g) => {
        const opts = await masterApi.get(`/master/condition-groups/${g.id}/options`).catch(() => []);
        map[g.id] = Array.isArray(opts) ? opts : opts?.content ?? [];
      }));
      setOptionsByCond(map);
    } catch (e) {
      setError(e.message || 'Failed to load');
      setConds([]);
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
  const filteredConds = filterCategory ? conds.filter((c) => c.deviceCategoryId === filterCategory) : conds;

  // ---- Section 1: Condition Categories (grouped by device category) ----
  const catGrouped = Object.values(filteredConds.reduce((acc, c) => {
    const k = c.deviceCategoryId || '__shared__';
    (acc[k] ||= { id: k, deviceCategoryId: c.deviceCategoryId || null, items: [] }).items.push(c);
    return acc;
  }, {}));

  const openCatCreate = () => {
    setCatModal({ type: 'create' });
    setCCategory(filterCategory || '');
    setCInput(''); setCChips([]); setCRemoved([]);
  };
  const openCatEdit = (group) => {
    setCatModal({ type: 'edit', group });
    setCCategory(group.deviceCategoryId || '');
    setCInput('');
    setCChips(group.items.map((c) => ({ id: c.id, name: c.name })));
    setCRemoved([]);
  };
  const addCChips = () => {
    const parts = splitNames(cInput);
    if (!parts.length) return;
    setCChips((prev) => {
      const next = [...prev];
      for (const p of parts) if (!next.some((x) => x.name.toLowerCase() === p.toLowerCase())) next.push({ name: p });
      return next;
    });
    setCInput('');
  };
  const removeCChip = (c) => {
    if (c.id) setCRemoved((prev) => [...prev, c.id]);
    setCChips((prev) => prev.filter((x) => x !== c));
  };
  const submitCats = async (e) => {
    e.preventDefault();
    if (!cCategory) { setError('Select a device category.'); return; }
    const all = [...cChips];
    for (const p of splitNames(cInput)) if (!all.some((x) => x.name.toLowerCase() === p.toLowerCase())) all.push({ name: p });
    setCSubmitting(true);
    try {
      for (const id of cRemoved) await masterApi.delete(`/master/condition-groups/${id}`).catch(() => {});
      for (const c of all) {
        if (c.id) continue;
        await masterApi.post('/master/condition-groups', { name: c.name, deviceCategoryId: cCategory || null });
      }
      setCatModal(null);
      load();
    } catch (e) {
      setError(e.body?.message || e.message || 'Request failed');
    } finally { setCSubmitting(false); }
  };
  const deleteCatGroup = async (group) => {
    if (!confirm(`Delete all ${group.items.length} condition categor(ies) for ${catName(group.deviceCategoryId)}? Their options are removed too.`)) return;
    try {
      for (const c of group.items) await masterApi.delete(`/master/condition-groups/${c.id}`).catch(() => {});
      load();
    } catch (e) { setError(e.body?.message || e.message || 'Delete failed'); }
  };

  // ---- Section 2: Condition Groups (options for each condition category) ----
  const condsForDeviceCat = oDeviceCat ? conds.filter((c) => c.deviceCategoryId === oDeviceCat || !c.deviceCategoryId) : conds;

  const openOptAdd = () => {
    setOptModal({ type: 'add' });
    setODeviceCat(filterCategory || '');
    setOCondId('');
    setOInput(''); setOChips([]); setORemoved([]);
  };
  const openOptEdit = (cond) => {
    setOptModal({ type: 'edit', cond });
    setODeviceCat(cond.deviceCategoryId || '');
    setOCondId(cond.id);
    setOInput('');
    setOChips((optionsByCond[cond.id] || []).map((o) => ({ id: o.id, label: o.label })));
    setORemoved([]);
  };
  const addOChips = () => {
    const parts = splitNames(oInput);
    if (!parts.length) return;
    setOChips((prev) => {
      const next = [...prev];
      for (const p of parts) if (!next.some((x) => x.label.toLowerCase() === p.toLowerCase())) next.push({ label: p });
      return next;
    });
    setOInput('');
  };
  const removeOChip = (c) => {
    if (c.id) setORemoved((prev) => [...prev, c.id]);
    setOChips((prev) => prev.filter((x) => x !== c));
  };
  const submitOpts = async (e) => {
    e.preventDefault();
    if (!oCondId) { setError('Pick a condition category.'); return; }
    const all = [...oChips];
    for (const p of splitNames(oInput)) if (!all.some((x) => x.label.toLowerCase() === p.toLowerCase())) all.push({ label: p });
    setOSubmitting(true);
    try {
      for (const id of oRemoved) await masterApi.delete(`/master/condition-options/${id}`).catch(() => {});
      const existing = optionsByCond[oCondId] || [];
      let sort = existing.length;
      for (const c of all) {
        if (c.id) continue;
        await masterApi.post('/master/condition-options', { groupId: oCondId, label: c.label, sortOrder: sort++, priceImpact: 0 });
      }
      setOptModal(null);
      load();
    } catch (e) {
      setError(e.body?.message || e.message || 'Request failed');
    } finally { setOSubmitting(false); }
  };
  const deleteCond = async (cond) => {
    if (!confirm(`Delete condition category "${cond.name}" and its options?`)) return;
    try { await masterApi.delete(`/master/condition-groups/${cond.id}`); load(); }
    catch (e) { setError(e.body?.message || e.message || 'Delete failed'); }
  };

  const catColumns = [
    { key: 'deviceCategoryId', label: 'Device category', render: (r) => catName(r.deviceCategoryId) },
    {
      key: 'items', label: 'Condition categories',
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          {r.items.map((c) => (
            <span key={c.id} className="rounded-full bg-admin-dark border border-admin-border px-2.5 py-1 text-xs text-slate-800">{c.name}</span>
          ))}
        </div>
      ),
    },
  ];

  const groupColumns = [
    { key: 'deviceCategoryId', label: 'Device category', render: (r) => catName(r.deviceCategoryId) },
    { key: 'name', label: 'Condition category' },
    {
      key: 'options', label: 'Options',
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          {(optionsByCond[r.id] || []).map((o) => (
            <span key={o.id} className="rounded-full bg-admin-dark border border-admin-border px-2.5 py-1 text-xs text-slate-800">{o.label}</span>
          ))}
          {(!optionsByCond[r.id] || optionsByCond[r.id].length === 0) ? <span className="text-admin-muted text-xs">—</span> : null}
        </div>
      ),
    },
  ];

  const inputCls = 'w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900';
  const catSelect = (val, onChange, disabled) => (
    <select value={val} onChange={onChange} className={`${inputCls} disabled:opacity-60`} disabled={disabled} required>
      <option value="">Select category</option>
      {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
    </select>
  );

  return (
    <div className="p-6 md:p-8 space-y-10">
      {/* ---- Condition Categories ---- */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Condition Categories</h1>
          <div className="flex items-center gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg bg-admin-card border border-admin-border px-3 py-2 text-slate-800 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <button type="button" onClick={openCatCreate} className="rounded-lg bg-admin-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Add category</button>
          </div>
        </div>
        <p className="text-admin-muted text-sm mb-4">
          Condition categories per device — left is the device category, right are its condition categories (e.g. Screen Condition, Back Panel). Edit a row to add/remove.
        </p>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="text-admin-muted">Loading…</p>
        ) : (
          <DataTable columns={catColumns} rows={catGrouped} onEdit={openCatEdit} onDelete={deleteCatGroup}
            emptyMessage="No condition categories. Pick a device category and add one." />
        )}
      </section>

      {/* ---- Condition Groups (options) ---- */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Condition Groups</h2>
          <button type="button" onClick={openOptAdd} disabled={!conds.length}
            className="rounded-lg bg-admin-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Add options</button>
        </div>
        <p className="text-admin-muted text-sm mb-4">
          Every condition category and its options (e.g. No Damage, Minor Spot, Screen Broken). Edit a row to manage its options.
        </p>
        {loading ? (
          <p className="text-admin-muted">Loading…</p>
        ) : (
          <DataTable columns={groupColumns} rows={filteredConds} onEdit={openOptEdit} onDelete={deleteCond}
            emptyMessage="No condition categories yet — add some above." />
        )}
      </section>

      {/* Condition Categories modal */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-admin-card border border-admin-border p-6">
            <h2 className="text-lg font-medium text-slate-900 mb-4">
              {catModal.type === 'create' ? 'Add condition categories' : `Edit condition categories — ${catName(cCategory)}`}
            </h2>
            <form onSubmit={submitCats} className="space-y-4">
              <div>
                <label className="block text-sm text-admin-muted mb-1">Device category</label>
                {catSelect(cCategory, (e) => setCCategory(e.target.value), catModal.type === 'edit')}
              </div>
              <div>
                <label className="block text-sm text-admin-muted mb-1">Condition categories</label>
                <input type="text" value={cInput} onChange={(e) => setCInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCChips(); } }}
                  className={inputCls} placeholder="Screen Condition, Back Panel — comma-separated, press Enter" />
                {cChips.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {cChips.map((c, i) => (
                      <span key={c.id || `n${i}`} className="inline-flex items-center gap-1 rounded-full bg-admin-accent/20 text-admin-accent px-3 py-1 text-xs">
                        {c.name}
                        <button type="button" onClick={() => removeCChip(c)} className="text-admin-accent/80 hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setCatModal(null)} className="rounded-lg px-4 py-2 text-slate-600 hover:bg-admin-dark">Cancel</button>
                <button type="submit" disabled={cSubmitting} className="rounded-lg bg-admin-accent px-4 py-2 text-white disabled:opacity-50">{cSubmitting ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Condition Groups (options) modal */}
      {optModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-admin-card border border-admin-border p-6">
            <h2 className="text-lg font-medium text-slate-900 mb-4">
              {optModal.type === 'edit' ? `Edit options — ${optModal.cond?.name}` : 'Add options'}
            </h2>
            <form onSubmit={submitOpts} className="space-y-4">
              {optModal.type === 'add' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-admin-muted mb-1">Device category</label>
                    {catSelect(oDeviceCat, (e) => { setODeviceCat(e.target.value); setOCondId(''); }, false)}
                  </div>
                  <div>
                    <label className="block text-sm text-admin-muted mb-1">Condition category</label>
                    <select value={oCondId} onChange={(e) => setOCondId(e.target.value)} className={inputCls}>
                      <option value="">Select condition category</option>
                      {condsForDeviceCat.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </div>
                </div>
              ) : null}
              <div>
                <label className="block text-sm text-admin-muted mb-1">Options</label>
                <input type="text" value={oInput} onChange={(e) => setOInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOChips(); } }}
                  className={inputCls} placeholder="No Damage, Minor Spot, Screen Broken — comma-separated, press Enter" />
                {oChips.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {oChips.map((c, i) => (
                      <span key={c.id || `n${i}`} className="inline-flex items-center gap-1 rounded-full bg-admin-accent/20 text-admin-accent px-3 py-1 text-xs">
                        {c.label}
                        <button type="button" onClick={() => removeOChip(c)} className="text-admin-accent/80 hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setOptModal(null)} className="rounded-lg px-4 py-2 text-slate-600 hover:bg-admin-dark">Cancel</button>
                <button type="submit" disabled={oSubmitting} className="rounded-lg bg-admin-accent px-4 py-2 text-white disabled:opacity-50">{oSubmitting ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
