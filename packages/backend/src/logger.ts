const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
};

type Level = 'debug' | 'info' | 'warn' | 'error';

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

function emit(level: Level, scope: string, msg: string, data?: unknown): void {
  const color =
    level === 'error' ? COLORS.red :
    level === 'warn'  ? COLORS.yellow :
    level === 'debug' ? COLORS.dim :
    COLORS.cyan;
  const tag = `${color}[${level.toUpperCase()}]${COLORS.reset}`;
  const head = `${COLORS.dim}${ts()}${COLORS.reset} ${tag} ${COLORS.green}${scope}${COLORS.reset}`;
  if (data !== undefined) {
    console.log(`${head} ${msg}`, data);
  } else {
    console.log(`${head} ${msg}`);
  }
}

export function makeLogger(scope: string) {
  return {
    debug: (msg: string, data?: unknown) => emit('debug', scope, msg, data),
    info:  (msg: string, data?: unknown) => emit('info',  scope, msg, data),
    warn:  (msg: string, data?: unknown) => emit('warn',  scope, msg, data),
    error: (msg: string, data?: unknown) => emit('error', scope, msg, data),
  };
}
