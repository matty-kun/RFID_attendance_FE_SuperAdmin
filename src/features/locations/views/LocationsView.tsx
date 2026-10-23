import { useLocationsViewModel } from '../viewmodels';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/common/Table';
import { MapPin, Plus } from 'lucide-react';

export const LocationsView = () => {
  const {
    locations, isLoading, isModalOpen, setIsModalOpen, isSubmitting,
    name, setName, loadLocations, handleCreate,
  } = useLocationsViewModel();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Scanning Locations</h1>
          <p className="mt-1 text-xs text-slate-500">Manage physical locations available for attendance sessions.</p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          Add Location
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Registered Locations</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Registered At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={2} className="py-8 text-center text-sm text-slate-500">Loading locations…</TableCell></TableRow>
              ) : locations.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="py-8 text-center text-sm text-slate-500">
                  No locations to display. <button type="button" className="text-brand-700 underline" onClick={loadLocations}>Retry</button>
                </TableCell></TableRow>
              ) : locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="flex items-center gap-2 font-semibold text-slate-800">
                    <MapPin className="h-4 w-4 text-brand-600" />{location.name}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {location.created_at ? new Date(location.created_at).toLocaleDateString() : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Scanning Location"
        description="This location can be assigned to attendance sessions."
      >
        <form onSubmit={handleCreate} className="mt-2 space-y-4">
          <Input label="Location Name" placeholder="e.g. Gymnasium Gate 1" value={name} onChange={(event) => setName(event.target.value)} required />
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>Add Location</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
