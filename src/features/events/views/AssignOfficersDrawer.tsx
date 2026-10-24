import React, { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, MapPin, Check, X } from 'lucide-react';
import { Drawer } from '../../../components/common/Drawer';
import { Checkbox } from '../../../components/common/Checkbox';
import { Dropdown, type DropdownOption } from '../../../components/common/Dropdown';

export interface AssignedOfficer {
  id: string;
  name: string;
  initials: string;
  role: string;
  location: string;
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

const defaultAdminPool: Omit<AssignedOfficer, 'location'>[] = [
  { id: 'adm-1', name: 'Ako si batman', initials: 'JD', role: 'Admin', status: 'Online' },
  { id: 'adm-2', name: 'Juan Bayot', initials: 'JD', role: 'Admin', status: 'Online' },
  { id: 'adm-3', name: 'Nonoy Kaibo', initials: 'JD', role: 'Admin', status: 'Online' },
  { id: 'adm-4', name: 'King Kong', initials: 'KK', role: 'Admin', status: 'Offline' },
  { id: 'adm-5', name: 'Grace Villanueva', initials: 'GV', role: 'Admin', status: 'Online' },
  { id: 'adm-6', name: 'Rafael Cortez', initials: 'RC', role: 'Admin', status: 'Offline' },
  { id: 'adm-7', name: 'Liza Mendoza', initials: 'LM', role: 'Admin', status: 'Online' },
];

const availableLocations = [
  'Cite Building',
  'CR ETD',
  'ETD Court',
  'Cite 4th floor',
  'Gymnasium',
  'RSB Lobby',
  'Primera',
  'Field',
];

export const AssignOfficersDrawer: React.FC<AssignOfficersDrawerProps> = ({
  isOpen,
  onClose,
  sessionName,
  sessionTime,
  sessionDate,
  sessionStatus = 'Active',
  initialAssigned = [
    { id: 'adm-1', name: 'Ako si batman', initials: 'JD', role: 'Admin', location: 'Cite Building', status: 'Online' },
    { id: 'adm-2', name: 'Juan Bayot', initials: 'JD', role: 'Admin', location: 'Cite Building', status: 'Online' },
    { id: 'adm-3', name: 'Nonoy Kaibo', initials: 'JD', role: 'Admin', location: 'CR ETD', status: 'Online' },
  ],
  onSave,
}) => {
  const [assigned, setAssigned] = useState<AssignedOfficer[]>(initialAssigned);
  const [search, setSearch] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<{ [adminId: string]: string }>({}); // adminId -> location

  useEffect(() => {
    if (isOpen) {
      setAssigned(initialAssigned);
      setSelectedToAdd({});
      setSearch('');
    }
  }, [isOpen, initialAssigned]);

  const filteredAdmins = useMemo(() => {
    const assignedIds = new Set(assigned.map((a) => a.id));
    return defaultAdminPool.filter(
      (admin) =>
        !assignedIds.has(admin.id) &&
        (search === '' || admin.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [assigned, search]);

  const locationOptions: DropdownOption[] = useMemo(
    () =>
      availableLocations.map((loc) => ({
        value: loc,
        label: loc,
        icon: <MapPin className="h-3 w-3 text-[#451475]" />,
      })),
    []
  );

  const handleRemoveAssigned = (id: string) => {
    setAssigned((prev) => prev.filter((a) => a.id !== id));
  };

  const handleChangeAssignedLocation = (officerId: string, location: string) => {
    setAssigned((prev) =>
      prev.map((o) => (o.id === officerId ? { ...o, location } : o))
    );
  };

  const handleToggleSelect = (adminId: string) => {
    setSelectedToAdd((prev) => {
      const next = { ...prev };
      if (next[adminId]) {
        delete next[adminId];
      } else {
        next[adminId] = availableLocations[0]; // default location
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
      const found = defaultAdminPool.find((a) => a.id === adminId);
      if (found) {
        newAssigned.push({
          ...found,
          location: loc,
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
      title="Assign Officers"
      description="Select one or more admin accounts to assign to this session"
      contextBox={
        <div className="rounded-2xl border border-[#E5E0EB] bg-[#F9F7FA] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#24133F]">{sessionName}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white ${
                sessionStatus === 'Active'
                  ? 'bg-[#10B981]'
                  : sessionStatus === 'Upcoming'
                  ? 'bg-[#F59E0B]'
                  : 'bg-slate-400'
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
                  <Dropdown
                    value={officer.location}
                    onChange={(newLoc) => handleChangeAssignedLocation(officer.id, newLoc)}
                    options={locationOptions}
                    buttonClassName="h-7 px-2.5 text-[11px] font-semibold text-[#24133F] rounded-xl border-[#E5E0EB] bg-white shadow-none hover:border-[#451475]"
                    menuClassName="min-w-[190px] z-50"
                    align="right"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAssigned(officer.id)}
                    className="rounded-lg p-1 text-[#756883] hover:bg-slate-100 hover:text-red-600 transition-colors"
                    title="Remove officer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {!assigned.length && (
              <p className="py-4 text-center text-xs text-[#756883]">No officers assigned yet.</p>
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
            {filteredAdmins.map((admin) => {
              const isChecked = Boolean(selectedToAdd[admin.id]);
              const selectedLocation = selectedToAdd[admin.id] || availableLocations[0];

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

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        admin.status === 'Online'
                          ? 'bg-[#E4F7EB] text-[#16883F]'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {admin.status}
                    </span>
                  </div>

                  {/* Location picker if checked */}
                  {isChecked && (
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
            })}

            {!filteredAdmins.length && (
              <p className="py-4 text-center text-xs text-[#756883]">No other officers available.</p>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
