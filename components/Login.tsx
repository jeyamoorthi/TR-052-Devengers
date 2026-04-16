import React, { useContext, useState } from 'react';
import { Loader2, Smartphone, ShieldCheck } from 'lucide-react';
import { AppContext } from '../App';

const Login: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;

  const { login } = context;
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedPhone = phone.replace(/\D/g, '');

  const handleSendOtp = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (normalizedPhone.length !== 10) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
    }, 800);
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login('phone', { phone: normalizedPhone, otp: otp.trim() });
    } catch {
      setError('Invalid OTP. Use 1234 for demo login.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login('google', {});
    } catch {
      setError('Google sign-in failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="safe-top min-h-screen p-4 sm:p-6">
      <div className="app-frame mx-auto max-w-md">
        <section className="app-card overflow-hidden">
          <div className="app-gradient p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">SmartAgri+</p>
            <h1 className="mt-2 text-3xl font-extrabold text-white">Farmer app login</h1>
            <p className="mt-2 text-sm text-white/85">Secure access to your crop data, weather alerts, and farm planner.</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
              <ShieldCheck size={14} />
              Demo OTP: 1234
            </div>
          </div>

          <div className="space-y-5 p-6">
            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">Phone number</label>
                  <div className="relative">
                    <Smartphone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-700)]" size={18} />
                    <input
                      type="tel"
                      autoFocus
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="9876543210"
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-10 py-3 text-base font-semibold text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-[var(--danger)]">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[var(--brand-700)] py-3 text-base font-extrabold text-white transition hover:bg-[var(--brand-500)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 className="mx-auto animate-spin" /> : 'Send OTP'}
                </button>

                <div className="relative py-1 text-center text-xs font-bold uppercase tracking-wider text-gray-400">
                  <span className="bg-white px-2">or</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full rounded-xl border border-[var(--line)] bg-white py-3 text-sm font-bold text-[var(--text-700)] transition hover:border-[var(--brand-500)] hover:text-[var(--brand-700)]"
                >
                  Continue with Google
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-700)]">Enter OTP</label>
                  <input
                    type="text"
                    autoFocus
                    maxLength={4}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="1234"
                    className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-center text-2xl font-black tracking-[0.35em] text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
                  />
                  <p className="mt-2 text-xs font-semibold text-[var(--text-700)]">Sent to +91 {normalizedPhone}</p>
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-[var(--danger)]">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[var(--brand-700)] py-3 text-base font-extrabold text-white transition hover:bg-[var(--brand-500)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 className="mx-auto animate-spin" /> : 'Verify and Continue'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setError('');
                  }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] py-3 text-sm font-bold text-[var(--text-700)]"
                >
                  Back to phone input
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
