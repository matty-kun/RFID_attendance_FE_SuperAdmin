// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CardsPage } from '../src/pages/CardsPage';
import { toStudentScan } from '../src/features/students/views/studentScan';
import { StudentProfileDrawer } from '../src/features/students/views/StudentProfileDrawer';
import { ReportsPage } from '../src/pages/ReportsPage';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), showToast: vi.fn() }));
vi.mock('../src/services/apiClient', () => ({ request: { get: mocks.get, post: mocks.post } }));
vi.mock('../src/context', () => ({ useToast: () => ({ showToast: mocks.showToast }), toast: { success: mocks.showToast, error: mocks.showToast } }));
vi.mock('../src/services/adminService', () => ({ adminService: { getEvents: () => Promise.resolve([]) } }));

const issued = { id: 'card-1', uid: '123456', card_number: 'RFID-001', status: 'issued', created_at: '2026-10-01T00:00:00Z', holder: { id: 'assignment-1', student_id: 'student-1', student_number: '2026-0001', student_name: 'Ana Cruz', issued_at: '2026-10-01T00:00:00Z', ended_at: null, end_reason: null } };
const available = { ...issued, status: 'available', holder: null };

function setup(card: typeof issued | typeof available) {
  mocks.get.mockImplementation((url: string) => {
    if (url.startsWith('/cards?page=')) return Promise.resolve({ cards: [card], total: 1 });
    if (url === '/cards/summary') return Promise.resolve({ available: Number(card.status === 'available'), issued: Number(card.status === 'issued'), lost_or_damaged: 0 });
    if (url === `/cards/${card.id}`) return Promise.resolve({ card, assignments: card.holder ? [card.holder] : [], events: [], recent_scans: [] });
    throw new Error(`Unexpected request: ${url}`);
  });
  mocks.post.mockResolvedValue({});
  render(<MemoryRouter><CardsPage /></MemoryRouter>);
}

beforeEach(() => { cleanup(); vi.clearAllMocks(); });

describe('card handoff and archive', () => {
  it('requires confirmation before returning an issued card', async () => {
    setup(issued);
    fireEvent.click(await screen.findByRole('button', { name: /View History/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Return card' }));
    expect(mocks.post).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm return' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/cards/123456/actions', expect.objectContaining({ action: 'return' })));
  });

  it('archives only after confirmation and keeps the card record', async () => {
    setup(available);
    fireEvent.click(await screen.findByRole('button', { name: /View History/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Archive card' }));
    expect(mocks.post).not.toHaveBeenCalled();
    const buttons = await screen.findAllByRole('button', { name: 'Archive card' });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/cards/123456/actions', expect.objectContaining({ action: 'archive' })));
    expect(mocks.get).toHaveBeenCalledWith('/cards/card-1');
  });
});

describe('attendance history', () => {
  it('uses the card recorded on each scan, even after the student changes cards', () => {
    const scan = toStudentScan({
      id: 'scan-1', type: 'time_in', recorded_at: '2026-10-02T00:00:00Z',
      card_number: 'RFID-001', location_name: 'Gate 1',
      session: { id: 'session-1', name: 'Morning', date: '2026-10-02', event_id: 'event-1', event_name: 'Festival', event_start_date: '2026-10-01', time_in_start: '07:00:00', time_in_end: '09:00:00', time_out_start: '16:00:00', time_out_end: '18:00:00' },
    });
    expect(scan.cardNumber).toBe('RFID-001');
    expect(scan.dayLabel).toBe('Day 2');
    expect(scan.locationName).toBe('Gate 1');
  });
});

describe('student archive', () => {
  it('asks for confirmation and passes the selected student ID', async () => {
    mocks.get.mockResolvedValue({ scans: [] });
    const archive = vi.fn().mockResolvedValue(true);
    render(<StudentProfileDrawer
      isOpen onClose={vi.fn()}
      student={{ id: 'student-1', student_id: '2026-0001', name: 'Ana Cruz', course: 'BS Computer Science', year_level: 2, rfid_uid: '123456', created_at: '2026-10-01T00:00:00Z' }}
      onArchiveStudent={archive} onUnlinkCard={vi.fn()} onQuickPair={vi.fn()} onOpenRapidScan={vi.fn()}
    />);
    fireEvent.click(await screen.findByRole('button', { name: 'Archive Student' }));
    expect(archive).not.toHaveBeenCalled();
    const buttons = await screen.findAllByRole('button', { name: 'Archive Student' });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(archive).toHaveBeenCalledExactlyOnceWith('student-1'));
  });
});

describe('report pagination', () => {
  it('loads summaries with one page of records, then requests the next page', async () => {
    mocks.get.mockResolvedValue({ summary: { studentsCheckedIn: 1, timeIns: 1, timeOuts: 0, totalScans: 1 }, trend: [], sessions: [], checkpoints: [], courses: [], rows: [], rowTotal: 26, sessionsOptions: [], courseOptions: [], locationOptions: [] });
    render(<ReportsPage />);
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/reports', expect.objectContaining({ params: expect.objectContaining({ page: 1, limit: 25 }) })));
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/reports', expect.objectContaining({ params: expect.objectContaining({ page: 2, limit: 25 }) })));
    expect(mocks.get.mock.calls.every(([url]) => url === '/reports')).toBe(true);
  });
});
