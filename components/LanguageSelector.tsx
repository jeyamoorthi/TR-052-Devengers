import React from 'react';
import { Languages } from 'lucide-react';
import { Language } from '../types';

interface Props {
  onSelect: (lang: Language) => void;
}

const LanguageSelector: React.FC<Props> = ({ onSelect }) => {
  const options = [
    { code: Language.EN, label: 'English', native: 'English' },
    { code: Language.HI, label: 'Hindi', native: 'Hindi' },
    { code: Language.TA, label: 'Tamil', native: 'Tamil' },
    { code: Language.TE, label: 'Telugu', native: 'Telugu' },
    { code: Language.ML, label: 'Malayalam', native: 'Malayalam' },
    { code: Language.KN, label: 'Kannada', native: 'Kannada' },
    { code: Language.MR, label: 'Marathi', native: 'Marathi' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm">
      <div className="app-frame mx-auto flex min-h-full max-w-md items-center justify-center">
        <section className="app-card w-full overflow-hidden">
          <div className="app-gradient p-5 text-white">
            <div className="mb-3 inline-flex rounded-xl bg-white/20 p-2">
              <Languages size={24} />
            </div>
            <h2 className="text-2xl font-extrabold">Choose app language</h2>
            <p className="mt-1 text-sm text-white/85">You can change this later from the dashboard header.</p>
          </div>

          <div className="space-y-2 p-5">
            {options.map((option) => (
              <button
                key={option.code}
                onClick={() => onSelect(option.code)}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-left transition hover:border-[var(--brand-500)] hover:bg-[var(--surface)]"
              >
                <p className="text-base font-bold text-[var(--text-900)]">{option.native}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-700)]">
                  {option.label}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default LanguageSelector;
