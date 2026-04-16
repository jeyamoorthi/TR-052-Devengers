# SmartAgri+

SmartAgri+ is a mobile-first farming app experience built with React + Vite.
It is designed to feel like an installable field app, not a generic website.

## What is included

- App-style dashboard with touch-friendly navigation
- Weather, disease, market, yield, and sustainability modules
- Voice assistant with fallback behavior when AI key is missing
- Daily Planner feature (local persistent farm task tracking)
- VorkAI integration screen (text/voice workflow execution via FastAPI)
- UrbanLive AQI integration screen (live AQI feed + full dashboard embed)
- Installable PWA setup (`manifest` + service worker registration)
- Offline-friendly shell caching for core app loading

## Tech stack

- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- Lucide icons
- Google GenAI SDK

## Run locally

1. Install dependencies

```bash
npm install
```

2. Configure environment

```bash
cp .env.example .env
```

Set your key in `.env`:

```env
VITE_GEMINI_API_KEY=your_api_key_here
VITE_VORKAI_API_URL=http://127.0.0.1:8000
VITE_AQI_DASHBOARD_URL=http://127.0.0.1:8501
```

3. Start dev server

```bash
npm run dev
```

4. Build production bundle

```bash
npm run build
```

## App permissions

For full capability, allow these browser/device permissions:

- Microphone (voice commands)
- Geolocation (weather and location-aware insights)
- Camera (disease detection flow, where applicable)

## Project structure

```text
components/   UI modules and screens
services/     advisory/business logic
public/       PWA assets (manifest, icons, service worker)
App.tsx       app state and screen gate logic
index.tsx     app bootstrap + service worker registration
```

## Notes

- If no `VITE_GEMINI_API_KEY` is present, assistant features gracefully return offline messaging.
- The Daily Planner stores tasks per user per day in localStorage.
