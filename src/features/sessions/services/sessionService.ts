import { adminService } from '../../../services/adminService';
import { SessionRecord, CreateSessionPayload } from '../models';
import { EventRecord } from '../../../types';

export const sessionService = {
  async getEvents(): Promise<EventRecord[]> {
    return adminService.getEvents();
  },

  async getSessions(eventId: string): Promise<SessionRecord[]> {
    return adminService.getSessions(eventId) as Promise<SessionRecord[]>;
  },

  async createSession(eventId: string, payload: CreateSessionPayload): Promise<SessionRecord> {
    return adminService.createSession(eventId, payload) as Promise<SessionRecord>;
  },
  async updateSession(sessionId: string, payload: CreateSessionPayload): Promise<SessionRecord> {
    return adminService.updateSession(sessionId, payload) as Promise<SessionRecord>;
  },
};
