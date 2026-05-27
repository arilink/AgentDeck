import { app, BrowserWindow, shell, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const isDev = process.env.AGENTDECK_DEV === '1';
const devUrl = process.env.AGENTDECK_DEV_URL || 'http://127.0.0.1:5173';
const skipHooks = process.env.AGENTDECK_SKIP_HOOKS === '1';

let mainWindow: BrowserWindow | null = null;
let backendHandle: { close: () => Promise<void> } | null = null;

const WINDOW_WIDTH = 1920;
const WINDOW_HEIGHT = 440;

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
  try {
    const backendEntry = path.join(process.resourcesPath, 'backend', 'index.js');
    if (!fs.existsSync(backendEntry)) {
      console.warn(`[desktop] backend entry not found at ${backendEntry}, skipping in-process boot`);
      return;
    }
    const url = `file://${backendEntry.replace(/\\/g, '/')}`;
    const mod = (await import(url)) as {
      startBackend: () => Promise<{ close: () => Promise<void> }>;
    };
    backendHandle = await mod.startBackend();
    console.log('[desktop] embedded backend started');
  } catch (err) {
    console.error('[desktop] failed to start embedded backend:', err);
  }
}

function resolveFrontendIndex(): string {
  if (isDev) return devUrl;
  const idx = path.join(process.resourcesPath, 'frontend', 'index.html');
  return `file://${idx.replace(/\\/g, '/')}`;
}

const HOOK_MAP: Record<string, { hook: string; matcher?: string }> = {
  SessionStart:     { hook: 'session_start' },
  UserPromptSubmit: { hook: 'user_prompt' },
  PreToolUse:       { hook: 'pre_tool_use',  matcher: '*' },
  PostToolUse:      { hook: 'post_tool_use', matcher: '*' },
  Notification:     { hook: 'notification' },
  Stop:             { hook: 'stop' },
  SubagentStop:     { hook: 'subagent_stop' },
};

const SENTINEL = 'agentdeck-claude-code-adapter';

function buildAgentdeckHookEntry(hookName: string, adapterPath: string): unknown {
  const cfg = HOOK_MAP[hookName];
  const command = `node "${adapterPath.replace(/\\/g, '\\\\')}" ${cfg.hook}`;
  const inner = [{ type: 'command', command, timeout: 0.5 }];
  const entry: Record<string, unknown> = { hooks: inner, [SENTINEL]: true };
  if (cfg.matcher) entry.matcher = cfg.matcher;
  return entry;
}

function ensureClaudeSettings(adapterPath: string): void {
  try {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    let settings: Record<string, unknown> = {};
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      try {
        settings = raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
      } catch {
        console.warn('[desktop] ~/.claude/settings.json is not valid JSON, leaving it untouched');
        return;
      }
    } else {
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    }

    const hooks = (settings.hooks as Record<string, unknown[]> | undefined) ?? {};
    let changed = false;
    for (const hookName of Object.keys(HOOK_MAP)) {
      const existing = Array.isArray(hooks[hookName]) ? (hooks[hookName] as unknown[]) : [];
      const keptOthers = existing.filter(
        (e) => !(e && typeof e === 'object' && (e as Record<string, unknown>)[SENTINEL] === true),
      );
      const desired = buildAgentdeckHookEntry(hookName, adapterPath);
      const next = [...keptOthers, desired];
      if (JSON.stringify(hooks[hookName]) !== JSON.stringify(next)) {
        hooks[hookName] = next;
        changed = true;
      }
    }
    if (!changed) return;

    settings.hooks = hooks;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    console.log(`[desktop] updated Claude Code hooks in ${settingsPath}`);
  } catch (err) {
    console.error('[desktop] failed to update ~/.claude/settings.json:', err);
  }
}

// Only write ~/.claude/settings.json once per install. Subsequent launches
// skip the write so users can edit hooks freely without us stomping on them.
// Bypass cases:
//   - AGENTDECK_DEV=1: dev runs must never touch the user's prod settings.
//   - AGENTDECK_SKIP_HOOKS=1: explicit escape hatch.
function installClaudeHooksOnFirstRun(): void {
  if (isDev || skipHooks) return;
  const adapterPath = path.join(
    process.resourcesPath,
    'adapters',
    'claude-code',
    'claude-code-adapter.js',
  );
  if (!fs.existsSync(adapterPath)) return;

  const marker = path.join(app.getPath('userData'), '.hooks-bootstrapped');
  if (fs.existsSync(marker)) {
    console.log('[desktop] hooks already bootstrapped, skipping settings.json update');
    console.log(`           remove ${marker} to force re-bootstrap`);
    return;
  }

  ensureClaudeSettings(adapterPath);
  try {
    fs.writeFileSync(marker, new Date().toISOString(), 'utf8');
  } catch (err) {
    console.warn('[desktop] failed to write bootstrap marker:', err);
  }
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

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
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
  installClaudeHooksOnFirstRun();
  await startEmbeddedBackend();
  createWindow();
  setupAutoUpdate();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
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
