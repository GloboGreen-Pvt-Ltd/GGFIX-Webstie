'use client';

/**
 * Customer saved devices. Add and edit share the customer app's data path:
 * master-data supplies the category/brand/model hierarchy and user-service
 * owns the saved-device record, so both client surfaces stay in sync.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Hash,
  HardDrive,
  Headphones,
  Laptop,
  Pencil,
  Plus,
  Smartphone,
  Star,
  Tablet,
  Trash2,
  Watch,
} from 'lucide-react';

import { Button } from '@/components/site/ui';
import DeviceWizard from '@/components/site/account/DeviceWizard';
import { deleteDevice, listDevices, setDefaultDevice } from '@/lib/customerAccount';
import {
  AccountEmpty,
  AccountError,
  AccountLoader,
  AccountPageHeader,
  Chip,
  Panel,
} from '@/components/site/account/ui';

const CATEGORIES = [
  { code: 'ALL', label: 'All' },
  { code: 'MOBILE', label: 'Phones' },
  { code: 'LAPTOP', label: 'Laptops' },
  { code: 'SMARTWATCH', label: 'Watches' },
  { code: 'TABLET', label: 'Tablets' },
  { code: 'AUDIO', label: 'Audio' },
  { code: 'SPEAKER', label: 'Speakers' },
];

const CAT_ICON = {
  MOBILE: Smartphone,
  LAPTOP: Laptop,
  SMARTWATCH: Watch,
  TABLET: Tablet,
  AUDIO: Headphones,
  SPEAKER: Headphones,
};

const CODE_ALIASES = {
  MOBILE: 'MOBILE', SMARTPHONE: 'MOBILE', SMARTPHONES: 'MOBILE',
  LAPTOP: 'LAPTOP', LAPTOPS: 'LAPTOP',
  SMARTWATCH: 'SMARTWATCH', SMARTWATCHES: 'SMARTWATCH', WATCH: 'SMARTWATCH', WATCHES: 'SMARTWATCH',
  TABLET: 'TABLET', TABLETS: 'TABLET',
  AUDIO: 'AUDIO', AUDIO_DEVICE: 'AUDIO', AUDIO_DEVICES: 'AUDIO',
  SPEAKER: 'SPEAKER', SPEAKERS: 'SPEAKER',
};

const canonicalCode = (code) => {
  const normalized = String(code || '').toUpperCase();
  return CODE_ALIASES[normalized] || normalized || 'OTHER';
};

function deviceName(device) {
  return [device.brandName, device.modelName].filter(Boolean).join(' ') || device.modelName || 'Saved device';
}

function DeviceCard({ device, onSetDefault, onEdit, onDelete, busy }) {
  const Icon = CAT_ICON[canonicalCode(device.categoryCode)] || Smartphone;
  const spec = [device.ramLabel, device.storageLabel].filter(Boolean).join(' / ');

  return (
    <Panel className="p-4 sm:p-5" highlight={device.isDefault}>
      <div className="flex items-start gap-3.5">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[0.95rem] font-bold text-brand-ink">{deviceName(device)}</p>
            {device.isDefault ? (
              <span className="inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-brand-700">Default</span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-muted">
            {device.color ? <span>{device.color}</span> : null}
            {spec ? <span className="inline-flex items-center gap-1"><HardDrive className="h-3.5 w-3.5" aria-hidden="true" />{spec}</span> : null}
            {device.imei ? <span className="inline-flex items-center gap-1"><Hash className="h-3.5 w-3.5" aria-hidden="true" />{device.imei}</span> : null}
          </div>
          {device.note ? <p className="mt-1.5 line-clamp-2 text-xs text-brand-muted">Note: {device.note}</p> : null}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1 border-t border-brand-line pt-3 text-sm">
        <button type="button" onClick={() => onEdit(device)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-sky-700 transition hover:bg-sky-50 disabled:opacity-50">
          <Pencil className="h-4 w-4" aria-hidden="true" />Edit
        </button>
        {!device.isDefault ? (
          <button type="button" onClick={() => onSetDefault(device)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-amber-600 transition hover:bg-amber-50 disabled:opacity-50">
            <Star className="h-4 w-4" aria-hidden="true" />Set default
          </button>
        ) : null}
        <button type="button" onClick={() => onDelete(device)} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50">
          <Trash2 className="h-4 w-4" aria-hidden="true" />Delete
        </button>
      </div>
    </Panel>
  );
}

export default function ManageDevicePage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mutating, setMutating] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [editor, setEditor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDevices(await listDevices());
    } catch (cause) {
      setError(cause?.message || 'Could not load saved devices.');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const map = { ALL: devices.length };
    devices.forEach((device) => {
      const code = canonicalCode(device.categoryCode);
      map[code] = (map[code] || 0) + 1;
    });
    return map;
  }, [devices]);

  const visible = useMemo(
    () => (filter === 'ALL' ? devices : devices.filter((device) => canonicalCode(device.categoryCode) === filter)),
    [devices, filter],
  );

  useEffect(() => {
    if (filter !== 'ALL' && !counts[filter]) setFilter('ALL');
  }, [counts, filter]);

  const onSetDefault = async (device) => {
    setMutating(true);
    try {
      await setDefaultDevice(device.id);
      await load();
    } catch (cause) {
      setError(cause?.message || 'Could not update the default device.');
    } finally {
      setMutating(false);
    }
  };

  const onDelete = async (device) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this saved device?')) return;
    setMutating(true);
    try {
      await deleteDevice(device.id);
      await load();
    } catch (cause) {
      setError(cause?.message || 'Could not delete this device.');
    } finally {
      setMutating(false);
    }
  };

  const onSaved = async () => {
    setEditor(null);
    await load();
  };

  const chips = CATEGORIES.filter((category) => category.code === 'ALL' || counts[category.code]);
  const editing = Boolean(editor?.id);

  return (
    <div>
      <AccountPageHeader
        eyebrow="Manage My Device"
        title={editor ? (editing ? 'Edit device' : 'Add a device') : 'Saved devices'}
        subtitle={editor ? 'The same device catalogue and save logic used in the GGFIX app.' : 'Your devices, ready for faster repair bookings.'}
        right={!editor ? (
          <Button onClick={() => setEditor({})} variant="primary" size="sm" icon={Plus} iconPosition="left">Add device</Button>
        ) : null}
      />

      {editor ? (
        <div className="mt-5">
          <DeviceWizard device={editing ? editor : null} onClose={() => setEditor(null)} onSaved={onSaved} />
        </div>
      ) : (
        <>
          {!loading && !error && devices.length > 0 ? (
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {chips.map((category) => (
                <Chip key={category.code} active={filter === category.code} onClick={() => setFilter(category.code)} count={counts[category.code] || 0}>
                  {category.label}
                </Chip>
              ))}
            </div>
          ) : null}

          <div className="mt-5">
            {loading ? (
              <AccountLoader label="Loading your devices…" />
            ) : error ? (
              <AccountError message={error} onRetry={load} />
            ) : devices.length === 0 ? (
              <AccountEmpty
                icon={Smartphone}
                title="No saved devices yet"
                description="Add a device to speed up your repair bookings."
                action={<Button onClick={() => setEditor({})} variant="primary" size="md" icon={Plus} iconPosition="left">Add device</Button>}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {visible.map((device) => (
                    <DeviceCard key={device.id} device={device} busy={mutating} onSetDefault={onSetDefault} onEdit={setEditor} onDelete={onDelete} />
                  ))}
                </div>
                <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-brand-strong bg-brand-50/40 px-5 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
                  <div><p className="text-sm font-bold text-brand-ink">Add a new device</p><p className="text-xs text-brand-muted">Pick a category, brand, model and configuration.</p></div>
                  <Button onClick={() => setEditor({})} variant="outline" size="sm" icon={Plus} iconPosition="left">Add device</Button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
