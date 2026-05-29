#!/usr/bin/env node
// Pre-push secret scanner.
//
// Scans the working tree + git index for the patterns described in
// docs/release.md. Designed to be run before any push to the private OR
// public repo. Exit code 0 = clean, non-zero = block the push.
//
// Usage:
//   node scripts/check-secrets.mjs                    # scan dev tree
//   node scripts/check-secrets.mjs --path .public-mirror   # scan the mirror
//   node scripts/check-secrets.mjs --staged           # only files in `git diff --cached`
//
// What it checks:
//   - .env / env / .env.* files anywhere in the tracked set
//   - Known secret prefixes (GitHub PAT, OpenAI, Anthropic, Slack)
//   - Local-only helper files that must not be committed (.gh-token.tmp, etc.)

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const pathIdx = args.indexOf('--path');
const scanRoot = pathIdx >= 0 ? path.resolve(args[pathIdx + 1]) : process.cwd();
const stagedOnly = args.includes('--staged');

const ENV_FILE_RE = /(^|\/)\.?env(\..+)?$/i;

// Filenames that must never be committed, regardless of content.
const FORBIDDEN_FILES = new Set([
  '.gh-token.tmp',
  'gh-token.tmp',
  'gh_token.tmp',
]);

// Secret prefixes. Each entry: [label, regex].
// Regexes are anchored on the literal prefix and require enough following chars
// to look like a real secret, to keep false-positives down in docs/runbooks.
const SECRET_PATTERNS = [
  ['GitHub classic PAT', /ghp_[A-Za-z0-9]{30,}/g],
  ['GitHub fine-grained PAT', /github_pat_[A-Za-z0-9_]{30,}/g],
  ['OpenAI key', /sk-(?!ant-)[A-Za-z0-9]{20,}/g],
  ['Anthropic key', /sk-ant-[A-Za-z0-9-]{20,}/g],
  ['Slack bot token', /xox[bp]-[A-Za-z0-9-]{20,}/g],
  ['AWS access key', /AKIA[0-9A-Z]{16}/g],
  ['Generic private key block', /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
];

// Paths we never scan content of (binary, vendored, generated).
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.public-mirror',
  'dist',
  'build',
  'release',
  'win-unpacked',
]);

// File extensions we never scan content of.
const SKIP_EXT = new Set([
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.icns',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.pdf',
  '.mp4',
  '.mov',
  '.blockmap',
  '.asar',
  '.lock',
]);

// Paths whose CONTENT matching secret prefixes is whitelisted — typically
// docs/runbooks that intentionally mention the prefixes as examples.
const CONTENT_WHITELIST = new Set([
  'docs/release.md',
  'scripts/check-secrets.mjs',
  'scripts/release.mjs',
  // public-mirror copy of the above:
  '.public-mirror/docs/release.md',
]);

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts }).trim();
}

function listFiles() {
  if (stagedOnly) {
    const out = sh('git diff --cached --name-only --diff-filter=ACMR', {
      cwd: scanRoot,
    });
    return out ? out.split(/\r?\n/) : [];
  }
  // ls-files: tracked + cached, excluding ignored.
  const out = sh('git ls-files', { cwd: scanRoot });
  return out ? out.split(/\r?\n/) : [];
}

function shouldSkipPath(relPosix) {
  const parts = relPosix.split('/');
  for (const p of parts) if (SKIP_DIRS.has(p)) return true;
  const ext = path.extname(relPosix).toLowerCase();
  if (SKIP_EXT.has(ext)) return true;
  return false;
}

function isEnvFile(relPosix) {
  const basename = relPosix.split('/').pop() || '';
  return ENV_FILE_RE.test('/' + basename);
}

function isForbiddenFile(relPosix) {
  const basename = relPosix.split('/').pop() || '';
  return FORBIDDEN_FILES.has(basename);
}

function scanFileContent(absPath, relPosix) {
  if (CONTENT_WHITELIST.has(relPosix)) return [];
  let buf;
  try {
    buf = fs.readFileSync(absPath);
  } catch {
    return [];
  }
  // Quick binary heuristic: a NUL byte in the first 8 KB.
  const head = buf.subarray(0, Math.min(8192, buf.length));
  if (head.indexOf(0) !== -1) return [];

  const text = buf.toString('utf8');
  const hits = [];
  for (const [label, re] of SECRET_PATTERNS) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m) hits.push({ label, sample: m[0].slice(0, 12) + '…' });
  }
  return hits;
}

function main() {
  const files = listFiles();
  const problems = [];

  for (const rel of files) {
    const relPosix = rel.replace(/\\/g, '/');
    const abs = path.join(scanRoot, rel);

    if (isForbiddenFile(relPosix)) {
      problems.push({
        kind: 'forbidden-file',
        path: relPosix,
        detail: 'this file is local-only and must never be committed',
      });
      continue;
    }

    if (isEnvFile(relPosix)) {
      problems.push({
        kind: 'env-file',
        path: relPosix,
        detail: 'env files must not be tracked',
      });
      continue;
    }

    if (shouldSkipPath(relPosix)) continue;
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (!stat.isFile()) continue;
    if (stat.size > 5 * 1024 * 1024) continue;

    const hits = scanFileContent(abs, relPosix);
    for (const h of hits) {
      problems.push({
        kind: 'secret-pattern',
        path: relPosix,
        detail: `${h.label} (${h.sample})`,
      });
    }
  }

  if (problems.length === 0) {
    console.log(`[check-secrets] clean — scanned ${files.length} files under ${scanRoot}`);
    process.exit(0);
  }

  console.error(`[check-secrets] FAIL — ${problems.length} issue(s) under ${scanRoot}:`);
  for (const p of problems) {
    console.error(`  - [${p.kind}] ${p.path}  ${p.detail}`);
  }
  console.error('\nFix the above before pushing. See docs/release.md for the safety policy.');
  process.exit(1);
}

main();
