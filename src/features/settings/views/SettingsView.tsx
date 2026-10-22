import React from 'react';
import { useSettingsViewModel } from '../viewmodels';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { CheckCircle2, XCircle, RefreshCw, Server, Shield, Database } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    user,
    apiUrl,
    healthStatus,
    latency,
    checkHealth,
  } = useSettingsViewModel();

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
          <Button
            variant="secondary"
            size="sm"
            onClick={checkHealth}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Test Connection
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">REST API URL</p>
              <p className="text-sm font-mono text-slate-900 font-semibold">{apiUrl}</p>
            </div>
            {healthStatus === 'healthy' ? (
              <Badge variant="emerald" dot>
                Online {latency ? `(${latency}ms)` : ''}
              </Badge>
            ) : healthStatus === 'checking' ? (
              <Badge variant="amber" dot>
                Checking...
              </Badge>
            ) : (
              <Badge variant="rose" dot>
                Offline / Unreachable
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            {healthStatus === 'healthy' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Backend Express API server is responsive and accepting calls.</span>
              </>
            ) : healthStatus === 'checking' ? (
              <>
                <RefreshCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                <span>Pinging localhost:3000/health...</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>
                  Backend server is offline. Local mock fallbacks are currently serving data. Run{' '}
                  <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">npm run dev</code> in{' '}
                  <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">Backend/</code> to connect.
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Database & Cloud */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-brand-600" />
            <CardTitle>Database Infrastructure</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-xs text-slate-600 font-semibold">Database Engine</span>
            <span className="text-xs font-mono font-bold text-slate-900">PostgreSQL (Supabase Cloud)</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-xs text-slate-600 font-semibold">Row Level Security (RLS)</span>
            <Badge variant="emerald" size="sm">Active</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-600 font-semibold">Authentication Protocol</span>
            <span className="text-xs font-mono font-bold text-slate-900">JWT Bearer (HS256)</span>
          </div>
        </CardContent>
      </Card>

      {/* Super Admin Session Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            <CardTitle>Active Super Admin Session</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-xs text-slate-600 font-semibold">Authenticated Name</span>
            <span className="text-xs font-bold text-slate-900">{user?.name || 'Super Admin'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-xs text-slate-600 font-semibold">Assigned Role</span>
            <Badge variant="purple" size="sm">{user?.role || 'super_admin'}</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-600 font-semibold">Admin Identifier</span>
            <span className="text-xs font-mono text-slate-500">{user?.id || '—'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
