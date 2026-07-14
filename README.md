# ✈️ AI Travel Planner Agent 2.0

> **AI-powered travel planning assistant built with Python Flask + IBM Watsonx.ai + IBM Granite models**
> IBM SkillsBuild / Edunet Foundation Project

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-green?logo=flask)
![IBM Watsonx](https://img.shields.io/badge/IBM-Watsonx.ai-0530ad?logo=ibm)
![IBM Granite](https://img.shields.io/badge/Model-IBM%20Granite-0530ad)
![Bootstrap](https://img.shields.io/badge/UI-Bootstrap%205-purple?logo=bootstrap)

---

## 📋 Table of Contents

1. [Features](#-features)
2. [Project Structure](#-project-structure)
3. [Quick Start](#-quick-start)
4. [IBM Watsonx.ai Setup](#-ibm-watsonxai-setup)
5. [Customizing the Agent](#-customizing-the-agent)
6. [API Endpoints](#-api-endpoints)
7. [Deployment](#-deployment)
8. [Screenshots](#-screenshots)
9. [Tech Stack](#-tech-stack)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Chat Assistant** | Conversational travel planning powered by IBM Granite |
| 🗺️ **Trip Planner** | Generate full multi-day itineraries with one click |
| 💰 **Budget Calculator** | Estimate trip costs by destination, days & budget tier |
| ✅ **Travel Checklist** | Smart packing checklist saved in browser |
| 🌍 **Destination Cards** | 8+ curated destinations with filters |
| 🔖 **Saved Trips** | Session-based trip saving |
| 👤 **User Profile** | System info & Watsonx setup guide |
| 🌙 **Dark / Light Mode** | Toggle persisted in localStorage |
| 📱 **Fully Responsive** | Mobile-first Bootstrap 5 design |

### AI Travel Capabilities

- ✈️ Personalized itinerary generation (destination, days, budget, style, season)
- 🏨 Hotel recommendations by budget tier
- 🍽️ Local food & restaurant recommendations
- 🛂 Visa & travel document guidance
- 🌤️ Weather-aware travel advice & packing tips
- 🚌 Local transportation navigation
- 🔒 Travel safety & emergency contacts
- 💎 Hidden gems & off-beat destinations
- 💱 Currency conversion guidance
- 🌏 Multi-city & multi-style trip planning

---

## 📁 Project Structure

```
AI TRAVEL PLANNER AGENT 2.0/
├── app.py                  # Flask backend — routes, AI integration, API
├── agent_instructions.py   # ✏️ Customize agent behavior (edit this!)
├── templates/
│   └── index.html          # Main frontend (Bootstrap 5 + Glassmorphism UI)
├── static/
│   ├── css/
│   │   └── style.css       # Custom design system
│   ├── js/
│   │   └── app.js          # Frontend logic (chat, forms, state)
│   └── images/             # (add your images here)
├── .env.example            # Environment variable template
├── .env                    # Your credentials (never commit this!)
├── requirements.txt        # Python dependencies
└── README.md               # This file
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- pip
- IBM Cloud account (free tier works!)

### 1. Clone & Install

```bash
# Navigate to project directory
cd "AI TRAVEL PLANNER AGENT 2.0"

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy the template
cp .env.example .env

# Edit .env with your IBM credentials (see next section)
```

### 3. Run the Application

```bash
python app.py
```

Open your browser at **http://localhost:5000** 🎉

> **No IBM credentials?** The app runs in **Demo Mode** with pre-built responses to showcase the UI!

---

## ☁️ IBM Watsonx.ai Setup

### Step 1 — Create IBM Cloud Account
1. Go to [cloud.ibm.com](https://cloud.ibm.com)
2. Sign up for a free account

### Step 2 — Launch Watsonx.ai
1. From IBM Cloud dashboard, search for **"Watsonx.ai"**
2. Create a new Watsonx.ai instance
3. Create a new **Project** (note the Project ID)

### Step 3 — Generate API Key
1. Go to **Manage → Access (IAM) → API Keys**
2. Click **Create an IBM Cloud API Key**
3. Copy the key (shown only once!)

### Step 4 — Update `.env`

```env
IBM_API_KEY=your_ibm_cloud_api_key_here
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com
IBM_PROJECT_ID=your_watsonx_project_id_here
GRANITE_MODEL_ID=ibm/granite-3-3-8b-instruct
```

### Step 5 — Restart Flask
```bash
python app.py
```

The status badge in the app will show **"Watsonx.ai Connected"** ✅

---

## ✏️ Customizing the Agent

All agent behavior is controlled from **`agent_instructions.py`** — no need to touch `app.py`!

```python
# Change the agent's name and persona
AGENT_NAME = "WanderlustAI"
AGENT_PERSONA = "You are an expert AI travel planner..."

# Adjust response style
RESPONSE_STYLE = """
1. Use emoji icons for section headers
2. Always include cost estimates...
"""

# Set default language and currency
DEFAULT_LANGUAGE = "English"
DEFAULT_CURRENCY = "USD"

# Add country-specific rules
COUNTRY_SPECIFIC_RULES = {
    "India": "Recommend train travel via IRCTC...",
}

# Customize budget tiers
BUDGET_TIERS = {
    "budget": { "daily_usd": "20–50", ... },
}

# Edit destination cards shown on dashboard
POPULAR_DESTINATIONS = [
    { "name": "Kyoto, Japan", "emoji": "⛩️", ... },
]
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Main dashboard |
| `POST` | `/api/chat` | Send chat message → AI reply |
| `POST` | `/api/chat/clear` | Clear chat history |
| `POST` | `/api/itinerary/generate` | Generate structured itinerary |
| `POST` | `/api/budget/estimate` | Get budget breakdown |
| `POST` | `/api/trip/save` | Save a trip |
| `GET` | `/api/trip/saved` | Get saved trips |
| `DELETE` | `/api/trip/delete/<id>` | Delete saved trip |
| `GET` | `/api/checklist` | Get travel checklist |
| `GET` | `/api/destinations` | Get destinations data |
| `GET` | `/api/status` | Health check / Watsonx status |

### Chat API Example

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Plan a 7-day trip to Tokyo on a budget"}'
```

### Itinerary Generation Example

```bash
curl -X POST http://localhost:5000/api/itinerary/generate \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Kyoto, Japan",
    "days": 5,
    "budget": "standard",
    "style": "cultural",
    "interests": "temples, food, photography",
    "season": "Spring"
  }'
```

---

## 🚀 Deployment

### Option 1 — Render (Recommended — Free Tier)

1. Push code to GitHub
2. Connect repo at [render.com](https://render.com)
3. New Web Service → Python environment
4. Build command: `pip install -r requirements.txt`
5. Start command: `gunicorn app:app`
6. Add environment variables from `.env`

### Option 2 — Railway

1. Push to GitHub
2. New project at [railway.app](https://railway.app)
3. Deploy from repo
4. Set environment variables
5. Railway auto-detects Python/Flask

### Option 3 — IBM Cloud (Code Engine)

```bash
# Install IBM Cloud CLI
ibmcloud login
ibmcloud target -r us-south -g Default

# Build and push to IBM Container Registry
ibmcloud cr build . -t us.icr.io/your-namespace/travel-planner

# Deploy to Code Engine
ibmcloud ce app create --name travel-planner \
  --image us.icr.io/your-namespace/travel-planner \
  --env-from-secret travel-planner-secrets
```

### Option 4 — Local Production

```bash
gunicorn --bind 0.0.0.0:5000 --workers 2 app:app
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **AI Model** | IBM Granite 3.3 8B Instruct / Granite 4 |
| **AI Platform** | IBM Watsonx.ai |
| **Backend** | Python Flask 3.0 |
| **AI SDK** | ibm-watsonx-ai |
| **Frontend** | Bootstrap 5, Vanilla JS |
| **UI Style** | Glassmorphism, CSS Variables, Dark Mode |
| **Config** | python-dotenv |
| **Production** | Gunicorn |

---

## 🔮 Future Enhancements

- [ ] RAG with FAISS/ChromaDB for destination knowledge base
- [ ] Real-time weather API integration (OpenWeatherMap)
- [ ] Live currency conversion API
- [ ] Google Maps / OpenStreetMap integration
- [ ] User authentication (Flask-Login)
- [ ] PostgreSQL database for persistent trip storage
- [ ] Multi-language support
- [ ] Voice input / text-to-speech responses
- [ ] Export itinerary as PDF

---

## 📄 License

MIT License — Free to use for educational purposes.

---

## 🙏 Acknowledgements

- **IBM SkillsBuild** & **Edunet Foundation** for the project opportunity
- **IBM Watsonx.ai** for the AI platform
- **IBM Granite** for the open-source language model
- **Bootstrap** for the UI framework

---

*Built with ❤️ using IBM Granite AI — Plan smarter, travel better.*
