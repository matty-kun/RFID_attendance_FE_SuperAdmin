import { request } from './apiClient';
import { isDevPreview } from '../features/auth/devPreview';
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
  getSessionLocations: (sessionId: string) =>
    request.get<SessionLocations>(`/sessions/${encodeURIComponent(sessionId)}/locations`),
  saveSessionLocations: (sessionId: string, payload: { time_in_location_ids: string[]; time_out_location_ids: string[] }) =>
    request.put<SessionLocations>(`/sessions/${encodeURIComponent(sessionId)}/locations`, payload),
  getLocations: () => request.get<LocationRecord[]>('/locations'),
  createLocation: (payload: Partial<LocationRecord>) =>
    request.post<LocationRecord>('/locations', payload),
  getAdmins: (page = 1, q = '') => request.get<AdminPage>('/admins', { params: { page, limit: 25, ...(q ? { q } : {}) } }),
  createAdmin: (payload: Pick<AdminRecord, 'name' | 'email' | 'role'> & { temporary_password: string }) =>
    request.post<AdminRecord>('/admins', payload),
  getMetrics: () => isDevPreview() ? Promise.resolve(getPreviewMetrics()) : request.get<DashboardMetrics>('/analytics/dashboard'),
};

function getPreviewMetrics(): DashboardMetrics {
  const manilaToday = new Date(Date.now() + 8 * 60 * 60 * 1000);
  manilaToday.setUTCHours(0, 0, 0, 0);
  const timeIns = [790, 825, 865, 986];
  const timeOuts = [110, 125, 90, 118];
  return {
    totalEvents: 3,
    totalSessions: 8,
    totalLocations: 4,
    totalAdmins: 14,
    totalStudents: 1240,
    totalScans: 4200,
    todayTimeIns: timeIns[3],
    attendanceByDay: timeIns.map((count, index) => ({
      date: new Date(manilaToday.getTime() - (3 - index) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      timeIns: count,
      timeOuts: timeOuts[index],
    })),
    locationActivity: [
      { id: 'preview-1', name: 'Primera', scansToday: 974 },
      { id: 'preview-2', name: 'Gymnasium', scansToday: 759 },
      { id: 'preview-3', name: 'ETD Court', scansToday: 505 },
      { id: 'preview-4', name: 'Main Gate', scansToday: 248 },
    ],
  };
}

export interface AdminPage { admins: AdminRecord[]; total: number; page: number; limit: number; }

export interface SessionLocations {
  session_id: string;
  time_in_locations: Array<{ id: string; name: string }>;
  time_out_locations: Array<{ id: string; name: string }>;
}
