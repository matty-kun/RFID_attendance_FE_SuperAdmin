// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AssignOfficersDrawer, type AssignedOfficer } from '../src/features/events/views/AssignOfficersDrawer';

const mocks = vi.hoisted(() => ({
  getAdmins: vi.fn(),
  getLocations: vi.fn(),
}));

vi.mock('../src/services/adminService', () => ({
  adminService: {
    getAdmins: mocks.getAdmins,
    getLocations: mocks.getLocations,
  },
}));

const sampleAdmins = [
  {
    id: 'super-1',
    auth_user_id: 'auth-super-1',
    name: 'Chief Super Admin',
    email: 'chief@example.com',
    role: 'super_admin' as const,
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'admin-1',
    auth_user_id: 'auth-admin-1',
    name: 'Regular Officer',
    email: 'officer@example.com',
    role: 'admin' as const,
    created_at: '2026-10-01T00:00:00Z',
  },
];

const sampleLocations = [
  { id: 'loc-1', name: 'Main Gate', created_at: '2026-10-01T00:00:00Z' },
];

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.getAdmins.mockResolvedValue({ admins: sampleAdmins, total: sampleAdmins.length, page: 1, limit: 100 });
  mocks.getLocations.mockResolvedValue(sampleLocations);
});

describe('AssignOfficersDrawer', () => {
  it('excludes super_admin accounts from Available Officers and only lists admin accounts', async () => {
    render(
      <AssignOfficersDrawer
        isOpen
        onClose={vi.fn()}
        sessionName="Morning Session"
        sessionTime="07:00 AM - 09:00 AM"
        sessionDate="November 22, 2026"
        onSave={vi.fn()}
      />
    );

    expect(await screen.findByText('Regular Officer')).toBeTruthy();
    expect(screen.queryByText('Chief Super Admin')).toBeNull();
    expect(screen.getByText('Available Officers (1)')).toBeTruthy();
  });

  it('does not surface super_admin accounts when searching by name', async () => {
    render(
      <AssignOfficersDrawer
        isOpen
        onClose={vi.fn()}
        sessionName="Morning Session"
        sessionTime="07:00 AM - 09:00 AM"
        sessionDate="November 22, 2026"
        onSave={vi.fn()}
      />
    );

    await screen.findByText('Regular Officer');

    const searchInput = screen.getByPlaceholderText('Search officer name...');
    fireEvent.change(searchInput, { target: { value: 'Chief' } });

    expect(screen.queryByText('Chief Super Admin')).toBeNull();
    expect(screen.getByText('No administrators available.')).toBeTruthy();
  });

  it('does not add a removed legacy super_admin back into Available Officers', async () => {
    const legacyAssigned: AssignedOfficer[] = [
      {
        id: 'super-1',
        name: 'Chief Super Admin',
        initials: 'CS',
        role: 'Super Admin',
        location: 'Main Gate',
        locationId: 'loc-1',
        dutyType: 'both',
        status: 'Offline',
      },
    ];

    render(
      <AssignOfficersDrawer
        isOpen
        onClose={vi.fn()}
        sessionName="Morning Session"
        sessionTime="07:00 AM - 09:00 AM"
        sessionDate="November 22, 2026"
        initialAssigned={legacyAssigned}
        onSave={vi.fn()}
      />
    );

    expect(await screen.findByText('Chief Super Admin')).toBeTruthy();
    expect(screen.getByText('Regular Officer')).toBeTruthy();

    fireEvent.click(screen.getByTitle('Remove assignment'));

    await waitFor(() => {
      expect(screen.queryByText('Chief Super Admin')).toBeNull();
    });
    expect(screen.getByText('Available Officers (1)')).toBeTruthy();
  });
});
