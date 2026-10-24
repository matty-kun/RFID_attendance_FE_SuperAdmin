import { useState, useMemo } from 'react';
import { useLocationsViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { MapPin, Plus, Search, Sparkles } from 'lucide-react';

export const LocationsView = () => {
  const {
    locations, isLoading, isModalOpen, setIsModalOpen, isSubmitting,
    name, setName, loadLocations, handleCreate,
  } = useLocationsViewModel();

  const [searchQuery, setSearchQuery] = useState('');

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
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-[#756883] sm:max-w-[310px]">
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
        <div className="ml-auto">
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
      <div className="overflow-x-auto rounded-2xl border border-[#E5E0EB] bg-white p-2.5">
        <table className="w-full min-w-[500px] text-left text-xs">
          <thead>
            <tr className="bg-[#F4F6FA] text-[10px] uppercase text-[#637596]">
              <th className="rounded-l-xl px-3 py-3 font-medium">Checkpoint Location</th>
              <th className="rounded-r-xl px-3 py-3 font-medium">Registered Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={2} className="py-10 text-center text-xs text-[#756883]">
                  Loading checkpoints…
                </td>
              </tr>
            ) : filteredLocations.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-10 text-center text-xs text-[#756883]">
                  {searchQuery ? (
                    'No checkpoints match your search.'
                  ) : (
                    <>
                      No checkpoints to display.{' '}
                      <button
                        type="button"
                        className="font-bold text-brand-700 underline"
                        onClick={loadLocations}
                      >
                        Retry
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              filteredLocations.map((location) => (
                <tr key={location.id} className="border-b border-[#EEF0F4] last:border-b-0 hover:bg-[#FAF8FC]">
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
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              Add Location
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
