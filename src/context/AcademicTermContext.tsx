import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { AcademicTerm } from '../types';
import {
  academicTermService,
  type CreateAcademicTermPayload,
  type UpdateAcademicTermPayload,
} from '../services/academicTermService';
import { toast } from './ToastContext';

interface AcademicTermContextType {
  activeTerm: AcademicTerm | null;
  selectedTerm: AcademicTerm | null;
  terms: AcademicTerm[];
  isLoading: boolean;
  error: string | null;
  setSelectedTerm: (term: AcademicTerm | null) => void;
  activateTerm: (termId: string) => Promise<AcademicTerm | null>;
  createTerm: (payload: CreateAcademicTermPayload) => Promise<AcademicTerm | null>;
  updateTerm: (id: string, payload: UpdateAcademicTermPayload) => Promise<AcademicTerm | null>;
  refreshTerms: () => Promise<void>;
}

const AcademicTermContext = createContext<AcademicTermContextType | undefined>(undefined);

const SELECTED_TERM_STORAGE_KEY = 'presnt_selected_academic_term_id';

export const AcademicTermProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTerm, setActiveTermState] = useState<AcademicTerm | null>(null);
  const [selectedTerm, setSelectedTermState] = useState<AcademicTerm | null>(null);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTerms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [fetchedActive, fetchedTerms] = await Promise.all([
        academicTermService.getActiveTerm().catch(() => null),
        academicTermService.getTerms().catch(() => [] as AcademicTerm[]),
      ]);

      const termList = Array.isArray(fetchedTerms) ? fetchedTerms : [];
      setTerms(termList);
      setActiveTermState(fetchedActive);

      // Restore previously chosen term from storage, or fallback to activeTerm, or first term
      const storedId = localStorage.getItem(SELECTED_TERM_STORAGE_KEY);
      let matchedTerm: AcademicTerm | null = null;
      if (storedId) {
        matchedTerm = termList.find((t) => t.id === storedId) || null;
      }
      if (!matchedTerm) {
        matchedTerm = fetchedActive || termList[0] || null;
      }

      setSelectedTermState(matchedTerm);
      if (matchedTerm) {
        localStorage.setItem(SELECTED_TERM_STORAGE_KEY, matchedTerm.id);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to load academic terms.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTerms();
  }, [refreshTerms]);

  const setSelectedTerm = useCallback((term: AcademicTerm | null) => {
    setSelectedTermState(term);
    if (term) {
      localStorage.setItem(SELECTED_TERM_STORAGE_KEY, term.id);
    } else {
      localStorage.removeItem(SELECTED_TERM_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('presnt:academic-term-changed', { detail: { term } }));
  }, []);

  const activateTerm = useCallback(async (termId: string): Promise<AcademicTerm | null> => {
    try {
      const activated = await academicTermService.activateTerm(termId);
      setActiveTermState(activated);
      setSelectedTerm(activated);
      await refreshTerms();
      toast.success(`Active term set to ${activated.school_year} ${activated.semester}. All student lists and reports now track this term.`);
      return activated;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to activate academic term.';
      toast.error(msg);
      return null;
    }
  }, [refreshTerms, setSelectedTerm]);

  const createTerm = useCallback(async (payload: CreateAcademicTermPayload): Promise<AcademicTerm | null> => {
    try {
      const created = await academicTermService.createTerm(payload);
      await refreshTerms();
      if (payload.set_active) {
        setActiveTermState(created);
        setSelectedTerm(created);
      }
      toast.success(`Academic term ${created.school_year} ${created.semester} created successfully.`);
      return created;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to create academic term.';
      toast.error(msg);
      return null;
    }
  }, [refreshTerms, setSelectedTerm]);

  const updateTerm = useCallback(async (id: string, payload: UpdateAcademicTermPayload): Promise<AcademicTerm | null> => {
    try {
      const updated = await academicTermService.updateTerm(id, payload);
      await refreshTerms();
      toast.success(`Academic term ${updated.school_year} ${updated.semester} updated successfully.`);
      return updated;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to update academic term.';
      toast.error(msg);
      return null;
    }
  }, [refreshTerms]);

  const contextValue = useMemo(() => ({
    activeTerm,
    selectedTerm,
    terms,
    isLoading,
    error,
    setSelectedTerm,
    activateTerm,
    createTerm,
    updateTerm,
    refreshTerms,
  }), [activeTerm, selectedTerm, terms, isLoading, error, setSelectedTerm, activateTerm, createTerm, updateTerm, refreshTerms]);

  return (
    <AcademicTermContext.Provider value={contextValue}>
      {children}
    </AcademicTermContext.Provider>
  );
};

const defaultContextValue: AcademicTermContextType = {
  activeTerm: null,
  selectedTerm: null,
  terms: [],
  isLoading: false,
  error: null,
  setSelectedTerm: () => {},
  activateTerm: async () => null,
  createTerm: async () => null,
  updateTerm: async () => null,
  refreshTerms: async () => {},
};

export const useAcademicTerm = (): AcademicTermContextType => {
  const context = useContext(AcademicTermContext);
  if (!context) {
    return defaultContextValue;
  }
  return context;
};
