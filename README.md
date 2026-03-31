# SmartChefAI

SmartChefAI is a real-time AI cooking assistant that turns ingredients, leftovers, and recipe questions into a guided cooking experience with voice help, adaptive recipes, and premium step-by-step UX.

## Tagline

Cook smarter with AI. Generate recipes, get live cooking help, and stay confident from prep to plating.

## Screenshots

Add product screenshots or GIFs here once you capture them from the latest UI:

- Home hero and food carousel
- Ingredient studio with camera scan
- Recipe detail page
- Immersive cooking mode
- AI chef chat and voice flow

Example placeholders:

```text
/docs/screenshots/home-hero.png
/docs/screenshots/ingredient-studio.png
/docs/screenshots/cooking-mode.png
```

## Features

- AI recipe generation from available ingredients
- Ingredient autocomplete with image suggestions
- Live camera scanner with upload fallback
- Premium recipe detail experience with nutrition, substitutions, and video guidance
- Immersive cooking mode with proactive assistant nudges
- Conversational AI chef with chat plus voice support
- Dynamic mid-cook recipe adaptation when ingredients change
- Global recipe search with typo recovery and voice search
- Saved recipes, history, ratings, and resume cooking support
- Responsive dark premium UI built for mobile, tablet, and desktop

## Tech Stack

### Frontend
- React with Vite
- TailwindCSS
- Framer Motion
- Axios
- Firebase Auth
- Web Speech API

### Backend
- Node.js
- Express
- OpenAI API
- Firebase Admin SDK

### External Services
- TheMealDB for food images
- Unsplash fallback image query support
- Spoonacular CDN for ingredient images
- YouTube Data API for cooking step videos

## Demo Instructions

1. Start the backend.
2. Start the frontend.
3. Open the app in the browser.
4. Add ingredients or scan ingredients with the camera.
5. Generate recipes.
6. Open a recipe, start cooking mode, and test AI voice/chat guidance.
7. Try changing an ingredient mid-cook to see recipe adaptation.

## Installation

### Prerequisites
- Node.js 20+
- npm 10+
- OpenAI API key for full AI experience
- Firebase project for cloud auth and persistence
- YouTube API key for step-video guidance

### Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env` from `frontend/.env.example` and configure:

```bash
VITE_API_BASE_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` from `backend/.env.example` and configure:

```bash
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_VISION_MODEL=gpt-4.1-mini
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
YOUTUBE_API_KEY=your_youtube_api_key
```

## Running Locally

Start backend:

```bash
cd backend
npm run dev
```

Start frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`

## Production Build

```bash
cd frontend
npm run build
```

## Folder Structure

```text
SmartChefAI/
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── index.html
│   └── package.json
└── README.md
```

## Key Product Areas

- `frontend/src/pages/Home.jsx`: hero, personalization, ingredient flow, results
- `frontend/src/components/RecipeViewer.jsx`: recipe detail presentation and guided controls
- `frontend/src/components/CookingMode.jsx`: immersive cooking mode and proactive voice assistant
- `frontend/src/components/AIChat.jsx`: conversational chef chat and voice support
- `backend/services/aiService.js`: recipe generation, chat reasoning, safety rules, and recipe adaptation
- `backend/services/imageService.js`: recipe-aware image matching and fallback image logic

## Future Improvements

- Multi-user pantry sync
- Weekly meal planning
- Grocery list automation
- Nutrition and allergy enforcement
- Fine-tuned cooking personas
- User-uploaded recipe sharing

## Repository Notes

- The app includes graceful fallbacks when some optional services are not configured.
- If OpenAI is unavailable, SmartChefAI still returns structured fallback guidance where possible.
- If Firebase is unavailable, local persistence keeps core flows usable.

## License

MIT
