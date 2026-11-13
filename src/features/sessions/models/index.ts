export interface SessionRecord {
  id: string;
  event_id: string;
  name: string;
  date: string;
  time_in_start: string;
  time_in_end: string;
  time_out_start: string;
  time_out_end: string;
  status?: 'upcoming' | 'open' | 'closed';
  event?: {
    name: string;
  };
}

export interface CreateSessionPayload {
  name: string;
  date: string;
  time_in_start: string;
  time_in_end: string;
  time_out_start: string;
  time_out_end: string;
}
