export interface StudentScanItem {
  id: string;
  eventId: string;
  eventName: string;
  dayLabel: string;
  dateStr: string;
  sessionName: string;
  type: 'time_in' | 'time_out';
  timestamp?: string;
  timeWindow: string;
  locationName: string;
  cardNumber: string | null;
}

export type RecordedScan = {
  id: string;
  type: 'time_in' | 'time_out';
  recorded_at: string;
  card_number: string | null;
  location_name: string;
  session: {
    id: string;
    name: string;
    date: string;
    event_id: string;
    event_name: string;
    event_start_date: string | null;
    time_in_start: string;
    time_in_end: string;
    time_out_start: string;
    time_out_end: string;
  } | null;
};

const formatScanTime = (value: string) => new Date(value).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });
const formatWindowTime = (value: string) => new Date(`2000-01-01T${value}+08:00`).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
export const toStudentScan = (record: RecordedScan): StudentScanItem => {
  const session = record.session;
  const scanDate = session?.date ?? new Date(record.recorded_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const dayNumber = session?.event_start_date ? Math.round((Date.parse(`${scanDate}T00:00:00Z`) - Date.parse(`${session.event_start_date}T00:00:00Z`)) / 86400000) + 1 : null;
  const windowStart = record.type === 'time_in' ? session?.time_in_start : session?.time_out_start;
  const windowEnd = record.type === 'time_in' ? session?.time_in_end : session?.time_out_end;
  return {
    id: record.id,
    eventId: session?.event_id ?? 'unknown',
    eventName: session?.event_name ?? 'Event',
    dayLabel: dayNumber && dayNumber > 0 ? `Day ${dayNumber}` : 'Event day',
    dateStr: new Date(`${scanDate}T00:00:00+08:00`).toLocaleDateString('en-PH', { dateStyle: 'long', timeZone: 'Asia/Manila' }),
    sessionName: session?.name ?? (record.type === 'time_in' ? 'Time In' : 'Time Out'),
    type: record.type,
    timestamp: formatScanTime(record.recorded_at),
    timeWindow: windowStart && windowEnd ? `${formatWindowTime(windowStart)} – ${formatWindowTime(windowEnd)}` : '',
    locationName: record.location_name,
    cardNumber: record.card_number,
  };
};

