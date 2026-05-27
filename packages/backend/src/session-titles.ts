import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { makeLogger } from './logger.js';

const log = makeLogger('session-titles');

const STORE_DIR = path.join(os.homedir(), '.agentdeck');
const STORE_PATH = path.join(STORE_DIR, 'sessions.json');

export interface SessionTitleRecord {
  first_prompt?: string;
  role?: string;
  target?: string;
  job?: string;
  mission?: string;
  updated_at: number;
}

type Store = Record<string, SessionTitleRecord>;

let cache: Store | null = null;
let loadPromise: Promise<Store> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function load(): Promise<Store> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await fs.readFile(STORE_PATH, 'utf8');
      cache = JSON.parse(raw) as Store;
    } catch {
      cache = {};
    }
    return cache;
  })();
  return loadPromise;
}

async function persist(): Promise<void> {
  if (!cache) return;
  const snapshot = JSON.stringify(cache, null, 2);
  try {
    await fs.mkdir(STORE_DIR, { recursive: true });
    await fs.writeFile(STORE_PATH, snapshot, 'utf8');
  } catch (err) {
    log.warn('failed to persist sessions store', err);
  }
}

export async function getRecord(key: string): Promise<SessionTitleRecord | undefined> {
  const store = await load();
  return store[key];
}

export async function upsertRecord(key: string, patch: Partial<SessionTitleRecord>): Promise<SessionTitleRecord> {
  const store = await load();
  const next: SessionTitleRecord = {
    ...(store[key] || {}),
    ...patch,
    updated_at: Date.now(),
  };
  store[key] = next;
  writeQueue = writeQueue.then(persist);
  return next;
}

const MARKERS: Array<{ field: keyof SessionTitleRecord; re: RegExp }> = [
  { field: 'role',    re: /\/\/\s*role\s+(.+?)(?:\n|$)/i },
  { field: 'target',  re: /\/\/\s*target\s+(.+?)(?:\n|$)/i },
  { field: 'job',     re: /\/\/\s*job\s+(.+?)(?:\n|$)/i },
  { field: 'mission', re: /\/\/\s*mission\s+(.+?)(?:\n|$)/i },
];

export interface TitleHints {
  role?: string;
  target?: string;
  job?: string;
  mission?: string;
}

export function extractTitleHints(prompt: string): TitleHints {
  const hints: TitleHints = {};
  for (const { field, re } of MARKERS) {
    const m = prompt.match(re);
    if (m && m[1]) {
      const val = m[1].trim();
      if (val) hints[field as 'role' | 'target' | 'job' | 'mission'] = val;
    }
  }
  return hints;
}
