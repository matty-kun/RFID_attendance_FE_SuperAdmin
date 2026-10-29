export interface StudentRecord {
  id: string;
  auth_user_id?: string | null;
  student_id: string;
  name: string;
  email?: string | null;
  course?: string | null;
  year_level?: number | null;
  rfid_uid?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at?: string;
  archived_at?: string | null;
}

export interface StudentPage {
  students: StudentRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface StudentRosterStats {
  active: number;
  with_cards: number;
  without_cards: number;
  archived: number;
}

export interface RegisterStudentPayload {
  student_id: string;
  name: string;
  email: string;
  temporary_password: string;
  course?: string;
  year_level?: number;
  rfid_uid?: string;
}

export interface UpdateStudentPayload {
  name?: string;
  course?: string | null;
  year_level?: number | null;
  rfid_uid?: string | null;
  avatar_url?: string | null;
}

export interface InventoryCard {
  id: string;
  cardNumber: number;
  uid: string;
  status: 'unassigned' | 'assigned' | 'lost';
  assignedToStudentId?: string | null;
  assignedToStudentName?: string | null;
  registeredAt: string;
}

export interface BulkImportStudentRow {
  student_id: string;
  name: string;
  email?: string;
  temporary_password?: string;
  course?: string;
  year_level?: number;
  rfid_uid?: string;
}
