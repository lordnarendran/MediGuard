# MediGuard Agent Guide

## Project Snapshot
- MediGuard is a static single-page web app with a serverless AWS backend.
- Frontend stack: plain HTML, CSS, and vanilla JavaScript with global functions.
- Backend stack: AWS Lambda Python handler that proxies prompts to Amazon Bedrock.

## Key Paths
- Frontend entrypoint: index.html
- Frontend logic: script.js
- Frontend styles: style.css
- Backend handler: backend/lambda/lambda_function.py
- Infrastructure template: infra/template.yaml
- Backend deployment steps: backend/deploy.md
- Feature specs and design docs: .kiro/specs/

## Working Conventions
- Keep frontend changes compatible with inline event handlers declared in HTML.
- Preserve existing element ids and class names unless updating both HTML and JavaScript references together.
- Follow current architecture style: feature logic lives in script.js and updates DOM directly.
- Use localStorage key prefixes consistently with existing patterns, especially mg_.
- Keep backend request contract unchanged unless explicitly required:
  - POST JSON body with prompt field
  - Response JSON includes text on success or error on failure

## Architecture Notes
- The frontend calls a deployed API endpoint from BACKEND_URL in script.js.
- Navigation is centralized in showPage(page), including per-page hooks such as mhOnPageShow() for mental health.
- Lambda entrypoint is lambda_handler in backend/lambda/lambda_function.py and includes CORS handling for OPTIONS and POST.
- AWS SAM resources are defined in infra/template.yaml for HttpApi, Lambda, and log group.

## Practical Pitfalls
- BACKEND_URL is hardcoded in script.js. Update it when moving environments.
- script.js is the active loaded script in index.html. Verify script inclusion before editing other JS files.
- Do not silently change API route shape or Bedrock response parsing without coordinated frontend/backend updates.
- Keep CORS behavior intact for browser access.

## Validation Checklist For Agents
- After frontend edits, load index.html and verify navigation, form input flow, and analysis actions still work.
- After backend edits, run a POST /analyze smoke test using the format documented in backend/deploy.md.
- When changing infrastructure-related behavior, cross-check with infra/template.yaml and backend/deploy.md instead of duplicating deployment instructions.

## Linked References
- Deployment guide: [backend/deploy.md](backend/deploy.md)
- Infrastructure template: [infra/template.yaml](infra/template.yaml)
- Diet feature design and requirements: [.kiro/specs/diet-nutrition-recommendation/design.md](.kiro/specs/diet-nutrition-recommendation/design.md), [.kiro/specs/diet-nutrition-recommendation/requirements.md](.kiro/specs/diet-nutrition-recommendation/requirements.md)
- Mental health feature requirements: [.kiro/specs/mental-health-module/requirements.md](.kiro/specs/mental-health-module/requirements.md)
- Diet module requirements: [.kiro/specs/diet-module/requirements.md](.kiro/specs/diet-module/requirements.md)