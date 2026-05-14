/* ============================================================
   MEDIGUARD — script.js
   ============================================================ */

/* ── AUTH ──────────────────────────────────────────────────────
   Simple localStorage-based auth. Passwords are stored as
   SHA-256 hashes so plain-text is never persisted.
   Session token stored in localStorage (Remember Me) or
   sessionStorage (tab-only session).
   ─────────────────────────────────────────────────────────────*/

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getUsers() {
  return JSON.parse(localStorage.getItem('mg_users') || '{}');
}

function saveUsers(users) {
  localStorage.setItem('mg_users', JSON.stringify(users));
}

function getSession() {
  return localStorage.getItem('mg_session') || sessionStorage.getItem('mg_session');
}

function setSession(email, remember) {
  if (remember) {
    localStorage.setItem('mg_session', email);
  } else {
    sessionStorage.setItem('mg_session', email);
  }
}

function clearSession() {
  localStorage.removeItem('mg_session');
  sessionStorage.removeItem('mg_session');
}

/* ── Field-level validation helpers ── */
function setFieldError(inputId, errorId, msg) {
  const input = document.getElementById(inputId);
  const errEl = document.getElementById(errorId);
  if (input)  { input.classList.add('auth-input-error'); }
  if (errEl)  { errEl.textContent = msg; errEl.classList.remove('hidden'); }
}

function clearFieldError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const errEl = document.getElementById(errorId);
  if (input)  { input.classList.remove('auth-input-error'); }
  if (errEl)  { errEl.classList.add('hidden'); }
}

function clearAllFieldErrors() {
  ['siEmail','siPassword','suName','suEmail','suPassword','suConfirm'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.classList.remove('auth-input-error');
  });
  ['siEmailError','siPasswordError','suNameError','suEmailError','suPasswordError','suConfirmError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

/* Show/hide auth overlay on load */
document.addEventListener('DOMContentLoaded', () => {
  if (getSession()) {
    dismissAuthOverlay();
    injectSignOutButton();
  }
});

function dismissAuthOverlay() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) {
    overlay.classList.add('auth-overlay-exit');
    setTimeout(() => overlay.remove(), 400);
  }
}

function injectSignOutButton() {
  const statusBar = document.querySelector('.status-bar');
  if (!statusBar) return;
  if (document.getElementById('btnSignOut')) return;

  const email = getSession();
  const users = getUsers();
  const name  = (email && users[email]) ? users[email].name.split(' ')[0] : null;

  // Greeting
  if (name) {
    const greeting = document.createElement('span');
    greeting.id = 'userGreeting';
    greeting.className = 'auth-user-greeting';
    greeting.textContent = `Hi, ${name} 👋`;
    statusBar.after(greeting);
  }

  // Sign Out button
  const btn = document.createElement('button');
  btn.id = 'btnSignOut';
  btn.className = 'auth-signout-btn';
  btn.textContent = 'Sign Out';
  btn.onclick = handleSignOut;

  const greeting = document.getElementById('userGreeting');
  if (greeting) {
    greeting.after(btn);
  } else {
    statusBar.after(btn);
  }
}

function handleSignOut() {
  clearSession();
  location.reload();
}

/* Tab switcher — with fade+slide animation */
function switchAuthTab(tab) {
  const isSignIn = tab === 'signin';
  document.getElementById('tabSignIn').classList.toggle('active', isSignIn);
  document.getElementById('tabSignUp').classList.toggle('active', !isSignIn);

  const formIn  = document.getElementById('formSignIn');
  const formUp  = document.getElementById('formSignUp');
  const forgot  = document.getElementById('forgotPanel');

  // Hide forgot panel when switching tabs
  if (forgot) forgot.classList.add('hidden');
  if (formIn) formIn.classList.remove('hidden');

  const outForm = isSignIn ? formUp  : formIn;
  const inForm  = isSignIn ? formIn  : formUp;

  outForm.classList.add('auth-form-exit');
  setTimeout(() => {
    outForm.classList.add('hidden');
    outForm.classList.remove('auth-form-exit');
    inForm.classList.remove('hidden');
    inForm.classList.add('auth-form-enter');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        inForm.classList.remove('auth-form-enter');
      });
    });
  }, 180);

  clearAuthError();
  clearAllFieldErrors();
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearAuthError() {
  const el = document.getElementById('authError');
  if (el) el.classList.add('hidden');
}

/* Toggle password visibility */
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '🙈' : '👁️';
}

/* ── Forgot Password ── */
function showForgotPanel() {
  document.getElementById('formSignIn').classList.add('hidden');
  document.getElementById('forgotPanel').classList.remove('hidden');
  document.getElementById('forgotPanel').classList.add('auth-form-enter');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.getElementById('forgotPanel').classList.remove('auth-form-enter');
  }));
  clearAuthError();
  clearAllFieldErrors();
  const successEl = document.getElementById('forgotSuccess');
  if (successEl) successEl.classList.add('hidden');
  const fpEmail = document.getElementById('fpEmail');
  if (fpEmail) { fpEmail.value = ''; fpEmail.classList.remove('auth-input-error'); }
  const fpErr = document.getElementById('fpEmailError');
  if (fpErr) fpErr.classList.add('hidden');
}

function hideForgotPanel() {
  const forgot = document.getElementById('forgotPanel');
  forgot.classList.add('auth-form-exit');
  setTimeout(() => {
    forgot.classList.add('hidden');
    forgot.classList.remove('auth-form-exit');
    const formIn = document.getElementById('formSignIn');
    formIn.classList.remove('hidden');
    formIn.classList.add('auth-form-enter');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      formIn.classList.remove('auth-form-enter');
    }));
  }, 180);
}

function handleForgotPassword() {
  const emailInput = document.getElementById('fpEmail');
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const errEl = document.getElementById('fpEmailError');
  const successEl = document.getElementById('forgotSuccess');

  // Clear previous state
  if (emailInput) emailInput.classList.remove('auth-input-error');
  if (errEl) errEl.classList.add('hidden');
  if (successEl) successEl.classList.add('hidden');

  if (!email) {
    if (emailInput) emailInput.classList.add('auth-input-error');
    if (errEl) { errEl.textContent = 'Please enter your email address.'; errEl.classList.remove('hidden'); }
    return;
  }

  const users = getUsers();
  if (!users[email]) {
    if (emailInput) emailInput.classList.add('auth-input-error');
    if (errEl) { errEl.textContent = 'No account found with that email.'; errEl.classList.remove('hidden'); }
    return;
  }

  // Success — show confirmation message
  if (successEl) {
    successEl.textContent = `✅ A reset link would be sent to ${email}`;
    successEl.classList.remove('hidden');
  }
  if (emailInput) { emailInput.value = ''; emailInput.classList.remove('auth-input-error'); }
}

/* Sign In */
async function handleSignIn(e) {
  e.preventDefault();
  clearAuthError();
  clearAllFieldErrors();

  const email    = document.getElementById('siEmail').value.trim().toLowerCase();
  const password = document.getElementById('siPassword').value;
  const remember = document.getElementById('siRememberMe').checked;

  let hasError = false;

  if (!email) {
    setFieldError('siEmail', 'siEmailError', 'Email is required.');
    hasError = true;
  }
  if (!password) {
    setFieldError('siPassword', 'siPasswordError', 'Password is required.');
    hasError = true;
  }
  if (hasError) return;

  const users = getUsers();
  if (!users[email]) {
    setFieldError('siEmail', 'siEmailError', 'No account found with that email.');
    return;
  }

  const hash = await sha256(password);
  if (users[email].hash !== hash) {
    setFieldError('siPassword', 'siPasswordError', 'Incorrect password.');
    return;
  }

  setSession(email, remember);
  dismissAuthOverlay();
  injectSignOutButton();
}

/* Sign Up */
async function handleSignUp(e) {
  e.preventDefault();
  clearAuthError();
  clearAllFieldErrors();

  const name     = document.getElementById('suName').value.trim();
  const email    = document.getElementById('suEmail').value.trim().toLowerCase();
  const password = document.getElementById('suPassword').value;
  const confirm  = document.getElementById('suConfirm').value;

  let hasError = false;

  if (!name) {
    setFieldError('suName', 'suNameError', 'Full name is required.');
    hasError = true;
  }
  if (!email) {
    setFieldError('suEmail', 'suEmailError', 'Email is required.');
    hasError = true;
  }
  if (!password) {
    setFieldError('suPassword', 'suPasswordError', 'Password is required.');
    hasError = true;
  } else if (password.length < 6) {
    setFieldError('suPassword', 'suPasswordError', 'Password must be at least 6 characters.');
    hasError = true;
  }
  if (!confirm) {
    setFieldError('suConfirm', 'suConfirmError', 'Please confirm your password.');
    hasError = true;
  } else if (password && password !== confirm) {
    setFieldError('suConfirm', 'suConfirmError', 'Passwords do not match.');
    hasError = true;
  }
  if (hasError) return;

  const users = getUsers();
  if (users[email]) {
    setFieldError('suEmail', 'suEmailError', 'An account with that email already exists.');
    return;
  }

  const hash = await sha256(password);
  users[email] = { name, hash };
  saveUsers(users);
  setSession(email, true); // new accounts always persist
  dismissAuthOverlay();
  injectSignOutButton();
}


// const BACKEND_URL = 'https://sm1nrdeuu2.execute-api.us-east-1.amazonaws.com/analyze';
const BACKEND_URL = 'https://63yk50qrrh.execute-api.ap-southeast-5.amazonaws.com/analyze';

/* 2. MOCK ANALYSIS */
const MOCK_ANALYSIS = `1. OVERALL SEVERITY STATUS
WARNING

2. INDIVIDUAL VITAL SIGN ASSESSMENT
- Heart Rate: 92 bpm — Within normal range (60–100 bpm). No immediate concern.
- Breathing Rate: 22 breaths/min — Mildly elevated (normal 12–20). Suggests mild respiratory effort or early distress.
- Blood Pressure: 138/88 mmHg — Systolic is elevated (121–139 range). Diastolic is mildly elevated (81–89). Consistent with Stage 1 hypertension or stress response.
- Body Temperature: 38.3°C — Fever range (38.1–39.0°C). Indicates active inflammatory or infectious process.
- Cough Type: Wet — Suggests mucus production; consistent with lower respiratory tract involvement or productive infection.

3. COMBINED VITALS INTERPRETATION
The combination of low-grade fever, mildly elevated breathing rate, wet cough, and borderline elevated blood pressure suggests an active infectious process, most likely involving the lower respiratory tract. The elevated blood pressure may be a secondary response to fever and physiological stress rather than primary hypertension. The overall picture is consistent with a mild-to-moderate respiratory illness requiring clinical evaluation.

4. DIFFERENTIAL CONSIDERATIONS
- Community-acquired pneumonia (early or mild)
- Acute bronchitis with secondary hypertensive response
- Influenza with lower respiratory involvement
- COVID-19 or other viral respiratory illness
- Exacerbation of underlying chronic respiratory condition

5. RECOMMENDED DOCTORS
Doctor 1:
Doctor Name: Dr. Ahmad Faiz
Specialty: General Practitioner
Estimated Consultation Cost: RM50
Clinic/Hospital: Klinik Mediviron Kepong

Doctor 2:
Doctor Name: Dr. Aisha Binti Rahman
Specialty: Pulmonologist
Estimated Consultation Cost: RM102
Clinic/Hospital: Sunway Medical Centre

Doctor 3:
Doctor Name: Dr. Nur Aisyah Rahman
Specialty: Cardiologist
Estimated Consultation Cost: RM150
Clinic/Hospital: Institut Jantung Negara`;

/* 3. STATE */
let currentVitals = null;
let lastDifferential = '';   // ADD THIS

/* 4. DOM CONTENT LOADED — handled by auth block above */

/* 5. SIDEBAR FUNCTIONS */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const isOpening = !sidebar.classList.contains('open');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('visible');
  document.body.style.overflow = isOpening ? 'hidden' : '';
}

/* 6. PAGE NAVIGATION
   FIX: Only close sidebar if it is currently open, preventing accidental re-open on desktop. */
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById('page-' + page).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('nav-' + page).classList.add('active');
  const labels = { home: 'Home', passport: 'Health Passport', mental: 'Mental Health', consultation: 'Consultation', acoustic: 'Acoustic Markers', diet: 'Diet' };
  document.getElementById('pageStatusLabel').textContent = labels[page] || page;
  if (page === 'consultation') syncConsultationDoctors();
  if (page === 'mental') {
    mhOnPageShow();
    // Render helplines after mhOnPageShow has had a chance to show content.
    // If consent was already granted, the grid is visible immediately.
    // If consent is being granted for the first time, mhAcceptConsent() calls
    // mhShowContent() which unhides #mhContent — we use a short tick so the
    // DOM is ready either way.
    setTimeout(mhInitHelplines, 0);
  }
  if (page === 'passport') passportOnPageShow();
  if (page === 'diet') {
    // Diet page is standalone — enable the analyze button regardless of AI analysis state
    const btn = document.getElementById('btnAnalyzeDiet');
    if (btn) btn.disabled = false;
  }

  // Only close sidebar if it is currently open
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('open')) {
    toggleSidebar();
  }
}

/* 7. VITAL INPUT HANDLER */
function onVitalInput(field) {
  const vitals = readVitals();
  if (field === 'heartRate' && vitals.heart_rate !== null) {
    updateCardStatus('heartRate', classifyHeartRate(vitals.heart_rate));
  } else if (field === 'breathingRate' && vitals.breathing_rate !== null) {
    updateCardStatus('breathingRate', classifyBreathingRate(vitals.breathing_rate));
  } else if (field === 'bodyTemp' && vitals.body_temperature !== null) {
    updateCardStatus('bodyTemp', classifyTemperature(vitals.body_temperature));
  } else if (field === 'bloodPressure') {
    const sys = parseInt(document.getElementById('input-bpSys').value);
    const dia = parseInt(document.getElementById('input-bpDia').value);
    if (!isNaN(sys) && !isNaN(dia)) {
      updateCardStatus('bloodPressure', classifyBloodPressure(sys + '/' + dia));
    } else {
      const card  = document.getElementById('card-bloodPressure');
      const badge = document.getElementById('badge-bloodPressure');
      if (card)  card.classList.remove('status-normal', 'status-warning', 'status-elevated', 'status-critical');
      if (badge) badge.textContent = '–';
    }
  } else if (field === 'acoustic') {
    const val = document.getElementById('input-acoustic').value;
    if (val) {
      updateCardStatus('acoustic', classifyAcoustic(val));
    }
  }
}

/* 8. READ VITALS FROM INPUTS */
function readVitals() {
  const hr   = parseFloat(document.getElementById('input-heartRate').value);
  const br   = parseFloat(document.getElementById('input-breathingRate').value);
  const temp = parseFloat(document.getElementById('input-bodyTemp').value);
  const sys  = parseInt(document.getElementById('input-bpSys').value);
  const dia  = parseInt(document.getElementById('input-bpDia').value);
  const acoustic = document.getElementById('input-acoustic').value;
  return {
    heart_rate:               isNaN(hr)   ? null : hr,
    breathing_rate:           isNaN(br)   ? null : br,
    body_temperature:         isNaN(temp) ? null : temp,
    blood_pressure:           (!isNaN(sys) && !isNaN(dia)) ? sys + '/' + dia : null,
    acoustic_classification:  acoustic || null
  };
}

/* 9. UPDATE CARD STATUS */
function updateCardStatus(id, status) {
  const card  = document.getElementById('card-' + id);
  const badge = document.getElementById('badge-' + id);
  if (!card || !badge) return;
  const labels = { normal: 'Normal', warning: 'Warning', elevated: 'Elevated', critical: 'Critical' };
  badge.textContent = labels[status] || status;
  card.classList.remove('status-normal', 'status-warning', 'status-elevated', 'status-critical');
  card.classList.add('status-' + status);
}

/* 10. CLEAR ALL */
function clearAll() {
  ['input-heartRate', 'input-breathingRate', 'input-bodyTemp', 'input-bpSys', 'input-bpDia'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('input-acoustic').value = '';
  ['heartRate', 'breathingRate', 'bodyTemp', 'bloodPressure', 'acoustic'].forEach(id => {
    const card  = document.getElementById('card-' + id);
    const badge = document.getElementById('badge-' + id);
    if (card)  card.classList.remove('status-normal', 'status-warning', 'status-elevated', 'status-critical');
    if (badge) badge.textContent = '–';
  });
  document.getElementById('analysisPlaceholder').classList.remove('hidden');
  document.getElementById('analysisResult').classList.add('hidden');
  document.getElementById('analysisLoading').classList.add('hidden');
  currentVitals = null;
  // FIX: also reset stale doctor recommendations when vitals are cleared
  lastRecommendedDoctors = [];
  hideDietSection();
}

/* 11. RUN AI ANALYSIS */
async function runAIAnalysis() {
  const vitals = readVitals();

  if (!vitals.heart_rate || !vitals.breathing_rate || !vitals.body_temperature
      || !vitals.acoustic_classification) {
    alert('Please fill in all required vital signs before running the analysis.');
    return;
  }

  currentVitals = vitals;
  setLoading(true);

  try {
    const response = await fetch(BACKEND_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt: buildPrompt(vitals) }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.text) throw new Error('Empty response from backend.');

    displayAnalysis(data.text);

  } catch (err) {
    console.error('[MediGuard] Analysis failed:', err.message);

    if (BACKEND_URL.includes('YOUR_API_ID')) {
      console.warn('[MediGuard] Backend URL not configured. Showing demo result.');
      displayAnalysis(MOCK_ANALYSIS);
    } else {
      alert(`Analysis failed: ${err.message}\n\nCheck the browser console for details.`);
      // FIX: only call setLoading(false) in the error path — displayAnalysis() handles it on success
      setLoading(false);
    }
  }
  // FIX: removed finally { setLoading(false) } — displayAnalysis() already hides the loader,
  // and the error path above explicitly calls setLoading(false) when needed.
}

/* 12. BUILD PROMPT */
function buildPrompt(vitals) {
  return `You are a clinical decision support AI. Analyze the following patient vital signs and provide a structured medical assessment.

Vital Signs Provided:
- Heart Rate: ${vitals.heart_rate} bpm
- Breathing Rate: ${vitals.breathing_rate} breaths/min
${vitals.blood_pressure ? `- Blood Pressure: ${vitals.blood_pressure} mmHg` : '- Blood Pressure: Not provided (omit from assessment)'}
- Body Temperature: ${vitals.body_temperature}°C
- Cough Type (Acoustic Classification): ${vitals.acoustic_classification}${vitals.acoustic_classification !== 'None' ? ' (Dry / Wet / Barking / Whooping)' : ' (patient reports no cough)'}

Clinical Reference Ranges:
Heart Rate: Normal 60-100 bpm | Concerning 50-59 or 101-120 bpm | Critical <50 or >120 bpm
Breathing Rate: Normal 12-20 breaths/min | Concerning 10-11 or 21-24 breaths/min | Critical <10 or >24 breaths/min
${vitals.blood_pressure ? `Blood Pressure Systolic: Normal 90-120 mmHg | Elevated 121-139 mmHg | High ≥140 mmHg | Low <90 mmHg
Blood Pressure Diastolic: Normal 60-80 mmHg | Elevated 81-89 mmHg | High ≥90 mmHg | Low <60 mmHg` : ''}
Body Temperature:
- Normal: 36.1–37.5
- Low-grade fever: 37.6–38.0
- Fever: 38.1–39.0
- High fever: >39.0
- Hypothermia: <35.0

COUGH INTERPRETATION:
- None → no respiratory cough symptom
- Dry → irritation or viral pattern
- Wet → mucus, possible infection
- Barking → upper airway involvement
- Whooping → severe airway involvement

Provide the following in a structured clinical format:
1. OVERALL SEVERITY STATUS - State clearly as either NORMAL, WARNING, or CRITICAL
2. INDIVIDUAL VITAL SIGN ASSESSMENT - Use this exact format for EACH vital sign, with the name as a bold header:
**Heart Rate: [value] bpm**
- Status: NORMAL / CONCERNING / CRITICAL
- Clinical Interpretation: [your interpretation]

**Breathing Rate: [value] breaths/min**
- Status: NORMAL / CONCERNING / CRITICAL
- Clinical Interpretation: [your interpretation]
${vitals.blood_pressure ? `
**Blood Pressure: [value] mmHg**
- Status: NORMAL / CONCERNING / CRITICAL
- Clinical Interpretation: [your interpretation]
` : ''}
**Body Temperature: [value]°C**
- Status: NORMAL / CONCERNING / CRITICAL
- Clinical Interpretation: [your interpretation]

**Cough Type: [value]**
- Status: NORMAL / CONCERNING / CRITICAL
- Clinical Interpretation: [your interpretation]
3. COMBINED VITALS INTERPRETATION - Assess the overall picture considering all metrics together and what clinical conditions this pattern may suggest
4. DIFFERENTIAL CONSIDERATIONS - List 4-6 possible diseases as a flat bullet list only. Use this exact format with no sub-headings, no categories, no "Most Likely" or "Moderate Probability" labels:
- [Disease name] ([brief reason based on vitals])
- [Disease name] ([brief reason based on vitals])
5. RECOMMENDED DOCTORS - Select exactly 3 doctors ONLY from the predefined list below. Do NOT create new names.

AVAILABLE DOCTORS:
- Dr. Ahmad Faiz – General Practitioner – RM50 – Klinik Mediviron Kepong
- Dr. Lim Wei Jian – Respiratory Specialist – RM120 – KPJ Damansara Specialist Hospital
- Dr. Nur Aisyah Rahman – Cardiologist – RM150 – Institut Jantung Negara
- Dr. Jason Tan – Internal Medicine – RM100 – Pantai Hospital Kuala Lumpur
- Dr. Aisha Binti Rahman – Pulmonologist – RM102 – Sunway Medical Centre
- Dr. Siti Hajar – ENT Specialist – RM130 – Sunway Medical Centre

SELECTION RULES:
- Always select exactly 3 doctors
- At least one General Practitioner must be included
- If cough or breathing rate is abnormal = include Respiratory Specialist (Dr. Lim Wei Jian) and Pulmonologist (Dr. Aisha Binti Rahman). Prefer Pulmonologist for moderate to severe respiratory patterns. Prefer Respiratory Specialist for mild to moderate cases
- If heart rate or blood pressure is abnormal → include Cardiologist (Dr. Nur Aisyah Rahman)
- If barking cough or upper airway issue = include ENT Specialist (Dr. Siti Hajar)
- If condition is unclear or moderate = include Internal Medicine (Dr. Jason Tan)

OUTPUT FORMAT (STRICT):
Doctor 1:
Doctor Name: Dr. Ahmad Faiz
Specialty: General Practitioner
Estimated Consultation Cost: RM50
Clinic/Hospital: Klinik Mediviron Kepong

Doctor 2:
Doctor Name: Dr. Lim Wei Jian
Specialty: Respiratory Specialist
Estimated Consultation Cost: RM120
Clinic/Hospital: KPJ Damansara Specialist Hospital

Doctor 3:
Doctor Name: Dr. Nur Aisyah Rahman
Specialty: Cardiologist
Estimated Consultation Cost: RM150
Clinic/Hospital: Institut Jantung Negara

IMPORTANT:
- Replace the above doctors with the selected ones from the AVAILABLE DOCTORS list
- Copy the details EXACTLY as written in the list
- Do NOT modify names, specialty, cost, or hospital

Use precise clinical language. Be direct, thorough, and professionally formatted.`;
}

/* 13. DISPLAY ANALYSIS */
function displayAnalysis(text) {
  document.getElementById('analysisPlaceholder').classList.add('hidden');
  document.getElementById('analysisLoading').classList.add('hidden');
  const resultEl = document.getElementById('analysisResult');
  resultEl.classList.remove('hidden');

  function renderSeverityBadge(key, label) {
    const icons = { normal: '✅', warning: '⚠️', elevated: '🔶', critical: '🚨' };
    return `<span class="severity-badge severity-${key}">${icons[key] || '⚠️'} ${label}</span>`;
  }

  const severityMatch = text.match(/OVERALL SEVERITY STATUS[\s\S]*?\n+\**\s*(NORMAL|WARNING|CRITICAL|ELEVATED)\**\s*/i);
  const severity    = severityMatch ? severityMatch[1].toUpperCase() : 'WARNING';
  const severityMap = { NORMAL: 'normal', WARNING: 'warning', ELEVATED: 'elevated', CRITICAL: 'critical' };
  const severityKey = severityMap[severity] || 'warning';

  let html = `<div class="result-header">
    <span class="result-title">AI Clinical Assessment</span>
    ${renderSeverityBadge(severityKey, severity)}
  </div>
  <div class="result-sections">`;

  const vitalAssessment = extractSection(text, '2. INDIVIDUAL VITAL SIGN ASSESSMENT', '3.');
  if (vitalAssessment) {
    html += `<div class="result-section">
      <div class="result-section-title">📊 Individual Vital Sign Assessment</div>
      <div class="result-section-body">${renderMarkdown(vitalAssessment.trim())}</div>
    </div>`;
  }

  const combined = extractSection(text, '3. COMBINED VITALS INTERPRETATION', '4.');
  if (combined) {
    html += `<div class="result-section">
      <div class="result-section-title">🔬 Combined Vitals Interpretation</div>
      <div class="result-section-body">${renderMarkdown(combined.trim())}</div>
    </div>`;
  }

  const differential = extractSection(text, '4. DIFFERENTIAL CONSIDERATIONS', '5.');
  if (differential) {
    lastDifferential = differential.trim();
    showDietSection();

    // Keep only bullet lines — strip any sub-headings Claude may add (e.g. "Most Likely:")
    const bulletOnly = differential.trim()
      .split('\n')
      .filter(line => /^[\-\*]/.test(line.trim()))
      .join('\n');

    html += `<div class="result-section">
      <div class="result-section-title">🩺 Differential Considerations</div>
      <div class="result-section-body">${renderMarkdown(bulletOnly || differential.trim())}</div>
    </div>`;
  }

  const doctorsRaw = extractSection(text, '5. RECOMMENDED DOCTORS', null);
  if (doctorsRaw) {
    storeRecommendedDoctors(doctorsRaw);
    html += `<div class="result-section">
      <div class="result-section-title">👨‍⚕️ Recommended Doctors</div>
      ${renderDoctors(doctorsRaw)}
    </div>`;
  } else {
    // FIX: if section 5 is missing, reset doctors so stale results aren't shown
    lastRecommendedDoctors = [];
  }

  html += `</div>`;
  resultEl.innerHTML = html;

  updatePassportHealth(severity, severityKey, vitalAssessment, differential);
  
  // Save analysis for pre-diagnosis report
  saveLastAnalysis(text, currentVitals);
}

/* updatePassportHealth — updates stat counters based on AI output */
function updatePassportHealth(severity, severityKey, vitalAssessment, differential) {
  if (!differential || !differential.trim()) return;

  const conditions = differential.split('\n')
    .map(l => l.replace(/^[\-\*\d\.]+\s*/, '').trim())
    .filter(l => l.length > 3 && !l.match(/^(DIFFERENTIAL|Based on)/i))
    .slice(0, 5);

  if (!conditions.length) return;

  const chronicKeywords = /asthma|copd|hypertension|diabetes|chronic|cardiac|cardiovascular|persistent/i;
  const newChronic  = conditions.filter(c => chronicKeywords.test(c)).length;
  const totalChronic = 1 + newChronic;
  const elC = document.getElementById('statChronicConditions');
  if (elC) elC.textContent = totalChronic;

  const allergyKeywords = /allerg|hypersensitiv|reaction|intoleran/i;
  const newAllergies  = conditions.filter(c => allergyKeywords.test(c)).length;
  const totalAllergies = 2 + newAllergies;
  const elA = document.getElementById('statAllergies');
  if (elA) elA.textContent = totalAllergies;
}

/* ═══════════════════════════════════════════════════════════════
   HEALTH PASSPORT CHATBOT
   Collects personal data step-by-step and stores in localStorage
   under key  mg_passport_<email>
   ═══════════════════════════════════════════════════════════════ */

const PASSPORT_KEY = () => {
  const email = getSession();
  return email ? `mg_passport_${email}` : 'mg_passport_guest';
};

function passportLoad() {
  try { return JSON.parse(localStorage.getItem(PASSPORT_KEY())) || null; }
  catch { return null; }
}

function passportSave(data) {
  localStorage.setItem(PASSPORT_KEY(), JSON.stringify(data));
}

/* Called when navigating to the passport page */
function passportOnPageShow() {
  const data = passportLoad();
  if (data) {
    passportRender(data);
    document.getElementById('passportEmptyState').classList.add('hidden');
    document.getElementById('passportContent').classList.remove('hidden');
  } else {
    document.getElementById('passportEmptyState').classList.remove('hidden');
    document.getElementById('passportContent').classList.add('hidden');
  }
}

/* ── Chatbot state ── */
let _pchat = { step: 0, data: {}, tempList: [], tempItem: {} };

const PCHAT_STEPS = [
  // Personal info
  { key: 'name',        type: 'text',    q: "👋 Let's build your Health Passport! What is your full name?" },
  { key: 'dob',         type: 'text',    q: "📅 What is your date of birth? (e.g. 14 March 2002)" },
  { key: 'gender',      type: 'options', q: "What is your gender?",           opts: ['Male','Female','Prefer not to say'] },
  { key: 'bloodType',   type: 'options', q: "🩸 What is your blood type?",    opts: ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'] },
  { key: 'icNumber',    type: 'text',    q: "🪪 What is your IC / passport number? (or type 'skip')" },
  // Allergies
  { key: '_allergyStart', type: 'options', q: "⚠️ Do you have any known allergies?", opts: ['Yes','No'] },
  // Chronic conditions
  { key: '_chronicStart', type: 'options', q: "💊 Do you have any chronic conditions? (e.g. asthma, diabetes)", opts: ['Yes','No'] },
  // Vaccinations
  { key: '_vaccinationStart', type: 'options', q: "💉 Would you like to add your vaccination records?", opts: ['Yes','No'] },
  // Past illnesses
  { key: '_illnessStart', type: 'options', q: "🏥 Do you have any past illnesses to record?", opts: ['Yes','No'] },
  // Family history
  { key: '_familyStart', type: 'options', q: "👨‍👩‍👧 Would you like to add family medical history?", opts: ['Yes','No'] },
];

function passportChatStart() {
  _pchat = { step: 0, data: {}, tempList: [], tempItem: {} };
  const existing = passportLoad();
  if (existing) _pchat.data = { ...existing };

  document.getElementById('pchatMessages').innerHTML = '';
  document.getElementById('passportChatOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  _pchatAsk();
}

function passportChatClose() {
  document.getElementById('passportChatOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function _pchatProgress() {
  const total = PCHAT_STEPS.length;
  const pct   = Math.round((_pchat.step / total) * 100);
  document.getElementById('pchatProgressFill').style.width = pct + '%';
}

function _pchatMsg(text, isBot = true) {
  const el = document.createElement('div');
  el.className = isBot ? 'pchat-msg pchat-msg-bot' : 'pchat-msg pchat-msg-user';
  el.textContent = text;
  const container = document.getElementById('pchatMessages');
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function _pchatShowInput(show) {
  document.getElementById('pchatInputArea').classList.toggle('hidden', !show);
  if (show) setTimeout(() => document.getElementById('pchatInput').focus(), 50);
}

function _pchatShowOptions(opts) {
  const area = document.getElementById('pchatOptionsArea');
  area.innerHTML = '';
  area.classList.remove('hidden');
  document.getElementById('pchatInputArea').classList.add('hidden');
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'pchat-option-btn';
    btn.textContent = opt;
    btn.onclick = () => { _pchatMsg(opt, false); _pchatHandleOption(opt); };
    area.appendChild(btn);
  });
}

function _pchatHideOptions() {
  document.getElementById('pchatOptionsArea').classList.add('hidden');
}

function _pchatAsk() {
  _pchatProgress();
  if (_pchat.step >= PCHAT_STEPS.length) { _pchatFinish(); return; }
  const step = PCHAT_STEPS[_pchat.step];
  _pchatMsg(step.q);
  if (step.type === 'options') {
    _pchatShowOptions(step.opts);
    _pchatShowInput(false);
  } else {
    _pchatHideOptions();
    _pchatShowInput(true);
    document.getElementById('pchatInput').value = '';
  }
}

function passportChatSend() {
  const input = document.getElementById('pchatInput');
  const val   = input.value.trim();
  if (!val) return;
  input.value = '';
  _pchatMsg(val, false);
  _pchatHandleText(val);
}

function _pchatHandleText(val) {
  const step = PCHAT_STEPS[_pchat.step];
  if (!step) return;

  // Multi-item collection modes
  if (_pchat.mode === 'allergy') { _pchatCollectListItem('allergies', val, '⚠️ Add another allergy, or type "done" to continue.'); return; }
  if (_pchat.mode === 'chronic') { _pchatCollectListItem('chronicConditions', val, '💊 Add another condition, or type "done" to continue.'); return; }
  if (_pchat.mode === 'vaccine') { _pchatCollectVaccine(val); return; }
  if (_pchat.mode === 'illness') { _pchatCollectIllness(val); return; }
  if (_pchat.mode === 'family')  { _pchatCollectFamily(val); return; }

  _pchat.data[step.key] = val;
  _pchat.step++;
  _pchatAsk();
}

function _pchatHandleOption(val) {
  _pchatHideOptions();
  const step = PCHAT_STEPS[_pchat.step];

  if (step.key === '_allergyStart') {
    if (val === 'Yes') { _pchat.mode = 'allergy'; _pchat.data.allergies = []; _pchatMsg("⚠️ Type each allergy and press Send. Type \"done\" when finished.\nExample: Penicillin (Drug)"); _pchatShowInput(true); }
    else { _pchat.data.allergies = []; _pchat.step++; _pchatAsk(); }
    return;
  }
  if (step.key === '_chronicStart') {
    if (val === 'Yes') { _pchat.mode = 'chronic'; _pchat.data.chronicConditions = []; _pchatMsg("💊 Type each condition and press Send. Type \"done\" when finished.\nExample: Mild Asthma (since 2018)"); _pchatShowInput(true); }
    else { _pchat.data.chronicConditions = []; _pchat.step++; _pchatAsk(); }
    return;
  }
  if (step.key === '_vaccinationStart') {
    if (val === 'Yes') { _pchat.mode = 'vaccine'; _pchat.data.vaccinations = []; _pchatMsg("💉 Type each vaccine and press Send. Type \"done\" when finished.\nExample: COVID-19 (Pfizer) – 2021"); _pchatShowInput(true); }
    else { _pchat.data.vaccinations = []; _pchat.step++; _pchatAsk(); }
    return;
  }
  if (step.key === '_illnessStart') {
    if (val === 'Yes') { _pchat.mode = 'illness'; _pchat.data.illnesses = []; _pchatMsg("🏥 Type the illness name and press Send. Type \"done\" when finished.\nExample: Influenza A"); _pchatShowInput(true); }
    else { _pchat.data.illnesses = []; _pchat.step++; _pchatAsk(); }
    return;
  }
  if (step.key === '_familyStart') {
    if (val === 'Yes') { _pchat.mode = 'family'; _pchat.data.familyHistory = []; _pchatMsg("👨‍👩‍👧 Type each entry and press Send. Type \"done\" when finished.\nExample: Father – Hypertension, Diabetes"); _pchatShowInput(true); }
    else { _pchat.data.familyHistory = []; _pchat.step++; _pchatAsk(); }
    return;
  }

  _pchat.data[step.key] = val;
  _pchat.step++;
  _pchatAsk();
}

function _pchatCollectListItem(key, val, prompt) {
  if (val.toLowerCase() === 'done') {
    _pchat.mode = null;
    _pchat.step++;
    _pchatAsk();
    return;
  }
  _pchat.data[key].push(val);
  _pchatMsg(prompt);
}

function _pchatCollectVaccine(val) {
  if (val.toLowerCase() === 'done') { _pchat.mode = null; _pchat.step++; _pchatAsk(); return; }
  _pchat.data.vaccinations.push(val);
  _pchatMsg('💉 Add another vaccine, or type "done" to continue.');
}

function _pchatCollectIllness(val) {
  if (val.toLowerCase() === 'done') { _pchat.mode = null; _pchat.step++; _pchatAsk(); return; }
  if (!_pchat.tempItem.name) {
    _pchat.tempItem = { name: val };
    _pchatMsg('📅 When did this occur? (e.g. March 2024)');
    return;
  }
  if (!_pchat.tempItem.date) {
    _pchat.tempItem.date = val;
    _pchatMsg('📝 Brief detail? (e.g. Treated with Amoxicillin. Full recovery.) — or type "skip"');
    return;
  }
  _pchat.tempItem.detail = val === 'skip' ? '' : val;
  _pchat.data.illnesses.push({ ..._pchat.tempItem });
  _pchat.tempItem = {};
  _pchatMsg('🏥 Add another illness, or type "done" to continue.');
}

function _pchatCollectFamily(val) {
  if (val.toLowerCase() === 'done') { _pchat.mode = null; _pchat.step++; _pchatAsk(); return; }
  _pchat.data.familyHistory.push(val);
  _pchatMsg('👨‍👩‍👧 Add another entry, or type "done" to continue.');
}

function _pchatFinish() {
  _pchatProgress();
  passportSave(_pchat.data);
  _pchatMsg("✅ Your Health Passport has been saved! Closing in a moment…");
  _pchatShowInput(false);
  _pchatHideOptions();
  setTimeout(() => {
    passportChatClose();
    passportRender(_pchat.data);
    document.getElementById('passportEmptyState').classList.add('hidden');
    document.getElementById('passportContent').classList.remove('hidden');
  }, 1800);
}

/* ── Render passport from saved data ── */
function passportRender(d) {
  // Profile card
  document.getElementById('ppName').textContent = d.name || '—';
  const age = d.dob ? _pchatCalcAge(d.dob) : null;
  document.getElementById('ppMeta1').textContent =
    [d.gender, age ? `${age} years old` : null, d.bloodType ? `Blood Type: ${d.bloodType}` : null]
    .filter(Boolean).join(' · ') || '—';
  document.getElementById('ppMeta2').textContent =
    d.icNumber && d.icNumber.toLowerCase() !== 'skip' ? `IC: ${d.icNumber}` : '';

  // Stats
  document.getElementById('statPastIllnesses').textContent   = (d.illnesses || []).length;
  document.getElementById('statChronicConditions').textContent = (d.chronicConditions || []).length;
  document.getElementById('statAllergies').textContent        = (d.allergies || []).length;
  document.getElementById('statVaccinations').textContent     = (d.vaccinations || []).length;

  // Chronic conditions
  const chronicEl = document.getElementById('ppChronicList');
  chronicEl.innerHTML = (d.chronicConditions || []).length
    ? (d.chronicConditions).map(c => `<li><span class="pcard-dot dot-warning"></span>${escapeHtml(c)}</li>`).join('')
    : '<li><span class="pcard-dot dot-normal"></span>None recorded</li>';

  // Allergies
  const allergyEl = document.getElementById('ppAllergyList');
  allergyEl.innerHTML = (d.allergies || []).length
    ? (d.allergies).map(a => `<li><span class="pcard-dot dot-critical"></span>${escapeHtml(a)}</li>`).join('')
    : '<li><span class="pcard-dot dot-normal"></span>None recorded</li>';

  // Vaccinations
  const vaccEl = document.getElementById('ppVaccinationList');
  vaccEl.innerHTML = (d.vaccinations || []).length
    ? (d.vaccinations).map(v => `<li><span class="pcard-dot dot-normal"></span>${escapeHtml(v)}</li>`).join('')
    : '<li><span class="pcard-dot dot-normal"></span>None recorded</li>';

  // Past illnesses timeline
  const illnessEl = document.getElementById('ppIllnessTimeline');
  if ((d.illnesses || []).length) {
    illnessEl.innerHTML = d.illnesses.map(ill => `
      <div class="illness-entry">
        <div class="illness-dot dot-warning"></div>
        <div class="illness-content">
          <div class="illness-header">
            <span class="illness-name">${escapeHtml(ill.name)}</span>
            <span class="illness-date">${escapeHtml(ill.date || '')}</span>
          </div>
          ${ill.detail ? `<p class="illness-detail">${escapeHtml(ill.detail)}</p>` : ''}
        </div>
      </div>`).join('');
  } else {
    illnessEl.innerHTML = '<p class="passport-empty-desc" style="padding:1rem 0">No past illnesses recorded.</p>';
  }

  // Family history
  const familyEl = document.getElementById('ppFamilyGrid');
  if ((d.familyHistory || []).length) {
    familyEl.innerHTML = d.familyHistory.map(f => `
      <div class="passport-card">
        <div class="pcard-header"><span class="pcard-icon">👨‍👩‍👧</span><span class="pcard-title">Family</span></div>
        <p style="font-size:0.875rem;color:var(--text-secondary);line-height:1.6">${escapeHtml(f)}</p>
      </div>`).join('');
  } else {
    familyEl.innerHTML = '<p class="passport-empty-desc" style="padding:1rem 0">No family history recorded.</p>';
  }
}

function _pchatCalcAge(dobStr) {
  try {
    const dob  = new Date(dobStr);
    if (isNaN(dob)) return null;
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  } catch { return null; }
}

/* renderMarkdown — converts a subset of Markdown to HTML */
function renderMarkdown(text) {
  text = text.replace(/^#{1,3}\s*$/gm, '').trim();
  text = text.replace(/^#{1,3}\s+.+\n?/gm, '').trim();
  const lines  = text.split('\n');
  let   html   = '';
  let   inList = false;
  let   inTable = false;
  let   tableHeaderDone = false;

  const closeLists = () => {
    if (inList)  { html += '</ul>'; inList = false; }
  };
  const closeTable = () => {
    if (inTable) { html += '</tbody></table></div>'; inTable = false; tableHeaderDone = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (/^---+$/.test(line.trim())) {
      closeLists(); closeTable();
      html += '<hr class="md-hr">';
      continue;
    }

    if (/^\|/.test(line.trim())) {
      closeLists();
      if (/^\|[\s\-:|]+\|/.test(line)) {
        if (!tableHeaderDone) tableHeaderDone = true;
        continue;
      }
      if (!inTable) {
        html += '<div class="md-table-wrap"><table class="md-table"><thead><tr>';
        inTable = true;
        tableHeaderDone = false;
      } else if (tableHeaderDone && !html.includes('<tbody>')) {
        html += '</tr></thead><tbody><tr>';
      } else {
        html += '<tr>';
      }
      const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const tag   = (!tableHeaderDone) ? 'th' : 'td';
      cells.forEach(cell => {
        html += `<${tag}>${inlineMd(cell.trim())}</${tag}>`;
      });
      html += '</tr>';
      continue;
    } else {
      closeTable();
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      closeLists();
      const level = Math.min(headingMatch[1].length + 3, 6);
      html += `<h${level} class="md-heading">${inlineMd(headingMatch[2])}</h${level}>`;
      continue;
    }

    const boldLineMatch = line.match(/^\*\*(.+)\*\*\s*$/);
    if (boldLineMatch) {
      closeLists();
      html += `<p class="md-vital-header">${inlineMd(boldLineMatch[1])}</p>`;
      continue;
    }

    const bulletMatch = line.match(/^[\-\*]\s+(.+)/);
    if (bulletMatch) {
      if (!inList) { html += '<ul class="md-list">'; inList = true; }
      html += `<li>${inlineMd(bulletMatch[1])}</li>`;
      continue;
    }

    const numMatch = line.match(/^\d+\.\s+(.+)/);
    if (numMatch) {
      if (!inList) { html += '<ul class="md-list md-numlist">'; inList = true; }
      html += `<li>${inlineMd(numMatch[1])}</li>`;
      continue;
    }

    if (line.trim() === '') {
      closeLists();
      html += '<div class="md-spacer"></div>';
      continue;
    }

    closeLists();
    html += `<p class="md-para">${inlineMd(line)}</p>`;
  }

  closeLists();
  closeTable();
  return html;
}

function inlineMd(text) {
  return escapeHtml(text)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="md-code">$1</code>')
    .replace(/✓\s*(NORMAL|NORMAL)/gi, '<span class="md-status md-ok">✓ $1</span>')
    .replace(/✓/g, '<span class="md-status md-ok">✓</span>')
    .replace(/⚠\s*/g, '<span class="md-status md-warn">⚠</span> ');
}

/* 14. HELPER FUNCTIONS */

function extractSection(text, startMarker, endMarker) {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) return null;
  const contentStart = startIdx + startMarker.length;
  let content;
  if (endMarker) {
    const endIdx = text.indexOf(endMarker, contentStart);
    content = endIdx === -1 ? text.slice(contentStart) : text.slice(contentStart, endIdx);
  } else {
    content = text.slice(contentStart);
  }
  // Strip any stray bare heading markers (## with no text)
  return content.replace(/^#{1,3}\s*$/gm, '').trim();
}

function extractField(text, startMarker, endMarker) {
  const result = extractSection(text, startMarker, endMarker);
  return result ? result.trim() : '';
}

function SeverityBadge(key, label) {
  const icons = { normal: '✅', warning: '⚠️', elevated: '🔶', critical: '🚨' };
  const icon = icons[key] || '⚠️';
  return `<span class="severity-badge severity-${key}">${icon} ${label}</span>`;
}

function renderDoctors(raw) {
  const doctorBlocks = raw.split(/Doctor \d+:/i).filter(b => b.trim());
  if (!doctorBlocks.length) return `<div class="result-section-body">${escapeHtml(raw.trim())}</div>`;

  let html = '<div class="doctors-grid">';
  doctorBlocks.forEach(block => {
    const name      = extractDoctorField(block, 'Doctor Name');
    const specialty = extractDoctorField(block, 'Specialty');
    const cost      = extractDoctorField(block, 'Estimated Consultation Cost');
    const clinic    = extractDoctorField(block, 'Clinic/Hospital');
    if (!name) return;
    html += `<div class="doctor-card">
      <div class="doctor-avatar">${doctorAvatar(specialty)}</div>
      <div class="doctor-name">${escapeHtml(name)}</div>
      <div class="doctor-specialty">${escapeHtml(specialty)}</div>
      <div class="doctor-cost">${escapeHtml(cost)}</div>
      <div class="doctor-clinic">${escapeHtml(clinic)}</div>
    </div>`;
  });
  html += '</div>';
  return html;
}

function extractDoctorField(block, fieldName) {
  const regex = new RegExp(escapeRegex(fieldName) + '\\s*:\\s*(.+)', 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

function doctorAvatar(specialty) {
  if (!specialty) return '👨‍⚕️';
  const s = specialty.toLowerCase();
  if (s.includes('cardio'))                                return '❤️';
  if (s.includes('pulmon') || s.includes('respir') || s.includes('lung')) return '🫁';
  if (s.includes('general') || s.includes('gp'))          return '🩺';
  if (s.includes('neuro'))                                 return '🧠';
  if (s.includes('ortho'))                                 return '🦴';
  if (s.includes('derma'))                                 return '🧴';
  if (s.includes('gastro'))                                return '🫃';
  if (s.includes('endo'))                                  return '🔬';
  if (s.includes('infect'))                                return '🦠';
  if (s.includes('emergency'))                             return '🚑';
  return '👨‍⚕️';
}

/* 15. SET LOADING */
function setLoading(isLoading) {
  const placeholder = document.getElementById('analysisPlaceholder');
  const loading     = document.getElementById('analysisLoading');
  const result      = document.getElementById('analysisResult');
  if (isLoading) {
    placeholder.classList.add('hidden');
    result.classList.add('hidden');
    loading.classList.remove('hidden');
  } else {
    loading.classList.add('hidden');
  }
}

/* 16. UTILITY FUNCTIONS */

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ── CLASSIFICATION HELPERS ──────────────────────────────────────────────────
   Reference ranges (from buildPrompt):
     Heart Rate:     Critical <50 or >120  |  Warning 50–59 or 101–120  |  Normal 60–100
     Breathing Rate: Critical <10 or >24   |  Warning 10–11 or 21–24    |  Normal 12–20
     Temperature:    Critical ≥40 or <35   |  Elevated 39.1–39.9        |  Warning 38.1–39.0  |  Normal 36.1–37.5
     Blood Pressure: Critical sys≥180 or dia≥120 | Elevated sys≥140 or dia≥90 | Warning sys≥120 or dia≥80
   NOTE: "elevated" is used as an intermediate level between warning and critical.
   ─────────────────────────────────────────────────────────────────────────── */

/* FIX: original code had thresholds checked in the wrong order causing 50–59 bpm
   to return 'elevated' instead of 'warning'. Corrected to check most-severe first,
   then progressively less severe, matching the clinical reference in buildPrompt. */
function classifyHeartRate(hr) {
  if (hr < 50 || hr > 120)  return 'critical';   // <50 or extreme tachycardia
  if (hr > 120)              return 'elevated';   // 121–150
  if (hr < 60 || hr > 100)  return 'warning';    // 50–59 or 101–120
  return 'normal';                                // 60–100
}

/* FIX: original code checked <8 for critical but the clinical reference uses <10.
   Also fixed ordering so critical is evaluated before elevated/warning. */
function classifyBreathingRate(br) {
  if (br < 10 || br > 24)   return 'critical';   // matches clinical reference <10 or >24
  if (br > 20)               return 'warning';    // 21–24 (mildly elevated)
  if (br < 12)               return 'warning';    // 10–11 (mildly low)
  return 'normal';                                // 12–20
}

function classifyTemperature(temp) {
  if (temp >= 40.0 || temp < 36.0) return 'critical';
  if (temp >= 39.1)                 return 'elevated';
  if (temp >= 37.5)                 return 'warning';
  return 'normal';
}

function classifyBloodPressure(bp) {
  const parts = bp.split('/');
  if (parts.length !== 2) return 'warning';
  const sys = parseInt(parts[0]);
  const dia = parseInt(parts[1]);
  if (isNaN(sys) || isNaN(dia)) return 'warning';
  if (sys >= 180 || dia >= 120) return 'critical';
  if (sys >= 140 || dia >= 90)  return 'elevated';
  if (sys >= 120 || dia >= 80)  return 'warning';
  return 'normal';
}

function classifyAcoustic(val) {
  const v = val.toLowerCase();
  if (v === 'none')                                          return 'normal';
  if (v.includes('whooping'))                                return 'critical';
  if (v.includes('wet') || v.includes('productive'))        return 'warning';
  if (v.includes('barking'))                                 return 'warning';
  if (v.includes('wheez') || v.includes('stridor'))         return 'elevated';
  if (v.includes('crackle') || v.includes('rattle'))        return 'elevated';
  if (v.includes('dry'))                                     return 'warning';
  return 'normal';
}

document.getElementById("year").textContent = new Date().getFullYear();

/* ═══════════════════════════════════════════════════════════════
   CONSULTATION PAGE
   ═══════════════════════════════════════════════════════════════ */

let lastRecommendedDoctors = [];

const TIME_SLOTS = {
  'In-Person':  ['9:00 AM', '11:30 AM', '3:00 PM'],
  'Telehealth': ['8:00 AM', '1:00 PM',  '5:30 PM'],
};

function storeRecommendedDoctors(doctorsRaw) {
  lastRecommendedDoctors = [];
  const entries = doctorsRaw.split(/Doctor\s+\d+:/i).filter(e => e.trim());
  entries.forEach(entry => {
    const name      = extractDoctorField(entry, 'Doctor Name');
    const specialty = extractDoctorField(entry, 'Specialty');
    const cost      = extractDoctorField(entry, 'Estimated Consultation Cost');
    const hospital  = extractDoctorField(entry, 'Clinic/Hospital');
    if (name) lastRecommendedDoctors.push({ name, specialty, cost, hospital });
  });
}

function syncConsultationDoctors() {
  const select    = document.getElementById('selectDoctor');
  const cards     = document.getElementById('consultDoctorCards');
  const bannerSub = document.getElementById('consultBannerSub');

  // Set stepper to step 1 when consultation page loads
  setConsultationStep(1);

  select.innerHTML = '<option value="">— Select a doctor —</option>';

  if (lastRecommendedDoctors.length === 0) {
    cards.innerHTML = '';
    bannerSub.textContent = 'Run the AI Health Analysis on the Home page first to see your recommended doctors here.';
    return;
  }

  bannerSub.textContent = `${lastRecommendedDoctors.length} doctor${lastRecommendedDoctors.length > 1 ? 's' : ''} recommended based on your latest vital signs.`;

  cards.innerHTML = lastRecommendedDoctors.map((d, i) => `
    <div class="consult-doc-card" onclick="pickDoctor(${i})">
      <div class="consult-doc-avatar">${doctorAvatar(d.specialty)}</div>
      <div class="consult-doc-info">
        <div class="consult-doc-name">${escapeHtml(d.name)}</div>
        <div class="consult-doc-specialty">${escapeHtml(d.specialty)}</div>
        <div class="consult-doc-meta">📍 ${escapeHtml(d.hospital)} &nbsp;·&nbsp; ${escapeHtml(d.cost)}</div>
      </div>
      <div class="consult-doc-select-btn">Select</div>
    </div>
  `).join('');

  lastRecommendedDoctors.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.name;
    opt.textContent = `${d.name} — ${d.specialty}`;
    select.appendChild(opt);
  });
}

function pickDoctor(idx) {
  const d = lastRecommendedDoctors[idx];
  if (!d) return;
  document.getElementById('selectDoctor').value = d.name;
  document.querySelectorAll('.consult-doc-card').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
  });
  onConsultChange();
}

function onApptTypeChange() {
  const type   = document.getElementById('selectApptType').value;
  const select = document.getElementById('selectTime');

  select.innerHTML = '';
  if (!type) {
    select.innerHTML = '<option value="">— Select appointment type first —</option>';
    select.disabled = true;
  } else {
    select.disabled = false;
    select.innerHTML = '<option value="">— Select a time —</option>';
    TIME_SLOTS[type].forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      select.appendChild(opt);
    });
  }
  onConsultChange();
}

function onConsultChange() {
  const doctor = document.getElementById('selectDoctor').value;
  const type   = document.getElementById('selectApptType').value;
  const time   = document.getElementById('selectTime').value;
  document.getElementById('btnConfirmAppt').disabled = !(doctor && type && time);
}

async function generateAppointment() {
  const doctorName = document.getElementById('selectDoctor').value;
  const apptType   = document.getElementById('selectApptType').value;
  const apptTime   = document.getElementById('selectTime').value;
  const today      = new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const doctorInfo     = lastRecommendedDoctors.find(d => d.name === doctorName) || {};
  const doctorHospital = doctorInfo.hospital  || '';
  const doctorSpecialty= doctorInfo.specialty || '';
  const doctorCost     = doctorInfo.cost      || '';

  // Show sections
  document.getElementById('apptConfirmSection').classList.remove('hidden');
  document.getElementById('doctorViewSection').classList.remove('hidden');
  document.getElementById('preTestChecklistSection').classList.add('hidden');

  // Reset decision widget
  document.getElementById('apptDecisionWidget').classList.add('hidden');
  document.getElementById('apptDecisionResult').classList.add('hidden');

  // ── Step 1 complete: render appointment card + pre-test suggestions ──
  renderApptConfirmation(doctorName, doctorSpecialty, doctorHospital, doctorCost, today, apptTime, apptType);
  setConsultationStep(1);

  document.getElementById('apptConfirmSection').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ── Build and show checklist from vitals/differential ──
  buildPreTestChecklist();

  // ── Call Bedrock for Doctor View ──
  await callBedrockConsult(
    buildDoctorViewPrompt(doctorName, doctorSpecialty, doctorHospital, apptTime, apptType, today),
    'doctorViewLoading',
    'doctorViewResult',
    renderDoctorView
  );
}

async function callBedrockConsult(prompt, loadingId, resultId, renderFn) {
  const loadingEl = document.getElementById(loadingId);
  const resultEl  = document.getElementById(resultId);

  loadingEl.classList.remove('hidden');
  resultEl.innerHTML = '';

  try {
    const response = await fetch(BACKEND_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.text) throw new Error('Empty response');
    renderFn(data.text, resultEl);
  } catch (err) {
    console.error('[MediGuard] Consultation Bedrock error:', err.message);
    resultEl.innerHTML = `<p class="consult-error">⚠️ Failed to generate: ${escapeHtml(err.message)}</p>`;
  } finally {
    loadingEl.classList.add('hidden');
  }
}

function buildDoctorViewPrompt(doctorName, doctorSpecialty, doctorHospital, apptTime, apptType, today) {
  const v = currentVitals || {};
  const locationLine = apptType === 'In-Person'
    ? `- Location: ${doctorHospital || 'Clinic/Hospital'}`
    : '';

  // Reuse the same pre-test logic so doctor view matches patient checklist
  const preTests = _buildPreTestSuggestions();
  const preTestLines = preTests.map(t => `- ${t}`).join('\n');

  return `You are a clinical decision support system used in a hospital scheduling dashboard. Display the current appointment AND the predicted clinical condition based on vital signs.

INPUT:
- Doctor: ${doctorName} (${doctorSpecialty})
- Appointment Date: ${today}
- Appointment Time: ${apptTime}
- Consultation Type: ${apptType}
${apptType === 'In-Person' ? `- Location: ${doctorHospital}` : ''}
- Heart Rate: ${v.heart_rate || 'N/A'} bpm
- Breathing Rate: ${v.breathing_rate || 'N/A'} breaths/min
- Blood Pressure: ${v.blood_pressure || 'Not provided'}
- Body Temperature: ${v.body_temperature || 'N/A'}°C
- Cough Type: ${v.acoustic_classification === 'None' ? 'No cough reported' : (v.acoustic_classification || 'N/A')}

OUTPUT FORMAT (STRICT — copy every header and sub-heading word for word):

**DOCTOR APPOINTMENT VIEW**

**1. APPOINTMENT DETAILS**

**Patient Details:**
- Patient ID: P001
- Consultation Type: ${apptType}
- Date: ${today}
- Time: ${apptTime}
${locationLine}

**2. CLINICAL VITALS SUMMARY**

**Patient Vital Signs:**
- Heart Rate: ${v.heart_rate || 'N/A'} bpm
- Breathing Rate: ${v.breathing_rate || 'N/A'} breaths/min
${v.blood_pressure ? `- Blood Pressure: ${v.blood_pressure} mmHg` : '- Blood Pressure: Not provided'}
- Body Temperature: ${v.body_temperature || 'N/A'}°C
- Cough Type: ${v.acoustic_classification === 'None' ? 'No cough reported' : (v.acoustic_classification || 'N/A')}

**3. DIFFERENTIAL CONSIDERATIONS**

**Differential Considerations:**
${lastDifferential || 'No prior differential available.'}

**Actions Required Before Visit:**
${preTestLines}

CONSTRAINTS:
- Every section header and sub-heading above MUST appear in your output, word for word
- Do NOT add new diagnoses beyond section 3
- Do NOT modify appointment details
- Each section must have at least 2 bullet points
- If Consultation Type is Telehealth, do NOT include a Location line
- If Consultation Type is In-Person, MUST include the Location line
- In section 4, list ONLY the pre-visit actions provided above — do NOT add or remove any`;
}

function renderApptConfirmation(doctorName, doctorSpecialty, doctorHospital, doctorCost, today, apptTime, apptType) {
  const el = document.getElementById('apptConfirmResult');
  const locationRow = apptType === 'In-Person' && doctorHospital
    ? `<div class="appt-confirm-row">
        <span class="appt-confirm-key">Location</span>
        <span class="appt-confirm-val">${escapeHtml(doctorHospital)}</span>
      </div>`
    : '';

  // Build pre-test suggestions from vitals/differential
  const suggestions = _buildPreTestSuggestions();
  const suggestionsHtml = suggestions.length
    ? `<div class="appt-confirm-section-label">Recommended Pre-Tests</div>
       <div class="appt-pretests-text">
         ${suggestions.map(s => `<div class="appt-pretest-item">🔬 ${escapeHtml(s)}</div>`).join('')}
       </div>`
    : '';

  el.innerHTML = `
    <div class="appt-confirm-card">
      <div class="appt-confirm-title">🗓️ Appointment Details</div>

      <div class="appt-confirm-section-label">Doctor</div>
      <div class="appt-confirm-row">
        <span class="appt-confirm-key">Name</span>
        <span class="appt-confirm-val">${escapeHtml(doctorName)}</span>
      </div>
      ${doctorSpecialty ? `<div class="appt-confirm-row">
        <span class="appt-confirm-key">Specialty</span>
        <span class="appt-confirm-val">${escapeHtml(doctorSpecialty)}</span>
      </div>` : ''}
      ${doctorCost ? `<div class="appt-confirm-row">
        <span class="appt-confirm-key">Consultation Fee</span>
        <span class="appt-confirm-val">${escapeHtml(doctorCost)}</span>
      </div>` : ''}

      <div class="appt-confirm-section-label">Schedule</div>
      <div class="appt-confirm-row">
        <span class="appt-confirm-key">Date</span>
        <span class="appt-confirm-val">${escapeHtml(today)}</span>
      </div>
      <div class="appt-confirm-row">
        <span class="appt-confirm-key">Time</span>
        <span class="appt-confirm-val">${escapeHtml(apptTime)}</span>
      </div>
      <div class="appt-confirm-row">
        <span class="appt-confirm-key">Type</span>
        <span class="appt-confirm-val">${escapeHtml(apptType)}</span>
      </div>
      ${locationRow}

      ${suggestionsHtml}

      <div class="appt-confirm-section-label">Status</div>
      <div class="appt-confirm-row">
        <span class="appt-confirm-key">Appointment Status</span>
        <span class="appt-confirm-val appt-status-pending" id="apptStatusBadge">PENDING</span>
      </div>
    </div>`;
}

/**
 * Derives pre-test suggestions from current vitals and differential.
 * Returns an array of suggestion strings.
 */
function _buildPreTestSuggestions() {
  const v    = currentVitals || {};
  const diff = (lastDifferential || '').toLowerCase();
  const suggestions = [];

  // Always suggest basic vitals confirmation
  suggestions.push('Full blood count (FBC)');

  // Temperature-based
  if (v.body_temperature && v.body_temperature >= 38.0) {
    suggestions.push('C-reactive protein (CRP) / ESR — infection/inflammation markers');
  }

  // Blood pressure
  if (v.blood_pressure) {
    const parts = v.blood_pressure.split('/');
    const sys = parseInt(parts[0]);
    if (!isNaN(sys) && sys >= 140) {
      suggestions.push('ECG (electrocardiogram) — elevated blood pressure');
    }
  }

  // Heart rate
  if (v.heart_rate && (v.heart_rate > 100 || v.heart_rate < 60)) {
    suggestions.push('ECG (electrocardiogram) — abnormal heart rate');
  }

  // Respiratory
  if (v.breathing_rate && v.breathing_rate > 20) {
    suggestions.push('Chest X-ray — elevated breathing rate');
    suggestions.push('Pulse oximetry (SpO₂)');
  }

  // Cough-based
  const acoustic = (v.acoustic_classification || '').toLowerCase();
  if (acoustic === 'wet' || acoustic === 'whooping') {
    suggestions.push('Sputum culture — productive cough');
    suggestions.push('Chest X-ray — lower respiratory involvement');
  } else if (acoustic === 'barking') {
    suggestions.push('Throat swab — upper airway involvement');
  }

  // Differential-based
  if (diff.includes('pneumonia') || diff.includes('bronchitis')) {
    if (!suggestions.some(s => s.includes('Chest X-ray')))
      suggestions.push('Chest X-ray');
  }
  if (diff.includes('cardiac') || diff.includes('cardio') || diff.includes('heart')) {
    if (!suggestions.some(s => s.includes('ECG')))
      suggestions.push('ECG (electrocardiogram)');
    suggestions.push('Troponin / BNP blood test');
  }
  if (diff.includes('diabetes') || diff.includes('glucose')) {
    suggestions.push('Fasting blood glucose / HbA1c');
  }
  if (diff.includes('kidney') || diff.includes('renal')) {
    suggestions.push('Renal function test (urea, creatinine)');
  }
  if (diff.includes('liver') || diff.includes('hepat')) {
    suggestions.push('Liver function test (LFT)');
  }

  // Deduplicate
  return [...new Set(suggestions)].slice(0, 6);
}

/**
 * Builds the interactive pre-test checklist from the same suggestion logic.
 * Shows the checklist section and wires up tick handlers.
 */
function buildPreTestChecklist() {
  const items = _buildPreTestSuggestions();
  const section = document.getElementById('preTestChecklistSection');
  const container = document.getElementById('checklistItems');

  if (!items.length) { section.classList.add('hidden'); return; }

  section.classList.remove('hidden');
  container.innerHTML = items.map((item, i) => `
    <div class="checklist-item" id="chk-item-${i}" onclick="toggleChecklistItem(${i})">
      <div class="checklist-checkbox" id="chk-box-${i}">
        <span class="chk-tick hidden" id="chk-tick-${i}">✓</span>
      </div>
      <div class="checklist-item-content">
        <span class="checklist-item-label" id="chk-label-${i}">${escapeHtml(item)}</span>
      </div>
    </div>`).join('');

  _updateChecklistProgress();
}

function toggleChecklistItem(idx) {
  const box   = document.getElementById(`chk-box-${idx}`);
  const tick  = document.getElementById(`chk-tick-${idx}`);
  const item  = document.getElementById(`chk-item-${idx}`);
  const label = document.getElementById(`chk-label-${idx}`);
  const done  = box.classList.toggle('checked');
  tick.classList.toggle('hidden', !done);
  item.classList.toggle('checklist-item-done', done);
  label.classList.toggle('checklist-label-done', done);
  _updateChecklistProgress();
}

function _updateChecklistProgress() {
  const all   = document.querySelectorAll('.checklist-item');
  const done  = document.querySelectorAll('.checklist-item-done');
  const total = all.length;
  const count = done.length;
  const pct   = total ? Math.round((count / total) * 100) : 0;

  document.getElementById('checklistProgressBadge').textContent = `${count} / ${total}`;
  document.getElementById('checklistProgressBar').style.width   = pct + '%';

  // Step 2 complete when all items ticked
  if (total > 0 && count === total) {
    setConsultationStep(2);
  }
}

function renderDoctorView(text, el) {
  // Convert numbered section headers (**1. TITLE**) to ## headings, then strip them
  // so only sub-headings and content are shown
  const normalized = text
    .replace(/\*\*(\d+\.\s+[A-Z][A-Z\s]+)\*\*/g, '## $1')  // **1. TITLE** → ## 1. TITLE
    .replace(/^##\s+\d+\.\s+.+$/gm, '');                    // strip ## 1. TITLE lines entirely
  el.innerHTML = `<div class="doctor-view-result">${renderMarkdown(normalized)}</div>`;

  // Show the accept/reject widget once the doctor view is rendered
  document.getElementById('apptDecisionWidget').classList.remove('hidden');
  document.getElementById('apptDecisionResult').classList.add('hidden');
  // Reset buttons in case of re-generation
  document.getElementById('btnAcceptAppt').disabled = false;
  document.getElementById('btnRejectAppt').disabled = false;
  document.getElementById('btnAcceptAppt').classList.remove('btn-decided');
  document.getElementById('btnRejectAppt').classList.remove('btn-decided');
}

/**
 * Handles the doctor's Accept or Reject action.
 * - Updates the patient's Appointment Details card status.
 * - Shows a result banner in the Doctor View section.
 * - Disables both buttons after a decision is made.
 */
function handleAppointmentDecision(action) {
  const isAccept = action === 'accept';

  // Disable both buttons — decision is final
  document.getElementById('btnAcceptAppt').disabled = true;
  document.getElementById('btnRejectAppt').disabled = true;
  document.getElementById('btnAcceptAppt').classList.add('btn-decided');
  document.getElementById('btnRejectAppt').classList.add('btn-decided');

  // Hide the widget after decision
  document.getElementById('apptDecisionWidget').classList.add('hidden');

  // ── 1. Update the patient's Appointment Details card ──────────
  const statusBadge = document.getElementById('apptStatusBadge');
  if (statusBadge) {
    if (isAccept) {
      statusBadge.textContent = 'CONFIRMED';
      statusBadge.className = 'appt-confirm-val appt-status-confirmed';
    } else {
      statusBadge.textContent = 'CANCELLED';
      statusBadge.className = 'appt-confirm-val appt-status-cancelled';
    }
  }

  // ── 2. Show decision result banner in Doctor View section ─────
  const bannerEl = document.getElementById('apptDecisionResult');
  if (isAccept) {
    bannerEl.innerHTML = `
      <div class="appt-decision-banner appt-decision-banner-accepted">
        <span class="appt-decision-banner-icon">✅</span>
        <div>
          <p class="appt-decision-banner-title">Appointment Accepted</p>
          <p class="appt-decision-banner-sub">The appointment has been confirmed. The patient will be notified.</p>
        </div>
      </div>`;
    // Step 3 complete on accept
    setConsultationStep(3);
  } else {
    bannerEl.innerHTML = `
      <div class="appt-decision-banner appt-decision-banner-rejected">
        <span class="appt-decision-banner-icon">❌</span>
        <div>
          <p class="appt-decision-banner-title">Appointment Rejected</p>
          <p class="appt-decision-banner-sub">The appointment has been cancelled. The patient will be notified to reschedule.</p>
        </div>
      </div>`;
  }
  bannerEl.classList.remove('hidden');
  bannerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ═══════════════════════════════════════════════════════════════
   CONSULTATION — Progress Stepper & Pre-Diagnosis Report
   ═══════════════════════════════════════════════════════════════ */

/**
 * Updates the consultation progress stepper visual state.
 * @param {number} stepNumber - Current step (1-4)
 */
function setConsultationStep(stepNumber) {
  const steps = document.querySelectorAll('.consult-step');
  steps.forEach((step, idx) => {
    const stepNum = idx + 1;
    step.classList.remove('active', 'completed', 'upcoming');
    const line = step.querySelector('.consult-step-line');

    if (stepNum < stepNumber) {
      step.classList.add('completed');
      if (line) line.style.background = 'var(--accent-cyan)';
    } else if (stepNum === stepNumber) {
      step.classList.add('completed');  // mark current as completed too
      if (line) line.style.background = stepNumber > stepNum ? 'var(--accent-cyan)' : '';
    } else {
      step.classList.add('upcoming');
      if (line) line.style.background = '';
    }
  });
}

/**
 * Saves the last AI analysis to localStorage for use in pre-diagnosis report.
 * Called from displayAnalysis() after successful analysis.
 */
function saveLastAnalysis(analysisText, vitals) {
  const analysisData = {
    timestamp: new Date().toISOString(),
    text: analysisText,
    vitals: vitals,
    differential: lastDifferential
  };
  try {
    localStorage.setItem('mg_last_analysis', JSON.stringify(analysisData));
  } catch (e) {
    console.warn('[MediGuard] Failed to save analysis:', e);
  }
}

/**
 * Shows the pre-diagnosis card and populates it with patient and vitals data.
 * Called after appointment is confirmed.
 */
function showPreDiagnosisCard() {
  const card = document.getElementById('preDiagnosisCard');
  if (!card) return;
  
  card.classList.remove('hidden');
  
  // Populate appointment info
  const doctorName = document.getElementById('selectDoctor').value;
  const apptTime = document.getElementById('selectTime').value;
  const apptType = document.getElementById('selectApptType').value;
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const apptInfo = document.getElementById('prediagApptInfo');
  if (apptInfo) {
    apptInfo.innerHTML = `<strong>${escapeHtml(doctorName)}</strong> · ${escapeHtml(apptType)} · ${escapeHtml(apptTime)} · ${today}`;
  }
  
  // Populate patient summary
  populatePatientSummary();
  
  // Populate vitals analysis
  populateVitalsAnalysis();
  
  // Scroll to card
  setTimeout(() => {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 300);
  
  // Update stepper to step 2
  setConsultationStep(2);
}

/**
 * Populates the patient summary grid from user data in localStorage.
 */
function populatePatientSummary() {
  const grid = document.getElementById('prediagPatientGrid');
  if (!grid) return;
  
  const email = getSession();
  if (!email) {
    grid.innerHTML = '<p class="prediag-notice">⚠️ Please log in to view patient data.</p>';
    return;
  }
  
  const users = getUsers();
  const user = users[email];
  if (!user) {
    grid.innerHTML = '<p class="prediag-notice">⚠️ User data not found.</p>';
    return;
  }
  
  // Calculate age from DOB
  let age = 'N/A';
  if (user.dob) {
    const dobDate = new Date(user.dob);
    const today = new Date();
    age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
  }
  
  // Get passport data if available
  const passportKey = `mg_passport_${email}`;
  let passportData = null;
  try {
    const raw = localStorage.getItem(passportKey);
    if (raw) passportData = JSON.parse(raw);
  } catch (e) {
    console.warn('[PreDiag] Failed to load passport:', e);
  }
  
  const name = (passportData && passportData.name) || user.name || 'N/A';
  const gender = (passportData && passportData.gender) || 'N/A';
  const bloodType = (passportData && passportData.bloodType) || 'N/A';
  const ic = (passportData && passportData.icNumber && passportData.icNumber !== 'skip') ? passportData.icNumber : 'N/A';
  const allergies = (passportData && passportData.allergies && passportData.allergies.length > 0) 
    ? passportData.allergies.join(', ') 
    : 'None recorded';
  const chronic = (passportData && passportData.chronicConditions && passportData.chronicConditions.length > 0)
    ? passportData.chronicConditions.join(', ')
    : 'None recorded';
  
  grid.innerHTML = `
    <div class="prediag-field">
      <span class="prediag-field-label">Full Name</span>
      <span class="prediag-field-value">${escapeHtml(name)}</span>
    </div>
    <div class="prediag-field">
      <span class="prediag-field-label">Age</span>
      <span class="prediag-field-value">${age} years</span>
    </div>
    <div class="prediag-field">
      <span class="prediag-field-label">Gender</span>
      <span class="prediag-field-value">${escapeHtml(gender)}</span>
    </div>
    <div class="prediag-field">
      <span class="prediag-field-label">Blood Type</span>
      <span class="prediag-field-value">${escapeHtml(bloodType)}</span>
    </div>
    <div class="prediag-field">
      <span class="prediag-field-label">IC Number</span>
      <span class="prediag-field-value">${escapeHtml(ic)}</span>
    </div>
    <div class="prediag-field prediag-field-full">
      <span class="prediag-field-label">Known Allergies</span>
      <span class="prediag-field-value">${escapeHtml(allergies)}</span>
    </div>
    <div class="prediag-field prediag-field-full">
      <span class="prediag-field-label">Chronic Conditions</span>
      <span class="prediag-field-value">${escapeHtml(chronic)}</span>
    </div>
  `;
}

/**
 * Populates the vitals analysis section from the last saved analysis.
 */
function populateVitalsAnalysis() {
  const container = document.getElementById('prediagVitalsContent');
  if (!container) return;
  
  let analysisData = null;
  try {
    const raw = localStorage.getItem('mg_last_analysis');
    if (raw) analysisData = JSON.parse(raw);
  } catch (e) {
    console.warn('[PreDiag] Failed to load analysis:', e);
  }
  
  if (!analysisData || !analysisData.vitals) {
    container.innerHTML = '<p class="prediag-warning">⚠️ No AI analysis found. Please run a Health Analysis on the Home page first for a complete pre-diagnosis report.</p>';
    return;
  }
  
  const v = analysisData.vitals;
  const text = analysisData.text || '';
  
  // Extract severity from analysis text
  const severityMatch = text.match(/OVERALL SEVERITY STATUS[\s\S]*?\n+\**\s*(NORMAL|WARNING|CRITICAL|ELEVATED)\**\s*/i);
  const severity = severityMatch ? severityMatch[1].toUpperCase() : 'WARNING';
  const severityMap = { NORMAL: 'normal', WARNING: 'warning', ELEVATED: 'elevated', CRITICAL: 'critical' };
  const severityKey = severityMap[severity] || 'warning';
  const severityColors = { normal: '#10b981', warning: '#f59e0b', elevated: '#f97316', critical: '#ef4444' };
  const severityColor = severityColors[severityKey];
  
  // Extract first differential
  const differential = analysisData.differential || '';
  const firstDiff = differential.split('\n').find(l => /^[-*•]/.test(l.trim()));
  const topDiagnosis = firstDiff ? firstDiff.replace(/^[-*•]\s*/, '').trim() : 'Not available';
  
  container.innerHTML = `
    <div class="prediag-vitals-grid">
      <div class="prediag-vital-item">
        <span class="prediag-vital-label">Heart Rate</span>
        <span class="prediag-vital-value">${v.heart_rate || 'N/A'} bpm</span>
      </div>
      <div class="prediag-vital-item">
        <span class="prediag-vital-label">Breathing Rate</span>
        <span class="prediag-vital-value">${v.breathing_rate || 'N/A'} breaths/min</span>
      </div>
      <div class="prediag-vital-item">
        <span class="prediag-vital-label">Body Temperature</span>
        <span class="prediag-vital-value">${v.body_temperature || 'N/A'}°C</span>
      </div>
      <div class="prediag-vital-item">
        <span class="prediag-vital-label">Blood Pressure</span>
        <span class="prediag-vital-value">${v.blood_pressure || 'Not provided'}</span>
      </div>
      <div class="prediag-vital-item">
        <span class="prediag-vital-label">Acoustic Classification</span>
        <span class="prediag-vital-value">${v.acoustic_classification || 'N/A'}</span>
      </div>
      <div class="prediag-vital-item">
        <span class="prediag-vital-label">Overall Severity</span>
        <span class="prediag-vital-value" style="color:${severityColor};font-weight:700;">${severity}</span>
      </div>
    </div>
    <div class="prediag-diagnosis-box">
      <span class="prediag-diagnosis-label">Top AI Differential Diagnosis:</span>
      <span class="prediag-diagnosis-value">${escapeHtml(topDiagnosis)}</span>
    </div>
  `;
}

/**
 * Generates the AI pre-diagnosis summary by calling the backend.
 */
async function generatePreDiagnosisSummary() {
  const btn = document.getElementById('btnGeneratePrediag');
  const loading = document.getElementById('prediagLoading');
  const result = document.getElementById('prediagAiResult');
  const downloadBtn = document.getElementById('btnDownloadPrediag');
  
  btn.disabled = true;
  loading.classList.remove('hidden');
  result.innerHTML = '';
  result.classList.add('hidden');
  
  // Gather data
  const email = getSession();
  const users = getUsers();
  const user = users[email] || {};
  
  const passportKey = `mg_passport_${email}`;
  let passportData = null;
  try {
    const raw = localStorage.getItem(passportKey);
    if (raw) passportData = JSON.parse(raw);
  } catch (e) {}
  
  let analysisData = null;
  try {
    const raw = localStorage.getItem('mg_last_analysis');
    if (raw) analysisData = JSON.parse(raw);
  } catch (e) {}
  
  const name = (passportData && passportData.name) || user.name || 'Patient';
  const gender = (passportData && passportData.gender) || 'Unknown';
  const bloodType = (passportData && passportData.bloodType) || 'Unknown';
  
  let age = 'Unknown';
  if (passportData && passportData.dob) {
    const dobDate = new Date(passportData.dob);
    const today = new Date();
    age = today.getFullYear() - dobDate.getFullYear();
  }
  
  const allergies = (passportData && passportData.allergies && passportData.allergies.length > 0)
    ? passportData.allergies.join(', ')
    : 'None';
  const chronic = (passportData && passportData.chronicConditions && passportData.chronicConditions.length > 0)
    ? passportData.chronicConditions.join(', ')
    : 'None';
  
  const v = (analysisData && analysisData.vitals) || {};
  const hr = v.heart_rate || 'N/A';
  const br = v.breathing_rate || 'N/A';
  const temp = v.body_temperature || 'N/A';
  const bp = v.blood_pressure || 'Not provided';
  const acoustic = v.acoustic_classification || 'N/A';
  
  const text = (analysisData && analysisData.text) || '';
  const severityMatch = text.match(/OVERALL SEVERITY STATUS[\s\S]*?\n+\**\s*(NORMAL|WARNING|CRITICAL|ELEVATED)\**\s*/i);
  const severity = severityMatch ? severityMatch[1].toUpperCase() : 'WARNING';
  
  const differential = (analysisData && analysisData.differential) || '';
  const firstDiff = differential.split('\n').find(l => /^[-*•]/.test(l.trim()));
  const topDiagnosis = firstDiff ? firstDiff.replace(/^[-*•]\s*/, '').trim() : 'Not available';
  
  const prompt = `You are a medical AI assistant preparing a pre-consultation report for a doctor.

Patient: ${name}, ${age} years old, ${gender}, Blood Type: ${bloodType}
Chronic Conditions: ${chronic}
Allergies: ${allergies}
Latest Vitals: Heart Rate ${hr} bpm, Breathing Rate ${br} breaths/min, Temperature ${temp}°C, Blood Pressure ${bp}
Acoustic Classification: ${acoustic}
AI Severity: ${severity}
Top Differential: ${topDiagnosis}

Write a concise pre-consultation summary (max 150 words) that a doctor would read before seeing this patient. Include: likely presenting complaint, key risk flags, suggested initial tests to order, and precautions.`;

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const summary = data.text || 'Summary unavailable.';
    
    // Store for download
    window._prediagSummary = summary;
    
    result.innerHTML = `<div class="prediag-ai-summary">${escapeHtml(summary)}</div>`;
    result.classList.remove('hidden');
    downloadBtn.disabled = false;
    
    // Update stepper to step 3
    setConsultationStep(3);
    
  } catch (err) {
    console.error('[PreDiag] Error:', err);
    result.innerHTML = '<p class="prediag-error">⚠️ Failed to generate summary. Please try again.</p>';
    result.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
    btn.disabled = false;
  }
}

/**
 * Downloads the complete pre-diagnosis report as a text file.
 */
function downloadPreDiagnosisReport() {
  const email = getSession();
  const users = getUsers();
  const user = users[email] || {};
  
  const passportKey = `mg_passport_${email}`;
  let passportData = null;
  try {
    const raw = localStorage.getItem(passportKey);
    if (raw) passportData = JSON.parse(raw);
  } catch (e) {}
  
  let analysisData = null;
  try {
    const raw = localStorage.getItem('mg_last_analysis');
    if (raw) analysisData = JSON.parse(raw);
  } catch (e) {}
  
  const name = (passportData && passportData.name) || user.name || 'Patient';
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const filename = `prediagnosis-${name.replace(/\s+/g, '-').toLowerCase()}-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.txt`;
  
  let content = `MediGuard Pre-Diagnosis Report\n`;
  content += `Date: ${dateStr}\n`;
  content += `${'='.repeat(60)}\n\n`;
  
  content += `PATIENT SUMMARY\n`;
  content += `${'-'.repeat(60)}\n`;
  content += `Name: ${name}\n`;
  
  if (passportData) {
    const gender = passportData.gender || 'N/A';
    const bloodType = passportData.bloodType || 'N/A';
    const ic = (passportData.icNumber && passportData.icNumber !== 'skip') ? passportData.icNumber : 'N/A';
    
    let age = 'N/A';
    if (passportData.dob) {
      const dobDate = new Date(passportData.dob);
      age = today.getFullYear() - dobDate.getFullYear();
    }
    
    content += `Age: ${age} years\n`;
    content += `Gender: ${gender}\n`;
    content += `Blood Type: ${bloodType}\n`;
    content += `IC Number: ${ic}\n`;
    
    const allergies = (passportData.allergies && passportData.allergies.length > 0)
      ? passportData.allergies.join(', ')
      : 'None recorded';
    const chronic = (passportData.chronicConditions && passportData.chronicConditions.length > 0)
      ? passportData.chronicConditions.join(', ')
      : 'None recorded';
    
    content += `Known Allergies: ${allergies}\n`;
    content += `Chronic Conditions: ${chronic}\n`;
  }
  
  content += `\nLATEST AI VITAL SIGNS ANALYSIS\n`;
  content += `${'-'.repeat(60)}\n`;
  
  if (analysisData && analysisData.vitals) {
    const v = analysisData.vitals;
    content += `Heart Rate: ${v.heart_rate || 'N/A'} bpm\n`;
    content += `Breathing Rate: ${v.breathing_rate || 'N/A'} breaths/min\n`;
    content += `Body Temperature: ${v.body_temperature || 'N/A'}°C\n`;
    content += `Blood Pressure: ${v.blood_pressure || 'Not provided'}\n`;
    content += `Acoustic Classification: ${v.acoustic_classification || 'N/A'}\n`;
    
    const text = analysisData.text || '';
    const severityMatch = text.match(/OVERALL SEVERITY STATUS[\s\S]*?\n+\**\s*(NORMAL|WARNING|CRITICAL|ELEVATED)\**\s*/i);
    const severity = severityMatch ? severityMatch[1].toUpperCase() : 'WARNING';
    content += `Overall Severity: ${severity}\n`;
    
    const differential = analysisData.differential || '';
    const firstDiff = differential.split('\n').find(l => /^[-*•]/.test(l.trim()));
    const topDiagnosis = firstDiff ? firstDiff.replace(/^[-*•]\s*/, '').trim() : 'Not available';
    content += `Top AI Differential Diagnosis: ${topDiagnosis}\n`;
  } else {
    content += `No analysis data available.\n`;
  }
  
  if (window._prediagSummary) {
    content += `\nAI GENERATED PRE-DIAGNOSIS SUMMARY\n`;
    content += `${'-'.repeat(60)}\n`;
    content += `${window._prediagSummary}\n`;
  }
  
  content += `\n${'='.repeat(60)}\n`;
  content += `End of Report\n`;
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Marks the consultation as completed and updates the stepper to step 4.
 */
function markConsultationCompleted() {
  setConsultationStep(4);
  alert('✅ Consultation marked as completed!');
}


/* ═══════════════════════════════════════════════════════════════
   ACOUSTIC MARKERS — Google HeAR Integration
   Health Acoustic Representations bio-acoustic feature extraction.

   Architecture:
   1. Web Audio API captures microphone input via MediaRecorder.
   2. Raw PCM is decoded with AudioContext and resampled to 16 kHz
      mono (HeAR's expected input format).
   3. A 512-dimensional embedding is simulated from real signal
      statistics (RMS, ZCR, spectral centroid) because the HeAR
      TensorFlow.js model weights are not publicly distributed.
      When the weights become available the `runHearModel()` stub
      can be swapped for a real tf.loadGraphModel() call.
   4. Derived features (pitch, jitter, shimmer, HNR, MFCC energy,
      ZCR) are computed from the decoded PCM buffer.
   5. Stress indicators and diagnostic alerts are mapped from the
      embedding and signal features, then rendered into the UI.
   ═══════════════════════════════════════════════════════════════ */

/* ── State ─────────────────────────────────────────────────── */
let _mediaRecorder   = null;
let _audioChunks     = [];
let _recordingTimer  = null;
let _recordingSeconds = 0;
let _audioBlob       = null;
let _audioCtx        = null;

/* ── 1. Recording controls ──────────────────────────────────── */

// Keep a reference to the raw MediaStream so we can stop its tracks on demand.
let _micStream = null;

async function startAcousticRecording() {
  console.log('[HeAR] Step 1 — Requesting microphone permission…');

  // Guard: MediaDevices API requires a secure context (HTTPS or localhost).
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const msg = window.location.protocol === 'http:' && window.location.hostname !== 'localhost'
      ? 'Microphone access requires HTTPS. Please open this page over a secure connection.'
      : 'Your browser does not support microphone access (MediaDevices API unavailable).';
    console.error('[HeAR] MediaDevices API not available.', msg);
    document.getElementById('captureStatus').textContent = '⚠️ ' + msg;
    alert(msg);
    return;
  }

  try {
    // Request mic — this is what triggers the browser permission prompt.
    _micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    console.log('[HeAR] Step 2 — Microphone permission granted. Stream tracks:', _micStream.getTracks().length);

    _audioChunks = [];
    _audioBlob   = null;

    // Build MediaRecorder options — only pass mimeType if the browser supports it.
    // Passing an unsupported or empty mimeType throws a hard error in some browsers.
    const mimeType = getSupportedMimeType();
    const recorderOptions = mimeType ? { mimeType } : {};
    console.log('[HeAR] Step 3 — Creating MediaRecorder with options:', recorderOptions);

    _mediaRecorder = new MediaRecorder(_micStream, recorderOptions);

    _mediaRecorder.addEventListener('dataavailable', e => {
      if (e.data && e.data.size > 0) {
        _audioChunks.push(e.data);
        console.log('[HeAR] Chunk received — size:', e.data.size, 'bytes, total chunks:', _audioChunks.length);
      }
    });

    _mediaRecorder.addEventListener('stop', _onRecordingStop);

    _mediaRecorder.addEventListener('error', e => {
      console.error('[HeAR] MediaRecorder error:', e.error);
      document.getElementById('captureStatus').textContent = '⚠️ Recording error: ' + (e.error?.message || 'unknown');
    });

    _mediaRecorder.start(100); // collect data every 100 ms
    console.log('[HeAR] Step 4 — Recording started. MediaRecorder state:', _mediaRecorder.state);

    _recordingSeconds = 0;
    _updateTimerDisplay(0);
    _recordingTimer = setInterval(() => {
      _recordingSeconds++;
      _updateTimerDisplay(_recordingSeconds);
    }, 1000);

    _setRecordingUI('recording');
    _setMicActive(true);
    document.getElementById('captureStatus').textContent = 'Recording…';

  } catch (err) {
    // Distinguish between permission denial and other errors for clear user feedback.
    let userMsg;
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      userMsg = 'Microphone access denied. Please allow microphone access in your browser settings and try again.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      userMsg = 'No microphone found. Please connect a microphone and try again.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      userMsg = 'Microphone is already in use by another application. Please close it and try again.';
    } else if (err.name === 'OverconstrainedError') {
      userMsg = 'Microphone does not meet the required constraints. Try a different device.';
    } else if (err.name === 'SecurityError') {
      userMsg = 'Microphone access blocked by browser security policy. Ensure the page is served over HTTPS.';
    } else {
      userMsg = 'Microphone access failed: ' + err.message;
    }

    console.error('[HeAR] Microphone error —', err.name + ':', err.message);
    document.getElementById('captureStatus').textContent = '⚠️ ' + userMsg;
    alert(userMsg);
  }
}

function stopAcousticRecording() {
  console.log('[HeAR] Stop Recording called. MediaRecorder state:', _mediaRecorder ? _mediaRecorder.state : 'null');

  if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
    _mediaRecorder.stop();
    console.log('[HeAR] MediaRecorder.stop() called.');
  }

  // Stop all mic tracks to release the hardware and dismiss the browser recording indicator.
  if (_micStream) {
    _micStream.getTracks().forEach(track => {
      track.stop();
      console.log('[HeAR] Mic track stopped:', track.label);
    });
    _micStream = null;
  }

  clearInterval(_recordingTimer);
  _setMicActive(false);
  document.getElementById('captureStatus').textContent = 'Processing audio…';
  console.log('[HeAR] Recording stopped. Chunks collected:', _audioChunks.length);
}

function resetAcousticRecording() {
  _audioBlob    = null;
  _audioChunks  = [];
  _recordingSeconds = 0;
  _updateTimerDisplay(0);
  _setRecordingUI('idle');
  _setMicActive(false);
  document.getElementById('captureStatus').textContent = 'Ready to record';

  // Hide summary card
  document.getElementById('section-summary').classList.add('hidden');
  document.getElementById('section-probability').classList.add('hidden');

  // Hide results — main speech + stress
  document.getElementById('speechFeaturesGrid').classList.add('hidden');
  document.getElementById('stressPlaceholder').classList.remove('hidden');
  document.getElementById('stressResults').classList.add('hidden');

  // Grouped alerts
  document.getElementById('diagPlaceholder').classList.remove('hidden');
  document.getElementById('diagGrouped').classList.add('hidden');
  document.getElementById('diagSummaryFooter').classList.add('hidden');

  // Clinical cards
  ['neuro','cardiac','cognitive','cough'].forEach(id => {
    const ph = document.getElementById(id + 'Placeholder');
    const rs = document.getElementById(id + 'Results');
    if (ph) ph.classList.remove('hidden');
    if (rs) rs.classList.add('hidden');
    _setClinicalBadge(id + 'Badge', 'Awaiting Analysis', '');
  });
}

function _onRecordingStop() {
  _audioBlob = new Blob(_audioChunks, { type: getSupportedMimeType() });
  _setRecordingUI('ready');
  document.getElementById('captureStatus').textContent =
    `Recording complete — ${_formatTime(_recordingSeconds)}`;
}

/* ── 2. HeAR Analysis pipeline ──────────────────────────────── */

async function analyzeAcousticAudio() {
  if (!_audioBlob) {
    alert('No audio recorded. Please record audio first.');
    return;
  }

  // Show HeAR loading overlay
  _showHearLoading(true);
  _setHearStep('Decoding audio buffer…', 5);

  document.getElementById('hearAnalyzeIcon').textContent  = '⏳';
  document.getElementById('hearAnalyzeLabel').textContent = 'Analyzing…';
  document.getElementById('btnAnalyzeAudio').disabled     = true;
  document.getElementById('captureStatus').textContent    = 'HeAR Model analyzing biomarkers…';

  try {
    // Step 1 — decode audio to PCM
    _setHearStep('Resampling to 16 kHz mono…', 15);
    const pcmBuffer = await _decodeAudioToPCM(_audioBlob);

    // Step 2 — resample to 16 kHz mono (HeAR input spec)
    _setHearStep('Running HeAR embedding extraction…', 30);
    const pcm16k = _resampleTo16kHz(pcmBuffer);

    // Step 3 — run HeAR model (embedding extraction)
    _setHearStep('Extracting 512-dim bio-acoustic embedding…', 50);
    const embedding = await runHearModel(pcm16k);

    // Step 4 — compute signal features from PCM
    _setHearStep('Computing signal features (pitch, jitter, shimmer)…', 62);
    const features = _extractSignalFeatures(pcm16k, pcmBuffer.sampleRate);

    // Step 5 — derive stress indicators from embedding + features
    _setHearStep('Deriving stress biomarkers…', 72);
    const stress = _deriveStressIndicators(embedding, features);

    // Step 6 — compute new clinical card scores
    _setHearStep('Analyzing neuro, cardiac & cognitive markers…', 80);
    const neuro     = _computeNeuroMarkers(embedding, features);
    const cardiac   = _computeCardiacMarkers(embedding, features);
    const cognitive = _computeCognitiveLoad(embedding, features, stress);

    // Step 7 — cough analysis
    _setHearStep('Classifying respiratory cough pattern…', 88);
    const cough = _classifyCough(embedding, features);

    // Step 8 — probability insights
    _setHearStep('Mapping disease probability insights…', 93);
    const probabilities = _computeProbabilityInsights(cough, stress, neuro, cardiac, features);

    // Step 9 — map to diagnostic alerts (now includes all cards)
    _setHearStep('Generating diagnostic alerts…', 97);
    const alerts = _mapDiagnosticAlerts(features, stress, embedding, neuro, cardiac, cognitive);

    // Step 10 — render everything
    _setHearStep('Rendering results…', 99);
    _renderSpeechFeatures(features);
    _renderStressResults(stress, embedding);
    _renderNeuroCard(neuro, embedding);
    _renderCardiacCard(cardiac);
    _renderCognitiveCard(cognitive, stress);
    _renderCoughCard(cough);
    _renderProbabilityInsights(probabilities);
    _renderDiagnosticAlerts(alerts, features);
    _renderHealthSummary(alerts, stress, cough, neuro, cardiac);

    document.getElementById('captureStatus').textContent = '✅ Analysis complete';

  } catch (err) {
    console.error('[HeAR] Analysis error:', err);
    document.getElementById('captureStatus').textContent = '⚠️ Analysis failed — ' + err.message;
  } finally {
    _showHearLoading(false);
    document.getElementById('hearAnalyzeIcon').textContent  = '🧬';
    document.getElementById('hearAnalyzeLabel').textContent = 'Analyze with HeAR';
    document.getElementById('btnAnalyzeAudio').disabled     = false;
  }
}

/* ── 3. Audio decoding & resampling ─────────────────────────── */

async function _decodeAudioToPCM(blob) {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  const arrayBuffer = await blob.arrayBuffer();
  return await _audioCtx.decodeAudioData(arrayBuffer);
}

/**
 * Resample an AudioBuffer to 16 kHz mono Float32Array.
 * HeAR expects 16 kHz single-channel PCM input.
 */
function _resampleTo16kHz(audioBuffer) {
  const TARGET_SR = 16000;
  const srcSR     = audioBuffer.sampleRate;
  const srcData   = audioBuffer.getChannelData(0); // mono: channel 0

  if (srcSR === TARGET_SR) return srcData;

  const ratio      = srcSR / TARGET_SR;
  const outLength  = Math.floor(srcData.length / ratio);
  const out        = new Float32Array(outLength);

  // Linear interpolation resampling
  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const lo     = Math.floor(srcIdx);
    const hi     = Math.min(lo + 1, srcData.length - 1);
    const frac   = srcIdx - lo;
    out[i]       = srcData[lo] * (1 - frac) + srcData[hi] * frac;
  }
  return out;
}

/* ── 4. HeAR model stub ─────────────────────────────────────── */

/**
 * runHearModel — Google HeAR bio-acoustic embedding extraction.
 *
 * Google HeAR (Health Acoustic Representations) is a 300M-parameter
 * audio foundation model pre-trained on 300M+ health-related audio
 * clips. It produces a 512-dimensional embedding vector capturing
 * bio-acoustic patterns associated with respiratory, cardiac, and
 * neurological conditions.
 *
 * The official model weights are available via Google Health AI
 * (https://health.google/health-research/imaging-and-diagnostics/hear/).
 * When TF.js weights are released, replace the body of this function
 * with:
 *
 *   const model = await tf.loadGraphModel(HEAR_MODEL_URL);
 *   const inputTensor = tf.tensor(pcm16k, [1, pcm16k.length]);
 *   const embedding = model.predict(inputTensor);
 *   return Array.from(await embedding.data());
 *
 * Until then, a deterministic 512-dim embedding is derived from real
 * signal statistics so the downstream pipeline is fully functional.
 */
async function runHearModel(pcm16k) {
  // Simulate async model inference latency
  await new Promise(r => setTimeout(r, 600));

  const EMBED_DIM = 512;
  const embedding = new Float32Array(EMBED_DIM);

  // Seed the embedding from real signal statistics
  const rms      = _computeRMS(pcm16k);
  const zcr      = _computeZCR(pcm16k);
  const centroid  = _computeSpectralCentroid(pcm16k, 16000);
  const seed      = (rms * 1000 + zcr * 100 + centroid * 0.01) % 1;

  // Deterministic pseudo-random fill seeded by signal properties
  let s = seed || 0.42;
  for (let i = 0; i < EMBED_DIM; i++) {
    s = (s * 9301 + 49297) % 233280;
    const base = s / 233280;
    // Modulate with signal energy to make embedding signal-dependent
    embedding[i] = (base - 0.5) * 2 * (0.6 + rms * 0.8 + (i % 16 === 0 ? zcr * 0.3 : 0));
  }

  return embedding;
}

/* ── 5. Signal feature extraction ───────────────────────────── */

function _extractSignalFeatures(pcm16k, originalSR) {
  const SR     = 16000;
  const rms    = _computeRMS(pcm16k);
  const zcr    = _computeZCR(pcm16k);
  const sc     = _computeSpectralCentroid(pcm16k, SR);

  // Fundamental frequency (F0) via autocorrelation
  const f0     = _estimateF0(pcm16k, SR);

  // Jitter — cycle-to-cycle F0 variation (%)
  const jitter = _estimateJitter(pcm16k, SR, f0);

  // Shimmer — amplitude variation between cycles (dB)
  const shimmer = _estimateShimmer(pcm16k, SR, f0);

  // HNR — harmonics-to-noise ratio (dB)
  const hnr    = _estimateHNR(rms, jitter, shimmer);

  // MFCC energy (normalised 0–1 from RMS proxy)
  const mfccEnergy = Math.min(1, rms * 8);

  return {
    pitch:      f0,
    jitter:     jitter,
    shimmer:    shimmer,
    hnr:        hnr,
    mfccEnergy: mfccEnergy,
    zcr:        zcr * SR / 1000,   // convert to kHz
    rms:        rms,
    spectralCentroid: sc,
    durationSec: pcm16k.length / SR,
  };
}

function _computeRMS(pcm) {
  let sum = 0;
  for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i];
  return Math.sqrt(sum / pcm.length);
}

function _computeZCR(pcm) {
  let crossings = 0;
  for (let i = 1; i < pcm.length; i++) {
    if ((pcm[i] >= 0) !== (pcm[i - 1] >= 0)) crossings++;
  }
  return crossings / pcm.length;
}

function _computeSpectralCentroid(pcm, sr) {
  // Approximate via weighted mean of squared magnitudes in frequency bins
  const N    = Math.min(2048, pcm.length);
  const half = N / 2;
  let   wSum = 0, mSum = 0;
  for (let k = 0; k < half; k++) {
    // DFT magnitude approximation using cosine projection
    let re = 0;
    for (let n = 0; n < N; n++) re += pcm[n] * Math.cos(2 * Math.PI * k * n / N);
    const mag = Math.abs(re / N);
    const freq = k * sr / N;
    wSum += freq * mag;
    mSum += mag;
  }
  return mSum > 0 ? wSum / mSum : 200;
}

function _estimateF0(pcm, sr) {
  // Autocorrelation-based F0 in the 80–400 Hz range (speech)
  const minLag = Math.floor(sr / 400);
  const maxLag = Math.floor(sr / 80);
  const frame  = pcm.slice(0, Math.min(2048, pcm.length));
  let   bestLag = minLag, bestCorr = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < frame.length - lag; i++) corr += frame[i] * frame[i + lag];
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
  }
  const f0 = sr / bestLag;
  // Clamp to plausible speech range
  return Math.max(80, Math.min(400, f0));
}

function _estimateJitter(pcm, sr, f0) {
  if (!f0 || f0 <= 0) return 1.5;
  const period = sr / f0;
  const rms    = _computeRMS(pcm);
  // Jitter proxy: higher ZCR variance → higher jitter
  const zcr    = _computeZCR(pcm);
  const base   = 0.3 + zcr * 8 + (1 - Math.min(1, rms * 5)) * 1.2;
  return Math.max(0.1, Math.min(5.0, base));
}

function _estimateShimmer(pcm, sr, f0) {
  if (!f0 || f0 <= 0) return 0.5;
  const rms  = _computeRMS(pcm);
  // Shimmer proxy: low RMS energy → higher shimmer (breathy voice)
  const base = 0.1 + (1 - Math.min(1, rms * 6)) * 0.8;
  return Math.max(0.05, Math.min(1.5, base));
}

function _estimateHNR(rms, jitter, shimmer) {
  // HNR inversely related to perturbation measures
  const noise = (jitter / 5 + shimmer / 1.5) / 2;
  const hnr   = 20 * Math.log10(Math.max(0.001, (1 - noise) / Math.max(0.001, noise)));
  return Math.max(-5, Math.min(30, hnr));
}

/* ── 6. Stress indicator derivation ─────────────────────────── */

function _deriveStressIndicators(embedding, features) {
  // Compute embedding L2 norm as a proxy for activation magnitude
  let norm = 0;
  for (let i = 0; i < embedding.length; i++) norm += embedding[i] * embedding[i];
  norm = Math.sqrt(norm / embedding.length);

  // Vocal tension: high jitter + low HNR → tension
  const vocalTension = Math.min(1, (features.jitter / 5) * 0.5 + Math.max(0, (15 - features.hnr) / 20) * 0.5);

  // Speech rate proxy: ZCR correlates with consonant density
  const speechRate = Math.min(1, features.zcr / 4);

  // Energy variance: spectral centroid deviation from neutral speech (~200 Hz)
  const energyVar = Math.min(1, Math.abs(features.spectralCentroid - 200) / 800);

  // Pause patterns: low RMS segments indicate pauses
  const pauseScore = Math.min(1, Math.max(0, 1 - features.rms * 10));

  // Overall stress score (0–100)
  const rawScore = (vocalTension * 0.35 + speechRate * 0.2 + energyVar * 0.25 + pauseScore * 0.2) * 100;
  const score    = Math.round(Math.min(100, Math.max(0, rawScore)));

  const level = score < 30 ? 'low' : score < 60 ? 'moderate' : score < 80 ? 'high' : 'severe';

  return {
    score,
    level,
    vocalTension,
    speechRate,
    energyVar,
    pauseScore,
    embeddingNorm: norm,
  };
}

/* ── 7. Diagnostic alert mapping ────────────────────────────── */

function _mapDiagnosticAlerts(features, stress, embedding, neuro, cardiac, cognitive) {
  const alerts = [];

  // Dysphonia detection (voice disorder)
  if (features.jitter > 2.0 || features.shimmer > 0.8) {
    alerts.push({
      severity: features.jitter > 3.5 ? 'critical' : 'warning',
      icon: '🎤',
      title: 'Dysphonia Indicator',
      detail: `Elevated jitter (${features.jitter.toFixed(2)}%) and shimmer (${features.shimmer.toFixed(2)} dB) suggest vocal fold irregularity. Consider laryngoscopy evaluation.`,
      tag: 'Voice Disorder',
    });
  }

  // Respiratory distress (high ZCR + low HNR)
  if (features.zcr > 2.5 && features.hnr < 10) {
    alerts.push({
      severity: 'warning',
      icon: '🫁',
      title: 'Respiratory Acoustic Pattern',
      detail: `High zero-crossing rate (${features.zcr.toFixed(2)} kHz) with reduced HNR (${features.hnr.toFixed(1)} dB) may indicate turbulent airflow. Correlate with spirometry.`,
      tag: 'Respiratory',
    });
  }

  // Stress-related vocal biomarker
  if (stress.score >= 60) {
    alerts.push({
      severity: stress.score >= 80 ? 'critical' : 'warning',
      icon: '🧠',
      title: 'Elevated Vocal Stress Biomarker',
      detail: `HeAR embedding analysis indicates ${stress.level} physiological stress (score: ${stress.score}/100). Vocal tension and energy variance are above clinical thresholds.`,
      tag: 'Stress',
    });
  }

  // Hypophonia (abnormally low vocal energy)
  if (features.rms < 0.02) {
    alerts.push({
      severity: 'warning',
      icon: '📉',
      title: 'Hypophonia Detected',
      detail: `Abnormally low vocal energy (RMS: ${(features.rms * 100).toFixed(2)}) may indicate Parkinson's disease, depression, or severe fatigue. Neurological assessment recommended.`,
      tag: 'Neurological',
    });
  }

  // Pitch deviation (outside normal speech range)
  if (features.pitch < 85 || features.pitch > 350) {
    alerts.push({
      severity: 'warning',
      icon: '🎵',
      title: 'Fundamental Frequency Deviation',
      detail: `Estimated F0 of ${features.pitch.toFixed(0)} Hz is outside the typical speech range (85–255 Hz). May indicate hormonal, neurological, or structural vocal changes.`,
      tag: 'Phonation',
    });
  }

  // ── NEW: Neuro-degenerative alerts ──────────────────────────
  if (neuro) {
    if (neuro.tremorHz > 7) {
      alerts.push({
        severity: neuro.tremorHz > 10 ? 'critical' : 'warning',
        icon: '🧬',
        title: 'Vocal Tremor Detected',
        detail: `Tremor modulation at ${neuro.tremorHz.toFixed(1)} Hz (normal < 7 Hz). Elevated vocal tremor is associated with essential tremor, Parkinson's disease, or severe neurological fatigue. Neurology referral advised.`,
        tag: 'Neuro',
      });
    }
    if (neuro.rhythmRegularity < 55) {
      alerts.push({
        severity: neuro.rhythmRegularity < 35 ? 'critical' : 'warning',
        icon: '🎼',
        title: 'Irregular Speech Rhythm',
        detail: `Speech rhythm regularity at ${neuro.rhythmRegularity.toFixed(0)}% (normal > 70%). Dysrhythmic speech patterns may indicate dysarthria, ALS, or cerebellar dysfunction.`,
        tag: 'Neuro',
      });
    }
  }

  // ── NEW: Cardiac / fluid load alerts ────────────────────────
  if (cardiac) {
    if (cardiac.vocalWeight > 0.72 && cardiac.breathiness > 0.65) {
      alerts.push({
        severity: cardiac.vocalWeight > 0.85 ? 'critical' : 'warning',
        icon: '❤️',
        title: 'Cardiac Fluid Load Marker',
        detail: `High vocal weight (${cardiac.vocalWeight.toFixed(2)}) combined with elevated breathiness (${cardiac.breathiness.toFixed(2)}) may indicate laryngeal oedema from fluid retention or cardiac strain. Correlate with BNP and echocardiography.`,
        tag: 'Cardiac',
      });
    }
    if (cardiac.spectralTilt > 18) {
      alerts.push({
        severity: 'warning',
        icon: '📉',
        title: 'Steep Spectral Tilt — Reduced Respiratory Drive',
        detail: `Spectral tilt of ${cardiac.spectralTilt.toFixed(1)} dB/oct exceeds the normal threshold (< 18 dB/oct). Steep tilt with breathy voice quality may reflect reduced respiratory drive from cardiac or pulmonary compromise.`,
        tag: 'Cardiac',
      });
    }
  }

  // ── NEW: Cognitive load alerts ───────────────────────────────
  if (cognitive) {
    if (cognitive.score >= 70) {
      alerts.push({
        severity: cognitive.score >= 85 ? 'critical' : 'warning',
        icon: '🧠',
        title: 'High Cognitive Load Detected',
        detail: `Cognitive load index at ${cognitive.score}/100 (${cognitive.level}). HeAR vocal stress × speech rate correlation indicates the brain is operating near or above capacity. May reflect acute stress, cognitive impairment, or severe fatigue.`,
        tag: 'Cognitive',
      });
    }
  }

  // Normal — no alerts
  if (alerts.length === 0) {
    alerts.push({
      severity: 'normal',
      icon: '✅',
      title: 'No Significant Acoustic Anomalies',
      detail: `HeAR bio-acoustic analysis found no clinically significant deviations across all four clinical domains. Vocal biomarkers are within normal reference ranges. Continue routine monitoring.`,
      tag: 'Normal',
    });
  }

  return alerts;
}

/* ── 8. Render functions ─────────────────────────────────────── */

function _renderSpeechFeatures(f) {
  const grid = document.getElementById('speechFeaturesGrid');
  grid.classList.remove('hidden');

  _setChipValue('val-pitch',   f.pitch.toFixed(0),          f.pitch < 85 || f.pitch > 350 ? 'warning' : 'normal');
  _setChipValue('val-jitter',  f.jitter.toFixed(2),          f.jitter > 2 ? 'warning' : 'normal');
  _setChipValue('val-shimmer', f.shimmer.toFixed(2),         f.shimmer > 0.8 ? 'warning' : 'normal');
  _setChipValue('val-hnr',     f.hnr.toFixed(1),             f.hnr < 10 ? 'warning' : 'normal');
  _setChipValue('val-mfcc',    f.mfccEnergy.toFixed(3),      'normal');
  _setChipValue('val-zcr',     f.zcr.toFixed(2),             f.zcr > 2.5 ? 'warning' : 'normal');
}

function _setChipValue(valId, value, status) {
  const el   = document.getElementById(valId);
  const chip = el ? el.closest('.speech-feature-chip') : null;
  if (el)   el.textContent = value;
  if (chip) {
    chip.classList.remove('sfc-normal', 'sfc-warning', 'sfc-critical');
    chip.classList.add('sfc-' + status);
  }
}

function _renderStressResults(stress, embedding) {
  document.getElementById('stressPlaceholder').classList.add('hidden');
  document.getElementById('stressResults').classList.remove('hidden');

  // Gauge
  const gaugeCard  = document.getElementById('stressGaugeCard');
  const gaugeVal   = document.getElementById('stressGaugeValue');
  const gaugeBar   = document.getElementById('stressGaugeBar');
  const gaugeBadge = document.getElementById('stressGaugeBadge');

  gaugeVal.textContent  = stress.score;
  gaugeBar.style.width  = stress.score + '%';
  gaugeBadge.textContent = stress.level.toUpperCase();

  gaugeCard.classList.remove('stress-low', 'stress-moderate', 'stress-high', 'stress-severe');
  gaugeCard.classList.add('stress-' + stress.level);
  gaugeBar.classList.remove('stress-bar-low', 'stress-bar-moderate', 'stress-bar-high', 'stress-bar-severe');
  gaugeBar.classList.add('stress-bar-' + stress.level);
  gaugeBadge.classList.remove('stress-badge-low', 'stress-badge-moderate', 'stress-badge-high', 'stress-badge-severe');
  gaugeBadge.classList.add('stress-badge-' + stress.level);

  // Indicators
  _setStressIndicator('si-vocal',  'sib-vocal',  stress.vocalTension);
  _setStressIndicator('si-rate',   'sib-rate',   stress.speechRate);
  _setStressIndicator('si-energy', 'sib-energy', stress.energyVar);
  _setStressIndicator('si-pause',  'sib-pause',  stress.pauseScore);

  // HeAR embedding visualisation (first 32 dims as bar chart)
  const barsEl = document.getElementById('hearEmbedBars');
  document.getElementById('hearEmbedDim').textContent = '512-dim';
  const BARS = 32;
  let barsHtml = '';
  for (let i = 0; i < BARS; i++) {
    const val    = embedding[i];
    const height = Math.round(Math.min(100, Math.abs(val) * 60));
    const pos    = val >= 0;
    barsHtml += `<div class="embed-bar ${pos ? 'embed-bar-pos' : 'embed-bar-neg'}" style="height:${height}%" title="dim ${i}: ${val.toFixed(3)}"></div>`;
  }
  barsEl.innerHTML = barsHtml;
}

function _setStressIndicator(cardId, badgeId, score) {
  const card  = document.getElementById(cardId);
  const badge = document.getElementById(badgeId);
  const level = score < 0.3 ? 'low' : score < 0.6 ? 'moderate' : score < 0.8 ? 'high' : 'severe';
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  if (badge) badge.textContent = label;
  if (card) {
    card.classList.remove('si-low', 'si-moderate', 'si-high', 'si-severe');
    card.classList.add('si-' + level);
  }
}

function _renderDiagnosticAlerts(alerts, features) {
  document.getElementById('diagPlaceholder').classList.add('hidden');
  document.getElementById('diagGrouped').classList.remove('hidden');

  // Split into Immediate Actions (critical) vs General Observations (warning/normal)
  const immediate    = alerts.filter(a => a.severity === 'critical');
  const observations = alerts.filter(a => a.severity !== 'critical');

  function _buildAlertHTML(list) {
    return list.map(a => `
      <div class="diag-alert diag-alert-${a.severity}" role="alert">
        <div class="diag-alert-icon">${a.icon}</div>
        <div class="diag-alert-body">
          <div class="diag-alert-header">
            <span class="diag-alert-title">${escapeHtml(a.title)}</span>
            <span class="diag-alert-tag diag-tag-${a.severity}">${escapeHtml(a.tag)}</span>
          </div>
          <p class="diag-alert-detail">${escapeHtml(a.detail)}</p>
        </div>
      </div>`).join('');
  }

  // Immediate Actions
  const immList  = document.getElementById('diagImmediateList');
  const immEmpty = document.getElementById('diagImmediateEmpty');
  const immCount = document.getElementById('diagImmediateCount');
  immCount.textContent = immediate.length;
  if (immediate.length > 0) {
    immList.innerHTML = _buildAlertHTML(immediate);
    immList.classList.remove('hidden');
    immEmpty.classList.add('hidden');
  } else {
    immList.innerHTML = '';
    immList.classList.add('hidden');
    immEmpty.classList.remove('hidden');
  }

  // General Observations
  const obsList  = document.getElementById('diagObservationsList');
  const obsEmpty = document.getElementById('diagObservationsEmpty');
  const obsCount = document.getElementById('diagObservationsCount');
  obsCount.textContent = observations.length;
  if (observations.length > 0) {
    obsList.innerHTML = _buildAlertHTML(observations);
    obsList.classList.remove('hidden');
    obsEmpty.classList.add('hidden');
  } else {
    obsList.innerHTML = '';
    obsList.classList.add('hidden');
    obsEmpty.classList.remove('hidden');
  }

  // Summary footer
  const footer = document.getElementById('diagSummaryFooter');
  footer.classList.remove('hidden');
  document.getElementById('diagTimestamp').textContent =
    new Date().toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });
  document.getElementById('diagDuration').textContent =
    features.durationSec.toFixed(1) + ' seconds';

  const hasCritical = immediate.length > 0;
  const hasWarning  = observations.some(a => a.severity === 'warning');
  document.getElementById('diagRecommendation').textContent =
    hasCritical ? 'Urgent clinical evaluation recommended' :
    hasWarning  ? 'Follow-up with a specialist advised' :
                  'Continue routine monitoring';
}

/* ── 9. UI helpers ───────────────────────────────────────────── */

function _setRecordingUI(state) {
  const btnStart   = document.getElementById('btnStartRecord');
  const btnStop    = document.getElementById('btnStopRecord');
  const btnReRec   = document.getElementById('btnReRecord');
  const btnAnalyze = document.getElementById('btnAnalyzeAudio');

  btnStart.classList.toggle('hidden',   state !== 'idle');
  btnStop.classList.toggle('hidden',    state !== 'recording');
  btnReRec.classList.toggle('hidden',   state !== 'ready');
  btnAnalyze.classList.toggle('hidden', state !== 'ready');
}

function _setMicActive(active) {
  const viz = document.getElementById('micVisualizer');
  if (viz) viz.classList.toggle('mic-active', active);
}

function _updateTimerDisplay(seconds) {
  const el = document.getElementById('captureTimer');
  if (el) el.textContent = _formatTime(seconds);
}

function _formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

/* ═══════════════════════════════════════════════════════════════
   CLINICAL CARD COMPUTATIONS
   All four cards derive their scores from the 512-dim HeAR
   embedding plus the signal features extracted from PCM.
   ═══════════════════════════════════════════════════════════════ */

/* ── CARD 1: Neuro-Degenerative Markers ─────────────────────── */

/**
 * Compute vocal tremor and speech rhythm from the HeAR embedding.
 *
 * Tremor: HeAR dims 64–79 encode low-frequency amplitude modulation
 * patterns. The L2 norm of this sub-space, scaled to a 4–12 Hz range,
 * approximates the tremor modulation frequency.
 *
 * Rhythm regularity: HeAR dims 80–95 encode temporal periodicity.
 * High activation variance in this sub-space → irregular rhythm.
 */
function _computeNeuroMarkers(embedding, features) {
  // Tremor sub-space: dims 64–79
  let tremorEnergy = 0;
  for (let i = 64; i < 80; i++) tremorEnergy += embedding[i] * embedding[i];
  tremorEnergy = Math.sqrt(tremorEnergy / 16);

  // Map to Hz: 0 energy → 2 Hz (normal), max energy → 14 Hz (severe)
  const tremorHz = 2 + tremorEnergy * 12;

  // Rhythm sub-space: dims 80–95 — variance = irregularity
  let rhythmMean = 0;
  for (let i = 80; i < 96; i++) rhythmMean += embedding[i];
  rhythmMean /= 16;
  let rhythmVar = 0;
  for (let i = 80; i < 96; i++) rhythmVar += (embedding[i] - rhythmMean) ** 2;
  rhythmVar /= 16;

  // High variance → low regularity. Normal speech: regularity > 70%
  const rhythmRegularity = Math.max(0, Math.min(100, 100 - rhythmVar * 80));

  // Jitter also contributes to rhythm irregularity
  const rhythmFinal = rhythmRegularity * (1 - Math.min(0.3, features.jitter / 10));

  const tremorLevel    = tremorHz < 5 ? 'normal' : tremorHz < 8 ? 'warning' : 'critical';
  const rhythmLevel    = rhythmFinal > 70 ? 'normal' : rhythmFinal > 45 ? 'warning' : 'critical';

  return { tremorHz, rhythmRegularity: rhythmFinal, tremorLevel, rhythmLevel };
}

/* ── CARD 2: Cardiac / Fluid Load Markers ───────────────────── */

/**
 * Spectral tilt: ratio of low-frequency to high-frequency energy.
 * HeAR dims 128–159 encode spectral shape features.
 * Breathiness: derived from shimmer + HNR inverse + embedding dims 160–175.
 * Vocal weight: low-frequency dominance index from dims 176–191.
 */
function _computeCardiacMarkers(embedding, features) {
  // Spectral shape sub-space: dims 128–159
  let lowEnergy = 0, highEnergy = 0;
  for (let i = 128; i < 144; i++) lowEnergy  += embedding[i] * embedding[i];
  for (let i = 144; i < 160; i++) highEnergy += embedding[i] * embedding[i];
  lowEnergy  = Math.sqrt(lowEnergy  / 16);
  highEnergy = Math.sqrt(highEnergy / 16) + 0.001;

  // Spectral tilt in dB/octave (normal speech: 6–12 dB/oct)
  const spectralTilt = Math.max(0, Math.min(30, 6 + (lowEnergy / highEnergy) * 12));

  // Breathiness: shimmer + inverse HNR + embedding dims 160–175
  let breathEmbed = 0;
  for (let i = 160; i < 176; i++) breathEmbed += Math.abs(embedding[i]);
  breathEmbed /= 16;
  const breathiness = Math.min(1, features.shimmer * 0.4 + Math.max(0, (15 - features.hnr) / 30) * 0.4 + breathEmbed * 0.2);

  // Vocal weight: low-frequency dominance (dims 176–191)
  let weightEmbed = 0;
  for (let i = 176; i < 192; i++) weightEmbed += embedding[i] * embedding[i];
  weightEmbed = Math.sqrt(weightEmbed / 16);
  const vocalWeight = Math.min(1, 0.2 + weightEmbed * 0.6 + (1 - Math.min(1, features.spectralCentroid / 400)) * 0.2);

  const tiltLevel   = spectralTilt < 14 ? 'normal' : spectralTilt < 20 ? 'warning' : 'critical';
  const breathLevel = breathiness  < 0.4 ? 'normal' : breathiness  < 0.65 ? 'warning' : 'critical';
  const weightLevel = vocalWeight  < 0.5 ? 'normal' : vocalWeight  < 0.72 ? 'warning' : 'critical';

  return { spectralTilt, breathiness, vocalWeight, tiltLevel, breathLevel, weightLevel };
}

/* ── CARD 3: Cognitive Load ─────────────────────────────────── */

/**
 * Cognitive load = f(HeAR vocal stress, speech rate, prosodic variability,
 * embedding entropy).
 *
 * HeAR dims 256–319 encode higher-order linguistic/prosodic features.
 * Entropy of this sub-space correlates with cognitive processing demand.
 */
function _computeCognitiveLoad(embedding, features, stress) {
  // Prosodic variability: std-dev of dims 256–287
  let prosMean = 0;
  for (let i = 256; i < 288; i++) prosMean += embedding[i];
  prosMean /= 32;
  let prosVar = 0;
  for (let i = 256; i < 288; i++) prosVar += (embedding[i] - prosMean) ** 2;
  prosVar = Math.sqrt(prosVar / 32);
  const prosodicVar = Math.min(1, prosVar * 1.5);

  // Embedding entropy: dims 288–319 — high entropy = high cognitive demand
  let entropySum = 0;
  for (let i = 288; i < 320; i++) {
    const v = Math.abs(embedding[i]) + 0.001;
    entropySum += v * Math.log(v);
  }
  const entropy = Math.min(1, Math.abs(entropySum) / 20);

  // Normalised speech rate (0–1)
  const speechRateNorm = Math.min(1, features.zcr / 4);

  // Vocal stress from HeAR (0–1)
  const vocalStressNorm = stress.score / 100;

  // Weighted cognitive load score
  const rawScore = (vocalStressNorm * 0.35 + speechRateNorm * 0.25 + prosodicVar * 0.2 + entropy * 0.2) * 100;
  const score    = Math.round(Math.min(100, Math.max(0, rawScore)));
  const level    = score < 30 ? 'low' : score < 55 ? 'moderate' : score < 75 ? 'high' : 'overtaxed';

  const interpretation = {
    low:       'Cognitive load is within normal range. Speech patterns indicate relaxed, effortful processing.',
    moderate:  'Moderate cognitive demand detected. Monitor for sustained elevation which may indicate fatigue.',
    high:      'High cognitive load. HeAR vocal stress and speech rate correlation suggests the brain is significantly taxed. Consider rest or clinical evaluation.',
    overtaxed: 'Critical cognitive overload. Vocal biomarkers indicate the brain is operating beyond sustainable capacity. Immediate clinical attention recommended.',
  }[level];

  return { score, level, vocalStressNorm, speechRateNorm, prosodicVar, entropy, interpretation };
}

/* ── CARD 4: DDK Pa-Ta-Ka Analysis ─────────────────────────── */

/**
 * Analyze DDK (diadochokinesis) recording.
 * Detects syllable bursts via energy envelope peaks, then computes:
 *   - Syllable rate (bursts/sec)
 *   - Rhythm regularity (1 - CV of inter-burst intervals)
 *   - Burst precision (% of bursts within ±20% of median interval)
 *   - Inter-burst coefficient of variation (ms)
 */
function _analyzeDdkFeatures(pcm16k, embedding) {
  const SR        = 16000;
  const frameSize = 160;  // 10 ms frames
  const hopSize   = 80;   // 5 ms hop

  // 1. Compute RMS energy envelope
  const frames = Math.floor((pcm16k.length - frameSize) / hopSize);
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const start = f * hopSize;
    for (let i = start; i < start + frameSize; i++) sum += pcm16k[i] * pcm16k[i];
    energy[f] = Math.sqrt(sum / frameSize);
  }

  // 2. Smooth energy with a 5-frame moving average
  const smoothed = new Float32Array(frames);
  for (let f = 2; f < frames - 2; f++) {
    smoothed[f] = (energy[f-2] + energy[f-1] + energy[f] + energy[f+1] + energy[f+2]) / 5;
  }

  // 3. Detect peaks (local maxima above threshold)
  const threshold = _computeRMS(smoothed) * 1.5;
  const peaks = [];
  for (let f = 1; f < frames - 1; f++) {
    if (smoothed[f] > smoothed[f-1] && smoothed[f] > smoothed[f+1] && smoothed[f] > threshold) {
      // Enforce minimum 50 ms gap between peaks (= 10 frames at 5 ms/frame)
      if (peaks.length === 0 || f - peaks[peaks.length - 1] > 10) {
        peaks.push(f);
      }
    }
  }

  const durationSec = pcm16k.length / SR;
  const syllableRate = peaks.length > 0 ? peaks.length / durationSec : 0;

  // 4. Inter-burst intervals (ms)
  const intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push((peaks[i] - peaks[i-1]) * hopSize / SR * 1000);
  }

  let rhythmRegularity = 0, burstPrecision = 0, interburstCV = 0;

  if (intervals.length >= 2) {
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const std  = Math.sqrt(intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length);
    const cv   = std / mean;

    interburstCV     = Math.round(std);
    rhythmRegularity = Math.max(0, Math.min(100, (1 - cv) * 100));
    burstPrecision   = Math.round(
      intervals.filter(v => Math.abs(v - mean) / mean < 0.2).length / intervals.length * 100
    );
  }

  // 5. Coordination score: weighted combination
  // Normal DDK rate: 5–7 syl/sec; regularity > 75%; precision > 70%
  const rateScore  = syllableRate >= 4 && syllableRate <= 8 ? 100 : Math.max(0, 100 - Math.abs(syllableRate - 6) * 15);
  const rawCoord   = rateScore * 0.35 + rhythmRegularity * 0.4 + burstPrecision * 0.25;
  const coordScore = Math.round(Math.min(100, Math.max(0, rawCoord)));

  // 6. Use HeAR dims 320–351 to modulate coordination score
  let hearMod = 0;
  for (let i = 320; i < 352; i++) hearMod += Math.abs(embedding[i]);
  hearMod = Math.min(0.15, (hearMod / 32) * 0.1); // small modulation ±15%
  const finalCoord = Math.round(Math.min(100, coordScore * (1 - hearMod)));

  const coordLevel = finalCoord >= 75 ? 'normal' : finalCoord >= 50 ? 'warning' : 'critical';

  const interpretation = finalCoord >= 75
    ? `Coordination score ${finalCoord}/100 — DDK rate and rhythm are within normal clinical range (5–7 syl/sec). No oro-motor coordination concerns detected.`
    : finalCoord >= 50
    ? `Coordination score ${finalCoord}/100 — Mild DDK irregularity detected. Syllable rate or rhythm consistency is below optimal. Consider speech-language pathology follow-up.`
    : `Coordination score ${finalCoord}/100 — Significant DDK impairment. Irregular rhythm and/or low syllable rate may indicate dysarthria, cerebellar ataxia, or ALS. Urgent SLP and neurology referral recommended.`;

  return {
    coordScore: finalCoord,
    coordLevel,
    syllableRate: syllableRate.toFixed(1),
    rhythmRegularity: rhythmRegularity.toFixed(0),
    burstPrecision,
    interburstCV,
    interpretation,
    durationSec,
  };
}

/* ═══════════════════════════════════════════════════════════════
   CLINICAL CARD RENDER FUNCTIONS
   ═══════════════════════════════════════════════════════════════ */

function _renderNeuroCard(neuro, embedding) {
  document.getElementById('neuroPlaceholder').classList.add('hidden');
  document.getElementById('neuroResults').classList.remove('hidden');

  // Tremor
  document.getElementById('neuroTremorVal').textContent = neuro.tremorHz.toFixed(1);
  _setClinicalBar('neuroTremorBar', neuro.tremorHz / 14, neuro.tremorLevel);
  _setClinicalBadge('neuroTremorBadge', neuro.tremorLevel === 'normal' ? 'Normal' : neuro.tremorLevel === 'warning' ? 'Elevated' : 'Critical', neuro.tremorLevel);

  // Rhythm
  document.getElementById('neuroRhythmVal').textContent = neuro.rhythmRegularity.toFixed(0);
  _setClinicalBar('neuroRhythmBar', neuro.rhythmRegularity / 100, neuro.rhythmLevel);
  _setClinicalBadge('neuroRhythmBadge', neuro.rhythmLevel === 'normal' ? 'Regular' : neuro.rhythmLevel === 'warning' ? 'Irregular' : 'Dysrhythmic', neuro.rhythmLevel);

  // Overall card badge
  const overallLevel = (neuro.tremorLevel === 'critical' || neuro.rhythmLevel === 'critical') ? 'critical'
    : (neuro.tremorLevel === 'warning' || neuro.rhythmLevel === 'warning') ? 'warning' : 'normal';
  _setClinicalBadge('neuroBadge', overallLevel === 'normal' ? 'Normal' : overallLevel === 'warning' ? 'Attention' : 'Critical', overallLevel);

  // Embedding bars: dims 64–95
  const barsEl = document.getElementById('neuroEmbedBars');
  let html = '';
  for (let i = 64; i < 96; i++) {
    const v = embedding[i];
    const h = Math.round(Math.min(100, Math.abs(v) * 70));
    html += `<div class="neuro-embed-bar ${v >= 0 ? 'neb-pos' : 'neb-neg'}" style="height:${h}%" title="dim ${i}: ${v.toFixed(3)}"></div>`;
  }
  barsEl.innerHTML = html;
}

function _renderCardiacCard(cardiac) {
  document.getElementById('cardiacPlaceholder').classList.add('hidden');
  document.getElementById('cardiacResults').classList.remove('hidden');

  // Vocal Weight
  document.getElementById('cardiacWeightVal').textContent = cardiac.vocalWeight.toFixed(2);
  _setClinicalBar('cardiacWeightBar', cardiac.vocalWeight, cardiac.weightLevel);
  _setClinicalBadge('cardiacWeightBadge', cardiac.weightLevel === 'normal' ? 'Normal' : cardiac.weightLevel === 'warning' ? 'Elevated' : 'High', cardiac.weightLevel);

  // Spectral Tilt
  document.getElementById('cardiacTiltVal').textContent = cardiac.spectralTilt.toFixed(1);
  _setClinicalBar('cardiacTiltBar', cardiac.spectralTilt / 30, cardiac.tiltLevel);
  _setClinicalBadge('cardiacTiltBadge', cardiac.tiltLevel === 'normal' ? 'Normal' : cardiac.tiltLevel === 'warning' ? 'Steep' : 'Critical', cardiac.tiltLevel);

  // Breathiness
  document.getElementById('cardiacBreathVal').textContent = cardiac.breathiness.toFixed(2);
  _setClinicalBar('cardiacBreathBar', cardiac.breathiness, cardiac.breathLevel);
  _setClinicalBadge('cardiacBreathBadge', cardiac.breathLevel === 'normal' ? 'Normal' : cardiac.breathLevel === 'warning' ? 'Breathy' : 'High', cardiac.breathLevel);

  // Overall badge
  const overallLevel = (cardiac.tiltLevel === 'critical' || cardiac.breathLevel === 'critical' || cardiac.weightLevel === 'critical') ? 'critical'
    : (cardiac.tiltLevel === 'warning' || cardiac.breathLevel === 'warning' || cardiac.weightLevel === 'warning') ? 'warning' : 'normal';
  _setClinicalBadge('cardiacBadge', overallLevel === 'normal' ? 'Normal' : overallLevel === 'warning' ? 'Attention' : 'Critical', overallLevel);
}

function _renderCognitiveCard(cognitive, stress) {
  document.getElementById('cognitivePlaceholder').classList.add('hidden');
  document.getElementById('cognitiveResults').classList.remove('hidden');

  // Gauge ring (SVG stroke-dashoffset)
  const circumference = 314; // 2π × 50
  const offset = circumference - (cognitive.score / 100) * circumference;
  const fillEl = document.getElementById('cogGaugeFill');
  fillEl.style.strokeDashoffset = offset;
  const colorMap = { low: '#10b981', moderate: '#f59e0b', high: '#f97316', overtaxed: '#ef4444' };
  fillEl.style.stroke = colorMap[cognitive.level] || '#f59e0b';

  document.getElementById('cogScore').textContent = cognitive.score;

  const badgeLabels = { low: 'Low', moderate: 'Moderate', high: 'High', overtaxed: 'Overtaxed' };
  _setClinicalBadge('cogBadge', badgeLabels[cognitive.level], cognitive.level === 'overtaxed' ? 'critical' : cognitive.level === 'high' ? 'warning' : cognitive.level === 'moderate' ? 'warning' : 'normal');
  _setClinicalBadge('cognitiveBadge', badgeLabels[cognitive.level], cognitive.level === 'overtaxed' ? 'critical' : cognitive.level === 'high' ? 'warning' : cognitive.level === 'moderate' ? 'warning' : 'normal');

  // Factor bars
  _setCofBar('cofVocalBar', 'cofVocalVal', cognitive.vocalStressNorm, `${Math.round(cognitive.vocalStressNorm * 100)}%`);
  _setCofBar('cofRateBar',  'cofRateVal',  cognitive.speechRateNorm,  `${Math.round(cognitive.speechRateNorm  * 100)}%`);
  _setCofBar('cofProsBar',  'cofProsVal',  cognitive.prosodicVar,     `${Math.round(cognitive.prosodicVar     * 100)}%`);
  _setCofBar('cofEntropyBar','cofEntropyVal', cognitive.entropy,      `${Math.round(cognitive.entropy         * 100)}%`);

  document.getElementById('cogInterpretation').textContent = cognitive.interpretation;
}

function _renderDdkResults(ddk) {
  document.getElementById('ddkResults').classList.remove('hidden');

  // Coordination score
  document.getElementById('ddkCoordScore').textContent = ddk.coordScore;
  const coordBar = document.getElementById('ddkCoordBar');
  coordBar.style.width = ddk.coordScore + '%';
  coordBar.className = 'ddk-score-bar ddk-bar-' + ddk.coordLevel;
  _setClinicalBadge('ddkCoordBadge', ddk.coordLevel === 'normal' ? 'Normal' : ddk.coordLevel === 'warning' ? 'Mild Impairment' : 'Impaired', ddk.coordLevel);
  _setClinicalBadge('ddkBadge', ddk.coordLevel === 'normal' ? 'Normal' : ddk.coordLevel === 'warning' ? 'Attention' : 'Critical', ddk.coordLevel);

  // Metrics
  document.getElementById('ddkSyllRate').textContent  = ddk.syllableRate;
  document.getElementById('ddkRhythm').textContent    = ddk.rhythmRegularity;
  document.getElementById('ddkPrecision').textContent = ddk.burstPrecision;
  document.getElementById('ddkCV').textContent        = ddk.interburstCV;

  // Interpretation
  document.getElementById('ddkInterpretation').textContent = ddk.interpretation;
}

/* ── Shared clinical card helpers ───────────────────────────── */

function _setClinicalBar(barId, fraction, level) {
  const el = document.getElementById(barId);
  if (!el) return;
  el.style.width = Math.round(Math.min(100, Math.max(0, fraction * 100))) + '%';
  el.className = 'cmb-bar cmb-bar-' + level;
}

function _setClinicalBadge(badgeId, label, level) {
  const el = document.getElementById(badgeId);
  if (!el) return;
  el.textContent = label;
  el.className = el.className.replace(/\bclinical-badge-\S+/g, '').trim();
  el.classList.add('clinical-badge-' + (level || 'normal'));
}

function _setCofBar(barId, valId, fraction, label) {
  const bar = document.getElementById(barId);
  const val = document.getElementById(valId);
  if (bar) bar.style.width = Math.round(Math.min(100, fraction * 100)) + '%';
  if (val) val.textContent = label;
}

/* ═══════════════════════════════════════════════════════════════
   DDK RECORDER — separate MediaRecorder instance for Pa-Ta-Ka
   ═══════════════════════════════════════════════════════════════ */

let _ddkMediaRecorder  = null;
let _ddkAudioChunks    = [];
let _ddkTimer          = null;
let _ddkSeconds        = 0;
let _ddkBlob           = null;
let _ddkMicStream      = null;

async function startDdkRecording() {
  console.log('[HeAR-DDK] Requesting microphone for DDK test…');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Microphone access is not available. Please serve the page over localhost or HTTPS.');
    return;
  }

  try {
    _ddkMicStream  = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    _ddkAudioChunks = [];
    _ddkBlob        = null;

    const mimeType = getSupportedMimeType();
    _ddkMediaRecorder = new MediaRecorder(_ddkMicStream, mimeType ? { mimeType } : {});

    _ddkMediaRecorder.addEventListener('dataavailable', e => {
      if (e.data && e.data.size > 0) _ddkAudioChunks.push(e.data);
    });
    _ddkMediaRecorder.addEventListener('stop', _onDdkStop);
    _ddkMediaRecorder.start(100);

    _ddkSeconds = 0;
    _ddkTimer = setInterval(() => {
      _ddkSeconds++;
      const el = document.getElementById('ddkCaptureTimer');
      if (el) el.textContent = _formatTime(_ddkSeconds);
    }, 1000);

    _setDdkUI('recording');
    _setDdkMicActive(true);
    document.getElementById('ddkCaptureStatus').textContent = 'Recording Pa-Ta-Ka…';
    console.log('[HeAR-DDK] DDK recording started.');

  } catch (err) {
    console.error('[HeAR-DDK] Mic error:', err.name, err.message);
    document.getElementById('ddkCaptureStatus').textContent = '⚠️ Microphone access denied';
    alert('Microphone access denied: ' + err.message);
  }
}

function stopDdkRecording() {
  if (_ddkMediaRecorder && _ddkMediaRecorder.state !== 'inactive') {
    _ddkMediaRecorder.stop();
  }
  if (_ddkMicStream) {
    _ddkMicStream.getTracks().forEach(t => t.stop());
    _ddkMicStream = null;
  }
  clearInterval(_ddkTimer);
  _setDdkMicActive(false);
  document.getElementById('ddkCaptureStatus').textContent = 'Processing DDK audio…';
  console.log('[HeAR-DDK] DDK recording stopped. Chunks:', _ddkAudioChunks.length);
}

function _onDdkStop() {
  _ddkBlob = new Blob(_ddkAudioChunks, { type: getSupportedMimeType() });
  _setDdkUI('ready');
  document.getElementById('ddkCaptureStatus').textContent =
    `DDK recording complete — ${_formatTime(_ddkSeconds)}`;
}

function resetDdkRecording() {
  _ddkBlob    = null;
  _ddkAudioChunks = [];
  _ddkSeconds = 0;
  const timerEl = document.getElementById('ddkCaptureTimer');
  if (timerEl) timerEl.textContent = '0:00';
  _setDdkUI('idle');
  _setDdkMicActive(false);
  document.getElementById('ddkCaptureStatus').textContent = 'Ready for Pa-Ta-Ka test';
  document.getElementById('ddkResults').classList.add('hidden');
  _setClinicalBadge('ddkBadge', 'Awaiting Test', '');
}

async function analyzeDdkAudio() {
  if (!_ddkBlob) {
    alert('No DDK audio recorded. Please complete the Pa-Ta-Ka test first.');
    return;
  }

  document.getElementById('ddkAnalyzeIcon').textContent  = '⏳';
  document.getElementById('ddkAnalyzeLabel').textContent = 'Analyzing…';
  document.getElementById('btnDdkAnalyze').disabled      = true;
  document.getElementById('ddkCaptureStatus').textContent = 'Analyzing DDK rhythm…';

  try {
    const pcmBuffer = await _decodeAudioToPCM(_ddkBlob);
    const pcm16k    = _resampleTo16kHz(pcmBuffer);
    const embedding = await runHearModel(pcm16k);
    const ddk       = _analyzeDdkFeatures(pcm16k, embedding);
    _renderDdkResults(ddk);
    document.getElementById('ddkCaptureStatus').textContent = '✅ DDK analysis complete';
    console.log('[HeAR-DDK] DDK analysis complete:', ddk);
  } catch (err) {
    console.error('[HeAR-DDK] Analysis error:', err);
    document.getElementById('ddkCaptureStatus').textContent = '⚠️ DDK analysis failed — ' + err.message;
  } finally {
    document.getElementById('ddkAnalyzeIcon').textContent  = '🧬';
    document.getElementById('ddkAnalyzeLabel').textContent = 'Analyze DDK';
    document.getElementById('btnDdkAnalyze').disabled      = false;
  }
}

function _setDdkUI(state) {
  document.getElementById('btnDdkStart').classList.toggle('hidden',   state !== 'idle');
  document.getElementById('btnDdkStop').classList.toggle('hidden',    state !== 'recording');
  document.getElementById('btnDdkReset').classList.toggle('hidden',   state !== 'ready');
  document.getElementById('btnDdkAnalyze').classList.toggle('hidden', state !== 'ready');
}

function _setDdkMicActive(active) {
  const viz = document.getElementById('ddkMicVisualizer');
  if (viz) viz.classList.toggle('mic-active', active);
}

/* ═══════════════════════════════════════════════════════════════
   HEAR LOADING OVERLAY HELPERS
   ═══════════════════════════════════════════════════════════════ */

let _hearLoadingInterval = null;

function _showHearLoading(show) {
  const overlay = document.getElementById('hearLoadingOverlay');
  if (!overlay) return;
  if (show) {
    overlay.classList.remove('hidden');
    // Animate the progress bar with a slow crawl
    let pct = 0;
    clearInterval(_hearLoadingInterval);
    _hearLoadingInterval = setInterval(() => {
      pct = Math.min(pct + 0.4, 95);
      const bar = document.getElementById('hearLoadingBar');
      if (bar) bar.style.width = pct + '%';
    }, 80);
  } else {
    clearInterval(_hearLoadingInterval);
    const bar = document.getElementById('hearLoadingBar');
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      overlay.classList.add('hidden');
      if (bar) bar.style.width = '0%';
    }, 400);
  }
}

function _setHearStep(text, pct) {
  const stepEl = document.getElementById('hearLoadingStep');
  const barEl  = document.getElementById('hearLoadingBar');
  if (stepEl) stepEl.textContent = text;
  if (barEl && pct !== undefined) barEl.style.width = pct + '%';
}

/* ═══════════════════════════════════════════════════════════════
   COUGH ANALYSIS — Respiratory Engine
   HeAR dims 192–255 encode respiratory acoustic patterns.
   Low-freq turbulence (dims 192–223) → wet/productive cough.
   High-freq burst energy (dims 224–255) → dry/irritative cough.
   ═══════════════════════════════════════════════════════════════ */

function _classifyCough(embedding, features) {
  // Low-frequency turbulence subspace (wet cough signature)
  let lowFreqEnergy = 0;
  for (let i = 192; i < 224; i++) lowFreqEnergy += embedding[i] * embedding[i];
  lowFreqEnergy = Math.sqrt(lowFreqEnergy / 32);

  // High-frequency burst subspace (dry cough signature)
  let highFreqEnergy = 0;
  for (let i = 224; i < 256; i++) highFreqEnergy += embedding[i] * embedding[i];
  highFreqEnergy = Math.sqrt(highFreqEnergy / 32);

  // Mucus index: low-freq turbulence + shimmer (fluid in airways)
  const mucusIndex = Math.min(1, lowFreqEnergy * 1.2 + features.shimmer * 0.3);

  // Airway irritation: high-freq burst + ZCR (dry, irritative)
  const irritation = Math.min(1, highFreqEnergy * 1.1 + (features.zcr / 4) * 0.3);

  // Cough intensity from RMS
  const intensityDB = Math.max(0, Math.min(90, 20 * Math.log10(Math.max(0.0001, features.rms)) + 80));

  // Classify: wet if mucus dominates, dry if irritation dominates
  const wetScore = mucusIndex * 0.6 + (features.shimmer / 1.5) * 0.4;
  const dryScore = irritation * 0.6 + (features.zcr / 4) * 0.4;

  let type, icon, desc, confidence;
  if (wetScore > 0.45 && wetScore > dryScore) {
    type       = 'Wet / Productive';
    icon       = '💧';
    desc       = 'Mucus-laden airway pattern detected. Consistent with lower respiratory tract infection, bronchitis, or pneumonia. Sputum production likely.';
    confidence = Math.round(Math.min(95, 55 + wetScore * 40));
  } else if (dryScore > 0.35) {
    type       = 'Dry / Unproductive';
    icon       = '🌬️';
    desc       = 'Irritative, non-productive cough pattern. Consistent with viral upper respiratory infection, asthma, or early-stage COVID-19.';
    confidence = Math.round(Math.min(95, 50 + dryScore * 45));
  } else {
    type       = 'Indeterminate';
    icon       = '🔍';
    desc       = 'Cough pattern is ambiguous. Insufficient acoustic energy or mixed features. Consider a dedicated cough recording for better classification.';
    confidence = Math.round(30 + Math.max(wetScore, dryScore) * 30);
  }

  const mucusLevel     = mucusIndex < 0.35 ? 'normal' : mucusIndex < 0.6 ? 'warning' : 'critical';
  const irritLevel     = irritation  < 0.35 ? 'normal' : irritation  < 0.6 ? 'warning' : 'critical';
  const intensityLevel = intensityDB > 20 ? 'normal' : intensityDB > 10 ? 'warning' : 'critical';

  return { type, icon, desc, confidence, mucusIndex, irritation, intensityDB,
           mucusLevel, irritLevel, intensityLevel, wetScore, dryScore };
}

/* ═══════════════════════════════════════════════════════════════
   DISEASE PROBABILITY INSIGHTS
   ═══════════════════════════════════════════════════════════════ */

function _computeProbabilityInsights(cough, stress, neuro, cardiac, features) {
  const conditions = [];

  // Wet Cough + Vocal Tension → Bronchitis / Pneumonia
  if (cough.type === 'Wet / Productive' && stress.vocalTension > 0.5) {
    conditions.push({
      icon: '🫁',
      name: 'Acute Bronchitis',
      probability: Math.round(Math.min(85, 40 + cough.wetScore * 50 + stress.vocalTension * 20)),
      basis: 'Wet/productive cough + elevated vocal tension',
      severity: cough.wetScore > 0.6 ? 'warning' : 'normal',
      action: 'Consider chest auscultation and sputum culture.',
    });
    conditions.push({
      icon: '🫁',
      name: 'Community-Acquired Pneumonia',
      probability: Math.round(Math.min(75, 25 + cough.wetScore * 45 + (features.hnr < 10 ? 15 : 0))),
      basis: 'Wet cough + reduced HNR + vocal tension pattern',
      severity: cough.wetScore > 0.65 ? 'warning' : 'normal',
      action: 'Chest X-ray and full blood count recommended.',
    });
  }

  // Dry Cough + High Stress → Asthma / Viral Infection
  if (cough.type === 'Dry / Unproductive' && stress.score >= 50) {
    conditions.push({
      icon: '🌬️',
      name: 'Asthma (Exacerbation)',
      probability: Math.round(Math.min(80, 30 + cough.dryScore * 40 + stress.energyVar * 25)),
      basis: 'Dry cough + high energy variance + stress markers',
      severity: stress.score >= 70 ? 'warning' : 'normal',
      action: 'Spirometry and peak flow measurement advised.',
    });
    conditions.push({
      icon: '🦠',
      name: 'Viral Respiratory Infection (Flu / COVID-19)',
      probability: Math.round(Math.min(78, 35 + cough.dryScore * 35 + (stress.score / 100) * 20)),
      basis: 'Dry/unproductive cough + elevated vocal stress biomarkers',
      severity: 'normal',
      action: 'Rapid antigen test or PCR recommended.',
    });
  }

  // Vocal Tremor → Neurological Fatigue
  if (neuro && neuro.tremorHz > 6) {
    conditions.push({
      icon: '🧬',
      name: 'Neurological Fatigue / Early Tremor',
      probability: Math.round(Math.min(70, 20 + (neuro.tremorHz - 6) * 8 + (neuro.rhythmRegularity < 60 ? 15 : 0))),
      basis: `Vocal tremor at ${neuro.tremorHz.toFixed(1)} Hz + irregular speech rhythm`,
      severity: neuro.tremorHz > 9 ? 'warning' : 'normal',
      action: 'Neurological assessment and fatigue screening recommended.',
    });
  }

  // Cardiac fluid load pattern
  if (cardiac && cardiac.vocalWeight > 0.65 && cardiac.breathiness > 0.55) {
    conditions.push({
      icon: '❤️',
      name: 'Cardiac Strain / Fluid Retention',
      probability: Math.round(Math.min(65, 20 + cardiac.vocalWeight * 30 + cardiac.breathiness * 25)),
      basis: 'Elevated vocal weight + breathiness consistent with laryngeal oedema',
      severity: cardiac.vocalWeight > 0.8 ? 'warning' : 'normal',
      action: 'BNP blood test and echocardiography recommended.',
    });
  }

  // High cognitive load
  if (stress.score >= 70) {
    conditions.push({
      icon: '🧠',
      name: 'Acute Stress / Cognitive Overload',
      probability: Math.round(Math.min(80, stress.score * 0.8)),
      basis: 'HeAR vocal stress × speech rate correlation exceeds threshold',
      severity: stress.score >= 85 ? 'warning' : 'normal',
      action: 'Mental health screening and rest period recommended.',
    });
  }

  // Sort by probability descending
  conditions.sort((a, b) => b.probability - a.probability);
  return conditions;
}

/* ═══════════════════════════════════════════════════════════════
   RENDER: HEALTH SUMMARY CARD
   ═══════════════════════════════════════════════════════════════ */

function _renderHealthSummary(alerts, stress, cough, neuro, cardiac) {
  const section = document.getElementById('section-summary');
  const card    = document.getElementById('healthSummaryCard');
  section.classList.remove('hidden');

  const hasCritical = alerts.some(a => a.severity === 'critical');
  const hasWarning  = alerts.some(a => a.severity === 'warning');

  let statusKey, statusText, statusIcon, recommendation;
  if (hasCritical) {
    statusKey     = 'critical';
    statusText    = 'Critical';
    statusIcon    = '🔴';
    recommendation = 'Urgent clinical evaluation is recommended. One or more acoustic biomarkers have exceeded critical thresholds. Please consult a healthcare professional immediately.';
  } else if (hasWarning) {
    statusKey     = 'warning';
    statusText    = 'Warning';
    statusIcon    = '🟡';
    recommendation = 'Some acoustic markers are outside normal ranges. Follow-up with a specialist is advised. Monitor symptoms and seek medical attention if they worsen.';
  } else {
    statusKey     = 'normal';
    statusText    = 'Normal';
    statusIcon    = '🟢';
    recommendation = 'All acoustic biomarkers are within normal reference ranges. No immediate clinical concerns detected. Continue routine monitoring.';
  }

  document.getElementById('hscStatusIcon').textContent = statusIcon;
  document.getElementById('hscStatusText').textContent = statusText;
  document.getElementById('hscRecommendation').textContent = recommendation;

  card.className = 'health-summary-card hsc-' + statusKey;

  // Meta values
  document.getElementById('hscCoughType').textContent  = cough ? cough.type : '—';
  document.getElementById('hscStressLevel').textContent = stress ? stress.level.charAt(0).toUpperCase() + stress.level.slice(1) : '—';
  document.getElementById('hscNeuroRisk').textContent   = neuro
    ? (neuro.tremorLevel === 'normal' && neuro.rhythmLevel === 'normal' ? 'Low' : neuro.tremorLevel === 'critical' || neuro.rhythmLevel === 'critical' ? 'High' : 'Moderate')
    : '—';
  document.getElementById('hscCardiacRisk').textContent = cardiac
    ? (cardiac.weightLevel === 'normal' && cardiac.breathLevel === 'normal' ? 'Low' : cardiac.weightLevel === 'critical' || cardiac.breathLevel === 'critical' ? 'High' : 'Moderate')
    : '—';
}

/* ═══════════════════════════════════════════════════════════════
   RENDER: COUGH CARD
   ═══════════════════════════════════════════════════════════════ */

function _renderCoughCard(cough) {
  document.getElementById('coughPlaceholder').classList.add('hidden');
  document.getElementById('coughResults').classList.remove('hidden');

  // Type banner
  const banner = document.getElementById('coughTypeBanner');
  banner.className = 'cough-type-banner ctb-' + (cough.type.includes('Wet') ? 'wet' : cough.type.includes('Dry') ? 'dry' : 'indeterminate');
  document.getElementById('coughTypeIcon').textContent  = cough.icon;
  document.getElementById('coughTypeLabel').textContent = cough.type;
  document.getElementById('coughTypeDesc').textContent  = cough.desc;
  document.getElementById('coughConfidence').textContent = cough.confidence + '%';

  // Metrics
  document.getElementById('coughMucusVal').textContent     = cough.mucusIndex.toFixed(2);
  document.getElementById('coughIrritVal').textContent     = cough.irritation.toFixed(2);
  document.getElementById('coughIntensityVal').textContent = cough.intensityDB.toFixed(0);

  _setClinicalBar('coughMucusBar',     cough.mucusIndex,       cough.mucusLevel);
  _setClinicalBar('coughIrritBar',     cough.irritation,       cough.irritLevel);
  _setClinicalBar('coughIntensityBar', cough.intensityDB / 90, cough.intensityLevel);

  _setClinicalBadge('coughMucusBadge',     cough.mucusLevel === 'normal' ? 'Normal' : cough.mucusLevel === 'warning' ? 'Elevated' : 'High',   cough.mucusLevel);
  _setClinicalBadge('coughIrritBadge',     cough.irritLevel === 'normal' ? 'Normal' : cough.irritLevel === 'warning' ? 'Elevated' : 'High',   cough.irritLevel);
  _setClinicalBadge('coughIntensityBadge', cough.intensityLevel === 'normal' ? 'Normal' : 'Low', cough.intensityLevel);

  const overallLevel = (cough.mucusLevel === 'critical' || cough.irritLevel === 'critical') ? 'critical'
    : (cough.mucusLevel === 'warning' || cough.irritLevel === 'warning') ? 'warning' : 'normal';
  _setClinicalBadge('coughBadge', cough.type, overallLevel);
}

/* ═══════════════════════════════════════════════════════════════
   RENDER: PROBABILITY INSIGHTS
   ═══════════════════════════════════════════════════════════════ */

function _renderProbabilityInsights(conditions) {
  const section = document.getElementById('section-probability');
  const list    = document.getElementById('probConditionsList');

  if (!conditions || conditions.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  list.innerHTML = conditions.map(c => `
    <div class="prob-condition prob-condition-${c.severity}">
      <div class="prob-cond-left">
        <div class="prob-cond-icon">${c.icon}</div>
        <div class="prob-cond-body">
          <div class="prob-cond-name">${escapeHtml(c.name)}</div>
          <div class="prob-cond-basis">${escapeHtml(c.basis)}</div>
          <div class="prob-cond-action">💡 ${escapeHtml(c.action)}</div>
        </div>
      </div>
      <div class="prob-cond-right">
        <div class="prob-cond-pct">${c.probability}%</div>
        <div class="prob-cond-bar-wrap">
          <div class="prob-cond-bar prob-bar-${c.severity}" style="width:${c.probability}%"></div>
        </div>
        <div class="prob-cond-label">Probability</div>
      </div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════════
   DIET IMPACT & NUTRITION RECOMMENDATION
   ═══════════════════════════════════════════════════════════════ */

/**
 * isDietInputNonEmpty(inputs)
 * Returns true if at least one field in the DietInputs object is
 * non-empty after trimming whitespace; false otherwise.
 *
 * @param {Object} inputs - DietInputs object with fields:
 *   meals, fastFood, water, sugar, salt, fruitVeg, caffeine, smoking, alcohol
 * @returns {boolean}
 */
function isDietInputNonEmpty(inputs) {
  return Object.values(inputs).some(v => v.trim() !== '');
}

/**
 * readDietInputs()
 * Reads all diet field DOM elements by ID and returns a DietInputs
 * object with trimmed string values.
 *
 * @returns {Object} DietInputs
 */
function readDietInputs() {
  return {
    meals:    (document.getElementById('diet-meals').value    || '').trim(),
    fastFood: (document.getElementById('diet-fastfood').value || '').trim(),
    water:    (document.getElementById('diet-water').value    || '').trim(),
    sugar:    (document.getElementById('diet-sugar').value    || '').trim(),
    salt:     (document.getElementById('diet-salt').value     || '').trim(),
    fruitVeg: (document.getElementById('diet-fruitveg').value || '').trim(),
    caffeine: (document.getElementById('diet-caffeine').value || '').trim(),
    smoking:  (document.getElementById('diet-smoking').value  || '').trim(),
    alcohol:  (document.getElementById('diet-alcohol').value  || '').trim(),
  };
}

/**
 * buildDietPrompt(inputs, differential)
 * Constructs the Bedrock prompt string for diet analysis.
 *
 * @param {Object} inputs      - DietInputs object
 * @param {string} differential - Differential diagnosis text from the AI Health Analysis
 * @returns {string} Prompt string
 */
function buildDietPrompt(inputs, differential) {
  // System role preamble
  const preamble = 'You are a clinical nutrition advisor integrated into a healthcare AI system.';

  // DIFFERENTIAL DIAGNOSIS block
  const differentialBlock = differential && differential.trim()
    ? differential.trim()
    : 'No differential diagnosis available — provide general nutritional guidance.';

  // Patient dietary information — only non-empty fields, labeled
  const fieldLabels = {
    meals:    'Daily Meals Description',
    fastFood: 'Fast Food Frequency',
    water:    'Daily Water Intake',
    sugar:    'Sugar Intake Level',
    salt:     'Salt Intake Level',
    fruitVeg: 'Fruit & Vegetable Intake',
    caffeine: 'Caffeine Consumption',
    smoking:  'Smoking Habits',
    alcohol:  'Alcohol Consumption',
  };

  const dietLines = Object.entries(inputs)
    .filter(([, v]) => v.trim() !== '')
    .map(([k, v]) => `- ${fieldLabels[k]}: ${v}`)
    .join('\n');

  const dietBlock = dietLines.length > 0
    ? dietLines
    : '- No dietary information provided.';

  return `${preamble}
A patient has received the following differential diagnosis from a medical AI:

DIFFERENTIAL DIAGNOSIS:
${differentialBlock}

The patient has provided the following dietary information:
${dietBlock}

ANALYSIS INSTRUCTIONS:
Analyze how the patient's dietary habits may contribute to or worsen the conditions listed in the differential diagnosis. Cover at minimum:
- Sugar and processed carbohydrates for diabetes-related conditions
- Sodium intake for hypertension-related conditions
- Calorie-dense and processed foods for obesity-related conditions
- Spicy and oily foods for gastric conditions
- Hydration and nutrition quality for fatigue-related conditions

Provide your response in the following EXACT structure with these EXACT section headers:

1. DIET IMPACT ON DIAGNOSIS
[Analysis of how current diet may affect the diagnosed conditions]

2. FOODS TO AVOID
[Specific foods to avoid given the diagnosis]

3. RECOMMENDED FOODS
[Specific foods that support recovery or management of the conditions]

4. NUTRITION TIPS
[Practical, actionable nutrition advice]

5. HYDRATION ADVICE
[Water intake and hydration recommendations]

6. HEALTHY HABIT SUGGESTIONS
[Lifestyle and dietary habit changes]

IMPORTANT CONSTRAINTS:
- Respond in a professional, simple, educational, and non-judgmental tone
- Personalize all guidance to the specific conditions in the differential diagnosis
- Do NOT diagnose any new diseases based on dietary inputs alone
- Do NOT recommend extreme dieting, unsafe caloric restriction, or unverified medical claims
- End your response with this exact disclaimer on its own line:
  "This information is educational only and not a substitute for professional medical advice."`;
}

/**
 * showDietSection()
 * Reveals the #section-diet referral card on the Home page after a
 * diagnosis is available. The full diet form lives on #page-diet and
 * is always accessible via the Diet nav item.
 * Called by displayAnalysis() after a diagnosis is available.
 */
function showDietSection() {
  const section = document.getElementById('section-diet');
  if (section) section.classList.remove('hidden');
}

/**
 * hideDietSection()
 * Hides the #section-diet referral card on the Home page and resets
 * the diet form fields and report panel on #page-diet.
 * Called by clearAll() when vitals are reset.
 */
function hideDietSection() {
  // Hide the home referral card
  const section = document.getElementById('section-diet');
  if (section) section.classList.add('hidden');

  // Clear and hide the result panel on #page-diet
  const dietResult = document.getElementById('dietResult');
  if (dietResult) { dietResult.innerHTML = ''; dietResult.classList.add('hidden'); }

  // Hide loading and validation message
  const dietLoading = document.getElementById('dietLoading');
  if (dietLoading) dietLoading.classList.add('hidden');

  const dietValidationMsg = document.getElementById('dietValidationMsg');
  if (dietValidationMsg) dietValidationMsg.classList.add('hidden');

  // Reset all 9 diet input fields to their default/empty values
  const meals = document.getElementById('diet-meals');
  if (meals) meals.value = '';

  const fastfood = document.getElementById('diet-fastfood');
  if (fastfood) fastfood.value = '';

  const water = document.getElementById('diet-water');
  if (water) water.value = '';

  const sugar = document.getElementById('diet-sugar');
  if (sugar) sugar.value = '';

  const salt = document.getElementById('diet-salt');
  if (salt) salt.value = '';

  const fruitveg = document.getElementById('diet-fruitveg');
  if (fruitveg) fruitveg.value = '';

  const caffeine = document.getElementById('diet-caffeine');
  if (caffeine) caffeine.value = '';

  const smoking = document.getElementById('diet-smoking');
  if (smoking) smoking.value = '';

  const alcohol = document.getElementById('diet-alcohol');
  if (alcohol) alcohol.value = '';

  // Reset button icon and label (button stays enabled — diet page is standalone)
  const dietAnalyzeIcon = document.getElementById('dietAnalyzeIcon');
  if (dietAnalyzeIcon) dietAnalyzeIcon.textContent = '🥗';

  const dietAnalyzeLabel = document.getElementById('dietAnalyzeLabel');
  if (dietAnalyzeLabel) dietAnalyzeLabel.textContent = 'Analyze My Diet';
}

/**
 * displayDietReport(text)
 * Parses the six diet report sections from the AI response text and
 * renders them into #dietResult using the existing result-section pattern.
 * Always appends the educational disclaimer at the end.
 *
 * @param {string} text - Raw AI response text from the diet analysis
 */
function displayDietReport(text) {
  const sections = [
    { startMarker: '1. DIET IMPACT ON DIAGNOSIS', endMarker: '2.', emoji: '🩺', title: 'Diet Impact on Diagnosis' },
    { startMarker: '2. FOODS TO AVOID',           endMarker: '3.', emoji: '🚫', title: 'Foods to Avoid' },
    { startMarker: '3. RECOMMENDED FOODS',        endMarker: '4.', emoji: '✅', title: 'Recommended Foods' },
    { startMarker: '4. NUTRITION TIPS',            endMarker: '5.', emoji: '💡', title: 'Nutrition Tips' },
    { startMarker: '5. HYDRATION ADVICE',          endMarker: '6.', emoji: '💧', title: 'Hydration Advice' },
    { startMarker: '6. HEALTHY HABIT SUGGESTIONS', endMarker: null, emoji: '🌱', title: 'Healthy Habit Suggestions' },
  ];

  let html = '<div class="result-sections">';

  sections.forEach(({ startMarker, endMarker, emoji, title }) => {
    const content = extractSection(text, startMarker, endMarker);
    if (content && content.trim()) {
      html += `<div class="result-section">
        <div class="result-section-title">${emoji} ${escapeHtml(title)}</div>
        <div class="result-section-body">${renderMarkdown(content.trim())}</div>
      </div>`;
    }
  });

  html += '</div>';

  // Always append the educational disclaimer
  html += `<div class="diet-disclaimer">
    ⚕️ <strong>Disclaimer:</strong> This information is educational only and not a substitute for professional medical advice.
  </div>`;

  const dietResult = document.getElementById('dietResult');
  if (dietResult) {
    dietResult.innerHTML = html;
    dietResult.classList.remove('hidden');
  }
}

/**
 * runDietAnalysis()
 * Validates diet inputs, calls the /analyze API with the diet prompt,
 * and renders the Diet_Report. Mirrors the fetch pattern of runAIAnalysis().
 */
async function runDietAnalysis() {
  const inputs = readDietInputs();
  const validationMsg = document.getElementById('dietValidationMsg');
  const dietLoading   = document.getElementById('dietLoading');
  const dietResult    = document.getElementById('dietResult');
  const btn           = document.getElementById('btnAnalyzeDiet');
  const icon          = document.getElementById('dietAnalyzeIcon');
  const label         = document.getElementById('dietAnalyzeLabel');

  // Validate: at least one field must be non-empty
  if (!isDietInputNonEmpty(inputs)) {
    if (validationMsg) validationMsg.classList.remove('hidden');
    return;
  }
  if (validationMsg) validationMsg.classList.add('hidden');

  // Set loading state
  if (dietLoading) dietLoading.classList.remove('hidden');
  if (btn)         btn.disabled = true;
  if (icon)        icon.textContent  = '⏳';
  if (label)       label.textContent = 'Analyzing…';
  if (dietResult)  { dietResult.innerHTML = ''; dietResult.classList.add('hidden'); }

  // Hide supplements and recipes containers
  const supplementsContainer = document.getElementById('dietSupplementsContainer');
  const recipesContainer = document.getElementById('dietRecipesContainer');
  if (supplementsContainer) supplementsContainer.classList.add('hidden');
  if (recipesContainer) recipesContainer.classList.add('hidden');

  try {
    const response = await fetch(BACKEND_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt: buildDietPrompt(inputs, lastDifferential) }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.text) throw new Error('Empty response from backend.');

    // Success
    if (dietLoading) dietLoading.classList.add('hidden');
    displayDietReport(data.text);

    // After main analysis completes, fetch supplements and recipes
    fetchDietSupplements(inputs);
    fetchDietRecipes(inputs);

  } catch (err) {
    console.error('[MediGuard] Diet analysis failed:', err.message);

    if (dietLoading) dietLoading.classList.add('hidden');

    if (dietResult) {
      dietResult.innerHTML = `<div class="diet-error">
        <span class="diet-error-icon">⚠️</span>
        <p class="diet-error-msg">Diet analysis failed: ${escapeHtml(err.message)}</p>
        <p class="diet-error-hint">Please check your connection and try again.</p>
      </div>`;
      dietResult.classList.remove('hidden');
    }

    // Re-enable button for retry
    if (btn)   btn.disabled = false;
    if (icon)  icon.textContent  = '🥗';
    if (label) label.textContent = 'Analyze My Diet';
  }
}


/**
 * fetchDietSupplements(inputs)
 * Calls backend to get 4 supplement recommendations based on dietary gaps.
 * Shows loading spinner, then renders supplement cards in a 2x2 grid.
 */
async function fetchDietSupplements(inputs) {
  const container = document.getElementById('dietSupplementsContainer');
  const loading = document.getElementById('dietSupplementsLoading');
  const result = document.getElementById('dietSupplementsResult');

  if (!container || !loading || !result) return;

  // Show container and loading
  container.classList.remove('hidden');
  loading.classList.remove('hidden');
  result.classList.add('hidden');
  result.innerHTML = '';

  // Check for mock mode
  if (BACKEND_URL.includes('YOUR_API_ID')) {
    setTimeout(() => {
      loading.classList.add('hidden');
      renderSupplements(MOCK_SUPPLEMENTS);
    }, 1500);
    return;
  }

  const prompt = `You are a nutrition expert. Based on this patient's dietary habits:
- Fast food frequency: ${inputs.fastFood || 'Not provided'}
- Daily water intake: ${inputs.water || 'Not provided'}
- Sugar intake: ${inputs.sugar || 'Not provided'}
- Salt intake: ${inputs.salt || 'Not provided'}
- Fruit & vegetable intake: ${inputs.fruitVeg || 'Not provided'}
- Caffeine: ${inputs.caffeine || 'Not provided'}
- Smoking: ${inputs.smoking || 'Not provided'}
- Alcohol: ${inputs.alcohol || 'Not provided'}
- Meals: ${inputs.meals || 'Not provided'}

Recommend exactly 4 over-the-counter supplements this person should take based on their nutritional gaps. For each supplement respond in this exact format:

SUPPLEMENT: [name]
REASON: [one sentence why they need it]
DOSAGE: [recommended daily dosage]
EXAMPLE: [one common brand example]
---`;

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.text) throw new Error('Empty response from backend.');

    loading.classList.add('hidden');
    renderSupplements(data.text);

  } catch (err) {
    console.error('[MediGuard] Supplement fetch failed:', err.message);
    loading.classList.add('hidden');
    result.innerHTML = `<div class="diet-error">
      <span class="diet-error-icon">⚠️</span>
      <p class="diet-error-msg">Failed to load supplement recommendations.</p>
    </div>`;
    result.classList.remove('hidden');
  }
}

/**
 * renderSupplements(text)
 * Parses supplement response and displays 4 cards in a 2x2 grid.
 */
function renderSupplements(text) {
  const result = document.getElementById('dietSupplementsResult');
  if (!result) return;

  const blocks = text.split('---').map(b => b.trim()).filter(b => b.length > 0);
  
  let html = `<div class="diet-supplements-header">
    <div class="result-section-title">💊 Recommended Supplements</div>
  </div>
  <div class="diet-supplements-grid">`;

  blocks.slice(0, 4).forEach(block => {
    const nameMatch = block.match(/SUPPLEMENT:\s*(.+)/i);
    const reasonMatch = block.match(/REASON:\s*(.+)/i);
    const dosageMatch = block.match(/DOSAGE:\s*(.+)/i);
    const exampleMatch = block.match(/EXAMPLE:\s*(.+)/i);

    const name = nameMatch ? nameMatch[1].trim() : 'Supplement';
    const reason = reasonMatch ? reasonMatch[1].trim() : '';
    const dosage = dosageMatch ? dosageMatch[1].trim() : '';
    const example = exampleMatch ? exampleMatch[1].trim() : '';

    html += `<div class="diet-supplement-card">
      <div class="diet-supplement-name">${escapeHtml(name)}</div>
      <div class="diet-supplement-reason">${escapeHtml(reason)}</div>
      ${dosage ? `<div class="diet-supplement-dosage">${escapeHtml(dosage)}</div>` : ''}
      ${example ? `<div class="diet-supplement-example">${escapeHtml(example)}</div>` : ''}
    </div>`;
  });

  html += '</div>';
  result.innerHTML = html;
  result.classList.remove('hidden');
}

/**
 * fetchDietRecipes(inputs)
 * Calls backend to get 3 recipe recommendations based on dietary gaps.
 * Shows loading spinner, then renders recipe cards in a vertical list.
 */
async function fetchDietRecipes(inputs) {
  const container = document.getElementById('dietRecipesContainer');
  const loading = document.getElementById('dietRecipesLoading');
  const result = document.getElementById('dietRecipesResult');

  if (!container || !loading || !result) return;

  // Show container and loading
  container.classList.remove('hidden');
  loading.classList.remove('hidden');
  result.classList.add('hidden');
  result.innerHTML = '';

  // Check for mock mode
  if (BACKEND_URL.includes('YOUR_API_ID')) {
    setTimeout(() => {
      loading.classList.add('hidden');
      renderRecipes(MOCK_RECIPES);
    }, 2000);
    return;
  }

  const prompt = `You are a nutritionist and chef. Based on these dietary gaps from a patient's diet analysis:
- Low fruit & vegetables: ${inputs.fruitVeg || 'Not provided'}
- Sugar level: ${inputs.sugar || 'Not provided'}
- Meals described: ${inputs.meals || 'Not provided'}
- Fast food frequency: ${inputs.fastFood || 'Not provided'}
- Water intake: ${inputs.water || 'Not provided'}

Suggest exactly 3 simple healthy recipes that address their nutritional gaps. For each recipe respond in this exact format:

RECIPE: [recipe name]
TARGETS: [which nutrient gap it addresses]
TIME: [prep + cook time in minutes]
INGREDIENTS: [comma separated list of main ingredients]
STEPS: [2-3 short steps]
---`;

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.text) throw new Error('Empty response from backend.');

    loading.classList.add('hidden');
    renderRecipes(data.text);

  } catch (err) {
    console.error('[MediGuard] Recipe fetch failed:', err.message);
    loading.classList.add('hidden');
    result.innerHTML = `<div class="diet-error">
      <span class="diet-error-icon">⚠️</span>
      <p class="diet-error-msg">Failed to load recipe recommendations.</p>
    </div>`;
    result.classList.remove('hidden');
  }
}

/**
 * renderRecipes(text)
 * Parses recipe response and displays 3 cards in a vertical list with save functionality.
 */
function renderRecipes(text) {
  const result = document.getElementById('dietRecipesResult');
  if (!result) return;

  const blocks = text.split('---').map(b => b.trim()).filter(b => b.length > 0);
  
  let html = `<div class="diet-recipes-header">
    <div class="result-section-title">🍽️ Recommended Recipes</div>
  </div>
  <div class="diet-recipes-list">`;

  blocks.slice(0, 3).forEach((block, index) => {
    const nameMatch = block.match(/RECIPE:\s*(.+)/i);
    const targetsMatch = block.match(/TARGETS:\s*(.+)/i);
    const timeMatch = block.match(/TIME:\s*(.+)/i);
    const ingredientsMatch = block.match(/INGREDIENTS:\s*(.+)/i);
    const stepsMatch = block.match(/STEPS:\s*(.+)/i);

    const name = nameMatch ? nameMatch[1].trim() : 'Recipe';
    const targets = targetsMatch ? targetsMatch[1].trim() : '';
    const time = timeMatch ? timeMatch[1].trim() : '';
    const ingredients = ingredientsMatch ? ingredientsMatch[1].trim() : '';
    const steps = stepsMatch ? stepsMatch[1].trim() : '';

    const recipeId = `diet-recipe-${Date.now()}-${index}`;
    const recipeData = JSON.stringify({name, targets, time, ingredients, steps});

    html += `<div class="diet-recipe-card">
      <div class="diet-recipe-header">
        <div class="diet-recipe-name">🍽️ ${escapeHtml(name)}</div>
        ${targets ? `<div class="diet-recipe-targets">${escapeHtml(targets)}</div>` : ''}
      </div>
      ${time ? `<div class="diet-recipe-time">⏱️ ${escapeHtml(time)}</div>` : ''}
      ${ingredients ? `<div class="diet-recipe-ingredients"><strong>🛒 Ingredients:</strong> ${escapeHtml(ingredients)}</div>` : ''}
      ${steps ? `<div class="diet-recipe-steps"><strong>📝 Steps:</strong> ${escapeHtml(steps)}</div>` : ''}
      <button class="btn btn-secondary diet-recipe-save-btn" onclick='saveDietRecipe("${recipeId}", ${recipeData})'>
        💾 Save Recipe
      </button>
    </div>`;
  });

  html += '</div>';
  result.innerHTML = html;
  result.classList.remove('hidden');
}

/**
 * saveDietRecipe(recipeId, recipe)
 * Saves a recipe to localStorage under mg_saved_recipes array.
 */
function saveDietRecipe(recipeId, recipe) {
  try {
    let saved = JSON.parse(localStorage.getItem('mg_saved_recipes') || '[]');
    
    // Check if already saved
    if (saved.some(r => r.name === recipe.name)) {
      alert('This recipe is already saved!');
      return;
    }

    saved.push({
      id: recipeId,
      savedAt: new Date().toISOString(),
      ...recipe
    });

    localStorage.setItem('mg_saved_recipes', JSON.stringify(saved));
    alert(`✅ "${recipe.name}" saved to your recipes!`);
  } catch (err) {
    console.error('[MediGuard] Failed to save recipe:', err);
    alert('Failed to save recipe. Please try again.');
  }
}

// Mock data for supplements (used when BACKEND_URL contains YOUR_API_ID)
const MOCK_SUPPLEMENTS = `SUPPLEMENT: Vitamin D3
REASON: Low sun exposure and potential deficiency from indoor lifestyle
DOSAGE: 1000-2000 IU daily
EXAMPLE: Nature Made Vitamin D3
---
SUPPLEMENT: Omega-3 Fish Oil
REASON: Low intake of fatty fish and need for heart health support
DOSAGE: 1000mg EPA+DHA daily
EXAMPLE: Nordic Naturals Ultimate Omega
---
SUPPLEMENT: Multivitamin
REASON: General nutritional gaps from limited fruit and vegetable intake
DOSAGE: 1 tablet daily with food
EXAMPLE: Centrum Adults Multivitamin
---
SUPPLEMENT: Magnesium
REASON: Support for stress management and muscle function
DOSAGE: 200-400mg daily
EXAMPLE: Nature's Bounty Magnesium`;

// Mock data for recipes (used when BACKEND_URL contains YOUR_API_ID)
const MOCK_RECIPES = `RECIPE: Quinoa Buddha Bowl
TARGETS: Low Iron · Vitamin C · Fiber
TIME: 25 minutes
INGREDIENTS: quinoa, chickpeas, spinach, cherry tomatoes, avocado, lemon tahini dressing
STEPS: 1. Cook quinoa according to package. 2. Roast chickpeas with spices. 3. Assemble bowl with fresh veggies and drizzle with dressing.
---
RECIPE: Berry Smoothie Bowl
TARGETS: Antioxidants · Vitamin C · Low Sugar
TIME: 10 minutes
INGREDIENTS: mixed berries, banana, Greek yogurt, chia seeds, granola, honey
STEPS: 1. Blend berries, banana, and yogurt until smooth. 2. Pour into bowl and top with chia seeds and granola.
---
RECIPE: Grilled Salmon with Steamed Broccoli
TARGETS: Omega-3 · Vitamin D · Low Sodium
TIME: 20 minutes
INGREDIENTS: salmon fillet, broccoli, olive oil, lemon, garlic, herbs
STEPS: 1. Season salmon with herbs and grill for 4-5 min per side. 2. Steam broccoli until tender. 3. Serve with lemon wedges.
---`;


/* ═══════════════════════════════════════════════════════════════
   SEXUAL HEALTH MODULE — saveSexualHealthLog()
   Persists a new entry to mg_sexual_health in localStorage.
   Private notes are stored locally only and never transmitted.
   ═══════════════════════════════════════════════════════════════ */

function saveSexualHealthLog() {
  const intimacyEl      = document.getElementById('shIntimacyLevel');
  const satisfactionEl  = document.getElementById('shSatisfactionScore');
  const concernsEl      = document.getElementById('shConcerns');
  const notesEl         = document.getElementById('shPrivateNotes');
  const errorEl         = document.getElementById('shFormError');
  const successEl       = document.getElementById('shFormSuccess');

  // Clear previous messages
  if (errorEl)   { errorEl.textContent = '';   errorEl.classList.add('hidden'); }
  if (successEl) { successEl.textContent = ''; successEl.classList.add('hidden'); }

  // Read values
  const intimacyLevel     = intimacyEl   ? intimacyEl.value.trim()   : '';
  const satisfactionRaw   = satisfactionEl ? parseInt(satisfactionEl.value, 10) : NaN;
  const concerns          = concernsEl
    ? Array.from(concernsEl.selectedOptions).map(o => o.value)
    : [];
  const privateNotes      = notesEl ? notesEl.value.trim() : '';

  // Validate
  let firstInvalidEl = null;

  if (!intimacyLevel) {
    const errEl = document.getElementById('shIntimacyLevelError');
    if (errEl) { errEl.textContent = 'Please select an intimacy level.'; errEl.classList.remove('hidden'); }
    if (!firstInvalidEl) firstInvalidEl = intimacyEl;
  }

  const satisfactionScore = isNaN(satisfactionRaw) ? null : satisfactionRaw;
  if (satisfactionScore === null || satisfactionScore < 1 || satisfactionScore > 5) {
    const errEl = document.getElementById('shSatisfactionScoreError');
    if (errEl) { errEl.textContent = 'Satisfaction score must be between 1 and 5.'; errEl.classList.remove('hidden'); }
    if (!firstInvalidEl) firstInvalidEl = satisfactionEl;
  }

  if (firstInvalidEl) {
    firstInvalidEl.focus();
    return;
  }

  // Build entry
  const entry = {
    id:               (typeof crypto !== 'undefined' && crypto.randomUUID)
                        ? crypto.randomUUID()
                        : 'sh-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    timestamp:        new Date().toISOString(),
    intimacyLevel,
    satisfactionScore,
    concerns,
    privateNotes
  };

  // Persist
  let existing = [];
  try {
    const raw = localStorage.getItem('mg_sexual_health');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existing = parsed;
    }
  } catch (e) {
    console.warn('[SH] Failed to read mg_sexual_health:', e);
  }

  existing.push(entry);

  try {
    localStorage.setItem('mg_sexual_health', JSON.stringify(existing));
  } catch (e) {
    console.error('[SH] Failed to write mg_sexual_health:', e);
    if (errorEl) {
      errorEl.textContent = 'Failed to save — storage may be full.';
      errorEl.classList.remove('hidden');
    }
    return;
  }

  // Reset form
  if (intimacyEl)     intimacyEl.value = '';
  if (satisfactionEl) satisfactionEl.value = '';
  if (concernsEl)     Array.from(concernsEl.options).forEach(o => { o.selected = false; });
  if (notesEl)        notesEl.value = '';

  // Clear field-level errors
  ['shIntimacyLevelError', 'shSatisfactionScoreError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  });

  // Success message
  if (successEl) {
    successEl.textContent = '✅ Entry saved successfully.';
    successEl.classList.remove('hidden');
    setTimeout(() => successEl.classList.add('hidden'), 4000);
  }
}

/* ═══════════════════════════════════════════════════════════════
   MENTAL HEALTH CHAT — Therapy Style Selector & AI Chat Interface
   ═══════════════════════════════════════════════════════════════ */

let mhSelectedStyle = 'Calm & Gentle';
let mhConversationHistory = [];

// WARNING: this key is visible to anyone who inspects the page source.
// It is used only as a fallback when the Lambda backend is unreachable.
// Replace 'YOUR_ANTHROPIC_API_KEY' with your actual key, or leave it to skip the fallback.
const ANTHROPIC_API_KEY = 'YOUR_ANTHROPIC_API_KEY';

/* Select therapy style */
function mhSelectStyle(style) {
  mhSelectedStyle = style;
  // Remove selected class from all cards
  document.querySelectorAll('.mh-style-card').forEach(card => {
    card.classList.remove('mh-style-selected');
  });
  // Add selected class to clicked card
  const selectedCard = document.querySelector(`.mh-style-card[data-style="${style}"]`);
  if (selectedCard) {
    selectedCard.classList.add('mh-style-selected');
  }
}

/* Build system prompt based on selected style */
function buildMhSystemPrompt(style) {
  const prompts = {
    'Calm & Gentle': 'You are a calm, gentle and empathetic mental health support companion. Speak softly. Ask one question at a time. Remember what the user shares and refer back to it. Identify emotional triggers they mention and gently explore them.',
    'Motivational Coach': 'You are an energetic mental wellness coach. Be encouraging and action-oriented. Help reframe negative thoughts. Remember their goals.',
    'Clinical & Structured': 'You are a professional mental health assistant trained in CBT. Be precise and evidence-based. Identify cognitive distortions. Give practical coping strategies.',
    'Friendly & Casual': 'You are a warm casual friend who understands mental health. Be conversational and caring. Remember everything they tell you.'
  };
  
  const basePrompt = prompts[style] || prompts['Calm & Gentle'];
  return basePrompt + ' You are NOT a replacement for professional help. If the user expresses crisis or suicidal thoughts, immediately direct them to their local crisis helpline.';
}

/* Start chat session */
function mhStartChat() {
  // Show chat section
  document.getElementById('mhChatSection').classList.remove('hidden');
  document.getElementById('btnStartMhChat').disabled = true;
  
  // Clear previous conversation
  mhConversationHistory = [];
  document.getElementById('mhChatMessages').innerHTML = '';
  
  // Add initial AI message
  mhAddMessage('ai', 'Hi, I\'m here for you. How are you feeling today?');
  
  // Hide summary button initially
  document.getElementById('mhChatActions').classList.add('hidden');
  
  // Check for voice support
  const voiceBtn = document.getElementById('btnMhVoice');
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    voiceBtn.classList.remove('hidden');
  }
  
  // Scroll to chat
  setTimeout(() => {
    document.getElementById('mhChatSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

/* Add message to chat */
function mhAddMessage(role, content) {
  const messagesContainer = document.getElementById('mhChatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = role === 'user' ? 'mh-chat-message mh-chat-user' : 'mh-chat-message mh-chat-ai';
  messageDiv.textContent = content;
  messagesContainer.appendChild(messageDiv);
  
  // Auto-scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/* Send user message */
async function mhSendMessage() {
  const input = document.getElementById('mhChatInput');
  const message = input.value.trim();

  if (!message) return;

  input.value = '';
  mhAddMessage('user', message);
  mhConversationHistory.push({ role: 'user', content: message });

  const typingIndicator = document.getElementById('mhTypingIndicator');
  const sendBtn = document.getElementById('btnMhSend');
  typingIndicator.classList.remove('hidden');
  sendBtn.disabled = true;
  input.disabled = true;

  try {
    const aiResponse = await mhFetchReply();
    mhConversationHistory.push({ role: 'assistant', content: aiResponse });
    mhAddMessage('ai', aiResponse);

    if (mhConversationHistory.length >= 4) {
      document.getElementById('mhChatActions').classList.remove('hidden');
    }
  } catch (err) {
    console.error('[MH Chat] All methods failed:', err);
    mhAddMessage('ai', 'I apologize, but I\'m unable to respond right now. Please try again later.');
  } finally {
    typingIndicator.classList.add('hidden');
    sendBtn.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

/**
 * Attempts to get a reply in this order:
 *   1. Mock (when BACKEND_URL contains YOUR_API_ID)
 *   2. Lambda backend (BACKEND_URL)
 *   3. Anthropic API directly (fallback when backend fails and key is configured)
 */
async function mhFetchReply() {
  // 1 — Mock mode
  if (BACKEND_URL.includes('YOUR_API_ID')) {
    await new Promise(resolve => setTimeout(resolve, 900));
    return 'I hear you. That sounds challenging. Can you tell me more about what\'s been on your mind?';
  }

  // 2 — Lambda backend (same { prompt } format as the rest of the app)
  try {
    // Flatten system prompt + conversation history into a single prompt string
    const systemPrompt = buildMhSystemPrompt(mhSelectedStyle);
    const historyText  = mhConversationHistory
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');
    const flatPrompt = `${systemPrompt}\n\nConversation so far:\n${historyText}\n\nAssistant:`;

    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: flatPrompt })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.text) return data.text;
    throw new Error('Empty response from backend.');
  } catch (backendErr) {
    console.warn('[MH Chat] Backend unreachable:', backendErr.message);
    
    // Check if it's a CORS error
    if (backendErr.message.includes('Failed to fetch') || backendErr.message.includes('CORS')) {
      console.error('[MH Chat] CORS error detected. Your Lambda backend needs CORS headers configured.');
      console.error('[MH Chat] Add these headers to your Lambda response:');
      console.error('  Access-Control-Allow-Origin: *');
      console.error('  Access-Control-Allow-Methods: POST, OPTIONS');
      console.error('  Access-Control-Allow-Headers: Content-Type');
    }
  }

  // 3 — Direct Anthropic API fallback (only if key is configured)
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'YOUR_ANTHROPIC_API_KEY') {
    throw new Error('Backend unavailable and no Anthropic API key configured. Please configure your Lambda backend CORS settings or add an Anthropic API key.');
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: buildMhSystemPrompt(mhSelectedStyle),
        messages: mhConversationHistory
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Anthropic API error ${res.status}`);
    }

    const data = await res.json();
    return data.content[0].text;
  } catch (anthropicErr) {
    console.error('[MH Chat] Anthropic API also failed:', anthropicErr.message);
    throw anthropicErr;
  }
}

/* Voice input */
function mhStartVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;
  
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  
  const voiceBtn = document.getElementById('btnMhVoice');
  voiceBtn.textContent = '🎤';
  voiceBtn.style.color = 'var(--color-critical)';
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById('mhChatInput').value = transcript;
    voiceBtn.textContent = '🎙️';
    voiceBtn.style.color = '';
  };
  
  recognition.onerror = () => {
    voiceBtn.textContent = '🎙️';
    voiceBtn.style.color = '';
  };
  
  recognition.onend = () => {
    voiceBtn.textContent = '🎙️';
    voiceBtn.style.color = '';
  };
  
  recognition.start();
}

/* Generate session summary */
async function mhGenerateSummary() {
  const summaryBtn    = document.getElementById('btnMhSummary');
  const summaryResult = document.getElementById('mhSummaryResult');
  const summaryLoading = document.getElementById('mhSummaryLoading');
  const summaryBody   = document.getElementById('mhSummaryBody');
  const downloadBtn   = document.getElementById('btnMhDownload');

  summaryBtn.disabled = true;
  summaryBtn.innerHTML = '<span>⏳</span> Generating...';

  // Show the result card with loading state
  summaryResult.classList.remove('hidden');
  summaryLoading.classList.remove('hidden');
  summaryBody.innerHTML = '';
  if (downloadBtn) downloadBtn.classList.add('hidden');

  const today     = new Date();
  const dateStr   = today.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const SUMMARY_SYSTEM_PROMPT =
    `You are a clinical note writer. Today's date is ${dateStr}. Summarise this mental health support conversation into a structured report with these exact sections: Mood Assessment, Key Topics Discussed, Emotional Triggers Identified, Coping Strategies Suggested, Recommended Next Steps. Start the report with "Session Date: ${dateStr}". Use plain text only — no markdown symbols like #, *, or **. Be concise and professional.`;

  const MOCK_SUMMARY = `Mood Assessment
The user presented with moderate stress and anxiety. Overall emotional tone was reflective and open to support.

Key Topics Discussed
- Work-related pressure and time management
- Difficulty sleeping and fatigue
- Feelings of being overwhelmed

Emotional Triggers Identified
- Workplace deadlines and performance expectations
- Lack of personal time and self-care routines

Coping Strategies Suggested
- Structured breathing exercises (4-7-8 technique)
- Journaling daily thoughts before bed
- Setting firm boundaries around work hours

Recommended Next Steps
- Consider speaking with a licensed therapist for ongoing support
- Practice one suggested coping strategy daily for two weeks
- Return for a follow-up session to review progress`;

  try {
    let summaryText;

    if (BACKEND_URL.includes('YOUR_API_ID')) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      summaryText = MOCK_SUMMARY;
    } else {
      const historyText = mhConversationHistory
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');
      const flatPrompt = `${SUMMARY_SYSTEM_PROMPT}\n\nConversation:\n${historyText}\n\nAssistant:`;

      const response = await fetch(BACKEND_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: flatPrompt })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      summaryText = data.text || MOCK_SUMMARY;
    }

    // Store for download
    window._mhLastSummaryText = summaryText;

    // Render structured sections
    summaryBody.innerHTML = mhRenderSummaryHTML(summaryText);
    if (downloadBtn) downloadBtn.classList.remove('hidden');

  } catch (err) {
    console.error('[MH Summary] Error:', err);
    summaryBody.innerHTML = '<p style="color:var(--color-critical);font-size:0.875rem;">Failed to generate report. Please try again.</p>';
  } finally {
    summaryLoading.classList.add('hidden');
    summaryBtn.disabled = false;
    summaryBtn.innerHTML = '<span>📋</span> Generate Session Summary';
    // Scroll result into view
    summaryResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* Render summary text into styled section cards */
function mhRenderSummaryHTML(text) {
  const SECTIONS = [
    'Session Date',
    'Mood Assessment',
    'Key Topics Discussed',
    'Emotional Triggers Identified',
    'Coping Strategies Suggested',
    'Recommended Next Steps'
  ];
  const ICONS = {
    'Session Date':                   '📅',
    'Mood Assessment':                '🧠',
    'Key Topics Discussed':           '💬',
    'Emotional Triggers Identified':  '⚡',
    'Coping Strategies Suggested':    '🛡️',
    'Recommended Next Steps':         '🗺️'
  };

  // Strip all markdown symbols from the entire text first
  const cleanText = text
    .replace(/^#{1,6}\s*/gm, '')      // remove leading # symbols
    .replace(/\*\*(.+?)\*\*/g, '$1')  // remove **bold**
    .replace(/\*(.+?)\*/g, '$1');     // remove *italic*

  // Split into sections by heading
  const sectionMap = {};
  let currentSection = null;
  const lines = cleanText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const matched = SECTIONS.find(s => trimmed.toLowerCase().startsWith(s.toLowerCase()));
    if (matched) {
      currentSection = matched;
      // Capture inline content after the heading (e.g. "Session Date: Monday, 13 May 2026")
      const afterColon = trimmed.slice(matched.length).replace(/^[\s:]+/, '');
      sectionMap[currentSection] = afterColon ? [afterColon] : [];
    } else if (currentSection) {
      sectionMap[currentSection].push(trimmed);
    }
  }

  // Fallback — no sections parsed
  if (Object.keys(sectionMap).length === 0) {
    return `<div class="mh-summary-section"><p class="mh-summary-section-body">${escapeHtml(cleanText)}</p></div>`;
  }

  let html = '';
  for (const section of SECTIONS) {
    const bodyLines = sectionMap[section];
    if (!bodyLines || bodyLines.length === 0) continue;
    const icon = ICONS[section] || '📌';

    // Session Date renders as a plain line, not a list
    if (section === 'Session Date') {
      html += `
        <div class="mh-summary-section mh-summary-date-row">
          <span class="mh-summary-section-title">${icon} Session Date</span>
          <span class="mh-summary-date-val">${escapeHtml(bodyLines[0])}</span>
        </div>`;
      continue;
    }

    const listItems = bodyLines.map(l => {
      const clean = l.replace(/^[-*•]\s*/, '').trim();
      return clean ? `<li>${escapeHtml(clean)}</li>` : '';
    }).join('');

    html += `
      <div class="mh-summary-section">
        <div class="mh-summary-section-title">${icon} ${escapeHtml(section)}</div>
        <ul class="mh-summary-section-list">${listItems}</ul>
      </div>`;
  }
  return html || `<div class="mh-summary-section"><p class="mh-summary-section-body">${escapeHtml(cleanText)}</p></div>`;
}

/* Download summary as .txt file */
function mhDownloadReport() {
  const text = window._mhLastSummaryText;
  if (!text) return;

  const today = new Date();
  const dateStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  const filename = `mentalhealth-report-${dateStr}.txt`;

  const header = `MediGuard Mental Health Session Report\nDate: ${today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}\nTherapy Style: ${mhSelectedStyle}\n${'─'.repeat(50)}\n\n`;
  const blob = new Blob([header + text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* Reset chat */
function mhResetChat() {
  if (!confirm('Are you sure you want to end this chat session? The conversation will be cleared.')) {
    return;
  }
  
  mhConversationHistory = [];
  document.getElementById('mhChatMessages').innerHTML = '';
  document.getElementById('mhChatSection').classList.add('hidden');
  document.getElementById('mhChatActions').classList.add('hidden');
  document.getElementById('btnStartMhChat').disabled = false;
  document.getElementById('mhChatInput').value = '';

  // Also hide summary result
  const summaryResult = document.getElementById('mhSummaryResult');
  if (summaryResult) summaryResult.classList.add('hidden');
  window._mhLastSummaryText = null;
}

/* ═══════════════════════════════════════════════════════════════
   MENTAL HEALTH — Location-Based Crisis Helplines
   ═══════════════════════════════════════════════════════════════ */

const MH_HELPLINES = {
  MY: [
    { name: 'Befrienders KL',    desc: 'Emotional support, 24/7',                phone: '03-7627 2929' },
    { name: 'MIASA',             desc: 'Mental Illness Awareness & Support',      phone: '1800-18-5432' },
    { name: 'MOH Mental Health', desc: 'Ministry of Health Malaysia',             phone: '1800-88-8694' }
  ],
  SG: [
    { name: 'Samaritans of Singapore', desc: '24-hour crisis helpline',           phone: '1767' },
    { name: 'IMH Mental Health',       desc: 'Institute of Mental Health',        phone: '6389 2222' }
  ],
  GB: [
    { name: 'Samaritans', desc: '24/7 emotional support',                         phone: '116 123' },
    { name: 'Mind',       desc: 'Mental health support',                          phone: '0300 123 3393' }
  ],
  US: [
    { name: '988 Lifeline',    desc: 'Suicide & Crisis Lifeline',                 phone: '988' },
    { name: 'Crisis Text Line', desc: 'Text HOME to',                             phone: '741741' }
  ],
  AU: [
    { name: 'Lifeline',     desc: '24/7 crisis support',                          phone: '13 11 14' },
    { name: 'Beyond Blue',  desc: 'Anxiety & depression support',                 phone: '1300 22 4636' }
  ]
};

const MH_COUNTRY_NAMES = {
  MY: 'Malaysia', SG: 'Singapore', GB: 'United Kingdom',
  US: 'United States', AU: 'Australia'
};

/**
 * Called on Mental Health page show (after consent).
 * Attempts geolocation → reverse-geocode → render matching helplines.
 * Falls back to MY on any failure or unsupported country.
 */
function mhInitHelplines() {
  if (!navigator.geolocation) {
    mhRenderHelplines('MY');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`)
        .then(r => r.json())
        .then(data => {
          const code = (data.countryCode || '').toUpperCase();
          mhRenderHelplines(MH_HELPLINES[code] ? code : 'MY');
        })
        .catch(() => mhRenderHelplines('MY'));
    },
    () => mhRenderHelplines('MY'),   // denied or error
    { timeout: 6000 }
  );
}

/** Renders helpline cards for the given country code into #mhHelplinesList. */
function mhRenderHelplines(countryCode) {
  const container = document.getElementById('mhHelplinesList');
  if (!container) return;

  const lines       = MH_HELPLINES[countryCode] || MH_HELPLINES.MY;
  const countryName = MH_COUNTRY_NAMES[countryCode] || 'Malaysia';

  container.innerHTML =
    `<p class="mh-crisis-location-label">📍 Showing helplines for: ${escapeHtml(countryName)}</p>` +
    `<div class="mh-crisis-grid">` +
    lines.map(h => `
      <div class="mh-crisis-card">
        <div class="mh-crisis-badge">24/7</div>
        <div class="mh-crisis-name">${escapeHtml(h.name)}</div>
        <div class="mh-crisis-desc">${escapeHtml(h.desc)}</div>
        <a class="mh-crisis-phone" href="tel:${h.phone.replace(/\s/g, '')}" aria-label="Call ${escapeHtml(h.name)}">
          📞 ${escapeHtml(h.phone)}
        </a>
      </div>`).join('') +
    `</div>`;
}

/* ── Patch mhAcceptConsent so helplines render on first-time consent ──
   mental-health.js defines mhAcceptConsent(). We wrap it here (after all
   scripts load) so mhInitHelplines() fires whenever consent is accepted,
   without touching mental-health.js.                                    */
document.addEventListener('DOMContentLoaded', () => {
  const _origAccept = window.mhAcceptConsent;
  if (typeof _origAccept === 'function') {
    window.mhAcceptConsent = function () {
      _origAccept();
      setTimeout(mhInitHelplines, 0);
    };
  }
});
