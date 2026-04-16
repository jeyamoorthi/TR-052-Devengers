import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Globe,
  Home,
  Leaf,
  ListChecks,
  Menu,
  MessageCircle,
  Sprout,
  TrendingUp,
  User,
  Users,
  Wallet,
  CloudRain,
  ShieldAlert,
  Tractor,
} from 'lucide-react';

import { AppContext } from '../App';
import { UI_TEXT } from '../services/knowledgeBase';
import { weatherService } from '../services/weatherService';
import { WeatherData } from '../types';

import CarbonDashboard from './CarbonDashboard';
import CommunityFeed from './CommunityFeed';
import DailyPlanner from './DailyPlanner';
import DiseaseDetector from './DiseaseDetector';
import IncomeDashboard from './IncomeDashboard';
import InputAdvisor from './InputAdvisor';
import MarketView from './MarketView';
import MyCropJourney from './MyCropJourney';
import SchemesAdvisor from './SchemesAdvisor';
import Sidebar from './Sidebar';
import SoilHealth from './SoilHealth';
import SustainabilityScore from './SustainabilityScore';
import SustainableFarming from './SustainableFarming';
import TopCrop from './TopCrop';
import WeatherCard from './WeatherCard';
import WeatherDetails from './WeatherDetails';
import YieldCalculator from './YieldCalculator';

const Dashboard: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;

  const {
    user,
    language,
    setShowLangSelector,
    setAssistantOpen,
    currentView,
    setView,
    logout,
  } = context;

  const t = UI_TEXT[language];
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!user?.location) return;
    const next = weatherService.getWeather(user.location.lat, user.location.lng);
    setWeatherData(next);
  }, [user]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);



  const firstName = useMemo(
    () => user?.name?.trim().split(' ')[0] || 'Farmer',
    [user?.name]
  );

  const todayText = useMemo(
    () =>
      new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
      }).format(new Date()),
    []
  );



  const focusHint = useMemo(() => {
    if (!weatherData) return 'Fetching local farm conditions...';
    if (weatherData.alerts.some((alert) => alert.severity === 'High')) {
      return 'Priority: check disease and drainage in the next 2 hours.';
    }
    if (weatherData.precipProb > 65) {
      return 'Priority: hold spraying and prepare field drainage.';
    }
    if (weatherData.temp > 33) {
      return 'Priority: irrigate in the evening and reduce heat stress.';
    }
    return 'Priority: healthy window for routine field work today.';
  }, [weatherData]);

  const actionCards = [
    {
      key: 'disease',
      title: t.detect,
      subtitle: 'Scan crop risk now',
      icon: ShieldAlert,
      bgClass: 'from-rose-500 to-orange-400',
    },
    {
      key: 'soil',
      title: t.soilHealth,
      subtitle: 'NPK and pH check',
      icon: Sprout,
      bgClass: 'from-amber-500 to-lime-500',
    },
    {
      key: 'market',
      title: t.marketPrice,
      subtitle: 'See live mandi trends',
      icon: TrendingUp,
      bgClass: 'from-sky-600 to-indigo-500',
    },
    {
      key: 'yield',
      title: t.yield,
      subtitle: 'Forecast output',
      icon: BarChart3,
      bgClass: 'from-emerald-600 to-green-500',
    },
  ] as const;

  const renderBackButton = () => (
    <button
      onClick={() => setView('home')}
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-bold text-[var(--text-700)] transition hover:border-[var(--brand-500)] hover:text-[var(--brand-700)]"
    >
      <ArrowLeft size={16} />
      Back to home
    </button>
  );

  const renderHome = () => (
    <div className="space-y-5 animate-fade-in">
      <section className="app-card app-gradient relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Field command</p>
            <h1 className="mt-1 text-2xl font-extrabold">Hello, {firstName}</h1>
            <p className="mt-1 text-sm text-white/85">{todayText}</p>
          </div>
          <div className="rounded-2xl bg-white/20 px-3 py-2 text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Status</p>
            <p className="text-sm font-bold text-white">{isOnline ? 'Live' : 'Offline mode'}</p>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-white/18 px-3 py-1 text-white">
            <CloudRain size={14} className="mr-1 inline" />
            Weather-aware planning
          </span>
          <span className="rounded-full bg-white/18 px-3 py-1 text-white">
            <Tractor size={14} className="mr-1 inline" />
            App mode active
          </span>
          <span className="rounded-full bg-white/18 px-3 py-1 text-white">
            {user?.location?.name || 'Location pending'}
          </span>
        </div>
      </section>

      <section
        onClick={() => setView('weather')}
        className="cursor-pointer rounded-3xl transition-transform active:scale-[0.99]"
      >
        {weatherData ? (
          <WeatherCard data={weatherData} language={language} variant="banner" />
        ) : (
          <div className="app-card h-36 animate-pulse bg-white" />
        )}
      </section>



      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actionCards.map(({ key, title, subtitle, icon: Icon, bgClass }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className="app-card group relative overflow-hidden p-4 text-left transition hover:-translate-y-0.5"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${bgClass} opacity-95 transition group-hover:opacity-100`}
            />
            <div className="relative">
              <Icon size={24} className="mb-5 text-white" />
              <p className="text-xl font-bold text-white">{title}</p>
              <p className="text-sm font-semibold text-white/85">{subtitle}</p>
            </div>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setView('carbon')}
          className="app-card rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 p-3 text-left text-white"
        >
          <Leaf size={20} className="mb-5" />
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Carbon</p>
          <p className="text-sm font-bold">Credits</p>
        </button>
        <button
          onClick={() => setView('sustainability')}
          className="app-card rounded-2xl bg-gradient-to-br from-cyan-700 to-teal-500 p-3 text-left text-white"
        >
          <Sprout size={20} className="mb-5" />
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100">Eco</p>
          <p className="text-sm font-bold">Score</p>
        </button>
        <button
          onClick={() => setView('income')}
          className="app-card rounded-2xl bg-gradient-to-br from-indigo-700 to-indigo-500 p-3 text-left text-white"
        >
          <Wallet size={20} className="mb-5" />
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Income</p>
          <p className="text-sm font-bold">Hub</p>
        </button>
      </section>

      <section className="app-card p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="app-chip">Farm focus</p>
            <h2 className="mt-2 text-lg font-bold text-[var(--text-900)]">Today action cue</h2>
            <p className="text-sm text-[var(--text-700)]">{focusHint}</p>
          </div>
          <button
            onClick={() => setView('journey')}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--brand-700)]"
          >
            Open crop journey
          </button>
        </div>
      </section>

      <DailyPlanner
        userId={user?.uid || user?.id || 'guest'}
        compact
        onOpenFull={() => setView('planner')}
      />



      <button
        onClick={() => setView('community')}
        className="app-card w-full rounded-2xl bg-gradient-to-r from-[var(--brand-700)] to-[var(--brand-500)] px-5 py-4 text-left text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">{t.community}</p>
            <p className="text-sm text-white/85">Ask nearby farmers and view village alerts</p>
          </div>
          <Users size={26} className="animate-float" />
        </div>
      </button>
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return renderHome();
      case 'planner':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            <DailyPlanner userId={user?.uid || user?.id || 'guest'} />
          </div>
        );

      case 'journey':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            <MyCropJourney />
          </div>
        );
      case 'sustainable':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            <SustainableFarming />
          </div>
        );
      case 'market':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            <MarketView />
          </div>
        );
      case 'input':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            <InputAdvisor />
          </div>
        );
      case 'schemes':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            <SchemesAdvisor />
          </div>
        );
      case 'weather':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            {weatherData && <WeatherDetails data={weatherData} />}
          </div>
        );
      case 'disease':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            <DiseaseDetector />
          </div>
        );
      case 'yield':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            {weatherData && <YieldCalculator weatherData={weatherData} />}
          </div>
        );
      case 'community':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            <CommunityFeed />
          </div>
        );
      case 'soil':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            <SoilHealth />
          </div>
        );
      case 'topcrop':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            <TopCrop />
          </div>
        );
      case 'carbon':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            {weatherData && <CarbonDashboard weatherData={weatherData} />}
          </div>
        );
      case 'sustainability':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            {weatherData && <SustainabilityScore weatherData={weatherData} />}
          </div>
        );
      case 'income':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            {weatherData && <IncomeDashboard weatherData={weatherData} />}
          </div>
        );
      case 'profile':
        return (
          <div className="space-y-4 animate-fade-in">
            {renderBackButton()}
            <section className="app-card p-5 text-center">
              <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--brand-100)] text-[var(--brand-700)]">
                <User size={36} />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-900)]">{user?.name || 'Farmer profile'}</h2>
              <p className="text-sm text-[var(--text-700)]">{user?.phone || 'Phone not linked'}</p>

              <div className="mt-5 space-y-2 text-left">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-700)]">Location</p>
                  <p className="text-sm font-semibold text-[var(--text-900)]">{user?.location.name || 'Not set'}</p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-700)]">Primary crop</p>
                  <p className="text-sm font-semibold text-[var(--text-900)]">{user?.primaryCrop || 'Not set'}</p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-700)]">Irrigation</p>
                  <p className="text-sm font-semibold text-[var(--text-900)]">{user?.irrigationType || 'Rainfed'}</p>
                </div>
              </div>

              <button
                onClick={logout}
                className="mt-5 w-full rounded-xl bg-red-50 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
              >
                Logout
              </button>
            </section>
          </div>
        );
      default:
        return <div className="app-card p-4 text-sm font-semibold text-[var(--text-700)]">Page not found</div>;
    }
  };

  return (
    <div className="min-h-screen safe-top">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/90 backdrop-blur">
        <div className="app-frame flex items-center justify-between px-4 py-3 sm:px-6">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-xl border border-[var(--line)] bg-white p-2 text-[var(--text-700)] transition hover:border-[var(--brand-500)] hover:text-[var(--brand-700)]"
          >
            <Menu size={20} />
          </button>

          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-700)]">SmartAgri+</p>
            <h1 className="text-base font-extrabold text-[var(--brand-700)]">Farm App Console</h1>
          </div>

          <button
            onClick={() => setShowLangSelector(true)}
            className="rounded-xl border border-[var(--line)] bg-white p-2 text-[var(--text-700)] transition hover:border-[var(--brand-500)] hover:text-[var(--brand-700)]"
          >
            <Globe size={20} />
          </button>
        </div>
      </header>

      <main className="app-frame px-4 pb-28 pt-4 sm:px-6">{renderContent()}</main>

      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--line)] bg-white/95 backdrop-blur">
        <div className="app-frame grid grid-cols-5 items-center px-3 py-2">
          <button
            onClick={() => setView('home')}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold transition ${
              currentView === 'home' ? 'text-[var(--brand-700)]' : 'text-gray-500'
            }`}
          >
            <Home size={20} />
            Home
          </button>

          <button
            onClick={() => setView('journey')}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold transition ${
              currentView === 'journey' ? 'text-[var(--brand-700)]' : 'text-gray-500'
            }`}
          >
            <Leaf size={20} />
            Crop
          </button>

          <button
            onClick={() => setAssistantOpen(true)}
            className="relative -mt-8 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-700)] text-white shadow-lg transition hover:bg-[var(--brand-500)]"
          >
            <MessageCircle size={22} />
          </button>

          <button
            onClick={() => setView('planner')}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold transition ${
              currentView === 'planner' ? 'text-[var(--brand-700)]' : 'text-gray-500'
            }`}
          >
            <ListChecks size={20} />
            Planner
          </button>

          <button
            onClick={() => setView('profile')}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold transition ${
              currentView === 'profile' ? 'text-[var(--brand-700)]' : 'text-gray-500'
            }`}
          >
            <User size={20} />
            Profile
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
