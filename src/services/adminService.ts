import { request } from './apiClient';
import type {
  EventRecord,
  SessionRecord,
  LocationRecord,
  AdminRecord,
  AttendanceRecord,
  DashboardMetrics,
} from '../types';

export const adminService = {
  getEvents: () => request.get<EventRecord[]>('/events'),
  createEvent: (payload: Partial<EventRecord>) =>
    request.post<EventRecord>('/events', payload),
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
  getLocations: () => request.get<LocationRecord[]>('/locations'),
  createLocation: (payload: Partial<LocationRecord>) =>
    request.post<LocationRecord>('/locations', payload),
  getAdmins: () => request.get<AdminRecord[]>('/admins'),
  createAdmin: (payload: Pick<AdminRecord, 'name' | 'email' | 'role'>) =>
    request.post<AdminRecord>('/admins', payload),
  getRecentScans: (limit = 15) =>
    request.get<AttendanceRecord[]>('/attendance/recent', { params: { limit } }),
  getMetrics: () => request.get<DashboardMetrics>('/analytics/dashboard'),
};
