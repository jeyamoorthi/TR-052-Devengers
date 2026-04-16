import React, { useContext } from 'react';
import {
  BarChart,
  Bot,
  CloudRain,
  Droplets,
  HeartHandshake,
  Home,
  IndianRupee,
  Landmark,
  Layers,
  Leaf,
  LogOut,
  MessageCircle,
  Sprout,
  User,
  Users,
  Wind,
  X,
} from 'lucide-react';
import { AppContext } from '../App';
import { UI_TEXT } from '../services/knowledgeBase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<Props> = ({ isOpen, onClose }) => {
  const context = useContext(AppContext);
  if (!context) return null;

  const { user, language, setView, currentView, logout, setAssistantOpen } = context;
  const t = UI_TEXT[language];

  if (!isOpen) return null;

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'journey', label: t.farmHistory, icon: Sprout },
    { id: 'soil', label: t.soilHealth, icon: Layers },
    { id: 'disease', label: t.detect, icon: Leaf },
    { id: 'weather', label: t.weather, icon: CloudRain },
    { id: 'market', label: t.marketPrice, icon: IndianRupee },
    { id: 'input', label: t.inputAdvisor, icon: Droplets },
    { id: 'yield', label: t.yield, icon: BarChart },
    { id: 'workflow', label: 'VorkAI Workflow', icon: Bot },
    { id: 'aqi', label: 'AQI Monitor', icon: Wind },
    { id: 'community', label: t.community, icon: Users },
    { id: 'schemes', label: t.schemes, icon: Landmark },
    { id: 'sustainable', label: t.sustainable, icon: HeartHandshake },
  ];

  const handleNav = (view: string) => {
    setView(view);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <button className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Close menu" />

      <aside className="relative h-full w-80 max-w-[88vw] animate-fade-in overflow-hidden border-r border-[var(--line)] bg-white shadow-2xl">
        <div className="app-gradient px-5 pb-5 pt-8 text-white">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg bg-white/15 p-2 transition hover:bg-white/25"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-lg font-black">
              {(user?.name?.charAt(0) || 'F').toUpperCase()}
            </div>
            <div>
              <p className="text-base font-extrabold">{user?.name || 'Farmer'}</p>
              <p className="text-xs font-semibold text-white/80">{user?.location?.name || 'Location not set'}</p>
            </div>
          </div>

          <p className="mt-3 text-xs font-semibold text-white/85">
            {user?.farmSizeAcres || 0} acres | {user?.primaryCrop || 'Crop not set'}
          </p>
        </div>

        <div className="space-y-1 overflow-y-auto px-3 py-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                currentView === item.id
                  ? 'border border-[var(--line)] bg-[var(--brand-100)] font-bold text-[var(--brand-700)]'
                  : 'text-[var(--text-700)] hover:bg-[var(--surface)]'
              }`}
            >
              <item.icon size={18} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}

          <div className="my-3 border-t border-[var(--line)]" />

          <button
            onClick={() => {
              setAssistantOpen(true);
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[var(--brand-700)] transition hover:bg-[var(--brand-100)]"
          >
            <MessageCircle size={18} />
            <span className="text-sm font-semibold">{t.help}</span>
          </button>

          <button
            onClick={() => handleNav('profile')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[var(--text-700)] transition hover:bg-[var(--surface)]"
          >
            <User size={18} />
            <span className="text-sm font-semibold">{t.profile}</span>
          </button>
        </div>

        <div className="border-t border-[var(--line)] p-4">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-3 text-sm font-extrabold text-red-600 transition hover:bg-red-100"
          >
            <LogOut size={16} />
            {t.logout}
          </button>
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;
