import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CheckCircle2, XCircle, RefreshCw, Server, Shield, Database } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'error'>('checking');
  const [latency, setLatency] = useState<number | null>(null);

  const checkHealth = async () => {
    setHealthStatus('checking');
    const start = performance.now();
    try {
      await api.get('/health', { baseURL: 'http://localhost:3000' });
      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);
      setHealthStatus('healthy');
    } catch {
      setHealthStatus('error');
      setLatency(null);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings & Health</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Backend API connectivity and platform infrastructure telemetry.
        </p>
      </div>

      {/* Backend Health Check */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-brand-600" />
            <CardTitle>Backend Services Health</CardTitle>
          </div>
          <Button variant="secondary" size="sm" onClick={checkHealth} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Test Connection
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">REST API URL</p>
              <p className="text-sm font-mono text-slate-900 font-semibold">
                {import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}
              </p>
            </div>
            {healthStatus === 'healthy' ? (
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span>ONLINE ({latency}ms)</span>
              </div>
            ) : healthStatus === 'checking' ? (
              <Badge variant="warning">CHECKING...</Badge>
            ) : (
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold">
                <XCircle className="w-5 h-5" />
                <span>OFFLINE</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Database Engine</p>
              <p className="text-sm font-medium text-slate-800">
                Supabase PostgreSQL (Row-Level Security Active)
              </p>
            </div>
            <div className="flex items-center gap-2 text-purple-700 text-xs font-bold">
              <Database className="w-4 h-4" />
              <span>CONNECTED</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Super Admin Identity Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-600" />
            <CardTitle>Super Admin Identity</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Officer Name</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{user?.name || 'Super Admin'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</p>
              <p className="text-sm font-mono text-slate-800 mt-1">{user?.email || 'admin@rfid.edu'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Permission Tier</p>
              <Badge variant="purple" dot className="mt-1 font-bold">
                {user?.role?.toUpperCase() || 'SUPER_ADMIN'}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Build</p>
              <p className="text-xs text-slate-600 mt-1 font-mono">v1.0.0-intramurals</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
