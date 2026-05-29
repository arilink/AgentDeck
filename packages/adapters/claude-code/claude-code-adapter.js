#!/usr/bin/env node
/**
 * AgentDeck — Claude Code Adapter
 *
 * 把 Claude Code 的 hook 事件翻译成 adapter-event 协议,POST 给后端。
 *
 * 用法:见同目录 README.md。所有 hook 都用 {hooks:[{type,command,timeout?}]} 包装,
 * timeout 单位是秒。CLI 和 VSCode 插件共用同一份 ~/.claude/settings.json。
 *
 * 环境变量:
 *   AGENTDECK_HOST  后端主机   (默认 127.0.0.1)
 *   AGENTDECK_PORT  后端端口   (默认 7891)
 *
 * 设计原则:
 * - 单文件 zero-dep,只用 Node 内建模块
 * - 静默失败:后端没启动时不能阻塞 Claude Code,所有错误吞掉
 * - 短超时:HTTP 请求 500ms 超时,避免拖慢 Claude Code
 */

const http = require('http');

const HOST = process.env.AGENTDECK_HOST || '127.0.0.1';
const PORT = parseInt(process.env.AGENTDECK_PORT || '7891', 10);
const TIMEOUT_MS = 500;
const PROMPT_PREVIEW_MAX = 200;

const SOURCE = 'claude-code';

const HOOK_TO_EVENT = {
  session_start:      'session_start',
  session_end:        'session_end',
  user_prompt:        'user_prompt',
  pre_tool_use:       'tool_use_start',
  post_tool_use:      'tool_use_end',
  notification:       'decision_required',
  stop:               'response_complete',
  subagent_stop:      'response_complete',
  pre_compact:        'context_compact',
};

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) return resolve('');
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 1000);
  });
}

function truncate(str, max) {
  if (typeof str !== 'string') return str;
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function buildPayload(hookType, hookData) {
  const payload = {};
  const cwd = hookData.cwd || hookData.workdir;
  if (cwd) payload.workdir = cwd;
  switch (hookType) {
    case 'session_start':
      payload.model = hookData.model;
      break;
    case 'user_prompt':
      payload.prompt_preview = truncate(hookData.prompt || hookData.user_input || '', PROMPT_PREVIEW_MAX);
      break;
    case 'pre_tool_use':
      payload.tool_name = hookData.tool_name;
      payload.tool_args_preview = truncate(JSON.stringify(hookData.tool_input || {}), PROMPT_PREVIEW_MAX);
      break;
    case 'post_tool_use':
      payload.tool_name = hookData.tool_name;
      payload.success = hookData.tool_response ? !hookData.tool_response.error : true;
      break;
    case 'notification':
      payload.decision_type = hookData.notification_type || 'unknown';
      payload.message = truncate(hookData.message || '', PROMPT_PREVIEW_MAX);
      break;
    case 'stop':
    case 'subagent_stop':
      payload.reason = hookData.stop_reason || 'completed';
      break;
    case 'session_end':
      payload.reason = hookData.reason || 'unknown';
      break;
    case 'pre_compact':
      payload.trigger = hookData.trigger || 'auto';
      break;
  }
  return payload;
}

function postEvent(event) {
  return new Promise((resolve) => {
    const body = JSON.stringify(event);
    const req = http.request({
      host: HOST,
      port: PORT,
      path: '/event',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: TIMEOUT_MS,
    }, (res) => { res.on('data', () => {}); res.on('end', resolve); });

    req.on('error', resolve);
    req.on('timeout', () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

async function main() {
  const hookType = process.argv[2];
  if (!hookType || !HOOK_TO_EVENT[hookType]) {
    process.exit(0);
  }

  const raw = await readStdin();
  let hookData = {};
  try { hookData = raw ? JSON.parse(raw) : {}; } catch { hookData = {}; }

  // Notification fires for several reasons (official notification_type values:
  // permission_prompt / idle_prompt / auth_success / elicitation_dialog). Only
  // permission_prompt and elicitation_dialog mean "blocked, waiting on the user
  // to decide". idle_prompt / auth_success are informational — forwarding them
  // as decision_required would wrongly flip the card into amber `waiting`.
  if (hookType === 'notification') {
    const nt = hookData.notification_type || '';
    if (nt !== 'permission_prompt' && nt !== 'elicitation_dialog') {
      process.exit(0);
    }
  }

  const sessionId = hookData.session_id || hookData.sessionId || hookData.transcript_path || 'unknown';

  const event = {
    source: SOURCE,
    session_id: String(sessionId),
    event_type: HOOK_TO_EVENT[hookType],
    timestamp: Date.now(),
    payload: buildPayload(hookType, hookData),
  };

  await postEvent(event);
  process.exit(0);
}

main().catch(() => process.exit(0));
