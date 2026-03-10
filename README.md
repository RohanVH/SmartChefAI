# SmartChefAI

SmartChefAI is an AI-powered cooking assistant that helps users find and cook recipes from available ingredients.

It combines ingredient input, image-based detection, AI recipe generation, guided cooking, voice interactions, and recipe search in one app.

## Features

### Ingredient-Based Discovery
- Manual ingredient entry
- Ingredient autocomplete suggestions
- Live camera scan ("Scan My Fridge" style flow)
- Optional image upload detection fallback

### AI Recipe Generation
- Generates multiple recipe options from available ingredients
- Supports cuisine + regional style + time preference + language + instruction style
- Returns detailed cooking steps, ingredient quantities, heat level, time, and visual cues
- Includes fallback generation when AI output is unavailable

### Smart Recipe Search
- Dish search with autocomplete suggestions
- Voice search using browser speech recognition
- Typo correction with "Did you mean" suggestions
- Returns multiple style variations of the searched dish

### Guided Cooking Experience
- Step-by-step recipe viewer
- Fullscreen cooking mode
- Progress tracking and active-step highlighting
- Text-to-speech read/pause/resume controls

### Hands-Free Cooking Assistant
- Voice command support during cooking
- Recognizes actions like next, previous, repeat, pause, resume, stop
- Supports English, Kannada, Hindi, Tamil, and Telugu flows

### Visual and Media Features
- Recipe images fetched from TheMealDB with curated fallback + local cache
- Ingredient images from Spoonacular CDN
- Recipe video guide via YouTube Data API (if `YOUTUBE_API_KEY` is provided)

### User Data and Auth
- Google login via Firebase Auth
- Save recipes, history, and ratings with Firestore (when configured)
- LocalStorage fallback when auth/backend persistence is unavailable

## Tech Stack

### Frontend
- React (Vite)
- TailwindCSS
- Framer Motion
- Axios
- Firebase Auth
- Web Speech API (SpeechRecognition + SpeechSynthesis)

### Backend
- Node.js
- Express.js
- OpenAI API
- Firebase Admin SDK

### External APIs
- TheMealDB (recipe images)
- Spoonacular CDN (ingredient images)
- YouTube Data API (recipe video guide, optional)

## Project Structure

```text
smartchefai
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── hooks
│   │   ├── pages
│   │   ├── services
│   │   └── utils
│   ├── package.json
│   └── .env.example
├── backend
│   ├── controllers
│   ├── middleware
│   ├── routes
│   ├── services
│   ├── utils
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── README.md
```

## Prerequisites
- Node.js 20+
- npm 10+
- OpenAI API key (recommended for AI generation and image detection)
- Firebase project (optional but required for cloud auth/save/history/rating)
- YouTube API key (optional, for video guide)

## Environment Variables

### Frontend (`frontend/.env`)
Copy from `frontend/.env.example`:

```bash
VITE_API_BASE_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
```

Optional Firebase vars supported in code:
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

### Backend (`backend/.env`)
Copy from `backend/.env.example` and add optional YouTube key:

```bash
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173

OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_VISION_MODEL=gpt-4.1-mini

FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional (enables recipe video guide)
YOUTUBE_API_KEY=your_youtube_data_api_key
```

## Installation

Install frontend and backend dependencies:

```bash
cd frontend && npm install
cd ../backend && npm install
```

Or from project root:

```bash
npm run dev:backend
npm run dev:frontend
```

## Local Development

1. Start backend:

```bash
cd backend
npm run dev
```

2. Start frontend in another terminal:

```bash
cd frontend
npm run dev
```

App URLs:
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`

## Build

```bash
cd frontend
npm run build
```

## API Endpoints

### Ingredient APIs
- `GET /api/ingredients/autocomplete?q=...`
- `POST /api/ingredients/detect`

### Recipe APIs
- `POST /api/recipes/generate`
- `POST /api/recipes/surprise`
- `POST /api/recipes/leftover-saver`
- `GET /api/recipes/search-suggestions?q=...`
- `POST /api/recipes/search`
- `GET /api/recipes/video-guide?q=...`

### AI Assistant APIs
- `POST /api/ai/chat`
- `POST /api/ai/assistant`

### Image APIs
- `GET /api/images/recipe-image?name=...`
- `POST /api/images/recipe-images`

### Auth-Protected Recipe APIs
- `POST /api/recipes/save`
- `POST /api/recipes/history`
- `POST /api/recipes/rate`
- `GET /api/recipes/saved`
- `GET /api/recipes/history`

## Notes
- If OpenAI key is missing, recipe generation/chat/vision routes fall back to limited behavior.
- If Firebase is not configured, save/history/rating gracefully fall back to local storage in the frontend.
- Recipe video guide works only when `YOUTUBE_API_KEY` is set on backend.

## Future Improvements
- AI meal planning
- Smart pantry tracking
- Grocery list generation
- Deeper nutrition analysis
- Community recipe sharing

## License
MIT
