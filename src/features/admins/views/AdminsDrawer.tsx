import React from 'react';
import { Shield } from 'lucide-react';
import { Drawer } from '../../../components/common/Drawer';
import { AdminsView } from './AdminsView';

export interface AdminsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminsDrawer: React.FC<AdminsDrawerProps> = ({ isOpen, onClose }) => {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Accounts"
      description="Manage administrator access, roles, and attendance accounts."
      icon={<Shield className="h-5 w-5 text-[#7026B7]" />}
      maxWidth="2xl"
    >
      <AdminsView isDrawer />
    </Drawer>
  );
};

export default AdminsDrawer;
