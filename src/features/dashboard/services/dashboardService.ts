import { adminService } from '../../../services/adminService';
import { DashboardMetrics } from '../models';
import { AttendanceRecord, EventRecord } from '../../../types';

export const dashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    const m = await adminService.getMetrics();
    return {
      totalEvents: m.totalEvents,
      activeSessions: m.activeSessions,
      totalLocations: m.totalLocations ?? 0,
      totalAdmins: m.totalAdmins ?? 0,
      totalScansToday: m.totalScansToday ?? m.todayScans ?? 0,
      activeKiosks: m.activeKiosks,
    };
  },

  async getRecentScans(limit = 8): Promise<AttendanceRecord[]> {
    return adminService.getRecentScans(limit);
  },

  async getEvents(): Promise<EventRecord[]> {
    return adminService.getEvents();
  },
};
