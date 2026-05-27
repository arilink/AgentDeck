<script lang="ts">
  import { fade } from 'svelte/transition';
  import { agentStats, pendingQueue } from '$lib/stores/stats';
  import { formatElapsed } from '$lib/util/time';
  import type { AgentRecord } from '$lib/stores/agents';

  const tab = $derived($pendingQueue.length > 0 ? 'pending' : 'overview');
  const current: AgentRecord | undefined = $derived($pendingQueue[0]);
  const queueExtra = $derived(Math.max(0, $pendingQueue.length - 1));

  let now = $state(Date.now());
  let timer: ReturnType<typeof setInterval> | null = null;
  $effect(() => {
    timer = setInterval(() => (now = Date.now()), 500);
    return () => {
      if (timer) clearInterval(timer);
    };
  });
  const waitingFor = $derived(
    current ? formatElapsed(Math.max(0, now - current.started_at)) : '00:00',
  );

  const STATE_ROWS = [
    { key: 'tool_use', label: 'tool',     cls: 'tool' },
    { key: 'thinking', label: 'thinking', cls: 'thinking' },
    { key: 'waiting',  label: 'waiting',  cls: 'waiting' },
    { key: 'done',     label: 'done',     cls: 'done' },
    { key: 'idle',     label: 'idle',     cls: 'idle' },
  ] as const;

  const SPARK_BARS = [25, 38, 19, 50, 69, 44, 31, 56, 75, 63, 50, 69, 88, 100, 81];

  function workdirTail(meta: AgentRecord['metadata']): string {
    const w = meta?.workdir;
    if (typeof w !== 'string') return '';
    const parts = w.split(/[/\\]/).filter(Boolean);
    return parts[parts.length - 1] ?? '';
  }

  function agentShortName(a: AgentRecord): string {
    const colon = a.id.indexOf(':');
    return colon > 0 ? a.id.slice(colon + 1) : a.id;
  }
</script>

<article class="info-card" class:pending={tab === 'pending'}>
  {#key tab}
    <div class="body" in:fade={{ duration: 200 }} out:fade={{ duration: 120 }}>
      {#if tab === 'pending' && current}
        <div class="pill-tabs">
          <span class="pill-tab active">
            <span class="pill-dot"></span>PENDING
          </span>
          <span class="pill-tab dim">OVERVIEW</span>
        </div>

        <div class="agent-head">
          <span class="agent-name">
            <span class="agent-dot"></span>{agentShortName(current)}
          </span>
          {#if workdirTail(current.metadata)}
            <div class="agent-workdir">{workdirTail(current.metadata)}</div>
          {/if}
        </div>

        <p class="message">
          {current.pending_decision?.message ?? 'Awaiting user input…'}
        </p>

        <div class="pending-foot">
          <div class="foot-divider"></div>
          <div class="foot-row">
            <span class="dim">queue</span>
            <span class="queue-val">{queueExtra > 0 ? `+${queueExtra} more` : '—'}</span>
          </div>
          <div class="foot-row">
            <span class="dim">waiting</span>
            <span class="waiting-time">{waitingFor}</span>
          </div>
        </div>
      {:else}
        <div class="section-label">OVERVIEW</div>
        <div class="overview-head">
          <span class="big">{$agentStats.active}</span>
          <span class="big-label">active</span>
        </div>

        <div class="divider"></div>

        <div class="section-label">STATES</div>
        <ul class="states">
          {#each STATE_ROWS as row (row.key)}
            <li class="row state-{row.cls}">
              <span class="row-dot"></span>
              <span class="row-label">{row.label}</span>
              <span class="row-count">{$agentStats.byState[row.key]}</span>
            </li>
          {/each}
        </ul>

        <div class="divider"></div>

        <div class="tokens-head">
          <span class="section-label">TOKENS <span class="tokens-sub">/ 5min</span></span>
          <span class="tokens-peak">— peak</span>
        </div>
        <div class="tokens-spark">
          {#each SPARK_BARS as h}
            <span class="spark-bar" style:--h="{h}%"></span>
          {/each}
        </div>
      {/if}
    </div>
  {/key}
</article>

<style>
  .info-card {
    --info-text-1: #f5f5f7;
    --info-text-2: #9999a3;
    --info-text-3: #8e8e9a;
    --info-border: #26262e;

    position: relative;
    height: 100%;
    background: var(--card-bg);
    border: 1px solid var(--info-border);
    border-radius: var(--card-radius);
    padding: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }
  .info-card.pending {
    border: 2px solid var(--c-waiting);
    padding: 11px;
    box-shadow: 0 0 28px -4px rgba(245, 158, 11, 0.45);
    animation: pending-pulse 1.4s ease-in-out infinite;
  }
  @keyframes pending-pulse {
    0%, 100% { box-shadow: 0 0 24px -6px rgba(245, 158, 11, 0.35); }
    50%      { box-shadow: 0 0 32px -2px rgba(245, 158, 11, 0.65); }
  }

  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .section-label {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: var(--info-text-3);
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .tokens-sub {
    color: var(--info-text-3);
    font-weight: 400;
  }

  .overview-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .big {
    font-family: var(--font-ui);
    font-size: clamp(32px, 5vw, 48px);
    font-weight: 800;
    color: var(--c-tool);
    line-height: 0.9;
  }
  .big-label {
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--info-text-2);
  }

  .divider {
    height: 1px;
    background: var(--info-border);
    flex-shrink: 0;
  }

  .states {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }
  .row {
    display: grid;
    grid-template-columns: 8px 1fr auto;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .row-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--row-c);
    box-shadow: 0 0 6px var(--row-c);
  }
  .row-label { color: var(--info-text-2); }
  .row-count { color: var(--info-text-1); font-weight: 600; }

  .state-tool     { --row-c: var(--c-tool); }
  .state-thinking { --row-c: var(--c-thinking); }
  .state-waiting  { --row-c: var(--c-waiting); }
  .state-done     { --row-c: var(--c-done); }
  .state-idle     { --row-c: var(--c-idle); }
  .state-idle .row-dot { box-shadow: none; }

  .tokens-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .tokens-peak {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--info-text-2);
  }
  .tokens-spark {
    display: grid;
    grid-template-columns: repeat(15, 1fr);
    gap: 2px;
    flex: 1;
    min-height: 28px;
    align-items: end;
  }
  .spark-bar {
    height: var(--h);
    background: var(--c-tool);
    border-radius: 1px;
    opacity: 0.6;
  }

  .pill-tabs {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
  .pill-tab {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 6px;
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--info-text-3);
  }
  .pill-tab.active {
    background: #2a1a00;
    color: var(--c-waiting);
  }
  .pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--c-waiting);
  }

  .agent-head {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }
  .agent-name {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    color: var(--info-text-1);
  }
  .agent-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c-waiting);
    box-shadow: 0 0 8px var(--c-waiting);
  }
  .agent-workdir {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--info-text-3);
  }

  .message {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--info-text-1);
    line-height: 1.4;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
    line-clamp: 6;
  }

  .pending-foot {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }
  .foot-divider {
    height: 3px;
    background: var(--info-border);
    border-radius: 1px;
    margin-bottom: 2px;
  }
  .foot-row {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 9px;
  }
  .foot-row .dim { color: var(--info-text-3); }
  .queue-val { color: var(--c-waiting); font-weight: 600; }
  .waiting-time { color: var(--info-text-1); font-weight: 600; }
</style>
