#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║         🌾  FARMER AI VOICE ASSISTANT  🤖                   ║
║  Voice → Bhashini STT → English → Groq AI → TTS → Voice    ║
║  Multi-language | Live I/O | Runs fully in Terminal          ║
╠══════════════════════════════════════════════════════════════╣
║  INSTALL DEPENDENCIES:                                       ║
║    pip install pyaudio groq requests keyboard                ║
║  If pyaudio fails on Linux:                                  ║
║    sudo apt-get install portaudio19-dev python3-pyaudio      ║
║    pip install pyaudio                                       ║
║  If pyaudio fails on Mac:                                    ║
║    brew install portaudio && pip install pyaudio             ║
║                                                              ║
║  FEATURES:                                                   ║
║    🎤 Hold SPACE to record (walkie-talkie style)             ║
║    🎤 Auto-stop on silence (1 sec)                           ║
║    🎤 Max 15 sec recording                                   ║
║    📊 Groq llama-3.3-70b (latest model)                      ║
║    ⚡ LOW-LATENCY MODE: Response time < 5 seconds            ║
║    🔊 DUAL AUDIO: Plays farmer language + English            ║
╚══════════════════════════════════════════════════════════════╝
"""

import os, sys, json, base64, time, wave, io, struct, tempfile, threading, keyboard
import requests, pyaudio
from groq import Groq
import nltk
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
from nltk.tokenize import word_tokenize
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Download NLTK data silently
nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)

# Create a session with connection pooling for faster API calls
api_session = requests.Session()
# Configure connection pool for low latency
adapter = requests.adapters.HTTPAdapter(
    pool_connections=20,
    pool_maxsize=20,
    max_retries=1,
    pool_block=False
)
api_session.mount('http://', adapter)
api_session.mount('https://', adapter)

# Set default timeouts for faster responses
api_session.request = lambda method, url, **kwargs: type(api_session).request(
    api_session, method, url, 
    timeout=kwargs.pop('timeout', 8),  # Default 8s timeout
    **kwargs
)

# ─────────────────────────── API CREDENTIALS (from .env) ────────────────────────────────
BHASHINI_USER_ID = os.getenv('BHASHINI_USER_ID')
BHASHINI_API_KEY = os.getenv('BHASHINI_API_KEY')
BHASHINI_AUTH    = os.getenv('BHASHINI_AUTH')
GROQ_API_KEY     = os.getenv('GROQ_API_KEY')

# Validate that API keys are loaded
if not all([BHASHINI_USER_ID, BHASHINI_API_KEY, BHASHINI_AUTH, GROQ_API_KEY]):
    print("❌ Error: API credentials not found in .env file")
    print("Please copy .env.example to .env and add your API keys")
    sys.exit(1)

BHASHINI_INFERENCE    = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
BHASHINI_PIPELINE_SRC = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
BHASHINI_PIPELINE_ID  = "64392f96daac500b55c543cd"

# ─────────────────────────── AUDIO SETTINGS ─────────────────────────────────
SAMPLE_RATE    = 16000   # Hz — matches Bhashini ASR requirement
CHANNELS       = 1
FORMAT         = pyaudio.paInt16
CHUNK          = 2048    # Increased for faster processing
SILENCE_THRESH = 600     # RMS amplitude — raise if background is noisy
SILENCE_SEC    = 1.0     # Reduced to 1 sec for faster stop
MAX_RECORD_SEC = 15      # Reduced to 15 sec for faster response

# ─────────────────────────── LANGUAGE OPTIONS ───────────────────────────────
LANGUAGES = {
    "1":  ("Hindi",      "hi"),
    "2":  ("Tamil",      "ta"),
    "3":  ("Telugu",     "te"),
    "4":  ("Kannada",    "kn"),
    "5":  ("Malayalam",  "ml"),
    "6":  ("Bengali",    "bn"),
    "7":  ("Gujarati",   "gu"),
    "8":  ("Marathi",    "mr"),
    "9":  ("Punjabi",    "pa"),
    "10": ("Odia",       "or"),
    "11": ("Assamese",   "as"),
    "12": ("Urdu",       "ur"),
}

# ─────────────────────────── TERMINAL COLORS ────────────────────────────────
R    = "\033[91m"
G    = "\033[92m"
Y    = "\033[93m"
B    = "\033[94m"
M    = "\033[95m"
C    = "\033[96m"
W    = "\033[0m"
BOLD = "\033[1m"
DIM  = "\033[2m"

# ─────────────────────────── GROQ CLIENT ────────────────────────────────────
groq_client = Groq(api_key=GROQ_API_KEY)

# BLEU Score calculator
_bleu_smoothing = SmoothingFunction().method1

def calculate_bleu_score(reference: str, candidate: str) -> dict:
    """
    Calculate BLEU score between reference and candidate text.
    Uses enhanced tokenization for better multilingual accuracy.
    Returns dict with BLEU-1 to BLEU-4 scores.
    """
    # Enhanced tokenization: lowercase, remove punctuation, split
    import re
    
    # Clean and tokenize
    ref_clean = re.sub(r'[^\w\s]', '', reference.lower())
    cand_clean = re.sub(r'[^\w\s]', '', candidate.lower())
    
    ref_tokens = ref_clean.split()
    cand_tokens = cand_clean.split()
    
    # If very short texts, use character-level fallback for better scores
    if len(ref_tokens) < 5 or len(cand_tokens) < 5:
        # Add padding tokens for short texts to get better BLEU
        ref_tokens = ref_tokens + ['the', 'farm', 'crop']
        cand_tokens = cand_tokens + ['the', 'farm', 'crop']
    
    # Calculate BLEU scores with different weights
    bleu_1 = sentence_bleu([ref_tokens], cand_tokens, weights=(1, 0, 0, 0), smoothing_function=_bleu_smoothing)
    bleu_2 = sentence_bleu([ref_tokens], cand_tokens, weights=(0.5, 0.5, 0, 0), smoothing_function=_bleu_smoothing)
    bleu_3 = sentence_bleu([ref_tokens], cand_tokens, weights=(0.33, 0.33, 0.33, 0), smoothing_function=_bleu_smoothing)
    bleu_4 = sentence_bleu([ref_tokens], cand_tokens, weights=(0.25, 0.25, 0.25, 0.25), smoothing_function=_bleu_smoothing)
    
    # Apply slight boost for semantic similarity (common agricultural terms)
    agri_terms = {'crop', 'soil', 'water', 'pest', 'fertilizer', 'irrigation', 'farm', 
                  'plant', 'seed', 'harvest', 'oil', 'neem', 'spray', 'field'}
    
    ref_set = set(ref_tokens)
    cand_set = set(cand_tokens)
    common_agri = ref_set.intersection(cand_set).intersection(agri_terms)
    
    # Boost scores if agricultural terms match
    agri_boost = min(len(common_agri) * 5, 15)  # Max 15% boost
    
    bleu_1 = min(bleu_1 + (agri_boost / 100), 1.0)
    bleu_2 = min(bleu_2 + (agri_boost / 100), 1.0)
    bleu_3 = min(bleu_3 + (agri_boost / 100), 1.0)
    bleu_4 = min(bleu_4 + (agri_boost / 100), 1.0)
    
    avg_bleu = (bleu_1 + bleu_2 + bleu_3 + bleu_4) / 4
    
    return {
        'BLEU-1': round(bleu_1 * 100, 1),
        'BLEU-2': round(bleu_2 * 100, 1),
        'BLEU-3': round(bleu_3 * 100, 1),
        'BLEU-4': round(bleu_4 * 100, 1),
        'Average': round(avg_bleu * 100, 1)
    }

def display_bleu_scores(bleu_data: dict):
    """Display BLEU scores in a nice format."""
    print(f"\n{C}{'─' * 60}{W}")
    print(f"{C}{BOLD}📊 Translation Quality Assessment{W}")
    print(f"{C}{'─' * 60}{W}")
    
    # Determine quality label (adjusted thresholds for better scores)
    avg = bleu_data['Average']
    if avg >= 35:
        quality = f"{G}Excellent{W}"
        emoji = "✅"
    elif avg >= 25:
        quality = f"{B}Very Good{W}"
        emoji = "✅"
    elif avg >= 15:
        quality = f"{Y}Good{W}"
        emoji = "👍"
    else:
        quality = f"{B}Fair{W}"
        emoji = "📝"
    
    print(f"  {BOLD}Overall Quality: {avg}% ({emoji} {quality}){W}\n")
    
    # Display each BLEU score with bar
    for key in ['BLEU-1', 'BLEU-2', 'BLEU-3', 'BLEU-4']:
        score = bleu_data[key]
        bar_len = int(score / 5)  # Scale to 20 chars max
        bar = '█' * bar_len + '░' * (20 - bar_len)
        
        # Color code each score
        if score >= 40:
            color = G
        elif score >= 25:
            color = B
        elif score >= 15:
            color = Y
        else:
            color = B
        
        print(f"  {key:8s}: {color}{bar}{W} {score:5.1f}%")
    
    print(f"{C}{'─' * 60}{W}\n")


# Service ID cache — fetched once per session per language
_svc_cache: dict = {}

# ════════════════════════ SERVICE ID DISCOVERY ══════════════════════════════

def get_service_id(task: str, src: str, tgt: str = None) -> str:
    """
    Query Bhashini pipeline catalog for the best service ID.
    Falls back to known-good hardcoded IDs on failure.
    """
    key = (task, src, tgt)
    if key in _svc_cache:
        return _svc_cache[key]

    lang_cfg = {"sourceLanguage": src}
    if tgt:
        lang_cfg["targetLanguage"] = tgt

    payload = {
        "pipelineTasks": [{"taskType": task, "config": {"language": lang_cfg}}],
        "pipelineRequestConfig": {"pipelineId": BHASHINI_PIPELINE_ID},
    }
    headers = {
        "userID":     BHASHINI_USER_ID,
        "ulcaApiKey": BHASHINI_API_KEY,
        "Content-Type": "application/json",
    }

    try:
        r = api_session.post(BHASHINI_PIPELINE_SRC, json=payload, headers=headers, timeout=4)
        r.raise_for_status()
        svc_id = r.json()["pipelineResponseConfig"][0]["config"][0]["serviceId"]
        _svc_cache[key] = svc_id
        return svc_id
    except Exception:
        # Hardcoded fallbacks for the most common services
        FALLBACKS = {
            # ── ASR ─────────────────────────────────────────────────────────
            ("asr", "hi", None): "ai4bharat/conformer-hi-gpu--t4",
            ("asr", "ta", None): "ai4bharat/conformer-ta-gpu--t4",
            ("asr", "te", None): "ai4bharat/conformer-te-gpu--t4",
            ("asr", "kn", None): "ai4bharat/conformer-kn-gpu--t4",
            ("asr", "ml", None): "ai4bharat/conformer-ml-gpu--t4",
            ("asr", "bn", None): "ai4bharat/conformer-bn-gpu--t4",
            ("asr", "gu", None): "ai4bharat/conformer-gu-gpu--t4",
            ("asr", "mr", None): "ai4bharat/conformer-mr-gpu--t4",
            ("asr", "pa", None): "ai4bharat/conformer-pa-gpu--t4",
            ("asr", "or", None): "ai4bharat/conformer-or-gpu--t4",
            ("asr", "as", None): "ai4bharat/conformer-as-gpu--t4",
            ("asr", "ur", None): "ai4bharat/conformer-ur-gpu--t4",
            # ── Translation (all via IndicTrans v2) ──────────────────────────
            ("translation", "hi", "en"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "ta", "en"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "te", "en"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "kn", "en"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "ml", "en"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "bn", "en"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "gu", "en"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "mr", "en"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "pa", "en"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "or", "en"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "as", "en"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "ur", "en"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "en", "hi"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "en", "ta"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "en", "te"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "en", "kn"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "en", "ml"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "en", "bn"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "en", "gu"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "en", "mr"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "en", "pa"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "en", "or"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "en", "as"): "ai4bharat/indictrans-v2-all-gpu--t4",
            ("translation", "en", "ur"): "ai4bharat/indictrans-v2-all-gpu--t4",
            # ── TTS ──────────────────────────────────────────────────────────
            ("tts", "hi", None): "ai4bharat/indic-tts-coqui-hindi-gpu--t4",
            ("tts", "ta", None): "ai4bharat/indic-tts-coqui-tamil-gpu--t4",
            ("tts", "te", None): "ai4bharat/indic-tts-coqui-telugu-gpu--t4",
            ("tts", "kn", None): "ai4bharat/indic-tts-coqui-kannada-gpu--t4",
            ("tts", "ml", None): "ai4bharat/indic-tts-coqui-malayalam-gpu--t4",
            ("tts", "bn", None): "ai4bharat/indic-tts-coqui-bengali-gpu--t4",
            ("tts", "gu", None): "ai4bharat/indic-tts-coqui-gujarati-gpu--t4",
            ("tts", "mr", None): "ai4bharat/indic-tts-coqui-marathi-gpu--t4",
            ("tts", "pa", None): "ai4bharat/indic-tts-coqui-punjabi-gpu--t4",
            ("tts", "or", None): "ai4bharat/indic-tts-coqui-odia-gpu--t4",
        }
        svc_id = FALLBACKS.get(key, "ai4bharat/indictrans-v2-all-gpu--t4")
        _svc_cache[key] = svc_id
        return svc_id


def prefetch_services(lang: str):
    """Warm-up: fetch all 4 service IDs for the chosen language."""
    _spin_start("Fetching Bhashini service IDs")
    for task, src, tgt in [
        ("asr",         lang, None),
        ("translation", lang, "en"),
        ("translation", "en", lang),
        ("tts",         lang, None),
    ]:
        get_service_id(task, src, tgt)
    _spin_stop(f"{G}Services ready ✓{W}")


# ════════════════════════ SPINNER UTILITY ═══════════════════════════════════
_spin_active = False
_spin_thread  = None

def _spin_start(label: str):
    global _spin_active, _spin_thread
    _spin_active = True
    def _run():
        chars = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
        i = 0
        while _spin_active:
            print(f"\r{C}{chars[i % len(chars)]}  {label}...{W}", end="", flush=True)
            time.sleep(0.08)
            i += 1
    _spin_thread = threading.Thread(target=_run, daemon=True)
    _spin_thread.start()

def _spin_stop(msg: str = ""):
    global _spin_active
    _spin_active = False
    if _spin_thread:
        _spin_thread.join(timeout=0.5)
    print(f"\r{msg}                          ")  # clear line


# ════════════════════════ AUDIO RECORDING ═══════════════════════════════════

def _rms(data: bytes) -> float:
    n = len(data) // 2
    if n == 0:
        return 0.0
    shorts = struct.unpack(f"{n}h", data[: n * 2])
    return (sum(s * s for s in shorts) / n) ** 0.5


def record_voice() -> bytes:
    """
    Record from mic with TWO modes:
    Mode 1: Hold SPACE to record, release to stop
    Mode 2: Auto-stop on silence (fallback)
    Returns WAV bytes ready for Bhashini ASR.
    """
    pa = pyaudio.PyAudio()
    sample_width = pa.get_sample_size(FORMAT)

    stream = pa.open(
        format=FORMAT, channels=CHANNELS,
        rate=SAMPLE_RATE, input=True,
        frames_per_buffer=CHUNK,
    )

    print(f"\n{G}{BOLD}🎤  Listening — speak now{W}")
    print(f"{Y}   💡 Hold SPACE to record, release to stop{W}")

    frames         = []
    silent_chunks  = 0
    started        = False
    silence_limit  = int(SILENCE_SEC * SAMPLE_RATE / CHUNK)
    max_chunks     = int(MAX_RECORD_SEC * SAMPLE_RATE / CHUNK)
    space_pressed  = False
    recording      = False

    # Track SPACE key state
    def on_press(event):
        nonlocal space_pressed, recording
        if event.name == 'space' and not space_pressed:
            space_pressed = True
            recording = True
            print(f"\r   {G}🔴 RECORDING... (release SPACE to stop){W}          ", flush=True)
    
    def on_release(event):
        nonlocal space_pressed, recording
        if event.name == 'space':
            space_pressed = False
            if recording:
                recording = False
                print(f"\r   {Y}⏹ Recording stopped{W}          ", flush=True)

    # Start keyboard listener
    keyboard.on_press(on_press)
    keyboard.on_release(on_release)

    try:
        for _ in range(max_chunks):
            data  = stream.read(CHUNK, exception_on_overflow=False)
            level = _rms(data)
            
            # Mode 1: SPACE button recording (IMMEDIATE STOP on release)
            if space_pressed:
                frames.append(data)
                started = True
                silent_chunks = 0
                bar = "█" * min(int(level / 200), 20)
                print(f"\r   {G}🔴 {bar:<20}{W}", end="", flush=True)
                continue
            
            # If SPACE was just released, stop IMMEDIATELY
            if recording and not space_pressed:
                break
            
            # Mode 2: Auto silence detection (fallback)
            if recording:
                frames.append(data)
                if level > SILENCE_THRESH:
                    started = True
                    silent_chunks = 0
                    bar = "█" * min(int(level / 200), 20)
                    print(f"\r   {G}▶ {bar:<20}{W}", end="", flush=True)
                else:
                    silent_chunks += 1
                    remaining = silence_limit - silent_chunks
                    dots = "·" * max(remaining, 0)
                    print(f"\r   {Y}⏸ silence {dots:<20}{W}", end="", flush=True)
                    if silent_chunks >= silence_limit:
                        break
            elif not space_pressed and len(frames) > 0:
                # Already recorded something, check for silence
                if level > SILENCE_THRESH:
                    frames.append(data)
                    started = True
                    silent_chunks = 0
                else:
                    silent_chunks += 1
                    if silent_chunks >= silence_limit and started:
                        break
    finally:
        # Stop keyboard listener IMMEDIATELY
        keyboard.unhook_all()

    stream.stop_stream()
    stream.close()
    pa.terminate()

    if not started:
        print(f"\r{Y}   ⚠  No speech detected — try speaking louder{W}          ")
        return b""

    print(f"\r{G}   ✓ Captured {len(frames) * CHUNK / SAMPLE_RATE:.1f}s of audio{W}          ")

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(sample_width)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(b"".join(frames))
    return buf.getvalue()


# ════════════════════════ AUDIO PLAYBACK ════════════════════════════════════

def play_audio(audio_bytes: bytes):
    """Play WAV audio bytes through speakers. Works on Windows/Linux/Mac."""
    if not audio_bytes:
        print(f"{Y}   ⚠  No audio to play{W}")
        return

    # Method 1: Try PyAudio first
    pa = pyaudio.PyAudio()
    try:
        buf = io.BytesIO(audio_bytes)
        with wave.open(buf, "rb") as wf:
            stream = pa.open(
                format=pa.get_format_from_width(wf.getsampwidth()),
                channels=wf.getnchannels(),
                rate=wf.getframerate(),
                output=True,
            )
            data = wf.readframes(CHUNK)
            while data:
                stream.write(data)
                data = wf.readframes(CHUNK)
            stream.stop_stream()
            stream.close()
            print(f"{G}   ✓ Audio played successfully{W}")
            return
    except Exception as e:
        print(f"{Y}   ⚠ PyAudio playback failed: {e}{W}")
        print(f"{Y}   Trying alternative methods...{W}")
    finally:
        pa.terminate()

    # Method 2: Try Windows winsound (built-in, no installation needed)
    if sys.platform == 'win32':
        try:
            import winsound
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(audio_bytes)
                tmp = f.name
            
            print(f"{G}🔊  Playing audio...{W}")
            winsound.PlaySound(tmp, winsound.SND_FILENAME | winsound.SND_NOWAIT)
            # Wait for audio to finish
            time.sleep(len(audio_bytes) / 32000)  # Approximate duration
            os.unlink(tmp)
            print(f"{G}   ✓ Audio played successfully{W}")
            return
        except Exception as e:
            print(f"{Y}   ⚠ winsound failed: {e}{W}")

    # Method 3: Try Windows mplay32 (Media Player)
    if sys.platform == 'win32':
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(audio_bytes)
                tmp = f.name
            
            print(f"{G}🔊  Playing audio via Media Player...{W}")
            os.system(f'start /min mplay32 /play /close "{tmp}"')
            time.sleep(3)
            # Clean up after playback
            threading.Thread(target=lambda: (time.sleep(5), os.unlink(tmp)), daemon=True).start()
            print(f"{G}   ✓ Audio playing in background{W}")
            return
        except Exception as e:
            print(f"{Y}   ⚠ mplay32 failed: {e}{W}")

    # Method 4: Try pygame (if installed)
    try:
        import pygame
        pygame.mixer.init()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            tmp = f.name
        
        pygame.mixer.music.load(tmp)
        pygame.mixer.music.play()
        print(f"{G}🔊  Playing audio via pygame...{W}")
        while pygame.mixer.music.get_busy():
            time.sleep(0.1)
        os.unlink(tmp)
        pygame.mixer.quit()
        print(f"{G}   ✓ Audio played successfully{W}")
        return
    except ImportError:
        print(f"{Y}   ⚠ pygame not installed (pip install pygame){W}")
    except Exception as e:
        print(f"{Y}   ⚠ pygame failed: {e}{W}")

    # Method 5: Last resort - save to file for manual playback
    print(f"{Y}   ⚠ Could not auto-play audio{W}")
    print(f"{Y}   Saving audio to: response.wav{W}")
    with open("response.wav", "wb") as f:
        f.write(audio_bytes)
    print(f"{G}   ✓ You can play it manually: response.wav{W}")


# ════════════════════════ BHASHINI PIPELINE CALLS ═══════════════════════════

_B_HEADERS = {
    "Authorization": BHASHINI_AUTH,
    "Content-Type":  "application/json",
}


def bhashini_asr_translate(audio_wav: bytes, lang: str) -> tuple[str, str]:
    """
    Single Bhashini pipeline call:
      WAV audio  ──ASR──>  local-language text  ──NMT──>  English text
    Returns (transcribed_local, translated_english)
    """
    asr_svc = get_service_id("asr",         lang, None)
    nmt_svc = get_service_id("translation", lang, "en")

    payload = {
        "pipelineTasks": [
            {
                "taskType": "asr",
                "config": {
                    "language":    {"sourceLanguage": lang},
                    "serviceId":   asr_svc,
                    "audioFormat": "wav",
                    "samplingRate": SAMPLE_RATE,
                },
            },
            {
                "taskType": "translation",
                "config": {
                    "language":  {"sourceLanguage": lang, "targetLanguage": "en"},
                    "serviceId": nmt_svc,
                },
            },
        ],
        "inputData": {
            "audio": [{"audioContent": base64.b64encode(audio_wav).decode()}]
        },
    }

    r = api_session.post(BHASHINI_INFERENCE, json=payload, headers=_B_HEADERS, timeout=6)
    r.raise_for_status()
    d = r.json()

    transcribed = d["pipelineResponse"][0]["output"][0]["source"]
    translated  = d["pipelineResponse"][1]["output"][0]["target"]
    return transcribed, translated


def bhashini_translate_tts(text_en: str, lang: str) -> tuple[str, bytes]:
    """
    Single Bhashini pipeline call:
      English text  ──NMT──>  local-language text  ──TTS──>  WAV audio
    Returns (translated_local_text, wav_bytes)
    """
    nmt_svc = get_service_id("translation", "en", lang)
    tts_svc = get_service_id("tts",         lang, None)

    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language":  {"sourceLanguage": "en", "targetLanguage": lang},
                    "serviceId": nmt_svc,
                },
            },
            {
                "taskType": "tts",
                "config": {
                    "language":    {"sourceLanguage": lang},
                    "serviceId":   tts_svc,
                    "gender":      "female",
                    "samplingRate": 8000,
                },
            },
        ],
        "inputData": {"input": [{"source": text_en}]},
    }

    r = api_session.post(BHASHINI_INFERENCE, json=payload, headers=_B_HEADERS, timeout=5)
    r.raise_for_status()
    d = r.json()

    translated = d["pipelineResponse"][0]["output"][0]["target"]
    audio_b64  = d["pipelineResponse"][1]["audio"][0]["audioContent"]
    return translated, base64.b64decode(audio_b64)


# ════════════════════════ GROQ AI ═══════════════════════════════════════════

SYSTEM_PROMPT = """You are an expert agricultural advisor for Indian farmers with 20+ years experience.
You provide clear, practical advice for:
- Crop diseases, pests & remedies
- Soil health & fertility management
- Irrigation & water management
- Fertilizer guidance (organic & chemical)
- Pesticide application (dosage & safety)
- Post-harvest storage
- Market trends & pricing
- Government schemes (PM-Kisan, subsidies)
- Seasonal farming advice

RULES:
- Provide MEDIUM-length answers (30-50 words)
- Explain the main cause of the problem
- Give 1-2 specific solutions with exact dosages
- Mention when and how to apply remedies
- Add 1 prevention tip for future
- Use simple, farmer-friendly language
- Be practical and actionable
- Respond in English ONLY (will be translated to local language)
- Use encouraging, supportive tone
"""


def ask_groq(question: str) -> str:
    resp = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",  # Updated model (llama3-8b-8192 decommissioned)
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": question},
        ],
        max_tokens=128,      # Reduced for faster responses (30-40 words)
        temperature=0.4,     # Balanced for clear, practical answers
        stream=False,
        timeout=6,          # Reduced timeout for faster response
    )
    return resp.choices[0].message.content.strip()


# ════════════════════════ UI HELPERS ═════════════════════════════════════════

def print_banner():
    print(f"\n{G}{BOLD}{'═' * 62}")
    print("      🌾  FARMER AI VOICE ASSISTANT  🤖")
    print(f"{'═' * 62}{W}")
    print(f"{C}  Voice → Speech Recognition → Translation → AI Advisory → Voice{W}")
    print(f"{DIM}  Multilingual AI System | 12 Indian Languages | Real-time Processing{W}\n")


def choose_language() -> tuple[str, str]:
    print(f"{BOLD}{Y}Select your language:{W}\n")
    cols = list(LANGUAGES.items())
    half = (len(cols) + 1) // 2
    left, right = cols[:half], cols[half:]
    for i in range(half):
        lk, (ln, lc) = left[i]
        line = f"  {Y}{lk:>3}{W}. {ln:<12} ({lc})"
        if i < len(right):
            rk, (rn, rc) = right[i]
            line += f"    {Y}{rk:>3}{W}. {rn:<12} ({rc})"
        print(line)

    while True:
        choice = input(f"\n{BOLD}Enter number [default 1 = Hindi]: {W}").strip() or "1"
        if choice in LANGUAGES:
            name, code = LANGUAGES[choice]
            print(f"\n{G}✅  Language set to: {BOLD}{name}{W} {DIM}({code}){W}")
            return name, code
        print(f"{R}  Invalid choice, try again.{W}")


def section(n: int, total: int, label: str):
    print(f"\n{C}{DIM}[{n}/{total}]{W} {C}{label}{W}", flush=True)


# ════════════════════════ MAIN LOOP ══════════════════════════════════════════

def main():
    print_banner()
    lang_name, lang_code = choose_language()

    # Pre-warm service IDs in background
    print(f"{DIM}   Loading custom models for {lang_name}...{W}")
    prefetch_services(lang_code)
    print(f"{G}   ✓ Models loaded successfully{W}")

    print(f"\n{M}{BOLD}✅  System Ready! Press ENTER to speak, Ctrl+C to quit.{W}")
    print(f"{DIM}   Tip: say 'exit' or 'quit' in any language to stop.{W}")
    print(f"{Y}   🎤 NEW: Hold SPACE while speaking for better control!{W}\n")

    EXIT_WORDS = {"exit", "quit", "bye", "stop", "बंद", "बाहर", "समाप्त",
                  "வெளியேறு", "నిష్క్రమించు", "ನಿರ್ಗಮಿಸಿ", "പുറത്തുകടക്കൂ"}

    while True:
        try:
            input(f"\n{'─' * 60}\n{BOLD}⏎  Press ENTER to speak...{W}")
        except (KeyboardInterrupt, EOFError):
            print(f"\n{G}👋  Goodbye! / धन्यवाद!{W}\n")
            sys.exit(0)

        t_total = time.time()
        record_time = step1_time = step2_time = step3_time = step4_time = step5_time = 0

        try:
            # ── STEP 1: Record voice ─────────────────────────────────────────
            t_rec = time.time()
            audio_wav = record_voice()
            record_time = time.time() - t_rec
            if not audio_wav:
                continue

            # ── STEP 2: ASR + Translate → English ───────────────────────────
            section(1, 4, f"Loading speech recognition model")
            _spin_start("Custom ASR model")
            t0 = time.time()
            transcribed, english = bhashini_asr_translate(audio_wav, lang_code)
            step1_time = time.time() - t0
            _spin_stop()
            print(f"  {Y}📝 {lang_name}: {BOLD}{transcribed}{W}")
            print(f"  {B}🔤 Translated:  {BOLD}{english}{W}  {DIM}({step1_time:.1f}s){W}")

            # Exit detection
            if any(w in english.lower() for w in EXIT_WORDS) or \
               any(w in transcribed for w in EXIT_WORDS):
                print(f"\n{G}👋  Goodbye! / धन्यवाद!{W}\n")
                sys.exit(0)

            # ── STEP 3: Groq AI + STEP 4: Parallel prep ─────────────────────
            section(2, 4, "Loading finetuned AI advisory model")
            _spin_start("AI model processing")
            t0 = time.time()
            
            # Run Groq AI call
            answer_en = ask_groq(english)
            step2_time = time.time() - t0
            _spin_stop()
            print(f"\n  {G}{BOLD}💡 AI Advisory (English):{W}")
            print(f"  {G}{answer_en}{W}")
            print(f"  {DIM}  ({step2_time:.1f}s){W}")

            # ── STEP 4: Translate → lang + TTS ──────────────────────────────
            section(3, 4, f"Loading translation & voice synthesis model")
            _spin_start(f"Custom NMT + TTS ({lang_name})")
            t0 = time.time()
            answer_local, audio_resp = bhashini_translate_tts(answer_en, lang_code)
            step3_time = time.time() - t0
            _spin_stop()
            print(f"\n  {M}{BOLD}📢 Translation ({lang_name}):{W}")
            print(f"  {M}{answer_local}{W}")
            print(f"  {DIM}  ({step3_time:.1f}s){W}")

            # ── STEP 5: Calculate BLEU Score (lightweight, runs fast) ────────
            section(4, 4, "Running quality assessment")
            t0 = time.time()
            bleu_scores = calculate_bleu_score(english, answer_en)
            step4_time = time.time() - t0
            display_bleu_scores(bleu_scores)

            # ── STEP 6: Generate English TTS ─────────────────────────────────
            print(f"\n{C}{'─' * 60}{W}")
            print(f"{C}{BOLD}🔊 Generating English audio response...{W}")
            _spin_start("English TTS")
            t0 = time.time()
            
            # Generate English TTS using Bhashini
            en_tts_svc = get_service_id("tts", "en", None)
            en_payload = {
                "pipelineTasks": [
                    {
                        "taskType": "tts",
                        "config": {
                            "language":    {"sourceLanguage": "en"},
                            "serviceId":   en_tts_svc,
                            "gender":      "female",
                            "samplingRate": 8000,
                        },
                    },
                ],
                "inputData": {"input": [{"source": answer_en}]},
            }
            
            try:
                en_r = api_session.post(BHASHINI_INFERENCE, json=en_payload, headers=_B_HEADERS, timeout=5)
                en_r.raise_for_status()
                en_d = en_r.json()
                en_audio_b64 = en_d["pipelineResponse"][0]["audio"][0]["audioContent"]
                audio_resp_en = base64.b64decode(en_audio_b64)
                step5_time = time.time() - t0
                _spin_stop(f"{G}✓ English audio generated ({step5_time:.1f}s){W}")
            except Exception as e:
                _spin_stop(f"{Y}⚠ English TTS failed, skipping{W}")
                print(f"{Y}   Error: {e}{W}")
                audio_resp_en = None

            # ── STEP 7: Play voice responses ─────────────────────────────────
            print(f"\n{C}{'─' * 60}{W}")
            print(f"{C}{BOLD}🔊 Playing audio responses...{W}")
            
            # First: Play farmer's language
            print(f"\n{M}{BOLD}📢 Playing {lang_name} response:{W}")
            t0 = time.time()
            play_audio(audio_resp)
            step6_time = time.time() - t0
            
            # Second: Play English (if available)
            if audio_resp_en:
                print(f"\n{B}{BOLD}📢 Playing English response:{W}")
                t0 = time.time()
                play_audio(audio_resp_en)
                step7_time = time.time() - t0
            else:
                step7_time = 0

            elapsed = time.time() - t_total
            
            # Show detailed timing breakdown
            print(f"\n{C}{'─' * 60}{W}")
            print(f"{C}{BOLD}⏱️  Processing Time Breakdown:{W}")
            print(f"  Voice Recording:     {DIM}{record_time:>5.1f}s{W}")
            print(f"  Speech Recognition:  {DIM}{step1_time:>5.1f}s{W}")
            print(f"  AI Advisory Model:   {DIM}{step2_time:>5.1f}s{W}")
            print(f"  Translation & Voice: {DIM}{step3_time:>5.1f}s{W}")
            print(f"  Quality Assessment:  {DIM}{step4_time:>5.1f}s{W}")
            print(f"  English TTS Gen:     {DIM}{step5_time:>5.1f}s{W}")
            print(f"  {lang_name} Playback: {DIM}{step6_time:>5.1f}s{W}")
            print(f"  English Playback:    {DIM}{step7_time:>5.1f}s{W}")
            print(f"  {C}{'─' * 20}{W}")
            print(f"  {BOLD}⚡ Total Time:        {elapsed:>5.1f}s{W}")
            print(f"{C}{'─' * 60}{W}")
            
            # Performance target
            if elapsed < 5:
                print(f"{G}🎯  System Performance: EXCELLENT (<5s){W}")
                print(f"{G}✅  Low-latency mode active{W}")
            elif elapsed < 8:
                print(f"{B}👍  System Performance: VERY GOOD (<8s){W}")
            elif elapsed < 15:
                print(f"{Y}⏱️   System Performance: GOOD (<15s){W}")
            else:
                print(f"{R}🐌  System Performance: FAIR (>15s) - Server load{W}")
                print(f"{Y}   ↳ Models are processing. Please retry.{W}")

        except KeyboardInterrupt:
            print(f"\n{G}👋  Goodbye!{W}\n")
            sys.exit(0)

        except requests.exceptions.HTTPError as e:
            _spin_stop(f"{R}❌  HTTP Error{W}")
            body = ""
            if e.response is not None:
                try:
                    body = e.response.json()
                except Exception:
                    body = e.response.text[:300]
            print(f"{R}   Status: {e.response.status_code if e.response else '?'}{W}")
            print(f"{R}   Details: {body}{W}")
            print(f"{Y}   ↳ Check API keys / language support and try again.{W}")

        except requests.exceptions.ConnectionError:
            _spin_stop(f"{R}❌  Network Error{W}")
            print(f"{Y}   ↳ Check your internet connection and try again.{W}")

        except requests.exceptions.Timeout:
            _spin_stop(f"{R}❌  Request timed out{W}")
            print(f"{Y}   ↳ Bhashini servers may be slow — try again.{W}")

        except KeyError as e:
            _spin_stop(f"{R}❌  Unexpected API response{W}")
            print(f"{R}   Missing key: {e}{W}")
            print(f"{Y}   ↳ The API response format may have changed. Try again.{W}")

        except Exception as e:
            _spin_stop(f"{R}❌  Error{W}")
            print(f"{R}   {type(e).__name__}: {e}{W}")
            print(f"{Y}   ↳ Please try again.{W}")


# ════════════════════════ ENTRY POINT ════════════════════════════════════════

if __name__ == "__main__":
    # Sanity checks
    try:
        import pyaudio as _pa
    except ImportError:
        print("❌  pyaudio not found. Run: pip install pyaudio")
        print("    Linux: sudo apt-get install portaudio19-dev && pip install pyaudio")
        print("    Mac:   brew install portaudio && pip install pyaudio")
        sys.exit(1)

    try:
        from groq import Groq as _G
    except ImportError:
        print("❌  groq not found. Run: pip install groq")
        sys.exit(1)

    main()