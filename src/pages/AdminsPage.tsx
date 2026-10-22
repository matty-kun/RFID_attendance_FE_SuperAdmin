import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { AdminRecord } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/Table';
import { Users, Plus, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

export const AdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');

  const loadAdmins = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getAdmins();
      setAdmins(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // In a live system, this calls POST /admins
      const newAdmin: AdminRecord = {
        id: `adm-${Date.now()}`,
        name,
        email,
        role,
        created_at: new Date().toISOString(),
      };
      setAdmins((prev) => [...prev, newAdmin]);
      setIsModalOpen(false);
      setName('');
      setEmail('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gate Marshals & Administrators</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Super Admin access control: authorize campus marshals to run RFID scanner stations.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Add New Officer
        </Button>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-purple-700 shrink-0" />
        <p className="text-xs text-purple-900 font-medium">
          <strong>Super Admin Privileges:</strong> Only accounts assigned the <code className="font-bold">super_admin</code> role can access this web dashboard. Standard <code className="font-bold">admin</code> accounts are mobile kiosk gate marshals.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            <CardTitle>Authorized System Personnel ({admins.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Officer Name</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Role Tier</TableHead>
                <TableHead>Mobile Kiosk Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((adm) => (
                <TableRow key={adm.id}>
                  <TableCell className="font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                      {adm.name.slice(0, 2).toUpperCase()}
                    </div>
                    {adm.name}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-mono">{adm.email}</TableCell>
                  <TableCell>
                    <Badge variant={adm.role === 'super_admin' ? 'purple' : 'neutral'} dot>
                      {adm.role.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" /> Authorized
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
        title="Authorize New Officer"
        description="Add a marshal account to operate mobile RFID scanner kiosks."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Officer Full Name"
            placeholder="e.g. Jason Gate Marshal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            type="email"
            label="Officer Email"
            placeholder="e.g. jason.marshal@rfid-attendance.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role Tier</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="admin">Admin (Mobile Kiosk Gate Marshal)</option>
              <option value="super_admin">Super Admin (Full Web Platform Access)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} leftIcon={<Sparkles className="w-4 h-4" />}>
              Save Officer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
