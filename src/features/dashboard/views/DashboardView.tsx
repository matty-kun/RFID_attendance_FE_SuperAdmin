import React from 'react';
import { useDashboardViewModel } from '../viewmodels';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
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

export const DashboardView: React.FC = () => {
  const { metrics, recentScans, events, isLoading, loadData } = useDashboardViewModel();

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
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      title: 'Active RFID Kiosks',
      value: metrics?.activeKiosks ?? '—',
      sub: 'Online reader stations',
      icon: Radio,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Scans Today',
      value: metrics?.totalScansToday ?? '—',
      sub: 'RFID cards tapped today',
      icon: Users,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-950 via-slate-900 to-brand-900 p-8 border border-brand-800/40 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <Badge variant="purple" className="mb-3 uppercase tracking-wider text-[11px] font-black">
            Super Administrator Control Plane
          </Badge>
          <h1 className="text-3xl font-black tracking-tight">Campus Attendance Overview</h1>
          <p className="text-slate-300 mt-2 text-sm leading-relaxed">
            Monitor real-time student taps, coordinate event sessions, dispatch marshal kiosks, and enforce attendance windows across all campus venues.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/events">
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Create New Event
              </Button>
            </Link>
            <Link to="/live-scans">
              <Button variant="secondary" size="sm" leftIcon={<Radio className="w-4 h-4 text-emerald-400" />}>
                Live Scan Stream
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              isLoading={isLoading}
              className="text-slate-300 hover:text-white"
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Sync Live Metrics
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title} hoverEffect>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {c.title}
                  </span>
                  <div className={`p-2.5 rounded-xl border ${c.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-black text-slate-900 tracking-tight">{c.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{c.sub}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Two Column Layout: Events List & Live Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Events (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600" />
              Active & Upcoming Events
            </h2>
            <Link
              to="/events"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {events.slice(0, 4).map((ev) => (
              <Card key={ev.id} className="hover:border-brand-300 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant={ev.status === 'ongoing' ? 'emerald' : 'slate'} dot>
                        {ev.status}
                      </Badge>
                      <CardTitle className="text-base mt-2 line-clamp-1">{ev.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-slate-500">
                  <p className="line-clamp-2">{ev.description || 'No description provided.'}</p>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(ev.start_date).toLocaleDateString()}
                    </span>
                    <Link
                      to={`/sessions?eventId=${ev.id}`}
                      className="text-brand-600 font-bold hover:underline"
                    >
                      Sessions →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Scans Stream (1 col) */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
              Live Scanner Stream
            </h2>
            <Link
              to="/live-scans"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Full Feed
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card>
            <CardContent className="p-0 divide-y divide-slate-100">
              {recentScans.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  No RFID taps recorded yet today.
                </div>
              ) : (
                recentScans.map((scan) => (
                  <div key={scan.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                          {scan.student?.name ? scan.student.name.charAt(0) : 'S'}
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-800 line-clamp-1">
                            {scan.student?.name || scan.student_id}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {scan.student?.student_number || scan.rfid_tag_id}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          scan.status === 'on_time'
                            ? 'emerald'
                            : scan.status === 'late'
                            ? 'amber'
                            : 'rose'
                        }
                        size="sm"
                      >
                        {scan.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {scan.location?.name || 'Gate Scanner'}
                      </span>
                      <span>
                        {new Date(scan.scanned_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
