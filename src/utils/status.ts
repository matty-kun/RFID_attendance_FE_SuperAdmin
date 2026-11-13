function localDateAndTime(now: Date) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}:${second}` };
}

export function getEventStatus(startDate: string, endDate: string): 'upcoming' | 'ongoing' | 'completed' {
  const { date } = localDateAndTime(new Date());
  if (date < startDate) return 'upcoming';
  if (date > endDate) return 'completed';
  return 'ongoing';
}

export function getSessionStatus(
  date: string,
  timeInStart: string,
  timeOutEnd: string
): 'upcoming' | 'open' | 'closed' {
  const now = localDateAndTime(new Date());
  if (now.date < date || (now.date === date && now.time < timeInStart)) return 'upcoming';
  if (now.date > date || (now.date === date && now.time > timeOutEnd)) return 'closed';
  return 'open';
}
