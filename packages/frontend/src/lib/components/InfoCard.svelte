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
  <div class="tabs">
    <span class="tab" class:active={tab === 'pending'} class:dim={tab !== 'pending'}>
      <span class="tab-dot"></span>PENDING
    </span>
    <span class="tab" class:active={tab === 'overview'} class:dim={tab !== 'overview'}>OVERVIEW</span>
  </div>

  {#key tab}
    <div class="body" in:fade={{ duration: 200 }} out:fade={{ duration: 120 }}>
      {#if tab === 'pending' && current}
        <div class="pending-head">
          <div class="agent-name">
            <span class="agent-dot"></span>{agentShortName(current)}
          </div>
          <div class="agent-workdir">{workdirTail(current.metadata)}</div>
        </div>

        <p class="message">
          {current.pending_decision?.message ?? 'Awaiting user input…'}
        </p>

        <div class="pending-foot">
          {#if queueExtra > 0}
            <span class="queue">queue <strong>+{queueExtra} more</strong></span>
          {:else}
            <span></span>
          {/if}
          <span class="waiting-time">waiting <strong>{waitingFor}</strong></span>
        </div>
      {:else}
        <div class="overview-head">
          <span class="big">{$agentStats.active}</span>
          <div class="head-meta">
            <div class="head-meta-line">active</div>
            <div class="head-meta-line dim">of {$agentStats.total} total</div>
          </div>
        </div>

        <div class="states-label">STATES</div>
        <ul class="states">
          {#each STATE_ROWS as row (row.key)}
            <li class="row state-{row.cls}">
              <span class="row-dot"></span>
              <span class="row-label">{row.label}</span>
              <span class="row-count">{$agentStats.byState[row.key]}</span>
            </li>
          {/each}
        </ul>

        <div class="tokens-label">TOKENS <span class="tokens-sub">/ 5min</span></div>
        <div class="tokens-spark">
          {#each Array(14) as _, i}
            <span class="spark-bar" style:--h={20 + ((i * 37) % 70) + '%'}></span>
          {/each}
        </div>
      {/if}
    </div>
  {/key}
</article>

<style>
  .info-card {
    position: relative;
    height: 100%;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--card-radius);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }
  .info-card.pending {
    border-color: var(--c-waiting);
    box-shadow: 0 0 0 1px var(--c-waiting), 0 0 28px -4px rgba(245, 158, 11, 0.45);
    animation: pending-pulse 1.4s ease-in-out infinite;
  }
  @keyframes pending-pulse {
    0%, 100% { box-shadow: 0 0 0 1px var(--c-waiting), 0 0 24px -6px rgba(245, 158, 11, 0.35); }
    50%      { box-shadow: 0 0 0 1px var(--c-waiting), 0 0 32px -2px rgba(245, 158, 11, 0.65); }
  }

  .tabs {
    display: flex;
    gap: 14px;
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-faint);
    text-transform: uppercase;
  }
  .tab-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .tab.dim { color: var(--text-faint); }
  .tab.active { color: var(--text-dim); }
  .info-card.pending .tab:first-child.active { color: var(--c-waiting); }

  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 14px;
  }

  .overview-head {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    flex-shrink: 0;
  }
  .big {
    font-family: var(--font-mono);
    font-size: clamp(36px, 6vw, 56px);
    font-weight: 700;
    color: var(--c-tool);
    line-height: 0.9;
  }
  .head-meta-line {
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.4;
  }
  .head-meta-line.dim {
    color: var(--text-faint);
  }

  .states-label,
  .tokens-label {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: var(--text-faint);
    text-transform: uppercase;
    margin-top: 4px;
    flex-shrink: 0;
  }
  .tokens-sub {
    color: var(--text-faint);
    font-weight: 400;
  }

  .states {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex-shrink: 0;
  }
  .row {
    display: grid;
    grid-template-columns: 14px 1fr auto;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-dim);
  }
  .row-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--row-c);
    box-shadow: 0 0 6px var(--row-c);
  }
  .row-label { color: var(--text-dim); }
  .row-count { color: var(--text); font-weight: 700; }

  .state-tool     { --row-c: var(--c-tool); }
  .state-thinking { --row-c: var(--c-thinking); }
  .state-waiting  { --row-c: var(--c-waiting); }
  .state-done     { --row-c: var(--c-done); }
  .state-idle     { --row-c: var(--text-faint); }
  .state-idle .row-dot { box-shadow: none; }

  .tokens-spark {
    display: grid;
    grid-template-columns: repeat(14, 1fr);
    gap: 3px;
    height: clamp(34px, 9vh, 60px);
    align-items: end;
    margin-top: 4px;
  }
  .spark-bar {
    height: var(--h);
    background: linear-gradient(180deg, var(--c-tool), color-mix(in srgb, var(--c-tool) 40%, transparent));
    border-radius: 1px;
    opacity: 0.72;
  }

  .pending-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex-shrink: 0;
  }
  .agent-name {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: clamp(14px, 1.5vw, 17px);
    font-weight: 700;
    color: var(--text);
  }
  .agent-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--c-waiting);
    box-shadow: 0 0 8px var(--c-waiting);
  }
  .agent-workdir {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-faint);
  }

  .message {
    margin: 0;
    font-family: var(--font-ui);
    font-size: clamp(13px, 1.25vw, 15px);
    color: var(--text);
    line-height: 1.45;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    line-clamp: 4;
  }

  .pending-foot {
    border-top: 1px solid var(--card-border);
    padding-top: 8px;
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
    flex-shrink: 0;
  }
  .queue strong { color: var(--c-waiting); }
  .waiting-time strong { color: var(--text); }
</style>
