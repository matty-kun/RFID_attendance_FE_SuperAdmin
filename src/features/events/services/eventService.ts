import { adminService } from '../../../services/adminService';
import { EventRecord, CreateEventPayload } from '../models';

export const eventService = {
  async getEvents(): Promise<EventRecord[]> {
    return adminService.getEvents() as Promise<EventRecord[]>;
  },

  async createEvent(payload: CreateEventPayload): Promise<EventRecord> {
    return adminService.createEvent(payload) as Promise<EventRecord>;
  },
};
