import { Language } from '../types';

// Browser Speech Recognition Types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event) => void;
  onend: (event: Event) => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

class VoiceService {
  private get synthesis(): SpeechSynthesis | null {
    return typeof window !== 'undefined' ? window.speechSynthesis ?? null : null;
  }
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;

  constructor() {
    // Lazy-initialize: only access browser APIs after module loads
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition();
          if (this.recognition) {
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
          }
        } catch (e) {
          console.warn('Speech Recognition init failed:', e);
        }
      }
    }
  }

  speak(text: string, language: Language) {
    const synth = this.synthesis;
    if (!synth) return;
    if (synth.speaking) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Map internal language codes to BCP 47 tags for TTS
    switch (language) {
      case Language.HI: utterance.lang = 'hi-IN'; break;
      case Language.TA: utterance.lang = 'ta-IN'; break;
      case Language.TE: utterance.lang = 'te-IN'; break;
      case Language.ML: utterance.lang = 'ml-IN'; break;
      case Language.KN: utterance.lang = 'kn-IN'; break;
      case Language.MR: utterance.lang = 'mr-IN'; break;
      default: utterance.lang = 'en-US'; break;
    }
    synth.speak(utterance);
  }

  listen(language: Language, onResult: (text: string) => void, onError: () => void) {
    if (!this.recognition) {
      console.warn("Speech Recognition not supported in this browser");
      onError();
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      return;
    }

    // Map internal language codes to BCP 47 tags for STT
    switch (language) {
      case Language.HI: this.recognition.lang = 'hi-IN'; break;
      case Language.TA: this.recognition.lang = 'ta-IN'; break;
      case Language.TE: this.recognition.lang = 'te-IN'; break;
      case Language.ML: this.recognition.lang = 'ml-IN'; break;
      case Language.KN: this.recognition.lang = 'kn-IN'; break;
      case Language.MR: this.recognition.lang = 'mr-IN'; break;
      default: this.recognition.lang = 'en-US'; break;
    }

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      this.isListening = false;
    };

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error", event);
      this.isListening = false;
      onError();
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      console.error("Failed to start recognition", e);
      onError();
    }
  }
}

export const voiceService = new VoiceService();