import React, { useContext, useEffect, useState } from 'react';
import { Check, ChevronRight, MapPin, Mic, MicOff, LocateFixed } from 'lucide-react';
import { AppContext } from '../App';
import { firebaseService } from '../services/firebaseService';
import { UI_TEXT } from '../services/knowledgeBase';
import { voiceService } from '../services/voiceService';
import { UserProfile } from '../types';

const Registration: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;

  const { language, user, setUser } = context;
  const t = UI_TEXT[language];

  const [formData, setFormData] = useState({
    name: user?.name || '',
    locationName: '',
    lat: 0,
    lng: 0,
    state: '',
    district: '',
    primaryCrop: 'Rice',
    farmSizeAcres: '',
    irrigationType: 'Rainfed',
    soilType: 'Loamy',
    farmingExperience: '',
    isFpoMember: false,
  });

  const [step, setStep] = useState(1);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          locationName: `Farm zone (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`,
          state: 'Detected State',
          district: 'Detected District',
        }));
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 6000 }
    );
  }, []);

  const handleVoiceInput = (field: 'name' | 'locationName' | 'primaryCrop') => {
    setActiveField(field);
    const prompt = field === 'name' ? t.name : field === 'locationName' ? t.location : t.crop;

    voiceService.speak(prompt, language);

    setTimeout(() => {
      voiceService.listen(
        language,
        (transcript) => {
          setFormData((prev) => ({ ...prev, [field]: transcript }));
          setActiveField(null);
        },
        () => {
          setActiveField(null);
        }
      );
    }, 600);
  };

  const canGoNext = formData.name.trim().length >= 2 && formData.locationName.trim().length >= 2;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!user) return;

    if (!formData.primaryCrop.trim()) {
      setError('Please set your primary crop.');
      return;
    }

    const updatedProfile: UserProfile = {
      ...user,
      name: formData.name.trim(),
      location: {
        lat: formData.lat,
        lng: formData.lng,
        name: formData.locationName.trim(),
        state: formData.state || 'Unknown State',
        district: formData.district || 'Unknown District',
      },
      primaryCrop: formData.primaryCrop.trim(),
      farmSizeAcres: parseFloat(formData.farmSizeAcres) || 0,
      irrigationType: formData.irrigationType as UserProfile['irrigationType'],
      soilType: formData.soilType as UserProfile['soilType'],
      farmingExperience: parseInt(formData.farmingExperience, 10) || 0,
      isFpoMember: formData.isFpoMember,
    };

    await firebaseService.saveUserProfile(updatedProfile);
    setUser(updatedProfile);
  };

  return (
    <div className="safe-top min-h-screen p-4 sm:p-6">
      <div className="app-frame mx-auto max-w-lg">
        <section className="app-card overflow-hidden">
          <div className="app-gradient p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Onboarding</p>
            <h1 className="mt-2 text-3xl font-extrabold text-white">Set up your farm profile</h1>
            <p className="mt-1 text-sm text-white/85">Step {step} of 2</p>
            <div className="mt-4 h-2 rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">{t.name}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 pr-12 text-base font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleVoiceInput('name')}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 ${
                        activeField === 'name' ? 'bg-red-500 text-white' : 'bg-[var(--brand-100)] text-[var(--brand-700)]'
                      }`}
                    >
                      {activeField === 'name' ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">{t.location}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.locationName}
                      onChange={(event) => setFormData((prev) => ({ ...prev, locationName: event.target.value }))}
                      placeholder={isLocating ? 'Detecting your location...' : 'Village / area name'}
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 pr-12 text-base font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-700)]">
                      {isLocating ? <LocateFixed size={18} className="animate-pulse" /> : <MapPin size={18} />}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canGoNext}
                  onClick={() => {
                    if (!canGoNext) return;
                    setStep(2);
                  }}
                  className="w-full rounded-xl bg-[var(--brand-700)] py-3 text-base font-extrabold text-white transition hover:bg-[var(--brand-500)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Continue
                  <ChevronRight size={16} className="ml-1 inline" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">{t.acres}</label>
                    <input
                      type="number"
                      value={formData.farmSizeAcres}
                      onChange={(event) => setFormData((prev) => ({ ...prev, farmSizeAcres: event.target.value }))}
                      placeholder="2.5"
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-base font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">{t.crop}</label>
                    <input
                      type="text"
                      value={formData.primaryCrop}
                      onChange={(event) => setFormData((prev) => ({ ...prev, primaryCrop: event.target.value }))}
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-base font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">{t.irrigation}</label>
                    <select
                      value={formData.irrigationType}
                      onChange={(event) => setFormData((prev) => ({ ...prev, irrigationType: event.target.value }))}
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-base font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                    >
                      <option value="Rainfed">{t.rainFed}</option>
                      <option value="Tube Well">{t.tubeWell}</option>
                      <option value="Canal">{t.canal}</option>
                      <option value="Drip">{t.drip}</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">{t.soilType}</label>
                    <select
                      value={formData.soilType}
                      onChange={(event) => setFormData((prev) => ({ ...prev, soilType: event.target.value }))}
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-base font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                    >
                      <option value="Loamy">Loamy</option>
                      <option value="Clay">Clay</option>
                      <option value="Sandy">Sandy</option>
                      <option value="Black">Black</option>
                      <option value="Red">Red</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">Experience (years)</label>
                  <input
                    type="number"
                    value={formData.farmingExperience}
                    onChange={(event) => setFormData((prev) => ({ ...prev, farmingExperience: event.target.value }))}
                    placeholder="5"
                    className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-base font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text-700)]">
                  <input
                    type="checkbox"
                    checked={formData.isFpoMember}
                    onChange={(event) => setFormData((prev) => ({ ...prev, isFpoMember: event.target.checked }))}
                    className="h-5 w-5 rounded"
                  />
                  I am an FPO / cooperative member
                </label>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-[var(--danger)]">{error}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface)] py-3 text-sm font-bold text-[var(--text-700)]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[var(--brand-700)] py-3 text-sm font-extrabold text-white transition hover:bg-[var(--brand-500)]"
                  >
                    <Check size={16} className="mr-1 inline" />
                    Finish setup
                  </button>
                </div>
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  );
};

export default Registration;
