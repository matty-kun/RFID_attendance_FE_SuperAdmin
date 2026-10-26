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
  createEvent: (payload: Partial<EventRecord>) =>
    request.post<EventRecord>('/events', payload),
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
  getAdmins: (page = 1, q = '', limit = 25) =>
    request.get<AdminPage>('/admins', { params: { page, limit, ...(q ? { q } : {}) } }),
  createAdmin: (payload: Pick<AdminRecord, 'name' | 'email' | 'role'> & { temporary_password: string }) =>
    request.post<AdminRecord>('/admins', payload),
  getMetrics: () => request.get<DashboardMetrics>('/analytics/dashboard'),
};

export interface AdminPage { admins: AdminRecord[]; total: number; page: number; limit: number; }

export interface SessionLocations {
  session_id: string;
  time_in_locations: Array<{ id: string; name: string }>;
  time_out_locations: Array<{ id: string; name: string }>;
}
