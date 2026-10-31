// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { ResetPasswordModal } from '../src/components/common/ResetPasswordModal';
import { StudentProfileDrawer } from '../src/features/students/views/StudentProfileDrawer';
import { AdminProfileDrawer } from '../src/features/admins/views/AdminProfileDrawer';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('../src/services/apiClient', () => ({
  request: {
    get: mocks.get,
    post: mocks.post,
    patch: mocks.patch,
  },
}));

vi.mock('../src/context', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
  toast: {
    success: mocks.showToast,
    error: mocks.showToast,
    info: mocks.showToast,
  },
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ResetPasswordModal component', () => {
  const studentAccount = {
    id: 'student-uuid-1',
    name: 'Juan Dela Cruz',
    email: 'juan@student.presnt.edu',
    identifier: '2026-00045',
    type: 'Student' as const,
  };

  const adminAccount = {
    id: 'admin-uuid-1',
    name: 'Maria Santos',
    email: 'maria@presnt.edu',
    identifier: 'Admin',
    type: 'Admin' as const,
  };

  it('renders target account identity clearly to prevent accidental password changes', () => {
    render(
      <ResetPasswordModal
        isOpen={true}
        onClose={vi.fn()}
        account={studentAccount}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText('Reset Student Password')).toBeTruthy();
    expect(screen.getByText('Juan Dela Cruz')).toBeTruthy();
    expect(screen.getByText('juan@student.presnt.edu')).toBeTruthy();
    expect(screen.getByText('2026-00045')).toBeTruthy();
    expect(screen.getByText('Selected Target Account')).toBeTruthy();
  });

  it('renders admin target account identity accurately', () => {
    render(
      <ResetPasswordModal
        isOpen={true}
        onClose={vi.fn()}
        account={adminAccount}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText('Reset Admin Password')).toBeTruthy();
    expect(screen.getByText('Maria Santos')).toBeTruthy();
    expect(screen.getByText('maria@presnt.edu')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
  });

  it('renders all three password requirements in the real-time checklist', () => {
    render(
      <ResetPasswordModal
        isOpen={true}
        onClose={vi.fn()}
        account={studentAccount}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText('Password Requirements')).toBeTruthy();
    expect(screen.getByText('At least 8 characters long')).toBeTruthy();
    expect(screen.getByText('Contains at least one number (0–9)')).toBeTruthy();
    expect(screen.getByText('Contains at least one special character (e.g., !, @, #, $, %)')).toBeTruthy();

    // Initially all three are unchecked
    const reqLength = screen.getByTestId('req-length');
    const reqNumber = screen.getByTestId('req-number');
    const reqSpecial = screen.getByTestId('req-special');

    expect(reqLength.getAttribute('aria-label')).toContain('not satisfied');
    expect(reqNumber.getAttribute('aria-label')).toContain('not satisfied');
    expect(reqSpecial.getAttribute('aria-label')).toContain('not satisfied');
  });

  it('updates checklist indicators in real time as the user types', () => {
    render(
      <ResetPasswordModal
        isOpen={true}
        onClose={vi.fn()}
        account={studentAccount}
        onReset={vi.fn()}
      />
    );

    const newPassInput = screen.getByLabelText(/^New Password$/i);
    const reqLength = screen.getByTestId('req-length');
    const reqNumber = screen.getByTestId('req-number');
    const reqSpecial = screen.getByTestId('req-special');

    // Type 6 characters without numbers or special chars
    fireEvent.change(newPassInput, { target: { value: 'secret' } });
    expect(reqLength.getAttribute('aria-label')).toContain('not satisfied');
    expect(reqNumber.getAttribute('aria-label')).toContain('not satisfied');
    expect(reqSpecial.getAttribute('aria-label')).toContain('not satisfied');

    // Type 8 characters with number only
    fireEvent.change(newPassInput, { target: { value: 'secret12' } });
    expect(reqLength.getAttribute('aria-label')).toContain('satisfied');
    expect(reqNumber.getAttribute('aria-label')).toContain('satisfied');
    expect(reqSpecial.getAttribute('aria-label')).toContain('not satisfied');

    // Add special character
    fireEvent.change(newPassInput, { target: { value: 'secret12!' } });
    expect(reqLength.getAttribute('aria-label')).toBe('At least 8 characters long satisfied');
    expect(reqNumber.getAttribute('aria-label')).toBe('Contains at least one number (0–9) satisfied');
    expect(reqSpecial.getAttribute('aria-label')).toBe('Contains at least one special character (e.g., !, @, #, $, %) satisfied');
  });

  it('validates empty inputs and prevents submission', async () => {
    const onReset = vi.fn();
    render(
      <ResetPasswordModal
        isOpen={true}
        onClose={vi.fn()}
        account={studentAccount}
        onReset={onReset}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(submitBtn);

    expect(onReset).not.toHaveBeenCalled();
    expect(await screen.findByText('New password is required.')).toBeTruthy();
  });

  it('validates passwords shorter than 8 characters', async () => {
    const onReset = vi.fn();
    render(
      <ResetPasswordModal
        isOpen={true}
        onClose={vi.fn()}
        account={studentAccount}
        onReset={onReset}
      />
    );

    const newPassInput = screen.getByLabelText(/^New Password$/i);
    const confirmPassInput = screen.getByLabelText(/^Confirm New Password$/i);

    fireEvent.change(newPassInput, { target: { value: 'sh1!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'sh1!' } });

    const submitBtn = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(submitBtn);

    expect(onReset).not.toHaveBeenCalled();
    expect(await screen.findByText('Password must be at least 8 characters long.')).toBeTruthy();
  });

  it('validates passwords missing a number', async () => {
    const onReset = vi.fn();
    render(
      <ResetPasswordModal
        isOpen={true}
        onClose={vi.fn()}
        account={studentAccount}
        onReset={onReset}
      />
    );

    const newPassInput = screen.getByLabelText(/^New Password$/i);
    const confirmPassInput = screen.getByLabelText(/^Confirm New Password$/i);

    fireEvent.change(newPassInput, { target: { value: 'Password!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'Password!' } });

    const submitBtn = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(submitBtn);

    expect(onReset).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Password must contain at least one number (0–9).')
    ).toBeTruthy();
  });

  it('validates passwords missing a special character', async () => {
    const onReset = vi.fn();
    render(
      <ResetPasswordModal
        isOpen={true}
        onClose={vi.fn()}
        account={studentAccount}
        onReset={onReset}
      />
    );

    const newPassInput = screen.getByLabelText(/^New Password$/i);
    const confirmPassInput = screen.getByLabelText(/^Confirm New Password$/i);

    fireEvent.change(newPassInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPassInput, { target: { value: 'Password123' } });

    const submitBtn = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(submitBtn);

    expect(onReset).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Password must contain at least one special character (e.g., !, @, #, $, %).')
    ).toBeTruthy();
  });

  it('validates mismatched passwords and blocks submission', async () => {
    const onReset = vi.fn();
    render(
      <ResetPasswordModal
        isOpen={true}
        onClose={vi.fn()}
        account={studentAccount}
        onReset={onReset}
      />
    );

    const newPassInput = screen.getByLabelText(/^New Password$/i);
    const confirmPassInput = screen.getByLabelText(/^Confirm New Password$/i);

    fireEvent.change(newPassInput, { target: { value: 'ValidPassword123!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'DifferentPassword123!' } });

    const submitBtn = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(submitBtn);

    expect(onReset).not.toHaveBeenCalled();
    expect(await screen.findByText('Passwords do not match. Please re-enter.')).toBeTruthy();
  });

  it('allows password visibility toggle', () => {
    render(
      <ResetPasswordModal
        isOpen={true}
        onClose={vi.fn()}
        account={studentAccount}
        onReset={vi.fn()}
      />
    );

    const newPassInput = screen.getByLabelText(/^New Password$/i) as HTMLInputElement;
    expect(newPassInput.type).toBe('password');

    const toggleBtns = screen.getAllByLabelText('Show password');
    fireEvent.click(toggleBtns[0]);

    expect(newPassInput.type).toBe('text');

    const hideBtn = screen.getByLabelText('Hide password');
    fireEvent.click(hideBtn);

    expect(newPassInput.type).toBe('password');
  });

  it('submits valid matching passwords and closes dialog on success', async () => {
    const onReset = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <ResetPasswordModal
        isOpen={true}
        onClose={onClose}
        account={studentAccount}
        onReset={onReset}
      />
    );

    const newPassInput = screen.getByLabelText(/^New Password$/i);
    const confirmPassInput = screen.getByLabelText(/^Confirm New Password$/i);

    fireEvent.change(newPassInput, { target: { value: 'StrongPassword123!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'StrongPassword123!' } });

    const submitBtn = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onReset).toHaveBeenCalledWith('student-uuid-1', 'StrongPassword123!');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('displays backend error message and prevents dialog close on failure', async () => {
    const errorResponse = {
      response: {
        data: {
          error: {
            message: 'Target student account does not have a linked authentication account.',
          },
        },
      },
    };
    const onReset = vi.fn().mockRejectedValue(errorResponse);
    const onClose = vi.fn();

    render(
      <ResetPasswordModal
        isOpen={true}
        onClose={onClose}
        account={studentAccount}
        onReset={onReset}
      />
    );

    const newPassInput = screen.getByLabelText(/^New Password$/i);
    const confirmPassInput = screen.getByLabelText(/^Confirm New Password$/i);

    fireEvent.change(newPassInput, { target: { value: 'StrongPassword123!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'StrongPassword123!' } });

    const submitBtn = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onReset).toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(
        screen.getByText('Target student account does not have a linked authentication account.')
      ).toBeTruthy();
    });
  });
});

describe('StudentProfileDrawer password reset integration', () => {
  const student = {
    id: 'student-1',
    student_id: '2026-0001',
    name: 'Ana Cruz',
    email: 'ana@ndmc.edu.ph',
    course: 'BS Computer Science',
    year_level: 2,
    rfid_uid: '123456',
    created_at: '2026-10-01T00:00:00Z',
  };

  it('renders Reset Password button and opens password reset modal', async () => {
    mocks.get.mockResolvedValue({ scans: [] });
    const resetFn = vi.fn().mockResolvedValue(true);

    render(
      <StudentProfileDrawer
        isOpen={true}
        onClose={vi.fn()}
        student={student}
        onResetPassword={resetFn}
        onUnlinkCard={vi.fn()}
        onQuickPair={vi.fn()}
        onOpenRapidScan={vi.fn()}
      />
    );

    const resetBtn = screen.getByRole('button', { name: 'Reset Password' });
    expect(resetBtn).toBeTruthy();

    fireEvent.click(resetBtn);

    expect(await screen.findByText('Reset Student Password')).toBeTruthy();
    expect(screen.getAllByText('Ana Cruz').length).toBeGreaterThanOrEqual(1);
  });
});

describe('AdminProfileDrawer password reset integration', () => {
  const admin = {
    id: 'admin-1',
    auth_user_id: 'auth-user-1',
    name: 'Officer Davis',
    email: 'davis@ndmc.edu.ph',
    role: 'admin' as const,
    created_at: '2026-10-01T00:00:00Z',
  };

  it('renders Reset Password button and opens password reset modal', async () => {
    const resetFn = vi.fn().mockResolvedValue(true);

    render(
      <AdminProfileDrawer
        isOpen={true}
        onClose={vi.fn()}
        admin={admin}
        onUpdate={vi.fn()}
        onResetPassword={resetFn}
        onArchive={vi.fn()}
        onRestore={vi.fn()}
        isSelf={false}
        onDelete={vi.fn()}
        onUploadAvatar={vi.fn()}
        onRemoveAvatar={vi.fn()}
        onLoadCheckpointActivity={vi.fn().mockResolvedValue({ records: [], total: 0, page: 1, limit: 5 })}
      />
    );

    const resetBtn = screen.getByRole('button', { name: 'Reset Password' });
    expect(resetBtn).toBeTruthy();

    fireEvent.click(resetBtn);

    expect(await screen.findByText('Reset Admin Password')).toBeTruthy();
    expect(screen.getAllByText('Officer Davis').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('davis@ndmc.edu.ph').length).toBeGreaterThanOrEqual(1);
  });
});
