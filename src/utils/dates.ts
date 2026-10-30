export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  // Avoid timezone skew by parsing YYYY-MM-DD components directly
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
    ];
    if (!isNaN(day) && !isNaN(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${monthNames[monthIndex]} ${year}`;
    }
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
}

export function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDateToday(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return dateStr === getTodayIsoDate();
}

export function isDatePast(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return dateStr < getTodayIsoDate();
}

/**
 * Returns milliseconds until next midnight (00:00:00 AM)
 */
export function getMsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(1000, midnight.getTime() - now.getTime());
}
