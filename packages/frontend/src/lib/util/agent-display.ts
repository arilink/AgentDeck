import type { AgentRecord } from '$lib/stores/agents';

export function workdirTail(a: AgentRecord): string {
  const w = a.metadata?.workdir;
  const s = typeof w === 'string' ? w : '';
  const parts = s.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? a.source;
}

function metaStr(a: AgentRecord, key: string): string {
  const v = a.metadata?.[key];
  return typeof v === 'string' ? v : '';
}

export function sessionTitle(a: AgentRecord): string {
  const role = metaStr(a, 'session_role');
  const target = metaStr(a, 'session_target');
  const job = metaStr(a, 'session_job');
  const firstPrompt = metaStr(a, 'session_first_prompt');
  const lastPrompt = metaStr(a, 'last_user_prompt');

  if (role && target) return `${role} · ${target}`;
  if (target) return target;
  if (job) return job;
  if (role) return role;
  if (firstPrompt && firstPrompt !== lastPrompt) return firstPrompt;
  return '';
}

export function shortId(a: AgentRecord): string {
  const colon = a.id.indexOf(':');
  const session = colon > 0 ? a.id.slice(colon + 1) : a.id;
  return session.slice(-4);
}

export type Actor = 'User' | 'Agent' | '';

export interface RealtimeInfo {
  actor: Actor;
  activity: string;
}

function baseName(p: string): string {
  if (!p) return '';
  const parts = p.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

function pathTail(p: string, segments = 2): string {
  if (!p) return '';
  const parts = p.split(/[/\\]/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? p;
  const tail = parts.slice(-segments);
  return tail.join('/');
}

function truncate(s: string, max = 40): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function hostOf(url: string): string {
  try { return new URL(url).host; } catch { return ''; }
}

interface ToolArgs {
  file_path?: string;
  pattern?: string;
  command?: string;
  url?: string;
  query?: string;
  subagent_type?: string;
  description?: string;
  skill?: string;
  path?: string;
  prompt?: string;
}

function parseArgs(preview: string): ToolArgs {
  if (!preview) return {};
  try {
    const v = JSON.parse(preview);
    return typeof v === 'object' && v !== null ? (v as ToolArgs) : {};
  } catch {
    return {};
  }
}

const CODE_EXTS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'svelte', 'vue',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift',
  'c', 'cc', 'cpp', 'h', 'hpp', 'cs',
  'sh', 'bash', 'zsh', 'ps1', 'lua',
  'sql', 'css', 'scss', 'html',
]);
const DOC_EXTS = new Set(['md', 'mdx', 'txt', 'rst', 'adoc']);
const CONFIG_EXTS = new Set(['json', 'yaml', 'yml', 'toml', 'ini', 'env', 'lock', 'editorconfig']);
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp']);
const DATA_EXTS = new Set(['csv', 'tsv', 'xml', 'parquet']);
const PDF_EXTS = new Set(['pdf']);
const NOTEBOOK_EXTS = new Set(['ipynb']);

function extOf(p: string): string {
  const base = baseName(p);
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return '';
  return base.slice(dot + 1).toLowerCase();
}

type FileKind = 'code' | 'doc' | 'config' | 'image' | 'data' | 'pdf' | 'notebook' | 'other';

function fileKind(p: string): FileKind {
  const e = extOf(p);
  if (!e) return 'other';
  if (CODE_EXTS.has(e)) return 'code';
  if (DOC_EXTS.has(e)) return 'doc';
  if (CONFIG_EXTS.has(e)) return 'config';
  if (IMAGE_EXTS.has(e)) return 'image';
  if (DATA_EXTS.has(e)) return 'data';
  if (PDF_EXTS.has(e)) return 'pdf';
  if (NOTEBOOK_EXTS.has(e)) return 'notebook';
  return 'other';
}

function readPhrase(kind: FileKind): string {
  switch (kind) {
    case 'code': return 'Reading code';
    case 'doc': return 'Reading doc';
    case 'config': return 'Viewing config';
    case 'image': return 'Viewing image';
    case 'data': return 'Viewing data';
    case 'pdf': return 'Reading PDF';
    case 'notebook': return 'Opening notebook';
    default: return 'Reading file';
  }
}

function writePhrase(kind: FileKind): string {
  switch (kind) {
    case 'code': return 'Writing code';
    case 'doc': return 'Writing doc';
    case 'config': return 'Writing config';
    default: return 'Creating file';
  }
}

function editPhrase(kind: FileKind): string {
  switch (kind) {
    case 'code': return 'Editing code';
    case 'doc': return 'Editing doc';
    case 'config': return 'Editing config';
    case 'notebook': return 'Editing notebook';
    default: return 'Editing file';
  }
}

function firstWord(cmd: string): string {
  const m = cmd.trim().match(/^(\S+)/);
  return m ? m[1] : '';
}

function describeBash(rawCmd: string): string {
  const cmd = rawCmd.trim();
  if (!cmd) return 'Running command';
  const head = firstWord(cmd);
  const rest = cmd.slice(head.length).trim();
  const restShort = truncate(rest, 28);

  switch (head) {
    case 'git': {
      const sub = firstWord(rest);
      return sub ? `git ${sub}` : 'git command';
    }
    case 'npm':
    case 'pnpm':
    case 'yarn':
    case 'bun': {
      const sub = firstWord(rest);
      return sub ? `${head} ${sub}` : `${head} command`;
    }
    case 'node':
    case 'python':
    case 'python3':
    case 'ts-node':
    case 'tsx':
    case 'deno':
      return restShort ? `Running script: ${restShort}` : 'Running script';
    case 'cd':
    case 'ls':
    case 'pwd':
    case 'cat':
    case 'echo':
    case 'mkdir':
    case 'rm':
    case 'mv':
    case 'cp':
      return restShort ? `shell: ${head} ${restShort}` : `shell: ${head}`;
    case 'docker':
    case 'kubectl':
    case 'helm':
    case 'terraform': {
      const sub = firstWord(rest);
      return sub ? `${head} ${sub}` : head;
    }
    case 'curl':
    case 'wget':
      return restShort ? `Fetching: ${head} ${restShort}` : `Fetching: ${head}`;
    default:
      return `Running: ${truncate(cmd, 32)}`;
  }
}

function describeMcp(tool: string): string {
  // mcp__<server>__<api>
  const parts = tool.split('__');
  if (parts.length < 3) return `Calling ${tool}`;
  const server = parts[1];
  const api = parts.slice(2).join('__');
  if (server === 'pencil') return `Design canvas: ${api}`;
  return `Calling ${server}/${api}`;
}

function humanizeTool(tool: string, argsPreview: string): string {
  const args = parseArgs(argsPreview);
  const fp = args.file_path ?? args.path ?? '';
  const kind = fileKind(fp);
  const fileLabel = pathTail(fp);

  switch (tool) {
    case 'Read':
    case 'NotebookRead':
      return fileLabel ? `${readPhrase(kind)} ${fileLabel}` : readPhrase(kind);
    case 'Write':
      return fileLabel ? `${writePhrase(kind)} ${fileLabel}` : 'Creating file';
    case 'Edit':
    case 'MultiEdit':
      return fileLabel ? `${editPhrase(kind)} ${fileLabel}` : 'Editing file';
    case 'NotebookEdit':
      return fileLabel ? `Editing notebook ${fileLabel}` : 'Editing notebook';
    case 'LS':
      return fileLabel ? `Listing ${fileLabel}/` : 'Listing directory';
    case 'Glob':
      return `Finding files: ${truncate(args.pattern ?? '', 28)}`;
    case 'Grep':
      return `Searching code: ${truncate(args.pattern ?? '', 28)}`;
    case 'Bash':
    case 'BashOutput':
      return describeBash(args.command ?? '');
    case 'KillBash':
    case 'KillShell':
      return 'Killing shell process';
    case 'TaskOutput':
      return 'Reading subtask output';
    case 'TaskStop':
      return 'Stopping subtask';
    case 'WebFetch': {
      const host = hostOf(args.url ?? '');
      return host ? `Reading webpage ${truncate(host, 28)}` : 'Reading webpage';
    }
    case 'WebSearch':
      return `Web search: ${truncate(args.query ?? '', 28)}`;
    case 'Agent':
    case 'Task':
      return args.subagent_type
        ? `Dispatching ${args.subagent_type} agent`
        : 'Dispatching subagent';
    case 'TodoWrite':
      return 'Planning tasks';
    case 'EnterPlanMode':
      return 'Entering plan mode';
    case 'ExitPlanMode':
      return 'Executing plan';
    case 'EnterWorktree':
      return 'Switching to worktree';
    case 'ExitWorktree':
      return 'Leaving worktree';
    case 'AskUserQuestion':
      return 'Asking you a question';
    case 'Skill':
      return args.skill ? `Running ${args.skill} skill` : 'Running skill';
    case 'CronCreate':
    case 'ScheduleWakeup':
      return 'Scheduling task';
    case 'CronDelete':
      return 'Removing scheduled task';
    case 'CronList':
      return 'Listing scheduled tasks';
    default:
      if (tool.startsWith('mcp__')) return describeMcp(tool);
      return tool ? `Using ${tool}` : 'Using tool';
  }
}

export function realtimeInfo(a: AgentRecord): RealtimeInfo {
  switch (a.state) {
    case 'tool_use': {
      const tool = metaStr(a, 'tool_name');
      const args = metaStr(a, 'tool_args_preview');
      return { actor: 'Agent', activity: humanizeTool(tool, args) };
    }
    case 'waiting': {
      const msg = a.pending_decision?.message ?? a.label ?? '';
      return { actor: 'Agent', activity: msg ? `Awaiting confirmation: ${msg}` : 'Awaiting user confirmation' };
    }
    case 'thinking':
      return { actor: 'Agent', activity: 'Thinking…' };
    case 'idle': {
      const prompt = metaStr(a, 'last_user_prompt');
      if (prompt) return { actor: 'User', activity: prompt };
      return { actor: 'Agent', activity: 'Waiting for next instruction' };
    }
    case 'done':
    default:
      return { actor: 'Agent', activity: 'Waiting for next instruction' };
  }
}
