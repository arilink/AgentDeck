import { readable, derived } from 'svelte/store';

export type DisplayMode = 'mini' | 'compact' | 'standard';

export const viewport = readable(
  { width: window.innerWidth, height: window.innerHeight },
  (set) => {
    const handler = (): void =>
      set({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  },
);

export const displayMode = derived(viewport, (v): DisplayMode => {
  if (v.width < 800) return 'mini';
  if (v.width < 1400) return 'compact';
  return 'standard';
});
