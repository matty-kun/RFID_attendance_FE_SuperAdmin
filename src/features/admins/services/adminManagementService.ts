import { adminService } from '../../../services/adminService';
import { AdminRecord, AdminPage, CreateAdminPayload } from '../models';

export const adminManagementService = {
  async getAdmins(page = 1, q = ''): Promise<AdminPage> {
    return adminService.getAdmins(page, q);
  },

  async createAdmin(payload: CreateAdminPayload): Promise<AdminRecord> {
    return adminService.createAdmin(payload);
  },
};
