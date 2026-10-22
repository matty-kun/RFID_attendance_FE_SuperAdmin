import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { SessionRecord, EventRecord } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/Table';
import { Clock, Plus, Sparkles } from 'lucide-react';

export const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [_isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [timeInStart, setTimeInStart] = useState('07:00');
  const [timeInEnd, setTimeInEnd] = useState('09:00');
  const [timeOutStart, setTimeOutStart] = useState('11:30');
  const [timeOutEnd, setTimeOutEnd] = useState('13:00');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [evList, sesList] = await Promise.all([
        adminService.getEvents(),
        adminService.getSessions(selectedEventId || undefined),
      ]);
      setEvents(evList);
      if (evList.length > 0 && !selectedEventId) {
        setSelectedEventId(evList[0].id);
      }
      setSessions(sesList);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEventId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setIsSubmitting(true);
    try {
      await adminService.createSession(selectedEventId, {
        name,
        date,
        time_in_start: `${timeInStart}:00`,
        time_in_end: `${timeInEnd}:00`,
        time_out_start: `${timeOutStart}:00`,
        time_out_end: `${timeOutEnd}:00`,
      });
      setIsModalOpen(false);
      setName('');
      setDate('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create session');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Sessions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Define daily morning and afternoon scanning windows for kiosk RFID readers.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Add New Session
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-600" />
            <CardTitle>Session Windows ({sessions.length})</CardTitle>
          </div>
          {events.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span>Event:</span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time In Window</TableHead>
                <TableHead>Time Out Window</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    No sessions scheduled for this event.
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((ses) => (
                  <TableRow key={ses.id}>
                    <TableCell className="font-bold text-slate-900">{ses.name}</TableCell>
                    <TableCell className="font-medium text-xs">{ses.date}</TableCell>
                    <TableCell className="text-xs font-semibold text-emerald-700 bg-emerald-50/50">
                      IN: {ses.time_in_start.slice(0, 5)} – {ses.time_in_end.slice(0, 5)}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-purple-700 bg-purple-50/50">
                      OUT: {ses.time_out_start.slice(0, 5)} – {ses.time_out_end.slice(0, 5)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="open" dot>
                        ACTIVE
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Attendance Session"
        description="Configure check-in and check-out scanning windows."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Session Name"
            placeholder="e.g. Afternoon Sports Competitions"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            type="date"
            label="Session Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4 pt-2">
            <Input
              type="time"
              label="Time In Start"
              value={timeInStart}
              onChange={(e) => setTimeInStart(e.target.value)}
              required
            />
            <Input
              type="time"
              label="Time In End"
              value={timeInEnd}
              onChange={(e) => setTimeInEnd(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="time"
              label="Time Out Start"
              value={timeOutStart}
              onChange={(e) => setTimeOutStart(e.target.value)}
              required
            />
            <Input
              type="time"
              label="Time Out End"
              value={timeOutEnd}
              onChange={(e) => setTimeOutEnd(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} leftIcon={<Sparkles className="w-4 h-4" />}>
              Save Session Window
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
