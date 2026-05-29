<script lang="ts">
  import type { AgentRecord } from '$lib/stores/agents';
  import { collidingAgentIds } from '$lib/stores/agents';
  import { workdirTail, sessionTitle, shortId, realtimeInfo } from '$lib/util/agent-display';
  import StatusDot from './StatusDot.svelte';
  import ElapsedTimer from './ElapsedTimer.svelte';
  import Mascot from './Mascot.svelte';

  interface Props {
    agent: AgentRecord;
  }

  const { agent }: Props = $props();

  const project = $derived(workdirTail(agent));
  const title = $derived(sessionTitle(agent));
  const chip = $derived($collidingAgentIds.has(agent.id) ? `#${shortId(agent)}` : '');
  const realtime = $derived(realtimeInfo(agent));
</script>

<article class="card state-{agent.state}" data-state={agent.state}>
  <div class="bar" aria-hidden="true"></div>

  <header>
    <StatusDot state={agent.state} size="sm" />
    <ElapsedTimer startMs={agent.started_at} />
  </header>

  <div class="mascot-area">
    <Mascot {agent} variant="lulu" />
  </div>

  <footer>
    <div class="row agent-info" class:no-title={!title && !chip}>
      <span class="project">{project}</span>
      <span class="right">
        {#if title}<span class="title">{title}</span>{/if}
        {#if chip}<span class="chip">{chip}</span>{/if}
      </span>
    </div>
    {#if agent.state !== 'idle'}
      <div class="row realtime-info" data-actor={realtime.actor.toLowerCase()}>
        <span class="actor">{realtime.actor}</span>
        <span class="activity">{realtime.activity}</span>
      </div>
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
    position: relative;
    margin: 6px 0 4px;
    border-radius: 16px;
    overflow: hidden;
    background: #000;
    box-shadow:
      inset 0 0 32px -8px rgba(0, 0, 0, 0.7),
      inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  }
  .mascot-area::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
      ellipse at center,
      transparent 45%,
      rgba(10, 10, 11, 0.4) 78%,
      rgba(10, 10, 11, 0.85) 100%
    );
  }

  footer {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    line-height: 1.3;
  }
  .agent-info .project {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: clamp(12px, 1.15vw, 14px);
    font-weight: 500;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .agent-info.no-title .project {
    font-weight: 700;
    color: var(--text);
  }
  .agent-info .right {
    flex-shrink: 1;
    min-width: 0;
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    overflow: hidden;
  }
  .title {
    flex-shrink: 1;
    min-width: 0;
    font-family: var(--font-ui);
    font-size: clamp(13px, 1.2vw, 15px);
    font-weight: 700;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chip {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: clamp(9px, 0.85vw, 11px);
    color: var(--text-faint);
    letter-spacing: 0.02em;
  }

  .realtime-info .actor {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: clamp(11px, 1.05vw, 13px);
    font-weight: 600;
    color: var(--text-dim);
    white-space: nowrap;
    letter-spacing: 0.02em;
  }
  .realtime-info[data-actor='user'] .actor {
    color: var(--c-thinking, #818cf8);
  }
  .realtime-info[data-actor='agent'] .actor {
    color: var(--c-tool, #a3e635);
  }
  .realtime-info .activity {
    flex-shrink: 1;
    min-width: 0;
    font-family: var(--font-ui);
    font-size: clamp(11px, 1.05vw, 13px);
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
