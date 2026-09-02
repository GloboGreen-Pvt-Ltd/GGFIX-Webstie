'use client';

/**
 * Manage Address — /account/addresses. Mirrors the app's ManageAddress +
 * AddressForm screens: list of address cards (label icon, one-line address,
 * phone, default badge) with Set default / Edit / Delete, plus an inline
 * create/edit form.
 *
 * Data (all user-service, customer Bearer):
 *   GET/POST   /customer/addresses
 *   PUT/DELETE /customer/addresses/{id}
 *   POST       /customer/addresses/{id}/default
 * `area`/`district`/`taluk` are canonical; `locality`/`city` are dual-written
 * mirrors handled in customerAccount.createAddress/updateAddress.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  Check,
  Home,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

import { Button, cx } from '@/components/site/ui';
import {
  createAddress,
  deleteAddress,
  formatAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from '@/lib/customerAccount';
import {
  AccountEmpty,
  AccountError,
  AccountLoader,
  AccountPageHeader,
  Panel,
} from '@/components/site/account/ui';

const LABELS = ['Home', 'Office', 'Other'];
const LABEL_ICON = { Home, Office: Briefcase, Other: Tag };

const EMPTY_FORM = {
  label: 'Home',
  fullName: '',
  mobile: '',
  addressLine: '',
  area: '',
  taluk: '',
  district: '',
  state: '',
  pincode: '',
  isDefault: false,
};

/* -------------------------------------------------------------------------- */
/* Add / edit form                                                             */
/* -------------------------------------------------------------------------- */

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-brand-ink">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-xl border border-brand-strong bg-white px-3 py-2.5 text-sm text-brand-ink outline-none transition placeholder:text-brand-subtle focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20';

function AddressForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(initial || {}) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e && e.target ? e.target.value : e }));

  const editing = Boolean(initial && initial.id);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim() || !form.mobile.trim() || !form.addressLine.trim() || !form.pincode.trim()) {
      setError('Please fill name, mobile, address and pincode.');
      return;
    }
    setBusy(true);
    try {
      if (editing) await updateAddress(initial.id, form);
      else await createAddress(form);
      onSaved();
    } catch (err) {
      setError(err?.message || "Couldn't save the address. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-brand-ink">
          {editing ? 'Edit address' : 'Add a new address'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close form"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-brand-muted transition hover:bg-brand-soften"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-4">
        {/* Label segmented control */}
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-brand-ink">Label</span>
          <div className="flex gap-2">
            {LABELS.map((l) => {
              const Icon = LABEL_ICON[l];
              const active = form.label === l;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, label: l }))}
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition',
                    active
                      ? 'bg-brand-600 text-white'
                      : 'border border-brand-line bg-white text-brand-muted hover:text-brand-ink',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <input className={inputCls} value={form.fullName} onChange={set('fullName')} placeholder="Your name" />
          </Field>
          <Field label="Mobile" required>
            <input
              className={inputCls}
              value={form.mobile}
              onChange={set('mobile')}
              inputMode="tel"
              placeholder="10-digit mobile"
            />
          </Field>
        </div>

        <Field label="Address (house / street / area line)" required>
          <input className={inputCls} value={form.addressLine} onChange={set('addressLine')} placeholder="Flat, building, street" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Area / locality">
            <input className={inputCls} value={form.area} onChange={set('area')} placeholder="Area" />
          </Field>
          <Field label="Taluk">
            <input className={inputCls} value={form.taluk} onChange={set('taluk')} placeholder="Taluk" />
          </Field>
          <Field label="District / city">
            <input className={inputCls} value={form.district} onChange={set('district')} placeholder="District" />
          </Field>
          <Field label="State">
            <input className={inputCls} value={form.state} onChange={set('state')} placeholder="State" />
          </Field>
          <Field label="Pincode" required>
            <input
              className={inputCls}
              value={form.pincode}
              onChange={set('pincode')}
              inputMode="numeric"
              placeholder="6-digit pincode"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2.5 text-sm font-medium text-brand-ink">
          <input
            type="checkbox"
            checked={Boolean(form.isDefault)}
            onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
            className="h-4 w-4 rounded border-brand-strong text-brand-600 focus:ring-brand-600"
          />
          Set as default address
        </label>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <div className="flex gap-3 pt-1">
          <Button type="submit" variant="primary" size="md" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Save address'}
          </Button>
          <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Address card                                                                */
/* -------------------------------------------------------------------------- */

function AddressCard({ address, onEdit, onDelete, onSetDefault, busy }) {
  const Icon = LABEL_ICON[address.label] || MapPin;
  return (
    <Panel className="p-4 sm:p-5" highlight={address.isDefault}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-700">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-brand-ink">{address.label || 'Address'}</p>
            {address.fullName ? (
              <p className="text-xs text-brand-muted">{address.fullName}</p>
            ) : null}
          </div>
        </div>
        {address.isDefault ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-brand-700">
            <Check className="h-3 w-3" aria-hidden="true" />
            Default
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-start gap-2 text-sm text-brand-ink">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-subtle" aria-hidden="true" />
        <span>{formatAddress(address)}</span>
      </div>
      {address.mobile ? (
        <div className="mt-1.5 flex items-center gap-2 text-sm text-brand-muted">
          <Phone className="h-4 w-4 shrink-0 text-brand-subtle" aria-hidden="true" />
          +91 {address.mobile}
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-1 border-t border-brand-line pt-3 text-sm">
        {!address.isDefault ? (
          <button
            type="button"
            onClick={() => onSetDefault(address)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-brand-700 transition hover:bg-brand-soft disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Set default
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onEdit(address)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-brand-ink transition hover:bg-brand-soften disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(address)}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete
        </button>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function ManageAddressPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mutating, setMutating] = useState(false);
  const [form, setForm] = useState(null); // null = closed, {} = add, {..address} = edit

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAddresses(await listAddresses());
    } catch (e) {
      setError(e?.message || '');
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSetDefault = async (a) => {
    setMutating(true);
    try {
      await setDefaultAddress(a.id);
      await load();
    } catch (e) {
      setError(e?.message || '');
    } finally {
      setMutating(false);
    }
  };

  const onDelete = async (a) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this address?')) return;
    setMutating(true);
    try {
      await deleteAddress(a.id);
      await load();
    } catch (e) {
      setError(e?.message || '');
    } finally {
      setMutating(false);
    }
  };

  const onSaved = async () => {
    setForm(null);
    await load();
  };

  return (
    <div>
      <AccountPageHeader
        eyebrow="Manage Addresses"
        title="Your delivery locations"
        subtitle={addresses.length ? `${addresses.length} saved` : undefined}
        right={
          !form ? (
            <Button variant="primary" size="sm" icon={Plus} iconPosition="left" onClick={() => setForm({})}>
              Add address
            </Button>
          ) : null
        }
      />

      <div className="mt-5 space-y-4">
        {form ? (
          // key remounts the form when the edit target changes, so its useState
          // initializer re-seeds with the new address (otherwise editing B while
          // A's form is open would keep A's values and save them over B).
          <AddressForm
            key={form.id || 'new'}
            initial={form.id ? form : null}
            onCancel={() => setForm(null)}
            onSaved={onSaved}
          />
        ) : null}

        {loading ? (
          <AccountLoader label="Loading addresses…" />
        ) : error ? (
          <AccountError message={error} onRetry={load} />
        ) : addresses.length === 0 && !form ? (
          <AccountEmpty
            icon={MapPin}
            title="No addresses yet"
            description="Add one to get started with pickup and delivery."
            action={
              <Button variant="primary" size="md" icon={Plus} iconPosition="left" onClick={() => setForm({})}>
                Add a new address
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {addresses.map((a) => (
              <AddressCard
                key={a.id}
                address={a}
                busy={mutating}
                onEdit={(addr) => setForm(addr)}
                onDelete={onDelete}
                onSetDefault={onSetDefault}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
