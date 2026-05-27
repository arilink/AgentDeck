import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { makeLogger } from './logger.js';

const log = makeLogger('transcripts');

const SYSTEM_TAG_RE = /<([a-zA-Z][\w-]*)\b[^>]*>[\s\S]*?<\/\1>/g;

function stripSystemTags(s: string): string {
  return s.replace(SYSTEM_TAG_RE, '').trim();
}

interface TranscriptUserLine {
  type: 'user';
  message?: {
    role?: string;
    content?: string | Array<{ type?: string; text?: string }>;
  };
}

function extractText(line: TranscriptUserLine): string | null {
  const msg = line.message;
  if (!msg || msg.role !== 'user') return null;
  const c = msg.content;
  if (typeof c === 'string') return stripSystemTags(c) || null;
  if (!Array.isArray(c)) return null;
  const parts: string[] = [];
  for (const part of c) {
    if (part?.type === 'text' && typeof part.text === 'string') {
      const cleaned = stripSystemTags(part.text);
      if (cleaned) parts.push(cleaned);
    }
  }
  return parts.length ? parts.join('\n') : null;
}

export async function findClaudeTranscript(sessionId: string): Promise<string | null> {
  const projectsDir = path.join(os.homedir(), '.claude', 'projects');
  let projects: string[];
  try {
    projects = await fs.readdir(projectsDir);
  } catch {
    return null;
  }
  for (const project of projects) {
    const filePath = path.join(projectsDir, project, `${sessionId}.jsonl`);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      continue;
    }
  }
  return null;
}

export async function readFirstUserPrompt(sessionId: string): Promise<string | null> {
  const filePath = await findClaudeTranscript(sessionId);
  if (!filePath) return null;
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      let obj: TranscriptUserLine;
      try {
        obj = JSON.parse(line) as TranscriptUserLine;
      } catch {
        continue;
      }
      if (obj.type !== 'user') continue;
      const text = extractText(obj);
      if (text) return text;
    }
  } catch (err) {
    log.warn(`failed to read transcript ${filePath}`, err);
  }
  return null;
}
