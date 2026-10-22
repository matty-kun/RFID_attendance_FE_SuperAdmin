import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { DashboardMetrics, AttendanceRecord, EventRecord } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  Calendar,
  Clock,
  Radio,
  MapPin,
  Users,
  ArrowRight,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentScans, setRecentScans] = useState<AttendanceRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [_isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [m, scans, ev] = await Promise.all([
        adminService.getMetrics(),
        adminService.getRecentScans(8),
        adminService.getEvents(),
      ]);
      setMetrics(m);
      setRecentScans(scans);
      setEvents(ev);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      adminService.getRecentScans(8).then(setRecentScans);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const metricCards = [
    {
      title: 'Active Events',
      value: metrics?.totalEvents ?? '—',
      sub: 'Ongoing campus sports & fests',
      icon: Calendar,
      color: 'text-brand-600 bg-brand-50 border-brand-200',
    },
    {
      title: 'Active Sessions',
      value: metrics?.activeSessions ?? '—',
      sub: 'Open attendance windows',
      icon: Clock,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      title: "Today's RFID Scans",
      value: metrics?.todayScans ?? '—',
      sub: 'Recorded tap-ins & tap-outs',
      icon: Radio,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
    {
      title: 'Active Kiosks',
      value: metrics?.activeKiosks ?? '—',
      sub: 'Online marshal scanners',
      icon: MapPin,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Action Row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time telemetry and management controls for Intramurals 2026.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Link to="/events">
            <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              New Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map((m, idx) => {
          const Icon = m.icon;
          return (
            <Card key={idx} hoverEffect className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{m.title}</p>
                  <h3 className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{m.value}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{m.sub}</p>
                </div>
                <div className={`p-3 rounded-2xl border ${m.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid: Featured Events & Live RFID Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Featured Events & Sessions */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Featured Ongoing Events</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Active tournaments with kiosk attendance tracking</p>
              </div>
              <Link to="/events" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No events scheduled.</p>
              ) : (
                <div className="space-y-4">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{ev.name}</h4>
                          <Badge variant="open" dot>
                            ACTIVE
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">{ev.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-400 font-medium pt-1">
                          <span>📅 {ev.start_date} to {ev.end_date}</span>
                        </div>
                      </div>
                      <Link to="/sessions">
                        <Button variant="secondary" size="sm">
                          Manage Sessions
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Operations Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/sessions" className="block">
              <Card hoverEffect className="p-5 border-l-4 border-l-brand-600">
                <Clock className="w-5 h-5 text-brand-600 mb-2" />
                <h4 className="font-bold text-slate-900 text-sm">Schedule Windows</h4>
                <p className="text-xs text-slate-500 mt-1">Configure morning & afternoon time slots</p>
              </Card>
            </Link>
            <Link to="/locations" className="block">
              <Card hoverEffect className="p-5 border-l-4 border-l-emerald-600">
                <MapPin className="w-5 h-5 text-emerald-600 mb-2" />
                <h4 className="font-bold text-slate-900 text-sm">Hardware Kiosks</h4>
                <p className="text-xs text-slate-500 mt-1">Assign scanners to Gym, CITE, and Auditorium</p>
              </Card>
            </Link>
            <Link to="/admins" className="block">
              <Card hoverEffect className="p-5 border-l-4 border-l-purple-600">
                <Users className="w-5 h-5 text-purple-600 mb-2" />
                <h4 className="font-bold text-slate-900 text-sm">Gate Marshals</h4>
                <p className="text-xs text-slate-500 mt-1">Manage admin officer accounts & credentials</p>
              </Card>
            </Link>
          </div>
        </div>

        {/* Right Col: Live RFID Scan Stream */}
        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                <CardTitle>Live RFID Scans</CardTitle>
              </div>
              <Badge variant="neutral" className="text-[10px]">
                AUTO-POLLING
              </Badge>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                {recentScans.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">Awaiting scan inputs from kiosks...</p>
                ) : (
                  recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:shadow-xs transition-all flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {scan.student?.name || 'Student Scan'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {scan.student?.student_id || '2026-00001'} · {scan.location?.name?.split('-')[0] || 'Kiosk'}
                        </p>
                      </div>
                      <Badge variant={scan.type === 'time_in' ? 'success' : 'purple'} className="shrink-0 text-[10px]">
                        {scan.type === 'time_in' ? 'TIME IN' : 'TIME OUT'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 text-center">
                <Link to="/scans" className="text-xs font-bold text-brand-600 hover:text-brand-700">
                  Open full live audit stream →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
