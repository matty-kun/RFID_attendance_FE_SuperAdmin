import { request } from './apiClient';
import type {
  EventRecord,
  SessionRecord,
  LocationRecord,
  AdminRecord,
  DashboardMetrics,
} from '../types';

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
  getLocations: () => request.get<LocationRecord[]>('/locations'),
  createLocation: (payload: Partial<LocationRecord>) =>
    request.post<LocationRecord>('/locations', payload),
  getAdmins: (page = 1, q = '', limit = 25, archived = false) =>
    request.get<AdminPage>('/admins', { params: { page, limit, archived, ...(q ? { q } : {}) } }),
  getAdminCheckpointActivity: (adminId: string, page = 1, limit = 5) =>
    request.get<import('../features/admins/models').AdminCheckpointActivityPage>(`/admins/${encodeURIComponent(adminId)}/checkpoint-activity`, { params: { page, limit } }),
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
