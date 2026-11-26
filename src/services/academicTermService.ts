import { request } from './apiClient';
import type { AcademicTerm, SemesterType, SmartBulkSyncItem, SmartBulkSyncSummary } from '../types';

export interface CreateAcademicTermPayload {
  school_year: string;
  semester: SemesterType;
  start_date: string;
  end_date: string;
  set_active?: boolean;
}

export interface UpdateAcademicTermPayload {
  school_year?: string;
  semester?: SemesterType;
  start_date?: string;
  end_date?: string;
}

export const academicTermService = {
  getActiveTerm: () => request.get<AcademicTerm | null>('/academic-terms/active'),
  
  getTerms: () => request.get<AcademicTerm[]>('/academic-terms'),
  
  createTerm: (payload: CreateAcademicTermPayload) =>
    request.post<AcademicTerm>('/academic-terms', payload),
    
  updateTerm: (id: string, payload: UpdateAcademicTermPayload) =>
    request.patch<AcademicTerm>(`/academic-terms/${encodeURIComponent(id)}`, payload),
    
  activateTerm: (id: string) =>
    request.put<AcademicTerm>(`/academic-terms/${encodeURIComponent(id)}/activate`),
    
  bulkSyncStudents: (termId: string, students: SmartBulkSyncItem[]) =>
    request.post<SmartBulkSyncSummary>('/academic-terms/bulk-sync', {
      term_id: termId,
      students,
    }),
};
