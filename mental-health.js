/* ============================================================
   MEDIGUARD — mental-health.js
   Mental Health Module — Data Architecture & Initialization
   ============================================================

   localStorage keys owned by this module:
     mg_mental_consent      — boolean (string "true") — consent flag
     mg_mood_entries        — JSON array of Mood_Entry objects
     mg_therapy_sessions    — JSON array of Therapy_Session objects
     mg_selfcare_plans      — JSON array of Self_Care_Plan objects

   Data schemas:

   Mood_Entry {
     id:        string  — crypto.randomUUID()
     timestamp: string  — ISO 8601 (client local timezone)
     score:     number  — integer 1–10
     label:     string  — 'Happy'|'Calm'|'Anxious'|'Sad'|'Angry'|'Neutral'
     note:      string  — optional free-text, max 500 chars
   }

   Therapy_Session {
     id:        string  — crypto.randomUUID()
     createdAt: string  — ISO 8601
     therapist: string  — max 100 chars
     date:      string  — YYYY-MM-DD
     time:      string  — HH:MM
     type:      string  — 'In-Person'|'Video'|'Phone'
     notes:     string  — optional free-text
     status:    string  — 'upcoming'|'completed'
   }

   Self_Care_Plan {
     id:          string  — crypto.randomUUID()
     createdAt:   string  — ISO 8601
     name:        string  — max 60 chars
     description: string  — optional, max 200 chars
     activities:  Activity[]
   }

   Activity {
     id:        string  — crypto.randomUUID()
     title:     string  — max 80 chars
     frequency: string  — 'Daily'|'Weekly'|'As Needed'
     done:      boolean — default false
   }
   ============================================================ */

/* ── Safe localStorage helpers ─────────────────────────────── */

/**
 * mhGet(key)
 * Safely reads a JSON array from localStorage.
 * Returns an empty array if the key is missing or the value is corrupt.
 */
function mhGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[MH] mhGet failed for key:', key, e);
    return [];
  }
}

/**
 * mhSet(key, value)
 * Safely writes a value to localStorage as JSON.
 * Returns true on success, false on failure (e.g. storage quota exceeded).
 */
function mhSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('[MH] mhSet failed for key:', key, e);
    return false;
  }
}

/**
 * mhRemove(key)
 * Safely removes a key from localStorage.
 * Returns true on success, false on failure.
 */
function mhRemove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('[MH] mhRemove failed for key:', key, e);
    return false;
  }
}

/* ── Consent helpers ────────────────────────────────────────── */

/** Returns true if the user has accepted the data privacy notice. */
function mhHasConsent() {
  return localStorage.getItem('mg_mental_consent') === 'true';
}

/** Persists consent acceptance. */
function mhWriteConsent() {
  localStorage.setItem('mg_mental_consent', 'true');
}

/* ── Date utility ───────────────────────────────────────────── */

/**
 * mhLocalDateStr(isoString)
 * Returns the local calendar date portion (YYYY-MM-DD) of an ISO 8601
 * timestamp, using the client's local timezone.
 * If no argument is given, returns today's local date string.
 */
function mhLocalDateStr(isoString) {
  const d = isoString ? new Date(isoString) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * mhFormatDate(isoString)
 * Returns a human-readable date string, e.g. "Mon, 12 May 2026".
 */
function mhFormatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-MY', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
}

/**
 * mhFormatDateTime(isoString)
 * Returns a human-readable date+time string, e.g. "12 May 2026, 14:30".
 */
function mhFormatDateTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * mhDayOfWeekAbbr(isoString)
 * Returns the 3-letter day abbreviation, e.g. "Mon".
 */
function mhDayOfWeekAbbr(isoString) {
  return new Date(isoString).toLocaleDateString('en-MY', { weekday: 'short' });
}

/* ── UUID helper ────────────────────────────────────────────── */

/**
 * mhUUID()
 * Returns a UUID string. Uses crypto.randomUUID() when available,
 * falls back to a simple random hex string.
 */
function mhUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/* ── Page-show hook (called by showPage('mental') in script.js) ── */

/**
 * mhOnPageShow()
 * Entry point called every time the user navigates to id="page-mental".
 * Checks consent and either shows the privacy notice or renders content.
 */
function mhOnPageShow() {
  if (mhHasConsent()) {
    mhShowContent();
  } else {
    mhShowConsentOverlay();
  }
}

/** Shows the data privacy notice overlay, hides module content. */
function mhShowConsentOverlay() {
  const overlay = document.getElementById('mhConsentOverlay');
  const content = document.getElementById('mhContent');
  if (overlay) overlay.classList.remove('hidden');
  if (content) content.classList.add('hidden');
}

/** Hides the consent overlay and renders all module content. */
function mhShowContent() {
  const overlay = document.getElementById('mhConsentOverlay');
  const content = document.getElementById('mhContent');
  if (overlay) overlay.classList.add('hidden');
  if (content) {
    content.classList.remove('hidden');
    mhRenderAll();
  }
}

/** Scrolls the mood form into view so the user can update today's entry. */
function mhShowUpdateMood() {
  const card = document.getElementById('mhMoodFormCard');
  card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('mhMoodScore')?.focus();
}

/** Called when user clicks "I Understand" on the privacy notice. */
function mhAcceptConsent() {
  mhWriteConsent();
  mhShowContent();
}

/** Called when user clicks "Cancel" on the privacy notice. */
function mhDeclineConsent() {
  if (typeof showPage === 'function') showPage('home');
}

/**
 * mhRenderAll()
 * Re-renders every sub-feature section from localStorage.
 * Called once after consent is granted and on every data mutation.
 */
function mhRenderAll() {
  mhRenderMoodChart();
  mhRenderMoodHistory();
  mhRenderTherapyList();
  mhRenderPlansList();
  mhCheckTodayMood();
  renderMoodLogSummary();
  shInitSubModule();
}

/* ── Renderers — aligned to existing dashboard UI ──────────── */

function mhRenderMoodChart() {
  const wrap = document.getElementById('mhMoodChartWrap');
  if (!wrap) return;

  const entries = mhGet('mg_mood_entries')
    .filter(e => e && e.timestamp)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const recent = entries.slice(-7);

  if (recent.length < 2) {
    wrap.innerHTML = `
      <div class="acoustic-section-header">
        <div class="acoustic-section-icon">📈</div>
        <div>
          <h3 class="acoustic-section-title">Mood Spectrum</h3>
          <p class="acoustic-section-sub">Add at least 2 entries to reveal the emotional pattern.</p>
        </div>
      </div>
      <div class="mh-spectrum-grid">
        <div class="vital-card mh-spectrum-summary">
          <div class="card-top-border"></div>
          <div class="mh-spectrum-body">
            <div class="mh-spectrum-head">
              <span class="mh-spectrum-chip">Not enough data</span>
            </div>
            <p class="mh-spectrum-copy">Log more moods to unlock a 7-day pattern view with trend bars and quick-glance signals.</p>
          </div>
        </div>
      </div>`;
    return;
  }

  const scores = recent.map(entry => Number(entry.score) || 0);
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const latest = recent[recent.length - 1];
  const first = recent[0];
  const delta = (Number(latest.score) || 0) - (Number(first.score) || 0);
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);
  const trendLabel = delta > 0 ? 'Improving' : delta < 0 ? 'Softening' : 'Stable';

  const bars = recent.map(entry => {
    const score = Number(entry.score) || 0;
    const barClass = score >= 7 ? 'cmb-bar-normal' : score >= 4 ? 'cmb-bar-warning' : 'cmb-bar-critical';
    const label = escapeHtml(entry.label || 'Mood');
    const day = mhDayOfWeekAbbr(entry.timestamp);
    const pct = Math.max(0, Math.min(100, (score / 10) * 100));
    return `
      <div class="mh-spectrum-row">
        <div class="mh-spectrum-meta">
          <span class="cmb-label">${day}</span>
          <span class="mh-spectrum-chip">${score}/10</span>
        </div>
        <div class="cmb-bar-wrap">
          <div class="cmb-bar ${barClass}" style="width:${pct}%"></div>
        </div>
        <p class="mh-spectrum-note">${label}</p>
      </div>`;
  }).join('');

  wrap.innerHTML = `
    <div class="acoustic-section-header">
      <div class="acoustic-section-icon">📈</div>
      <div>
        <h3 class="acoustic-section-title">Mood Spectrum</h3>
        <p class="acoustic-section-sub">A 7-day snapshot using bento-style progress bars.</p>
      </div>
    </div>
    <div class="mh-spectrum-grid">
      <div class="vital-card mh-spectrum-summary">
        <div class="card-top-border"></div>
        <div class="mh-spectrum-body">
          <div class="mh-spectrum-head">
            <span class="mh-spectrum-chip">${trendLabel}</span>
            <span class="mh-spectrum-chip">${recent.length} days</span>
          </div>
          <div class="mh-spectrum-meta">
            <span class="mh-spectrum-amount">${average.toFixed(1)}</span>
            <span class="mh-spectrum-note">7-day average mood score</span>
          </div>
          <p class="mh-spectrum-copy">Latest entry: <strong>${escapeHtml(latest.label || 'Mood')}</strong>. The trend is ${delta > 0 ? 'rising' : delta < 0 ? 'softening' : 'stable'} ${delta === 0 ? 'from the first day' : `by ${Math.abs(delta)} points ${delta > 0 ? 'above' : 'below'} the first day`}.</p>
        </div>
      </div>
      <div class="vital-card mh-spectrum-card">
        <div class="card-top-border"></div>
        <div class="mh-spectrum-body">
          <div class="mh-spectrum-head">
            <span class="mh-spectrum-chip">Recent wave</span>
            <span class="mh-spectrum-chip">${highest}/10 peak</span>
          </div>
          <div class="mh-spectrum-bars">
            ${bars}
          </div>
        </div>
      </div>
      <div class="vital-card mh-spectrum-insight">
        <div class="card-top-border"></div>
        <div class="mh-spectrum-body">
          <div class="mh-spectrum-head">
            <span class="mh-spectrum-chip">Range</span>
            <span class="mh-spectrum-chip">${lowest}/10 low</span>
          </div>
          <p class="mh-spectrum-copy">Mood has moved between ${lowest}/10 and ${highest}/10 across the last week. Use the larger swings to spot sleep, stress, or context shifts faster.</p>
        </div>
      </div>
    </div>`;
}

function mhRenderMoodHistory() {
  const container = document.getElementById('mhMoodHistoryList');
  if (!container) return;

  const entries = mhGet('mg_mood_entries')
    .filter(e => e && e.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="acoustic-section-header">
        <div class="acoustic-section-icon">🧠</div>
        <div>
          <h3 class="acoustic-section-title">Recent Mood Entries</h3>
          <p class="acoustic-section-sub">Your most recent mood logs will appear here.</p>
        </div>
      </div>
      <div class="vital-card mh-spectrum-insight">
        <div class="card-top-border"></div>
        <div class="mh-spectrum-body">
          <p class="mh-spectrum-copy">Log today’s mood to build a private history of changes, triggers, and recovery wins.</p>
        </div>
      </div>`;
    return;
  }

  const rows = entries.map(entry => {
    const score = Number(entry.score) || 0;
    const statusClass = score >= 7 ? 'status-normal' : score >= 4 ? 'status-warning' : 'status-critical';
    const label = escapeHtml(entry.label || 'Mood');
    const date = mhFormatDate(entry.timestamp);
    const note = _mhTruncate(entry.note || 'No note added.', 80);

    return `
      <div class="vital-card mh-entry-tile ${statusClass}">
        <div class="card-top-border"></div>
        <div class="mh-entry-body">
          <div class="mh-entry-meta">
            <span class="mh-entry-chip">${date}</span>
            <span class="mh-entry-chip">${score}/10</span>
          </div>
          <p class="mh-entry-copy"><strong>${label}</strong></p>
          <p class="mh-entry-note">${escapeHtml(note)}</p>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="acoustic-section-header">
      <div class="acoustic-section-icon">🧠</div>
      <div>
        <h3 class="acoustic-section-title">Recent Mood Entries</h3>
        <p class="acoustic-section-sub">Last 10 entries with notes truncated for privacy.</p>
      </div>
    </div>
    <div class="mh-entry-grid">
      ${rows}
    </div>`;
}

/**
 * mhCheckTodayMood()
 * Toggles the "already logged today" notice and keeps the mood button label
 * aligned with whether the current date already has an entry.
 */
function mhCheckTodayMood() {
  const notice = document.getElementById('mhTodayNotice');
  const button = document.getElementById('mhBtnLogMood');
  const today = mhLocalDateStr();

  const todaysEntry = mhGet('mg_mood_entries')
    .filter(entry => entry && entry.timestamp && mhLocalDateStr(entry.timestamp) === today)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null;

  if (notice) notice.classList.toggle('hidden', !todaysEntry);
  if (button) {
    button.innerHTML = todaysEntry ? '<span>💾</span> Update Mood' : '<span>💾</span> Save Mood';
  }
}

/**
 * mhSubmitMood(event)
 * Saves today's mood entry. If an entry already exists for the current date,
 * it is replaced so the dashboard behaves like an update-friendly check-in.
 */
function mhSubmitMood(event) {
  event.preventDefault();

  const score = parseInt(document.getElementById('mhMoodScore')?.value || '0', 10);
  const label = (document.getElementById('mhEmotionLabel')?.value || '').trim();
  const note = (document.getElementById('mhMoodNote')?.value || '').trim();

  _mhClearError('mhMoodScoreError');
  _mhClearError('mhEmotionLabelError');
  _mhClearError('mhMoodNoteError');

  let firstInvalidId = null;
  if (!score || score < 1 || score > 10) {
    _mhShowError('mhMoodScoreError', 'Mood score must be between 1 and 10.');
    firstInvalidId = firstInvalidId || 'mhMoodScore';
  }
  if (!label) {
    _mhShowError('mhEmotionLabelError', 'Please select an emotion.');
    firstInvalidId = firstInvalidId || 'mhEmotionLabel';
  }

  if (firstInvalidId) {
    document.getElementById(firstInvalidId)?.focus();
    return;
  }

  const entries = mhGet('mg_mood_entries');
  const today = mhLocalDateStr();
  const entry = {
    id: mhUUID(),
    timestamp: new Date().toISOString(),
    score,
    label,
    note
  };

  const existingIndex = entries.findIndex(item => item && item.timestamp && mhLocalDateStr(item.timestamp) === today);
  if (existingIndex >= 0) {
    entries[existingIndex] = { ...entries[existingIndex], ...entry };
  } else {
    entries.push(entry);
  }

  if (!mhSet('mg_mood_entries', entries)) {
    _mhShowError('mhMoodNoteError', 'Failed to save — storage may be full.');
    return;
  }

  const noteEl = document.getElementById('mhMoodNote');
  if (noteEl) noteEl.value = '';
  document.getElementById('mhMoodScore') && mhUpdateSliderDisplay('mhMoodScore', 'mhMoodScoreVal');
  mhRenderMoodChart();
  mhRenderMoodHistory();
  mhCheckTodayMood();
  renderMoodLogSummary();
}

function mhRenderTherapyList() {
  const container = document.getElementById('mhTherapyList');
  if (!container) return;

  const sessions = mhGet('mg_therapy_sessions')
    .filter(s => s && s.date)
    .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`) - new Date(`${a.date}T${a.time || '00:00'}`));

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="acoustic-section-header">
        <div class="acoustic-section-icon">📅</div>
        <div>
          <h3 class="acoustic-section-title">Therapy Sessions</h3>
          <p class="acoustic-section-sub">Upcoming and completed sessions at a glance.</p>
        </div>
      </div>
      <div class="clinical-card">
        <div class="clinical-placeholder">
          <div class="clinical-placeholder-icon">📅</div>
          <p class="clinical-placeholder-text">Book a session to keep your care plan on track.</p>
        </div>
      </div>`;
    return;
  }

  const now = new Date();
  const rows = sessions.map(session => {
    const dt = new Date(`${session.date}T${session.time || '00:00'}`);
    const isCompleted = session.status === 'completed' || dt < now;
    const notes = _mhTruncate(session.notes || 'No notes added.', 80);

    return `
      <div class="clinical-metric-block">
        <div class="cmb-header">
          <span class="cmb-icon">🧑‍⚕️</span>
          <span class="cmb-label">${escapeHtml(session.therapist || 'Therapy Session')}</span>
          <span class="cmb-badge">${isCompleted ? 'Completed' : 'Upcoming'}</span>
        </div>
        <div class="cmb-value-row">
          <span class="cmb-value">${session.date}</span>
          <span class="cmb-unit">${session.time || '—'} · ${escapeHtml(session.type || 'Session')}</span>
        </div>
        <p class="cmb-desc">${escapeHtml(notes)}</p>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="acoustic-section-header">
      <div class="acoustic-section-icon">📅</div>
      <div>
        <h3 class="acoustic-section-title">Therapy Sessions</h3>
        <p class="acoustic-section-sub">Upcoming and completed sessions at a glance.</p>
      </div>
    </div>
    <div class="clinical-card">
      <div class="clinical-results">
        <div class="clinical-metrics-row">
          ${rows}
        </div>
      </div>
    </div>`;
}

function mhRenderPlansList() {
  const container = document.getElementById('mhPlansList');
  if (!container) return;

  const plans = mhGet('mg_selfcare_plans')
    .filter(p => p && p.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (plans.length === 0) {
    container.innerHTML = `
      <div class="acoustic-section-header">
        <div class="acoustic-section-icon">🌱</div>
        <div>
          <h3 class="acoustic-section-title">Self-Care Plans</h3>
          <p class="acoustic-section-sub">Build routines and track your wellbeing.</p>
        </div>
      </div>
      <div class="clinical-card">
        <div class="clinical-placeholder">
          <div class="clinical-placeholder-icon">🌱</div>
          <p class="clinical-placeholder-text">Create a plan to organize your daily habits.</p>
        </div>
      </div>`;
    return;
  }

  const cards = plans.map(plan => {
    const desc = plan.description ? escapeHtml(plan.description) : 'No description provided.';
    const activities = Array.isArray(plan.activities) ? plan.activities : [];
    const items = activities.length
      ? activities.map(act => `${escapeHtml(act.title)} (${escapeHtml(act.frequency || 'As Needed')})${act.done ? ' ✓' : ''}`).join(' • ')
      : 'No activities yet.';

    return `
      <div class="clinical-metric-block">
        <div class="cmb-header">
          <span class="cmb-icon">🌿</span>
          <span class="cmb-label">${escapeHtml(plan.name || 'Self-Care Plan')}</span>
          <span class="cmb-badge">${activities.length} items</span>
        </div>
        <div class="cmb-value-row">
          <span class="cmb-value">${mhFormatDate(plan.createdAt)}</span>
          <span class="cmb-unit">Created</span>
        </div>
        <p class="cmb-desc">${escapeHtml(desc)}</p>
        <p class="cmb-desc">${escapeHtml(_mhTruncate(items, 120))}</p>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="acoustic-section-header">
      <div class="acoustic-section-icon">🌱</div>
      <div>
        <h3 class="acoustic-section-title">Self-Care Plans</h3>
        <p class="acoustic-section-sub">Build routines and track your wellbeing.</p>
      </div>
    </div>
    <div class="clinical-card">
      <div class="clinical-results">
        <div class="clinical-metrics-row">
          ${cards}
        </div>
      </div>
    </div>`;
}

function _mhSeverityClass(score) {
  if (score >= 7) return 'severity-normal';
  if (score >= 4) return 'severity-warning';
  return 'severity-critical';
}

function _mhChipSeverity(score) {
  if (score >= 7) return 'sfc-normal';
  if (score >= 4) return 'sfc-warning';
  return 'sfc-critical';
}

function _mhTruncate(text, maxLen) {
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

function _mhSeverityLabel(score, label) {
  const cls = _mhSeverityClass(score);
  const state = cls === 'severity-normal' ? 'Normal' : cls === 'severity-warning' ? 'Moderate' : 'High';
  return `${label}: ${state}`;
}

/* ============================================================
   UI SECTION 1 — THE DIAGNOSTIC TRACKER
   Covers:
     • Daily Baseline Check-in  (mg_mental_baseline)
     • Urge & Trigger Logging   (mg_urge_logs)
     • Recent-entries renderer  (both stores)
   ============================================================ */

/* ── Slider live-display helper ─────────────────────────────── */

/**
 * mhUpdateSliderDisplay(sliderId, displayId)
 * Syncs the text content of a display element to the current slider value.
 * Called via oninput on every range input in this module.
 */
function mhUpdateSliderDisplay(sliderId, displayId) {
  const slider  = document.getElementById(sliderId);
  const display = document.getElementById(displayId);
  if (slider && display) {
    display.textContent = slider.value;
    const min = Number(slider.min || 0);
    const max = Number(slider.max || 100);
    const val = Number(slider.value || 0);
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    slider.style.background = `linear-gradient(90deg, var(--accent-cyan) ${pct}%, var(--border-default) ${pct}%)`;
    slider.style.transition = 'background var(--transition)';
  }
}

/* ══════════════════════════════════════════════════════════════
   PART A — DAILY BASELINE CHECK-IN
   localStorage key: mg_mental_baseline
   Schema per entry:
     { id, timestamp, moodScore, emotionLabel,
       sleepScore, halt: { hungry, angry, lonely, tired } }
   ══════════════════════════════════════════════════════════════ */

/**
 * mhSubmitBaseline(event)
 * Handles submission of the Daily Baseline Check-in form.
 * Validates all required fields, builds an entry object, and
 * appends it to mg_mental_baseline in localStorage.
 */
function mhSubmitBaseline(event) {
  event.preventDefault();

  /* ── Read values ── */
  const moodScore    = parseInt(document.getElementById('mhBaselineMood')?.value   || '0', 10);
  const emotionLabel = (document.getElementById('mhBaselineEmotion')?.value || '').trim();
  const sleepScore   = parseInt(document.getElementById('mhBaselineSleep')?.value  || '0', 10);
  const hungry       = document.getElementById('mhHaltHungry')?.checked  || false;
  const angry        = document.getElementById('mhHaltAngry')?.checked   || false;
  const lonely       = document.getElementById('mhHaltLonely')?.checked  || false;
  const tired        = document.getElementById('mhHaltTired')?.checked   || false;

  /* ── Clear previous errors ── */
  _mhClearError('mhBaselineMoodError');
  _mhClearError('mhBaselineEmotionError');
  _mhClearError('mhBaselineSleepError');

  /* ── Validate ── */
  let firstInvalidId = null;

  if (!moodScore || moodScore < 1 || moodScore > 10) {
    _mhShowError('mhBaselineMoodError', 'Mood score must be between 1 and 10.');
    if (!firstInvalidId) firstInvalidId = 'mhBaselineMood';
  }
  if (!emotionLabel) {
    _mhShowError('mhBaselineEmotionError', 'Please select an emotion.');
    if (!firstInvalidId) firstInvalidId = 'mhBaselineEmotion';
  }
  if (!sleepScore || sleepScore < 1 || sleepScore > 10) {
    _mhShowError('mhBaselineSleepError', 'Sleep quality must be between 1 and 10.');
    if (!firstInvalidId) firstInvalidId = 'mhBaselineSleep';
  }

  if (firstInvalidId) {
    document.getElementById(firstInvalidId)?.focus();
    return;
  }

  /* ── Build entry ── */
  const entry = {
    id:           mhUUID(),
    timestamp:    new Date().toISOString(),
    moodScore,
    emotionLabel,
    sleepScore,
    halt: { hungry, angry, lonely, tired }
  };

  /* ── Persist ── */
  const records = mhGet('mg_mental_baseline');
  records.push(entry);
  if (!mhSet('mg_mental_baseline', records)) {
    _mhShowError('mhBaselineSleepError', 'Failed to save — storage may be full.');
    return;
  }

  /* ── Reset form ── */
  const moodSlider  = document.getElementById('mhBaselineMood');
  const sleepSlider = document.getElementById('mhBaselineSleep');
  if (moodSlider)  { moodSlider.value  = '5'; mhUpdateSliderDisplay('mhBaselineMood',  'mhBaselineMoodVal');  }
  if (sleepSlider) { sleepSlider.value = '5'; mhUpdateSliderDisplay('mhBaselineSleep', 'mhBaselineSleepVal'); }
  const emotionSel = document.getElementById('mhBaselineEmotion');
  if (emotionSel) emotionSel.value = '';
  ['mhHaltHungry','mhHaltAngry','mhHaltLonely','mhHaltTired'].forEach(id => {
    const cb = document.getElementById(id);
    if (cb) cb.checked = false;
  });

  /* ── Re-render recent entries ── */
  mhRenderDiagnosticEntries();

  /* ── Brief success feedback ── */
  _mhFlashSuccess('mhBaselineSuccess', 'Check-in saved ✓');
}

/* ══════════════════════════════════════════════════════════════
   PART B — URGE & TRIGGER LOGGING
   localStorage key: mg_urge_logs
   Schema per entry:
     { id, timestamp, intensity, triggerContext }
   Note: triggerContext is stored locally but NEVER sent to the
   backend (privacy requirement).
   ══════════════════════════════════════════════════════════════ */

/**
 * mhSubmitUrgeLog(event)
 * Handles submission of the Urge & Trigger Logging form.
 * Validates intensity, builds an entry, and appends to mg_urge_logs.
 */
function mhSubmitUrgeLog(event) {
  event.preventDefault();

  /* ── Read values ── */
  const intensity      = parseInt(document.getElementById('mhUrgeIntensity')?.value || '0', 10);
  const triggerContext = (document.getElementById('mhUrgeTrigger')?.value || '').trim();

  /* ── Clear previous errors ── */
  _mhClearError('mhUrgeIntensityError');

  /* ── Validate ── */
  if (!intensity || intensity < 1 || intensity > 10) {
    _mhShowError('mhUrgeIntensityError', 'Impulse intensity must be between 1 and 10.');
    document.getElementById('mhUrgeIntensity')?.focus();
    return;
  }

  /* ── Build entry ── */
  const entry = {
    id:             mhUUID(),
    timestamp:      new Date().toISOString(),
    intensity,
    triggerContext  /* stored locally only — excluded from all AI prompts */
  };

  /* ── Persist ── */
  const logs = mhGet('mg_urge_logs');
  logs.push(entry);
  if (!mhSet('mg_urge_logs', logs)) {
    _mhShowError('mhUrgeIntensityError', 'Failed to save — storage may be full.');
    return;
  }

  /* ── Reset form ── */
  const intensitySlider = document.getElementById('mhUrgeIntensity');
  if (intensitySlider) {
    intensitySlider.value = '5';
    mhUpdateSliderDisplay('mhUrgeIntensity', 'mhUrgeIntensityVal');
  }
  const triggerEl = document.getElementById('mhUrgeTrigger');
  if (triggerEl) triggerEl.value = '';

  /* ── Re-render recent entries ── */
  mhRenderDiagnosticEntries();

  /* ── Brief success feedback ── */
  _mhFlashSuccess('mhUrgeSuccess', 'Impulse log saved ✓');
}

/* ══════════════════════════════════════════════════════════════
   PART C — RECENT ENTRIES RENDERER
   Reads both mg_mental_baseline and mg_urge_logs, merges them
   by timestamp (newest first), and renders a styled list into
   id="mhDiagnosticEntriesList".
   ══════════════════════════════════════════════════════════════ */

/**
 * mhRenderDiagnosticEntries()
 * Merges the last 10 baseline check-ins and urge logs into a
 * single reverse-chronological list and renders it.
 */
function mhRenderDiagnosticEntries() {
  const container = document.getElementById('mhDiagnosticEntriesList');
  if (!container) return;

  const baselines = mhGet('mg_mental_baseline');
  const urgeLogs  = mhGet('mg_urge_logs');

  /* Tag each entry with its type so we can render differently */
  const tagged = [
    ...baselines.map(e => ({ ...e, _type: 'baseline' })),
    ...urgeLogs.map(e  => ({ ...e, _type: 'urge'     }))
  ];

  /* Sort newest first, take last 10 */
  tagged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const recent = tagged.slice(0, 10);

  if (recent.length === 0) {
    container.innerHTML = `
      <div class="acoustic-section-header">
        <div class="acoustic-section-icon">📊</div>
        <div>
          <h3 class="acoustic-section-title">Diagnostic Tracker</h3>
          <p class="acoustic-section-sub">Baseline check-ins and impulse logs in one stream.</p>
        </div>
      </div>
      <div class="vital-card mh-spectrum-insight">
        <div class="card-top-border"></div>
        <div class="mh-spectrum-body">
          <p class="mh-spectrum-copy">Complete a check-in or log an impulse above to see your history here.</p>
        </div>
      </div>`;
    return;
  }

  const rows = recent.map(entry => {
    if (entry._type === 'baseline') {
      return _mhBaselineEntryHTML({ ...entry, _fresh: entry.id === recent[0].id });
    } else {
      return _mhUrgeEntryHTML({ ...entry, _fresh: entry.id === recent[0].id });
    }
  }).join('');

  container.innerHTML = `
    <div class="acoustic-section-header">
      <div class="acoustic-section-icon">📊</div>
      <div>
        <h3 class="acoustic-section-title">Diagnostic Tracker</h3>
        <p class="acoustic-section-sub">Baseline check-ins and impulse logs in one stream.</p>
      </div>
    </div>
    <div class="mh-entry-grid">
      ${rows}
    </div>`;

  const fresh = container.querySelector('.mh-entry-tile[data-fresh="true"]');
  if (fresh) {
    requestAnimationFrame(() => fresh.classList.add('mh-entry-visible'));
  }
}

/* ── Private: render one baseline entry row ─────────────────── */
function _mhBaselineEntryHTML(entry) {
  const haltFlags = [];
  if (entry.halt?.hungry) haltFlags.push('Hungry');
  if (entry.halt?.angry)  haltFlags.push('Angry');
  if (entry.halt?.lonely) haltFlags.push('Lonely');
  if (entry.halt?.tired)  haltFlags.push('Tired');

  const haltText = haltFlags.length ? haltFlags.join(', ') : 'None';
  const moodBadge = _mhSeverityLabel(entry.moodScore, 'Mood');
  const sleepBadge = _mhSeverityLabel(entry.sleepScore, 'Sleep');
  const statusClass = entry.moodScore >= 7 ? 'status-normal' : entry.moodScore >= 4 ? 'status-warning' : 'status-critical';
  const freshClass = entry._fresh ? ' mh-entry-fresh' : '';

  return `
    <div class="vital-card mh-entry-tile ${statusClass}${freshClass}" data-fresh="${entry._fresh ? 'true' : 'false'}">
      <div class="card-top-border"></div>
      <div class="mh-entry-body">
        <div class="mh-entry-meta">
          <span class="mh-entry-chip">Daily check-in</span>
          <span class="mh-entry-chip">${mhFormatDateTime(entry.timestamp)}</span>
        </div>
        <div class="mh-entry-meta">
          <span class="mh-entry-copy"><strong>${escapeHtml(entry.emotionLabel)}</strong></span>
          <span class="mh-entry-chip">${entry.moodScore}/10</span>
        </div>
        <p class="mh-entry-note">${moodBadge} · ${sleepBadge}</p>
        <p class="mh-entry-note">H.A.L.T: ${haltText}</p>
      </div>
    </div>`;
}

/* ── Private: render one urge log entry row ─────────────────── */
function _mhUrgeEntryHTML(entry) {
  const intensityBadge = _mhSeverityLabel(entry.intensity, 'Intensity');
  const statusClass = entry.intensity >= 7 ? 'status-critical' : entry.intensity >= 4 ? 'status-warning' : 'status-normal';
  const freshClass = entry._fresh ? ' mh-entry-fresh' : '';

  return `
    <div class="vital-card mh-entry-tile ${statusClass}${freshClass}" data-fresh="${entry._fresh ? 'true' : 'false'}">
      <div class="card-top-border"></div>
      <div class="mh-entry-body">
        <div class="mh-entry-meta">
          <span class="mh-entry-chip">Impulse Log</span>
          <span class="mh-entry-chip">${mhFormatDateTime(entry.timestamp)}</span>
        </div>
        <div class="mh-entry-meta">
          <span class="mh-entry-copy"><strong>${entry.intensity}/10</strong> intensity</span>
          <span class="mh-entry-chip">Private</span>
        </div>
        <p class="mh-entry-note">${intensityBadge}</p>
        <p class="mh-entry-note">Trigger notes stay on this device only.</p>
      </div>
    </div>`;
  /* Note: triggerContext is intentionally NOT rendered to reduce
     accidental exposure of sensitive free-text on screen. */
}

/* ── Private: inline error/success helpers ──────────────────── */

function _mhShowError(errorElId, message) {
  const el = document.getElementById(errorElId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function _mhClearError(errorElId) {
  const el = document.getElementById(errorElId);
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}

/**
 * _mhFlashSuccess(elId, message)
 * Shows a success message for 3 seconds then hides it.
 */
function _mhFlashSuccess(elId, message) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

/* ============================================================
   UI SECTION 2 — THE SAFE HAVEN
   Covers:
     • Urge Surfing countdown timer (15 minutes, pulsing visual)
     • CBT Thought Log form        (mg_cbt_records)
   ============================================================ */

/* ── Module-level timer state ───────────────────────────────── */
/* These variables live at module scope so the interval can be
   cleared from any function without passing references around. */
let _mhSurfingInterval = null;   // setInterval handle
let _mhSurfingSeconds  = 0;      // remaining seconds

function _mhSyncSurfingRing(remainingSeconds) {
  const totalSeconds = 15 * 60;
  const progress = Math.max(0, Math.min(1, (totalSeconds - remainingSeconds) / totalSeconds));
  const ring = document.getElementById('mhSurfingProgress');
  const a11y = document.getElementById('mhSurfingA11y');
  const minutesRemaining = Math.ceil(remainingSeconds / 60);

  if (ring) {
    const radius = Number(ring.getAttribute('r') || '54');
    const circumference = 2 * Math.PI * radius;
    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    ring.style.strokeDashoffset = `${circumference - progress * circumference}`;
  }

  if (a11y) {
    a11y.textContent = `${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'} remaining`;
  }
}

/* ══════════════════════════════════════════════════════════════
   PART A — URGE SURFING TIMER
   ══════════════════════════════════════════════════════════════ */

/**
 * mhStartUrgeSurfing()
 * Called when the user clicks "Start Urge Surfing".
 * Hides the start button, shows the timer panel, and begins a
 * 15-minute (900-second) countdown with a pulsing breathing cue.
 */
function mhStartUrgeSurfing() {
  /* Prevent double-start */
  if (_mhSurfingInterval !== null) return;

  _mhSurfingSeconds = 15 * 60; /* 900 seconds */

  const btnStart   = document.getElementById('mhBtnStartSurfing');
  const timerPanel = document.getElementById('mhSurfingTimerPanel');
  const pulse      = document.getElementById('mhSurfingPulse');
  const phaseLabel = document.getElementById('mhSurfingPhaseLabel');
  const ringStatus = document.getElementById('mhSurfingRingStatus');

  if (btnStart)   btnStart.classList.add('hidden');
  if (timerPanel) {
    timerPanel.classList.remove('hidden');
  }
  if (pulse)      pulse.classList.add('mh-pulse-active');

  if (phaseLabel) phaseLabel.textContent = 'Settle in and breathe with the ring.';
  if (ringStatus) ringStatus.textContent = 'Session active';
  _mhSyncSurfingRing(_mhSurfingSeconds);

  _mhSurfingInterval = setInterval(() => {
    _mhSurfingSeconds -= 1;

    _mhSyncSurfingRing(_mhSurfingSeconds);

    /* Update the breathing phase label every 4 seconds:
       4 s inhale → 4 s hold → 4 s exhale → 4 s rest (box breathing) */
    const phase = _mhSurfingSeconds % 16;
    const phaseLabel = document.getElementById('mhSurfingPhaseLabel');
    if (phaseLabel) {
      if      (phase >= 12) phaseLabel.textContent = 'Inhale slowly…';
      else if (phase >= 8)  phaseLabel.textContent = 'Hold…';
      else if (phase >= 4)  phaseLabel.textContent = 'Exhale slowly…';
      else                  phaseLabel.textContent = 'Rest…';
    }

    if (_mhSurfingSeconds <= 0) {
      _mhStopUrgeSurfing(true /* completed */);
    }
  }, 1000);
}

/**
 * mhCancelUrgeSurfing()
 * Called when the user clicks "Cancel" during a surfing session.
 */
function mhCancelUrgeSurfing() {
  _mhStopUrgeSurfing(false /* not completed */);
}

/**
 * _mhStopUrgeSurfing(completed)
 * Internal: clears the interval, resets UI, optionally shows a
 * completion message.
 */
function _mhStopUrgeSurfing(completed) {
  if (_mhSurfingInterval !== null) {
    clearInterval(_mhSurfingInterval);
    _mhSurfingInterval = null;
  }
  _mhSurfingSeconds = 0;

  const btnStart   = document.getElementById('mhBtnStartSurfing');
  const timerPanel = document.getElementById('mhSurfingTimerPanel');
  const pulse      = document.getElementById('mhSurfingPulse');
  const statusMsg  = document.getElementById('mhSurfingStatus');
  const ringStatus = document.getElementById('mhSurfingRingStatus');
  const phaseLabel = document.getElementById('mhSurfingPhaseLabel');

  if (timerPanel) {
    timerPanel.classList.add('hidden');
  }
  if (pulse)      pulse.classList.remove('mh-pulse-active');
  if (btnStart)   btnStart.classList.remove('hidden');
  if (ringStatus) ringStatus.textContent = 'Session complete';
  if (phaseLabel) phaseLabel.textContent = 'Breathing session complete.';
  _mhSyncSurfingRing(15 * 60);

  if (statusMsg) {
    statusMsg.textContent = completed
      ? '✅ Session complete. Well done — you surfed the urge.'
      : '⏹ Session ended early. Every moment of awareness counts.';
    statusMsg.classList.remove('hidden');
    setTimeout(() => statusMsg.classList.add('hidden'), 5000);
  }
}

/**
 * _mhFormatCountdown(totalSeconds)
 * Converts a total-seconds integer to "MM:SS" display string.
 */
function _mhFormatCountdown(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/* ══════════════════════════════════════════════════════════════
   PART B — CBT THOUGHT LOG
   localStorage key: mg_cbt_records
   Schema per entry:
     { id, timestamp, catch_, check_, change_ }
   Field names use trailing underscore to avoid JS reserved words.
   ══════════════════════════════════════════════════════════════ */

/**
 * mhSubmitCBT(event)
 * Handles submission of the CBT Thought Log form.
 * Validates all three fields, builds an entry, and appends it
 * to mg_cbt_records in localStorage.
 *
 * Privacy note: CBT records are NEVER sent to the backend.
 * They are stored locally only and excluded from all AI prompts.
 */
function mhSubmitCBT(event) {
  event.preventDefault();

  /* ── Read values ── */
  const catchText  = (document.getElementById('mhCbtCatch')?.value  || '').trim();
  const checkText  = (document.getElementById('mhCbtCheck')?.value  || '').trim();
  const changeText = (document.getElementById('mhCbtChange')?.value || '').trim();

  /* ── Clear previous errors ── */
  _mhClearError('mhCbtCatchError');
  _mhClearError('mhCbtCheckError');
  _mhClearError('mhCbtChangeError');

  /* ── Validate — all three fields required ── */
  let firstInvalidId = null;

  if (!catchText) {
    _mhShowError('mhCbtCatchError', 'Please describe what triggered you.');
    if (!firstInvalidId) firstInvalidId = 'mhCbtCatch';
  }
  if (!checkText) {
    _mhShowError('mhCbtCheckError', 'Please describe your automatic thought.');
    if (!firstInvalidId) firstInvalidId = 'mhCbtCheck';
  }
  if (!changeText) {
    _mhShowError('mhCbtChangeError', 'Please write a rational alternative.');
    if (!firstInvalidId) firstInvalidId = 'mhCbtChange';
  }

  if (firstInvalidId) {
    document.getElementById(firstInvalidId)?.focus();
    return;
  }

  /* ── Build entry ── */
  const entry = {
    id:        mhUUID(),
    timestamp: new Date().toISOString(),
    catch_:    catchText,   /* "Catch"  — what triggered me?          */
    check_:    checkText,   /* "Check"  — automatic thought            */
    change_:   changeText   /* "Change" — rational alternative         */
    /* triggerContext intentionally excluded from AI prompts */
  };

  /* ── Persist ── */
  const records = mhGet('mg_cbt_records');
  records.push(entry);
  if (!mhSet('mg_cbt_records', records)) {
    _mhShowError('mhCbtChangeError', 'Failed to save — storage may be full.');
    return;
  }

  /* ── Reset form ── */
  ['mhCbtCatch', 'mhCbtCheck', 'mhCbtChange'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  /* ── Brief success feedback ── */
  _mhFlashSuccess('mhCbtSuccess', '✅ Thought log saved privately.');

  /* ── Re-render CBT history count ── */
  _mhUpdateCBTCount();
}

/**
 * _mhUpdateCBTCount()
 * Updates the CBT record count badge so the user can see how many
 * private logs they have without exposing the content.
 */
function _mhUpdateCBTCount() {
  const countEl = document.getElementById('mhCbtCount');
  if (!countEl) return;
  const count = mhGet('mg_cbt_records').length;
  countEl.textContent = count === 1
    ? '1 private log saved'
    : `${count} private logs saved`;
  countEl.classList.toggle('hidden', count === 0);
}

/* ============================================================
   UI SECTION 3 — BIOPSYCHOSOCIAL AI INSIGHTS
   Covers:
     • Data aggregation from mg_mental_baseline, mg_urge_logs,
       and mg_food_log (Diet module cross-reference)
     • Privacy-safe prompt construction
     • POST /analyze via shared BACKEND_URL
     • Response rendering via renderMarkdown()
   ============================================================ */

/* ── Timeout constant ───────────────────────────────────────── */
const MH_AI_TIMEOUT_MS = 30000; /* 30 seconds, matching app-wide pattern */

/* ══════════════════════════════════════════════════════════════
   PART A — DATA AGGREGATION HELPERS
   ══════════════════════════════════════════════════════════════ */

/**
 * _mhGetLast7DaysDates()
 * Returns an array of the last 7 local calendar date strings
 * (YYYY-MM-DD), today inclusive, newest first.
 */
function _mhGetLast7DaysDates() {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(mhLocalDateStr(d.toISOString()));
  }
  return dates; /* ['2026-05-12', '2026-05-11', …] */
}

/**
 * _mhAggregateBaseline(dates)
 * Reads mg_mental_baseline, filters to the given date set, and
 * returns a privacy-safe array — free-text fields are stripped.
 * Only numerical scores, emotion label, and H.A.L.T. flags are kept.
 *
 * @param {string[]} dates — YYYY-MM-DD strings
 * @returns {Array<{date, moodScore, emotionLabel, sleepScore, halt}>}
 */
function _mhAggregateBaseline(dates) {
  const dateSet = new Set(dates);
  return mhGet('mg_mental_baseline')
    .filter(e => dateSet.has(mhLocalDateStr(e.timestamp)))
    .map(e => ({
      date:         mhLocalDateStr(e.timestamp),
      moodScore:    e.moodScore,
      emotionLabel: e.emotionLabel,
      sleepScore:   e.sleepScore,
      halt: {
        hungry: !!e.halt?.hungry,
        angry:  !!e.halt?.angry,
        lonely: !!e.halt?.lonely,
        tired:  !!e.halt?.tired
      }
      /* triggerContext, notes, id, timestamp — intentionally excluded */
    }));
}

/**
 * _mhAggregateUrgeLogs(dates)
 * Reads mg_urge_logs, filters to the given date set, and returns
 * a privacy-safe array — only date and intensity are kept.
 * triggerContext is NEVER included in any prompt.
 *
 * @param {string[]} dates — YYYY-MM-DD strings
 * @returns {Array<{date, intensity}>}
 */
function _mhAggregateUrgeLogs(dates) {
  const dateSet = new Set(dates);
  return mhGet('mg_urge_logs')
    .filter(e => dateSet.has(mhLocalDateStr(e.timestamp)))
    .map(e => ({
      date:      mhLocalDateStr(e.timestamp),
      intensity: e.intensity
      /* triggerContext — intentionally excluded */
    }));
}

/**
 * _mhAggregateFoodLog(dates)
 * Reads mg_food_log (Diet module), filters to the given date set,
 * and computes a per-day Nutrient_Summary.
 * Food names, portion descriptions, and notes are excluded.
 *
 * @param {string[]} dates — YYYY-MM-DD strings
 * @returns {Object} — { 'YYYY-MM-DD': { calories, protein, carbs, fat } }
 */
function _mhAggregateFoodLog(dates) {
  const dateSet = new Set(dates);
  const summary = {};

  /* Initialise all requested dates with zero totals */
  dates.forEach(d => { summary[d] = { calories: 0, protein: 0, carbs: 0, fat: 0 }; });

  let foodLog = [];
  try {
    const raw = localStorage.getItem('mg_food_log');
    if (raw) foodLog = JSON.parse(raw);
    if (!Array.isArray(foodLog)) foodLog = [];
  } catch (e) {
    console.warn('[MH] Could not read mg_food_log:', e);
    foodLog = [];
  }

  foodLog.forEach(entry => {
    const d = mhLocalDateStr(entry.timestamp);
    if (!dateSet.has(d)) return;
    summary[d].calories += Number(entry.calories) || 0;
    summary[d].protein  += Number(entry.protein)  || 0;
    summary[d].carbs    += Number(entry.carbs)     || 0;
    summary[d].fat      += Number(entry.fat)       || 0;
  });

  return summary;
}

/* ══════════════════════════════════════════════════════════════
   PART B — PROMPT BUILDER
   ══════════════════════════════════════════════════════════════ */

/**
 * _mhBuildBiopsychosocialPrompt(baselines, urgeLogs, nutrientSummary, sexualBaseline)
 * Constructs the full prompt string from the four privacy-safe
 * data sources. Appends the mandatory system instruction verbatim.
 *
 * @returns {string}
 */
function _mhBuildBiopsychosocialPrompt(baselines, urgeLogs, nutrientSummary, sexualBaseline) {
  /* ── Section 1: Mental Baseline ── */
  let baselineBlock = 'MENTAL HEALTH BASELINE (last 7 days):\n';
  if (baselines.length === 0) {
    baselineBlock += '  No baseline check-ins recorded in this period.\n';
  } else {
    baselines.forEach(e => {
      const halt = Object.entries(e.halt)
        .filter(([, v]) => v)
        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
        .join(', ') || 'None';
      baselineBlock +=
        `  Date: ${e.date} | Mood: ${e.moodScore}/10 | Emotion: ${e.emotionLabel}` +
        ` | Sleep: ${e.sleepScore}/10 | H.A.L.T.: ${halt}\n`;
    });
  }

  /* ── Section 2: Urge Intensity Trend ── */
  let urgeBlock = '\nURGE INTENSITY LOG (last 7 days — numerical scores only):\n';
  if (urgeLogs.length === 0) {
    urgeBlock += '  No urge logs recorded in this period.\n';
  } else {
    /* Group by date, show max and average per day */
    const byDate = {};
    urgeLogs.forEach(e => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e.intensity);
    });
    Object.entries(byDate).sort().forEach(([date, scores]) => {
      const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      const max = Math.max(...scores);
      urgeBlock += `  Date: ${date} | Entries: ${scores.length} | Avg intensity: ${avg}/10 | Peak: ${max}/10\n`;
    });
  }

  /* ── Section 3: Dietary Nutrient Summary ── */
  let dietBlock = '\nDIETARY NUTRIENT SUMMARY (last 7 days — aggregated totals only):\n';
  const dietDates = Object.keys(nutrientSummary).sort();
  const hasAnyFood = dietDates.some(d =>
    nutrientSummary[d].calories > 0 || nutrientSummary[d].protein > 0
  );
  if (!hasAnyFood) {
    dietBlock += '  No food log entries recorded in this period.\n';
  } else {
    dietDates.forEach(d => {
      const s = nutrientSummary[d];
      if (s.calories === 0 && s.protein === 0 && s.carbs === 0 && s.fat === 0) return;
      dietBlock +=
        `  Date: ${d} | Calories: ${Math.round(s.calories)} kcal` +
        ` | Protein: ${s.protein.toFixed(1)}g | Carbs: ${s.carbs.toFixed(1)}g` +
        ` | Fat: ${s.fat.toFixed(1)}g\n`;
    });
  }

  /* ── Section 4: Sexual Wellness Baseline ── */
  let sexualBlock = '\nSEXUAL WELLNESS BASELINE (last 7 days — scores and flags only):\n';
  const sexualData = Array.isArray(sexualBaseline) ? sexualBaseline : [];
  if (sexualData.length === 0) {
    sexualBlock += '  No sexual wellness entries recorded in this period.\n';
  } else {
    sexualData.forEach(e => {
      sexualBlock +=
        `  Date: ${e.date}` +
        ` | Satisfaction: ${e.satisfactionScore}/10` +
        ` | Activity: ${e.activityType}` +
        ` | Contraception taken: ${e.contraceptionTaken ? 'Yes' : 'No'}` +
        ` | Safe practice: ${e.safePractice ? 'Yes' : 'No'}\n`;
    });
  }

  /* ── Mandatory system instruction (verbatim as specified) ── */
  const systemInstruction =
    '\nAnalyze this data for physiological and psychological correlations. ' +
    'Do not use judgmental language. ' +
    'Treat high urge intensity as a nervous system regulation issue. ' +
    'Conclude your analysis with a clinically-grounded, neurobiology-focused motivational quote.';

  return (
    'You are a clinical biopsychosocial health analyst. ' +
    'The following anonymised data has been collected from a patient over the last 7 days. ' +
    'No personally identifiable information, free-text notes, or private journal entries are included.\n\n' +
    baselineBlock +
    urgeBlock +
    dietBlock +
    sexualBlock +
    systemInstruction
  );
}

/* ══════════════════════════════════════════════════════════════
   PART C — MAIN AI HANDLER
   ══════════════════════════════════════════════════════════════ */

/**
 * mhRunBiopsychosocialInsight()
 * Async handler for the "Generate Clinical Insight" button.
 * Aggregates data, builds the prompt, calls BACKEND_URL, and
 * renders the response via renderMarkdown().
 */
async function mhRunBiopsychosocialInsight() {
  const btn       = document.getElementById('mhBtnBioInsight');
  const loading   = document.getElementById('mhBioInsightLoading');
  const resultEl  = document.getElementById('mhBioInsightResult');
  const errorEl   = document.getElementById('mhBioInsightError');

  /* ── Reset state ── */
  if (resultEl) { resultEl.innerHTML = ''; resultEl.classList.add('hidden'); }
  if (errorEl)  { errorEl.textContent = ''; errorEl.classList.add('hidden'); }

  /* ── Show loading, disable button ── */
  if (btn)     btn.disabled = true;
  if (loading) loading.classList.remove('hidden');

  /* ── 30-second timeout controller ── */
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), MH_AI_TIMEOUT_MS);

  try {
    /* ── Aggregate data ── */
    const dates          = _mhGetLast7DaysDates();
    const baselines      = _mhAggregateBaseline(dates);
    const urgeLogs       = _mhAggregateUrgeLogs(dates);
    const nutrientSummary = _mhAggregateFoodLog(dates);
    const sexualBaseline  = _mhAggregateSexualBaseline(dates);

    /* ── Build prompt ── */
    const prompt = _mhBuildBiopsychosocialPrompt(baselines, urgeLogs, nutrientSummary, sexualBaseline);

    /* ── Call backend — same fetch pattern as runAIAnalysis() ── */
    const response = await fetch(BACKEND_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt }),
      signal:  controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.text) throw new Error('Empty response from backend.');

    /* ── Render result ── */
    if (loading) loading.classList.add('hidden');
    if (resultEl) {
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = renderMarkdown(data.text);
    }

  } catch (err) {
    clearTimeout(timeoutId);
    if (loading) loading.classList.add('hidden');

    const isTimeout = err.name === 'AbortError';
    const message   = isTimeout
      ? 'Request timed out after 30 seconds. Please try again.'
      : `Analysis failed: ${err.message}`;

    console.error('[MH] Biopsychosocial insight error:', err);

    if (errorEl) {
      errorEl.textContent = `⚠️ ${message}`;
      errorEl.classList.remove('hidden');
    }
  } finally {
    /* Always re-enable the button regardless of outcome */
    if (btn) btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const mentalPage = document.getElementById('page-mental');
  if (mentalPage) {
    mhOnPageShow();
  }
});


/* ============================================================
   RECENT LOG SUMMARY — renderMoodLogSummary()
   Renders the last 3 mood entries inside the mood-logging card
   as immediate visual feedback. Dates use --text-muted and
   mood labels use --text-primary per the design system.
   ============================================================ */

/**
 * renderMoodLogSummary()
 * Reads mg_mood_entries, sorts reverse-chronologically, and
 * renders the 3 most recent entries into #mhRecentLogSummary.
 * Called on page show and after every successful mood save.
 */
function renderMoodLogSummary() {
  const container = document.getElementById('mhRecentLogSummary');
  if (!container) return;

  const entries = mhGet('mg_mood_entries')
    .filter(e => e && e.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 3);

  if (entries.length === 0) {
    container.innerHTML = `
      <p style="font-size:0.8rem;color:var(--text-muted);margin:0;">
        No mood entries yet — log your first mood above.
      </p>`;
    return;
  }

  const title = `<p style="font-size:0.75rem;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.6rem;">Recent Log Summary</p>`;

  const rows = entries.map(entry => {
    const dateStr = mhFormatDate(entry.timestamp);
    const label   = escapeHtml(entry.label || 'Mood');
    const score   = Number(entry.score) || 0;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--border-subtle);">
        <span style="font-size:0.8rem;color:var(--text-muted);">${escapeHtml(dateStr)}</span>
        <span style="font-size:0.85rem;font-weight:600;color:var(--text-primary);">${label} &nbsp;<span style="color:var(--text-muted);font-weight:400;">${score}/10</span></span>
      </div>`;
  }).join('');

  container.innerHTML = title + `<div>${rows}</div>`;
}


/* ============================================================
   SEXUAL WELLNESS SUB-MODULE
   All logic lives here to share mhGet / mhSet utilities.

   localStorage keys:
     mg_sexual_baseline — array of Sexual_Baseline entries
       { id, timestamp, satisfactionScore, activityType,
         contraceptionTaken, safePractice }
       NOTE: privateNotes is intentionally excluded from this
       schema — it is never stored or transmitted.

   UI element IDs (defined in index.html):
     shSatisfactionSlider, shSatisfactionVal, shSatisfactionChip,
     shSatisfactionBar, shIntimacyTopBorder, shActivityType,
     shIntimacySuccess,
     shUrgeBadge, shUrgeSessionCount,
     shContraCheck, shSafePracticeCheck, shReproBadge,
     shReproTopBorder, shReproSuccess
   ============================================================ */

/* ── Satisfaction bar live-update ───────────────────────────── */

/**
 * shUpdateSatisfactionBar()
 * Called oninput on the satisfaction slider.
 * Updates the chip label, slider fill, and the dynamic cmb-bar
 * width + colour class to mirror the Acoustic Markers gauge UX.
 */
function shUpdateSatisfactionBar() {
  const slider  = document.getElementById('shSatisfactionSlider');
  const valEl   = document.getElementById('shSatisfactionVal');
  const chip    = document.getElementById('shSatisfactionChip');
  const bar     = document.getElementById('shSatisfactionBar');
  const border  = document.getElementById('shIntimacyTopBorder');

  if (!slider) return;
  const score = Number(slider.value);

  /* Sync text displays */
  if (valEl)  valEl.textContent  = score;
  if (chip)   chip.textContent   = `${score}/10`;

  /* Slider fill gradient */
  const pct = ((score - 1) / 9) * 100;
  slider.style.background =
    `linear-gradient(90deg, var(--accent-cyan) ${pct}%, var(--border-default) ${pct}%)`;

  /* Bar width + colour class */
  if (bar) {
    bar.style.width = `${pct}%`;
    bar.classList.remove('cmb-bar-normal', 'cmb-bar-warning', 'cmb-bar-critical');
    if (score >= 7)      bar.classList.add('cmb-bar-normal');
    else if (score >= 4) bar.classList.add('cmb-bar-warning');
    else                 bar.classList.add('cmb-bar-critical');
  }

  /* Card top-border colour */
  if (border) {
    border.style.background =
      score >= 7 ? 'var(--color-normal)'
      : score >= 4 ? 'var(--color-warning)'
      : 'var(--color-critical)';
  }
}

/* ── Card 1: Save intimacy log ──────────────────────────────── */

/**
 * shSaveIntimacyLog()
 * Reads the satisfaction slider and activity type select,
 * builds a Sexual_Baseline entry (no private notes), and
 * appends it to mg_sexual_baseline in localStorage.
 */
function shSaveIntimacyLog() {
  const slider      = document.getElementById('shSatisfactionSlider');
  const activityEl  = document.getElementById('shActivityType');
  const successEl   = document.getElementById('shIntimacySuccess');

  const satisfactionScore = slider ? Number(slider.value) : 5;
  const activityType      = activityEl ? activityEl.value : '';

  const entry = {
    id:                mhUUID(),
    timestamp:         new Date().toISOString(),
    satisfactionScore,
    activityType:      activityType || 'Not specified',
    contraceptionTaken: false,  /* updated by shSaveReproLog */
    safePractice:       false   /* updated by shSaveReproLog */
  };

  const records = mhGet('mg_sexual_baseline');
  records.push(entry);

  if (!mhSet('mg_sexual_baseline', records)) {
    console.error('[SH] Failed to write mg_sexual_baseline — storage may be full.');
    return;
  }

  /* Reset activity select */
  if (activityEl) activityEl.value = '';

  /* Flash success */
  _mhFlashSuccess('shIntimacySuccess', 'Intimacy entry saved ✓');
}

/* ── Card 2: Urge surfing bridge ────────────────────────────── */

/**
 * shStartUrgeSurfing()
 * Bridges the Sexual Wellness card to the existing Safe Haven
 * urge surfing timer (mhStartUrgeSurfing in mental-health.js).
 * Also increments the today-session counter displayed on the card.
 */
function shStartUrgeSurfing() {
  /* Delegate to the existing Safe Haven timer */
  if (typeof mhStartUrgeSurfing === 'function') {
    mhStartUrgeSurfing();
  }

  /* Increment today's session count on the card */
  const countEl = document.getElementById('shUrgeSessionCount');
  const badgeEl = document.getElementById('shUrgeBadge');
  if (countEl) {
    const current = parseInt(countEl.textContent, 10) || 0;
    countEl.textContent = current + 1;
  }
  if (badgeEl) {
    badgeEl.textContent = 'Active';
    badgeEl.style.background = 'rgba(6,182,212,0.15)';
    badgeEl.style.color      = 'var(--accent-cyan)';
    /* Reset badge after 15 min (matches the surfing timer duration) */
    setTimeout(() => {
      if (badgeEl) {
        badgeEl.textContent = 'Done';
        badgeEl.style.background = '';
        badgeEl.style.color      = '';
      }
    }, 15 * 60 * 1000);
  }
}

/* ── Card 3: Repro status live-update ───────────────────────── */

/**
 * shUpdateReproStatus()
 * Called onchange on either repro checkbox.
 * Updates the status badge and card top-border colour in real time.
 */
function shUpdateReproStatus() {
  const contraEl  = document.getElementById('shContraCheck');
  const safeEl    = document.getElementById('shSafePracticeCheck');
  const badgeEl   = document.getElementById('shReproBadge');
  const borderEl  = document.getElementById('shReproTopBorder');

  const contraOk = contraEl ? contraEl.checked : false;
  const safeOk   = safeEl   ? safeEl.checked   : false;
  const allOk    = contraOk && safeOk;
  const anyOk    = contraOk || safeOk;

  if (badgeEl) {
    if (allOk) {
      badgeEl.textContent = 'Protected';
      badgeEl.className   = 'status-badge';
      badgeEl.style.background   = 'rgba(16,185,129,0.15)';
      badgeEl.style.color        = 'var(--color-normal)';
      badgeEl.style.borderColor  = 'rgba(16,185,129,0.35)';
    } else if (anyOk) {
      badgeEl.textContent = 'Partial';
      badgeEl.className   = 'status-badge';
      badgeEl.style.background   = 'rgba(245,158,11,0.15)';
      badgeEl.style.color        = 'var(--color-warning)';
      badgeEl.style.borderColor  = 'rgba(245,158,11,0.35)';
    } else {
      badgeEl.textContent = 'Action Needed';
      badgeEl.className   = 'status-badge';
      badgeEl.style.background   = 'rgba(239,68,68,0.15)';
      badgeEl.style.color        = 'var(--color-critical)';
      badgeEl.style.borderColor  = 'rgba(239,68,68,0.35)';
    }
  }

  if (borderEl) {
    borderEl.style.background = allOk
      ? 'var(--color-normal)'
      : anyOk
        ? 'var(--color-warning)'
        : 'var(--color-critical)';
  }
}

/* ── Card 3: Save repro log ─────────────────────────────────── */

/**
 * shSaveReproLog()
 * Reads the repro checkboxes and upserts today's mg_sexual_baseline
 * entry with contraceptionTaken and safePractice flags.
 * If no entry exists for today, creates a minimal one.
 */
function shSaveReproLog() {
  const contraEl = document.getElementById('shContraCheck');
  const safeEl   = document.getElementById('shSafePracticeCheck');

  const contraceptionTaken = contraEl ? contraEl.checked : false;
  const safePractice       = safeEl   ? safeEl.checked   : false;

  const today   = mhLocalDateStr();
  const records = mhGet('mg_sexual_baseline');

  /* Find today's entry or create a new one */
  const idx = records.findIndex(
    r => r && r.timestamp && mhLocalDateStr(r.timestamp) === today
  );

  if (idx >= 0) {
    records[idx] = { ...records[idx], contraceptionTaken, safePractice };
  } else {
    records.push({
      id:                mhUUID(),
      timestamp:         new Date().toISOString(),
      satisfactionScore: null,
      activityType:      null,
      contraceptionTaken,
      safePractice
    });
  }

  if (!mhSet('mg_sexual_baseline', records)) {
    console.error('[SH] Failed to write mg_sexual_baseline — storage may be full.');
    return;
  }

  _mhFlashSuccess('shReproSuccess', 'Status saved ✓');
}

/* ── Biopsychosocial aggregation helper ─────────────────────── */

/**
 * _mhAggregateSexualBaseline(dates)
 * Reads mg_sexual_baseline, filters to the given date set, and
 * returns a privacy-safe array for inclusion in the
 * biopsychosocial AI prompt.
 * Only numerical scores and boolean flags are included —
 * no free-text, no private notes.
 *
 * @param {string[]} dates — YYYY-MM-DD strings
 * @returns {Array<{date, satisfactionScore, activityType, contraceptionTaken, safePractice}>}
 */
function _mhAggregateSexualBaseline(dates) {
  const dateSet = new Set(dates);
  return mhGet('mg_sexual_baseline')
    .filter(e => e && e.timestamp && dateSet.has(mhLocalDateStr(e.timestamp)))
    .map(e => ({
      date:               mhLocalDateStr(e.timestamp),
      satisfactionScore:  e.satisfactionScore !== null ? e.satisfactionScore : 'not logged',
      activityType:       e.activityType      || 'not logged',
      contraceptionTaken: !!e.contraceptionTaken,
      safePractice:       !!e.safePractice
      /* privateNotes — intentionally excluded */
    }));
}

/* ── Sub-module initialisation ──────────────────────────────── */

/**
 * shInitSubModule()
 * Called by mhRenderAll() to initialise the Sexual Wellness
 * sub-module UI state on every page show.
 * Restores today's repro checkbox state and refreshes the
 * satisfaction bar to its default position.
 */
function shInitSubModule() {
  /* Restore today's repro state from localStorage */
  const today   = mhLocalDateStr();
  const records = mhGet('mg_sexual_baseline');
  const todayEntry = records
    .filter(r => r && r.timestamp && mhLocalDateStr(r.timestamp) === today)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null;

  const contraEl = document.getElementById('shContraCheck');
  const safeEl   = document.getElementById('shSafePracticeCheck');
  if (contraEl) contraEl.checked = todayEntry ? !!todayEntry.contraceptionTaken : false;
  if (safeEl)   safeEl.checked   = todayEntry ? !!todayEntry.safePractice       : false;

  /* Refresh live UI */
  shUpdateReproStatus();
  shUpdateSatisfactionBar();

  /* Restore today's urge session count */
  const countEl = document.getElementById('shUrgeSessionCount');
  if (countEl) {
    const todayUrges = mhGet('mg_urge_logs')
      .filter(e => e && e.timestamp && mhLocalDateStr(e.timestamp) === today);
    countEl.textContent = todayUrges.length;
  }
}
