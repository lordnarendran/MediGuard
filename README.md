# MediGuard

An AI-powered autonomous healthcare assistant built with vanilla HTML/CSS/JS on the frontend and AWS Lambda + Amazon Bedrock on the backend.

---

## Features

| Module | Description |
|---|---|
| **AI Health Analysis** | Enter vital signs (heart rate, breathing rate, temperature, blood pressure, cough type) and get a clinical assessment powered by Claude via Amazon Bedrock |
| **Health Passport** | Chatbot-guided setup to collect personal health data (allergies, chronic conditions, vaccinations, past illnesses, family history) stored locally |
| **Consultation Booking** | Book an appointment with AI-recommended doctors, track progress through a 3-step stepper, and complete a pre-test checklist before the visit |
| **Doctor View** | Doctor-facing appointment summary with patient vitals, differential considerations, and required pre-visit actions |
| **Mental Health** | Conversational mental health support chat with session summary report |
| **Diet Analysis** | AI-powered diet assessment based on food intake |
| **Acoustic Markers** | Cough classification and respiratory health tracking |

---

## Architecture

```
Browser (HTML/CSS/JS)
        │
        │  POST { prompt: "..." }
        ▼
API Gateway (HTTP API)  ──►  /analyze
        │
        ▼
AWS Lambda (Python 3.12)
        │
        ▼
Amazon Bedrock  ──►  Claude (claude-haiku-4-5)
```

All four AI features (Health Analysis, Doctor View, Mental Health Chat, Diet Analysis) share the same single Lambda + API Gateway endpoint. Each feature builds its own prompt string and POSTs it as `{ "prompt": "..." }`.

---

## Project Structure

```
megiguardvf2/
├── index.html          # Main app — all pages in one file
├── script.js           # Core logic: vitals, consultation, passport, auth
├── mental-health.js    # Mental health module
├── content.js          # Content and UI helpers
├── aggregator.js       # Cross-module data aggregator
├── style.css           # All styles
├── start-server.bat    # Local dev server (double-click to run)
└── backend/
    └── lambda/
        └── lambda_function.py   # Lambda handler (reference copy)
```
## AWS Setup (Manual)

### 1. Enable Bedrock Model Access

1. AWS Console → **Amazon Bedrock** → **Model access**
2. Enable **Claude Haiku** (Anthropic)
3. Wait for **Access granted** status

### 2. Create the Lambda Function

1. AWS Lambda → **Create function** → Author from scratch
2. Settings:
   - Name: `bedrock_call`
   - Runtime: **Python 3.12**
   - Architecture: x86_64
3. Paste the contents of `backend/lambda/lambda_function.py` into the code editor
4. Click **Deploy**

### 3. Add IAM Permission

In Lambda → Configuration → Permissions → click the execution role → Add inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "*"
    }
  ]
}
```

### 4. Set Environment Variables (optional)

In Lambda → Configuration → Environment variables:

| Key | Default | Description |
|---|---|---|
| `BEDROCK_REGION` | `ap-southeast-5` | Region where Bedrock is available |
| `BEDROCK_MODEL_ID` | `global.anthropic.claude-haiku-4-5-20251001-v1:0` | Model inference profile ID |
| `MAX_TOKENS` | `2000` | Max tokens per response |

### 5. Create API Gateway

1. API Gateway → **Create API** → **HTTP API**
2. Settings:
   - Name: `mediguard`
3. Integration: **Lambda** → select `bedrock_call`
4. Route: `POST /analyze`
5. CORS:
   - Allow origins: `*`
   - Allow methods: `POST, OPTIONS`
   - Allow headers: `Content-Type`
6. Deploy → Stage: `prod`
7. Copy the **Invoke URL**

### 6. Update the Frontend

Open `script.js` and update `BACKEND_URL`:

```js
const BACKEND_URL = 'https://<your-api-id>.execute-api.<region>.amazonaws.com/analyze';
```

---

## Running Locally

Opening `index.html` directly via `file://` will cause CORS errors because browsers treat `file://` as a `null` origin. Use the included batch file instead:

```
Double-click  start-server.bat
```

Then open `http://localhost:8080` in your browser.

Or manually:

```bash
python -m http.server 8080
```

## Cost Estimate (AWS sandbox)

| Service | Free tier | Typical demo cost |
|---|---|---|
| Lambda | 1M requests/month free | ~$0 |
| API Gateway (HTTP) | 1M requests/month free | ~$0 |
| S3 static hosting | 5GB + 20K requests free | ~$0 |
| Bedrock Claude Haiku | — | ~$0.01–$0.05 per 100 analyses |

---

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (no frameworks)
- **Backend**: AWS Lambda (Python 3.12)
- **AI**: Amazon Bedrock — Anthropic Claude
- **Auth**: Browser localStorage with SHA-256 password hashing
- **Hosting**: AWS S3 static website (or any HTTP server)
