import { adminService } from '../../../services/adminService';
import { AdminRecord, AdminPage, CreateAdminPayload, UpdateAdminPayload } from '../models';

export const adminManagementService = {
  async getAdmins(page = 1, q = ''): Promise<AdminPage> {
    return adminService.getAdmins(page, q);
  },

  async createAdmin(payload: CreateAdminPayload): Promise<AdminRecord> {
    return adminService.createAdmin(payload);
  },

  async updateAdmin(adminId: string, payload: UpdateAdminPayload): Promise<AdminRecord> {
    return adminService.updateAdmin(adminId, payload);
  },

  async deleteAdmin(adminId: string): Promise<{ message: string }> {
    return adminService.deleteAdmin(adminId);
  },

  async uploadAvatar(adminId: string, image: string): Promise<{ avatar_url: string }> {
    return adminService.uploadAdminAvatar(adminId, image);
  },
};
