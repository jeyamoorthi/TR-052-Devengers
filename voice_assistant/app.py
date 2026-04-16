#!/usr/bin/env python3
"""
KisanAI Flask API Server - Connects index.py backend to frontend
================================================
Usage:
  1. Run: python app.py
  2. Open browser: http://localhost:5000
================================================
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import base64, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── Import from index.py backend ─────────────────────────────────────────────
try:
    from index import (
        bhashini_asr_translate,
        bhashini_translate_tts,
        bhashini_translate_text,
        ask_groq,
        calculate_bleu_score,
        generate_comprehensive_advisory,
        prefetch_services,
        LANGUAGES,
    )
    BACKEND_OK = True
    print("✅  index.py backend imported successfully")
except ImportError as e:
    print(f"❌  Could not import index.py → {e}")
    print("    Please ensure all dependencies are installed:")
    print("    python -m pip install pyaudio groq requests keyboard nltk")
    sys.exit(1)

# ── Language metadata ─────────────────────────────────────────────────────────
NATIVE_NAMES = {
    "hi": "हिन्दी", "ta": "தமிழ்", "te": "తెలుగు", "kn": "ಕನ್ನಡ",
    "ml": "മലയാളം", "bn": "বাংলা", "gu": "ગુજરાતી", "mr": "मराठी",
    "pa": "ਪੰਜਾਬੀ", "or": "ଓଡ଼ିଆ", "as": "অসমীয়া", "ur": "اردو",
}

# ── Flask app ─────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def serve_frontend():
    return send_from_directory(".", "index.html")

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "backend": BACKEND_OK})

@app.route("/api/languages")
def get_languages():
    langs = [
        {"id": k, "name": v[0], "code": v[1], "native": NATIVE_NAMES.get(v[1], v[0])}
        for k, v in LANGUAGES.items()
    ]
    return jsonify({"languages": langs})

@app.route("/api/prefetch", methods=["POST"])
def prefetch():
    data = request.json or {}
    lang_code = data.get("lang_code", "hi")
    try:
        prefetch_services(lang_code)
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/transcribe", methods=["POST"])
def api_transcribe():
    data = request.json or {}
    audio_b64 = data.get("audio", "")
    lang_code  = data.get("lang_code", "hi")
    try:
        audio_bytes = base64.b64decode(audio_b64)
        transcribed, translated = bhashini_asr_translate(audio_bytes, lang_code)
        return jsonify({"transcribed": transcribed, "translated": translated})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/ask", methods=["POST"])
def api_ask():
    data = request.json or {}
    question         = data.get("question", "")
    profile          = data.get("profile")
    is_comprehensive = data.get("is_comprehensive", False)
    try:
        if profile and is_comprehensive:
            prompt = generate_comprehensive_advisory(profile, question)
        else:
            prompt = question
        answer = ask_groq(prompt, is_comprehensive=is_comprehensive)
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/speak", methods=["POST"])
def api_speak():
    data = request.json or {}
    text_en   = data.get("text", "")
    lang_code = data.get("lang_code", "hi")
    try:
        translated_local, audio_bytes = bhashini_translate_tts(text_en, lang_code)
        audio_b64 = base64.b64encode(audio_bytes).decode()
        return jsonify({"translated": translated_local, "audio": audio_b64})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/bleu", methods=["POST"])
def api_bleu():
    data = request.json or {}
    reference = data.get("reference", "")
    candidate = data.get("candidate", "")
    try:
        scores = calculate_bleu_score(reference, candidate)
        return jsonify(scores)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/translate-field", methods=["POST"])
def api_translate_field():
    data = request.json or {}
    text     = data.get("text", "")
    tgt_lang = data.get("tgt_lang", "hi")
    try:
        translated = bhashini_translate_text(text, "en", tgt_lang)
        return jsonify({"translated": translated})
    except Exception as e:
        return jsonify({"error": str(e), "translated": text}), 200  # graceful fallback

# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print()
    print("=" * 60)
    print("  🌾  KisanAI - Farmer Voice Assistant")
    print("=" * 60)
    print(f"  Backend : ✅ index.py connected")
    print(f"  Frontend: http://localhost:5000")
    print("=" * 60)
    print()
    app.run(debug=True, host="0.0.0.0", port=5000, threaded=True)
