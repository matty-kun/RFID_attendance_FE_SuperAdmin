export interface EventRecord {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
}

export interface CreateEventPayload {
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
}
