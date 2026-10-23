import React from 'react';
import { useEventsViewModel } from '../viewmodels';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/common/Table';
import { Plus, Calendar, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getEventStatus } from '../../../utils/status';

export const EventsView: React.FC = () => {
  const {
    events,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    formError,
    name,
    setName,
    description,
    setDescription,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    handleCreate,
  } = useEventsViewModel();

  return (
    <div className="space-y-6">
      {/* Header with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Campus Events</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage university celebrations, sports leagues, and departmental assemblies.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Create Event
        </Button>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            Registered Events ({events.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                    No campus events found. Click "Create Event" to register one.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <div className="font-bold text-slate-800 text-sm">{ev.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs">
                        {ev.description || 'No description'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          getEventStatus(ev.start_date, ev.end_date) === 'ongoing'
                            ? 'emerald'
                            : getEventStatus(ev.start_date, ev.end_date) === 'upcoming'
                            ? 'brand'
                            : 'slate'
                        }
                        dot
                      >
                        {getEventStatus(ev.start_date, ev.end_date)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600">
                      {new Date(ev.start_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600">
                      {new Date(ev.end_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/sessions?eventId=${ev.id}`}
                        className="text-xs font-extrabold text-brand-600 hover:text-brand-800 transition-colors"
                      >
                        View Sessions →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Campus Event"
        description="Add a new campus-wide event to track RFID attendance sessions."
      >
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          {formError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">{formError}</p>}
          <Input
            label="Event Name"
            placeholder="e.g. Foundation Day 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Description
            </label>
            <textarea
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              rows={3}
              placeholder="Brief details about the event venue or objective..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
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
              Register Event
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
