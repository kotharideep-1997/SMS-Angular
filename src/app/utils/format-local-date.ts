/**
 * Formats a Date using its local calendar fields (no UTC shift).
 * Use this for attendance and other "calendar day" API values — not `toISOString()`,
 * which converts to UTC and can change the calendar date (e.g. IST midnight → prior day in Z).
 */
export function formatLocalDateYyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
