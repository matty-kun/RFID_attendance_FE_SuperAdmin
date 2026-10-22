import React from 'react';
import { useAdminsViewModel } from '../viewmodels';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/common/Table';
import { Users, Plus, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

export const AdminsView: React.FC = () => {
  const {
    admins,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    name,
    setName,
    email,
    setEmail,
    role,
    setRole,
    handleCreate,
  } = useAdminsViewModel();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Administrators & Marshals</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage personnel credentials, kiosk authorization levels, and super admin privileges.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Administrator
        </Button>
      </div>

      {/* Security Info Card */}
      <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200/60 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-brand-700 shrink-0 mt-0.5" />
        <div className="text-xs text-brand-900 leading-relaxed">
          <span className="font-black">Role Privilege Notice:</span> Administrators assigned the{' '}
          <code className="font-mono bg-brand-100 text-brand-800 px-1 py-0.5 rounded font-bold">
            super_admin
          </code>{' '}
          role can create sessions, provision hardware kiosks, generate attendance reports, and promote marshals.
        </div>
      </div>

      {/* Admins Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-600" />
            Registered Staff & Marshals ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role Tier</TableHead>
                <TableHead>Account Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-400 text-xs">
                    No administrators found.
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((adm) => (
                  <TableRow key={adm.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 border border-brand-200 text-brand-800 flex items-center justify-center font-black text-xs">
                          {adm.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800 text-sm">{adm.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600">{adm.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={adm.role === 'super_admin' ? 'purple' : 'slate'}
                        size="sm"
                        dot
                      >
                        {adm.role === 'super_admin' ? 'Super Administrator' : 'Field Marshal'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-mono">
                      {new Date(adm.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Admin Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Staff Member"
        description="Invite or provision an account for campus staff or event marshals."
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
                  Field Marshal
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
