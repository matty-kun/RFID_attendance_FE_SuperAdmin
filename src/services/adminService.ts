import { request } from './apiClient';
import type {
  EventRecord,
  SessionRecord,
  LocationRecord,
  AdminRecord,
  DashboardMetrics,
} from '../types';

async function migrateLegacyOfficerAssignments() {
  const keys = Object.keys(localStorage).filter((key) => key.startsWith('presnt_officers_'));
  for (const key of keys) {
    const sessionId = key.slice('presnt_officers_'.length);
    try {
      const saved = await request.get<SessionOfficers>(`/sessions/${encodeURIComponent(sessionId)}/officers`);
      if (saved.assignments.length === 0) {
        const legacy = JSON.parse(localStorage.getItem(key) || '[]') as Array<{
          id: string; locationId?: string; dutyType?: 'in' | 'out' | 'both';
        }>;
        const assignments = legacy.flatMap((officer) => {
          if (!officer.locationId) return [];
          const types: Array<'time_in' | 'time_out'> = officer.dutyType === 'in'
            ? ['time_in'] : officer.dutyType === 'out' ? ['time_out'] : ['time_in', 'time_out'];
          return types.map((type) => ({ admin_id: officer.id, location_id: officer.locationId!, type }));
        });
        if (assignments.length) {
          await request.put(`/sessions/${encodeURIComponent(sessionId)}/officers`, { assignments });
        }
      }
      localStorage.removeItem(key);
    } catch {
      // Leave this session's legacy assignments for a later retry.
    }
  }
}

export const adminService = {
  getEvents: () => request.get<EventRecord[]>('/events'),
  getActiveEvent: () =>
    request.get<{ active_event_id: string | null; event: EventRecord | null }>('/events/active'),
  setActiveEvent: (eventId: string) =>
    request.put<{ message: string; active_event_id: string; event: EventRecord }>(
      `/events/${encodeURIComponent(eventId)}/active`
    ),
  createEvent: (payload: Partial<EventRecord>) =>
    request.post<EventRecord>('/events', payload),
  updateEvent: (eventId: string, payload: Partial<EventRecord>) =>
    request.patch<EventRecord>(`/events/${encodeURIComponent(eventId)}`, payload),
  deleteEvent: (eventId: string) =>
    request.delete<{ message: string }>(`/events/${encodeURIComponent(eventId)}`),
  getSessions: (eventId: string) =>
    request.get<SessionRecord[]>(
      `/events/${encodeURIComponent(eventId)}/sessions`
    ),
  createSession: (eventId: string, payload: Partial<SessionRecord>) =>
    request.post<SessionRecord>(
      `/events/${encodeURIComponent(eventId)}/sessions`,
      payload
    ),
  updateSession: (sessionId: string, payload: Partial<SessionRecord>) =>
    request.patch<SessionRecord>(`/sessions/${encodeURIComponent(sessionId)}`, payload),
  deleteSession: (sessionId: string) =>
    request.delete<{ message: string }>(`/sessions/${encodeURIComponent(sessionId)}`),
  getSessionLocations: (sessionId: string) =>
    request.get<SessionLocations>(`/sessions/${encodeURIComponent(sessionId)}/locations`),
  saveSessionLocations: (sessionId: string, payload: { time_in_location_ids: string[]; time_out_location_ids: string[] }) =>
    request.put<SessionLocations>(`/sessions/${encodeURIComponent(sessionId)}/locations`, payload),
  getSessionOfficers: (sessionId: string) =>
    request.get<SessionOfficers>(`/sessions/${encodeURIComponent(sessionId)}/officers`),
  saveSessionOfficers: (sessionId: string, assignments: Array<{ admin_id: string; location_id: string; type: 'time_in' | 'time_out' }>) =>
    request.put<SessionOfficers>(`/sessions/${encodeURIComponent(sessionId)}/officers`, { assignments }),
  getLocations: () => request.get<LocationRecord[]>('/locations'),
  createLocation: (payload: Partial<LocationRecord>) =>
    request.post<LocationRecord>('/locations', payload),
  updateLocation: (locationId: string, name: string) =>
    request.patch<LocationRecord>(`/locations/${encodeURIComponent(locationId)}`, { name }),
  deleteLocation: (locationId: string) =>
    request.delete<{ message: string }>(`/locations/${encodeURIComponent(locationId)}`),
  getAdmins: (page = 1, q = '', limit = 25, archived = false) =>
    request.get<AdminPage>('/admins', { params: { page, limit, archived, ...(q ? { q } : {}) } }),
  getAdminCheckpointActivity: async (adminId: string, page = 1, limit = 5) => {
    await migrateLegacyOfficerAssignments();
    return request.get<import('../features/admins/models').AdminCheckpointActivityPage>(`/admins/${encodeURIComponent(adminId)}/assignment-history`, { params: { page, limit } });
  },
  createAdmin: (payload: Pick<AdminRecord, 'name' | 'email' | 'role'> & { temporary_password: string }) =>
    request.post<AdminRecord>('/admins', payload),
  updateAdmin: (adminId: string, payload: { name?: string; role?: 'admin' | 'super_admin'; password?: string }) =>
    request.patch<AdminRecord>(`/admins/${encodeURIComponent(adminId)}`, payload),
  archiveAdmin: (adminId: string) => request.post<AdminRecord>(`/admins/${encodeURIComponent(adminId)}/archive`, {}),
  restoreAdmin: (adminId: string) => request.post<AdminRecord>(`/admins/${encodeURIComponent(adminId)}/restore`, {}),
  deleteAdmin: (adminId: string) =>
    request.delete<{ message: string }>(`/admins/${encodeURIComponent(adminId)}`),
  uploadAdminAvatar: (adminId: string, image: string) =>
    request.post<{ avatar_url: string }>(`/admins/${encodeURIComponent(adminId)}/avatar`, { image }),
  removeAdminAvatar: (adminId: string) => request.delete<{ avatar_url: null }>(`/admins/${encodeURIComponent(adminId)}/avatar`),
  getMetrics: () => request.get<DashboardMetrics>('/analytics/dashboard'),
};

export interface AdminPage { admins: AdminRecord[]; total: number; page: number; limit: number; }

export interface SessionLocations {
  session_id: string;
  time_in_locations: Array<{ id: string; name: string }>;
  time_out_locations: Array<{ id: string; name: string }>;
}

export interface SessionOfficers {
  session_id: string;
  assignments: Array<{
    admin_id: string;
    admin_name: string;
    admin_role: 'admin' | 'super_admin';
    location_id: string;
    location_name: string;
    type: 'time_in' | 'time_out';
  }>;
}
