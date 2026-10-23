import { adminService } from '../../../services/adminService';
import { AdminRecord, CreateAdminPayload } from '../models';

export const adminManagementService = {
  async getAdmins(): Promise<AdminRecord[]> {
    return adminService.getAdmins() as Promise<AdminRecord[]>;
  },

  async createAdmin(payload: CreateAdminPayload): Promise<AdminRecord> {
    return adminService.createAdmin(payload);
  },
};
