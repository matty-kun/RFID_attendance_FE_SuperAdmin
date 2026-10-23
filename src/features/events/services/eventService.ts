import { adminService } from '../../../services/adminService';
import { EventRecord, CreateEventPayload } from '../models';
import { isDevPreview } from '../../auth/devPreview';

const previewEvents: EventRecord[] = [];

export const eventService = {
  async getEvents(): Promise<EventRecord[]> {
    return isDevPreview() ? [...previewEvents] : adminService.getEvents() as Promise<EventRecord[]>;
  },

  async createEvent(payload: CreateEventPayload): Promise<EventRecord> {
    if (isDevPreview()) {
      const event: EventRecord = { ...payload, description: payload.description ?? null, id: `preview-event-${Date.now()}`, created_at: new Date().toISOString() };
      previewEvents.unshift(event);
      return event;
    }
    return adminService.createEvent(payload) as Promise<EventRecord>;
  },
};
