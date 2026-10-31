import React, { useState } from 'react';
import { useAdminsViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { Dropdown } from '../../../components/common/Dropdown';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { EmptyState } from '../../../components/common/EmptyState';
import { LoadingState } from '../../../components/common/LoadingState';
import { DeleteAdminConfirmationModal } from './DeleteAdminConfirmationModal';
import { AdminProfileDrawer } from './AdminProfileDrawer';
import { Archive, ExternalLink, Plus, Search, Shield, Sparkles, UserCheck, Users } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useAuth } from '../../auth/context/AuthContext';

export interface AdminsViewProps {
  isDrawer?: boolean;
}

export const AdminsView: React.FC<AdminsViewProps> = ({ isDrawer = false }) => {
  const { user } = useAuth();
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
    showArchived,
    setShowArchived,
    loadAdmins,
    handleCreate,
    handleUpdateAdmin,
    handleResetPassword,
    handleArchiveAdmin,
    handleRestoreAdmin,
    deletingAdmin,
    setDeletingAdmin,
    handleDeleteAdmin,
    uploadAdminAvatar,
    removeAdminAvatar,
    loadAdminCheckpointActivity,
  } = useAdminsViewModel();
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const visibleAdmins = admins.filter((admin) => roleFilter === 'all' || admin.role === roleFilter);
  const selectedAdmin = admins.find((admin) => admin.id === selectedAdminId) ?? null;
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
          <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[#756883] transition-all focus-within:border-[#7026B7] focus-within:ring-4 focus-within:ring-purple-100 sm:max-w-[320px]">
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
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <Dropdown
            value={showArchived ? 'archived' : 'active'}
            onChange={(value) => {
              setPage(1);
              setSelectedAdminId(null);
              setShowArchived(value === 'archived');
            }}
            icon={showArchived ? <Archive className="h-4 w-4 text-[#756883]" /> : <Users className="h-4 w-4 text-[#756883]" />}
            options={[
              { value: 'active', label: 'Active Admins', icon: <UserCheck className="h-3.5 w-3.5 text-[#7026B7]" /> },
              { value: 'archived', label: 'Archived', icon: <Archive className="h-3.5 w-3.5 text-[#756883]" /> },
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
        {isLoading ? (
          <LoadingState
            title="Hawi is finding admin accounts…"
            description="Loading the administrator list."
          />
        ) : visibleAdmins.length > 0 ? (
          <div className="max-h-[520px] space-y-1 overflow-y-auto">
            {visibleAdmins.map((admin) => (
              <button
                type="button"
                key={admin.id}
                onClick={() => setSelectedAdminId(admin.id)}
                aria-label={`View ${admin.name} profile`}
                className="flex w-full items-center justify-between gap-4 rounded-xl px-1 py-3 text-left transition-colors hover:bg-slate-50/70 focus-visible:outline-2 focus-visible:outline-[#7026B7]"
              >
                {/* Left: Avatar + Details */}
                <div className="flex min-w-0 items-center gap-4">
                  {admin.avatar_url ? <img src={admin.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-full border-2 border-purple-100 object-cover shadow-xs" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-purple-100 bg-purple-50 text-lg font-black text-[#7026B7]">{initials(admin.name)}</span>}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-base font-black text-[#24133F]">{admin.name}</span>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
                          admin.role === 'super_admin'
                            ? 'bg-[#F4EFFB] text-[#7026B7]'
                            : 'bg-purple-50 text-[#7C27BD]'
                        )}
                      >
                        {admin.role === 'super_admin' ? (
                          <>
                            <Shield className="h-2.5 w-2.5" />
                            <span>Super Admin</span>
                          </>
                        ) : (
                          <span>Admin</span>
                        )}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{admin.email}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#7026B7] px-4 py-2.5 text-xs font-bold text-white shadow-[0_4px_0_#451475]"><ExternalLink className="h-4 w-4" />View Profile</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            variant={
              error
                ? 'error'
                : searchQuery || roleFilter !== 'all'
                ? 'no-search-results'
                : 'empty-list'
            }
            title={
              error
                ? 'Unable to load administrators'
                : searchQuery || roleFilter !== 'all'
                ? 'No administrators match these filters'
                : showArchived
                ? 'No archived administrators'
                : 'No administrators registered yet'
            }
            description={
              error
                ? 'Could not connect to the server. Please check your network and retry.'
                : searchQuery || roleFilter !== 'all'
                ? 'Try adjusting your search terms or clearing the role filter.'
                : showArchived
                ? 'Deactivated admin accounts will appear here safely archived.'
                : 'Add system administrators to help manage RFID cards, attendance, and students.'
            }
            action={
              error
                ? {
                    label: 'Retry Loading',
                    variant: 'primary',
                    onClick: () => void loadAdmins(),
                  }
                : searchQuery || roleFilter !== 'all'
                ? {
                    label: 'Reset Filters',
                    variant: 'secondary',
                    onClick: () => {
                      setSearchQuery('');
                      setRoleFilter('all');
                      setPage(1);
                    },
                  }
                : user?.role === 'super_admin'
                ? {
                    label: 'Add Administrator',
                    variant: 'primary',
                    onClick: () => setIsModalOpen(true),
                  }
                : undefined
            }
          />
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
                  Admin
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
      <AdminProfileDrawer
        isOpen={Boolean(selectedAdmin)}
        onClose={() => { if (!deletingAdmin) setSelectedAdminId(null); }}
        admin={selectedAdmin}
        onUpdate={handleUpdateAdmin}
        onResetPassword={handleResetPassword}
        onArchive={handleArchiveAdmin}
        onRestore={async (adminId) => { const restored = await handleRestoreAdmin(adminId); if (restored) setSelectedAdminId(null); return restored; }}
        isSelf={user?.id === selectedAdmin?.id}
        onDelete={setDeletingAdmin}
        onUploadAvatar={uploadAdminAvatar}
        onRemoveAvatar={removeAdminAvatar}
        onLoadCheckpointActivity={loadAdminCheckpointActivity}
      />

      {/* Delete Admin Confirmation Modal */}
      <DeleteAdminConfirmationModal
        isOpen={Boolean(deletingAdmin)}
        onClose={() => setDeletingAdmin(null)}
        admin={deletingAdmin}
        onConfirmDelete={async (adminId) => {
          const deleted = await handleDeleteAdmin(adminId);
          if (deleted) setSelectedAdminId(null);
          return deleted;
        }}
      />
    </div>
  );
};
