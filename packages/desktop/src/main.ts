import { app, BrowserWindow, shell, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { enumerateAndPickTarget, type Placement } from './displays';

// Standalone log file — Electron GUI apps on Windows have no console, so we
// duplicate critical messages here for post-mortem debugging.
const STARTUP_LOG = path.join(app.getPath('userData') || os.tmpdir(), 'startup.log');
function startupLog(msg: string): void {
  try {
    fs.appendFileSync(
      STARTUP_LOG,
      new Date().toISOString() + ' ' + msg + '\n',
      'utf8',
    );
  } catch {
    /* swallow — best effort */
  }
}

// Runtime log — captures every backend `log.info/warn/error` call (which
// internally calls `console.log`) plus our updater/console messages, written
// to a file next to the executable so portable/win-unpacked test builds can
// be diagnosed without a console window. Set up before backend boot.
const RUNTIME_LOG = path.join(path.dirname(process.execPath), 'backend.log');
function attachConsoleSink(): void {
  let stream: fs.WriteStream | null = null;
  try {
    stream = fs.createWriteStream(RUNTIME_LOG, { flags: 'a' });
    stream.write(`\n--- AgentDeck v${app.getVersion()} session ${new Date().toISOString()} ---\n`);
  } catch (e) {
    startupLog(`attachConsoleSink: createWriteStream failed: ${String(e)}`);
    return;
  }
  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  // ANSI colour escapes leak in from backend's logger.ts — strip them so the
  // file stays readable in Notepad.
  // eslint-disable-next-line no-control-regex
  const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');
  const format = (args: unknown[]): string =>
    args
      .map((a) => (typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()))
      .join(' ');
  const tee = (level: string, args: unknown[]) => {
    try {
      stream!.write(`${new Date().toISOString().slice(11, 23)} ${level} ${stripAnsi(format(args))}\n`);
    } catch {
      /* swallow — best effort */
    }
  };
  console.log = (...args: unknown[]) => { tee('LOG ', args); orig.log(...args); };
  console.warn = (...args: unknown[]) => { tee('WARN', args); orig.warn(...args); };
  console.error = (...args: unknown[]) => { tee('ERR ', args); orig.error(...args); };
  startupLog(`attachConsoleSink: writing to ${RUNTIME_LOG}`);
}
attachConsoleSink();

const isDev = process.env.AGENTDECK_DEV === '1';
const devUrl = process.env.AGENTDECK_DEV_URL || 'http://127.0.0.1:5173';
const skipHooks = process.env.AGENTDECK_SKIP_HOOKS === '1';

let mainWindow: BrowserWindow | null = null;
let backendHandle: { close: () => Promise<void> } | null = null;

// Single-instance lock — prevents two installed copies (or installed + dev)
// from racing on the backend's TCP ports.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

async function startEmbeddedBackend(): Promise<void> {
  if (isDev) return;
  const backendEntry = path.join(process.resourcesPath, 'backend', 'index.js');
  startupLog(`startEmbeddedBackend: entry=${backendEntry}`);
  try {
    if (!fs.existsSync(backendEntry)) {
      startupLog(`startEmbeddedBackend: entry MISSING, skipping`);
      return;
    }
    const url = pathToFileURL(backendEntry).href;
    startupLog(`startEmbeddedBackend: importing ${url}`);
    // tsc with module=CommonJS downlevels `import(url)` into `require(url)`,
    // which can't load ESM and rejects file:// URLs. Use Function() to keep
    // a real dynamic ESM import past tsc.
    const dynamicImport = new Function('m', 'return import(m)') as (
      m: string,
    ) => Promise<unknown>;
    const mod = (await dynamicImport(url)) as {
      startBackend: () => Promise<{ close: () => Promise<void> }>;
    };
    startupLog(`startEmbeddedBackend: import ok, keys=${Object.keys(mod).join(',')}`);
    backendHandle = await mod.startBackend();
    startupLog(`startEmbeddedBackend: backend listening`);
  } catch (err) {
    startupLog(`startEmbeddedBackend FAILED: ${err instanceof Error ? err.stack : String(err)}`);
  }
}

function resolveFrontendIndex(): string {
  if (isDev) return devUrl;
  const idx = path.join(process.resourcesPath, 'frontend', 'index.html');
  return pathToFileURL(idx).href;
}

const HOOK_MAP: Record<string, { hook: string; matcher?: string }> = {
  SessionStart:     { hook: 'session_start' },
  UserPromptSubmit: { hook: 'user_prompt' },
  PreToolUse:       { hook: 'pre_tool_use',  matcher: '*' },
  PostToolUse:      { hook: 'post_tool_use', matcher: '*' },
  Notification:     { hook: 'notification' },
  Stop:             { hook: 'stop' },
  SubagentStop:     { hook: 'subagent_stop' },
  SessionEnd:       { hook: 'session_end' },
};

const SENTINEL = 'agentdeck-claude-code-adapter';

function buildAgentdeckHookEntry(hookName: string, adapterPath: string): Record<string, unknown> {
  const cfg = HOOK_MAP[hookName];
  // Use POSIX-style forward slashes — Node.js accepts them natively on Windows
  // and they don't need shell-escaping, which keeps ~/.claude/settings.json readable.
  const command = `node "${adapterPath.replace(/\\/g, '/')}" ${cfg.hook}`;
  const inner = [{ type: 'command', command, timeout: 0.5 }];
  const entry: Record<string, unknown> = { hooks: inner, [SENTINEL]: true };
  if (cfg.matcher) entry.matcher = cfg.matcher;
  return entry;
}

function isAgentdeckEntry(e: unknown): e is Record<string, unknown> {
  return !!e && typeof e === 'object' && (e as Record<string, unknown>)[SENTINEL] === true;
}

// Snapshot of what we last wrote into ~/.claude/settings.json for each hook.
// Compared on upgrade to detect whether the user has modified our entry.
type HookSnapshot = Record<string, Record<string, unknown> | undefined>;

interface BootstrapMarker {
  version: string;
  writtenAt: string;
  adapterPath: string;
  lastWritten: HookSnapshot;
}

function readMarker(markerPath: string): BootstrapMarker | null {
  if (!fs.existsSync(markerPath)) return null;
  try {
    const raw = fs.readFileSync(markerPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<BootstrapMarker>;
    if (typeof parsed.version === 'string' && parsed.lastWritten && typeof parsed.lastWritten === 'object') {
      return parsed as BootstrapMarker;
    }
    return null; // legacy marker (plain ISO timestamp) — treat as needs-upgrade
  } catch {
    return null;
  }
}

function writeMarker(markerPath: string, marker: BootstrapMarker): void {
  try {
    fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2) + '\n', 'utf8');
  } catch (err) {
    startupLog(`writeMarker failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Decide which hooks to rewrite, honoring user customizations.
//
// Rules:
//   - No marker (fresh install OR legacy timestamp marker) → write every hook.
//   - Marker version === app version → no-op (already on this version).
//   - Marker version < app version → rewrite hooks whose current sentinel entry
//     in settings.json deep-equals what we wrote last time (i.e. the user has
//     not customized it). Skip the rest so user edits survive upgrades.
//
// Returns the hook names that should be rewritten now.
function pickHooksToRewrite(
  marker: BootstrapMarker | null,
  currentSettings: Record<string, unknown>,
  appVersion: string,
): string[] {
  if (!marker) return Object.keys(HOOK_MAP);
  if (marker.version === appVersion) return [];

  const settingsHooks = (currentSettings.hooks as Record<string, unknown[]> | undefined) ?? {};
  const result: string[] = [];
  for (const hookName of Object.keys(HOOK_MAP)) {
    const last = marker.lastWritten?.[hookName];
    const arr = Array.isArray(settingsHooks[hookName]) ? settingsHooks[hookName] : [];
    const currentSentinel = arr.find(isAgentdeckEntry);
    if (!last || !currentSentinel) {
      result.push(hookName);
      continue;
    }
    if (JSON.stringify(currentSentinel) === JSON.stringify(last)) {
      result.push(hookName);
    } else {
      startupLog(`hook ${hookName}: user-modified, skipping rewrite`);
    }
  }
  return result;
}

interface EnsureResult {
  changed: boolean;
  written: HookSnapshot;
}

function ensureClaudeSettings(adapterPath: string, hooksToWrite: string[]): EnsureResult {
  const written: HookSnapshot = {};
  try {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    let settings: Record<string, unknown> = {};
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      try {
        settings = raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
      } catch {
        startupLog('~/.claude/settings.json is not valid JSON, leaving it untouched');
        return { changed: false, written };
      }
    } else {
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    }

    const hooks = (settings.hooks as Record<string, unknown[]> | undefined) ?? {};
    let changed = false;
    for (const hookName of hooksToWrite) {
      const existing = Array.isArray(hooks[hookName]) ? (hooks[hookName] as unknown[]) : [];
      const keptOthers = existing.filter((e) => !isAgentdeckEntry(e));
      const desired = buildAgentdeckHookEntry(hookName, adapterPath);
      written[hookName] = desired;
      const next = [...keptOthers, desired];
      if (JSON.stringify(hooks[hookName]) !== JSON.stringify(next)) {
        hooks[hookName] = next;
        changed = true;
      }
    }
    if (!changed) return { changed: false, written };

    settings.hooks = hooks;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    startupLog(`updated Claude Code hooks in ${settingsPath}: [${hooksToWrite.join(', ')}]`);
    return { changed: true, written };
  } catch (err) {
    startupLog(`ensureClaudeSettings failed: ${err instanceof Error ? err.stack : String(err)}`);
    return { changed: false, written };
  }
}

// Sync ~/.claude/settings.json with the hooks shipped in this build.
//
// First install:   write every hook, save marker.
// Same version:    no-op.
// Upgrade:         write hooks the user hasn't customized; preserve their edits.
//
// Bypass cases:
//   - AGENTDECK_DEV=1: dev runs must never touch the user's prod settings.
//   - AGENTDECK_SKIP_HOOKS=1: explicit escape hatch.
function syncClaudeHooks(): void {
  if (isDev || skipHooks) return;
  const adapterPath = path.join(
    process.resourcesPath,
    'adapters',
    'claude-code',
    'claude-code-adapter.js',
  );
  if (!fs.existsSync(adapterPath)) {
    startupLog(`syncClaudeHooks: adapter missing at ${adapterPath}, skipping`);
    return;
  }

  const markerPath = path.join(app.getPath('userData'), '.hooks-bootstrapped');
  const marker = readMarker(markerPath);
  const appVersion = app.getVersion();

  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  let currentSettings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      currentSettings = raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      startupLog('syncClaudeHooks: settings.json unparseable, skipping');
      return;
    }
  }

  const hooksToWrite = pickHooksToRewrite(marker, currentSettings, appVersion);
  if (hooksToWrite.length === 0) {
    startupLog(`syncClaudeHooks: marker version=${marker?.version} matches app=${appVersion}, no-op`);
    return;
  }

  startupLog(
    `syncClaudeHooks: marker=${marker ? marker.version : 'none'} → ${appVersion}, ` +
      `rewriting [${hooksToWrite.join(', ')}]`,
  );

  const { written } = ensureClaudeSettings(adapterPath, hooksToWrite);

  // Merge new snapshot with previous one so that hooks we deliberately
  // skipped (because the user customized them) keep their old snapshot.
  // Without this, on the next upgrade we'd see "no snapshot" and force-rewrite.
  const mergedSnapshot: HookSnapshot = { ...(marker?.lastWritten ?? {}) };
  for (const [name, entry] of Object.entries(written)) {
    if (entry) mergedSnapshot[name] = entry;
  }

  writeMarker(markerPath, {
    version: appVersion,
    writtenAt: new Date().toISOString(),
    adapterPath,
    lastWritten: mergedSnapshot,
  });
}

function setupAutoUpdate(): void {
  if (isDev) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => console.log('[updater] checking…'));
  autoUpdater.on('update-available', (info) =>
    console.log(`[updater] update available: ${info.version}`),
  );
  autoUpdater.on('update-not-available', () => console.log('[updater] up to date'));
  autoUpdater.on('download-progress', (p) =>
    console.log(`[updater] ${p.percent.toFixed(1)}%  ${(p.bytesPerSecond / 1024).toFixed(0)} KB/s`),
  );
  autoUpdater.on('error', (err) => console.error('[updater] error:', err));
  autoUpdater.on('update-downloaded', async (info) => {
    console.log(`[updater] downloaded ${info.version}, prompting user`);
    const { response } = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'AgentDeck update ready',
      message: `Version ${info.version} downloaded.`,
      detail: 'Restart AgentDeck to apply the update. It will install on next quit otherwise.',
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  // Check once on startup and every 4 hours afterwards.
  void autoUpdater.checkForUpdates().catch((err) => console.error('[updater] initial check failed:', err));
  setInterval(() => {
    void autoUpdater.checkForUpdates().catch((err) => console.error('[updater] periodic check failed:', err));
  }, 4 * 60 * 60 * 1000);
}

function createWindow(placement: Placement): void {
  const { x, y, width, height } = placement.bounds;
  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 480,
    minHeight: 200,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    resizable: true,
    hasShadow: false,
    title: 'AgentDeck',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  const target = resolveFrontendIndex();
  void mainWindow.loadURL(target);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (isDev) mainWindow?.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  syncClaudeHooks();
  await startEmbeddedBackend();
  const placement = enumerateAndPickTarget();
  createWindow(placement);
  setupAutoUpdate();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(enumerateAndPickTarget());
    }
  });
});

app.on('window-all-closed', async () => {
  if (backendHandle) {
    try {
      await backendHandle.close();
    } catch (err) {
      console.error('[desktop] backend close error:', err);
    }
    backendHandle = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
