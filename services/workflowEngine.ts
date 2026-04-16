import { UserProfile } from '../types';
import { localKnowledgeStore, UserKnowledge } from './localKnowledgeStore';

type WorkflowAction =
  | 'create_task'
  | 'schedule_farm_activity'
  | 'send_email'
  | 'send_whatsapp_message'
  | 'send_message';

interface WorkflowStep {
  action: WorkflowAction;
  params: Record<string, string>;
}

interface IntentData {
  intent: string;
  entities: Record<string, string>;
  confidence: number;
  rawText: string;
}

interface WorkflowPlan {
  status: 'success' | 'error';
  intent: string;
  entities: Record<string, string>;
  steps: WorkflowStep[];
  missing: string[];
  suggestions: string[];
  issues: string[];
}

interface WorkflowDecision {
  decision: string;
  reasoning: string[];
  confidence: number;
  explanation: string;
  suggestions: string[];
}

interface AgentTrace {
  agent: string;
  role: string;
  input: string;
  output: string;
  reasoning: string[];
  confidence: number;
  durationMs: number;
}

export interface LocalWorkflowResult {
  status: 'success' | 'error';
  message: string;
  confidence: number;
  decision: WorkflowDecision;
  intentData: IntentData;
  workflow: WorkflowPlan;
  plannerTasks: string[];
  agentTraces: AgentTrace[];
  source: 'smartagri-local';
}

interface RunWorkflowInput {
  text: string;
  userId: string;
  userProfile?: UserProfile | null;
}

const VALID_ACTIONS: Set<WorkflowAction> = new Set([
  'create_task',
  'schedule_farm_activity',
  'send_email',
  'send_whatsapp_message',
  'send_message',
]);

const REQUIRED_PARAMS: Record<WorkflowAction, string[]> = {
  create_task: ['title'],
  schedule_farm_activity: ['activity'],
  send_email: ['to', 'subject', 'body'],
  send_whatsapp_message: ['number', 'message'],
  send_message: ['to', 'message'],
};

const WORKFLOW_PATTERN =
  /\b(schedule|meeting|email|mail|whatsapp|task|todo|remind|reminder|call|workflow|plan)\b/i;

const normalize = (value: string) => value.trim().toLowerCase();

const dedupe = (items: string[]) => {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of items) {
    const key = normalize(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(item.trim());
  }
  return next;
};

const extractEmail = (text: string) => {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] || '';
};

const extractPhone = (text: string) => {
  const match = text.match(/(?:\+?91[-\s]?)?[6-9]\d{9}/);
  return match?.[0]?.replace(/\D/g, '') || '';
};

const extractTimeHint = (text: string) => {
  const lower = text.toLowerCase();
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  const relativeDay = lower.includes('tomorrow')
    ? 'tomorrow'
    : lower.includes('today')
      ? 'today'
      : lower.includes('tonight')
        ? 'tonight'
        : '';

  if (!timeMatch && !relativeDay) return '';

  let timeValue = '';
  if (timeMatch) {
    const hour = Number(timeMatch[1]);
    const minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
    const marker = (timeMatch[3] || '').toLowerCase();
    const normalizedHour =
      marker === 'pm' && hour < 12 ? hour + 12 : marker === 'am' && hour === 12 ? 0 : hour;
    timeValue = `${String(Math.max(0, Math.min(23, normalizedHour))).padStart(2, '0')}:${String(
      Math.max(0, Math.min(59, minute))
    ).padStart(2, '0')}`;
  }

  if (relativeDay && timeValue) return `${relativeDay} ${timeValue}`;
  return relativeDay || timeValue;
};

const extractPerson = (text: string) => {
  const lower = text.toLowerCase();
  const personMatch = lower.match(
    /\b(?:to|with|for|call|message|email)\s+([a-z][a-z\s]{1,28})(?:\s+(?:today|tomorrow|at|about|regarding)\b|$)/i
  );
  if (!personMatch) return '';
  const raw = personMatch[1].trim();
  return raw
    .split(/\s+/)
    .slice(0, 3)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
};

const inferActivity = (text: string, userProfile?: UserProfile | null) => {
  const lower = text.toLowerCase();
  if (lower.includes('irrigat')) return 'Irrigation run';
  if (lower.includes('spray')) return 'Spray window planning';
  if (lower.includes('fertili')) return 'Fertilizer application';
  if (lower.includes('harvest')) return 'Harvest prep';
  if (lower.includes('disease')) return 'Crop disease inspection';
  if (lower.includes('market')) return 'Mandi price check';
  if (userProfile?.primaryCrop) return `${userProfile.primaryCrop} field routine`;
  return 'Farm activity';
};

const parseIntent = (text: string, userProfile?: UserProfile | null): IntentData => {
  const lower = text.toLowerCase();
  const entities: Record<string, string> = {};

  const email = extractEmail(text);
  const phone = extractPhone(text);
  const person = extractPerson(text);
  const timeHint = extractTimeHint(text);

  if (email) {
    entities.email = email;
    entities.recipient = email;
  }
  if (phone) entities.phone = phone;
  if (person) entities.person = person;
  if (timeHint) entities.time = timeHint;
  entities.activity = inferActivity(text, userProfile);

  const hasEmail = /\b(email|mail)\b/i.test(lower);
  const hasWhatsApp = /\b(whatsapp|message)\b/i.test(lower);
  const hasSchedule = /\b(schedule|meeting|book|arrange|plan)\b/i.test(lower);
  const hasReminder = /\b(remind|reminder)\b/i.test(lower);
  const hasTask = /\b(task|todo|to do|check|follow up)\b/i.test(lower);

  let intent = 'create_task';
  if (hasEmail || email) intent = 'send_email';
  else if (hasWhatsApp || phone) intent = 'send_whatsapp_message';
  else if (hasSchedule) intent = 'schedule_farm_activity';
  else if (hasReminder) intent = 'create_task';
  else if (hasTask || WORKFLOW_PATTERN.test(text)) intent = 'create_task';
  else intent = 'unknown';

  let confidence = 0.55;
  if (hasEmail || hasWhatsApp || hasSchedule || hasReminder || hasTask) confidence += 0.15;
  if (Object.keys(entities).length >= 2) confidence += 0.12;
  if (timeHint) confidence += 0.08;
  confidence = Math.min(0.97, confidence);

  return {
    intent,
    entities,
    confidence,
    rawText: text,
  };
};

const runResearchAgent = (intentData: IntentData, knowledge: UserKnowledge): {
  resolvedEntities: Record<string, string>;
  notes: string[];
} => {
  const resolved = { ...intentData.entities };
  const notes: string[] = [];

  const person = resolved.person || resolved.recipient;
  if (person && !resolved.email && !resolved.phone) {
    const contact = localKnowledgeStore.resolveContact(knowledge, person);
    if (contact?.email) {
      resolved.email = contact.email;
      notes.push(`Resolved ${person} email from local knowledge.`);
    }
    if (contact?.phone) {
      resolved.phone = contact.phone;
      notes.push(`Resolved ${person} phone from local knowledge.`);
    }
  }

  if (!resolved.time) {
    resolved.time = knowledge.preferences.workWindow === 'morning' ? 'tomorrow 07:00' : 'today 18:00';
    notes.push(`Applied preferred work window (${knowledge.preferences.workWindow}).`);
  }

  if (knowledge.preferences.communication === 'whatsapp' && !resolved.phone && resolved.person) {
    const contact = localKnowledgeStore.resolveContact(knowledge, resolved.person);
    if (contact?.phone) {
      resolved.phone = contact.phone;
      notes.push('Preferred communication mode matched: WhatsApp.');
    }
  }

  return { resolvedEntities: resolved, notes };
};

const createTaskTitleFromText = (rawText: string) => {
  const cleaned = rawText.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 72) return cleaned;
  return `${cleaned.slice(0, 69)}...`;
};

const runReasoningAgent = (
  intentData: IntentData,
  resolvedEntities: Record<string, string>
): { plan: WorkflowPlan; reasoning: string[] } => {
  const reasoning: string[] = [`Intent: ${intentData.intent}`];
  const steps: WorkflowStep[] = [];
  const suggestions: string[] = [];
  const missing: string[] = [];

  const taskTitle = createTaskTitleFromText(intentData.rawText);
  const activity = resolvedEntities.activity || 'Farm activity';
  const time = resolvedEntities.time || 'today 18:00';

  switch (intentData.intent) {
    case 'send_email': {
      steps.push({
        action: 'send_email',
        params: {
          to: resolvedEntities.email || '',
          subject: `Farm follow-up: ${activity}`,
          body: `Please review this update: ${intentData.rawText}`,
        },
      });
      steps.push({
        action: 'create_task',
        params: {
          title: `Check response for: ${activity}`,
          due: time,
        },
      });
      reasoning.push('Generated email action with follow-up task.');
      if (!resolvedEntities.email) {
        missing.push('recipient_email');
        suggestions.push('Add recipient email in your command for direct send action.');
      }
      break;
    }
    case 'send_whatsapp_message': {
      steps.push({
        action: 'send_whatsapp_message',
        params: {
          number: resolvedEntities.phone || '',
          message: `SmartAgri update: ${intentData.rawText}`,
        },
      });
      steps.push({
        action: 'create_task',
        params: {
          title: `Confirm WhatsApp response (${resolvedEntities.person || 'contact'})`,
          due: time,
        },
      });
      reasoning.push('Generated WhatsApp action with response follow-up.');
      if (!resolvedEntities.phone) {
        missing.push('recipient_phone');
        suggestions.push('Add phone number or contact name for WhatsApp automation.');
      }
      break;
    }
    case 'schedule_farm_activity': {
      steps.push({
        action: 'schedule_farm_activity',
        params: {
          activity,
          time,
          assignee: resolvedEntities.person || 'Field team',
        },
      });
      steps.push({
        action: 'create_task',
        params: {
          title: `${activity} at ${time}`,
        },
      });
      reasoning.push('Generated schedule step and mirrored it as a planner task.');
      if (!resolvedEntities.time) {
        suggestions.push('Specify exact time to improve precision (example: tomorrow 5 PM).');
      }
      break;
    }
    case 'create_task': {
      steps.push({
        action: 'create_task',
        params: {
          title: taskTitle,
          due: time,
        },
      });
      reasoning.push('Generated planner task from command.');
      break;
    }
    default: {
      steps.push({
        action: 'create_task',
        params: {
          title: `Review request: ${taskTitle}`,
          due: time,
        },
      });
      suggestions.push('Try including action words like schedule, remind, email, or WhatsApp.');
      reasoning.push('Fallback task generated because intent is uncertain.');
      break;
    }
  }

  return {
    plan: {
      status: steps.length > 0 ? 'success' : 'error',
      intent: intentData.intent,
      entities: resolvedEntities,
      steps,
      missing,
      suggestions,
      issues: [],
    },
    reasoning,
  };
};

const runVerificationAgent = (
  plan: WorkflowPlan,
  resolvedEntities: Record<string, string>
): { verified: WorkflowPlan; issues: string[] } => {
  const issues: string[] = [];
  const verifiedSteps: WorkflowStep[] = [];

  for (const step of plan.steps) {
    if (!VALID_ACTIONS.has(step.action)) {
      issues.push(`Removed unsupported action: ${step.action}`);
      continue;
    }

    const params = { ...step.params };
    const required = REQUIRED_PARAMS[step.action] || [];

    for (const key of required) {
      if (!params[key]) {
        if (key === 'to' && resolvedEntities.email) {
          params[key] = resolvedEntities.email;
          issues.push("Auto-filled missing email recipient.");
        } else if (key === 'number' && resolvedEntities.phone) {
          params[key] = resolvedEntities.phone;
          issues.push("Auto-filled missing phone number.");
        } else if (key === 'title') {
          params[key] = 'Farm follow-up task';
          issues.push("Auto-filled missing task title.");
        } else if (key === 'subject') {
          params[key] = 'Farm update from SmartAgri';
          issues.push("Auto-filled missing email subject.");
        } else if (key === 'body') {
          params[key] = 'Please review the latest farm task update.';
          issues.push("Auto-filled missing email body.");
        } else if (key === 'message') {
          params[key] = 'SmartAgri follow-up reminder';
          issues.push("Auto-filled missing message.");
        } else if (key === 'activity') {
          params[key] = resolvedEntities.activity || 'Farm activity';
          issues.push("Auto-filled missing farm activity.");
        } else {
          issues.push(`Missing required field: ${key}`);
        }
      }
    }

    if (step.action === 'send_email' && params.to && !params.to.includes('@')) {
      issues.push('Email recipient did not look valid. Kept as task-only follow-up.');
      params.to = 'recipient@pending.local';
    }

    if (step.action === 'send_whatsapp_message' && params.number) {
      params.number = params.number.replace(/\D/g, '');
      if (params.number.length < 10) {
        params.number = '9000000000';
        issues.push('Phone number incomplete. Applied safe placeholder for reminder flow.');
      }
    }

    verifiedSteps.push({ ...step, params });
  }

  return {
    verified: {
      ...plan,
      status: verifiedSteps.length > 0 ? 'success' : 'error',
      steps: verifiedSteps,
      issues,
    },
    issues,
  };
};

const buildPlannerTasks = (steps: WorkflowStep[]) => {
  const tasks: string[] = [];
  for (const step of steps) {
    if (step.action === 'create_task') {
      tasks.push(step.params.title || 'Farm task');
      continue;
    }

    if (step.action === 'schedule_farm_activity') {
      const activity = step.params.activity || 'Farm activity';
      const time = step.params.time ? ` (${step.params.time})` : '';
      tasks.push(`${activity}${time}`);
      continue;
    }

    if (step.action === 'send_email') {
      tasks.push(`Follow up email: ${step.params.subject || 'Farm update'}`);
      continue;
    }

    if (step.action === 'send_whatsapp_message') {
      tasks.push(`Check WhatsApp response (${step.params.number || 'contact'})`);
      continue;
    }

    if (step.action === 'send_message') {
      tasks.push(`Check message status (${step.params.to || 'contact'})`);
    }
  }

  return dedupe(tasks);
};

const runExplanationAgent = (
  plan: WorkflowPlan,
  intentData: IntentData,
  issues: string[]
): WorkflowDecision => {
  const reasoning: string[] = [
    `Understood intent as "${intentData.intent}".`,
    `Prepared ${plan.steps.length} actionable step(s).`,
  ];

  if (issues.length > 0) {
    reasoning.push(`Verification adjusted ${issues.length} field(s) for execution safety.`);
  } else {
    reasoning.push('Verification passed without adjustments.');
  }

  const actionsLabel = plan.steps.map((step) => step.action.replace(/_/g, ' ')).join(', ');
  const confidencePenalty = Math.min(0.22, issues.length * 0.03 + (plan.missing.length > 0 ? 0.06 : 0));
  const confidence = Math.max(0.52, Math.min(0.98, intentData.confidence + 0.18 - confidencePenalty));

  const explanation =
    plan.steps.length > 0
      ? `I prepared these actions: ${actionsLabel}.`
      : 'I could not build executable steps from this request.';

  const suggestions = dedupe([
    ...plan.suggestions,
    ...(plan.missing.length > 0 ? ['Add exact contact details for direct communication steps.'] : []),
    ...(plan.intent === 'schedule_farm_activity'
      ? ['Add crop and field block name for better assignment tracking.']
      : []),
  ]);

  return {
    decision: plan.steps.length > 0 ? `Executing: ${actionsLabel}` : 'No action generated',
    reasoning,
    confidence,
    explanation,
    suggestions,
  };
};

const createTrace = (
  agent: string,
  role: string,
  input: string,
  output: string,
  reasoning: string[],
  confidence: number,
  startAt: number
): AgentTrace => ({
  agent,
  role,
  input,
  output,
  reasoning,
  confidence,
  durationMs: Date.now() - startAt,
});

export const workflowEngine = {
  isWorkflowCommand(text: string): boolean {
    return WORKFLOW_PATTERN.test(text);
  },

  async runTextWorkflow(input: RunWorkflowInput): Promise<LocalWorkflowResult> {
    const text = input.text.trim();
    const userId = input.userId || 'smartagri_user';
    const knowledge = localKnowledgeStore.load(userId, input.userProfile);
    const traces: AgentTrace[] = [];

    const intentStart = Date.now();
    const intentData = parseIntent(text, input.userProfile);
    traces.push(
      createTrace(
        'IntentAgent',
        'Intent parser and entity extractor',
        text,
        `intent=${intentData.intent}, entities=${Object.keys(intentData.entities).length}`,
        [`Raw command normalized for local workflow execution.`],
        intentData.confidence,
        intentStart
      )
    );

    const researchStart = Date.now();
    const research = runResearchAgent(intentData, knowledge);
    traces.push(
      createTrace(
        'ResearchAgent',
        'Context resolver using local farmer memory',
        JSON.stringify(intentData.entities),
        `resolved=${Object.keys(research.resolvedEntities).join(', ') || 'none'}`,
        research.notes.length > 0 ? research.notes : ['No extra context found.'],
        0.9,
        researchStart
      )
    );

    const reasoningStart = Date.now();
    const reasoning = runReasoningAgent(intentData, research.resolvedEntities);
    traces.push(
      createTrace(
        'ReasoningAgent',
        'Workflow planner',
        intentData.intent,
        `${reasoning.plan.steps.length} step(s) generated`,
        reasoning.reasoning,
        0.88,
        reasoningStart
      )
    );

    const verifyStart = Date.now();
    const verification = runVerificationAgent(reasoning.plan, research.resolvedEntities);
    traces.push(
      createTrace(
        'VerificationAgent',
        'Safety and parameter validator',
        `${reasoning.plan.steps.length} step(s)`,
        `${verification.verified.steps.length} step(s) verified`,
        verification.issues.length > 0 ? verification.issues : ['All checks passed.'],
        verification.issues.length > 0 ? 0.78 : 0.94,
        verifyStart
      )
    );

    const explanationStart = Date.now();
    const decision = runExplanationAgent(verification.verified, intentData, verification.issues);
    traces.push(
      createTrace(
        'ExplanationAgent',
        'Farmer-facing explanation and confidence model',
        decision.decision,
        `confidence=${Math.round(decision.confidence * 100)}%`,
        decision.reasoning,
        decision.confidence,
        explanationStart
      )
    );

    const plannerTasks = buildPlannerTasks(verification.verified.steps);

    const result: LocalWorkflowResult = {
      status: verification.verified.status,
      message:
        verification.verified.status === 'success'
          ? `Done. I prepared ${verification.verified.steps.length} workflow step(s) and ${plannerTasks.length} planner task(s).`
          : 'I could not create a valid workflow from that command.',
      confidence: decision.confidence,
      decision,
      intentData: {
        ...intentData,
        entities: research.resolvedEntities,
      },
      workflow: verification.verified,
      plannerTasks,
      agentTraces: traces,
      source: 'smartagri-local',
    };

    localKnowledgeStore.trackUsage(
      userId,
      { intent: intentData.intent, command: intentData.rawText },
      input.userProfile
    );

    if (result.intentData.entities.person) {
      const maybePhone = result.intentData.entities.phone;
      const maybeEmail = result.intentData.entities.email;
      if (maybePhone || maybeEmail) {
        localKnowledgeStore.upsertContact(
          userId,
          {
            name: result.intentData.entities.person,
            phone: maybePhone || undefined,
            email: maybeEmail || undefined,
          },
          input.userProfile
        );
      }
    }

    return result;
  },
};
