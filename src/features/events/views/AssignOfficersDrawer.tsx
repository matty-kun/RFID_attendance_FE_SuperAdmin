import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Calendar, MapPin, Check } from 'lucide-react';
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

  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const rAF = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(rAF);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 260);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  if (!isRendered) return null;

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

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-50 flex justify-end bg-[#170D29]/40 backdrop-blur-md transition-opacity duration-250 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-officers-title"
        className={`flex h-full w-full max-w-md flex-col justify-between border-l border-[#E5E0EB] bg-white shadow-2xl transform transition-transform duration-250 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="border-b border-[#F1EEF4] p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="assign-officers-title" className="text-lg font-bold text-[#24133F]">
                Assign Officers
              </h2>
              <p className="mt-0.5 text-xs text-[#756883]">
                Select one or more admin accounts to assign to this session
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="rounded-lg p-1 text-[#756883] hover:bg-slate-100 hover:text-[#24133F]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Session Context Box */}
          <div className="mt-4 rounded-2xl border border-[#E5E0EB] bg-[#F9F7FA] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#24133F]">{sessionName}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white ${
                  sessionStatus === 'Active'
                    ? 'bg-[#10B981]'
                    : sessionStatus === 'Upcoming'
                    ? 'bg-[#3B82F6]'
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
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
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
                      <p className="text-xs font-semibold text-[#24133F]">{officer.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-[#756883]">{officer.role}</span>
                        <Dropdown
                          value={officer.location}
                          onChange={(newLoc) => handleChangeAssignedLocation(officer.id, newLoc)}
                          options={locationOptions}
                          buttonClassName="h-6 px-2 py-0 text-[10px] font-semibold text-[#451475] bg-[#F5F0FB] border border-[#E9DDF8] hover:bg-[#EDE3FA] rounded-md shadow-none gap-1"
                          menuClassName="min-w-[170px]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        officer.status === 'Online'
                          ? 'bg-[#E4F7EB] text-[#16883F]'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {officer.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssigned(officer.id)}
                      title="Remove officer"
                      className="rounded p-1 text-[#756883] hover:bg-rose-50 hover:text-[#EF4444]"
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

          {/* Section: Add officers */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#756883]">
              Add officers
            </h3>

            {/* Search Input */}
            <div className="relative mt-2">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#756883]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search admin or ID"
                className="w-full rounded-xl border border-[#E5E0EB] py-2 pl-9 pr-4 text-xs text-[#24133F] placeholder-[#756883] focus:border-[#24133F] focus:outline-none"
              />
            </div>

            {/* Admin Select List with Location Picker */}
            <div className="mt-3 space-y-2">
              {filteredAdmins.map((admin) => {
                const isChecked = Boolean(selectedToAdd[admin.id]);
                const selectedLocation = selectedToAdd[admin.id] || availableLocations[0];

                return (
                  <div
                    key={admin.id}
                    className={`rounded-xl border p-2.5 transition-colors ${
                      isChecked
                        ? 'border-[#451475]/30 bg-[#FAF7FD]'
                        : 'border-[#F1EEF4] hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isChecked}
                          onChange={() => handleToggleSelect(admin.id)}
                        />
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E9D5FF] text-xs font-bold text-[#6D21A8]">
                          {admin.initials}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#24133F]">{admin.name}</p>
                          <p className="text-[10px] text-[#756883]">{admin.role}</p>
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

                    {/* Location picker if checked (Custom styled Dropdown) */}
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

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#F1EEF4] p-4">
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
              className="flex items-center gap-1.5 rounded-xl bg-[#451475] px-4 py-2 text-xs font-bold text-white shadow-[0_4px_0_0_#2B0C4A] hover:bg-[#38105F] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {totalSelectedCount > 0 ? `Assign (${totalSelectedCount}) Officers` : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
