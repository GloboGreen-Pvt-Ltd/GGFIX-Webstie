'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { colornames } from 'color-name-list';
import cssColorNames from 'color-name';
import { masterApi } from '@/lib/api';
import { mapPool } from '@/lib/concurrency';
import DataTable from '@/components/DataTable';
import S3ImageUpload from '@/components/S3ImageUpload';
import { replaceModelImage } from '@/lib/modelMedia';

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Split a comma/newline separated string into trimmed, non-empty parts.
const splitNames = (s) => (s || '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

// Model numbers can be pasted several at once, slash / comma / semicolon / newline
// separated (e.g. "MZB0L8AIN/MZB0L88IN"). Split into clean parts.
const splitNumbers = (s) => (s || '').split(/[/,;\n]/).map((x) => x.trim()).filter(Boolean);

// Normalise a model's model_number to a clean array of codes. It can arrive as:
//   • a real jsonb array (post-migration)        -> ["A","B"]
//   • a plain slash/comma string (legacy varchar) -> "A / B"
//   • JSON *text* of an array or a quoted string, if a save happened while the
//     column was still varchar -> '["A","B"]' or '"A,B"'. Parse those so the
//     brackets/quotes don't leak into the chips.
const asNumberList = (mn) => {
  if (Array.isArray(mn)) return mn.map((x) => String(x).trim()).filter(Boolean);
  if (mn == null) return [];
  let s = String(mn).trim();
  if (!s) return [];
  if (s[0] === '[' || s[0] === '"') {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
      if (typeof parsed === 'string') s = parsed; // unwrap "A,B" then split below
    } catch { /* not valid JSON — fall through to a plain split */ }
  }
  // Split, then strip any stray quote/bracket chars a half-migrated value left behind.
  return splitNumbers(s).map((x) => x.replace(/^["[\]]+|["[\]]+$/g, '').trim()).filter(Boolean);
};

const DEFAULT_SWATCH = '#9CA3AF';
const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, x | 0)).toString(16).padStart(2, '0')).join('');

// The 148 CSS keyword colors (gold, gray, black, green, teal, …) → hex. Covers
// base color nouns so "Passion Red" still resolves via its "red" word.
const CSS_HEX = new Map(Object.entries(cssColorNames).map(([k, [r, g, b]]) => [k, rgbToHex(r, g, b)]));

// ~32k community-named colors (marketing shades like "Champagne Gold" → #e8d6b3,
// "Rose Red", "Starlight"). Built once, lazily, on first color lookup.
let NAMED_HEX = null;
const namedHex = () => {
  if (!NAMED_HEX) NAMED_HEX = new Map(colornames.map((c) => [c.name.toLowerCase(), c.hex]));
  return NAMED_HEX;
};

// Normalize any stored value to a 6-digit hex an <input type="color"> accepts.
const toColorInput = (h) => {
  const s = String(h || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) return '#' + s.slice(1).split('').map((c) => c + c).join('');
  return DEFAULT_SWATCH;
};

// An explicit "#abc" / "#aabbcc" / "rgb(r,g,b)" the admin typed directly.
function parseLiteralColor(n) {
  if (/^#[0-9a-f]{6}$/.test(n)) return n;
  if (/^#[0-9a-f]{3}$/.test(n)) return '#' + n.slice(1).split('').map((c) => c + c).join('');
  const m = n.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/);
  if (m) return rgbToHex(+m[1], +m[2], +m[3]);
  return null;
}

// Resolve a free-form color name to a swatch hex, fully automatically — no
// hand-maintained table. Priority:
//   1. an explicit hex / rgb() value
//   2. the exact name in the ~32k community color list ("Champagne Gold" → #e8d6b3)
//   3. the exact CSS keyword ("gold", "teal")
//   4. word fallback, base-noun-first ("Passion Red" → red), so an unknown
//      descriptor still lands on the right base color.
function guessColorHex(name) {
  const n = String(name || '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (!n) return DEFAULT_SWATCH;
  const literal = parseLiteralColor(n);
  if (literal) return literal;
  const named = namedHex();
  if (named.has(n)) return named.get(n);
  if (CSS_HEX.has(n)) return CSS_HEX.get(n);
  const words = n.split(' ');
  for (let i = words.length - 1; i >= 0; i--) {
    if (CSS_HEX.has(words[i])) return CSS_HEX.get(words[i]);
    if (named.has(words[i])) return named.get(words[i]);
  }
  return DEFAULT_SWATCH;
}

// Parse a "RAM + Storage" chip like "6 GB + 128 GB" into option values.
function parseSpec(s) {
  const parts = String(s || '').split('+').map((x) => x.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const ramValue = parseInt(parts[0], 10);
  const storageValue = parseInt(parts[1], 10);
  if (!ramValue || !storageValue) return null;
  const ramLabel = parts[0].replace(/\s+/g, ' ');
  const storageLabel = parts[1].replace(/\s+/g, ' ');
  return { ramValue, storageValue, ramLabel, storageLabel, label: `${ramLabel} + ${storageLabel}` };
}

// Parse a storage-only chip like "128 GB" / "256 GB" into a storage option value.
// Used when the model's storage type is "Storage only" (no RAM half).
function parseStorageOnly(s) {
  const label = String(s || '').replace(/\s+/g, ' ').trim();
  if (!label) return null;
  const storageValue = parseInt(label, 10);
  if (!storageValue) return null;
  return { storageOnly: true, storageValue, storageLabel: label, label };
}

// Small on/off toggle switch. Used for a model's "Sell Active" flag in the table
// and the edit form (green = shown in the Sell flow, grey = hidden).
function ToggleSwitch({ on, onClick, title, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function MasterModelsPage() {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [allSeries, setAllSeries] = useState([]);

  // Table filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterSeries, setFilterSeries] = useState('');

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total } while aggregating
  const [error, setError] = useState('');

  // Form state
  const [modal, setModal] = useState(null);
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formBrandId, setFormBrandId] = useState('');
  const [formSeriesId, setFormSeriesId] = useState('');
  const [name, setName] = useState('');
  // Model numbers are chips (a model can carry several regional codes); persisted
  // inline on the model as a JSON array (model.modelNumber = [codes]).
  const [modelNumberInput, setModelNumberInput] = useState('');
  const [modelNumbers, setModelNumbers] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  // Held until the row has an id: the S3 key is derived from the model's stored
  // category/brand/series/name, so the record must exist before the upload.
  const [imageFile, setImageFile] = useState(null);
  const [category, setCategory] = useState('DEVICE');
  const [sellActive, setSellActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Global option sets (for resolving / creating colors + ram/storage on save)
  const [allColors, setAllColors] = useState([]);
  const [ramOptions, setRamOptions] = useState([]);
  const [storageOptions, setStorageOptions] = useState([]);

  // Per-model colors + RAM/storage chips — persisted inline on the model as
  // JSON arrays (model.colors = [names], model.ramStorage = [labels]).
  const [colorInput, setColorInput] = useState('');
  const [colorChips, setColorChips] = useState([]);   // [{ name, hex, colorId?, hexTouched? }]
  const [pendingHex, setPendingHex] = useState(null);  // swatch picked next to the input, before the chip is added
  const [specInput, setSpecInput] = useState('');
  const [specChips, setSpecChips] = useState([]);      // [{ label, ramValue, storageValue, ramLabel, storageLabel, ramId?, storageId?, storageOnly? }]
  // 'RAM_STORAGE' -> chips are "6 GB + 128 GB" combos; 'STORAGE_ONLY' -> chips are
  // plain "128 GB" sizes. Inferred from the model on edit; drives the input parser.
  const [storageMode, setStorageMode] = useState('RAM_STORAGE');

  const resolveMappingId = (categoryId, brandId) =>
    mappings.find((m) => m.categoryId === categoryId && m.brandId === brandId)?.id || null;

  // ---- Reference data
  const loadRefData = async () => {
    try {
      const [cats, brs, maps] = await Promise.all([
        masterApi.get('/master/device-categories').catch(() => []),
        // null (not []) so a failed fetch is distinguishable from "no brands" —
        // swallowing it renders as a bare "No models." with nothing explaining why.
        masterApi.get('/master/brands').catch(() => null),
        masterApi.get('/master/category-brand-mappings').catch(() => []),
      ]);
      if (brs === null) {
        setBrands([]);
        setError('Could not load the brand list — the master-data service is not responding. It restarts on its own after about a minute; press Refresh then.');
        return;
      }
      const catArr = Array.isArray(cats) ? cats : cats?.content ?? [];
      const brandArr = Array.isArray(brs) ? brs : brs?.content ?? [];
      const mapArr = Array.isArray(maps) ? maps : maps?.content ?? [];
      setCategories(catArr);
      setBrands(brandArr);
      setMappings(mapArr);

      // Pre-fetch all series across mappings so the form can resolve series → mapping → (cat, brand).
      // Bounded pool rather than one-at-a-time: this is dozens of round-trips and
      // was the slowest part of loading the page.
      const allSeriesAcc = [];
      await mapPool(mapArr, 6, async (m) => {
        const rows = await masterApi.get(`/master/category-brand-mappings/${m.id}/series`).catch(() => []);
        if (Array.isArray(rows)) allSeriesAcc.push(...rows);
      });
      setAllSeries(allSeriesAcc);
    } catch (e) {
      setError(e.message || 'Failed to load reference data');
    }
  };
  useEffect(() => { loadRefData(); }, []);

  // Colors + RAM + Storage master options — the global palettes/labels. Colors +
  // RAM/storage now live INLINE on each model (model.colors / model.ramStorage);
  // these master lists are kept only to resolve a colour name → swatch hex and to
  // find-or-create the palette rows the mobile pickers resolve labels against.
  const loadOptionSets = async () => {
    const [cols, rams, stos] = await Promise.all([
      masterApi.get('/master/colors').catch(() => []),
      masterApi.get('/master/ram-options').catch(() => []),
      masterApi.get('/master/storage-options').catch(() => []),
    ]);
    setAllColors(Array.isArray(cols) ? cols : cols?.content ?? []);
    setRamOptions(Array.isArray(rams) ? rams : rams?.content ?? []);
    setStorageOptions(Array.isArray(stos) ? stos : stos?.content ?? []);
  };
  useEffect(() => { loadOptionSets(); }, []);

  // Cascading filter helpers
  const brandsForCategory = useMemo(() => {
    if (!filterCategory) return brands;
    const allowed = new Set(mappings.filter((m) => m.categoryId === filterCategory).map((m) => m.brandId));
    return brands.filter((b) => allowed.has(b.id));
  }, [filterCategory, brands, mappings]);

  const seriesForFilter = useMemo(() => {
    if (filterCategory && filterBrand) {
      const id = resolveMappingId(filterCategory, filterBrand);
      return id ? allSeries.filter((s) => s.categoryBrandId === id) : [];
    }
    if (filterCategory) {
      const ids = new Set(mappings.filter((m) => m.categoryId === filterCategory).map((m) => m.id));
      return allSeries.filter((s) => ids.has(s.categoryBrandId));
    }
    if (filterBrand) {
      const ids = new Set(mappings.filter((m) => m.brandId === filterBrand).map((m) => m.id));
      return allSeries.filter((s) => ids.has(s.categoryBrandId));
    }
    return allSeries;
  }, [allSeries, mappings, filterCategory, filterBrand]);

  useEffect(() => {
    if (filterBrand && !brandsForCategory.some((b) => b.id === filterBrand)) setFilterBrand('');
  }, [filterBrand, brandsForCategory]);
  useEffect(() => {
    if (filterSeries && !seriesForFilter.some((s) => s.id === filterSeries)) setFilterSeries('');
  }, [filterSeries, seriesForFilter]);

  // ---- Models list
  // With no brand/series chosen this lists EVERY model, which means one
  // /master/brands/{id}/models request per brand — master-data has no list-all
  // endpoint. Whole sweep is ~8.8 MB / ~3s and returns all 1397 models.
  //
  // It used to be ~206 MB, because 103 models stored their image inline as a
  // multi-MB base64 data URI: Nokia's list alone was 83 MB, which the service
  // (JVM capped at -Xmx384m) could not serialize at all, so those brands were
  // simply unlistable and every sweep OOM-killed the service. Those images were
  // resized/re-encoded in place on 2026-08-02 (198 MB -> 7.9 MB).
  //
  // The resilience below — one brand at a time, wait for the service if one
  // fails, series-by-series retry, keep partial results — is what made the page
  // survive that. It is cheap when nothing fails, so it stays as a guard against
  // oversized images being uploaded again.
  const seriesByBrandRef = useRef(new Map());
  useEffect(() => {
    const brandOfMapping = new Map(mappings.map((m) => [m.id, m.brandId]));
    const idx = new Map();
    for (const s of allSeries) {
      const bId = brandOfMapping.get(s.categoryBrandId);
      if (!bId) continue;
      if (!idx.has(bId)) idx.set(bId, []);
      idx.get(bId).push(s);
    }
    seriesByBrandRef.current = idx;
  }, [mappings, allSeries]);

  const loadModels = async () => {
    const aggregate = !filterBrand && !filterSeries;
    if (aggregate && !brands.length) return; // wait until brands land
    setLoading(true);
    setError('');
    setProgress(aggregate ? { done: 0, total: brands.length } : null);
    try {
      if (!aggregate) {
        const path = filterSeries
          ? `/master/series/${filterSeries}/models`
          : `/master/brands/${filterBrand}/models`;
        const rows = await masterApi.get(path);
        setList(Array.isArray(rows) ? rows : []);
        return;
      }

      // One brand: whole list, else series-by-series so it arrives in pieces the
      // service can actually serialize. null = couldn't get it at all.
      const fetchBrand = async (b) => {
        const id = b.id ?? b.brandId;
        if (!id) return [];
        const rows = await masterApi.get(`/master/brands/${id}/models`).catch(() => null);
        if (rows) return Array.isArray(rows) ? rows : [];
        const series = seriesByBrandRef.current.get(id) || [];
        const parts = [];
        let anyOk = false;
        for (const s of series) {
          const r = await masterApi.get(`/master/series/${s.id}/models`).catch(() => null);
          if (Array.isArray(r)) { parts.push(...r); anyOk = true; }
        }
        return anyOk ? parts : null;
      };

      const acc = [];
      let done = 0;
      const tick = () => setProgress({ done: ++done, total: brands.length });

      // Poll until master-data answers again, so the brands queued behind a
      // failure aren't fired at a process that is still restarting.
      const waitForService = async (tries = 12, gapMs = 5000) => {
        for (let i = 0; i < tries; i++) {
          await new Promise((r) => setTimeout(r, gapMs));
          const ok = await masterApi.get('/master/brands').then(() => true).catch(() => false);
          if (ok) return true;
        }
        return false;
      };

      // Pass 1 — strictly one brand at a time, i.e. exactly the request the
      // single-brand selector makes, which is known to work. Running two in
      // flight meant an oversized brand (Nokia is 83 MB) took whichever brand
      // was paired with it down as well: Honor answers in 0.5s on its own but
      // failed purely as collateral.
      const failed = [];
      for (const b of brands) {
        const rows = await fetchBrand(b);
        if (rows) {
          acc.push(...rows);
        } else {
          failed.push(b);
          await waitForService(); // that brand most likely just OOM'd the service
        }
        tick();
      }

      // Pass 2 — a brand that is not itself oversized can still fail as collateral:
      // when a genuinely huge brand OOMs the service, whatever was in flight beside
      // it dies too, as does anything issued during the ~30-60s systemd restart.
      // Retry those once, serially, by which time the service is usually back.
      const stillFailed = [];
      if (failed.length) {
        setProgress({ done: brands.length, total: brands.length });
        await new Promise((r) => setTimeout(r, 4000)); // let the service come back
        for (const b of failed) {
          const rows = await fetchBrand(b);
          if (rows) acc.push(...rows); else stillFailed.push(b.name || b.id);
        }
      }

      setList(acc);
      if (stillFailed.length) {
        // Note when this fires: a brand that fails twice is usually carrying an
        // oversized inline image again (the service cannot build the response),
        // not a transient blip — those were shrunk once already.
        setError(
          `${stillFailed.length} of ${brands.length} brands could not be loaded (${stillFailed.join(', ')}). ` +
          `Usually this means the master-data service could not build the response — most often a model in that ` +
          `brand has an oversized image stored inline instead of as a URL.`
        );
      }
    } catch (e) {
      setError(e.message || 'Failed to load');
      setList([]);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };
  useEffect(() => { loadModels(); }, [filterBrand, filterSeries, brands]);

  // Category is a pure client-side narrowing of the rows already fetched — a
  // model's category comes from its series → mapping. Kept out of loadModels so
  // changing the category doesn't refetch.
  const visibleList = useMemo(() => {
    if (!filterCategory) return list;
    const categoryOfMapping = new Map(mappings.map((m) => [m.id, m.categoryId]));
    const seriesById = new Map(allSeries.map((s) => [s.id, s]));
    return list.filter((m) => {
      const s = seriesById.get(m.seriesId);
      const cid = s ? categoryOfMapping.get(s.categoryBrandId) : m.categoryId;
      return !cid || cid === filterCategory; // keep unresolvable rows rather than hiding them
    });
  }, [list, filterCategory, mappings, allSeries]);

  // ---- Form
  const formBrandOptions = useMemo(() => {
    if (!formCategoryId) return brands;
    const allowed = new Set(mappings.filter((m) => m.categoryId === formCategoryId).map((m) => m.brandId));
    return brands.filter((b) => allowed.has(b.id));
  }, [formCategoryId, brands, mappings]);

  const formSeriesOptions = useMemo(() => {
    if (!formCategoryId || !formBrandId) return [];
    const mid = resolveMappingId(formCategoryId, formBrandId);
    return mid ? allSeries.filter((s) => s.categoryBrandId === mid) : [];
  }, [allSeries, formCategoryId, formBrandId, mappings]);

  const openCreate = () => {
    setModal({ type: 'create' });
    setFormCategoryId(filterCategory || categories[0]?.id || '');
    setFormBrandId(filterBrand || '');
    setFormSeriesId(filterSeries || '');
    setName('');
    setModelNumberInput(''); setModelNumbers([]);
    setImageUrl('');
    setImageFile(null);
    setCategory('DEVICE');
    setSellActive(true);
    setColorInput(''); setColorChips([]);
    setSpecInput(''); setSpecChips([]);
    setStorageMode('RAM_STORAGE');
  };

  const openEdit = (item) => {
    setModal({ type: 'edit', item });
    // Reverse-resolve from seriesId → mapping → (category, brand)
    const s = allSeries.find((x) => x.id === item.seriesId);
    const map = s ? mappings.find((m) => m.id === s.categoryBrandId) : null;
    setFormCategoryId(map?.categoryId || item.categoryId || '');
    setFormBrandId(map?.brandId || item.brandId || '');
    setFormSeriesId(item.seriesId || '');
    setName(item.name || '');
    setModelNumberInput(''); setModelNumbers(asNumberList(item.modelNumber));
    setImageUrl(item.imageUrl || '');
    setCategory(item.category || 'DEVICE');
    setSellActive(item.sellActive !== false);
    // Colours + RAM/storage come straight off the model's inline JSON arrays.
    setColorInput(''); setSpecInput('');
    const cChips = (Array.isArray(item.colors) ? item.colors : []).map((name) => {
      const col = allColors.find((c) => c.name?.toLowerCase() === String(name).toLowerCase());
      return { name, hex: col?.hexCode || guessColorHex(name), colorId: col?.id };
    });
    const rawSpecs = Array.isArray(item.ramStorage) ? item.ramStorage : [];
    // A model is storage-only when it has specs and none of them use the "+" combo.
    const modeIsStorageOnly = rawSpecs.length > 0 && rawSpecs.every((l) => !String(l).includes('+'));
    setStorageMode(modeIsStorageOnly ? 'STORAGE_ONLY' : 'RAM_STORAGE');
    const sChips = rawSpecs
      .map((label) => {
        if (String(label).includes('+')) {
          const spec = parseSpec(label);
          if (spec) {
            const ram = ramOptions.find((r) => r.valueGb === spec.ramValue);
            const sto = storageOptions.find((s) => s.valueGb === spec.storageValue);
            return { ...spec, ramId: ram?.id, storageId: sto?.id };
          }
        } else {
          const st = parseStorageOnly(label);
          if (st) {
            const sto = storageOptions.find((s) => s.valueGb === st.storageValue);
            return { ...st, storageId: sto?.id };
          }
        }
        // Keep an unparseable stored label visible rather than silently dropping it.
        return { label: String(label), label_raw: true };
      })
      .filter(Boolean);
    setColorChips(cChips); setSpecChips(sChips);
  };
  const closeModal = () => setModal(null);

  // ---- Color chips ----
  const addColorChips = () => {
    const parts = splitNames(colorInput);
    if (!parts.length) return;
    // A color picked in the input's preview swatch overrides the auto-guess — but only
    // for a single typed name (a comma-list has no single swatch to apply it to).
    const override = parts.length === 1 ? pendingHex : null;
    setColorChips((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (next.some((x) => x.name.toLowerCase() === p.toLowerCase())) continue;
        const existing = allColors.find((c) => c.name.toLowerCase() === p.toLowerCase());
        if (existing) {
          next.push(override
            ? { name: existing.name, hex: override, colorId: existing.id, hexTouched: true }
            : { name: existing.name, hex: existing.hexCode || guessColorHex(existing.name), colorId: existing.id });
        } else {
          next.push({ name: p, hex: override || guessColorHex(p) });
        }
      }
      return next;
    });
    setColorInput('');
    setPendingHex(null);
  };
  const removeColorChip = (idx) => setColorChips((prev) => prev.filter((_, i) => i !== idx));
  // Fine-tune a swatch to match the real product color.
  const updateColorHex = (idx, hex) => setColorChips((prev) => prev.map((c, i) => (i === idx ? { ...c, hex, hexTouched: true } : c)));

  // ---- Model number chips ----
  const addModelNumberChips = () => {
    const parts = splitNumbers(modelNumberInput);
    if (!parts.length) return;
    setModelNumbers((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
      }
      return next;
    });
    setModelNumberInput('');
  };
  const removeModelNumberChip = (idx) => setModelNumbers((prev) => prev.filter((_, i) => i !== idx));

  // ---- RAM + Storage chips ----
  const addSpecChips = () => {
    const parts = splitNames(specInput);
    if (!parts.length) return;
    let bad = false;
    setSpecChips((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (storageMode === 'STORAGE_ONLY') {
          const st = parseStorageOnly(p);
          if (!st) { bad = true; continue; }
          const key = `s:${st.storageValue}`;
          if (next.some((x) => x.storageOnly && `s:${x.storageValue}` === key)) continue;
          const sto = storageOptions.find((s) => s.valueGb === st.storageValue);
          next.push({ ...st, storageId: sto?.id });
        } else {
          const spec = parseSpec(p);
          if (!spec) { bad = true; continue; }
          const key = `${spec.ramValue}+${spec.storageValue}`;
          if (next.some((x) => !x.storageOnly && `${x.ramValue}+${x.storageValue}` === key)) continue;
          const ram = ramOptions.find((r) => r.valueGb === spec.ramValue);
          const sto = storageOptions.find((s) => s.valueGb === spec.storageValue);
          next.push({ ...spec, ramId: ram?.id, storageId: sto?.id });
        }
      }
      return next;
    });
    if (bad) setError(storageMode === 'STORAGE_ONLY'
      ? 'Use a storage size, e.g. 128 GB.'
      : 'Use the format "RAM + Storage", e.g. 6 GB + 128 GB.');
    setSpecInput('');
  };
  const removeSpecChip = (idx) => setSpecChips((prev) => prev.filter((_, i) => i !== idx));

  // Switching storage type drops chips of the other shape so a model never mixes
  // "6 GB + 128 GB" combos with plain "128 GB" sizes.
  const changeStorageMode = (mode) => {
    setStorageMode(mode);
    setSpecInput('');
    setSpecChips((prev) => prev.filter((c) => (mode === 'STORAGE_ONLY' ? c.storageOnly : !c.storageOnly)));
  };

  // Colours + RAM/storage are stored inline on the model as name/label strings.
  // The global master_colors / ram / storage rows are still kept in sync so the
  // swatch hex persists and the mobile pickers can resolve a label → option UUID.
  // No per-model master_model_variant rows are created any more.
  const persistPalette = async () => {
    for (const c of colorChips) {
      const existing = allColors.find((x) => x.name?.toLowerCase() === c.name.toLowerCase());
      if (!existing) {
        await masterApi.post('/master/colors', { name: c.name, hexCode: c.hex }).catch(() => {});
      } else if (c.hexTouched) {
        // Admin fine-tuned an existing colour's swatch — persist the corrected hex.
        await masterApi.put(`/master/colors/${existing.id}`, { name: existing.name, hexCode: c.hex }).catch(() => {});
      }
    }
    for (const s of specChips) {
      if (s.ramValue && !ramOptions.some((r) => r.valueGb === s.ramValue)) {
        await masterApi.post('/master/ram-options', { valueGb: s.ramValue, label: s.ramLabel || `${s.ramValue} GB` }).catch(() => {});
      }
      if (s.storageValue && !storageOptions.some((r) => r.valueGb === s.storageValue)) {
        await masterApi.post('/master/storage-options', { valueGb: s.storageValue, label: s.storageLabel || `${s.storageValue} GB` }).catch(() => {});
      }
    }
    loadOptionSets();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !formBrandId) return;
    setSubmitting(true);
    setError('');
    try {
      // Fold any code still sitting in the input (user typed but didn't press Enter).
      const allModelNumbers = [...modelNumbers];
      for (const p of splitNumbers(modelNumberInput)) {
        if (!allModelNumbers.some((x) => x.toLowerCase() === p.toLowerCase())) allModelNumbers.push(p);
      }
      const body = {
        brandId: formBrandId,
        categoryId: formCategoryId || null,
        seriesId: formSeriesId || null,
        name: name.trim(),
        modelNumber: allModelNumbers,
        // Slug is no longer edited in the UI; keep it auto-generated so the
        // (series_id, slug) unique constraint and legacy consumers keep working.
        slug: slugify(name),
        imageUrl: imageUrl.trim() || null,
        category: category || null,
        sellActive,
        // Inline options: colours as names, RAM+storage as "6 GB + 128 GB" labels.
        colors: colorChips.map((c) => c.name),
        ramStorage: specChips.map((s) => s.label),
      };
      // Save first, then upload. The image endpoint is id-scoped because the S3 key
      // comes from the model's stored taxonomy, not from anything the client sends.
      let modelId = modal.type === 'create' ? null : modal.item.id;
      if (modal.type === 'create') {
        const created = await masterApi.post('/master/models', body);
        modelId = created?.id || null;
      } else {
        await masterApi.put(`/master/models/${modal.item.id}`, body);
      }
      if (imageFile && modelId) {
        await replaceModelImage(modelId, imageFile);
      }
      await persistPalette();
      closeModal();
      loadModels();
    } catch (e) {
      setError(e.body?.message || e.message || 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Flip a model's Sell-flow visibility from the table switch. Optimistic —
  // update the row immediately, revert if the PATCH fails.
  const toggleSellActive = async (row) => {
    const next = row.sellActive === false; // currently off → turn on, else turn off
    setList((prev) => prev.map((m) => (m.id === row.id ? { ...m, sellActive: next } : m)));
    try {
      await masterApi.patch(`/master/models/${row.id}/sell-active`, { sellActive: next });
    } catch (e) {
      setList((prev) => prev.map((m) => (m.id === row.id ? { ...m, sellActive: !next } : m)));
      setError(e.body?.message || e.message || 'Failed to update Sell Active');
    }
  };

  const handleDelete = async (row) => {
    if (!confirm('Delete this model?')) return;
    try {
      await masterApi.delete(`/master/models/${row.id}`);
      loadModels();
    } catch (e) {
      setError(e.body?.message || e.message || 'Delete failed');
    }
  };

  const nameById = {
    cat: (id) => categories.find((c) => c.id === id)?.name,
    brand: (id) => brands.find((b) => b.id === id)?.name,
    series: (id) => allSeries.find((s) => s.id === id)?.name,
  };

  // modelId → its distinct colors ({name, hex}) and RAM+Storage labels, read
  // straight off each model's inline colors / ramStorage JSON arrays. The colour
  // swatch hex is resolved from the master palette by name, falling back to the
  // auto-detected guess.
  const variantsByModel = useMemo(() => {
    const colorByName = new Map(allColors.map((c) => [String(c.name).toLowerCase(), c]));
    const map = new Map();
    for (const m of list) {
      if (!m.id) continue;
      const colors = (Array.isArray(m.colors) ? m.colors : []).map((name) => {
        const col = colorByName.get(String(name).toLowerCase());
        return { name, hex: col?.hexCode || guessColorHex(name) };
      });
      const specs = Array.isArray(m.ramStorage) ? m.ramStorage : [];
      map.set(m.id, { colors, specs });
    }
    return map;
  }, [list, allColors]);

  // Resolve a model's category name via series → mapping, falling back to categoryId.
  const categoryNameOf = (r) => {
    const s = allSeries.find((x) => x.id === r.seriesId);
    const map = s ? mappings.find((m) => m.id === s.categoryBrandId) : null;
    return nameById.cat(map?.categoryId || r.categoryId);
  };

  const columns = [
    {
      key: 'category',
      label: 'Category',
      search: (r) => categoryNameOf(r),
      render: (r) => categoryNameOf(r) || '—',
    },
    { key: 'brand', label: 'Brand', search: (r) => nameById.brand(r.brandId), render: (r) => nameById.brand(r.brandId) || '—' },
    { key: 'series', label: 'Series', search: (r) => nameById.series(r.seriesId), render: (r) => nameById.series(r.seriesId) || '—' },
    { key: 'name', label: 'Model' },
    {
      key: 'modelNumber',
      label: 'Model number',
      search: (r) => asNumberList(r.modelNumber).join(' '),
      render: (r) => {
        const ns = asNumberList(r.modelNumber);
        if (!ns.length) return '—';
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {ns.map((n, i) => (
              <span key={i} className="inline-block rounded bg-admin-dark border border-admin-border px-1.5 py-0.5 text-[11px] text-slate-700 whitespace-nowrap">{n}</span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'colors',
      label: 'Colors',
      search: (r) => (variantsByModel.get(r.id)?.colors || []).map((c) => c.name).join(' '),
      render: (r) => {
        const cs = variantsByModel.get(r.id)?.colors || [];
        if (!cs.length) return '—';
        return (
          <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
            {cs.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs text-slate-700" title={c.name}>
                <span className="inline-block h-3 w-3 rounded-full border border-admin-border shrink-0" style={{ backgroundColor: c.hex }} />
                {c.name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'specs',
      label: 'RAM / Storage',
      search: (r) => (variantsByModel.get(r.id)?.specs || []).join(' '),
      render: (r) => {
        const ss = variantsByModel.get(r.id)?.specs || [];
        if (!ss.length) return '—';
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {ss.map((s, i) => (
              <span key={i} className="inline-block rounded bg-admin-dark border border-admin-border px-1.5 py-0.5 text-[11px] text-slate-700 whitespace-nowrap">{s}</span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'imageUrl',
      label: 'Image',
      render: (r) => (r.imageUrl
        ? <img src={r.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
        : '—'),
    },
    {
      key: 'sellActive',
      label: 'Sell Active',
      render: (r) => {
        const on = r.sellActive !== false;
        return (
          <ToggleSwitch
            on={on}
            title={on ? 'Shown in the Sell flow — click to hide' : 'Hidden from the Sell flow — click to show'}
            onClick={() => toggleSellActive(r)}
          />
        );
      },
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Models</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg bg-admin-card border border-admin-border px-3 py-2 text-slate-800 text-sm">
            <option value="">All categories</option>
            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}
            className="rounded-lg bg-admin-card border border-admin-border px-3 py-2 text-slate-800 text-sm">
            <option value="">All brands</option>
            {brandsForCategory.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>
          <select value={filterSeries} onChange={(e) => setFilterSeries(e.target.value)}
            className="rounded-lg bg-admin-card border border-admin-border px-3 py-2 text-slate-800 text-sm">
            <option value="">All series</option>
            {seriesForFilter.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
          <button type="button" onClick={loadModels} disabled={loading}
            title="Reload models"
            className="inline-flex items-center gap-1.5 rounded-lg bg-admin-card border border-admin-border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-admin-dark disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button type="button" onClick={openCreate} disabled={!brands.length}
            className="rounded-lg bg-admin-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            Add model
          </button>
        </div>
      </div>
      <p className="text-admin-muted text-sm mb-4">
        Models live under a series — e.g. <span className="text-slate-600">Mobile + Vivo → Y Series → Vivo Y20</span>.
      </p>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-admin-muted">
          Loading…{progress ? ` (${progress.done} / ${progress.total} brands)` : ''}
        </p>
      ) : (
        <DataTable columns={columns} rows={visibleList} onEdit={openEdit} onDelete={handleDelete} emptyMessage="No models." />
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl flex flex-col max-h-[90vh] rounded-xl bg-admin-card border border-admin-border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border shrink-0">
              <h2 className="text-lg font-medium text-slate-900">
                {modal.type === 'create' ? 'New model' : 'Edit model'}
              </h2>
              <button type="button" onClick={closeModal} aria-label="Close" className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-admin-muted mb-1">Category</label>
                  <select value={formCategoryId}
                    onChange={(e) => { setFormCategoryId(e.target.value); setFormBrandId(''); setFormSeriesId(''); }}
                    className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900" required>
                    <option value="">Select</option>
                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-admin-muted mb-1">Brand</label>
                  <select value={formBrandId}
                    onChange={(e) => { setFormBrandId(e.target.value); setFormSeriesId(''); }}
                    className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                    required disabled={!formCategoryId}>
                    <option value="">Select</option>
                    {formBrandOptions.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-admin-muted mb-1">Series</label>
                  <select value={formSeriesId} onChange={(e) => setFormSeriesId(e.target.value)}
                    className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                    disabled={!formBrandId}>
                    <option value="">— None —</option>
                    {formSeriesOptions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-admin-muted mb-1">Model name</label>
                  <input type="text" value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                    placeholder="e.g. Vivo Y20" required />
                </div>
                <div>
                  <label className="block text-sm text-admin-muted mb-1">Model number</label>
                  <input type="text" value={modelNumberInput}
                    onChange={(e) => setModelNumberInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addModelNumberChips(); } }}
                    onBlur={addModelNumberChips}
                    className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                    placeholder="e.g. MZB0L8AIN — press Enter" />
                  {modelNumbers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {modelNumbers.map((n, i) => (
                        <span key={`${n}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-admin-dark border border-admin-border px-3 py-1 text-xs text-slate-800">
                          {n}
                          <button type="button" onClick={() => removeModelNumberChip(i)} className="text-slate-400 hover:text-slate-700">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-admin-muted">Manufacturer model number(s) — add one at a time; paste several separated by <span className="text-slate-600">/ , ;</span> to split them.</p>
                </div>
              </div>

              {/* Sell Active — controls whether this model appears in the mobile Sell flow */}
              <div className="flex items-center justify-between rounded-lg bg-admin-dark border border-admin-border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-900">Sell Active</p>
                  <p className="text-xs text-admin-muted">When on, this model is shown in the customer Sell / trade-in flow.</p>
                </div>
                <ToggleSwitch
                  on={sellActive}
                  title={sellActive ? 'Shown in the Sell flow' : 'Hidden from the Sell flow'}
                  onClick={() => setSellActive((v) => !v)}
                />
              </div>

              {/* Colors — type a name, swatch auto-detected; each becomes a color-only variant row */}
              <div>
                <label className="block text-sm text-admin-muted mb-1">Colors</label>
                <div className="flex items-center gap-2">
                  <input type="text" value={colorInput}
                    onChange={(e) => { setColorInput(e.target.value); setPendingHex(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColorChips(); } }}
                    onBlur={(e) => { if (e.relatedTarget?.dataset?.swatch) return; addColorChips(); }}
                    className="flex-1 rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                    placeholder="Type ONE color, e.g. Passion Red — then press Enter" />
                  {colorInput.trim() && !colorInput.includes(',') && (
                    <label className="relative inline-flex h-10 w-10 shrink-0" title="Click to pick the exact color, then press Enter">
                      <span className="inline-block h-10 w-10 rounded-lg border border-admin-border" style={{ backgroundColor: pendingHex || guessColorHex(colorInput) }} />
                      <input type="color" data-swatch="1" value={toColorInput(pendingHex || guessColorHex(colorInput))}
                        onChange={(e) => setPendingHex(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColorChips(); } }}
                        onBlur={() => addColorChips()}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                    </label>
                  )}
                </div>
                {colorChips.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {colorChips.map((c, i) => (
                      <span key={`${c.name}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-admin-dark border border-admin-border px-3 py-1 text-xs text-slate-800">
                        <label className="relative inline-flex h-4 w-4" title="Click to fine-tune this color">
                          <span className="inline-block h-4 w-4 rounded-full border border-admin-border" style={{ backgroundColor: c.hex }} />
                          <input type="color" value={toColorInput(c.hex)} onChange={(e) => updateColorHex(i, e.target.value)}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                        </label>
                        {c.name}
                        <button type="button" onClick={() => removeColorChip(i)} className="text-slate-400 hover:text-slate-700">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-admin-muted">Add <span className="text-slate-600">one color at a time</span>: type the name → the swatch beside it shows the detected color → <span className="text-slate-600">click that swatch to pick/eyedrop the exact color</span> → press Enter. Repeat for the next color.</p>
              </div>

              {/* RAM + Storage (or Storage-only) variants — chips saved inline on the model */}
              <div>
                <label className="block text-sm text-admin-muted mb-1">
                  {storageMode === 'STORAGE_ONLY' ? 'Storage variants' : 'RAM + Storage variants'}
                </label>
                {/* Storage type toggle — RAM + Storage combos vs plain storage sizes */}
                <div className="inline-flex rounded-lg border border-admin-border overflow-hidden mb-2 text-sm">
                  <button type="button" onClick={() => changeStorageMode('RAM_STORAGE')}
                    className={`px-3 py-1.5 font-medium ${storageMode === 'RAM_STORAGE' ? 'bg-admin-accent text-white' : 'bg-admin-dark text-slate-700 hover:bg-admin-card'}`}>
                    RAM + Storage
                  </button>
                  <button type="button" onClick={() => changeStorageMode('STORAGE_ONLY')}
                    className={`px-3 py-1.5 font-medium border-l border-admin-border ${storageMode === 'STORAGE_ONLY' ? 'bg-admin-accent text-white' : 'bg-admin-dark text-slate-700 hover:bg-admin-card'}`}>
                    Storage only
                  </button>
                </div>
                <input type="text" value={specInput} onChange={(e) => setSpecInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpecChips(); } }}
                  onBlur={addSpecChips}
                  className="w-full rounded-lg bg-admin-dark border border-admin-border px-3 py-2 text-slate-900"
                  placeholder={storageMode === 'STORAGE_ONLY'
                    ? '128 GB, 256 GB — comma-separated, press Enter'
                    : '4 GB + 128 GB, 6 GB + 128 GB — comma-separated, press Enter'} />
                {specChips.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {specChips.map((s, i) => (
                      <span key={`${s.label}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-admin-accent/20 text-admin-accent px-3 py-1 text-xs">
                        {s.label}
                        <button type="button" onClick={() => removeSpecChip(i)} className="text-admin-accent/80 hover:text-slate-700">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-admin-muted">
                  {storageMode === 'STORAGE_ONLY'
                    ? 'Format: Storage only (e.g. 128 GB) — for devices sold by storage size, without a RAM option.'
                    : 'Format: RAM + Storage (e.g. 6 GB + 128 GB).'}
                </p>
              </div>

              <S3ImageUpload
                value={imageUrl}
                onFileChange={setImageFile}
                label="Model image"
                caption="Hero image for this model (e.g. Vivo Y20)"
              />
            </div>
            <div className="flex gap-2 justify-end px-6 py-4 border-t border-admin-border shrink-0">
              <button type="button" onClick={closeModal} className="rounded-lg px-4 py-2 text-slate-600 hover:bg-admin-dark">Cancel</button>
              <button type="submit" disabled={submitting}
                className="rounded-lg bg-admin-accent px-4 py-2 text-white disabled:opacity-50">
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
