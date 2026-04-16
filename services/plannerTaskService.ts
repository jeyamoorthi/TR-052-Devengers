export interface PlannerTask {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  source?: 'manual' | 'workflow';
}

const normalizeTitle = (value: string) => value.trim().toLowerCase();

const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStorageKey = (userId: string, dateKey = getLocalDateKey()) =>
  `smartagri_planner_${userId}_${dateKey}`;

const safeParse = (raw: string | null): PlannerTask[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.title === 'string');
  } catch {
    return [];
  }
};

const toTask = (title: string, source: PlannerTask['source']): PlannerTask => ({
  id: `${Date.now()}_${Math.round(Math.random() * 1e6)}`,
  title: title.trim(),
  done: false,
  createdAt: Date.now(),
  source,
});

export const plannerTaskService = {
  getStorageKey,

  loadTasks(userId: string, dateKey?: string): PlannerTask[] {
    if (typeof window === 'undefined') return [];
    return safeParse(window.localStorage.getItem(getStorageKey(userId, dateKey)));
  },

  saveTasks(userId: string, tasks: PlannerTask[], dateKey?: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(getStorageKey(userId, dateKey), JSON.stringify(tasks));
  },

  initializeTasks(userId: string, defaultTitles: string[]): PlannerTask[] {
    const existing = this.loadTasks(userId);
    if (existing.length > 0) return existing;

    const seeded = defaultTitles.map((title) => toTask(title, 'manual'));
    this.saveTasks(userId, seeded);
    return seeded;
  },

  appendTasks(userId: string, titles: string[], source: PlannerTask['source'] = 'workflow'): PlannerTask[] {
    const cleanTitles = titles.map((item) => item.trim()).filter(Boolean);
    if (cleanTitles.length === 0) return this.loadTasks(userId);

    const existing = this.loadTasks(userId);
    const seen = new Set(existing.map((task) => normalizeTitle(task.title)));
    const additions = cleanTitles
      .filter((title) => !seen.has(normalizeTitle(title)))
      .map((title) => toTask(title, source));

    if (additions.length === 0) return existing;

    const next = [...additions, ...existing];
    this.saveTasks(userId, next);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('smartagri:planner-updated', {
          detail: { userId, added: additions.length },
        })
      );
    }

    return next;
  },
};
