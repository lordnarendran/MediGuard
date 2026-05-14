/**
 * Bug Condition Exploration Test — Diet Dashboard
 *
 * Property 1: Bug Condition — Diet Page Stub — No Functional UI Rendered
 *
 * This test MUST FAIL on unfixed code. Failure confirms the bug exists.
 * When the fix is applied (Task 3), this same test will pass, confirming
 * the expected behavior is satisfied.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 *
 * Approach: Read index.html as text, extract the #page-diet section,
 * then assert all five required UI section containers are present.
 * Uses string/regex search — no external dependencies required.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Load index.html ──────────────────────────────────────────────────────────
const htmlPath = path.resolve(__dirname, '..', 'index.html');
let html;
try {
  html = fs.readFileSync(htmlPath, 'utf8');
} catch (err) {
  console.error(`FATAL: Could not read index.html at ${htmlPath}`);
  console.error(err.message);
  process.exit(2);
}

// ── Extract the #page-diet section ───────────────────────────────────────────
// Grab everything from id="page-diet" up to the next top-level <main ... id="page-
// (i.e. the next sibling page element), so we only inspect page-diet's own markup.
const pageDietMatch = html.match(/id="page-diet"[\s\S]*?(?=<main\s[^>]*id="page-(?!diet))/);
if (!pageDietMatch) {
  // Fallback: grab from id="page-diet" to end of file
  const fallback = html.indexOf('id="page-diet"');
  if (fallback === -1) {
    console.error('FATAL: #page-diet element not found in index.html');
    process.exit(2);
  }
}

// Use the matched region, or fall back to everything after the first occurrence
const pageDietStart = html.indexOf('id="page-diet"');
const nextPageMatch = html.indexOf('<main ', pageDietStart + 1);
// Find the next <main that is NOT page-diet
let pageDietEnd = html.length;
let searchFrom = pageDietStart + 1;
while (true) {
  const nextMain = html.indexOf('<main ', searchFrom);
  if (nextMain === -1) break;
  const snippet = html.slice(nextMain, nextMain + 200);
  if (!snippet.includes('id="page-diet"')) {
    pageDietEnd = nextMain;
    break;
  }
  searchFrom = nextMain + 1;
}

const pageDietHtml = html.slice(pageDietStart, pageDietEnd);

// ── Assertion helpers ─────────────────────────────────────────────────────────
const failures = [];
const passes   = [];

function assert(description, condition, counterexample) {
  if (condition) {
    passes.push(`  ✅ PASS: ${description}`);
  } else {
    failures.push(`  ❌ FAIL: ${description}\n         Counterexample: ${counterexample}`);
  }
}

// ── Property checks ───────────────────────────────────────────────────────────

// Check 1 — Food logging form / food list container (Requirement 1.2)
// The fixed page must contain a food log list container with id="diet-food-list"
// or a food-entry form element.
const hasFoodList = pageDietHtml.includes('id="diet-food-list"');
const hasFoodForm = pageDietHtml.includes('dietAddFoodEntry') ||
                    pageDietHtml.includes('id="diet-food-form"');
assert(
  'Food-logging form / #diet-food-list container exists in #page-diet',
  hasFoodList || hasFoodForm,
  '#diet-food-list not found in #page-diet and no food-entry form (dietAddFoodEntry) found — ' +
  'no food-logging UI exists on the stub'
);

// Check 2 — Nutrient chart container (Requirement 1.3)
const hasNutrientChart = pageDietHtml.includes('id="diet-nutrient-chart"');
assert(
  '#diet-nutrient-chart container exists in #page-diet',
  hasNutrientChart,
  '#diet-nutrient-chart not found in #page-diet — ' +
  'no nutrient summary or progress chart exists on the stub'
);

// Check 3 — Dietary goals form (Requirement 1.4)
const hasGoalsForm = pageDietHtml.includes('dietSaveGoals') ||
                     pageDietHtml.includes('id="diet-goals-form"') ||
                     pageDietHtml.includes('id="diet-goal-calories"');
assert(
  'Dietary goals form exists in #page-diet',
  hasGoalsForm,
  'No dietary goals form found in #page-diet (no dietSaveGoals handler, ' +
  'no id="diet-goals-form", no id="diet-goal-calories") — ' +
  'user cannot set nutrition targets on the stub'
);

// Check 4 — Meal plans list container (Requirement 1.5)
const hasPlansList = pageDietHtml.includes('id="diet-plans-list"');
const hasMealPlanForm = pageDietHtml.includes('dietCreatePlan') ||
                        pageDietHtml.includes('id="diet-plans-form"');
assert(
  '#diet-plans-list container / meal planning section exists in #page-diet',
  hasPlansList || hasMealPlanForm,
  '#diet-plans-list not found in #page-diet and no meal-plan form (dietCreatePlan) found — ' +
  'no meal planning section exists on the stub'
);

// Check 5 — "Clear All Diet Data" button (Requirement 1.7)
const hasClearButton = pageDietHtml.includes('dietClearAllData') ||
                       /[Cc]lear\s+[Aa]ll\s+[Dd]iet\s+[Dd]ata/.test(pageDietHtml);
assert(
  '"Clear All Diet Data" button exists in #page-diet',
  hasClearButton,
  'No "Clear All Diet Data" button found in #page-diet (no dietClearAllData handler, ' +
  'no matching text) — user cannot manage or delete stored diet data on the stub'
);

// Check 6 — Page is NOT only the empty-placeholder stub (Requirement 1.1)
// The stub contains class="empty-page" and a "Back to Home" button but nothing else.
const hasEmptyPlaceholder = pageDietHtml.includes('class="empty-page"') ||
                             pageDietHtml.includes('empty-page');
const hasFunctionalContent = (hasFoodList || hasFoodForm) &&
                              hasNutrientChart &&
                              hasGoalsForm &&
                              (hasPlansList || hasMealPlanForm) &&
                              hasClearButton;
assert(
  '#page-diet contains functional UI beyond the empty-placeholder stub',
  hasFunctionalContent,
  '#page-diet contains only the empty-placeholder markup (class="empty-page" with ' +
  '"Back to Home" button) — all five functional section containers are absent'
);

// ── Report ────────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════');
console.log('  Diet Bug Condition Exploration Test');
console.log('  Property 1: Diet Page Stub — No Functional UI Rendered');
console.log('  Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7');
console.log('══════════════════════════════════════════════════════════════\n');

console.log(`  Inspecting: ${htmlPath}`);
console.log(`  Extracted #page-diet region: ${pageDietHtml.length} characters\n`);

if (passes.length > 0) {
  console.log('Passing assertions:');
  passes.forEach(p => console.log(p));
  console.log('');
}

if (failures.length > 0) {
  console.log('Failing assertions (counterexamples — confirms bug exists):');
  failures.forEach(f => console.log(f));
  console.log('');
  console.log(`══════════════════════════════════════════════════════════════`);
  console.log(`  RESULT: FAILED (${failures.length} of ${passes.length + failures.length} assertions failed)`);
  console.log(`  ✔ This is the EXPECTED outcome on unfixed code.`);
  console.log(`  ✔ All ${failures.length} counterexample(s) above confirm the bug exists.`);
  console.log(`  ✔ The test will PASS once the fix (Task 3) is applied.`);
  console.log(`══════════════════════════════════════════════════════════════\n`);
  process.exit(1);
} else {
  console.log(`══════════════════════════════════════════════════════════════`);
  console.log(`  RESULT: PASSED (${passes.length} of ${passes.length} assertions passed)`);
  console.log(`  ⚠ UNEXPECTED PASS on unfixed code — the bug may already be fixed,`);
  console.log(`    or the test is not correctly detecting the stub condition.`);
  console.log(`══════════════════════════════════════════════════════════════\n`);
  process.exit(0);
}
