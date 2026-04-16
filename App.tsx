import React, { useState, useEffect, createContext } from 'react';
import { UserProfile, Language, AppContextType } from './types';
import { voiceService } from './services/voiceService';
import { firebaseService } from './services/firebaseService';
import { UI_TEXT } from './services/knowledgeBase';

// Pages/Components
import Registration from './components/Registration';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import LanguageSelector from './components/LanguageSelector';
import VoiceAssistant from './components/VoiceAssistant';

export const AppContext = createContext<AppContextType | undefined>(undefined);

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [showLangSelector, setShowLangSelector] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isAssistantOpen, setAssistantOpen] = useState(false);
  const [currentView, setView] = useState('home');

  // Initialization: Check Persistence
  useEffect(() => {
    // 1. Check Language Preference
    const savedLang = localStorage.getItem('smartagri_lang');
    if (savedLang) {
      setLanguage(savedLang as Language);
      setShowLangSelector(false);
    }

    // 2. Check Auth Session (Firebase Simulation)
    const currentUser = firebaseService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (method: 'phone' | 'google', data: any) => {
    try {
      let u: UserProfile;
      if (method === 'phone') {
        u = await firebaseService.signInWithPhone(data.phone, data.otp);
      } else {
        u = await firebaseService.signInWithGoogle();
      }
      setUser(u);
      setIsAuthenticated(true);
      
      // Voice Greeting
      if (u.name) {
         voiceService.speak(`${UI_TEXT[language].welcome} ${u.name}`, language);
      }
    } catch (e) {
      console.error("Login failed", e);
      throw e;
    }
  };

  const handleLogout = () => {
    firebaseService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setView('home');
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('smartagri_lang', lang);
    setShowLangSelector(false);
    voiceService.speak(UI_TEXT[lang].welcome, lang);
  };

  // State Logic: What to render?
  const renderScreen = () => {
    if (showLangSelector) return <LanguageSelector onSelect={handleSetLanguage} />;
    
    if (!isAuthenticated) return <Login />;
    
    // If authenticated but no name/location, force registration
    if (user && (!user.name || !user.location.name)) {
      return <Registration />;
    }

    return <Dashboard />;
  };

  return (
    <AppContext.Provider value={{ 
      user, 
      setUser,
      language, 
      setLanguage: handleSetLanguage,
      isVoiceEnabled,
      toggleVoice: () => setIsVoiceEnabled((prev) => !prev),
      showLangSelector,
      setShowLangSelector,
      isAssistantOpen,
      setAssistantOpen,
      currentView,
      setView,
      isAuthenticated,
      login: handleLogin,
      logout: handleLogout
    }}>
      <div className="min-h-screen text-gray-900 safe-bottom">
        {renderScreen()}
        
        {/* Global Assistant only if logged in */}
        {isAuthenticated && user?.name && <VoiceAssistant />}
      </div>
    </AppContext.Provider>
  );
};

export default App;
