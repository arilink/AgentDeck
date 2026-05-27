<script lang="ts">
  import type { AgentState } from '$lib/protocol/schema';

  interface Props {
    state: AgentState;
    label?: string;
    size?: 'sm' | 'md';
  }

  const { state, label, size = 'md' }: Props = $props();

  const stateLabel = $derived(label ?? defaultLabel(state));

  function defaultLabel(s: AgentState): string {
    switch (s) {
      case 'idle': return 'IDLE';
      case 'thinking': return 'THINKING';
      case 'tool_use': return 'TOOL';
      case 'waiting': return 'WAITING';
      case 'done': return 'DONE';
    }
  }
</script>

<span class="status status-{state} size-{size}">
  <span class="dot"></span>
  <span class="text">{stateLabel}</span>
</span>

<style>
  .status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-weight: 700;
    letter-spacing: 0.12em;
    color: var(--dot-c, var(--text-dim));
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--dot-c, var(--text-dim));
    box-shadow: 0 0 8px var(--dot-c, transparent);
  }
  .size-sm { font-size: 11px; }
  .size-md { font-size: 12px; }

  .status-idle      { --dot-c: var(--text-dim); }
  .status-thinking  { --dot-c: var(--c-thinking); }
  .status-tool_use  { --dot-c: var(--c-tool); }
  .status-waiting   { --dot-c: var(--c-waiting); }
  .status-done      { --dot-c: var(--c-done); }

  .status-idle .dot { box-shadow: none; }

  .status-thinking .dot,
  .status-tool_use .dot,
  .status-done .dot {
    animation: pulse 2.4s ease-in-out infinite;
  }
  .status-waiting .dot {
    animation: pulse-fast 0.9s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.55; }
  }
  @keyframes pulse-fast {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.35; }
  }
</style>
