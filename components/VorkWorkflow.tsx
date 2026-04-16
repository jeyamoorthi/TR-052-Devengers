import React, { useContext, useEffect, useState } from 'react';
import { Bot, Mic, Send, Upload, Workflow } from 'lucide-react';
import { AppContext } from '../App';
import { integrationConfig } from '../services/integrationConfig';
import { vorkService, WorkflowResult } from '../services/vorkService';

const VorkWorkflow: React.FC = () => {
  const context = useContext(AppContext);
  const userId = context?.user?.uid || context?.user?.id || 'smartagri_user';

  const [status, setStatus] = useState<{ ok: boolean; detail: string } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    vorkService.checkHealth().then((health) => {
      if (mounted) setStatus(health);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const runTextWorkflow = async () => {
    if (!textInput.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await vorkService.runTextWorkflow(textInput.trim(), userId);
      setResult(response);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const runVoiceWorkflow = async () => {
    if (!audioFile) return;
    setLoading(true);
    setError('');
    try {
      const response = await vorkService.runVoiceWorkflow(audioFile, userId);
      setResult(response);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4 animate-fade-in">
      <div className="app-card app-gradient p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Integrated module</p>
            <h2 className="mt-1 text-2xl font-extrabold text-white">VorkAI Workflow Engine</h2>
            <p className="text-sm text-white/85">
              Voice-to-workflow orchestration is now available inside SmartAgri.
            </p>
          </div>
          <Workflow size={34} className="text-white/90" />
        </div>
      </div>

      <div className="app-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--text-900)]">Backend status</p>
            <p className="text-xs text-[var(--text-700)]">{integrationConfig.vorkApiBaseUrl}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              status?.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {status?.ok ? 'Connected' : 'Not reachable'}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-sm font-semibold text-[var(--text-700)]">Text workflow command</label>
          <textarea
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            placeholder="Example: Schedule a follow-up call with fertilizer vendor tomorrow at 4 PM and send reminder email."
            className="min-h-28 w-full rounded-xl border border-[var(--line)] bg-white p-3 text-sm text-[var(--text-900)] outline-none focus:border-[var(--brand-500)]"
          />
          <button
            type="button"
            onClick={runTextWorkflow}
            disabled={loading || !textInput.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-700)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--brand-500)] disabled:opacity-50"
          >
            <Send size={15} />
            Run text workflow
          </button>
        </div>

        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <p className="text-sm font-semibold text-[var(--text-700)]">Voice workflow input</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text-700)]">
              <Upload size={15} />
              Upload audio
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(event) => setAudioFile(event.target.files?.[0] || null)}
              />
            </label>
            <button
              type="button"
              onClick={runVoiceWorkflow}
              disabled={loading || !audioFile}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold text-[var(--brand-700)] transition hover:border-[var(--brand-500)] hover:text-[var(--brand-500)] disabled:opacity-50"
            >
              <Mic size={15} />
              Run voice workflow
            </button>
            {audioFile && (
              <span className="text-xs font-semibold text-[var(--text-700)]">{audioFile.name}</span>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="app-card p-4 text-sm font-semibold text-[var(--text-700)]">Processing workflow...</div>
      )}

      {error && (
        <div className="app-card border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
      )}

      {result && (
        <div className="app-card p-5">
          <div className="mb-2 flex items-center gap-2 text-[var(--brand-700)]">
            <Bot size={18} />
            <p className="text-sm font-bold uppercase tracking-wide">Workflow response</p>
          </div>
          <p className="text-base font-semibold text-[var(--text-900)]">{result.message}</p>

          {typeof result.confidence === 'number' && (
            <p className="mt-2 text-xs font-bold text-[var(--text-700)]">
              Confidence: {(result.confidence * 100).toFixed(0)}%
            </p>
          )}

          {result.reasoning && result.reasoning.length > 0 && (
            <div className="mt-3 space-y-1">
              {result.reasoning.slice(0, 5).map((reason, index) => (
                <p key={index} className="text-sm text-[var(--text-700)]">
                  {index + 1}. {reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default VorkWorkflow;

