'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, Pencil, Plus, Search, Settings2, Trash2 } from 'lucide-react';

import { masterApi } from '@/lib/api';
import { imageReplacementNotice, uploadCompatibilityImage } from '@/lib/modelMedia';
import DataTable, { StatusPill } from '@/components/DataTable';
import S3ImageUpload from '@/components/S3ImageUpload';

/**
 * Master Data -> Model Compatibility.
 *
 * One row per physical spare-part box on the shelf: its number and name, the
 * models the part inside fits, a reference photo and a note. Staff search a
 * model here and get the box number to walk to.
 *
 * The models picker mirrors how the stock is actually organised — a box holds a
 * part that fits several models, often across more than one brand — so the form
 * is a repeating "brand + its models" block rather than one flat model list.
 * A flat list would mean scrolling every model of every brand to find three.
 */

/** Models are fetched per brand and cached here for the life of the page. */
const emptyBlock = (key) => ({ key, brandId: '', modelIds: [] });

/** Model chips shown per brand in the table before the rest fold into "+N more". */
const PER_BRAND_CHIPS = 6;

/**
 * The table can only show the first six models before it stops being a table,
 * so the full fitment list is grouped by brand here — the same shape the edit
 * form uses, because that is how the stock is organised and how staff read it.
 */
function groupByBrand(models) {
  const groups = [];
  for (const m of models || []) {
    const key = m.brandId || m.brandName || '—';
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, brandName: m.brandName || 'Unknown brand', models: [] };
      groups.push(g);
    }
    g.models.push(m);
  }
  for (const g of groups) {
    g.models.sort((a, b) => String(a.modelName || '').localeCompare(String(b.modelName || '')));
  }
  groups.sort((a, b) => String(a.brandName).localeCompare(String(b.brandName)));
  return groups;
}

function formatStamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** One labelled line in the view panel. */
function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-admin-muted">{label}</p>
      <div className="mt-1 text-sm text-slate-900">{children}</div>
    </div>
  );
}

export default function CompatibilityClient() {
  // The sidebar links to ?type=<slug>; an absent value means "every box".
  const searchParams = useSearchParams();
  const typeSlug = searchParams.get('type') || '';

  const [list, setList] = useState([]);
  const [brands, setBrands] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Outcome of the last image upload. Shown on the page, not in the modal, because
  // the modal closes on save — and a replacement deletes the old file from the
  // bucket, which is worth saying in words rather than leaving to be inferred.
  const [notice, setNotice] = useState('');

  // Part-type management, so a fourth type is a row the shop adds rather than a
  // release. Kept on this page instead of its own route — it is a short list
  // that only matters next to the boxes it files.
  const [typeModal, setTypeModal] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [typeBusy, setTypeBusy] = useState(false);
  const [typeError, setTypeError] = useState('');

  // brandId -> [{ id, name }]. Populated on demand; a brand is only fetched once.
  const [modelsByBrand, setModelsByBrand] = useState({});
  const [loadingBrands, setLoadingBrands] = useState([]);

  const [modal, setModal] = useState(null); // { type: 'create' | 'edit', row? }
  // Read-only detail. Held separately from `modal` so the form's state is never
  // half-populated by a look-up, and so "View → Edit" is one deliberate step.
  const [viewRow, setViewRow] = useState(null);
  const [boxNo, setBoxNo] = useState('');
  const [boxName, setBoxName] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [partTypeId, setPartTypeId] = useState('');
  const [blocks, setBlocks] = useState([]);
  // blockKey -> search text. Per block, not global: a box can list Vivo and
  // Samsung models and each list is filtered independently.
  const [modelQuery, setModelQuery] = useState({});
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Block keys must be stable across re-renders or React remounts the inputs on
  // every keystroke, so they come from a counter rather than the array index —
  // an index shifts when a block above it is removed.
  const blockKey = useRef(0);
  const nextBlock = () => emptyBlock(`b${++blockKey.current}`);

  // Filtering server-side rather than in the browser: the type is a stored
  // column, so the box list for one menu entry is one query, and a shop with
  // hundreds of boxes never ships the other types' rows to the client.
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const path = typeSlug
        ? `/master/model-compatibility?type=${encodeURIComponent(typeSlug)}`
        : '/master/model-compatibility';
      const data = await masterApi.get(path);
      setList(Array.isArray(data) ? data : data?.content ?? []);
    } catch (e) {
      setError(e.body?.message || e.message || 'Failed to load');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTypes = () => masterApi.get('/master/model-compatibility-types')
    .then((d) => setTypes(Array.isArray(d) ? d : d?.content ?? []))
    .catch(() => {});

  // Re-runs when the sidebar switches type, because typeSlug comes from the URL.
  useEffect(() => { load(); }, [typeSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadTypes();
    masterApi.get('/master/brands')
      .then((d) => {
        const rows = Array.isArray(d) ? d : d?.content ?? [];
        setBrands([...rows].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))));
      })
      .catch(() => {});
  }, []);

  const activeType = types.find((t) => t.slug === typeSlug) || null;
  const typeNameOf = (id) => types.find((t) => t.id === id)?.name || '';

  /** Fetch a brand's models once and cache them. */
  const ensureModels = async (brandId) => {
    if (!brandId || modelsByBrand[brandId]) return;
    setLoadingBrands((prev) => (prev.includes(brandId) ? prev : [...prev, brandId]));
    try {
      const data = await masterApi.get(`/master/models?brandId=${encodeURIComponent(brandId)}`);
      const rows = (Array.isArray(data) ? data : data?.content ?? [])
        .map((m) => ({ id: m.id, name: m.name }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      setModelsByBrand((prev) => ({ ...prev, [brandId]: rows }));
    } catch (e) {
      setFormError(e.body?.message || e.message || 'Could not load models for that brand.');
    } finally {
      setLoadingBrands((prev) => prev.filter((id) => id !== brandId));
    }
  };

  const brandName = (id) => brands.find((b) => b.id === id)?.name || '';

  /* ----------------------------------------------------------------- modal -- */

  const resetForm = () => {
    setBoxNo('');
    setBoxName('');
    setNotes('');
    setIsActive(true);
    setImageUrl('');
    setImageFile(null);
    setPartTypeId('');
    setModelQuery({});
    setFormError('');
  };

  const openCreate = () => {
    resetForm();
    // Adding a box while a type is selected pre-fills that type — the common
    // case is "I am on Tempered Glass and want another tempered-glass box".
    setPartTypeId(activeType?.id || '');
    setBlocks([nextBlock()]);
    setModal({ type: 'create' });
  };

  const openEdit = (row) => {
    resetForm();
    setBoxNo(row.boxNo || '');
    setBoxName(row.boxName || '');
    setNotes(row.notes || '');
    setIsActive(row.isActive !== false);
    setPartTypeId(row.partTypeId || '');
    setImageUrl(row.referenceImageUrl || '');

    // Stored refs are flat; the form is grouped by brand, so rebuild the blocks
    // in the order the brands first appear.
    const grouped = [];
    for (const m of row.models || []) {
      let g = grouped.find((x) => x.brandId === m.brandId);
      if (!g) {
        g = { ...nextBlock(), brandId: m.brandId || '' };
        grouped.push(g);
      }
      if (m.modelId && !g.modelIds.includes(m.modelId)) g.modelIds.push(m.modelId);
    }
    setBlocks(grouped.length ? grouped : [nextBlock()]);
    grouped.forEach((g) => ensureModels(g.brandId));

    setModal({ type: 'edit', row });
  };

  const closeModal = () => {
    setModal(null);
    setBlocks([]);
  };

  const addBlock = () => setBlocks((prev) => [...prev, nextBlock()]);
  const removeBlock = (key) => setBlocks((prev) => prev.filter((b) => b.key !== key));

  const setBlockBrand = (key, brandId) => {
    // Changing the brand drops the ticks: they were ids of the previous brand's
    // models and would otherwise be saved invisibly. The search text goes with
    // them — it was typed against the old brand's list.
    setBlocks((prev) => prev.map((b) => (b.key === key ? { ...b, brandId, modelIds: [] } : b)));
    setModelQuery((prev) => ({ ...prev, [key]: '' }));
    ensureModels(brandId);
  };

  const toggleModel = (key, modelId) => {
    setBlocks((prev) => prev.map((b) => {
      if (b.key !== key) return b;
      const on = b.modelIds.includes(modelId);
      return { ...b, modelIds: on ? b.modelIds.filter((x) => x !== modelId) : [...b.modelIds, modelId] };
    }));
  };

  /**
   * Select-all acts on what the search is currently SHOWING, not on the whole
   * brand. Filtering to "T2" and pressing Select all should tick the four T2
   * models, not all 90 Vivos — and ticks hidden by the filter are left alone
   * rather than silently cleared.
   */
  const setAllModels = (key, ids, on) => {
    setBlocks((prev) => prev.map((b) => {
      if (b.key !== key) return b;
      if (on) return { ...b, modelIds: [...new Set([...b.modelIds, ...ids])] };
      const drop = new Set(ids);
      return { ...b, modelIds: b.modelIds.filter((x) => !drop.has(x)) };
    }));
  };

  const selectedCount = useMemo(
    () => new Set(blocks.flatMap((b) => b.modelIds)).size,
    [blocks],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setNotice('');

    if (!boxNo.trim()) { setFormError('Box No is required.'); return; }
    if (!boxName.trim()) { setFormError('Box Name is required.'); return; }

    const used = blocks.filter((b) => b.brandId);
    const duplicateBrand = used.find((b, i) => used.findIndex((x) => x.brandId === b.brandId) !== i);
    if (duplicateBrand) {
      setFormError(`${brandName(duplicateBrand.brandId)} is added twice — merge those two blocks.`);
      return;
    }

    // Dedup across blocks: the same model cannot be listed twice on one box.
    const models = [...new Set(used.flatMap((b) => b.modelIds))];

    setSubmitting(true);
    try {
      const payload = {
        partTypeId: partTypeId || null,
        // null means "leave as is" server-side, so moving a box back to "no type"
        // has to be said explicitly.
        clearPartType: !partTypeId,
        boxNo: boxNo.trim(),
        boxName: boxName.trim(),
        models,
        notes: notes.trim(),
        isActive,
      };

      const saved = modal.type === 'create'
        ? await masterApi.post('/master/model-compatibility', payload)
        : await masterApi.put(`/master/model-compatibility/${modal.row.id}`, payload);

      // The image endpoint is id-scoped — the key is derived from the box number
      // as stored — so the upload can only happen once the row exists.
      if (imageFile && saved?.id) {
        const uploaded = await uploadCompatibilityImage(saved.id, imageFile);
        setNotice(imageReplacementNotice(uploaded, 'Reference image'));
      }

      closeModal();
      load();
    } catch (err) {
      setFormError(err.body?.message || err.message || 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (row) => {
    try {
      await masterApi.put(`/master/model-compatibility/${row.id}`, { isActive: row.isActive === false });
      load();
    } catch (e) {
      setError(e.body?.message || e.message || 'Could not change status');
    }
  };

  const handleDelete = async (row) => {
    if (!confirm(`Delete ${row.boxName} - ${row.boxNo}?`)) return;
    try {
      await masterApi.delete(`/master/model-compatibility/${row.id}`);
      load();
    } catch (e) {
      setError(e.body?.message || e.message || 'Delete failed');
    }
  };

  /* ------------------------------------------------------------ part types -- */

  /**
   * The sidebar loads its types once on mount, so a type added here would not
   * show in the menu until a refresh. Announcing the change lets it re-fetch —
   * an event rather than shared state, so the sidebar keeps knowing nothing
   * about this page.
   */
  const announceTypesChanged = () => {
    try { window.dispatchEvent(new CustomEvent('ggfix:compat-types-changed')); } catch { /* SSR */ }
  };

  const addType = async (e) => {
    e.preventDefault();
    const name = typeName.trim();
    if (!name) { setTypeError('Type name is required.'); return; }
    setTypeBusy(true);
    setTypeError('');
    try {
      await masterApi.post('/master/model-compatibility-types', { name });
      setTypeName('');
      await loadTypes();
      announceTypesChanged();
    } catch (err) {
      setTypeError(err.body?.message || err.message || 'Could not add that type.');
    } finally {
      setTypeBusy(false);
    }
  };

  const renameType = async (t) => {
    const name = prompt(`Rename "${t.name}" to:`, t.name);
    if (name == null || name.trim() === '' || name.trim() === t.name) return;
    setTypeError('');
    try {
      await masterApi.put(`/master/model-compatibility-types/${t.id}`, { name: name.trim() });
      await loadTypes();
      announceTypesChanged();
    } catch (err) {
      setTypeError(err.body?.message || err.message || 'Could not rename that type.');
    }
  };

  const deleteType = async (t) => {
    if (!confirm(`Delete part type "${t.name}"?`)) return;
    setTypeError('');
    try {
      await masterApi.delete(`/master/model-compatibility-types/${t.id}`);
      await loadTypes();
      announceTypesChanged();
    } catch (err) {
      // The backend refuses while boxes still point at it and says how many.
      setTypeError(err.body?.message || err.message || 'Could not delete that type.');
    }
  };

  /* ---------------------------------------------------------------- table -- */

  const modelsText = (row) => (row.models || [])
    .map((m) => `${m.brandName || ''} ${m.modelName || ''}`)
    .join(' ');

  const columns = [
    {
      key: 'box',
      label: 'Box',
      // boxNo / boxName are plain strings on the row, so DataTable's raw scan
      // already matches them; this is here so the combined "name - no" reading
      // matches too, e.g. searching "Glass 01".
      search: (r) => `${r.boxName || ''} ${r.boxNo || ''}`,
      render: (r) => {
        const total = (r.models || []).length;
        const brandCount = groupByBrand(r.models).length;
        return (
          <div className="min-w-[170px]">
            <p className="font-semibold text-slate-900">
              {r.boxName || '—'}
              <span className="font-normal text-admin-muted"> - {r.boxNo || '—'}</span>
            </p>
            {/* Counts are derived from the stored list on every render, so they
                track edits without a reload. */}
            <p className="mt-0.5 text-xs text-admin-muted">
              {total} model{total === 1 ? '' : 's'}
              {brandCount > 0 && ` · ${brandCount} brand${brandCount === 1 ? '' : 's'}`}
            </p>
          </div>
        );
      },
    },
    {
      key: 'models',
      label: 'Compatible Brands & Models',
      search: modelsText,
      render: (r) => {
        const groups = groupByBrand(r.models);
        if (!groups.length) return <span className="text-admin-muted">No models mapped</span>;
        return (
          <div className="min-w-[320px] divide-y divide-admin-border">
            {groups.map((g) => {
              const shown = g.models.slice(0, PER_BRAND_CHIPS);
              const rest = g.models.length - shown.length;
              return (
                <div key={g.key} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="w-28 shrink-0 pt-0.5">
                    <p className="truncate text-sm font-medium text-slate-900" title={g.brandName}>
                      {g.brandName}
                    </p>
                    <p className="text-[11px] text-admin-muted">
                      {g.models.length} model{g.models.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {shown.map((m) => (
                      <span
                        key={m.modelId}
                        className="rounded-full bg-admin-dark border border-admin-border px-2.5 py-1 text-xs text-slate-800"
                      >
                        {m.modelName}
                      </span>
                    ))}
                    {/* A brand can hold dozens of models; past a handful the row
                        stops being scannable, so the overflow opens the detail
                        panel rather than growing the table. */}
                    {rest > 0 && (
                      <button
                        type="button"
                        onClick={() => setViewRow(r)}
                        className="rounded-full px-2 py-1 text-xs font-medium text-admin-accent hover:underline"
                      >
                        +{rest} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      },
    },
    // Only when looking at every type — inside one type the column would repeat
    // the page heading on every row.
    ...(typeSlug ? [] : [{
      key: 'partTypeId',
      label: 'Part Type',
      search: (r) => typeNameOf(r.partTypeId),
      render: (r) => (typeNameOf(r.partTypeId)
        ? <span className="text-sm text-slate-700">{typeNameOf(r.partTypeId)}</span>
        : <span className="text-xs text-admin-muted">Not set</span>),
    }]),
    {
      key: 'referenceImageUrl',
      label: 'Reference',
      render: (r) => (r.referenceImageUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={r.referenceImageUrl} alt="" className="h-10 w-10 rounded-lg border border-admin-border object-cover" />
        : <span className="text-admin-muted">—</span>),
    },
    { key: 'isActive', label: 'Status', render: (r) => <StatusPill active={r.isActive !== false} /> },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          {/* The heading names the sidebar entry you arrived from, so the screen
              is self-identifying rather than always reading "Model Compatibility". */}
          <h1 className="text-2xl font-semibold text-slate-900">
            {activeType ? activeType.name : 'Model Compatibility'}
          </h1>
          {activeType && (
            <p className="text-xs text-admin-muted">Model Compatibility · {list.length} box{list.length === 1 ? '' : 'es'}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setTypeModal(true); setTypeName(''); setTypeError(''); }}
            className="inline-flex items-center gap-2 rounded-lg border border-admin-border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-admin-dark"
          >
            <Settings2 className="h-4 w-4" /> Part types
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-admin-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Box
          </button>
        </div>
      </div>
      <p className="text-admin-muted text-sm mb-4">
        {activeType
          ? `Boxes filed under ${activeType.name} — box number, what it holds, and the models that part fits.`
          : 'Every spare-part box on the shelf — its number, what it holds, and the models that part fits. Pick a part type in the sidebar to narrow this down.'}
        {' '}Search by a model name to find which box to open.
      </p>

      {/* A type in the URL that no longer exists returns nothing; without this the
          empty table would read as "no boxes" rather than "no such type". */}
      {typeSlug && !activeType && types.length > 0 && (
        <p className="mb-4 text-sm text-amber-700">
          No part type matches “{typeSlug}”. It may have been renamed — pick one from the sidebar.
        </p>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {notice && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      {loading ? (
        <p className="text-admin-muted">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={list}
          onView={setViewRow}
          onEdit={openEdit}
          onToggle={handleToggle}
          onDelete={handleDelete}
          emptyMessage="No boxes yet. Add one to start mapping parts to models."
        />
      )}

      {/* Read-only detail. The table has to truncate the fitment list at six
          chips to stay readable, so this is where the whole box is actually
          legible: every model it fits, grouped by brand, and the full-size
          reference photo. */}
      {viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-admin-card border border-admin-border p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-admin-muted">Compatibility box</p>
                <h2 className="text-lg font-medium text-slate-900">
                  {viewRow.boxName}
                  <span className="font-normal text-admin-muted"> - {viewRow.boxNo}</span>
                </h2>
              </div>
              <StatusPill active={viewRow.isActive !== false} />
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Box No">
                <span className="font-semibold">{viewRow.boxNo || '—'}</span>
              </Field>
              <Field label="Box Name">{viewRow.boxName || '—'}</Field>
            </div>

            <div className="mt-5">
              <Field label={`Compatible models · ${(viewRow.models || []).length}`}>
                {(viewRow.models || []).length === 0 ? (
                  <span className="text-admin-muted">
                    No models mapped yet — this box will not answer any search.
                  </span>
                ) : (
                  <div className="mt-1 space-y-3">
                    {groupByBrand(viewRow.models).map((g) => (
                      <div key={g.key} className="rounded-xl border border-admin-border p-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {g.brandName}
                          <span className="ml-2 text-xs font-normal text-admin-muted">
                            {g.models.length} model{g.models.length === 1 ? '' : 's'}
                          </span>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {g.models.map((m) => (
                            <span
                              key={m.modelId}
                              className="rounded-full bg-admin-dark border border-admin-border px-2.5 py-1 text-xs text-slate-800"
                            >
                              {m.modelName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Field>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Reference image">
                {viewRow.referenceImageUrl ? (
                  <a
                    href={viewRow.referenceImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-col gap-1.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewRow.referenceImageUrl}
                      alt={`Part in box ${viewRow.boxNo}`}
                      className="h-40 w-40 rounded-lg border border-admin-border object-cover"
                    />
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-admin-accent hover:underline">
                      Open full size <ExternalLink className="h-3 w-3" />
                    </span>
                  </a>
                ) : (
                  <span className="text-admin-muted">No photo uploaded.</span>
                )}
              </Field>
              <Field label="Note">
                {viewRow.notes
                  ? <span className="whitespace-pre-wrap">{viewRow.notes}</span>
                  : <span className="text-admin-muted">—</span>}
              </Field>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Created">{formatStamp(viewRow.createdAt)}</Field>
              <Field label="Last updated">{formatStamp(viewRow.updatedAt)}</Field>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewRow(null)}
                className="rounded-lg px-4 py-2 text-slate-600 hover:bg-admin-dark"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => { const row = viewRow; setViewRow(null); openEdit(row); }}
                className="inline-flex items-center gap-2 rounded-lg bg-admin-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Part types drive the sidebar's child entries, so this is where the menu
          is actually edited. */}
      {typeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-admin-card border border-admin-border p-6">
            <h2 className="text-lg font-medium text-slate-900">Part types</h2>
            <p className="mt-1 text-sm text-admin-muted">
              Each type is one entry under Model Compatibility in the sidebar.
            </p>

            <div className="mt-4 space-y-2">
              {types.length === 0 && <p className="text-sm text-admin-muted">No types yet.</p>}
              {types.map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg border border-admin-border px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{t.name}</span>
                  <code className="shrink-0 text-[11px] text-admin-muted">?type={t.slug}</code>
                  <button
                    type="button"
                    onClick={() => renameType(t)}
                    className="shrink-0 rounded-lg p-1.5 text-admin-accent hover:bg-blue-50"
                    title="Rename"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteType(t)}
                    className="shrink-0 rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={addType} className="mt-4 flex gap-2">
              <input
                type="text"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="New type, e.g. Back Panel"
                className="flex-1 rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
              />
              <button
                type="submit"
                disabled={typeBusy}
                className="rounded-lg bg-admin-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {typeBusy ? 'Adding…' : 'Add'}
              </button>
            </form>

            {typeError && <p className="mt-3 text-sm text-red-600">{typeError}</p>}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setTypeModal(false)}
                className="rounded-lg px-4 py-2 text-slate-600 hover:bg-admin-dark"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-admin-card border border-admin-border p-6">
            <h2 className="text-lg font-medium text-slate-900 mb-4">
              {modal.type === 'create'
                ? 'Add compatibility box'
                : `Edit ${modal.row.boxName} - ${modal.row.boxNo}`}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-admin-muted mb-1">Part type</label>
                <select
                  value={partTypeId}
                  onChange={(e) => setPartTypeId(e.target.value)}
                  className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                >
                  <option value="">No type (shows only under “Model Compatibility”)</option>
                  {types.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
                <p className="mt-1 text-xs text-admin-muted">
                  Decides which sidebar entry this box appears under.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-admin-muted mb-1">Box No</label>
                  <input
                    type="text"
                    value={boxNo}
                    onChange={(e) => setBoxNo(e.target.value)}
                    className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                    placeholder="A-12"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-admin-muted mb-1">Box Name</label>
                  <input
                    type="text"
                    value={boxName}
                    onChange={(e) => setBoxName(e.target.value)}
                    className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                    placeholder="Display Combo — 6.5 inch"
                    required
                  />
                </div>
              </div>

              {/* Compatible Brands & Models */}
              <div className="rounded-xl border border-admin-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Compatible Brands &amp; Models
                    {selectedCount > 0 && (
                      <span className="ml-2 text-xs font-normal text-admin-muted">
                        {selectedCount} model{selectedCount === 1 ? '' : 's'} selected
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={addBlock}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-admin-dark"
                  >
                    <Plus className="h-4 w-4" /> Add Brand
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {blocks.map((block) => {
                    const models = modelsByBrand[block.brandId] || [];
                    const isLoading = loadingBrands.includes(block.brandId);
                    const q = (modelQuery[block.key] || '').trim().toLowerCase();
                    const visible = q
                      ? models.filter((m) => String(m.name || '').toLowerCase().includes(q))
                      : models;
                    const visibleIds = visible.map((m) => m.id);
                    const allOn = visible.length > 0 && visible.every((m) => block.modelIds.includes(m.id));
                    return (
                      <div key={block.key} className="rounded-xl border border-admin-border p-4">
                        <label className="block text-sm text-admin-muted mb-1">Brand</label>
                        <div className="flex items-center gap-3">
                          <select
                            value={block.brandId}
                            onChange={(e) => setBlockBrand(block.key, e.target.value)}
                            className="flex-1 rounded-lg bg-admin-card border border-admin-border px-3 py-2 text-slate-900 focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
                          >
                            <option value="">Select brand</option>
                            {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeBlock(block.key)}
                            title="Remove this brand"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {block.brandId && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between">
                              <label className="block text-sm text-admin-muted">
                                Models
                                {block.modelIds.length > 0 && (
                                  // Shown because the filter can hide ticked models — without
                                  // this the count of what you have chosen disappears as you type.
                                  <span className="ml-2 text-xs text-admin-accent">
                                    {block.modelIds.length} selected
                                  </span>
                                )}
                              </label>
                              {visible.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setAllModels(block.key, visibleIds, !allOn)}
                                  className="text-xs font-medium text-admin-accent hover:underline"
                                >
                                  {allOn ? 'Clear' : 'Select'} {q ? `${visible.length} shown` : 'all'}
                                </button>
                              )}
                            </div>

                            {models.length > 0 && (
                              <div className="relative mt-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  value={modelQuery[block.key] || ''}
                                  onChange={(e) => setModelQuery((prev) => ({ ...prev, [block.key]: e.target.value }))}
                                  placeholder={`Search ${brandName(block.brandId) || 'models'}…`}
                                  className="w-full rounded-lg border border-admin-border bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
                                />
                              </div>
                            )}

                            <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-admin-border p-3">
                              {isLoading ? (
                                <p className="text-sm text-admin-muted">Loading models…</p>
                              ) : models.length === 0 ? (
                                <p className="text-sm text-admin-muted">This brand has no models yet.</p>
                              ) : visible.length === 0 ? (
                                <p className="text-sm text-admin-muted">No model matches “{modelQuery[block.key]}”.</p>
                              ) : (
                                <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-2">
                                  {visible.map((m) => (
                                    <label key={m.id} className="flex items-center gap-2 text-sm text-slate-800">
                                      <input
                                        type="checkbox"
                                        checked={block.modelIds.includes(m.id)}
                                        onChange={() => toggleModel(block.key, m.id)}
                                        className="h-4 w-4 rounded border-admin-border text-admin-accent focus:ring-admin-accent"
                                      />
                                      <span className="truncate" title={m.name}>{m.name}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {blocks.length === 0 && (
                    <p className="text-sm text-admin-muted">
                      No brands added. Use “Add Brand” to pick the models this box fits.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-admin-muted mb-1">Note</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                  placeholder="Fitment notes, supplier, anything the shop needs to know."
                />
              </div>

              <S3ImageUpload
                value={imageUrl}
                onFileChange={setImageFile}
                label="Reference image"
                caption={
                  modal.type === 'create'
                    ? 'A photo of the part. Uploads to media.ggfix.in right after the box is saved.'
                    : 'A photo of the part. Choosing a new file replaces the current one on save.'
                }
              />

              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-admin-border text-admin-accent focus:ring-admin-accent"
                />
                Active
              </label>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeModal} className="rounded-lg px-4 py-2 text-slate-600 hover:bg-admin-dark">
                  Cancel
                </button>
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
