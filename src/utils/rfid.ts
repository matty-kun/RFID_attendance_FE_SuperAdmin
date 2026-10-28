/**
 * Validates whether a raw string conforms to standard physical RFID card formats:
 * 1. Standard Decimal RFID UID (8 to 12 digits, commonly 10 digits e.g. 1323385691)
 * 2. Standard Hexadecimal RFID UID (8, 10, 14, 16, or 24 hex characters, with optional spaces or hyphens)
 */
export function isValidRfidUid(rawUid?: string | null): boolean {
  if (!rawUid) return false;
  const clean = rawUid.trim().replace(/[\s-:]/g, '').toUpperCase();

  // 1. Standard decimal RFID card UID (8-12 digits)
  if (/^\d{8,12}$/.test(clean)) {
    return true;
  }

  // 2. Standard hexadecimal RFID card UID (8, 10, 14, 16, or 24 hex characters)
  if (/^[0-9A-F]{8}$|^[0-9A-F]{10}$|^[0-9A-F]{14}$|^[0-9A-F]{16}$|^[0-9A-F]{24}$/.test(clean)) {
    return true;
  }

  return false;
}
