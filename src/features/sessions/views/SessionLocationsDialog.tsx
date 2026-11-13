import { useEffect, useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { adminService } from '../../../services/adminService';
import type { LocationRecord } from '../../../types';

interface Props {
  sessionId: string;
  onClose: () => void;
}

export function SessionLocationsDialog({ sessionId, onClose }: Props) {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [timeInIds, setTimeInIds] = useState<string[]>([]);
  const [timeOutIds, setTimeOutIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      adminService.getLocations(),
      adminService.getSessionLocations(sessionId),
    ]).then(([allLocations, assigned]) => {
      if (!active) return;
      setLocations(allLocations);
      setTimeInIds(assigned.time_in_locations.map((location) => location.id));
      setTimeOutIds(assigned.time_out_locations.map((location) => location.id));
    }).catch(() => {
      if (active) setError('Could not load checkpoint assignments. Try closing and opening this dialog again.');
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [sessionId]);

  const toggle = (id: string, selected: string[], setSelected: (ids: string[]) => void) => {
    setSelected(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
    setSaved(false);
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await adminService.saveSessionLocations(sessionId, {
        time_in_location_ids: timeInIds,
        time_out_location_ids: timeOutIds,
      });
      setSaved(true);
    } catch {
      setError('Could not save checkpoint assignments. Your selections are still here to retry.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Session Checkpoints" description="Choose allowed scanning locations for each attendance window." maxWidth="lg">
      {isLoading ? <p className="text-sm text-slate-500">Loading locations…</p> : (
        <div className="space-y-4">
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {locations.length === 0 && !error ? <p className="text-sm text-slate-500">Add a location before assigning checkpoints.</p> : (
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ['Time In', timeInIds, setTimeInIds],
                ['Time Out', timeOutIds, setTimeOutIds],
              ] as const).map(([label, selected, setSelected]) => (
                <fieldset key={label} className="rounded-xl border border-slate-200 p-3">
                  <legend className="px-1 text-sm font-semibold text-slate-800">{label}</legend>
                  <div className="max-h-56 space-y-2 overflow-auto">
                    {locations.map((location) => (
                      <label key={location.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={selected.includes(location.id)} onChange={() => toggle(location.id, selected, setSelected)} />
                        {location.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <span role="status" className="text-xs text-emerald-700">{saved ? 'Assignments saved.' : ''}</span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
              <Button type="button" variant="primary" onClick={save} isLoading={isSaving} disabled={!!error && locations.length === 0}>Save Checkpoints</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
