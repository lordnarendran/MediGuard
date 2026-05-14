---
description: "Use when: adding features to MediGuard frontend or backend, debugging mental health and diet sections, or extending the health analysis modules"
name: "MediGuard Feature Development"
argument-hint: "Feature/module to add or debug (e.g., 'add calorie tracking to diet module' or 'debug mental health storage')"
agent: "agent"
---

## MediGuard Feature Development & Debugging

You're working on the MediGuard health analysis platform. Here's what to do:

### 1. Understand the Architecture
- **Frontend**: `index.html` (entry point), `script.js` (main logic), `style.css` (styles), `mental-health.js` (mental health module)
- **Backend**: AWS Lambda Python handler in `backend/lambda/lambda_function.py` that proxies to Amazon Bedrock
- **Infrastructure**: AWS SAM template in `infra/template.yaml` defining Lambda, HttpApi, and logs
- **Key contract**: Frontend sends POST JSON with `prompt` field; Lambda returns JSON with `text` (success) or `error` (failure)

### 2. Frontend Changes
- Keep changes compatible with inline HTML event handlers
- Preserve existing element IDs and class names unless updating both HTML and JS references together
- Use `localStorage` with `mg_` prefix for consistency
- Navigation is centralized via `showPage(page)` function; mental health has `mhOnPageShow()` hook
- Update `BACKEND_URL` constant if environment changes

### 3. Backend Changes
- Maintain the POST `/analyze` contract (JSON body with `prompt` field)
- Lambda entrypoint: `lambda_handler` in `backend/lambda/lambda_function.py`
- CORS is already handled for OPTIONS and POST
- Use `backend/deploy.md` for deployment instructions

### 4. Mental Health & Diet Module Development
- Review feature specs in `.kiro/specs/` (requirements and design docs available)
- Mental health page includes storage and analysis state managed in `mhOnPageShow()`
- Diet/nutrition module uses similar patterns; check `diet-module/` and `diet-nutrition-recommendation/` specs
- Follow existing navigation and form patterns for consistency

### 5. Validation Checklist
- ✅ After frontend edits: Load `index.html`, verify navigation, form input flow, and analysis actions
- ✅ After backend edits: Test POST `/analyze` with proper JSON format
- ✅ For infrastructure changes: Cross-check with `infra/template.yaml` and `backend/deploy.md`
- ✅ Preserve element IDs/classes and API contracts unless explicitly updating both ends

### Provide
- Code snippets for changes needed
- Step-by-step instructions for implementation
- Explanation of impacts and dependencies
- Validation steps specific to your change
