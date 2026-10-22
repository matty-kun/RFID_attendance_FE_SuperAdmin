export type HealthState = 'checking' | 'healthy' | 'error';

export interface HealthCheckResult {
  status: HealthState;
  latency: number | null;
}
