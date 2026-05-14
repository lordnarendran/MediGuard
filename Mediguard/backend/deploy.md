   <!-- # MediGuard Backend – Deployment Guide

## What you're deploying
A single Lambda function that sits between your frontend and Amazon Bedrock.
API Gateway exposes it as an HTTPS endpoint the browser can call.

```
Browser → API Gateway (HTTPS) → Lambda → Bedrock (Claude) → back
```

---

## Step 1 – Enable Bedrock model access

1. Open AWS Console → **Amazon Bedrock** → **Model access**
2. Click **Manage model access**
3. Enable **Claude 3 Sonnet** (Anthropic)
4. Wait for status to show **Access granted** (usually < 2 min)

---

## Step 2 – Create the Lambda function

1. Go to **AWS Lambda** → **Create function**
2. Choose **Author from scratch**
3. Settings:
   - Function name: `mediguard-bedrock-proxy`
   - Runtime: **Python 3.12**
   - Architecture: x86_64
4. Click **Create function**
5. In the **Code** tab, replace the default code with the contents of `lambda_function.py`
6. Click **Deploy**

### Environment variables (optional overrides)
In Lambda → Configuration → Environment variables:

| Key | Value |
|-----|-------|
| `BEDROCK_MODEL_ID` | `anthropic.claude-3-sonnet-20240229-v1:0` |
| `MAX_TOKENS` | `2000` |

---

## Step 3 – Add IAM permission for Bedrock

1. In your Lambda function → **Configuration** → **Permissions**
2. Click the execution role name (opens IAM)
3. Click **Add permissions** → **Create inline policy**
4. Switch to **JSON** tab and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
    }
  ]
}
```

5. Name it `BedrockInvokeModel` → **Create policy**

---

## Step 4 – Create API Gateway

1. Go to **API Gateway** → **Create API**
2. Choose **HTTP API** (cheaper and simpler than REST API)
3. Click **Build**
4. Settings:
   - API name: `mediguard-api`
5. **Integrations** → Add integration:
   - Type: **Lambda**
   - Lambda function: `mediguard-bedrock-proxy`
6. **Routes** → Add route:
   - Method: `POST`
   - Path: `/analyze`
7. **CORS** → Configure:
   - Allow origins: `*` (or your specific domain)
   - Allow methods: `POST, OPTIONS`
   - Allow headers: `Content-Type`
8. **Deploy** → Stage name: `prod`
9. Copy the **Invoke URL** — it looks like:
   `https://abc123xyz.execute-api.ap-southeast-5.amazonaws.com/prod`

---

## Step 5 – Update the frontend

Open `mediguard/script.js` and set your API Gateway URL:

```js
const BACKEND_URL = 'https://abc123xyz.execute-api.ap-southeast-5.amazonaws.com/prod/analyze';
```

---

## Step 6 – Test it

### Quick test in Lambda console
1. Lambda → **Test** tab
2. Create a test event:
```json
{
  "httpMethod": "POST",
  "body": "{\"prompt\": \"Say hello in one sentence.\"}"
}
```
3. Click **Test** — you should see a 200 response with Claude's reply.

### Test via curl
```bash
curl -X POST https://abc123xyz.execute-api.ap-southeast-5.amazonaws.com/prod/analyze \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello in one sentence."}'
```

Expected response:
```json
{"text": "Hello! How can I assist you today?"}
```

---

## Estimated cost (within your $50 sandbox)

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | 1M requests free/month | ~$0 |
| API Gateway HTTP API | 1M requests free/month | ~$0 |
| Bedrock Claude 3 Sonnet | ~$0.003 per 1K input tokens | ~$0.30 per 100 analyses |

At ~2000 tokens per analysis, **100 analyses ≈ $0.60**. Well within budget. -->
