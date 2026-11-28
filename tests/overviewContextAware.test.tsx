// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { OverviewPage } from '../src/pages/OverviewPage';
import * as AcademicTermContext from '../src/context/AcademicTermContext';
import { adminService } from '../src/services/adminService';
import { studentService } from '../src/features/students/services/studentService';
import { request } from '../src/services/apiClient';

vi.mock('../src/components/testing/ScanTimingTestPanel', () => ({
  ScanTimingTestPanel: () => null,
}));

describe('OverviewPage - Hybrid Context-Aware Overview', () => {
  const mockActiveTerm = {
    id: 'term-active',
    school_year: '2026-2027',
    semester: '2nd Sem',
    is_active: true,
    start_date: '2026-11-01T00:00:00Z',
    end_date: '2027-03-31T00:00:00Z',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  };

  const mockPastTerm = {
    id: 'term-past',
    school_year: '2026-2027',
    semester: '1st Sem',
    is_active: false,
    start_date: '2026-06-01T00:00:00Z',
    end_date: '2026-10-31T00:00:00Z',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(adminService, 'getMetrics').mockResolvedValue({
      totalLocations: 10,
      locationActivity: [{ id: 'loc-1', name: 'Beach Volley', scansToday: 5 }],
      attendanceByDay: [
        { date: '2026-11-26', timeIns: 3, timeOuts: 25 },
        { date: '2026-11-27', timeIns: 7, timeOuts: 0 },
        { date: '2026-11-28', timeIns: 5, timeOuts: 0 },
      ],
    } as any);

    vi.spyOn(studentService, 'getRosterStats').mockResolvedValue({
      total: 724,
      active: 724,
      archived: 0,
      with_cards: 58,
    } as any);

    vi.spyOn(adminService, 'getActiveEvent').mockResolvedValue({
      active_event_id: 'event-live',
      event: { id: 'event-live', name: 'Testing Event Live' } as any,
    });

    vi.spyOn(adminService, 'getEvents').mockResolvedValue([
      {
        id: 'event-past-1',
        name: 'Past Festival',
        start_date: '2026-08-10T00:00:00Z',
        end_date: '2026-08-12T00:00:00Z',
      } as any,
    ]);

    vi.spyOn(request, 'get').mockImplementation(async (url: string) => {
      if (url === '/reports') {
        return {
          summary: { totalScans: 132 },
          trend: [{ day: '2026-08-10', timeIns: 20, timeOuts: 15 }],
          checkpoints: [{ name: 'Gym Gate 1', total: 35, inScans: 20, outScans: 15 }],
        };
      }
      return {};
    });
  });

  it('renders Live Operations mode when viewing active term', async () => {
    vi.spyOn(AcademicTermContext, 'useAcademicTerm').mockReturnValue({
      activeTerm: mockActiveTerm,
      selectedTerm: mockActiveTerm,
      terms: [mockActiveTerm, mockPastTerm],
      isLoading: false,
      error: null,
      setSelectedTerm: vi.fn(),
      activateTerm: vi.fn(),
      createTerm: vi.fn(),
      updateTerm: vi.fn(),
      refreshTerms: vi.fn(),
    });

    render(
      <BrowserRouter>
        <OverviewPage />
      </BrowserRouter>
    );

    // Live mode indicators
    expect(await screen.findByText(/Live Operations · Today/i)).toBeTruthy();
    expect(screen.getByText(/Attendance today/i)).toBeTruthy();
    expect(screen.getByText('Testing Event Live')).toBeTruthy();
    expect(screen.getByText('Scans today')).toBeTruthy();
  });

  it('renders Historical Term Archive mode and switch button when viewing past term', async () => {
    const setSelectedTermMock = vi.fn();
    vi.spyOn(AcademicTermContext, 'useAcademicTerm').mockReturnValue({
      activeTerm: mockActiveTerm,
      selectedTerm: mockPastTerm,
      terms: [mockActiveTerm, mockPastTerm],
      isLoading: false,
      error: null,
      setSelectedTerm: setSelectedTermMock,
      activateTerm: vi.fn(),
      createTerm: vi.fn(),
      updateTerm: vi.fn(),
      refreshTerms: vi.fn(),
    });

    render(
      <BrowserRouter>
        <OverviewPage />
      </BrowserRouter>
    );

    // Historical mode indicators
    expect(await screen.findByText(/Semester Archive · 2026-2027 1st Sem/i)).toBeTruthy();
    expect(screen.getByText(/1st Sem Overview/i)).toBeTruthy();
    expect(screen.getByText('Term Scans')).toBeTruthy();
    expect(screen.getByText('Term Events')).toBeTruthy();

    // Clicking "Return to Live Today" switches back to active term
    const returnButtons = screen.getAllByRole('button', { name: /Return to Live Today/i });
    expect(returnButtons.length).toBeGreaterThan(0);
    fireEvent.click(returnButtons[0]);
    expect(setSelectedTermMock).toHaveBeenCalledWith(mockActiveTerm);
  });
});
