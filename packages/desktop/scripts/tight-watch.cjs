const fs = require('node:fs');
const path = 'F:/AI-Visualize/node_modules/app-builder-bin/win/x64/app-builder.exe';
const start = Date.now();
let lastState = null;
const log = [];
while (Date.now() - start < 30000) {
  let exists;
  try { fs.statSync(path); exists = true; } catch { exists = false; }
  if (exists !== lastState) {
    log.push(`[${(Date.now()-start)}ms] exists=${exists}`);
    lastState = exists;
  }
}
console.log(log.join('\n'));
