/**
 * Strip all non-digit characters from a string.
 */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Format a phone number as the user types.
 *
 * - 10 digits → (XXX) XXX-XXXX
 * - 11 digits starting with 1 → +1 (XXX) XXX-XXXX
 * - Otherwise returns cleaned digits with leading + if it started with +
 */
export function formatPhone(value: string): string {
  const hadPlus = value.startsWith("+");
  const digits = digitsOnly(value);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Fallback: keep + prefix if user typed it, otherwise just digits
  return hadPlus ? `+${digits}` : digits;
}

/**
 * Format a postal / zip code as the user types.
 *
 * - US (default / "United States" / "US"): 5 digits → "10001", 9 digits → "10001-1234"
 * - Canada ("Canada" / "CA"): formats as "A1A 1A1"
 * - Other: upper-cased, stripped of non-alphanumeric characters
 */
export function formatPostalCode(value: string, country?: string): string {
  const c = (country ?? "").trim().toLowerCase();
  const isUS = !c || c === "united states" || c === "us" || c === "usa";
  const isCA = c === "canada" || c === "ca";

  if (isUS) {
    const digits = digitsOnly(value);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
  }

  if (isCA) {
    // Canadian format: A1A 1A1 — alternating letter/digit
    const raw = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (raw.length <= 3) return raw;
    return `${raw.slice(0, 3)} ${raw.slice(3, 6)}`;
  }

  // Generic: strip non-alphanumeric, uppercase
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}
