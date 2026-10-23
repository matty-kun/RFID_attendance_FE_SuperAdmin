import type { SuperAdminUser } from './models';

export const DEV_PREVIEW_TOKEN = 'local-ui-preview-only';

export const DEV_PREVIEW_USER: SuperAdminUser = {
  id: 'local-preview',
  name: 'UI Preview',
  email: 'preview@local.invalid',
  role: 'super_admin',
};

export function isDevPreview(): boolean {
  return import.meta.env.DEV && localStorage.getItem('super_admin_token') === DEV_PREVIEW_TOKEN;
}
