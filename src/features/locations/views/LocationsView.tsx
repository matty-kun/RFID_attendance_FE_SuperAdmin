import React from 'react';
import { useLocationsViewModel } from '../viewmodels';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/common/Table';
import { MapPin, Plus, Sparkles, CheckCircle2 } from 'lucide-react';

export const LocationsView: React.FC = () => {
  const {
    locations,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    name,
    setName,
    roomOrFloor,
    setRoomOrFloor,
    handleCreate,
  } = useLocationsViewModel();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kiosks & Hardware Venues</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Register attendance gates, gymnasium entrances, and classroom scanning stations.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Venue / Kiosk
        </Button>
      </div>

      {/* Quick Visual Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <Card key={loc.id} className="hover:border-brand-400 transition-all">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-700">
                  <MapPin className="w-5 h-5" />
                </div>
                <Badge variant={loc.is_active ? 'emerald' : 'slate'} dot>
                  {loc.is_active ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <div className="mt-4">
                <div className="text-base font-black text-slate-900">{loc.name}</div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">
                  {loc.room_or_floor || 'General Venue Station'}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono">{loc.id.slice(0, 8)}...</span>
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Scans
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Registered Scanning Locations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location Name</TableHead>
                <TableHead>Room / Floor</TableHead>
                <TableHead>Hardware Status</TableHead>
                <TableHead>Registered At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-400 text-xs">
                    No locations configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-bold text-slate-800 text-sm">{loc.name}</TableCell>
                    <TableCell className="text-xs text-slate-600 font-medium">
                      {loc.room_or_floor || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={loc.is_active ? 'emerald' : 'slate'} dot>
                        {loc.is_active ? 'Active Station' : 'Standby'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-400">
                      {new Date(loc.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Location Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Scanning Location"
        description="Provision a new physical RFID scanning station."
      >
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          <Input
            label="Location / Venue Name"
            placeholder="e.g. University Gymnasium Entrance A"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Room, Level, or Floor (Optional)"
            placeholder="e.g. Ground Floor, East Wing"
            value={roomOrFloor}
            onChange={(e) => setRoomOrFloor(e.target.value)}
          />

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
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
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Add Location
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
