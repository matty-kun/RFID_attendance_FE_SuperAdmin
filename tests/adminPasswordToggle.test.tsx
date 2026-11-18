// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AdminsView } from '../src/features/admins/views/AdminsView';

const mockAdminsViewModel = {
  admins: [],
  isModalOpen: true,
  setIsModalOpen: vi.fn(),
  isSubmitting: false,
  formError: null,
  isLoading: false,
  name: 'Test Admin',
  setName: vi.fn(),
  email: 'test@example.com',
  setEmail: vi.fn(),
  role: 'admin',
  setRole: vi.fn(),
  temporaryPassword: 'InitialSecretPass123!',
  setTemporaryPassword: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
  page: 1,
  setPage: vi.fn(),
  total: 0,
  error: null,
  showArchived: false,
  setShowArchived: vi.fn(),
  loadAdmins: vi.fn(),
  handleCreate: vi.fn((e) => e.preventDefault()),
  handleUpdateAdmin: vi.fn(),
  handleResetPassword: vi.fn(),
  handleArchiveAdmin: vi.fn(),
  handleRestoreAdmin: vi.fn(),
  deletingAdmin: null,
  setDeletingAdmin: vi.fn(),
  handleDeleteAdmin: vi.fn(),
  uploadAdminAvatar: vi.fn(),
  removeAdminAvatar: vi.fn(),
  loadAdminCheckpointActivity: vi.fn(),
};

vi.mock('../src/features/admins/viewmodels', () => ({
  useAdminsViewModel: () => mockAdminsViewModel,
}));

vi.mock('../src/features/auth/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'sa-1', name: 'Super Admin', role: 'super_admin' },
  }),
}));

describe('Register Administrator Password Toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles temporary password visibility between masked and plain text', () => {
    render(<AdminsView />);

    const passwordInput = screen.getByLabelText(/^Temporary Password/i, { selector: 'input' }) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleButton = screen.getByRole('button', { name: /Show temporary password/i });
    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe('text');

    const hideButton = screen.getByRole('button', { name: /Hide temporary password/i });
    fireEvent.click(hideButton);

    expect(passwordInput.type).toBe('password');
  });
});
