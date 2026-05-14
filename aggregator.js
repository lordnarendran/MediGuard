/* ============================================================
   MEDIGUARD — aggregator.js
   Cross-module data aggregator.

   Exposes collectModuleStates() which assembles a sanitised
   contextPayload from all active modules for cross-module use.

   PRIVACY RULE: privateNotes from mg_sexual_health is NEVER
   read, referenced, or included in any output from this file.
   ============================================================ */

/**
 * _agRelativeDate(isoString)
 * Converts an ISO 8601 timestamp to a human-readable relative
 * date string: "today" or "<N> days ago".
 *
 * @param {string} isoString — ISO 8601 date string
 * @returns {string}
 */
function _agRelativeDate(isoString) {
  const entryDate   = new Date(isoString);
  const today       = new Date();

  // Normalise both dates to midnight local time for calendar-day comparison
  const entryMidnight = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
  const todayMidnight = new Date(today.getFullYear(),     today.getMonth(),     today.getDate());

  const diffMs   = todayMidnight - entryMidnight;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

/**
 * _agSafeReadArray(key)
 * Safely reads a JSON array from localStorage.
 * Returns an empty array on missing key or parse error.
 *
 * @param {string} key — localStorage key
 * @returns {Array}
 */
function _agSafeReadArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[Aggregator] Failed to read key:', key, e);
    return [];
  }
}

/**
 * collectModuleStates()
 * Reads module data from localStorage, sanitises it, and
 * assembles a contextPayload object for cross-module use.
 *
 * Sexual Health entries are mapped to recentActivity with
 * intimacyLevel, satisfactionScore, concerns, and a relative
 * date string. The privateNotes field is NEVER included.
 *
 * @returns {Object} contextPayload
 */
function collectModuleStates() {
  const contextPayload = {
    modules: {},
    crossModuleContext: {
      moduleCount: 0
    }
  };

  /* ── Sexual Health ─────────────────────────────────────────
     Read mg_sexual_health, take the 7 most recent entries,
     and map to a sanitised recentActivity array.
     privateNotes is explicitly excluded at every step.
     ─────────────────────────────────────────────────────────*/
  const rawEntries = _agSafeReadArray('mg_sexual_health');

  const recentEntries = rawEntries
    .filter(e => e && e.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 7);

  const recentActivity = recentEntries.map(entry => ({
    // privateNotes is intentionally omitted — never read or referenced
    date:              _agRelativeDate(entry.timestamp),
    intimacyLevel:     entry.intimacyLevel     || null,
    satisfactionScore: entry.satisfactionScore || null,
    concerns:          Array.isArray(entry.concerns) ? entry.concerns : []
  }));

  contextPayload.modules.sexualHealth = { recentActivity };
  contextPayload.crossModuleContext.moduleCount += 1;

  return contextPayload;
}
