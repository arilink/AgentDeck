#!/usr/bin/env node
// Cross-platform launcher that strips ELECTRON_RUN_AS_NODE from the
// environment before spawning Electron. The variable is sometimes set
// globally on developer machines (e.g. by VSCode workers), which turns
// the Electron binary into a plain Node runtime and breaks the app.
const { spawn } = require('node:child_process');
const path = require('node:path');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = process.argv.slice(2);
if (args.length === 0) args.push('.');

const electronBin = require('electron');
const child = spawn(electronBin, args, {
  stdio: 'inherit',
  windowsHide: false,
  cwd: path.resolve(__dirname, '..'),
  env,
});

child.on('close', (code, signal) => {
  if (code === null) {
    console.error('electron exited with signal', signal);
    process.exit(1);
  }
  process.exit(code);
});

const fwd = (sig) => {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig);
  });
};
fwd('SIGINT');
fwd('SIGTERM');
