/**
 * Postcode utility functions
 */

export function extractOutwardCode(raw: string | undefined | null): string {
  if (!raw) return '';
  const cleaned = raw.trim().toUpperCase();
  if (cleaned.includes(' ')) {
    return cleaned.split(/\s+/)[0];
  }
  if (cleaned.length >= 5 && /^[0-9][A-Z]{2}$/.test(cleaned.slice(-3))) {
    return cleaned.slice(0, -3);
  }
  return cleaned;
}

export function normalizePostcode(raw: string | undefined | null): string {
  if (!raw) return '';
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (cleaned.length > 3) {
    return `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;
  }
  return cleaned;
}

export function isValidUkPostcode(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const regex = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;
  return regex.test(raw.trim());
}
