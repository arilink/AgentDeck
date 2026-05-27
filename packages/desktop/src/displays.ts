// Display enumeration + smart window placement.
//
// Why this exists: AgentDeck's window is 1920x440 — designed for an 8.8" long-strip
// secondary display. On a regular monitor without that strip, the frameless+transparent
// window is literally invisible. We enumerate displays at startup, prefer a long-strip
// display when present, and otherwise fall back to snapping to the primary monitor's
// taskbar edge so the user can at least see *something* on the bottom of their screen.
//
// All exports except `enumerateAndPickTarget` are pure functions so they can be unit-tested
// without an Electron runtime.

import { screen, type Display } from 'electron';

export const WINDOW_WIDTH_DEFAULT = 1920;
export const WINDOW_HEIGHT_DEFAULT = 440;

export type Rect = { x: number; y: number; width: number; height: number };

export type Placement =
  | { kind: 'long-strip'; display: Display; bounds: Rect }
  | { kind: 'fallback-bottom'; display: Display; bounds: Rect };

// Long-strip heuristic: very wide aspect ratio and short height. The reference hardware
// is 1920x480 (ratio 4.0, height 480). Threshold tuned to admit that and reject any
// conventional 1080p/1440p/4K panel.
export function isLongStrip(d: Display): boolean {
  const { width, height } = d.bounds;
  if (height <= 0) return false;
  return width / height >= 3.0 && height < 600;
}

function area(d: Display): number {
  return d.bounds.width * d.bounds.height;
}

export function pickTarget(displays: Display[], primaryId: number): Placement {
  const strips = displays.filter(isLongStrip);
  if (strips.length > 0) {
    // If multiple long-strips somehow exist, prefer the largest (more pixel real estate).
    const best = [...strips].sort((a, b) => area(b) - area(a))[0];
    return { kind: 'long-strip', display: best, bounds: { ...best.bounds } };
  }

  const primary = displays.find((d) => d.id === primaryId) ?? displays[0];
  const wa = primary.workArea;
  const w = Math.min(WINDOW_WIDTH_DEFAULT, wa.width);
  const h = Math.min(WINDOW_HEIGHT_DEFAULT, wa.height);
  const x = wa.x + Math.floor((wa.width - w) / 2);
  const y = wa.y + wa.height - h;
  return {
    kind: 'fallback-bottom',
    display: primary,
    bounds: { x, y, width: w, height: h },
  };
}

export function formatEnumeration(
  displays: Display[],
  primaryId: number,
  target: Placement,
): string {
  const lines: string[] = ['[desktop] displays detected:'];
  displays.forEach((d, i) => {
    const { width: bw, height: bh, x: bx, y: by } = d.bounds;
    const { width: ww, height: wh } = d.workArea;
    const isPrimary = d.id === primaryId;
    const strip = isLongStrip(d);
    const isTarget = d.id === target.display.id;
    const tag = strip ? 'long-strip' : 'regular';
    const marker = isTarget ? ' ← target' : '';
    lines.push(
      `  [${i}] id=${d.id} ${bw}x${bh} @(${bx},${by})  workArea=${ww}x${wh}  primary=${isPrimary}  scale=${d.scaleFactor}  ${tag}${marker}`,
    );
  });
  const b = target.bounds;
  lines.push(
    `[desktop] target: ${target.kind} on display id=${target.display.id}, window=${b.width}x${b.height} @(${b.x},${b.y})`,
  );
  return lines.join('\n');
}

// Call only after `app.whenReady()` — the `screen` module isn't available before that.
export function enumerateAndPickTarget(): Placement {
  const displays = screen.getAllDisplays();
  const primaryId = screen.getPrimaryDisplay().id;
  const target = pickTarget(displays, primaryId);
  console.log(formatEnumeration(displays, primaryId, target));
  return target;
}
