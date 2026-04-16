<div align="center">

# 🌱 SmartAgri
### AI-Powered Precision Farming Platform

**Tensor '26 Hackathon — Team Devengers | Problem Statement PS27**

[![Track](https://img.shields.io/badge/Track-Agriculture%20%7C%20Societal-2D6A4F?style=for-the-badge)](.)
[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%2B%20React%20%2B%20MongoDB-74C69D?style=for-the-badge)](.)
[![AI](https://img.shields.io/badge/AI-Gemini%20%2B%20Voice%20Model-D4A847?style=for-the-badge)](.)

---

*Small-scale farmers in Tamil Nadu lack access to timely, localised agricultural guidance. SmartAgri changes that — an end-to-end agentic AI platform delivering real-time, multilingual farm advisory through voice or text, so every farmer farms smarter.*

</div>

---

## 🧩 The Problem

Small-scale farmers make high-stakes decisions daily — when to irrigate, which pest to watch out for, whether the harvest window is right — often relying on word-of-mouth or outdated advice. They have no access to a system that knows their specific crop, soil, and local weather.

**SmartAgri is that system.**

---

## ✨ Features at a Glance

| Engine | What It Does |
|---|---|
| 🧑‍🌾 **Farm Advisory Agent** | Conversational AI avatar (Krishi) — voice-in, voice-out, Tamil/English |
| 🗓️ **Advisory Engine** | Gemini-powered weekly plan: irrigation, pest warnings, harvest schedule |
| 🐛 **Pest Alert System** | Real-time cluster-based bulk alerts + in-app pesticide ordering |
| 🌿 **Crop Recommendation** | Exotic crop suggestions matched to soil, market price & local vendors |
| 📈 **Market Trends** | 30-day price graph, produce listing, vendor matching |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│  SignUp/Login (voice + text) │ Home Dashboard (5 engines)   │
└────────────────────┬────────────────────────────────────────┘
                     │ Axios + JWT interceptor
┌────────────────────▼────────────────────────────────────────┐
│                   BACKEND (FastAPI)                          │
│  /auth  /advisory  /pest  /recommendations  /market         │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Gemini   │ │SoilGrids │ │OpenWeather│ │ APScheduler  │  │
│  │   API    │ │   API    │ │    API    │ │ (email reminders)│ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        farm_advisory Voice/STT Model                 │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │ Motor (async)
┌────────────────────▼────────────────────────────────────────┐
│                    MongoDB (smartagri_db)                    │
│  users │ market_trends │ pest_alerts │ advisory_plans       │
│  products │ vendors │ exotic_recommendations                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — async Python API framework
- [Motor](https://motor.readthedocs.io/) — async MongoDB driver
- [APScheduler](https://apscheduler.readthedocs.io/) — irrigation email reminders
- [bcrypt](https://pypi.org/project/bcrypt/) — password hashing
- JWT authentication via `httpOnly` cookies

**Frontend**
- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Recharts](https://recharts.org/) — market trend graphs
- [Axios](https://axios-http.com/) — API client with JWT interceptor
- Web Speech API — TTS for advisory agent voice output

**AI & External APIs**
- `farm_advisory` — custom STT/voice model (bundled)
- [Gemini API](https://ai.google.dev/) — advisory plan generation + crop recommendations
- [OpenWeatherMap API](https://openweathermap.org/api) — real-time + 7-day forecast
- [SoilGrids API](https://rest.isric.org) — soil NPK + pH from GPS coordinates

**Infrastructure**
- MongoDB Atlas / self-hosted Mongo
- Docker + Docker Compose
- SMTP (Gmail) for email notifications

---

## 📁 Project Structure

```
smartagri/
├── backend/
│   ├── main.py                   # FastAPI entry point
│   ├── routers/
│   │   ├── auth.py               # Signup / Login / JWT
│   │   ├── advisory.py           # Weekly plan + voice chat
│   │   ├── pest.py               # Pest report + bulk alerts
│   │   ├── recommendations.py    # Exotic crop engine
│   │   └── market.py             # Trends + produce listing
│   ├── services/
│   │   ├── soil_service.py       # SoilGrids integration
│   │   ├── weather_service.py    # OpenWeatherMap
│   │   ├── gemini_service.py     # Gemini API calls
│   │   ├── email_service.py      # SMTP + APScheduler
│   │   ├── cluster_service.py    # Haversine 15km clustering
│   │   └── voice_service.py      # farm_advisory.zip wrapper
│   ├── models/                   # Pydantic schemas
│   ├── db/
│   │   ├── mongodb.py            # Async Motor client
│   │   └── seed.py               # India-realistic seed data
│   ├── farm_advisory/            # Unzipped voice model
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SignUp.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Home.jsx
│   │   ├── components/
│   │   │   ├── FarmerAvatar.jsx       # Animated SVG avatar (Krishi)
│   │   │   ├── AdvisoryEngine.jsx
│   │   │   ├── PestAlert.jsx
│   │   │   ├── RecommendationEngine.jsx
│   │   │   └── MarketTrends.jsx
│   │   ├── hooks/
│   │   │   └── useVoiceInput.js
│   │   └── api/
│   │       └── axios.js              # Axios + JWT interceptor
│   └── .env
└── docker-compose.yml
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- MongoDB (local or Atlas URI)
- Docker & Docker Compose (optional, recommended)

### 1. Clone the repo

```bash
git clone https://github.com/your-team/smartagri.git
cd smartagri
```

### 2. Set up environment variables

**`backend/.env`**
```env
MONGODB_URI=your_mongo_uri
MONGODB_DB=smartagri_db
GEMINI_API_KEY=your_gemini_key
OPENWEATHER_API_KEY=your_openweather_key
SOILGRIDS_URL=https://rest.isric.org/soilgrids/v2.0/properties/query
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
FRONTEND_URL=http://localhost:3000
```

**`frontend/.env`**
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Seed the database

```bash
cd backend
python db/seed.py
```

This seeds 10 Tamil Nadu farmer profiles (Thanjavur, Trichy, Madurai belt), 30 days of market data per crop, pest alerts, 8 products, 5 vendors, and exotic crop recommendations.

### 4. Run with Docker (recommended)

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### 5. Run manually

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## 🧠 Core Engines — Deep Dive

### 🧑‍🌾 Farm Advisory Agent (Krishi)

An animated farmer avatar on the home page. Click Krishi → speak your question → response plays back as voice, with the avatar lip-syncing. Fully context-aware: Krishi knows your crop, growth stage, soil health, and weather forecast.

- Bilingual: English + Tamil (auto-detects language of question)
- Animation states: idle breathing → listening pulse → speaking lip-sync
- Chat transcript panel alongside the avatar

### 🗓️ Advisory Engine

Gemini generates a personalised weekly farming plan:

```json
{
  "irrigation_schedule": [{ "day": "Monday", "time": "06:00", "duration_mins": 45, "method": "drip" }],
  "pest_warnings": [{ "pest": "Stem Borer", "probability": 0.72, "preventive_action": "..." }],
  "harvest_plan": { "expected_date": "2026-05-10", "yield_estimate": "28 quintals/acre" },
  "sustainable_tips": ["Use neem oil spray as a natural repellent"]
}
```

APScheduler fires irrigation reminder emails 30 minutes before every scheduled irrigation slot.

### 🐛 Pest Alert System

When a farmer reports a pest sighting, SmartAgri instantly:
1. Logs the incident
2. Finds all farmers within **15 km radius** using the Haversine formula
3. Fires a bulk alert email to the entire cluster
4. Surfaces matching pesticide/organic treatment products for in-app ordering (home delivery in 2 days)

### 🌿 Crop Recommendation Engine

Analyses soil NPK, pH, rainfall, land size, past crop rotation, and current market prices to recommend an exotic, high-value crop (dragon fruit, moringa, quinoa, passion fruit, marigold). Matches the recommendation to a local vendor who'll buy the produce, and auto-sends a vendor intro email if the farmer is interested.

### 📈 Market Trends

Recharts line graph of 30-day price history for the farmer's current crop, with trend badges (📈 Rising / 📉 Falling / ➡️ Stable) and a dashed regional average overlay. Farmers can list their produce directly, and matched vendor cards appear below.

---

## 🗄️ Database Schema

| Collection | Purpose |
|---|---|
| `users` | Farmer profiles with soil, weather, cluster data |
| `market_trends` | Weekly price data per crop |
| `pest_alerts` | Reported pest incidents with geo-coordinates |
| `advisory_plans` | Gemini-generated weekly plans per user |
| `products` | Pesticides & organic alternatives available for order |
| `vendors` | Local market vendors and accepted crops |
| `exotic_recommendations` | Personalised exotic crop suggestions per user |

---

## 🎯 Evaluation Metrics

| Metric | Target |
|---|---|
| Recommendation relevance | Human-judged 1–5 score |
| Language translation accuracy | BLEU score |
| Response latency | < 5 seconds |

---

## 🌍 Seed Data Coverage

Realistic data seeded across the Tamil Nadu farming belt:

- **Locations:** Thanjavur, Trichy, Madurai
- **Crops:** Paddy, Sugarcane, Banana, Turmeric, Groundnut
- **Exotic recommendations:** Dragon Fruit, Moringa, Marigold (saffron substitute), Quinoa, Passion Fruit
- **Market data:** 30 days per crop
- **Farmers:** 10 complete profiles with GPS coordinates, soil data, and weather snapshots

---

## 🔐 Security

- Passwords hashed with `bcrypt`
- JWT stored in `httpOnly` cookies (not accessible from JS)
- All `/api/*` routes protected except `/api/auth/*`
- CORS configured for frontend URL only
- No hardcoded secrets — all credentials in `.env` files

---

## 🐳 Docker Services

```yaml
services:
  mongo:     # MongoDB instance
  backend:   # FastAPI on port 8000
  frontend:  # React/Vite on port 3000
```

---

## 👥 Team Devengers

Built for **Tensor '26** · Problem Statement **PS27** · Track: Agriculture | Societal

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with 💚 for the farmers of Tamil Nadu

*"Vanakkam 🌾 — because every farmer deserves a Krishi."*

</div>