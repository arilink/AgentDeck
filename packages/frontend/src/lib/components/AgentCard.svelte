<script lang="ts">
  import type { AgentRecord } from '$lib/stores/agents';
  import StatusDot from './StatusDot.svelte';
  import ElapsedTimer from './ElapsedTimer.svelte';
  import Mascot from './Mascot.svelte';

  interface Props {
    agent: AgentRecord;
  }

  const { agent }: Props = $props();

  const shortName = $derived(deriveName(agent));
  const action = $derived(agent.label ?? '');

  function deriveName(a: AgentRecord): string {
    const colon = a.id.indexOf(':');
    return colon > 0 ? a.id.slice(colon + 1) : a.id;
  }
</script>

<article class="card state-{agent.state}" data-state={agent.state}>
  <div class="bar" aria-hidden="true"></div>

  <header>
    <StatusDot state={agent.state} size="sm" />
    <ElapsedTimer startMs={agent.started_at} />
  </header>

  <div class="mascot-area">
    <Mascot state={agent.state} variant="icon" />
  </div>

  <footer>
    <div class="name">{shortName}</div>
    {#if action}
      <div class="action">{action}</div>
    {/if}
  </footer>
</article>

<style>
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--card-radius);
    padding: 16px 16px 14px;
    overflow: hidden;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }

  .bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--bar-c, transparent);
    box-shadow: 0 0 8px var(--bar-c, transparent);
  }
  .state-idle      { --bar-c: var(--text-faint); }
  .state-thinking  { --bar-c: var(--c-thinking); }
  .state-tool_use  { --bar-c: var(--c-tool); }
  .state-waiting   { --bar-c: var(--c-waiting); }
  .state-done      { --bar-c: var(--c-done); }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .mascot-area {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 6px 0 4px;
  }

  footer {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .name {
    font-family: var(--font-mono);
    font-size: clamp(13px, 1.4vw, 16px);
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .action {
    font-family: var(--font-ui);
    font-size: clamp(11px, 1.05vw, 13px);
    color: var(--text-dim);
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card.state-waiting {
    border-color: var(--c-waiting);
    box-shadow: 0 0 0 1px var(--c-waiting), 0 0 28px -4px rgba(245, 158, 11, 0.45);
    animation: waiting-pulse 1.4s ease-in-out infinite;
  }
  @keyframes waiting-pulse {
    0%, 100% { box-shadow: 0 0 0 1px var(--c-waiting), 0 0 24px -6px rgba(245, 158, 11, 0.35); }
    50%      { box-shadow: 0 0 0 1px var(--c-waiting), 0 0 32px -2px rgba(245, 158, 11, 0.65); }
  }
</style>
