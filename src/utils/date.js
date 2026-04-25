/**
 * Local-timezone date helpers.
 *
 * THE BUG these replace: `new Date().toISOString().slice(0, 10)` returns
 * the date in UTC, not the user's local timezone. For users in negative
 * UTC offsets (the Americas), evening hours roll the UTC date forward
 * BEFORE midnight local — so "today" filters miss today's entries and
 * "yesterday" shows blank.
 *
 * Example: 9pm in NYC (UTC-5) on April 26.
 *   Local: 2026-04-26
 *   UTC:   2026-04-27   ← what toISOString returns
 *
 * These helpers use Date.prototype.getFullYear/Month/Date which return
 * LOCAL components per ECMAScript spec, so the resulting YYYY-MM-DD is
 * always the date the user actually sees on their phone.
 */

/**
 * Return YYYY-MM-DD for the given Date in the user's local timezone.
 * Pass nothing to get today's local date.
 */
export function localYMD(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Today's date in the user's local timezone, as YYYY-MM-DD.
 * Convenience for the most common usage.
 */
export function todayLocal() {
  return localYMD(new Date());
}

/**
 * Return YYYY-MM-DD for `n` days before today, in local timezone.
 * Positive n = past, negative n = future.
 */
export function localYMDFromOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return localYMD(d);
}
