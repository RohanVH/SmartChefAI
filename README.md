# SmartChefAI

SmartChefAI is a Vite + React application with a single Vercel serverless API entry at `/api/index.js`. It generates recipes from ingredients, supports live cooking guidance, adapts recipes mid-cook, and includes optional Firebase-backed persistence.

## Stack

- Frontend: React, Vite, TailwindCSS, Framer Motion
- Backend runtime: Vercel Serverless Function at `/api/index.js`
- AI: OpenAI Chat Completions API
- Persistence: Firebase Auth on the client, Firebase Admin + Firestore on the server
- External services: TheMealDB, Unsplash fallback, Spoonacular image CDN, YouTube Data API

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create a root `.env.local` or `.env` with the values you need:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_VISION_MODEL=gpt-4.1-mini
YOUTUBE_API_KEY=your_youtube_api_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

3. Start the frontend locally:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Vercel Deployment

This project is deployment-ready for Vercel:

- Frontend is built from the repo root
- API routes are served by `/api/index.js`
- Frontend calls use relative `/api/...` paths
- No long-running Express server is used in production

Required Vercel environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional
- `OPENAI_VISION_MODEL` optional
- `YOUTUBE_API_KEY` optional
- `FIREBASE_PROJECT_ID` optional unless using cloud persistence
- `FIREBASE_CLIENT_EMAIL` optional unless using cloud persistence
- `FIREBASE_PRIVATE_KEY` optional unless using cloud persistence
- `VITE_FIREBASE_API_KEY` optional unless using Firebase Auth UI
- `VITE_FIREBASE_AUTH_DOMAIN` optional unless using Firebase Auth UI
- `VITE_FIREBASE_PROJECT_ID` optional unless using Firebase Auth UI
- `VITE_FIREBASE_APP_ID` optional unless using Firebase Auth UI
- `VITE_FIREBASE_STORAGE_BUCKET` optional
- `VITE_FIREBASE_MESSAGING_SENDER_ID` optional
- `VITE_FIREBASE_MEASUREMENT_ID` optional

## Folder Structure

```text
SmartChefAI/
├── api/
│   └── index.js
├── lib/
├── public/
├── src/
├── package.json
├── vercel.json
└── README.md
```

## Notes

- If `OPENAI_API_KEY` is missing, AI endpoints return safe non-crashing fallback responses.
- If Firebase Admin credentials are missing, saved recipes and history endpoints respond safely instead of crashing.
- If YouTube is not configured, video-guide requests return a safe fallback response.
