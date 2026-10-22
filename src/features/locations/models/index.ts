export interface LocationRecord {
  id: string;
  name: string;
  room_or_floor?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateLocationPayload {
  name: string;
  room_or_floor?: string;
}
