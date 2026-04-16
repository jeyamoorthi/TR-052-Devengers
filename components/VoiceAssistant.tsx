import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import { voiceService } from '../services/voiceService';
import { geminiService } from '../services/geminiService';
import { vorkService } from '../services/vorkService';
import { weatherService } from '../services/weatherService';
import { intentService } from '../services/intentService';
import { Mic, X, MessageSquare, Loader2, Send } from 'lucide-react';

const VoiceAssistant: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { language, user, isVoiceEnabled, isAssistantOpen, setAssistantOpen, setView } = context;

  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([]);
  const [processing, setProcessing] = useState(false);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const workflowPattern =
    /\b(schedule|meeting|email|mail|whatsapp|task|remind|reminder|call|workflow)\b/i;

  // Auto-listen when opened
  useEffect(() => {
    if (isAssistantOpen && isVoiceEnabled) {
      startListening();
    }
  }, [isAssistantOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, processing]);

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
    setInputText("");
  };

  const handleUserCommand = async (command: string) => {
    setMessages(prev => [...prev, { role: 'user', text: command }]);
    setProcessing(true);

    // 1. Check Intent (Navigation / Action)
    const { intent, replyKey, targetView } = intentService.processIntent(command, language);

    if (intent !== 'UNKNOWN' && targetView) {
        // NAVIGATE
        const reply = intentService.getResponse(replyKey, language);
        setMessages(prev => [...prev, { role: 'bot', text: reply }]);
        setProcessing(false);
        
        if (isVoiceEnabled) {
            voiceService.speak(reply, language);
        }

        // Delay navigation slightly so user sees/hears response
        setTimeout(() => {
            setView(targetView);
            // We keep the assistant open so the user can continue interacting if they want, 
            // or they can close it. Some users might prefer auto-close:
             setAssistantOpen(false); 
        }, 2000);

    } else {
        // If request sounds like an automation intent, route through VorkAI workflow engine first.
        if (workflowPattern.test(command)) {
          try {
            const workflowResponse = await vorkService.runTextWorkflow(
              command,
              user?.uid || user?.id || 'smartagri_user'
            );
            const workflowText = workflowResponse.confidence
              ? `${workflowResponse.message}\n(Workflow confidence: ${(workflowResponse.confidence * 100).toFixed(0)}%)`
              : workflowResponse.message;

            setProcessing(false);
            setMessages(prev => [...prev, { role: 'bot', text: workflowText }]);
            if (isVoiceEnabled) {
              voiceService.speak(workflowResponse.message, language);
            }
            return;
          } catch (error) {
            // If workflow backend is down, gracefully continue to AI fallback.
            console.warn("Workflow fallback to Gemini:", error);
          }
        }

        // CHAT (Gemini Fallback)
        // Build Context for Gemini
        let contextData = `User: ${user?.name}, Crop: ${user?.primaryCrop}. `;
        if (user?.location) {
            const w = weatherService.getWeather(user.location.lat, user.location.lng);
            contextData += `Weather: ${w.temp}C, ${w.condition}. Alerts: ${w.alerts.map(a => a.type).join(', ') || 'None'}. `;
        }

        const response = await geminiService.askAssistant(command, contextData, language);
        setProcessing(false);
        setMessages(prev => [...prev, { role: 'bot', text: response }]);
        
        if (isVoiceEnabled) {
            voiceService.speak(response, language);
        }
    }
  };

  if (!user) return null; // Don't show on registration

  return (
    <>
      {/* Floating Button (Secondary trigger) */}
      {!isAssistantOpen && (
        <button
          onClick={() => setAssistantOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-green-600 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform z-30 border-4 border-white"
          aria-label="Open Voice Assistant"
        >
          <Mic size={24} />
        </button>
      )}

      {/* Modal Overlay */}
      {isAssistantOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg mx-auto rounded-3xl shadow-2xl overflow-hidden h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="bg-green-600 p-4 flex justify-between items-center text-white">
                <h3 className="font-bold flex items-center gap-2">
                    <MessageSquare size={20}/> Assistant
                </h3>
                <button onClick={() => setAssistantOpen(false)}><X /></button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-20 px-6">
                        <Mic size={64} className="mx-auto mb-6 opacity-20"/>
                        <p className="text-lg font-medium mb-2">Try saying...</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            <span className="bg-white border border-gray-200 px-3 py-1 rounded-full text-xs shadow-sm">"Check Disease"</span>
                            <span className="bg-white border border-gray-200 px-3 py-1 rounded-full text-xs shadow-sm">"Soil Health"</span>
                            <span className="bg-white border border-gray-200 px-3 py-1 rounded-full text-xs shadow-sm">"Market Price"</span>
                            <span className="bg-white border border-gray-200 px-3 py-1 rounded-full text-xs shadow-sm">"Weather"</span>
                        </div>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 px-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            m.role === 'user' 
                            ? 'bg-green-600 text-white rounded-tr-none' 
                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                        }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {processing && (
                    <div className="flex justify-start">
                        <div className="bg-white p-3 rounded-2xl flex items-center gap-2 shadow-sm border border-gray-100">
                            <Loader2 className="animate-spin text-green-600" size={16}/> 
                            <span className="text-xs font-medium text-gray-500">Processing...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Controls */}
            <div className="p-4 border-t bg-white flex items-center gap-2">
                <button 
                  onClick={startListening}
                  className={`p-3 rounded-full transition-all shrink-0 ${isListening ? 'bg-red-500 animate-pulse shadow-red-200 shadow-lg' : 'bg-green-600 shadow-md hover:bg-green-700'}`}
                >
                    <Mic className="text-white" size={24} />
                </button>
                
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  placeholder={isListening ? "Listening..." : "Type a command..."}
                  className="flex-1 p-3 pl-4 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-sm"
                  disabled={isListening}
                />
                
                <button 
                  onClick={handleSendText}
                  disabled={!inputText.trim() || isListening}
                  className="p-3 bg-green-100 text-green-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-200 transition-colors"
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
