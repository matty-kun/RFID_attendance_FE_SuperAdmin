import React, { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, MapPin, Check, X } from 'lucide-react';
import { Drawer } from '../../../components/common/Drawer';
import { Checkbox } from '../../../components/common/Checkbox';
import { Dropdown, type DropdownOption } from '../../../components/common/Dropdown';
import { adminService } from '../../../services/adminService';
import type { AdminRecord, LocationRecord } from '../../../types';

export interface AssignedOfficer {
  id: string;
  name: string;
  initials: string;
  role: string;
  location: string;
  locationId?: string;
  status: 'Online' | 'Offline';
}

export interface AssignOfficersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessionName: string;
  sessionTime: string;
  sessionDate: string;
  sessionStatus?: 'Active' | 'Upcoming' | 'Completed';
  initialAssigned?: AssignedOfficer[];
  onSave: (assigned: AssignedOfficer[]) => void;
}

function getInitials(fullName: string) {
  return (
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'AD'
  );
}

export const AssignOfficersDrawer: React.FC<AssignOfficersDrawerProps> = ({
  isOpen,
  onClose,
  sessionName,
  sessionTime,
  sessionDate,
  sessionStatus = 'Active',
  initialAssigned = [],
  onSave,
}) => {
  const [assigned, setAssigned] = useState<AssignedOfficer[]>(initialAssigned);
  const [search, setSearch] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<{ [adminId: string]: string }>({});
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAssigned(initialAssigned);
      setSelectedToAdd({});
      setSearch('');
      setLoading(true);
      Promise.all([
        adminService.getAdmins(1, '', 100).catch(() => ({ admins: [], total: 0, page: 1, limit: 100 })),
        adminService.getLocations().catch(() => []),
      ])
        .then(([adminRes, locRes]) => {
          setAdmins(adminRes.admins);
          setLocations(locRes);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, initialAssigned]);

  const adminPool = useMemo<Omit<AssignedOfficer, 'location'>[]>(() => {
    return admins.map((adm) => ({
      id: adm.id,
      name: adm.name,
      initials: getInitials(adm.name),
      role: adm.role === 'super_admin' ? 'Super Admin' : 'Admin',
      status: 'Online' as const,
    }));
  }, [admins]);

  const filteredAdmins = useMemo(() => {
    const assignedIds = new Set(assigned.map((a) => a.id));
    return adminPool.filter(
      (admin) =>
        !assignedIds.has(admin.id) &&
        (search === '' || admin.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [adminPool, assigned, search]);

  const locationOptions: DropdownOption[] = useMemo(
    () =>
      locations.map((loc) => ({
        value: loc.name,
        label: loc.name,
        icon: <MapPin className="h-3 w-3 text-[#451475]" />,
      })),
    [locations]
  );

  const locationIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of locations) {
      map.set(loc.name, loc.id);
    }
    return map;
  }, [locations]);

  const handleRemoveAssigned = (id: string) => {
    setAssigned((prev) => prev.filter((a) => a.id !== id));
  };

  const handleChangeAssignedLocation = (officerId: string, location: string) => {
    const locationId = locationIdByName.get(location);
    setAssigned((prev) =>
      prev.map((o) => (o.id === officerId ? { ...o, location, locationId } : o))
    );
  };

  const handleToggleSelect = (adminId: string) => {
    const defaultLoc = locations[0]?.name || '';
    setSelectedToAdd((prev) => {
      const next = { ...prev };
      if (next[adminId] !== undefined) {
        delete next[adminId];
      } else {
        next[adminId] = defaultLoc;
      }
      return next;
    });
  };

  const handleChangeLocation = (adminId: string, location: string) => {
    setSelectedToAdd((prev) => ({
      ...prev,
      [adminId]: location,
    }));
  };

  const handleSaveAll = () => {
    const newAssigned: AssignedOfficer[] = [];
    for (const [adminId, loc] of Object.entries(selectedToAdd)) {
      const found = adminPool.find((a) => a.id === adminId);
      if (found) {
        newAssigned.push({
          ...found,
          location: loc,
          locationId: locationIdByName.get(loc),
        });
      }
    }
    const finalAssigned = [...assigned, ...newAssigned];
    setAssigned(finalAssigned);
    setSelectedToAdd({});
    onSave(finalAssigned);
    onClose();
  };

  const totalSelectedCount = Object.keys(selectedToAdd).length;
  const hasChanges =
    totalSelectedCount > 0 ||
    JSON.stringify(assigned) !== JSON.stringify(initialAssigned);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Officers & Checkpoints"
      description="Select admin accounts and allowed scanning checkpoints for this session."
      contextBox={
        <div className="rounded-2xl border border-[#E5E0EB] bg-[#F9F7FA] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#24133F]">{sessionName}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                sessionStatus === 'Active'
                  ? 'bg-[#17B556] text-white'
                  : sessionStatus === 'Upcoming'
                  ? 'bg-[#F59E0B] text-white'
                  : 'bg-[#E4F7EB] text-[#11883E] border border-[#17B556]/30'
              }`}
            >
              {sessionStatus}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#756883]">
            <Calendar className="h-3.5 w-3.5" />
            <span>{sessionDate} · {sessionTime}</span>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#756883]">
            {totalSelectedCount > 0 ? `${totalSelectedCount} selected` : 'None selected'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#E5E0EB] px-4 py-2 text-xs font-bold text-[#24133F] hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={!hasChanges}
              className="flex items-center gap-1.5 rounded-xl bg-[#7026B7] px-4 py-2 text-xs font-bold text-white shadow-[0_4px_0_0_#451475] hover:bg-[#631FA4] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {totalSelectedCount > 0 ? `Assign (${totalSelectedCount}) Officers` : 'Save Changes'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {locations.length === 0 && !loading && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
            No checkpoint locations registered yet. Add locations in the Checkpoints page to bind checkpoints to sessions.
          </p>
        )}

        {/* Section: Currently Assigned */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#756883]">
            Currently Assigned ({assigned.length})
          </h3>
          <div className="mt-3 divide-y divide-[#F1EEF4]">
            {assigned.map((officer) => (
              <div key={officer.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E9D5FF] text-xs font-bold text-[#6D21A8]">
                    {officer.initials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#24133F]">{officer.name}</p>
                    <p className="text-[11px] text-[#756883]">{officer.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {locationOptions.length > 0 ? (
                    <Dropdown
                      value={officer.location || locationOptions[0]?.value || ''}
                      onChange={(newLoc) => handleChangeAssignedLocation(officer.id, newLoc)}
                      options={locationOptions}
                      buttonClassName="h-7 px-2.5 text-[11px] font-semibold text-[#24133F] rounded-xl border-[#E5E0EB] bg-white shadow-none hover:border-[#451475]"
                      menuClassName="min-w-[190px] z-50"
                      align="right"
                    />
                  ) : (
                    <span className="text-[11px] text-[#756883]">{officer.location || 'No location'}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveAssigned(officer.id)}
                    className="rounded-lg p-1 text-[#756883] hover:bg-slate-100 hover:text-red-600 transition-colors"
                    title="Remove assignment"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {!assigned.length && (
              <p className="py-4 text-center text-xs text-[#756883]">No officers or checkpoints assigned yet.</p>
            )}
          </div>
        </div>

        {/* Section: Available Officers */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#756883]">
              Available Officers ({filteredAdmins.length})
            </h3>
          </div>

          {/* Search Input */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#756883]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search officer name..."
              className="w-full rounded-xl border border-[#E5E0EB] bg-[#FAF8FB]/60 py-2 pl-9 pr-3 text-xs font-medium text-[#24133F] placeholder-[#756883] focus:border-[#451475] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="mt-3 divide-y divide-[#F1EEF4]">
            {loading ? (
              <p className="py-4 text-center text-xs text-[#756883]">Loading administrators and checkpoints…</p>
            ) : (
              filteredAdmins.map((admin) => {
                const isChecked = selectedToAdd[admin.id] !== undefined;
                const selectedLocation = selectedToAdd[admin.id] || locations[0]?.name || '';

                return (
                  <div key={admin.id} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isChecked}
                          onChange={() => handleToggleSelect(admin.id)}
                        />
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-[#756883]">
                          {admin.initials}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#24133F]">{admin.name}</p>
                          <p className="text-[11px] text-[#756883]">{admin.role}</p>
                        </div>
                      </div>

                      <span className="rounded-full bg-[#E4F7EB] px-2 py-0.5 text-[10px] font-bold text-[#16883F]">
                        {admin.status}
                      </span>
                    </div>

                    {/* Location picker if checked */}
                    {isChecked && locationOptions.length > 0 && (
                      <div className="mt-2.5 flex items-center justify-between border-t border-[#F1EEF4] pt-2">
                        <span className="text-[11px] font-medium text-[#756883] flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-[#756883]" />
                          Assign checkpoint:
                        </span>
                        <Dropdown
                          value={selectedLocation}
                          onChange={(newLoc) => handleChangeLocation(admin.id, newLoc)}
                          options={locationOptions}
                          buttonClassName="h-7 px-2.5 text-[11px] font-semibold text-[#24133F] rounded-xl border-[#E5E0EB] bg-white shadow-none hover:border-[#451475]"
                          menuClassName="min-w-[190px] z-50"
                          align="right"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {!loading && !filteredAdmins.length && (
              <p className="py-4 text-center text-xs text-[#756883]">No administrators available.</p>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
