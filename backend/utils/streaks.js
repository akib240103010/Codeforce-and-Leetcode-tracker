// Streak and Date Calculation Utilities

/**
 * Convert a date string YYYY-MM-DD into integer epoch day (days since 1970-01-01 UTC)
 * @param {string} dayStr
 * @returns {number}
 */
function dayToEpochDay(dayStr) {
  if (!dayStr || typeof dayStr !== 'string') return NaN;
  const parts = dayStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return NaN;
  return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
}

/**
 * Normalize any submission timestamp (sec or ms), Date, or date string into YYYY-MM-DD calendar day
 * @param {number|string|Date} item
 * @returns {string|null}
 */
function toCalendarDayKey(item) {
  if (!item && item !== 0) return null;
  if (typeof item === 'number') {
    if (isNaN(item) || item <= 0) return null;
    const ms = item < 1e11 ? item * 1000 : item;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }
  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      const ms = num < 1e11 ? num * 1000 : num;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }
  if (item instanceof Date) {
    return isNaN(item.getTime()) ? null : item.toISOString().split('T')[0];
  }
  return null;
}

/**
 * Calculate Current Streak and Maximum Streak from timestamps or date strings
 * @param {Array<number|string|Date>} timestampsOrDates
 * @returns {{ currentStreak: number, maxStreak: number, totalActiveDays: number, isAlive: boolean, lastActiveDate: string|null }}
 */
function calculateStreaks(timestampsOrDates) {
  if (!timestampsOrDates || !Array.isArray(timestampsOrDates) || timestampsOrDates.length === 0) {
    return { currentStreak: 0, maxStreak: 0, totalActiveDays: 0, isAlive: false, lastActiveDate: null };
  }

  // 1. Map submission timestamps / dates to unique calendar days (YYYY-MM-DD)
  const dayKeySet = new Set();
  for (const item of timestampsOrDates) {
    const key = toCalendarDayKey(item);
    if (key) dayKeySet.add(key);
  }

  const uniqueDays = Array.from(dayKeySet).sort();
  if (uniqueDays.length === 0) {
    return { currentStreak: 0, maxStreak: 0, totalActiveDays: 0, isAlive: false, lastActiveDate: null };
  }

  // 2. Calculate Maximum Streak by finding the longest consecutive days sequence
  let maxStreak = 0;
  let tempStreak = 0;
  let prevEpochDay = null;

  for (const dayStr of uniqueDays) {
    const epochDay = dayToEpochDay(dayStr);
    if (isNaN(epochDay)) continue;

    if (prevEpochDay === null) {
      tempStreak = 1;
    } else {
      const diff = epochDay - prevEpochDay;
      if (diff === 1) {
        tempStreak++;
      } else if (diff > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > maxStreak) {
      maxStreak = tempStreak;
    }
    prevEpochDay = epochDay;
  }

  // 3. Calculate Current Streak by counting consecutive days backwards from today or yesterday
  const now = new Date();
  const utcTodayEpoch = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
  const localTodayEpoch = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);

  const epochSet = new Set(uniqueDays.map(dayToEpochDay).filter(d => !isNaN(d)));

  // Candidate anchor days: check today and yesterday across UTC and local timezones (descending order)
  const candidates = Array.from(new Set([
    Math.max(utcTodayEpoch, localTodayEpoch) + 1,
    utcTodayEpoch,
    localTodayEpoch,
    utcTodayEpoch - 1,
    localTodayEpoch - 1
  ])).sort((a, b) => b - a);

  let checkDay = null;
  for (const d of candidates) {
    if (epochSet.has(d)) {
      checkDay = d;
      break;
    }
  }

  let currentStreak = 0;
  const isAlive = checkDay !== null;
  if (isAlive) {
    let cur = checkDay;
    while (epochSet.has(cur)) {
      currentStreak++;
      cur--;
    }
  }

  const lastActiveDate = uniqueDays[uniqueDays.length - 1];

  return {
    currentStreak,
    maxStreak: Math.max(maxStreak, currentStreak),
    totalActiveDays: uniqueDays.length,
    isAlive,
    lastActiveDate
  };
}

module.exports = {
  dayToEpochDay,
  toCalendarDayKey,
  calculateStreaks
};
