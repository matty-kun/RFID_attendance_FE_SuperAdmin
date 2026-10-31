import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSessionsViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { Dropdown } from '../../../components/common/Dropdown';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { EmptyState } from '../../../components/common/EmptyState';
import { LoadingState } from '../../../components/common/LoadingState';
import { Clock, MapPin, Pencil, Plus, RefreshCw, Sparkles } from 'lucide-react';
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
    isLoading,
    error,
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
    loadData,
    handleCreate,
  } = useSessionsViewModel(initialEventId);

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4 text-[#24133F]">
      {/* Top Header */}
      <div>
        <h1 className="text-[22px] font-extrabold leading-tight">Attendance Sessions</h1>
        <p className="text-[11px] text-[#756883]">
          Configure Time In / Time Out scanning windows and enforce valid periods.
        </p>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Dropdown
          value={selectedEventId}
          onChange={(val) => setSelectedEventId(val)}
          options={events.map((ev) => ({
            value: ev.id,
            label: `${ev.name} (${getEventStatus(ev.start_date, ev.end_date)})`,
          }))}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadData()}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={startCreate}
            disabled={events.length === 0}
          >
            Create Session
          </Button>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#E5E0EB] bg-white p-2.5">
        {error && (
          <div role="alert" className="mb-2 flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            <span>{error}</span>
            <button type="button" onClick={() => void loadData()} className="underline">
              Retry
            </button>
          </div>
        )}
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="bg-[#F4F6FA] text-[10px] uppercase text-[#637596]">
              <th className="rounded-l-xl px-3 py-3 font-medium">Session Name</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Time In Window</th>
              <th className="px-3 py-3 font-medium">Time Out Window</th>
              <th className="rounded-r-xl px-3 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-6">
                  <LoadingState
                    title="Loading sessions…"
                    description="Retrieving session check-in and check-out time windows."
                    compact
                  />
                </td>
              </tr>
            ) : error && sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6">
                  <EmptyState
                    variant="error"
                    title="Unable to load sessions"
                    description="Could not connect to the server. Please check your connection and retry."
                    action={{
                      label: 'Retry Loading',
                      variant: 'primary',
                      onClick: () => void loadData(),
                    }}
                    compact
                  />
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6">
                  <EmptyState
                    variant="empty-list"
                    title={events.length === 0 ? 'No campus events found' : 'No sessions created yet'}
                    description={
                      events.length === 0
                        ? 'Create a campus event first before configuring attendance sessions.'
                        : 'Configure time windows for students to scan in and out.'
                    }
                    action={
                      events.length > 0
                        ? {
                            label: 'Create Session',
                            variant: 'primary',
                            onClick: startCreate,
                          }
                        : undefined
                    }
                    compact
                  />
                </td>
              </tr>
            ) : (
              sessions.map((ses) => {
                const status = getSessionStatus(ses.date, ses.time_in_start, ses.time_out_end);
                return (
                  <tr key={ses.id} className="border-b border-[#EEF0F4] last:border-b-0 hover:bg-[#FAF8FC]">
                    <td className="px-3 py-3">
                      <div className="font-bold text-slate-900 text-sm">{ses.name}</div>
                      <div className="text-[10px] text-[#756883] font-mono mt-0.5">
                        ID: {ses.id}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant={
                          status === 'open'
                            ? 'emerald'
                            : status === 'upcoming'
                            ? 'brand'
                            : 'slate'
                        }
                        dot
                      >
                        {status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-[#637596]">
                      {new Date(`${ses.date}T00:00:00+08:00`).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E4F7EB] text-[#16883F] font-mono text-[11px]">
                        <Clock className="w-3 h-3" />
                        {ses.time_in_start} - {ses.time_in_end}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF2DE] text-[#A96800] font-mono text-[11px]">
                        <Clock className="w-3 h-3" />
                        {ses.time_out_start} - {ses.time_out_end}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => startEdit(ses)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckpointSessionId(ses.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#637596] hover:text-[#24133F]"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Checkpoints
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-[#EEF0F4] px-3 pt-3 text-xs text-[#756883]">
          <span>{sessions.length} session{sessions.length !== 1 ? 's' : ''} listed</span>
        </div>
      </div>

      {checkpointSessionId && (
        <SessionLocationsDialog sessionId={checkpointSessionId} onClose={() => setCheckpointSessionId(null)} />
      )}

      {/* Create / Edit Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSessionId ? 'Edit Attendance Session' : 'Create Attendance Session'}
        description="Define the scanning window hours for student check-ins."
      >
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          {formError && (
            <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {formError}
            </p>
          )}
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

          <div className="p-3.5 rounded-2xl bg-[#E4F7EB]/50 border border-[#17B556]/20 space-y-3">
            <div className="text-xs font-bold text-[#16883F] uppercase tracking-wider flex items-center gap-1.5">
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

          <div className="p-3.5 rounded-2xl bg-[#FFF2DE]/60 border border-[#F59E0B]/20 space-y-3">
            <div className="text-xs font-bold text-[#A96800] uppercase tracking-wider flex items-center gap-1.5">
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
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              Save Session
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
