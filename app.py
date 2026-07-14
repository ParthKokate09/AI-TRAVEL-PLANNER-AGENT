# ============================================================
#   AI Travel Planner Agent 2.0 — Flask Backend
#   IBM Watsonx.ai + IBM Granite Model
#   Author: IBM SkillsBuild / Edunet Foundation Project
# ============================================================

import os
import logging
import json
from datetime import datetime
from flask import (
    Flask, render_template, request, jsonify,
    session, redirect, url_for
)
from dotenv import load_dotenv

# ── IBM Watsonx.ai SDK ──────────────────────────────────────
from ibm_watsonx_ai import APIClient, Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

# ── Agent Instructions (fully customizable) ─────────────────
from agent_instructions import (
    build_system_prompt,
    QUICK_REPLIES,
    POPULAR_DESTINATIONS,
    DEFAULT_CHECKLIST,
    AGENT_NAME,
    AGENT_TAGLINE,
    BUDGET_TIERS,
    TRAVEL_STYLES,
)

# ────────────────────────────────────────────────────────────
# 0.  Bootstrap
# ────────────────────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-in-production")

# ── Config from .env ────────────────────────────────────────
IBM_API_KEY    = os.getenv("IBM_API_KEY", "")
WATSONX_URL    = os.getenv("IBM_WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
PROJECT_ID     = os.getenv("IBM_PROJECT_ID", "")
MODEL_ID       = os.getenv("GRANITE_MODEL_ID", "meta-llama/llama-3-3-70b-instruct")
MAX_TOKENS     = int(os.getenv("MAX_TOKENS", "2048"))
TEMPERATURE    = float(os.getenv("TEMPERATURE", "0.7"))
TOP_P          = float(os.getenv("TOP_P", "0.9"))
MAX_HISTORY    = int(os.getenv("MAX_CHAT_HISTORY", "20"))

# ────────────────────────────────────────────────────────────
# 1.  IBM Watsonx.ai Client Initialization
# ────────────────────────────────────────────────────────────
watsonx_client = None
granite_model  = None

def init_watsonx() -> bool:
    """
    Lazily initialise the IBM Watsonx.ai client and Granite model.
    Returns True on success, False when credentials are missing/invalid.
    """
    global watsonx_client, granite_model

    if not IBM_API_KEY or not PROJECT_ID:
        logger.warning("IBM_API_KEY or IBM_PROJECT_ID not set — running in demo mode.")
        return False

    try:
        credentials = Credentials(url=WATSONX_URL, api_key=IBM_API_KEY)
        watsonx_client = APIClient(credentials=credentials, project_id=PROJECT_ID)

        granite_model = ModelInference(
            model_id=MODEL_ID,
            api_client=watsonx_client,
            project_id=PROJECT_ID,
            params={
                GenParams.MAX_NEW_TOKENS: MAX_TOKENS,
                GenParams.TEMPERATURE:    TEMPERATURE,
                GenParams.TOP_P:          TOP_P,
                # Llama-3 end-of-turn token; also guard against prompt leakage
                GenParams.STOP_SEQUENCES: ["<|eot_id|>", "<|end_of_text|>", "Human:", "User:"],
            },
        )
        logger.info("✅  IBM Watsonx.ai client initialised — model: %s", MODEL_ID)
        return True

    except Exception as exc:
        logger.error("❌  Watsonx init failed: %s", exc)
        return False


# Attempt initialisation at startup
WATSONX_READY = init_watsonx()


# ────────────────────────────────────────────────────────────
# 2.  Core AI Inference
# ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = build_system_prompt()


def format_messages_as_prompt(history: list[dict], user_message: str) -> str:
    """
    Converts chat history + new user message into the prompt format
    expected by Meta Llama-3 instruction models on IBM Watsonx.ai.

    Llama-3 chat template:
        <|begin_of_text|>
        <|start_header_id|>system<|end_header_id|>
        {system}<|eot_id|>
        <|start_header_id|>user<|end_header_id|>
        {message}<|eot_id|>
        <|start_header_id|>assistant<|end_header_id|>
    """
    parts = [
        "<|begin_of_text|>",
        f"<|start_header_id|>system<|end_header_id|>\n\n{SYSTEM_PROMPT.strip()}<|eot_id|>",
    ]

    for turn in history[-MAX_HISTORY:]:
        role    = turn.get("role", "user")
        content = turn.get("content", "")
        if role == "user":
            parts.append(f"<|start_header_id|>user<|end_header_id|>\n\n{content}<|eot_id|>")
        elif role == "assistant":
            parts.append(f"<|start_header_id|>assistant<|end_header_id|>\n\n{content}<|eot_id|>")

    parts.append(f"<|start_header_id|>user<|end_header_id|>\n\n{user_message}<|eot_id|>")
    parts.append("<|start_header_id|>assistant<|end_header_id|>\n\n")

    return "".join(parts)


def ask_granite(user_message: str, chat_history: list[dict]) -> str:
    """
    Sends the user message + history to IBM Granite and returns
    the assistant reply.  Falls back to a demo reply when the
    Watsonx client is not available.
    """
    if not WATSONX_READY or granite_model is None:
        return _demo_reply(user_message)

    try:
        prompt   = format_messages_as_prompt(chat_history, user_message)
        response = granite_model.generate_text(prompt=prompt)

        # The SDK may return a string directly or a dict with 'results'
        if isinstance(response, str):
            return response.strip()
        if isinstance(response, dict):
            results = response.get("results", [])
            if results:
                return results[0].get("generated_text", "").strip()

        return str(response).strip()

    except Exception as exc:
        logger.error("Granite inference error: %s", exc)
        return (
            "⚠️ I'm having trouble connecting to the AI service right now. "
            "Please check your IBM Watsonx.ai credentials in the .env file and try again."
        )


def _demo_reply(message: str) -> str:
    """
    Fallback demo replies when no IBM credentials are configured.
    Demonstrates the application UI without a live AI connection.
    """
    msg = message.lower()

    if any(k in msg for k in ["japan", "tokyo", "kyoto", "osaka"]):
        return (
            "✈️ **Japan Travel Guide**\n\n"
            "Japan is an incredible destination blending ancient tradition with cutting-edge modernity!\n\n"
            "🗓️ **Best Time to Visit:** March–May (cherry blossoms) or October–November (autumn foliage)\n\n"
            "🏨 **Where to Stay:**\n"
            "• Budget: Capsule hotels & hostels (~$25–40/night)\n"
            "• Standard: Business hotels like APA or Dormy Inn (~$70–120/night)\n"
            "• Luxury: Park Hyatt Tokyo, The Peninsula (~$400+/night)\n\n"
            "📅 **7-Day Highlights:**\n"
            "• Day 1–2: Tokyo — Shibuya, Shinjuku, Akihabara\n"
            "• Day 3: Day trip to Nikko or Kamakura\n"
            "• Day 4: Bullet train to Kyoto\n"
            "• Day 5–6: Kyoto — Fushimi Inari, Arashiyama, Gion district\n"
            "• Day 7: Osaka — Dotonbori & Osaka Castle\n\n"
            "💰 **Budget Estimate:** $80–150/day (mid-range)\n\n"
            "💡 **Pro Tip:** Get a JR Pass for unlimited bullet train travel — saves ¥20,000+ on a 7-day trip!\n\n"
            "*This is a demo response. Connect your IBM Watsonx.ai credentials for full AI-powered planning!*"
        )

    if any(k in msg for k in ["bali", "indonesia"]):
        return (
            "🌺 **Bali Travel Guide**\n\n"
            "Bali is a paradise of rice terraces, ancient temples, and surf beaches!\n\n"
            "🗓️ **Best Time:** April–October (dry season)\n\n"
            "🏨 **Accommodation:**\n"
            "• Budget: Ubud guesthouses ($15–30/night)\n"
            "• Standard: Seminyak villas ($50–100/night)\n"
            "• Luxury: COMO Uma Ubud, Amandari ($350+/night)\n\n"
            "📅 **Must-Do Activities:**\n"
            "• Tegallalang Rice Terraces sunrise\n"
            "• Tanah Lot Temple at sunset\n"
            "• Surf lessons at Kuta Beach\n"
            "• Ubud Monkey Forest & cooking class\n"
            "• Mount Batur volcano hike\n\n"
            "💰 **Budget:** $35–60/day (very affordable!)\n\n"
            "💡 **Pro Tip:** Rent a scooter (~$5/day) — it's the best way to explore!\n\n"
            "*Demo response. Add IBM Watsonx.ai credentials for personalised AI planning!*"
        )

    if any(k in msg for k in ["budget", "cheap", "affordable", "money"]):
        return (
            "💰 **Budget Travel Planning**\n\n"
            "Here are the most affordable destinations for each region:\n\n"
            "🌏 **Asia (Best Value):**\n"
            "• Vietnam — $20–35/day (pho, beaches, mountains)\n"
            "• Cambodia — $25–40/day (Angkor Wat, river cruises)\n"
            "• Nepal — $25–45/day (trekking, Himalayas)\n\n"
            "🌍 **Europe on a Budget:**\n"
            "• Georgia (Tbilisi) — $30–50/day\n"
            "• Albania — $35–55/day\n"
            "• Hungary (Budapest) — $45–70/day\n\n"
            "🌎 **Americas:**\n"
            "• Bolivia — $20–35/day (salt flats!)\n"
            "• Colombia — $30–50/day\n"
            "• Mexico — $35–55/day\n\n"
            "💡 **Pro Tips:**\n"
            "• Book flights 6–8 weeks in advance\n"
            "• Use hostel dorms to save 60–70% on accommodation\n"
            "• Eat where locals eat — always cheaper & more authentic!\n\n"
            "*Demo response. Connect Watsonx.ai for personalised budget planning!*"
        )

    # Generic fallback
    return (
        f"🌍 **Welcome to {AGENT_NAME}!**\n\n"
        "I'm your AI-powered travel planning assistant, ready to help you plan your perfect trip!\n\n"
        "Here's what I can help you with:\n"
        "• ✈️ Personalized itinerary generation\n"
        "• 🏨 Hotel & accommodation recommendations\n"
        "• 🍽️ Local food & restaurant guides\n"
        "• 💰 Budget estimation & currency tips\n"
        "• 🛂 Visa & travel document guidance\n"
        "• 🌤️ Weather-aware travel advice\n"
        "• 🚌 Local transportation guides\n"
        "• 🔒 Travel safety recommendations\n\n"
        "**Try asking me:**\n"
        "• *'Plan a 7-day trip to Japan for 2 people on a $2000 budget'*\n"
        "• *'Best honeymoon destinations in Southeast Asia'*\n"
        "• *'What are the visa requirements for visiting Europe?'*\n\n"
        f"⚠️ *Currently running in demo mode. Add your IBM Watsonx.ai credentials to `.env` for full {AGENT_NAME} AI experience!*"
    )


# ────────────────────────────────────────────────────────────
# 3.  Route Helpers
# ────────────────────────────────────────────────────────────
def get_chat_history() -> list[dict]:
    """Retrieve chat history from the Flask session."""
    return session.get("chat_history", [])


def save_chat_history(history: list[dict]) -> None:
    """Persist trimmed chat history back to the Flask session."""
    session["chat_history"] = history[-MAX_HISTORY:]


def get_saved_trips() -> list[dict]:
    return session.get("saved_trips", [])


def get_trip_history() -> list[dict]:
    return session.get("trip_history", [])


# ────────────────────────────────────────────────────────────
# 4.  Flask Routes
# ────────────────────────────────────────────────────────────
@app.route("/")
def index():
    """Render the main dashboard."""
    return render_template(
        "index.html",
        agent_name=AGENT_NAME,
        agent_tagline=AGENT_TAGLINE,
        quick_replies=QUICK_REPLIES,
        popular_destinations=POPULAR_DESTINATIONS,
        budget_tiers=BUDGET_TIERS,
        travel_styles=TRAVEL_STYLES,
        default_checklist=DEFAULT_CHECKLIST,
        watsonx_ready=WATSONX_READY,
        model_id=MODEL_ID,
    )


@app.route("/api/chat", methods=["POST"])
def api_chat():
    """
    POST /api/chat
    Body: { "message": "...", "clear": false }
    Returns: { "reply": "...", "timestamp": "..." }
    """
    data    = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "Message cannot be empty"}), 400

    history = get_chat_history()
    reply   = ask_granite(message, history)

    history.append({"role": "user",      "content": message})
    history.append({"role": "assistant", "content": reply})
    save_chat_history(history)

    logger.info("Chat — user: %.80s", message)

    return jsonify({
        "reply":     reply,
        "timestamp": datetime.now().strftime("%H:%M"),
        "model":     MODEL_ID if WATSONX_READY else "demo",
    })


@app.route("/api/chat/clear", methods=["POST"])
def api_chat_clear():
    """Clear the current session's chat history."""
    session.pop("chat_history", None)
    return jsonify({"status": "cleared"})


@app.route("/api/trip/save", methods=["POST"])
def api_save_trip():
    """Save a trip to the session-based saved trips list."""
    data = request.get_json(silent=True) or {}
    trip = {
        "id":          len(get_saved_trips()) + 1,
        "destination": data.get("destination", "Unknown"),
        "duration":    data.get("duration",    "N/A"),
        "budget":      data.get("budget",      "N/A"),
        "style":       data.get("style",       "General"),
        "notes":       data.get("notes",       ""),
        "saved_at":    datetime.now().strftime("%d %b %Y, %H:%M"),
    }
    trips = get_saved_trips()
    trips.append(trip)
    session["saved_trips"] = trips
    return jsonify({"status": "saved", "trip": trip})


@app.route("/api/trip/saved", methods=["GET"])
def api_get_saved_trips():
    return jsonify({"trips": get_saved_trips()})


@app.route("/api/trip/delete/<int:trip_id>", methods=["DELETE"])
def api_delete_trip(trip_id: int):
    trips = [t for t in get_saved_trips() if t.get("id") != trip_id]
    session["saved_trips"] = trips
    return jsonify({"status": "deleted"})


@app.route("/api/checklist", methods=["GET"])
def api_get_checklist():
    """Return the default travel checklist."""
    return jsonify({"checklist": DEFAULT_CHECKLIST})


@app.route("/api/destinations", methods=["GET"])
def api_get_destinations():
    """Return popular destination data."""
    return jsonify({"destinations": POPULAR_DESTINATIONS})


@app.route("/api/status", methods=["GET"])
def api_status():
    """Health-check endpoint."""
    return jsonify({
        "status":        "ok",
        "agent":         AGENT_NAME,
        "model":         MODEL_ID,
        "watsonx_ready": WATSONX_READY,
        "timestamp":     datetime.now().isoformat(),
    })


@app.route("/api/itinerary/generate", methods=["POST"])
def api_generate_itinerary():
    """
    POST /api/itinerary/generate
    Body: { destination, days, budget, style, interests, season }
    Builds a structured prompt and routes through the same AI pipeline.
    """
    data        = request.get_json(silent=True) or {}
    destination = data.get("destination", "")
    days        = data.get("days", 7)
    budget      = data.get("budget", "standard")
    style       = data.get("style", "cultural")
    interests   = data.get("interests", "sightseeing, food, culture")
    season      = data.get("season", "")

    if not destination:
        return jsonify({"error": "Destination is required"}), 400

    structured_prompt = (
        f"Please create a detailed {days}-day travel itinerary for {destination}. "
        f"Budget tier: {budget}. Travel style: {style}. "
        f"Interests: {interests}. "
        f"{'Travelling in: ' + season + '.' if season else ''} "
        "Include day-by-day activities, hotel suggestions, restaurant recommendations, "
        "local transport tips, packing list, and a total budget estimate."
    )

    history = get_chat_history()
    reply   = ask_granite(structured_prompt, history)

    history.append({"role": "user",      "content": structured_prompt})
    history.append({"role": "assistant", "content": reply})
    save_chat_history(history)

    # Log to trip history
    trip_history = get_trip_history()
    trip_history.append({
        "destination": destination,
        "days":        days,
        "budget":      budget,
        "style":       style,
        "generated":   datetime.now().strftime("%d %b %Y"),
        "preview":     reply[:200] + "..." if len(reply) > 200 else reply,
    })
    session["trip_history"] = trip_history[-10:]

    return jsonify({
        "itinerary":   reply,
        "destination": destination,
        "days":        days,
        "timestamp":   datetime.now().strftime("%H:%M"),
        "model":       MODEL_ID if WATSONX_READY else "demo",
    })


@app.route("/api/budget/estimate", methods=["POST"])
def api_budget_estimate():
    """
    POST /api/budget/estimate
    Body: { destination, days, budget_tier, travelers }
    Returns estimated budget breakdown.
    """
    data        = request.get_json(silent=True) or {}
    destination = data.get("destination", "your destination")
    days        = int(data.get("days", 7))
    tier        = data.get("budget_tier", "standard")
    travelers   = int(data.get("travelers", 1))

    prompt = (
        f"Provide a detailed daily budget breakdown for {travelers} traveler(s) "
        f"visiting {destination} for {days} days on a '{tier}' budget. "
        "Include: accommodation per night, meals per day, local transport per day, "
        "attraction entry fees per day, shopping/miscellaneous per day, "
        "and a grand total estimate. Format as a clear cost table."
    )

    history = get_chat_history()
    reply   = ask_granite(prompt, history)

    return jsonify({
        "estimate":    reply,
        "destination": destination,
        "days":        days,
        "tier":        tier,
        "travelers":   travelers,
        "timestamp":   datetime.now().strftime("%H:%M"),
    })


# ────────────────────────────────────────────────────────────
# 5.  Error Handlers
# ────────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(e):
    logger.exception("Internal server error")
    return jsonify({"error": "Internal server error"}), 500


# ────────────────────────────────────────────────────────────
# 6.  Entry Point
# ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    host  = os.getenv("FLASK_HOST",  "0.0.0.0")
    port  = int(os.getenv("FLASK_PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"

    logger.info("🌍 Starting %s on http://%s:%s", AGENT_NAME, host, port)
    logger.info("🤖 Model: %s | Watsonx Ready: %s", MODEL_ID, WATSONX_READY)

    app.run(host=host, port=port, debug=debug)
