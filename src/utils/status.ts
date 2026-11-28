export function normalizeTime(t?: string | null): string {
  if (!t) return '00:00:00';
  const parts = t.trim().split(':');
  const h = (parts[0] || '00').padStart(2, '0');
  const m = (parts[1] || '00').padStart(2, '0');
  const s = (parts[2] || '00').padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function getManilaDateAndTime(now: Date = new Date()): { date: string; time: string } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }
  const date = `${partMap.year}-${partMap.month}-${partMap.day}`;
  let hour = partMap.hour;
  if (hour === '24') hour = '00';
  const time = `${hour}:${partMap.minute}:${partMap.second}`;
  return { date, time };
}

export function getEventStatus(
  startDate: string,
  endDate: string,
  referenceDate: Date = new Date()
): 'upcoming' | 'ongoing' | 'completed' {
  const { date } = getManilaDateAndTime(referenceDate);
  const sDate = startDate.substring(0, 10);
  const eDate = endDate.substring(0, 10);
  if (date < sDate) return 'upcoming';
  if (date > eDate) return 'completed';
  return 'ongoing';
}

export function getSessionStatus(
  date: string,
  timeInStart: string,
  timeOutEnd: string,
  referenceDate: Date = new Date()
): 'upcoming' | 'open' | 'closed' {
  const now = getManilaDateAndTime(referenceDate);
  const sDate = date.substring(0, 10);
  const inStart = normalizeTime(timeInStart);
  const outEnd = normalizeTime(timeOutEnd);

  if (now.date < sDate || (now.date === sDate && now.time < inStart)) return 'upcoming';
  if (now.date > sDate || (now.date === sDate && now.time > outEnd)) return 'closed';
  return 'open';
}
