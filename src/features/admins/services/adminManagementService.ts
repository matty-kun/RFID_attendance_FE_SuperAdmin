import { adminService } from '../../../services/adminService';
import { AdminRecord, CreateAdminPayload } from '../models';

export const adminManagementService = {
  async getAdmins(): Promise<AdminRecord[]> {
    return adminService.getAdmins() as Promise<AdminRecord[]>;
  },

  async createAdmin(payload: CreateAdminPayload): Promise<AdminRecord> {
    const newAdmin: AdminRecord = {
      id: `adm-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      created_at: new Date().toISOString(),
    };
    return newAdmin;
  },
};
