'use client';

/**
 * /shop-home/account/business-profile — "Business Profile".
 *
 * Card-grid view of every business location on the signed-in owner's
 * account (mirrors the admin's Business Locations table at
 * Client/src/components/BusinessLocationsManager.js, same backend
 * endpoints, same fields — just a card layout instead of a table, and
 * signed with the owner's own token instead of admin_token).
 *
 * Data comes from GET /auth/me (ShopOwnerView.locations[]) via
 * fetchMyProfile() — the same call the "My Profile" page already makes —
 * refetched after every add/edit/delete so the grid never goes stale.
 */

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Plus, Store } from 'lucide-react';

import { cx } from '@/components/site/ui';
import PageHeader from '@/components/shop-dashboard/PageHeader';
import BusinessLocationCard from '@/components/shop-dashboard/BusinessLocationCard';
import LocationFormModal from '@/components/shop-dashboard/LocationFormModal';
import LocationDetailModal from '@/components/shop-dashboard/LocationDetailModal';
import { fetchMyProfile } from '@/lib/shopProfile';
import { addShopLocation, deleteShopLocation, updateShopLocation } from '@/lib/shopLocations';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803D] focus-visible:ring-offset-2';

function ConfirmDeleteDialog({ location, busy, error, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/60 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(16,24,40,0.25)]">
        <h3 className="text-lg font-bold text-[#101828]">Delete this business location?</h3>
        <p className="mt-2 text-sm text-[#667085]">
          Permanently remove &ldquo;{location.name}&rdquo;. This cannot be undone.
        </p>
        {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={cx('rounded-xl border border-[#D0D5DD] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB]', FOCUS_RING)}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cx('rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60', FOCUS_RING)}
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [formState, setFormState] = useState(null); // { mode: 'add'|'edit', initial }
  const [viewingLoc, setViewingLoc] = useState(null);
  const [deletingLoc, setDeletingLoc] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(() => {
    setLoadError('');
    return fetchMyProfile()
      .then((data) => setProfile(data))
      .catch((err) => setLoadError(err.message || 'Could not load your business profile.'));
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const locations = profile?.locations || [];
  const ownerId = profile?.id;

  const handleDelete = async () => {
    if (!deletingLoc) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteShopLocation(ownerId, deletingLoc.id);
      setDeletingLoc(null);
      await load();
    } catch (err) {
      setDeleteError(err.body?.message || err.message || 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const submitLocation = async (payload, { isEdit, ownerId: oid, locationId }) => {
    if (isEdit) await updateShopLocation(oid, locationId, payload);
    else await addShopLocation(oid, payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Profile"
        subtitle="Your shop/business information"
        action={
          <button
            type="button"
            onClick={() => setFormState({ mode: 'add', initial: {} })}
            disabled={!ownerId}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-xl bg-[#15803D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-60',
              FOCUS_RING,
            )}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Business Location
          </button>
        }
      />

      {loadError ? (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{loadError}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[320px] animate-pulse rounded-3xl border border-[#EAECF0] bg-[#F9FAFB]" />
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#EAECF0] bg-white py-16 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]">
            <Store className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-[#101828]">No business locations yet</p>
          <p className="mt-1 max-w-xs text-xs text-[#667085]">Add your first shop location to start taking bookings and pickups from customers nearby.</p>
          <button
            type="button"
            onClick={() => setFormState({ mode: 'add', initial: {} })}
            disabled={!ownerId}
            className={cx('mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#15803D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#166534] disabled:opacity-60', FOCUS_RING)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Business Location
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc, i) => (
            <BusinessLocationCard
              key={loc.id}
              location={loc}
              isMain={i === 0}
              onView={() => setViewingLoc(loc)}
              onEdit={() => setFormState({ mode: 'edit', initial: loc })}
              onDelete={() => { setDeleteError(''); setDeletingLoc(loc); }}
            />
          ))}
        </div>
      )}

      {formState ? (
        <LocationFormModal
          ownerId={ownerId}
          mode={formState.mode}
          initial={formState.initial}
          submit={submitLocation}
          onClose={() => setFormState(null)}
          onSaved={async () => {
            setFormState(null);
            await load();
          }}
        />
      ) : null}

      {viewingLoc ? <LocationDetailModal loc={viewingLoc} onClose={() => setViewingLoc(null)} /> : null}

      {deletingLoc ? (
        <ConfirmDeleteDialog
          location={deletingLoc}
          busy={deleting}
          error={deleteError}
          onCancel={() => { setDeletingLoc(null); setDeleteError(''); }}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}
