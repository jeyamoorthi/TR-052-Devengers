/**
 * schedulerService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Browser-based APScheduler equivalent.
 * Manages: irrigation reminders (30 min before), weekly advisory refresh.
 * Uses: setInterval + localStorage timestamps + Web Notifications API.
 *
 * In production: replace with Celery beat tasks hitting the FastAPI backend.
 */

import { UserProfile, AdvisoryLog, ScheduledJob } from '../types';
import { weeklyAdvisoryService } from './weeklyAdvisoryService';

const JOBS_KEY = 'smartagri_scheduled_jobs';
const TICK_INTERVAL = 60_000; // check every 60 seconds

let tickHandle: number | null = null;

// ─── Notification helper ─────────────────────────────────────────────────────

async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function sendNotification(title: string, body: string, icon = '/favicon.ico') {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon });
  } else {
    console.info(`[Scheduler] 🔔 ${title}: ${body}`);
  }
}

// ─── Job persistence ─────────────────────────────────────────────────────────

function loadJobs(): ScheduledJob[] {
  try {
    return JSON.parse(localStorage.getItem(JOBS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveJobs(jobs: ScheduledJob[]) {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

function upsertJob(job: ScheduledJob) {
  const jobs = loadJobs();
  const idx = jobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) jobs[idx] = job;
  else jobs.push(job);
  saveJobs(jobs);
}

// ─── Irrigation Reminder ─────────────────────────────────────────────────────

function scheduleIrrigationReminders(advisory: AdvisoryLog) {
  const thirty = 30 * 60 * 1000; // 30 min in ms

  for (const slot of advisory.irrigation_schedule) {
    if (slot.reminder_sent) continue;

    const [hours, minutes] = slot.time.split(':').map(Number);
    const slotDate = new Date(`${slot.date}T${slot.time}:00`);
    const reminderTime = slotDate.getTime() - thirty;

    if (reminderTime <= Date.now()) continue; // Already past

    const jobId = `irrigation_${advisory.uid}_${slot.date}_${slot.time}`;
    upsertJob({
      id: jobId,
      type: 'irrigation_reminder',
      uid: advisory.uid,
      next_run: reminderTime,
      interval_ms: 0, // One-shot
      last_run: null,
      payload: {
        advisoryId: advisory.id,
        date: slot.date,
        time: slot.time,
        duration_minutes: slot.duration_minutes,
        method: slot.method,
        day: slot.day,
      },
    });
    console.info(
      `[Scheduler] Irrigation reminder set for ${slot.day} ${slot.date} at ${slot.time} (fires at ${new Date(reminderTime).toLocaleTimeString()})`
    );
  }
}

// ─── Tick handler ─────────────────────────────────────────────────────────────

async function tick(user: UserProfile) {
  const now = Date.now();
  const jobs = loadJobs().filter((j) => j.uid === user.uid);

  for (const job of jobs) {
    if (job.next_run > now) continue;

    if (job.type === 'irrigation_reminder') {
      const p = job.payload as { day: string; time: string; duration_minutes: number; method: string; date: string; advisoryId: string };
      sendNotification(
        '💧 Irrigation Reminder — SmartAgri',
        `${p.method} starts in 30 minutes for ${p.day} (${p.time}). Duration: ${p.duration_minutes} min.`
      );

      // Mark notification as sent
      const log = await weeklyAdvisoryService
        .getAdvisoryHistory(user.uid)
        .then((logs) => logs.find((l) => l.id === p.advisoryId) || null);
      if (log) {
        await weeklyAdvisoryService.markReminderSent(user.uid, p.advisoryId, p.date);
      }

      // Remove one-shot job
      const allJobs = loadJobs().filter((j) => j.id !== job.id);
      saveJobs(allJobs);
    }

    if (job.type === 'weekly_advisory') {
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      sendNotification('📋 Weekly Farm Advisory', 'Your new weekly farming plan is ready. Open SmartAgri to view.');
      // Regenerate
      weeklyAdvisoryService.getWeeklyAdvisory(user, true).then((advisory) => {
        scheduleIrrigationReminders(advisory);
      });
      // Reschedule
      upsertJob({ ...job, last_run: now, next_run: now + sevenDays });
    }
  }

  // Pest check (every 6 hours)
  const pestJob = jobs.find((j) => j.type === 'pest_check');
  if (!pestJob) {
    upsertJob({
      id: `pest_check_${user.uid}`,
      type: 'pest_check',
      uid: user.uid,
      next_run: now + 6 * 60 * 60 * 1000,
      interval_ms: 6 * 60 * 60 * 1000,
      last_run: null,
      payload: {},
    });
  } else if (pestJob.next_run <= now) {
    sendNotification(
      '🐛 Pest Alert Check',
      'Checking for new pest reports in your area...'
    );
    upsertJob({ ...pestJob, last_run: now, next_run: now + pestJob.interval_ms });
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const schedulerService = {
  /**
   * Initialize and start the scheduler.
   * Call this once when the Dashboard mounts.
   */
  async start(user: UserProfile) {
    await requestNotificationPermission();

    // Schedule weekly advisory regeneration
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const weeklyJobId = `weekly_advisory_${user.uid}`;
    const existing = loadJobs().find((j) => j.id === weeklyJobId);
    if (!existing) {
      upsertJob({
        id: weeklyJobId,
        type: 'weekly_advisory',
        uid: user.uid,
        next_run: Date.now() + sevenDays,
        interval_ms: sevenDays,
        last_run: null,
        payload: {},
      });
    }

    // Load existing advisory and schedule reminders
    const advisory = await weeklyAdvisoryService.getWeeklyAdvisory(user);
    scheduleIrrigationReminders(advisory);

    // Start tick loop
    if (tickHandle !== null) window.clearInterval(tickHandle);
    tickHandle = window.setInterval(() => tick(user), TICK_INTERVAL);
    console.info('[Scheduler] ✓ Started. Tick every 60s.');
  },

  stop() {
    if (tickHandle !== null) {
      window.clearInterval(tickHandle);
      tickHandle = null;
      console.info('[Scheduler] Stopped.');
    }
  },

  /** Manually add irrigation reminders after regenerating advisory */
  scheduleIrrigationReminders,

  getJobs(uid: string): ScheduledJob[] {
    return loadJobs().filter((j) => j.uid === uid);
  },
};
