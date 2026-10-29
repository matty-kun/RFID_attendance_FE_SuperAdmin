import { useState, useMemo } from 'react';
import { useLocationsViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { DeleteConfirmationModal } from '../../../components/common/DeleteConfirmationModal';
import type { LocationRecord } from '../models';
import { MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import hawiLooking from '../../../assets/illustrations/Hawi Finding.png';

export const LocationsView = () => {
  const {
    locations, isLoading, error, isModalOpen, setIsModalOpen, isSubmitting, formError,
    name, setName, loadLocations, handleCreate, handleUpdate, handleDelete,
  } = useLocationsViewModel();

  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState<LocationRecord | null>(null);
  const [deleting, setDeleting] = useState<LocationRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const openEdit = (location: LocationRecord) => {
    setEditing(location);
    setEditName(location.name);
    setActionError('');
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !editName.trim()) return;
    setActionBusy(true);
    setActionError('');
    try {
      await handleUpdate(editing.id, editName);
      setEditing(null);
    } catch (error: any) {
      setActionError(error?.response?.data?.error?.message || 'Could not update checkpoint.');
    } finally { setActionBusy(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setActionBusy(true);
    setActionError('');
    try {
      await handleDelete(deleting.id);
      setDeleting(null);
    } catch (error: any) {
      setActionError(error?.response?.data?.error?.message || 'Could not delete checkpoint.');
    } finally { setActionBusy(false); }
  };

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    return locations.filter((loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [locations, searchQuery]);

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4 text-[#24133F]">
      {/* Top Header */}
      <div>
        <h1 className="text-[22px] font-extrabold leading-tight">Scanning Checkpoints</h1>
        <p className="text-[11px] text-[#756883]">
          Manage physical checkpoint gates and locations where student RFID cards are scanned.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-[#756883] transition-all focus-within:border-[#7026B7] focus-within:ring-4 focus-within:ring-purple-100 sm:max-w-[310px]">
          <Search className="h-4 w-4" />
          <span className="sr-only">Search checkpoints</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search checkpoint name"
            className="w-full bg-transparent text-xs text-[#24133F] outline-none placeholder:text-[#A59AAB]"
          />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Location
          </Button>
        </div>
      </div>

      {/* Locations Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#E5E0EB] bg-white p-3">
        {error && (
          <div role="alert" className="mb-2 flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            <span>{error}</span>
            <button type="button" onClick={() => void loadLocations()} className="underline">
              Retry
            </button>
          </div>
        )}
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
              <th className="px-3 py-3">Checkpoint location</th>
              <th className="px-3 py-3">Registered date</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-xs text-[#756883]">
                  <div role="status" className="flex flex-col items-center gap-2">
                    <img src={hawiLooking} alt="" className="h-24 w-24 object-contain" />
                    <span>Hawi is looking for checkpoints…</span>
                  </div>
                </td>
              </tr>
            ) : error && locations.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-xs text-rose-600">
                  Unable to load checkpoints.{' '}
                  <button
                    type="button"
                    className="font-bold underline"
                    onClick={() => void loadLocations()}
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : filteredLocations.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-xs text-[#756883]">
                  {searchQuery
                    ? 'No checkpoints match your search.'
                    : 'No checkpoints registered yet. Click "Add Location" to register one.'}
                </td>
              </tr>
            ) : (
              filteredLocations.map((location) => (
                <tr key={location.id} className="border-b border-slate-200 last:border-b-0 transition-colors hover:bg-slate-50">
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#FFF3D8] text-[#F59E0B]">
                        <MapPin className="h-4 w-4" />
                      </span>
                      {location.name}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-[#637596] font-medium">
                    {location.created_at
                      ? new Date(location.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })
                      : '—'}
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEdit(location)} aria-label={`Edit ${location.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5E0EB] bg-white text-[#7026B7] transition-colors hover:border-[#B78BE9] hover:bg-[#F7F0FF] focus-visible:outline-2 focus-visible:outline-brand-700"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => { setDeleting(location); setActionError(''); }} aria-label={`Delete ${location.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5E0EB] bg-white text-[#EF3340] transition-colors hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-[#EEF0F4] px-3 pt-3 text-xs text-[#756883]">
          <span>{filteredLocations.length} checkpoint{filteredLocations.length !== 1 ? 's' : ''} registered</span>
        </div>
      </div>

      {/* Add Location Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Scanning Location"
        description="This location can be assigned to attendance sessions for RFID tap scanning."
      >
        <form onSubmit={handleCreate} className="mt-2 space-y-4">
          {formError && (
            <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {formError}
            </p>
          )}
          <Input
            label="Location Name"
            placeholder="e.g. Gymnasium Gate 1"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Add Location
            </Button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={Boolean(editing)} onClose={() => { if (!actionBusy) setEditing(null); }} title="Edit checkpoint" description="Update the location name shown in attendance and session setup.">
        <form onSubmit={(event) => void saveEdit(event)} className="mt-2 space-y-4">
          {actionError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">{actionError}</p>}
          <Input label="Location name" value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={150} required />
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)} disabled={actionBusy}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={actionBusy}>Save changes</Button>
          </div>
        </form>
      </Modal>
      <DeleteConfirmationModal
        isOpen={Boolean(deleting)}
        onClose={() => { if (!actionBusy) setDeleting(null); }}
        onConfirm={() => void confirmDelete()}
        title="Delete checkpoint"
        itemName={deleting?.name}
        description={<><span>Delete <strong>{deleting?.name}</strong>? A checkpoint assigned to a session or used in attendance records cannot be deleted.</span>{actionError && <span role="alert" className="mt-3 block rounded-lg bg-rose-50 p-3 font-semibold text-rose-700">{actionError}</span>}</>}
        confirmLabel="Delete checkpoint"
        isDeleting={actionBusy}
      />
    </div>
  );
};
