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

const toDateOnly = (val: string | null | undefined): string | null => {
  if (!val) return null;
  const match = String(val).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
};

const extractDayFromName = (name?: string | null): number | null => {
  if (!name) return null;
  const match = name.match(/day\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
};

const formatScanTime = (value: string) =>
  new Date(value).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });

const formatWindowTime = (value: string) =>
  new Date(`2000-01-01T${value}+08:00`).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });

export const toStudentScan = (record: RecordedScan): StudentScanItem => {
  const session = record.session;
  const scanDateOnly = toDateOnly(session?.date) ?? toDateOnly(record.recorded_at) ?? new Date().toISOString().slice(0, 10);
  const eventStartDateOnly = toDateOnly(session?.event_start_date);

  let dayNumber: number | null = extractDayFromName(session?.name);
  if (!dayNumber && scanDateOnly && eventStartDateOnly) {
    const scanTime = Date.parse(`${scanDateOnly}T00:00:00Z`);
    const startTime = Date.parse(`${eventStartDateOnly}T00:00:00Z`);
    if (!isNaN(scanTime) && !isNaN(startTime)) {
      const diff = Math.round((scanTime - startTime) / 86400000);
      dayNumber = diff >= 0 ? diff + 1 : 1;
    }
  }

  const resolvedDay = dayNumber && dayNumber > 0 ? dayNumber : 1;
  const windowStart = record.type === 'time_in' ? session?.time_in_start : session?.time_out_start;
  const windowEnd = record.type === 'time_in' ? session?.time_in_end : session?.time_out_end;

  return {
    id: record.id,
    eventId: session?.event_id ?? 'unknown',
    eventName: session?.event_name ?? 'Event',
    dayLabel: `Day ${resolvedDay}`,
    dateStr: new Date(`${scanDateOnly}T00:00:00+08:00`).toLocaleDateString('en-PH', { dateStyle: 'long', timeZone: 'Asia/Manila' }),
    sessionName: session?.name ?? (record.type === 'time_in' ? 'Time In' : 'Time Out'),
    type: record.type,
    timestamp: formatScanTime(record.recorded_at),
    timeWindow: windowStart && windowEnd ? `${formatWindowTime(windowStart)} – ${formatWindowTime(windowEnd)}` : '',
    locationName: record.location_name,
    cardNumber: record.card_number,
  };
};
