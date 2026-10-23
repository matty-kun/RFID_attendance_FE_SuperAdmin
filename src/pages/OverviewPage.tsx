import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, ShieldCheck, GraduationCap, Radio, RefreshCw } from 'lucide-react';
import { adminService } from '../services/adminService';
import type { DashboardMetrics } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

const cards = [
  { key: 'totalEvents', label: 'Events', path: '/events', icon: Calendar },
  { key: 'totalSessions', label: 'Sessions', path: '/sessions', icon: Clock },
  { key: 'totalLocations', label: 'Locations', path: '/locations', icon: MapPin },
  { key: 'totalStudents', label: 'Students', path: '/students', icon: GraduationCap },
  { key: 'totalAdmins', label: 'Staff accounts', path: '/admins', icon: ShieldCheck },
  { key: 'totalScans', label: 'Attendance scans', path: '/attendance', icon: Radio },
] as const;

export function OverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setMetrics(await adminService.getMetrics()); }
    catch { setError('Could not load the overview. Try again.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900">System overview</h1>
        <p className="mt-1 text-sm text-slate-500">Totals from registered records. Select a card to open its directory.</p>
      </div>
      <Button variant="secondary" size="sm" onClick={refresh} isLoading={loading} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(({ key, label, path, icon: Icon }) => <Link key={key} to={path} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-brand-600">
        <Card hoverEffect className="h-full">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">{label}</p>
              {loading && !metrics ? <div className="mt-4 h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
                : <p className="mt-2 text-3xl font-black text-slate-900">{metrics?.[key].toLocaleString() ?? '—'}</p>}
            </div>
            <span className="rounded-xl bg-brand-50 p-3 text-brand-700"><Icon className="h-5 w-5" /></span>
          </div>
        </Card>
      </Link>)}
    </div>
  </div>;
}
