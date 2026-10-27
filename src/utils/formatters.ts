/**
 * Formats a numeric student year level into an ordinal year string.
 * Example: 1 -> '1st Year', 2 -> '2nd Year', 3 -> '3rd Year', 4 -> '4th Year'
 */
export function formatYearLevel(year?: number | null): string {
  if (!year) return '—';
  const suffix = year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th';
  return `${year}${suffix} Year`;
}
