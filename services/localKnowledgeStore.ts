import { UserProfile } from '../types';

export interface KnowledgeContact {
  name: string;
  email?: string;
  phone?: string;
  relation?: string;
}

export interface KnowledgePreferences {
  communication: 'whatsapp' | 'email' | 'phone';
  workWindow: 'morning' | 'evening';
}

export interface UserKnowledge {
  userId: string;
  contacts: Record<string, KnowledgeContact>;
  preferences: KnowledgePreferences;
  lastIntent?: string;
  recentCommands: string[];
}

const STORAGE_PREFIX = 'smartagri_knowledge_';
const DEFAULT_CONTACTS: KnowledgeContact[] = [
  { name: 'Input Dealer', phone: '9000000001', relation: 'supplier' },
  { name: 'FPO Coordinator', phone: '9000000002', relation: 'fpo' },
  { name: 'Village Agronomist', phone: '9000000003', relation: 'advisor' },
];

const normalizeName = (value: string) => value.trim().toLowerCase();

const baseKnowledge = (userId: string): UserKnowledge => ({
  userId,
  contacts: Object.fromEntries(
    DEFAULT_CONTACTS.map((contact) => [normalizeName(contact.name), contact])
  ),
  preferences: {
    communication: 'whatsapp',
    workWindow: 'evening',
  },
  recentCommands: [],
});

const mergeUserProfile = (knowledge: UserKnowledge, userProfile?: UserProfile | null): UserKnowledge => {
  if (!userProfile) return knowledge;

  const next = { ...knowledge, contacts: { ...knowledge.contacts } };
  const selfContact: KnowledgeContact = {
    name: userProfile.name || 'Farmer',
    phone: userProfile.phone || undefined,
    relation: 'self',
  };

  if (userProfile.name) {
    next.contacts[normalizeName(userProfile.name)] = selfContact;
  }

  if (userProfile.irrigationType === 'Drip') {
    next.preferences.workWindow = 'morning';
  }

  return next;
};

export const localKnowledgeStore = {
  load(userId: string, userProfile?: UserProfile | null): UserKnowledge {
    if (typeof window === 'undefined') return mergeUserProfile(baseKnowledge(userId), userProfile);

    const key = `${STORAGE_PREFIX}${userId}`;
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      const seeded = mergeUserProfile(baseKnowledge(userId), userProfile);
      window.localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }

    try {
      const parsed = JSON.parse(raw) as UserKnowledge;
      const safe: UserKnowledge = {
        ...baseKnowledge(userId),
        ...parsed,
        contacts: {
          ...baseKnowledge(userId).contacts,
          ...(parsed.contacts || {}),
        },
        recentCommands: Array.isArray(parsed.recentCommands) ? parsed.recentCommands.slice(0, 20) : [],
      };
      const merged = mergeUserProfile(safe, userProfile);
      window.localStorage.setItem(key, JSON.stringify(merged));
      return merged;
    } catch {
      const fallback = mergeUserProfile(baseKnowledge(userId), userProfile);
      window.localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
  },

  save(userId: string, knowledge: UserKnowledge): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(knowledge));
  },

  resolveContact(knowledge: UserKnowledge, query: string): KnowledgeContact | null {
    const key = normalizeName(query);
    if (knowledge.contacts[key]) return knowledge.contacts[key];

    for (const [name, contact] of Object.entries(knowledge.contacts)) {
      if (name.includes(key) || key.includes(name)) {
        return contact;
      }
    }

    return null;
  },

  upsertContact(userId: string, contact: KnowledgeContact, userProfile?: UserProfile | null): void {
    const knowledge = this.load(userId, userProfile);
    knowledge.contacts[normalizeName(contact.name)] = {
      ...(knowledge.contacts[normalizeName(contact.name)] || {}),
      ...contact,
    };
    this.save(userId, knowledge);
  },

  trackUsage(userId: string, update: { intent?: string; command?: string }, userProfile?: UserProfile | null): void {
    const knowledge = this.load(userId, userProfile);
    if (update.intent) {
      knowledge.lastIntent = update.intent;
    }
    if (update.command) {
      knowledge.recentCommands = [update.command, ...knowledge.recentCommands.filter((item) => item !== update.command)].slice(0, 20);
    }
    this.save(userId, knowledge);
  },
};
