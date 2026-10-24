import React, { useState } from 'react';
import { useAdminsViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { Dropdown } from '../../../components/common/Dropdown';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { Pencil, Plus, Search, Sparkles, Trash2, UserCheck } from 'lucide-react';

export const AdminsView: React.FC = () => {
  const {
    admins,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    isLoading,
    name,
    setName,
    email,
    setEmail,
    role,
    setRole,
    temporaryPassword, setTemporaryPassword, searchQuery, setSearchQuery, page, setPage, total, error,
    handleCreate,
  } = useAdminsViewModel();
  const [roleFilter, setRoleFilter] = useState('all');
  const visibleAdmins = admins.filter((admin) => roleFilter === 'all' || admin.role === roleFilter);
  const initials = (fullName: string) => fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4 text-[#24133F]">
      {/* Top Header */}
      <div><h1 className="text-[22px] font-extrabold leading-tight">Admin Accounts</h1><p className="text-[11px] text-[#756883]">Manage admin accounts and monitor attendance access.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-[#756883] sm:max-w-[310px]"><Search className="h-4 w-4" /><span className="sr-only">Search admins</span><input type="search" value={searchQuery} onChange={(event) => { setPage(1); setSearchQuery(event.target.value); }} placeholder="Search admin name or email" className="w-full bg-transparent text-xs text-[#24133F] outline-none placeholder:text-[#A59AAB]" /></label>
        <Dropdown
          value={roleFilter}
          onChange={(val) => setRoleFilter(val)}
          options={[
            { value: 'all', label: 'All Roles' },
            { value: 'super_admin', label: 'Super Admin' },
            { value: 'admin', label: 'Scanner Admin' },
          ]}
        />
        <Dropdown
          value="all"
          disabled
          onChange={() => {}}
          options={[{ value: 'all', label: 'All Status' }]}
        />
        <div className="ml-auto"><Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>Add Admin</Button></div>
      </div>

      {/* Admins Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#E5E0EB] bg-white p-2.5">
        {error && <p role="alert" className="px-3 py-2 text-sm text-rose-600">{error}</p>}
        <table className="w-full min-w-[630px] text-left text-xs"><thead><tr className="bg-[#F4F6FA] text-[10px] uppercase text-[#637596]"><th className="rounded-l-xl px-3 py-3 font-medium">Admin</th><th className="px-3 py-3 font-medium">Email / Account</th><th className="px-3 py-3 font-medium">Role</th><th className="rounded-r-xl px-3 py-3 font-medium"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{visibleAdmins.map((admin) => <tr key={admin.id} className="border-b border-[#EEF0F4] last:border-b-0 hover:bg-[#FAF8FC]"><td className="px-3 py-3"><div className="flex items-center gap-2.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DFE8F8] text-[9px] font-extrabold text-[#294B85]">{initials(admin.name)}</span><span className="font-bold">{admin.name}</span></div></td><td className="px-3 py-3 text-[11px] text-[#637596]">{admin.email}</td><td className="px-3 py-3 text-[11px] font-semibold">{admin.role === 'super_admin' ? 'Super Admin' : 'Scanner Admin'}</td><td className="px-3 py-3"><div className="flex justify-end gap-3"><button type="button" disabled title="Edit is not available yet" aria-label={`Edit ${admin.name} unavailable`} className="text-[#756883] opacity-40"><Pencil className="h-4 w-4" /></button><button type="button" disabled title="Delete is not available yet" aria-label={`Delete ${admin.name} unavailable`} className="text-rose-500 opacity-40"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody>
        </table>
        {!visibleAdmins.length && <p className="px-4 py-10 text-center text-xs text-[#756883]">{isLoading ? 'Loading admins…' : error ? 'Unable to show admins.' : 'No admins match these filters.'}</p>}
        <div className="flex items-center justify-between gap-3 border-t border-[#EEF0F4] px-3 py-3 text-xs text-[#756883]"><span>{total.toLocaleString()} admins · Page {page} of {Math.max(1, Math.ceil(total / 25))}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page * 25 >= total || isLoading} onClick={() => setPage(page + 1)}>Next</Button></div></div>
      </div>

      {/* Create Admin Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Admin"
        description="Create an admin login with a temporary password. Share it privately; the admin must change it after first login."
      >
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
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
    </div>
  );
};
