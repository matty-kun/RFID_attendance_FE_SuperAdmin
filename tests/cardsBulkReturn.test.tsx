// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CardsPage } from '../src/pages/CardsPage';
import { request } from '../src/services/apiClient';

vi.mock('../src/context', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockIssuedCard = {
  id: 'card-1',
  uid: 'UID-1001',
  card_number: 'RFID-004',
  status: 'issued',
  created_at: '2026-11-24T08:48:00Z',
  holder: {
    id: 'assign-1',
    student_id: 'stud-1',
    student_number: '25-2820',
    student_name: 'Adorable, Mitzi Ferrer',
    issued_at: '2026-11-24T08:48:00Z',
    ended_at: null,
    end_reason: null,
  },
};

describe('CardsPage - Bulk Return Cards and Column Header Cleanup', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();

    vi.spyOn(request, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/cards?page=')) {
        return { cards: [mockIssuedCard], total: 1 };
      }
      if (url === '/cards/summary') {
        return { available: 0, issued: 1, lost_or_damaged: 0, total: 1 };
      }
      return {};
    });

    vi.spyOn(request, 'post').mockResolvedValue({});
  });

  it('renders clean "Card No." column header without "↑ Asc" or arrow indicator', async () => {
    render(
      <MemoryRouter>
        <CardsPage />
      </MemoryRouter>
    );

    const cardNoHeader = await screen.findByRole('button', { name: /^Card No\.$/ });
    expect(cardNoHeader).toBeTruthy();
    expect(cardNoHeader.textContent).toBe('Card No.');
    expect(cardNoHeader.querySelector('svg')).toBeNull();
  });

  it('shows "Return cards" in bulk action sidebar when issued cards are selected and handles bulk return', async () => {
    render(
      <MemoryRouter>
        <CardsPage />
      </MemoryRouter>
    );

    // Select the card via row checkbox
    const selectAllCheckbox = await screen.findByLabelText(/Select all cards on this page/i);
    fireEvent.click(selectAllCheckbox);

    // Side bulk actions should display "Return cards"
    const returnButton = await screen.findByRole('button', { name: /Return cards/i });
    expect(returnButton).toBeTruthy();

    // Click "Return cards" to open confirmation modal
    fireEvent.click(returnButton);

    // Modal opens with confirmation message
    expect(await screen.findByText(/Return 1 card\(s\) to inventory\?/i)).toBeTruthy();

    // Confirm the return
    const confirmButton = screen.getByRole('button', { name: 'Return Cards' });
    fireEvent.click(confirmButton);

    // Verify request posted
    await waitFor(() => {
      expect(request.post).toHaveBeenCalledWith(
        '/cards/UID-1001/actions',
        expect.objectContaining({ action: 'return' })
      );
    });
  });
});
