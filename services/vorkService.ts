import { integrationConfig } from './integrationConfig';

export interface WorkflowResult {
  status: string;
  message: string;
  confidence?: number;
  reasoning?: string[];
  raw?: unknown;
}

const parseWorkflowResult = (payload: any): WorkflowResult => {
  const message =
    payload?.message ||
    payload?.conversation_response ||
    payload?.decision?.decision ||
    'Workflow processed.';

  return {
    status: payload?.status || 'success',
    message,
    confidence: payload?.decision?.confidence,
    reasoning: Array.isArray(payload?.decision?.reasoning)
      ? payload.decision.reasoning
      : undefined,
    raw: payload,
  };
};

export const vorkService = {
  async checkHealth(): Promise<{ ok: boolean; detail: string }> {
    try {
      const response = await fetch(`${integrationConfig.vorkApiBaseUrl}/health`);
      if (!response.ok) {
        return { ok: false, detail: `HTTP ${response.status}` };
      }
      return { ok: true, detail: 'Connected' };
    } catch (error) {
      return { ok: false, detail: String(error) };
    }
  },

  async runTextWorkflow(text: string, userId: string): Promise<WorkflowResult> {
    const response = await fetch(`${integrationConfig.vorkApiBaseUrl}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Workflow request failed (${response.status})`);
    }

    const payload = await response.json();
    return parseWorkflowResult(payload);
  },

  async runVoiceWorkflow(audio: File, userId: string): Promise<WorkflowResult> {
    const formData = new FormData();
    formData.append('audio', audio);
    formData.append('user_id', userId);

    const response = await fetch(`${integrationConfig.vorkApiBaseUrl}/workflow/voice`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Voice workflow request failed (${response.status})`);
    }

    const payload = await response.json();
    return parseWorkflowResult(payload);
  },
};

