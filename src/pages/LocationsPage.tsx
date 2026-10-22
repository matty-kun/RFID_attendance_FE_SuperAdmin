import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { LocationRecord } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/Table';
import { MapPin, Plus, Sparkles, CheckCircle2 } from 'lucide-react';

export const LocationsPage: React.FC = () => {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [roomOrFloor, setRoomOrFloor] = useState('');

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getLocations();
      setLocations(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminService.createLocation({
        name,
        room_or_floor: roomOrFloor || undefined,
      });
      setIsModalOpen(false);
      setName('');
      setRoomOrFloor('');
      await loadLocations();
    } catch (err: any) {
      alert(err?.message || 'Failed to create venue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kiosks & Hardware Venues</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage physical RFID scanning stations across the university campus.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Register New Kiosk
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {locations.map((loc) => (
          <Card key={loc.id} hoverEffect className="relative flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-2xl text-brand-600 mb-3">
                  <MapPin className="w-6 h-6" />
                </div>
                <Badge variant="open" dot>
                  ONLINE
                </Badge>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight mt-1">{loc.name}</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">{loc.room_or_floor || 'Main RFID Kiosk Station'}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-6 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <CheckCircle2 className="w-4 h-4" /> Scanner Active
              </span>
              <span className="text-slate-400 font-mono text-[11px] truncate max-w-[120px]">
                {loc.id}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Locations Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Campus Locations ({locations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location / Gate</TableHead>
                <TableHead>Station / Floor</TableHead>
                <TableHead>Hardware Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-bold text-slate-900">{loc.name}</TableCell>
                  <TableCell className="text-xs text-slate-500">{loc.room_or_floor || 'Ground Level'}</TableCell>
                  <TableCell>
                    <Badge variant="open" dot>
                      READY
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Kiosk Location"
        description="Add a physical attendance checkpoint gate or lobby."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Location Name"
            placeholder="e.g. CITE Building - Ground Floor Lobby"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Room, Gate, or Floor Detail"
            placeholder="e.g. Lobby Entrance Kiosk 1"
            value={roomOrFloor}
            onChange={(e) => setRoomOrFloor(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} leftIcon={<Sparkles className="w-4 h-4" />}>
              Save Kiosk Location
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
