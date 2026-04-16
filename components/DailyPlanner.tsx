import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, ClipboardList, Plus, Trash2 } from 'lucide-react';

interface DailyPlannerProps {
  userId: string;
  compact?: boolean;
  onOpenFull?: () => void;
}

interface PlannerTask {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}

const templateTasks = [
  'Check irrigation schedule',
  'Inspect leaves for disease spots',
  'Record weather and humidity',
];

const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DailyPlanner: React.FC<DailyPlannerProps> = ({ userId, compact = false, onOpenFull }) => {
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [storageKey, setStorageKey] = useState('');

  useEffect(() => {
    const key = `smartagri_planner_${userId}_${getLocalDateKey()}`;
    setStorageKey(key);
    const saved = localStorage.getItem(key);

    if (saved) {
      try {
        setTasks(JSON.parse(saved));
        return;
      } catch {
        // Ignore corrupt data and re-seed.
      }
    }

    const seeded = templateTasks.map((title, index) => ({
      id: `${Date.now()}_${index}`,
      title,
      done: false,
      createdAt: Date.now(),
    }));
    setTasks(seeded);
  }, [userId]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(tasks));
  }, [storageKey, tasks]);

  const completedCount = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const addTask = () => {
    const title = taskInput.trim();
    if (!title) return;

    const next: PlannerTask = {
      id: `${Date.now()}`,
      title,
      done: false,
      createdAt: Date.now(),
    };
    setTasks((prev) => [next, ...prev]);
    setTaskInput('');
  };

  const renderedTasks = compact ? tasks.slice(0, 3) : tasks;

  return (
    <section className="app-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="app-chip mb-2">
            <ClipboardList size={14} />
            Today
          </div>
          <h3 className="text-lg font-bold text-[var(--text-900)]">Daily farm planner</h3>
          <p className="text-sm text-[var(--text-700)]">{completedCount}/{tasks.length} tasks done</p>
        </div>
        <div className="min-w-14 rounded-xl bg-[var(--brand-100)] p-2 text-center">
          <p className="text-lg font-extrabold text-[var(--brand-700)]">{progress}%</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--brand-700)]">Done</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {renderedTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white p-3"
          >
            <button
              type="button"
              onClick={() => toggleTask(task.id)}
              className="flex items-center gap-2 text-left"
            >
              {task.done ? (
                <CheckCircle2 size={18} className="text-[var(--brand-700)]" />
              ) : (
                <Circle size={18} className="text-[var(--text-700)]" />
              )}
              <span className={`text-sm ${task.done ? 'line-through text-gray-400' : 'text-[var(--text-900)]'}`}>
                {task.title}
              </span>
            </button>
            {!compact && (
              <button
                type="button"
                onClick={() => deleteTask(task.id)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Delete task"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}

        {tasks.length === 0 && (
          <p className="rounded-xl bg-[var(--brand-100)] p-3 text-sm font-semibold text-[var(--brand-700)]">
            No tasks yet. Add one below.
          </p>
        )}
      </div>

      {!compact && (
        <div className="mt-4 flex gap-2">
          <input
            value={taskInput}
            onChange={(event) => setTaskInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addTask();
              }
            }}
            placeholder="Add a farm task..."
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-500)]"
          />
          <button
            type="button"
            onClick={addTask}
            className="inline-flex items-center gap-1 rounded-xl bg-[var(--brand-700)] px-3 py-2 text-sm font-bold text-white transition hover:bg-[var(--brand-500)]"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      )}

      {compact && onOpenFull && (
        <button
          type="button"
          onClick={onOpenFull}
          className="mt-4 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] py-2 text-sm font-bold text-[var(--brand-700)] transition hover:border-[var(--brand-500)] hover:text-[var(--brand-500)]"
        >
          Open full planner
        </button>
      )}
    </section>
  );
};

export default DailyPlanner;
