import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import { voiceService } from '../services/voiceService';
import { geminiService } from '../services/geminiService';
import { voiceAssistantApi } from '../services/voiceAssistantApiService';
import { weatherService } from '../services/weatherService';
import { intentService } from '../services/intentService';
import { Mic, X, MessageSquare, Loader2, Send, Wifi, WifiOff } from 'lucide-react';

const VoiceAssistant: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { language, user, isVoiceEnabled, isAssistantOpen, setAssistantOpen, setView } = context;

  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([]);
  const [processing, setProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-listen when opened
  useEffect(() => {
    if (isAssistantOpen && isVoiceEnabled) {
      startListening();
    }
  }, [isAssistantOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, processing]);

  // Check whether the voice_assistant backend is reachable on first open
  useEffect(() => {
    if (!isAssistantOpen || backendOnline !== null) return;
    voiceAssistantApi.isOnline().then(setBackendOnline);
  }, [isAssistantOpen, backendOnline]);

  const startListening = () => {
    setIsListening(true);
    voiceService.listen(
      language,
      (transcript) => {
        setIsListening(false);
        handleUserCommand(transcript);
      },
      () => setIsListening(false)
    );
  };

  const handleSendText = () => {
    if (!inputText.trim()) return;
    handleUserCommand(inputText);
    setInputText('');
  };

  const handleUserCommand = async (command: string) => {
    setMessages(prev => [...prev, { role: 'user', text: command }]);
    setProcessing(true);

    // ── 1. Intent Detection (Navigation) ─────────────────────────────
    const { intent, replyKey, targetView } = intentService.processIntent(command, language);

    if (intent !== 'UNKNOWN' && targetView) {
      const reply = intentService.getResponse(replyKey, language);
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
      setProcessing(false);

      if (isVoiceEnabled) voiceService.speak(reply, language);

      setTimeout(() => {
        setView(targetView);
        setAssistantOpen(false);
      }, 2000);
      return;
    }

    // ── 2. Route to voice_assistant backend (primary) ─────────────────
    if (user && backendOnline) {
      try {
        const reply = await voiceAssistantApi.chat(user, command, language);
        setProcessing(false);
        setMessages(prev => [...prev, { role: 'bot', text: reply }]);
        if (isVoiceEnabled) voiceService.speak(reply, language);
        return;
      } catch (err) {
        console.warn('[VoiceAssistant] Backend chat failed, falling back to Gemini:', err);
        // Fall through to local Gemini fallback
      }
    }

    // ── 3. Fallback — local Gemini via geminiService ───────────────────
    let contextData = `User: ${user?.name}, Crop: ${user?.primaryCrop}. `;
    if (user?.location) {
      const w = weatherService.getWeather(user.location.lat, user.location.lng);
      contextData += `Weather: ${w.temp}C, ${w.condition}. Alerts: ${w.alerts.map(a => a.type).join(', ') || 'None'}. `;
    }

    const response = await geminiService.askAssistant(command, contextData, language, user);
    setProcessing(false);
    setMessages(prev => [...prev, { role: 'bot', text: response }]);
    if (isVoiceEnabled) voiceService.speak(response, language);
  };

  if (!user) return null;

  return (
    <>
      {/* ── Floating trigger button ── */}
      {!isAssistantOpen && (
        <button
          onClick={() => setAssistantOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-[var(--brand-700)] text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform z-30 border-4 border-white"
          aria-label="Open Voice Assistant"
        >
          <Mic size={24} />
        </button>
      )}

      {/* ── Modal ── */}
      {isAssistantOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg mx-auto rounded-3xl shadow-2xl overflow-hidden h-[85vh] flex flex-col">

            {/* Header */}
            <div className="app-gradient p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <MessageSquare size={20} />
                <h3 className="font-bold text-base">Krishi AI — Farm Assistant</h3>
              </div>
              <div className="flex items-center gap-3">
                {/* Backend status indicator */}
                <span
                  title={backendOnline ? 'Advisory engine online' : 'Using local AI fallback'}
                  className="flex items-center gap-1 text-[11px] font-semibold bg-white/15 rounded-full px-2 py-0.5"
                >
                  {backendOnline === null
                    ? <Loader2 size={11} className="animate-spin" />
                    : backendOnline
                    ? <Wifi size={11} />
                    : <WifiOff size={11} />}
                  {backendOnline === null ? 'Checking…' : backendOnline ? 'Engine live' : 'Offline mode'}
                </span>
                <button onClick={() => setAssistantOpen(false)} aria-label="Close assistant">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-16 px-6">
                  <Mic size={56} className="mx-auto mb-5 opacity-20" />
                  <p className="text-base font-semibold mb-1">Ask Krishi anything</p>
                  <p className="text-xs text-gray-400 mb-4">
                    Powered by SmartAdvisory Engine — real weather, soil & market data
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      'When should I irrigate?',
                      'Pest risk this week?',
                      'Soil health advice',
                      'Best market time?',
                      'Check Disease',
                    ].map((hint) => (
                      <button
                        key={hint}
                        onClick={() => handleUserCommand(hint)}
                        className="bg-white border border-gray-200 px-3 py-1.5 rounded-full text-xs shadow-sm hover:border-[var(--brand-500)] hover:text-[var(--brand-700)] transition"
                      >
                        "{hint}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] p-3 px-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      m.role === 'user'
                        ? 'bg-[var(--brand-700)] text-white rounded-tr-none'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {processing && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl flex items-center gap-2 shadow-sm border border-gray-100">
                    <Loader2 className="animate-spin text-[var(--brand-700)]" size={16} />
                    <span className="text-xs font-medium text-gray-500">Krishi is thinking…</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Controls */}
            <div className="p-4 border-t bg-white flex items-center gap-2">
              <button
                onClick={startListening}
                className={`p-3 rounded-full transition-all shrink-0 ${
                  isListening
                    ? 'bg-red-500 animate-pulse shadow-red-200 shadow-lg'
                    : 'bg-[var(--brand-700)] shadow-md hover:bg-[var(--brand-500)]'
                }`}
                aria-label={isListening ? 'Listening…' : 'Start voice input'}
              >
                <Mic className="text-white" size={22} />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                placeholder={isListening ? 'Listening…' : 'Type your question…'}
                className="flex-1 p-3 pl-4 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] focus:bg-white transition-all text-sm"
                disabled={isListening}
              />

              <button
                onClick={handleSendText}
                disabled={!inputText.trim() || isListening}
                className="p-3 bg-[var(--brand-100)] text-[var(--brand-700)] rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--brand-700)] hover:text-white transition-colors"
                aria-label="Send message"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;
