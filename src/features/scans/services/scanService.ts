import { adminService } from '../../../services/adminService';
import { AttendanceRecord } from '../models';

export const scanService = {
  async getRecentScans(limit = 30): Promise<AttendanceRecord[]> {
    return adminService.getRecentScans(limit) as Promise<AttendanceRecord[]>;
  },
};
