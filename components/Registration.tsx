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

  // ─── Input mode ───────────────────────────────────────────────────────────
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');

  // ─── Step 1: Identity ─────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [isLocating, setIsLocating] = useState(true);

  // ─── Step 2: Farm details ─────────────────────────────────────────────────
  const [presentCrop, setPresentCrop] = useState(user?.primaryCrop || '');
  const [cropStage, setCropStage] = useState<UserProfileExtended['present_crop_stage']>('Seedling');
  const [farmSizeAcres, setFarmSizeAcres] = useState('');
  const [irrigationType, setIrrigationType] = useState<UserProfile['irrigationType']>('Rainfed');
  const [soilType, setSoilType] = useState<UserProfile['soilType']>('Loamy');

  // ─── Step 3: History ──────────────────────────────────────────────────────
  const [pastCrop, setPastCrop] = useState('');
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [farmingExperience, setFarmingExperience] = useState('');
  const [isFpoMember, setIsFpoMember] = useState(false);

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);

  // ─── Geolocation on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) { setIsLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationName(`Farm zone (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`);
        setState('Detected State');
        setDistrict('Detected District');
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { timeout: 6000 }
    );
  }, []);

  // ─── Voice input ──────────────────────────────────────────────────────────
  const startVoiceField = (
    field: string,
    promptText: string,
    onResult: (transcript: string) => void
  ) => {
    setActiveField(field);
    voiceService.speak(promptText, language);
    setTimeout(() => {
      voiceService.listen(
        language,
        (transcript) => {
          onResult(transcript);
          setActiveField(null);
        },
        () => setActiveField(null)
      );
    }, 600);
  };

  const handleVoiceStep1 = () => {
    startVoiceField('name', 'Please say your name', (t) => setName(t));
  };
  const handleVoiceStep2 = () => {
    startVoiceField(
      'crop',
      'Please say your current crop name and crop stage',
      (t) => {
        const words = t.split(' ');
        setPresentCrop(words.slice(0, 2).join(' '));
        setCropStage(extractCropStage(t));
        startVoiceField('acres', 'How many acres is your farm?', (u) => {
          setFarmSizeAcres(extractNumber(u));
        });
      }
    );
  };
  const handleVoiceStep3 = () => {
    startVoiceField('past', 'Say your past crop and any disease you faced', (t) => {
      const words = t.split(' ');
      setPastCrop(words[0] || '');
      const matched = DISEASE_OPTIONS.filter((d) =>
        t.toLowerCase().includes(d.toLowerCase())
      );
      if (matched.length) setSelectedDiseases(matched);
    });
  };

  // ─── Disease tag toggle ───────────────────────────────────────────────────
  const toggleDisease = (d: string) => {
    setSelectedDiseases((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  // ─── Step validation ──────────────────────────────────────────────────────
  const canStep1 = name.trim().length >= 2 && locationName.trim().length >= 2;
  const canStep2 = presentCrop.trim().length >= 1 && farmSizeAcres.trim().length >= 1;
  const canStep3 = true;

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!user) return;

    const password_hash = password ? btoa(password) : '';

    const updatedProfile: UserProfileExtended = {
      ...user,
      name: name.trim(),
      email: email.trim(),
      password_hash,
      location: {
        lat,
        lng,
        name: locationName.trim(),
        state: state || 'Unknown State',
        district: district || 'Unknown District',
      },
      primaryCrop: presentCrop.trim(),
      present_crop: presentCrop.trim(),
      present_crop_stage: cropStage,
      farmSizeAcres: parseFloat(farmSizeAcres) || 0,
      irrigationType,
      soilType,
      farmingExperience: parseInt(farmingExperience, 10) || 0,
      isFpoMember,
      past_crop: pastCrop.trim(),
      past_plant_disease: selectedDiseases,
    };

    await firebaseService.saveUserProfileExtended(updatedProfile);

    // Async enrichment — fire & forget
    if (lat && lng) {
      setIsEnriching(true);
      enrichmentService.enrichUserData(user.uid, lat, lng).finally(() => setIsEnriching(false));
    }

    setUser(updatedProfile as unknown as UserProfile);
  };

  // ─── MicButton helper ─────────────────────────────────────────────────────
  const MicBtn = ({ field, onClick }: { field: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={inputMode === 'text'}
      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 transition ${
        activeField === field
          ? 'bg-red-500 text-white'
          : inputMode === 'voice'
          ? 'bg-[var(--brand-100)] text-[var(--brand-700)]'
          : 'bg-gray-100 text-gray-300 cursor-not-allowed'
      }`}
    >
      {activeField === field ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  );

  return (
    <div className="safe-top min-h-screen p-4 sm:p-6">
      <div className="app-frame mx-auto max-w-lg">
        <section className="app-card overflow-hidden">
          {/* ── Header ── */}
          <div className="app-gradient p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Onboarding</p>
            <h1 className="mt-2 text-3xl font-extrabold text-white">Set up your farm profile</h1>
            <p className="mt-1 text-sm text-white/85">Step {step} of 3</p>
            <div className="mt-4 h-2 rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* ── Input mode toggle ── */}
          <div className="flex items-center justify-center gap-2 border-b border-[var(--line)] px-6 py-3">
            <p className="text-xs font-bold text-[var(--text-700)]">Input mode:</p>
            <div className="flex rounded-xl border border-[var(--line)] overflow-hidden">
              <button
                type="button"
                onClick={() => setInputMode('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition ${
                  inputMode === 'text'
                    ? 'bg-[var(--brand-700)] text-white'
                    : 'bg-white text-[var(--text-700)] hover:bg-[var(--surface)]'
                }`}
              >
                <Keyboard size={13} /> Text
              </button>
              <button
                type="button"
                onClick={() => setInputMode('voice')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition ${
                  inputMode === 'voice'
                    ? 'bg-[var(--brand-700)] text-white'
                    : 'bg-white text-[var(--text-700)] hover:bg-[var(--surface)]'
                }`}
              >
                <Volume2 size={13} /> Voice
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-6">

            {/* ══════════════ STEP 1: Identity ══════════════ */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                {inputMode === 'voice' && (
                  <button
                    type="button"
                    onClick={handleVoiceStep1}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
                      activeField === 'name'
                        ? 'bg-red-500 text-white'
                        : 'bg-[var(--brand-100)] text-[var(--brand-700)] hover:bg-[var(--brand-700)] hover:text-white'
                    }`}
                  >
                    {activeField === 'name' ? <MicOff size={16} /> : <Mic size={16} />}
                    {activeField === 'name' ? 'Listening…' : 'Tap to speak your details'}
                  </button>
                )}

                {/* Name */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">{t.name}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 pr-12 text-base font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                    />
                    <MicBtn field="name" onClick={() => startVoiceField('name', 'Say your name', (r) => setName(r))} />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-base font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 pr-12 text-base font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-700)]"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">{t.location}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder={isLocating ? 'Detecting your location…' : 'Village / area name'}
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 pr-12 text-base font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-700)]">
                      {isLocating ? <LocateFixed size={18} className="animate-pulse" /> : <MapPin size={18} />}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canStep1}
                  onClick={() => canStep1 && setStep(2)}
                  className="w-full rounded-xl bg-[var(--brand-700)] py-3 text-base font-extrabold text-white transition hover:bg-[var(--brand-500)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Continue <ChevronRight size={16} className="inline ml-1" />
                </button>
              </div>
            )}

            {/* ══════════════ STEP 2: Farm Details ══════════════ */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                {inputMode === 'voice' && (
                  <button
                    type="button"
                    onClick={handleVoiceStep2}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
                      activeField === 'crop'
                        ? 'bg-red-500 text-white'
                        : 'bg-[var(--brand-100)] text-[var(--brand-700)] hover:bg-[var(--brand-700)] hover:text-white'
                    }`}
                  >
                    {activeField === 'crop' ? <MicOff size={16} /> : <Mic size={16} />}
                    {activeField === 'crop' ? 'Listening…' : 'Speak crop & farm details'}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* Present Crop */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-[var(--text-700)]">Current Crop</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={presentCrop}
                        onChange={(e) => setPresentCrop(e.target.value)}
                        placeholder="e.g. Rice"
                        className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 pr-10 text-sm font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                      />
                      <MicBtn field="crop" onClick={() => startVoiceField('crop', 'Say your current crop', (r) => setPresentCrop(r))} />
                    </div>
                  </div>

                  {/* Farm size */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-[var(--text-700)]">Farm Size (acres)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={farmSizeAcres}
                        onChange={(e) => setFarmSizeAcres(e.target.value)}
                        placeholder="2.5"
                        className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 pr-10 text-sm font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                      />
                      <MicBtn field="acres" onClick={() => startVoiceField('acres', 'How many acres?', (r) => setFarmSizeAcres(extractNumber(r)))} />
                    </div>
                  </div>
                </div>

                {/* Crop Stage */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[var(--text-700)]">Current Crop Stage</label>
                  <select
                    value={cropStage}
                    onChange={(e) => setCropStage(e.target.value as typeof cropStage)}
                    className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                  >
                    {(['Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Pre-Harvest', 'Harvested'] as const).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Irrigation */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-[var(--text-700)]">{t.irrigation}</label>
                    <select
                      value={irrigationType}
                      onChange={(e) => setIrrigationType(e.target.value as typeof irrigationType)}
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-sm font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                    >
                      <option value="Rainfed">{t.rainFed}</option>
                      <option value="Tube Well">{t.tubeWell}</option>
                      <option value="Canal">{t.canal}</option>
                      <option value="Drip">{t.drip}</option>
                    </select>
                  </div>

                  {/* Soil Type */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-[var(--text-700)]">{t.soilType}</label>
                    <select
                      value={soilType}
                      onChange={(e) => setSoilType(e.target.value as typeof soilType)}
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-sm font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                    >
                      {['Loamy', 'Clay', 'Sandy', 'Black', 'Red'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] py-3 text-sm font-bold text-[var(--text-700)]">
                    <ChevronLeft size={16} className="inline mr-1" /> Back
                  </button>
                  <button
                    type="button"
                    disabled={!canStep2}
                    onClick={() => canStep2 && setStep(3)}
                    className="rounded-xl bg-[var(--brand-700)] py-3 text-sm font-extrabold text-white transition hover:bg-[var(--brand-500)] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Continue <ChevronRight size={16} className="inline ml-1" />
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════ STEP 3: History ══════════════ */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                {inputMode === 'voice' && (
                  <button
                    type="button"
                    onClick={handleVoiceStep3}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
                      activeField === 'past'
                        ? 'bg-red-500 text-white'
                        : 'bg-[var(--brand-100)] text-[var(--brand-700)] hover:bg-[var(--brand-700)] hover:text-white'
                    }`}
                  >
                    {activeField === 'past' ? <MicOff size={16} /> : <Mic size={16} />}
                    {activeField === 'past' ? 'Listening…' : 'Speak past crop & disease history'}
                  </button>
                )}

                {/* Past Crop */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[var(--text-700)]">Past Crop</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pastCrop}
                      onChange={(e) => setPastCrop(e.target.value)}
                      placeholder="e.g. Wheat"
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 pr-12 text-sm font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                    />
                    <MicBtn field="past" onClick={() => startVoiceField('past', 'Say your previous crop', (r) => setPastCrop(r))} />
                  </div>
                </div>

                {/* Past Diseases */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">Past Plant Diseases (select all that apply)</label>
                  <div className="flex flex-wrap gap-2">
                    {DISEASE_OPTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDisease(d)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                          selectedDiseases.includes(d)
                            ? 'border-[var(--brand-700)] bg-[var(--brand-700)] text-white'
                            : 'border-[var(--line)] bg-[var(--surface)] text-[var(--text-700)] hover:border-[var(--brand-500)]'
                        }`}
                      >
                        {selectedDiseases.includes(d) && <Check size={11} className="inline mr-1" />}
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[var(--text-700)]">Farming Experience (years)</label>
                  <input
                    type="number"
                    value={farmingExperience}
                    onChange={(e) => setFarmingExperience(e.target.value)}
                    placeholder="5"
                    className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                  />
                </div>

                {/* FPO member */}
                <label className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text-700)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFpoMember}
                    onChange={(e) => setIsFpoMember(e.target.checked)}
                    className="h-5 w-5 rounded"
                  />
                  I am an FPO / cooperative member
                </label>

                {isEnriching && (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-700">
                    ⚡ Fetching soil &amp; weather data for your location…
                  </div>
                )}

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-[var(--danger)]">{error}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] py-3 text-sm font-bold text-[var(--text-700)]">
                    <ChevronLeft size={16} className="inline mr-1" /> Back
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[var(--brand-700)] py-3 text-sm font-extrabold text-white transition hover:bg-[var(--brand-500)]"
                  >
                    <Check size={16} className="inline mr-1" /> Finish setup
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
