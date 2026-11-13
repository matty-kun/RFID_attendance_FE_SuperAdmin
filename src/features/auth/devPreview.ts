import type { SuperAdminUser } from './models';

export const DEV_PREVIEW_TOKEN = 'dev-preview-super-admin';

export const DEV_PREVIEW_USER: SuperAdminUser = {
  id: '00000000-0000-0000-0000-000000000001',
  role: 'super_admin',
  name: 'Preview Super Admin',
  email: 'preview@campus.edu',
  must_change_password: false,
};

export function isDevPreview(): boolean {
  return false;
}
