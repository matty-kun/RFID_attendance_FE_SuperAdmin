import { api } from './api';
import {
  EventRecord,
  SessionRecord,
  LocationRecord,
  AdminRecord,
  AttendanceRecord,
  DashboardMetrics,
} from '../types';

export const adminService = {
  // --- EVENTS ---
  async getEvents(): Promise<EventRecord[]> {
    try {
      const data: any = await api.get('/events');
      return data || [];
    } catch {
      return [
        {
          id: '77777777-8888-4444-9999-000000000001',
          name: 'SIDLAK 2026: University Intramurals',
          description: 'Annual College Sports & Academic Festival with RFID kiosk attendance.',
          start_date: '2026-10-20',
          end_date: '2026-10-25',
          created_at: new Date().toISOString(),
        },
      ];
    }
  },

  async createEvent(payload: Partial<EventRecord>): Promise<EventRecord> {
    const data: any = await api.post('/events', payload);
    return data;
  },

  // --- SESSIONS ---
  async getSessions(eventId?: string): Promise<SessionRecord[]> {
    try {
      const url = eventId ? `/events/${eventId}/sessions` : '/sessions';
      const data: any = await api.get(url);
      return data || [];
    } catch {
      return [
        {
          id: '77777777-8888-4444-9999-000000000011',
          event_id: '77777777-8888-4444-9999-000000000001',
          name: 'Morning General Assembly',
          date: '2026-10-21',
          time_in_start: '07:00:00',
          time_in_end: '09:00:00',
          time_out_start: '11:30:00',
          time_out_end: '13:00:00',
        },
        {
          id: '77777777-8888-4444-9999-000000000012',
          event_id: '77777777-8888-4444-9999-000000000001',
          name: 'Afternoon Sports Competitions',
          date: '2026-10-21',
          time_in_start: '13:00:00',
          time_in_end: '14:30:00',
          time_out_start: '16:30:00',
          time_out_end: '18:30:00',
        },
      ];
    }
  },

  async createSession(eventId: string, payload: Partial<SessionRecord>): Promise<SessionRecord> {
    const data: any = await api.post(`/events/${eventId}/sessions`, payload);
    return data;
  },

  // --- LOCATIONS / KIOSKS ---
  async getLocations(): Promise<LocationRecord[]> {
    try {
      const data: any = await api.get('/locations');
      return data || [];
    } catch {
      return [
        { id: 'fb394945-1593-426f-89ff-4f2e55467ccb', name: 'CITE Building - Ground Floor Lobby', room_or_floor: 'Lobby Kiosk 1' },
        { id: 'f531764d-690b-4d98-a383-57759b24f76c', name: 'Gymnasium - Gate 1', room_or_floor: 'Main Gate Kiosk' },
        { id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d', name: 'University Auditorium - Main Entrance', room_or_floor: 'Auditorium Kiosk' },
      ];
    }
  },

  async createLocation(payload: Partial<LocationRecord>): Promise<LocationRecord> {
    const data: any = await api.post('/locations', payload);
    return data;
  },

  // --- ADMINS & MARSHALS ---
  async getAdmins(): Promise<AdminRecord[]> {
    try {
      const data: any = await api.get('/admins');
      return data || [];
    } catch {
      return [
        {
          id: 'f6bcdd54-2705-44fc-b094-e93befc8be4b',
          name: 'Super Admin Officer',
          email: 'admin@rfid-attendance.edu',
          role: 'super_admin',
          created_at: new Date().toISOString(),
        },
        {
          id: 'c1b2a3d4-0000-4444-9999-000000000002',
          name: 'Gate Marshal Jason',
          email: 'jason.marshal@rfid-attendance.edu',
          role: 'admin',
          created_at: new Date().toISOString(),
        },
      ];
    }
  },

  // --- LIVE SCANS & ATTENDANCE ---
  async getRecentScans(limit = 15): Promise<AttendanceRecord[]> {
    try {
      const data: any = await api.get('/attendance/recent', { params: { limit } });
      return data || [];
    } catch {
      return [
        {
          id: 'sc-1',
          student_id: '5a530cd1-fa4a-4778-8492-a419f215adf8',
          session_id: '77777777-8888-4444-9999-000000000012',
          location_id: 'f531764d-690b-4d98-a383-57759b24f76c',
          type: 'time_in',
          recorded_at: new Date().toISOString(),
          student: {
            student_id: '2026-00001',
            name: 'Juan Dela Cruz',
            course: 'BS Information Technology',
          },
          session: {
            id: '77777777-8888-4444-9999-000000000012',
            name: 'Afternoon Sports Competitions',
          },
          location: {
            id: 'f531764d-690b-4d98-a383-57759b24f76c',
            name: 'Gymnasium - Gate 1',
          },
        },
      ];
    }
  },

  // --- DASHBOARD METRICS ---
  async getMetrics(): Promise<DashboardMetrics> {
    try {
      const data: any = await api.get('/analytics/dashboard');
      return data;
    } catch {
      return {
        totalEvents: 4,
        activeSessions: 2,
        todayScans: 384,
        activeKiosks: 3,
        totalStudents: 1250,
        attendanceRate: 94.2,
      };
    }
  },
};
