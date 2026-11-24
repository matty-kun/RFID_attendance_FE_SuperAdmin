export function extractCardNumberNumeric(cardNum: string): number {
  if (!cardNum) return Number.MAX_SAFE_INTEGER;
  const match = cardNum.match(/\d+/);
  return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
}

export function compareCardNumbers(a: string, b: string, dir: 'asc' | 'desc' = 'asc'): number {
  const numA = extractCardNumberNumeric(a);
  const numB = extractCardNumberNumeric(b);
  if (numA !== numB) {
    return dir === 'asc' ? numA - numB : numB - numA;
  }
  return dir === 'asc'
    ? a.localeCompare(b, undefined, { numeric: true })
    : b.localeCompare(a, undefined, { numeric: true });
}
