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

function humanizeTool(tool: string, argsPreview: string): string {
  const args = parseArgs(argsPreview);
  switch (tool) {
    case 'Read':            return `读取 ${baseName(args.file_path ?? '') || '文件'}`;
    case 'Write':           return `写入 ${baseName(args.file_path ?? '') || '文件'}`;
    case 'Edit':            return `编辑 ${baseName(args.file_path ?? '') || '文件'}`;
    case 'NotebookEdit':    return '编辑 notebook';
    case 'Glob':            return `搜索文件: ${truncate(args.pattern ?? '', 30)}`;
    case 'Grep':            return `搜索代码: ${truncate(args.pattern ?? '', 30)}`;
    case 'Bash':            return `运行命令: ${truncate(args.command ?? '', 36)}`;
    case 'WebFetch':        return `查看网页: ${truncate(hostOf(args.url ?? '') || args.url || '', 30)}`;
    case 'WebSearch':       return `网络搜索: ${truncate(args.query ?? '', 30)}`;
    case 'TodoWrite':       return '更新待办清单';
    case 'Task':            return `调度子 agent${args.subagent_type ? `: ${args.subagent_type}` : ''}`;
    case 'AskUserQuestion': return '向用户提问';
    case 'ExitPlanMode':    return '退出 plan 模式';
    default:
      if (tool.startsWith('mcp__')) {
        const stripped = tool.replace(/^mcp__/, '').split('__').slice(-1)[0];
        return `调用 ${stripped}`;
      }
      return tool ? `使用 ${tool}` : '使用工具';
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
      return { actor: 'Agent', activity: msg ? `等待确认: ${msg}` : '等待用户确认' };
    }
    case 'thinking': {
      const prompt = metaStr(a, 'last_user_prompt');
      if (prompt) return { actor: 'User', activity: prompt };
      return { actor: 'Agent', activity: '思考中…' };
    }
    case 'done':
    case 'idle':
    default:
      return { actor: 'Agent', activity: 'Waiting for next instruction' };
  }
}
