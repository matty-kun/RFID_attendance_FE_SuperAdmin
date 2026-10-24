import { useSearchParams } from 'react-router-dom';
import { EventsView } from '../features/events';
import { SessionsView } from '../features/sessions';
import { LocationsView } from '../features/locations';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { cn } from '../utils/cn';

export function AttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'events';

  const setTab = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6">
      {/* Attendance Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E0EB] pb-3">
        <button
          type="button"
          onClick={() => setTab('events')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all',
            currentTab === 'events'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'text-[#756883] hover:text-[#24133F] hover:bg-white border border-[#E5E0EB]'
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          Campus Events
        </button>

        <button
          type="button"
          onClick={() => setTab('sessions')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all',
            currentTab === 'sessions'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'text-[#756883] hover:text-[#24133F] hover:bg-white border border-[#E5E0EB]'
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          Attendance Sessions
        </button>

        <button
          type="button"
          onClick={() => setTab('locations')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all',
            currentTab === 'locations'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'text-[#756883] hover:text-[#24133F] hover:bg-white border border-[#E5E0EB]'
          )}
        >
          <MapPin className="h-3.5 w-3.5" />
          Checkpoints
        </button>
      </div>

      {/* Active Tab View */}
      {currentTab === 'events' && <EventsView />}
      {currentTab === 'sessions' && <SessionsView />}
      {currentTab === 'locations' && <LocationsView />}
    </div>
  );
}

export default AttendancePage;
