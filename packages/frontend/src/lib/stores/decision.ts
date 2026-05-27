import { writable } from 'svelte/store';
import type { PendingDecision } from '$lib/protocol/schema';

export interface DecisionOverlayState {
  agent_id: string;
  decision: PendingDecision;
}

export const decisionOverlay = writable<DecisionOverlayState | null>(null);

export function showDecision(agent_id: string, decision: PendingDecision): void {
  decisionOverlay.set({ agent_id, decision });
}

export function hideDecision(agent_id: string): void {
  decisionOverlay.update((cur) => (cur && cur.agent_id === agent_id ? null : cur));
}
