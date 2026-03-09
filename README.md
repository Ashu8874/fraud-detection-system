# Fraud Detection Pipeline (React + Node + Gemini + MongoDB)

This starter project implements the architecture you posted:

User Transaction
-> Frontend Dashboard (React)
-> Backend API (Node.js / Express)
-> Fraud Detection Service
-> Gemini AI Analysis
-> Fraud Risk Score
-> Database (MongoDB)
-> Alert System

## Project Structure

```text
fraud-detection-system
|
+-- frontend
|   +-- React Dashboard (Vite app in frontend/src)
|
+-- backend
|   +-- server.js
|   +-- routes
|   |   +-- transactions.js
|   +-- geminiService.js
|   +-- src
|       +-- controllers
|       +-- models
|       +-- routes
|       +-- services
|
+-- api
|   +-- index.js
|
+-- dataset
|   +-- transactions.csv
|
+-- ai
|   +-- fraud_model.py
|
+-- README.md
```

## Backend API

Base URL: `http://localhost:4000`

- `GET /health`
- `POST /api/transactions/analyze`
- `GET /api/transactions/recent?limit=10`
- `GET /api/transactions/alerts`

### Analyze Request Example

```json
{
  "userId": "user_12",
  "amount": 2499,
  "currency": "USD",
  "merchant": "crypto purchase",
  "location": "Delhi VPN",
  "paymentMethod": "prepaid",
  "deviceId": "dev_aa12345",
  "timestamp": "2026-03-09T10:30:00.000Z"
}
```

### Analyze Response Fields

- `transaction.riskScore`: number from `0-100`
- `transaction.riskLevel`: `LOW | MEDIUM | HIGH`
- `transaction.ruleSignals`: rule-based flags
- `transaction.aiSignals`: Gemini-derived flags
- `transaction.aiExplanation`: short AI summary
- `alert`: present when score is above threshold

## Run Locally

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

## Notes

- If `GEMINI_API_KEY` is not set, the service still works with rule-based scoring only.
- If `GEMINI_MODEL` is empty or invalid, the backend auto-discovers a supported Gemini model.
- If Gemini returns key/auth errors (for example expired key), the API now falls back to rule-based scoring with a clean message.
- Alerting currently logs structured alerts to stdout; you can replace it with email/Slack/webhook in `backend/src/services/alertService.js`.

## Deploy On Vercel

This repo is configured for a single Vercel project:

- Frontend: `frontend` (Vite static build)
- Backend API: `api/index.js` (serverless function)
- Routes:
  - `/api/*` -> backend
  - `/health` -> backend
  - everything else -> frontend app

### Steps

1. Push latest code to GitHub (already done in your repo).
2. In Vercel dashboard, click **Add New Project** and import `Ashu8874/fraud-detection-system`.
3. Keep root directory as `/` (do not change), because `vercel.json` handles builds/routing.
4. Add environment variables in Vercel Project Settings:
   - `MONGODB_URI`
   - `GEMINI_API_KEY` (optional)
   - `GEMINI_MODEL` (optional, recommended empty for auto-discovery)
   - `ALERT_RISK_THRESHOLD` (optional, default: `70`)
5. Click **Deploy**.

### Frontend API Base URL

- In production, frontend calls same-domain `/api/*` automatically.
- For local dev, it still uses `http://localhost:4000` by default.
