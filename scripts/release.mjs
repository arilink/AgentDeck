#!/usr/bin/env node
// One-shot release orchestrator for AgentDeck.
//
// Runs the five release tasks in order:
//   1. Push private repo  (arilink/AgentDeck-Dev)
//   2. Push public mirror (arilink/AgentDeck)
//   3. Build the desktop installer
//   4. Publish the installer to the public repo's GitHub Release
//   5. (this script itself — wires the four above)
//
// Usage:
//   node scripts/release.mjs <bump>            # bump=patch|minor|major|x.y.z
//   node scripts/release.mjs patch
//   node scripts/release.mjs 0.2.0
//   node scripts/release.mjs patch --dry-run   # print what would happen, don't change anything
//   node scripts/release.mjs patch --only=publish     # skip earlier steps, run only one
//
// Flags:
//   --dry-run            print plan, take no destructive action
//   --skip-build         reuse the existing packages/desktop/release/*.exe
//   --only=<step>        run only one step (versions|commit|push|mirror|build|publish)
//   --message="..."      override the release commit subject
//
// GH_TOKEN resolution order:
//   1. process.env.GH_TOKEN
//   2. .gh-token.tmp at repo root — read, used, then deleted in the same run
//
// Safety:
//   - Runs scripts/check-secrets.mjs against the dev tree BEFORE any push.
//   - Refuses to start with a dirty working tree (unstaged or untracked files
//     other than the four package.json files we are about to bump and the
//     optional .gh-token.tmp).
//   - Aborts on any sub-step failure.

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIRROR = path.join(ROOT, '.public-mirror');
const TOKEN_FILE = path.join(ROOT, '.gh-token.tmp');

const VERSIONED_PACKAGE_JSONS = [
  'package.json',
  'packages/backend/package.json',
  'packages/desktop/package.json',
  'packages/frontend/package.json',
];

const VALID_STEPS = ['versions', 'commit', 'push', 'mirror', 'build', 'publish'];

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const eq = a.indexOf('=');
      if (eq === -1) return [a.slice(2), true];
      return [a.slice(2, eq), a.slice(eq + 1)];
    }),
);

const bumpArg = positional[0];
const dryRun = !!flags['dry-run'];
const skipBuild = !!flags['skip-build'];
const onlyStep = flags['only'] || null;
const customMsg = flags['message'] || null;

if (onlyStep && !VALID_STEPS.includes(onlyStep)) {
  fail(`--only=${onlyStep} unknown. Valid: ${VALID_STEPS.join(', ')}`);
}

if (!bumpArg && !onlyStep) {
  fail(
    'Usage: node scripts/release.mjs <patch|minor|major|x.y.z> [--dry-run] [--skip-build] [--only=step]',
  );
}

function fail(msg, code = 1) {
  console.error(`[release] ${msg}`);
  process.exit(code);
}

function log(msg) {
  console.log(`[release] ${msg}`);
}

function run(cmd, opts = {}) {
  log(`$ ${cmd}${opts.cwd ? `   (cwd=${path.relative(ROOT, opts.cwd) || '.'})` : ''}`);
  if (dryRun) return;
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function runOut(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', cwd: ROOT, ...opts }).trim();
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function writeJson(rel, obj) {
  // Preserve trailing newline + 2-space indent (npm convention).
  fs.writeFileSync(
    path.join(ROOT, rel),
    JSON.stringify(obj, null, 2) + '\n',
  );
}

function bumpVersion(current, bump) {
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump;
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) fail(`current version "${current}" is not semver-shaped`);
  let [major, minor, patch] = m.slice(1).map(Number);
  if (bump === 'patch') patch += 1;
  else if (bump === 'minor') {
    minor += 1;
    patch = 0;
  } else if (bump === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else {
    fail(`unknown bump "${bump}" (use patch|minor|major or an explicit x.y.z)`);
  }
  return `${major}.${minor}.${patch}`;
}

// --- Step implementations -------------------------------------------------

function preflightCleanTree() {
  log('preflight: checking working tree…');
  const status = runOut('git status --porcelain');
  if (!status) return;

  const allowed = new Set(VERSIONED_PACKAGE_JSONS.map((p) => p.replace(/\\/g, '/')));
  const dirty = status
    .split(/\r?\n/)
    .map((line) => {
      // " M path" or "?? path"  → path
      const trimmed = line.replace(/^.{2}\s+/, '');
      return trimmed.replace(/\\/g, '/');
    })
    .filter((p) => p && !allowed.has(p) && p !== '.gh-token.tmp');

  if (dirty.length) {
    fail(
      `working tree has uncommitted changes that are not part of the release set:\n  ` +
        dirty.join('\n  ') +
        `\nCommit or stash them first.`,
    );
  }
}

function stepVersions() {
  log('step 1/5  bump versions');
  const root = readJson('package.json');
  const oldVersion = root.version;
  const newVersion = bumpVersion(oldVersion, bumpArg);
  log(`  ${oldVersion}  →  ${newVersion}`);

  // Cross-check: all four files must already agree on oldVersion.
  for (const rel of VERSIONED_PACKAGE_JSONS) {
    const pkg = readJson(rel);
    if (pkg.version !== oldVersion) {
      fail(`${rel} version is "${pkg.version}", expected "${oldVersion}". Manual fix required.`);
    }
  }

  if (!dryRun) {
    for (const rel of VERSIONED_PACKAGE_JSONS) {
      const pkg = readJson(rel);
      pkg.version = newVersion;
      writeJson(rel, pkg);
    }
  }
  return newVersion;
}

function stepCommitAndTag(newVersion, releaseTitle) {
  log('step 1.b  commit + tag release on private repo');
  run('git add ' + VERSIONED_PACKAGE_JSONS.join(' '));
  const subject = customMsg || `release: v${newVersion}${releaseTitle ? ' — ' + releaseTitle : ''}`;
  run(`git commit -m "${subject.replace(/"/g, '\\"')}"`);
  run(`git tag v${newVersion}`);
}

function stepCheckSecrets() {
  log('step 1.c  scanning for secrets in dev tree');
  run('node scripts/check-secrets.mjs');
}

function stepPushPrivate(newVersion) {
  log(`step 1   push private repo (arilink/AgentDeck-Dev)`);
  run('git push origin main');
  run(`git push origin v${newVersion}`);
}

function stepMirror(newVersion) {
  log(`step 2   sync + push public mirror (arilink/AgentDeck) with tag v${newVersion}`);
  // sync-public.mjs handles wipe-and-copy + commit + tag + push.
  run(`node scripts/sync-public.mjs --push --tag v${newVersion}`);

  // After the mirror is updated on disk, re-scan THAT tree as a defence-in-depth.
  if (fs.existsSync(MIRROR)) {
    log('  (post-sync) scanning .public-mirror for leaked secrets');
    run('node scripts/check-secrets.mjs --path .public-mirror');
  }
}

function stepBuild() {
  log('step 3   build backend + frontend + desktop');
  run('npm run build');
}

function resolveGhToken() {
  if (process.env.GH_TOKEN) {
    log('using GH_TOKEN from environment');
    return { token: process.env.GH_TOKEN, fromFile: false };
  }
  if (fs.existsSync(TOKEN_FILE)) {
    const token = fs.readFileSync(TOKEN_FILE, 'utf8').replace(/\r?\n/g, '').trim();
    if (!token) fail(`.gh-token.tmp exists but is empty`);
    log(`read GH_TOKEN from ${path.relative(ROOT, TOKEN_FILE)} (will be deleted after publish)`);
    return { token, fromFile: true };
  }
  fail(
    `no GH_TOKEN available. Either:\n` +
      `  - export GH_TOKEN in your shell, or\n` +
      `  - write the PAT into .gh-token.tmp (this script will delete the file after use)`,
  );
}

function stepPublish() {
  log('step 4   publish installer to public repo GitHub Release');
  const { token, fromFile } = resolveGhToken();
  if (dryRun) {
    log('  (dry-run) would run: electron-builder --publish always');
    if (fromFile) log('  (dry-run) would delete .gh-token.tmp afterwards');
    return;
  }
  // Use spawnSync so we can inject GH_TOKEN into the child env without
  // logging it. Inherit stdio so the user sees electron-builder output.
  const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['--workspace', '@agentdeck/desktop', 'exec', '--', 'electron-builder', '--publish', 'always'],
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, GH_TOKEN: token },
      shell: false,
    },
  );
  // Always delete the token file if we created it, even on failure.
  if (fromFile) {
    try {
      fs.unlinkSync(TOKEN_FILE);
      log('deleted .gh-token.tmp');
    } catch (e) {
      log(`WARNING: failed to delete ${TOKEN_FILE}: ${e.message} — delete it manually!`);
    }
  }
  if (result.status !== 0) {
    fail(`electron-builder failed with exit code ${result.status}`);
  }
}

// --- Orchestration --------------------------------------------------------

function runFullPipeline() {
  preflightCleanTree();
  const newVersion = stepVersions();
  stepCommitAndTag(newVersion, flags['title'] || null);
  stepCheckSecrets();
  stepPushPrivate(newVersion);
  stepMirror(newVersion);
  if (!skipBuild) stepBuild();
  stepPublish();
  log(`done. v${newVersion} is live.`);
}

function runSingleStep() {
  const newVersion = readJson('package.json').version;
  switch (onlyStep) {
    case 'versions':
      stepVersions();
      break;
    case 'commit':
      stepCommitAndTag(newVersion, flags['title'] || null);
      break;
    case 'push':
      stepCheckSecrets();
      stepPushPrivate(newVersion);
      break;
    case 'mirror':
      stepMirror(newVersion);
      break;
    case 'build':
      stepBuild();
      break;
    case 'publish':
      stepPublish();
      break;
  }
  log(`done. step "${onlyStep}" complete at v${newVersion}.`);
}

if (onlyStep) {
  runSingleStep();
} else {
  runFullPipeline();
}
