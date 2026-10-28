import React, { useState } from 'react';
import { useAdminsViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { Dropdown } from '../../../components/common/Dropdown';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { EditAdminModal } from './EditAdminModal';
import { DeleteAdminConfirmationModal } from './DeleteAdminConfirmationModal';
import { Pencil, Plus, Search, Shield, Sparkles, Trash2, UserCheck } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface AdminsViewProps {
  isDrawer?: boolean;
}

export const AdminsView: React.FC<AdminsViewProps> = ({ isDrawer = false }) => {
  const {
    admins,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    formError,
    isLoading,
    name,
    setName,
    email,
    setEmail,
    role,
    setRole,
    temporaryPassword,
    setTemporaryPassword,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    total,
    error,
    loadAdmins,
    handleCreate,
    editingAdmin,
    setEditingAdmin,
    handleUpdateAdmin,
    deletingAdmin,
    setDeletingAdmin,
    handleDeleteAdmin,
  } = useAdminsViewModel();
  const [roleFilter, setRoleFilter] = useState('all');
  const visibleAdmins = admins.filter((admin) => roleFilter === 'all' || admin.role === roleFilter);
  const initials = (fullName: string) => fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');

  return (
    <div className={cn('w-full space-y-4 text-[#24133F]', !isDrawer && 'mx-auto max-w-[1120px]')}>
      {/* Top Header (only in full page view) */}
      {!isDrawer && (
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight">Admin Accounts</h1>
          <p className="text-[11px] text-[#756883]">Manage admin accounts and monitor attendance access.</p>
        </div>
      )}
      {/* Toolbar: Search, Role Filter, Refresh, Add Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[#756883] sm:max-w-[320px]">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="sr-only">Search admins</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setPage(1);
                setSearchQuery(event.target.value);
              }}
              placeholder="Search admin name or email…"
              className="w-full bg-transparent text-xs text-[#24133F] outline-none placeholder:text-[#A59AAB]"
            />
          </label>

          <Dropdown
            value={roleFilter}
            onChange={(val) => setRoleFilter(val)}
            icon={<Shield className="h-4 w-4 text-[#756883]" />}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'super_admin', label: 'Super Admin' },
              { value: 'admin', label: 'Scanner Admin' },
            ]}
          />
        </div>

        <div className="self-end sm:self-auto">
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Admin
          </Button>
        </div>
      </div>

      {/* Admin List */}
      <div>
        {error && (
          <div role="alert" className="flex items-center justify-between rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 mb-2.5">
            <span>{error}</span>
            <button type="button" onClick={() => void loadAdmins()} className="underline">
              Retry
            </button>
          </div>
        )}

        {visibleAdmins.length > 0 ? (
          <div className="max-h-[400px] divide-y divide-slate-100 overflow-y-auto">
            {visibleAdmins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-slate-50/70"
              >
                {/* Left: Avatar + Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DFE8F8] text-[10px] font-black text-[#294B85]">
                    {initials(admin.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#24133F] truncate">{admin.name}</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-bold',
                          admin.role === 'super_admin'
                            ? 'bg-[#F4EFFB] text-[#7026B7]'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {admin.role === 'super_admin' ? (
                          <>
                            <Shield className="h-2.5 w-2.5" />
                            <span>Super Admin</span>
                          </>
                        ) : (
                          <span>Scanner</span>
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#756883] truncate">{admin.email}</p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingAdmin(admin)}
                    title={`Edit ${admin.name}`}
                    aria-label={`Edit ${admin.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-[#7026B7] hover:bg-[#F4EFFB] active:scale-90 transition-all cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingAdmin(admin)}
                    title={`Delete ${admin.name}`}
                    aria-label={`Delete ${admin.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-90 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-[#756883]">
            {isLoading
              ? 'Loading administrators…'
              : error
              ? 'Unable to show administrators.'
              : searchQuery || roleFilter !== 'all'
              ? 'No administrators match these filters.'
              : 'No administrators available.'}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center justify-between pt-2 text-xs text-[#756883]">
          <span>
            Showing {visibleAdmins.length} of {total} admins
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page * 25 >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Administrator"
        description="Create an admin login with a temporary password. Share it privately; the admin must change it after first login."
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          {formError && (
            <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {formError}
            </p>
          )}
          <Input
            label="Full Name"
            placeholder="e.g. Jason Marshal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. jason@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Temporary Password"
            type="password"
            value={temporaryPassword}
            onChange={(event) => setTemporaryPassword(event.target.value)}
            minLength={12}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Role Permission Tier
            </label>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                  role === 'admin'
                    ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                  className="sr-only"
                />
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                  Scanner Admin
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  RFID scanner operation & attendance tap logging
                </div>
              </label>

              <label
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                  role === 'super_admin'
                    ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="super_admin"
                  checked={role === 'super_admin'}
                  onChange={() => setRole('super_admin')}
                  className="sr-only"
                />
                <div className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Super Admin
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Full control: events, sessions, reports & marshals
                </div>
              </label>
            </div>
          </div>

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
              Register Admin
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Admin Modal */}
      <EditAdminModal
        isOpen={Boolean(editingAdmin)}
        onClose={() => setEditingAdmin(null)}
        admin={editingAdmin}
        onSave={handleUpdateAdmin}
      />

      {/* Delete Admin Confirmation Modal */}
      <DeleteAdminConfirmationModal
        isOpen={Boolean(deletingAdmin)}
        onClose={() => setDeletingAdmin(null)}
        admin={deletingAdmin}
        onConfirmDelete={handleDeleteAdmin}
      />
    </div>
  );
};
