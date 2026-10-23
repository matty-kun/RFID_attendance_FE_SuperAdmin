import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSessionsViewModel } from '../viewmodels';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/common/Table';
import { Clock, Plus, Sparkles } from 'lucide-react';
import { getEventStatus, getSessionStatus } from '../../../utils/status';
import { SessionLocationsDialog } from './SessionLocationsDialog';

export const SessionsView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialEventId = searchParams.get('eventId') || '';
  const [checkpointSessionId, setCheckpointSessionId] = useState<string | null>(null);

  const {
    sessions,
    events,
    selectedEventId,
    setSelectedEventId,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    editingSessionId,
    formError,
    startEdit,
    startCreate,
    name,
    setName,
    date,
    setDate,
    timeInStart,
    setTimeInStart,
    timeInEnd,
    setTimeInEnd,
    timeOutStart,
    setTimeOutStart,
    timeOutEnd,
    setTimeOutEnd,
    handleCreate,
  } = useSessionsViewModel(initialEventId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Sessions</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Configure Time In / Time Out scanning windows and enforce valid periods.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={startCreate}
          disabled={events.length === 0}
        >
          Create Session
        </Button>
      </div>

      {/* Event Filter Selector */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
          Filter By Event:
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full max-w-xs px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name} ({getEventStatus(ev.start_date, ev.end_date)})
            </option>
          ))}
        </select>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            Sessions for Selected Event ({sessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time In Window</TableHead>
                <TableHead>Time Out Window</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                    No sessions found for this event. Click "Create Session" above.
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((ses) => (
                  <TableRow key={ses.id}>
                    <TableCell>
                      <div className="font-bold text-slate-800 text-sm">{ses.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        ID: {ses.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          getSessionStatus(ses.date, ses.time_in_start, ses.time_out_end) === 'open'
                            ? 'emerald'
                            : getSessionStatus(ses.date, ses.time_in_start, ses.time_out_end) === 'upcoming'
                            ? 'brand'
                            : 'slate'
                        }
                        dot
                      >
                        {getSessionStatus(ses.date, ses.time_in_start, ses.time_out_end)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600">
                      {new Date(ses.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">
                      <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono text-[11px]">
                        {ses.time_in_start} - {ses.time_in_end}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">
                      <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 font-mono text-[11px]">
                        {ses.time_out_start} - {ses.time_out_end}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => startEdit(ses)} className="text-xs font-semibold text-brand-700 hover:underline">Edit</button>
                        <button type="button" onClick={() => setCheckpointSessionId(ses.id)} className="text-xs font-semibold text-brand-700 hover:underline">Checkpoints</button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {checkpointSessionId && (
        <SessionLocationsDialog sessionId={checkpointSessionId} onClose={() => setCheckpointSessionId(null)} />
      )}

      {/* Create Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSessionId ? 'Edit Attendance Session' : 'Create Attendance Session'}
        description="Define the scanning window hours for student check-ins."
      >
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          {formError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">{formError}</p>}
          <Input
            label="Session Name"
            placeholder="e.g. Day 1 - Morning Assembly"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Session Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/50 space-y-3">
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Time In Window
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Window Opens"
                type="time"
                value={timeInStart}
                onChange={(e) => setTimeInStart(e.target.value)}
                required
              />
              <Input
                label="Window Closes"
                type="time"
                value={timeInEnd}
                onChange={(e) => setTimeInEnd(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/50 space-y-3">
            <div className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Time Out Window
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Window Opens"
                type="time"
                value={timeOutStart}
                onChange={(e) => setTimeOutStart(e.target.value)}
                required
              />
              <Input
                label="Window Closes"
                type="time"
                value={timeOutEnd}
                onChange={(e) => setTimeOutEnd(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Save Session
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
