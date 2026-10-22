export interface StudentRecord {
  id: string;
  student_id: string;
  name: string;
  email?: string | null;
  course?: string | null;
  year_level?: number | null;
  rfid_uid?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface RegisterStudentPayload {
  student_id: string;
  name: string;
  email?: string;
  course?: string;
  year_level?: number;
  rfid_uid?: string;
}
