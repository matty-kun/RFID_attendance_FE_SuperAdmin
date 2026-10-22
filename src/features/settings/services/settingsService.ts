import { api } from '../../../services/apiClient';
import { HealthCheckResult } from '../models';

export const settingsService = {
  async pingBackendHealth(): Promise<HealthCheckResult> {
    const start = performance.now();
    try {
      await api.get('/health', { baseURL: 'http://localhost:3000' });
      const elapsed = Math.round(performance.now() - start);
      return {
        status: 'healthy',
        latency: elapsed,
      };
    } catch {
      return {
        status: 'error',
        latency: null,
      };
    }
  },
};
