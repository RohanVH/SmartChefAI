# SmartChefAI

Cook smarter with what you have.

SmartChefAI is a production-oriented AI cooking assistant web app with:
- manual ingredient entry + autocomplete
- image scan ingredient detection ("Scan Ingredients" + "Scan My Fridge")
- cuisine/regional filters + cooking time filters
- AI recipe generation with safety guardrails
- step-by-step recipe viewer + fullscreen cooking mode
- browser text-to-speech controls (read/pause/resume)
- recipe-only AI chat assistant
- ingredient substitutions
- leftover saver + surprise me mode
- nutrition summary
- Firebase Google auth + save/history/rating APIs

## Tech Stack
- Frontend: React, TailwindCSS, Framer Motion, Axios, Firebase Auth
- Backend: Node.js, Express, OpenAI API, Firebase Admin
- Database: Firebase Firestore

## Project Structure
```text
/frontend
  /src
    /components
    /pages
    /services
    /hooks
    /utils
  package.json

/backend
  /routes
  /controllers
  /services
  /middleware
  /utils
  server.js
  package.json
```

## Prerequisites
- Node.js 20+
- npm 10+
- Firebase project (Auth + Firestore enabled)
- OpenAI API key

## Environment Variables

### Frontend (`frontend/.env`)
Copy `frontend/.env.example`:
```bash
VITE_API_BASE_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Backend (`backend/.env`)
Copy `backend/.env.example`:
```bash
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_VISION_MODEL=gpt-4.1-mini
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Local Run

### 1) Install dependencies
```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2) Start backend
```bash
cd backend
npm run dev
```

### 3) Start frontend
```bash
cd frontend
npm run dev
```

Frontend: `http://localhost:5173`  
Backend health: `http://localhost:5000/health`

## Build
```bash
cd frontend
npm run build
```

## API Overview
- `GET /api/ingredients/autocomplete?q=to`
- `POST /api/ingredients/detect`
- `POST /api/recipes/generate`
- `POST /api/recipes/surprise`
- `POST /api/recipes/leftover-saver`
- `POST /api/ai/chat`
- `POST /api/recipes/save` (auth)
- `POST /api/recipes/history` (auth)
- `POST /api/recipes/rate` (auth)

## Safety Guardrails
- AI prompt enforces safe cooking steps and realistic ingredient quantities.
- Unrelated chat questions are restricted with:
  - `I can only help with questions related to this recipe.`
- If no valid recipe is found:
  - `No suitable recipe found with these ingredients.`

## Deployment

### Frontend (Vercel / Netlify)
- Root directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- Set all `VITE_*` env variables in deployment settings.

### Backend (Render / Railway)
- Root directory: `backend`
- Start command: `npm start`
- Set all backend env vars from `.env.example`.
- Configure CORS with `FRONTEND_ORIGIN` set to deployed frontend URL.

## Notes
- Community cooked count/rating display is currently shown as a static demo value in UI; backend endpoints for rating persistence are implemented.
- Unsplash featured images are used as dynamic ingredient/recipe visuals.
