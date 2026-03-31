// Data model, seed data, and persistence for Loose Threads

export const SOURCE_COLORS = {
  claude: '#D4845A',
  search: '#6B8E8A',
  manual: '#8B7EC8',
  calendar: '#C2956B',
  email: '#5B86A7',
  other: '#9C9C9C',
};

export const SOURCES = ['claude', 'search', 'manual', 'calendar', 'email', 'other'];

const SEED_THREADS = [
  { title: 'Health panel — lipid followup', source: 'claude', category: 'health', status: 'knotted' },
  { title: 'Kid eval — reach out to Dr. G', source: 'claude', category: 'family', status: 'loose' },
  { title: 'Renovation — Buestad timeline', source: 'manual', category: 'home', status: 'loose' },
  { title: '401k contribution math', source: 'claude', category: 'finance', status: 'bowed' },
  { title: 'Find a PCP in Alameda', source: 'search', category: 'health', status: 'loose' },
  { title: 'TK enrollment — AUSD deadlines', source: 'search', category: 'family', status: 'knotted' },
  { title: 'Spin class schedule — Pedal', source: 'search', category: 'health', status: 'loose' },
  { title: 'Italian au pair search', source: 'manual', category: 'family', status: 'loose' },
  { title: 'KVM switch setup — Sabrent', source: 'claude', category: 'tech', status: 'bowed' },
  { title: 'Carmel drive — plan next trip', source: 'manual', category: 'fun', status: 'loose' },
];

let uid = 0;
export function generateId() {
  return `thread_${Date.now()}_${uid++}`;
}

function createThread(data) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: data.title,
    source: data.source || 'manual',
    category: data.category || '',
    color: SOURCE_COLORS[data.source] || SOURCE_COLORS.manual,
    thickness: 2 + Math.random() * 2,
    status: data.status || 'loose',
    createdAt: now,
    updatedAt: now,
    notes: data.notes || '',
  };
}

function buildSeedData() {
  return {
    threads: SEED_THREADS.map(createThread),
    categories: ['health', 'home', 'work', 'family', 'finance', 'tech', 'fun'],
    lastUpdated: new Date().toISOString(),
  };
}

// Storage helpers — use localStorage as fallback since window.storage may not exist
function getStorage() {
  return typeof window !== 'undefined' && window.storage ? window.storage : null;
}

export async function loadData() {
  try {
    const storage = getStorage();
    if (storage) {
      const raw = await storage.get('threads');
      if (raw) return JSON.parse(raw);
    } else {
      const raw = localStorage.getItem('loose-threads-data');
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load data:', e);
  }
  return null;
}

export async function saveData(data) {
  try {
    const serialized = JSON.stringify(data);
    const storage = getStorage();
    if (storage) {
      await storage.set('threads', serialized);
    } else {
      localStorage.setItem('loose-threads-data', serialized);
    }
  } catch (e) {
    console.warn('Failed to save data:', e);
  }
}

export async function loadPreferences() {
  try {
    const storage = getStorage();
    if (storage) {
      const raw = await storage.get('preferences');
      if (raw) return JSON.parse(raw);
    } else {
      const raw = localStorage.getItem('loose-threads-prefs');
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load preferences:', e);
  }
  return { sortOrder: 'created', showBowed: false, colorScheme: 'source' };
}

export async function savePreferences(prefs) {
  try {
    const serialized = JSON.stringify(prefs);
    const storage = getStorage();
    if (storage) {
      await storage.set('preferences', serialized);
    } else {
      localStorage.setItem('loose-threads-prefs', serialized);
    }
  } catch (e) {
    console.warn('Failed to save preferences:', e);
  }
}

export { createThread, buildSeedData };
